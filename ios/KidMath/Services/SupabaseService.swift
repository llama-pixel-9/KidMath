import Foundation
import Supabase

/// All Supabase I/O. The backend is PostgREST + Auth with RLS policies as the
/// API contract — the same tables, key, and policies the web app uses, zero
/// custom server code.
///
/// Rows cross into Swift as raw JSON dictionaries and go straight to the JS
/// engine (KidMath.addBankRows normalizes them with the same code path the
/// web's cloud loaders use), so the row->item mapping lives once, in JS.
@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient
    @Published private(set) var user: User?

    /// Mirrors src/itemBank/modeLoader.js SELECT_FIELDS.
    static let itemSelectFields =
        "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, "
        + "review_status, payload, representation_type, source, level_band, variety_id, format_id"

    init(client: SupabaseClient = SupabaseClient(
        supabaseURL: SupabaseConfig.url,
        supabaseKey: SupabaseConfig.anonKey
    )) {
        self.client = client
        Task { await observeAuthChanges() }
    }

    private func observeAuthChanges() async {
        for await (_, session) in client.auth.authStateChanges {
            self.user = session?.user
        }
    }

    var isSignedIn: Bool { user != nil }
    var userId: UUID? { user?.id }

    // MARK: - Auth

    /// Sign in with Apple: the ASAuthorization flow yields an identity token
    /// that Supabase verifies directly (no browser round-trip).
    func signInWithApple(idToken: String, nonce: String) async throws {
        try await client.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
        )
    }

    /// Google OAuth through the system browser sheet; Supabase redirects back
    /// via the kidmath:// URL scheme.
    func signInWithGoogle() async throws {
        try await client.auth.signInWithOAuth(
            provider: .google,
            redirectTo: SupabaseConfig.authRedirectURL
        )
    }

    /// Deliver the OAuth callback URL (from .onOpenURL) to the auth client.
    func handleAuthCallback(_ url: URL) {
        client.auth.handle(url)
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }

    // MARK: - Deletion (E4: §312.6 / Apple 5.1.1(v))

    /// E7: send the StoreKit 2 signed transaction to the verify-entitlement
    /// Edge Function, which validates it server-side and writes the shared
    /// entitlements row (the table is service-role-write only).
    func verifyEntitlement(jws: String) async throws {
        try await client.functions.invoke(
            "verify-entitlement",
            options: FunctionInvokeOptions(body: ["source": "appstore", "jws": jws])
        )
    }

    /// Delete one child profile (and stop collection about that child) via
    /// the delete-account Edge Function.
    func deleteKidProfile(kidId: UUID) async throws {
        try await client.functions.invoke(
            "delete-account",
            options: FunctionInvokeOptions(body: ["action": "kid", "kidId": kidId.uuidString])
        )
    }

    /// Delete the whole account — every profile, all progress, the auth user —
    /// then drop the local session. Deletion, not deactivation.
    func deleteAccount() async throws {
        try await client.functions.invoke(
            "delete-account",
            options: FunctionInvokeOptions(body: ["action": "account"])
        )
        try? await client.auth.signOut()
    }

    // MARK: - Item bank (mirrors src/itemBank/modeLoader.js)

    /// Approved rows for one mode, optionally narrowed to a level window.
    /// Raw PostgREST JSON — hand directly to EngineBridge.addBankRows.
    func fetchModeItemRows(modeId: String, levelRange: ClosedRange<Int>? = nil) async throws -> [[String: Any]] {
        var query = client
            .from("item_bank")
            .select(Self.itemSelectFields)
            .eq("review_status", value: "approved")
            .eq("mode_id", value: modeId)
        if let levelRange {
            query = query
                .lte("level_min", value: levelRange.upperBound)
                .gte("level_max", value: levelRange.lowerBound)
        }
        let response = try await query.execute()
        let parsed = try JSONSerialization.jsonObject(with: response.data)
        return parsed as? [[String: Any]] ?? []
    }

    // MARK: - Progress (mirrors src/progressStore.js cloud half)

    /// The `progress` row for (user, mode), or nil when none exists yet.
    func fetchProgressRow(userId: UUID, mode: String) async throws -> [String: Any]? {
        let response = try await client
            .from("progress")
            .select("level, mistake_bank, total_sessions, lifetime_stars")
            .eq("user_id", value: userId)
            .eq("mode", value: mode)
            .execute()
        let rows = try JSONSerialization.jsonObject(with: response.data) as? [[String: Any]]
        return rows?.first
    }

    func fetchBankItemStats(userId: UUID, mode: String) async throws -> [String: [String: Any]] {
        let response = try await client
            .from("progress_item_stats")
            .select("item_id, attempts, first_try_correct, correct, total_response_ms, last_seen_at")
            .eq("user_id", value: userId)
            .eq("mode", value: mode)
            .execute()
        let rows = (try JSONSerialization.jsonObject(with: response.data) as? [[String: Any]]) ?? []
        var stats: [String: [String: Any]] = [:]
        for row in rows {
            guard let itemId = row["item_id"] as? String else { continue }
            var lastSeenAt = -1.0
            if let iso = row["last_seen_at"] as? String,
               let date = ISO8601DateFormatter.flexible.dateFlexible(from: iso) {
                lastSeenAt = date.timeIntervalSince1970 * 1000
            }
            stats[itemId] = [
                "attempts": row["attempts"] as? Int ?? 0,
                "firstTryCorrect": row["first_try_correct"] as? Int ?? 0,
                "correct": row["correct"] as? Int ?? 0,
                "totalResponseMs": row["total_response_ms"] as? Int ?? 0,
                "lastSeenAt": lastSeenAt,
            ]
        }
        return stats
    }

    // MARK: - Entitlements (shared subscription truth: StoreKit + Stripe)

    func fetchEntitlement(userId: UUID) async throws -> [String: Any]? {
        let response = try await client
            .from("entitlements")
            .select("status, source, product_id, expires_at")
            .eq("user_id", value: userId)
            .execute()
        let rows = try JSONSerialization.jsonObject(with: response.data) as? [[String: Any]]
        return rows?.first
    }

    // upsertEntitlement was removed with the E7 hardening: entitlements is
    // service-role-write only — clients submit signed transactions to the
    // verify-entitlement Edge Function (verifyEntitlement above) instead of
    // writing the row themselves.

    func upsertProgress(userId: UUID, mode: String, row: [String: Any]) async throws {
        var payload = row
        payload["user_id"] = userId.uuidString
        payload["mode"] = mode
        payload["updated_at"] = ISO8601DateFormatter().string(from: Date())
        try await client
            .from("progress")
            .upsert(AnyJSON.from(payload), onConflict: "user_id,mode")
            .execute()
    }

    func upsertBankItemStats(userId: UUID, mode: String, stats: [String: [String: Any]]) async throws {
        guard !stats.isEmpty else { return }
        let rows: [[String: Any]] = stats.map { itemId, stat in
            let lastSeenAt = (stat["lastSeenAt"] as? Double).flatMap {
                $0 > 0 ? Date(timeIntervalSince1970: $0 / 1000) : nil
            } ?? Date()
            return [
                "user_id": userId.uuidString,
                "mode": mode,
                "item_id": itemId,
                "attempts": stat["attempts"] as? Int ?? 0,
                "first_try_correct": stat["firstTryCorrect"] as? Int ?? 0,
                "correct": stat["correct"] as? Int ?? 0,
                "total_response_ms": stat["totalResponseMs"] as? Int ?? 0,
                "last_seen_at": ISO8601DateFormatter().string(from: lastSeenAt),
            ]
        }
        try await client
            .from("progress_item_stats")
            .upsert(AnyJSON.from(rows), onConflict: "user_id,mode,item_id")
            .execute()
    }
}

