import Foundation
import Supabase

/// One row in public.kid_profiles — first name, age, grade, and nothing else
/// (the §20 add-a-kid screen promises exactly that).
struct KidProfile: Identifiable, Codable, Equatable {
    let id: UUID
    let firstName: String
    let age: String
    let grade: String

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case age
        case grade
    }
}

/// Kid profiles (§20): one parent account holds up to four kids. Swift mirror
/// of src/kidProfiles.js — same table, same RLS contract, and the active kid
/// is a device-local pointer under a `kidmath-*` key (never renamed: renaming
/// silently wipes kids' local state).
@MainActor
final class KidProfilesService: ObservableObject {

    static let maxKids = 4
    static let ages = ["5", "6", "7", "8", "9", "10", "11", "12+"]
    static let grades = ["K", "1st", "2nd", "3rd", "4th", "5th", "6th"]

    private static let activeKidIdKey = "kidmath-active-kid"
    private static let activeKidNameKey = "kidmath-active-kid-name"
    private static let activeKidGradeKey = "kidmath-active-kid-grade"
    private static let selectFields = "id, first_name, age, grade"

    @Published private(set) var kids: [KidProfile] = []

    /// Parent language for the 4-kid cap (an RLS insert violation on the
    /// wire). Mirrors KID_LIMIT_MESSAGE in src/kidProfiles.js.
    static let kidLimitMessage =
        "Four kids is the limit for one account. Remove a profile on the account page to add another."

    /// Seconds between consent emails (src/onboarding/consentResend.js).
    static let resendCooldownSeconds = 60

    private let supabase: SupabaseService
    /// The COPPA direct notice to send with a consent request — from the
    /// engine bundle (one source with the web). Injected so tests can stub it.
    var consentNotice: () throws -> EngineBridge.ConsentNotice

    init(supabase: SupabaseService = .shared, consentNotice: @escaping () throws -> EngineBridge.ConsentNotice = { try EngineBridge().parentalConsentNotice() }) {
        self.supabase = supabase
        self.consentNotice = consentNotice
    }

    /// The child the parent typed, waiting server-side for their email tap.
    struct PendingConsent: Equatable {
        let firstName: String
        let age: String
        let grade: String
        let sentAt: Date
    }

    /// What addKid returns: a profile, or a consent request in flight.
    enum AddResult: Equatable {
        case added(KidProfile)
        case pendingConsent(PendingConsent)
    }

    // MARK: - COPPA consent (mirrors hasParentalConsent / requestParentalConsent)

    /// True when the newest consent event is a grant, not a revocation.
    func hasParentalConsent() async -> Bool {
        guard supabase.isSignedIn else { return false }
        struct Row: Decodable { let kind: String }
        do {
            let rows: [Row] = try await supabase.client
                .from("consent_events")
                .select("kind")
                .in("kind", values: ["coppa_vpc", "coppa_revoked"])
                .order("created_at", ascending: false)
                .limit(1)
                .execute()
                .value
            return rows.first?.kind == "coppa_vpc"
        } catch {
            return false
        }
    }

    /// Start the email-plus consent flow: the direct notice goes to the
    /// account email with a one-tap confirmation link. The kid's details wait
    /// server-side in consent_requests; no kid_profiles row exists until the
    /// parent confirms. Returns the server's send time.
    func requestParentalConsent(firstName: String, age: String, grade: String) async throws -> PendingConsent {
        let notice = try consentNotice()
        struct Response: Decodable {
            let requested: Bool?
            let sentAt: String?
        }
        let response: Response = try await supabase.client.functions.invoke(
            "request-consent",
            options: FunctionInvokeOptions(body: [
                "firstName": firstName.trimmingCharacters(in: .whitespaces),
                "age": age,
                "grade": grade,
                "noticeText": notice.markdown,
                "termsVersion": notice.termsVersion,
                "privacyVersion": notice.privacyVersion,
            ])
        )
        guard response.requested == true else {
            throw NSError(domain: "KidProfiles", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Could not send the consent email — try again.",
            ])
        }
        let sentAt = response.sentAt.flatMap { ISO8601DateFormatter.flexible.dateFlexible(from: $0) } ?? Date()
        return PendingConsent(firstName: firstName.trimmingCharacters(in: .whitespaces), age: age, grade: grade, sentAt: sentAt)
    }

    /// After the parent taps the link: the profile the server created for the
    /// pending request, if it has landed yet.
    func confirmedKid(named firstName: String) async -> KidProfile? {
        await refresh()
        return kids.first { $0.firstName == firstName }
    }

    // MARK: - Active kid (device-local)

    var activeKidId: String? {
        UserDefaults.standard.string(forKey: Self.activeKidIdKey)
    }

    /// Cached locally so the home greeting works offline and before refresh().
    var activeKidName: String? {
        UserDefaults.standard.string(forKey: Self.activeKidNameKey)
    }

    /// Cached so ProgressStore can seed a fresh mode from the grade (GradeSeed).
    var activeKidGrade: String? {
        UserDefaults.standard.string(forKey: Self.activeKidGradeKey)
    }

    func setActiveKid(_ kid: KidProfile?) {
        let defaults = UserDefaults.standard
        if let kid {
            defaults.set(kid.id.uuidString, forKey: Self.activeKidIdKey)
            defaults.set(kid.firstName, forKey: Self.activeKidNameKey)
            defaults.set(kid.grade, forKey: Self.activeKidGradeKey)
        } else {
            defaults.removeObject(forKey: Self.activeKidIdKey)
            defaults.removeObject(forKey: Self.activeKidNameKey)
            defaults.removeObject(forKey: Self.activeKidGradeKey)
        }
        objectWillChange.send()
    }

    // MARK: - Cloud rows

    func refresh() async {
        guard supabase.isSignedIn else {
            kids = []
            return
        }
        do {
            kids = try await supabase.client
                .from("kid_profiles")
                .select(Self.selectFields)
                .order("created_at", ascending: true)
                .limit(Self.maxKids)
                .execute()
                .value
        } catch {
            // Leave the last-known list; the picker degrades to what it has.
        }
    }

    /// Add a child. Until the parent has given verifiable consent this does
    /// NOT write a profile: it sends the direct notice and returns
    /// `.pendingConsent` — the profile row is created server-side, in one
    /// transaction with the consent record, when the parent taps the link.
    /// (§312.5(c)(1): nothing about the child is stored before consent.)
    func addKid(firstName: String, age: String, grade: String) async throws -> AddResult {
        guard supabase.userId != nil else {
            throw NSError(domain: "KidProfiles", code: 1, userInfo: [NSLocalizedDescriptionKey: "Sign in first"])
        }
        if !(await hasParentalConsent()) {
            return .pendingConsent(try await requestParentalConsent(firstName: firstName, age: age, grade: grade))
        }
        return .added(try await insertKid(firstName: firstName, age: age, grade: grade))
    }

    private func insertKid(firstName: String, age: String, grade: String) async throws -> KidProfile {
        guard let userId = supabase.userId else {
            throw NSError(domain: "KidProfiles", code: 1, userInfo: [NSLocalizedDescriptionKey: "Sign in first"])
        }
        struct NewKid: Encodable {
            let user_id: UUID
            let first_name: String
            let age: String
            let grade: String
        }
        do {
            let kid: KidProfile = try await supabase.client
                .from("kid_profiles")
                .insert(NewKid(
                    user_id: userId,
                    first_name: firstName.trimmingCharacters(in: .whitespaces),
                    age: age,
                    grade: grade
                ))
                .select(Self.selectFields)
                .single()
                .execute()
                .value
            kids.append(kid)
            return kid
        } catch {
            // The 4-kid cap lives in the kid_profiles RLS insert policy.
            if "\(error)".range(of: "row-level security", options: .caseInsensitive) != nil {
                throw NSError(domain: "KidProfiles", code: 3, userInfo: [NSLocalizedDescriptionKey: Self.kidLimitMessage])
            }
            throw error
        }
    }

    /// Update a kid's fields (grade changes every September — routine
    /// maintenance under the existing consent, not new collection).
    func updateKid(_ kid: KidProfile, firstName: String, age: String, grade: String) async throws -> KidProfile {
        struct Patch: Encodable { let first_name: String; let age: String; let grade: String }
        let updated: KidProfile = try await supabase.client
            .from("kid_profiles")
            .update(Patch(first_name: firstName.trimmingCharacters(in: .whitespaces), age: age, grade: grade))
            .eq("id", value: kid.id.uuidString)
            .select(Self.selectFields)
            .single()
            .execute()
            .value
        if let i = kids.firstIndex(where: { $0.id == kid.id }) { kids[i] = updated }
        if activeKidId == kid.id.uuidString { setActiveKid(updated) }
        return updated
    }
}