// MARK: - JSON plumbing

extension AnyJSON {
    /// Bridge loosely-typed JSON (JSONSerialization / JSC output) into
    /// supabase-swift's Encodable JSON value.
    static func from(_ value: Any) -> AnyJSON {
        switch value {
        case let dictionary as [String: Any]:
            return .object(dictionary.mapValues { AnyJSON.from($0) })
        case let array as [Any]:
            return .array(array.map { AnyJSON.from($0) })
        case let string as String:
            return .string(string)
        case let bool as Bool where CFGetTypeID(bool as CFTypeRef) == CFBooleanGetTypeID():
            return .bool(bool)
        case let number as NSNumber:
            if CFGetTypeID(number) == CFBooleanGetTypeID() { return .bool(number.boolValue) }
            if number.doubleValue == number.doubleValue.rounded(),
               number.doubleValue.magnitude < 9_007_199_254_740_991 {
                return .integer(number.intValue)
            }
            return .double(number.doubleValue)
        case is NSNull:
            return .null
        default:
            return .null
        }
    }
}

extension ISO8601DateFormatter {
    static let flexible = ISO8601DateFormatter()

    /// Postgres timestamps come with fractional seconds; plain ISO8601 parsing
    /// rejects them, so try both.
    func dateFlexible(from string: String) -> Date? {
        formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = date(from: string) { return date }
        formatOptions = [.withInternetDateTime]
        return date(from: string)
    }
}
