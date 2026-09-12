import Foundation

/// Per-mode saved progress — Swift mirror of src/progressStore.js.
///
/// Progress is PER KID: the local blob is scoped by the active kid pointer
/// (`kidmath-progress:<kid>`, bare key for anonymous play, first kid inherits
/// the device blob once — same scheme as EngagementStore) and every cloud row
/// carries `kid_id`. Rows with a null kid_id are "household" rows merged from
/// a device before any profile existed; the first kid to load a mode inherits
/// them as a seed.
///
/// Signed out: UserDefaults, same JSON shape as the web's localStorage entry.
/// Signed in: the shared `progress` + `progress_item_stats` tables, so a child
/// resumes at the same level on iPad and web. On first sign-in local progress
/// merges into the cloud and the local copy is cleared (mergeLocalToCloud).
///
/// `load` returns the exact `savedProgress` dictionary the engine expects in
/// `createSession(options: ["savedProgress": ...])`.
@MainActor
final class ProgressStore {

    nonisolated private static let localKey = "kidmath-progress"
    nonisolated private static let activeKidKey = "kidmath-active-kid" // KidProfilesService owns this key
    nonisolated private static let migratedKey = "kidmath-progress-migrated" // which kid inherited the device blob
    nonisolated private static let activeKidGradeKey = "kidmath-active-kid-grade" // KidProfilesService owns this key
    nonisolated private static let startingLevel = 1
    nonisolated private static let maxLevel = 10
    nonisolated private static let maxPersistedMistakes = 20
    nonisolated private static let maxPersistedBankItems = 200
    nonisolated private static let maxPersistedRecentIds = 24

    private let supabase: SupabaseService
    private let defaults: UserDefaults

    init(supabase: SupabaseService = .shared, defaults: UserDefaults = .standard) {
        self.supabase = supabase
        self.defaults = defaults
    }

    /// Level a never-played mode opens at: 1 for anonymous play or an unknown
    /// grade, otherwise the kid's grade on the mode's ladder (GradeSeed) —
    /// same rule as the web's progressStore.startingLevelFor.
    nonisolated static func startingLevel(mode: String, defaults: UserDefaults = .standard) -> Int {
        guard defaults.string(forKey: activeKidKey).map({ !$0.isEmpty }) ?? false else { return startingLevel }
        return GradeSeed.startingLevel(mode: mode, grade: defaults.string(forKey: activeKidGradeKey))
    }

    nonisolated static func blankProgress(mode: String? = nil) -> [String: Any] {
        [
            "level": mode.map { startingLevel(mode: $0) } ?? startingLevel,
            "mistakeBank": [[String: Any]](),
            "totalSessions": 0,
            "lifetimeStars": 0,
            "bankItemStats": [String: Any](),
            "recentBankItemIds": [String](),
        ]
    }

    // MARK: - Public API (same shape as the web's loadProgress/saveProgress)

    /// The active kid profile id, or nil for anonymous play.
    var activeKidId: UUID? {
        guard let raw = defaults.string(forKey: Self.activeKidKey), !raw.isEmpty else { return nil }
        return UUID(uuidString: raw)
    }

    func load(mode: String) async -> [String: Any] {
        if let userId = supabase.userId {
            return await loadCloud(userId: userId, kidId: activeKidId, mode: mode)
        }
        return loadLocal(mode: mode)
    }

    /// `data` comes from a finished engine session snapshot: level,
    /// mistakeBank, firstTryCorrect, bankItemStats, recentBankItemIds.
    func save(mode: String, data: [String: Any]) async {
        if let userId = supabase.userId {
            await saveCloud(userId: userId, kidId: activeKidId, mode: mode, data: data)
        } else {
            saveLocal(mode: mode, data: data)
        }
    }

    /// First sign-in: fold this device's progress for the active kid (or the
    /// anonymous blob when no profile is active — merged as household rows)
    /// into the cloud, then clear the local copy.
    func mergeLocalToCloud(userId: UUID) async {
        let kidId = activeKidId
        let store = readLocalStore()
        guard !store.isEmpty else { return }
        for (mode, local) in store {
            let cloud = await loadCloud(userId: userId, kidId: kidId, mode: mode)
            let localMistakes = (local["mistakeBank"] as? [[String: Any]] ?? [])
            let cloudMistakes = (cloud["mistakeBank"] as? [[String: Any]] ?? [])
            let merged: [String: Any] = [
                "level": max(
                    Self.clampLevel(Self.int(local["level"], default: 1), mode: mode),
                    Self.int(cloud["level"], default: Self.startingLevel)
                ),
                "mistake_bank": cloudMistakes.isEmpty ? Array(localMistakes.prefix(Self.maxPersistedMistakes)) : cloudMistakes,
                "total_sessions": Self.int(cloud["totalSessions"]) + Self.int(local["totalSessions"]),
                "lifetime_stars": Self.int(cloud["lifetimeStars"]) + Self.int(local["lifetimeStars"]),
            ]
            let mergedStats = Self.mergeBankItemStats(
                cloud["bankItemStats"] as? [String: [String: Any]] ?? [:],
                incoming: local["bankItemStats"] as? [String: [String: Any]] ?? [:]
            )
            do {
                try await supabase.upsertProgress(userId: userId, kidId: kidId, mode: mode, row: merged)
                try await supabase.upsertBankItemStats(userId: userId, kidId: kidId, mode: mode, stats: mergedStats)
            } catch {
                return // keep local copy; retry on a later sign-in
            }
        }
        defaults.removeObject(forKey: storeKey)
    }

    // MARK: - Local (UserDefaults, same JSON shape as web localStorage; per-kid keys)

    private var storeKey: String {
        if let kid = defaults.string(forKey: Self.activeKidKey), !kid.isEmpty {
            return "\(Self.localKey):\(kid)"
        }
        return Self.localKey
    }

    private func readBlob(_ key: String) -> [String: [String: Any]]? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: [String: Any]]
    }

    private func readLocalStore() -> [String: [String: Any]] {
        let key = storeKey
        if let store = readBlob(key) { return store }
        // First kid on this device inherits the anonymous blob — exactly once,
        // stamped even when there was nothing to inherit. Copy, never rename.
        if key != Self.localKey, defaults.string(forKey: Self.migratedKey) == nil {
            defaults.set(String(key.dropFirst(Self.localKey.count + 1)), forKey: Self.migratedKey)
            if let device = readBlob(Self.localKey) {
                writeLocalStore(device)
                return device
            }
        }
        return [:]
    }

    private func writeLocalStore(_ store: [String: [String: Any]]) {
        if let data = try? JSONSerialization.data(withJSONObject: store) {
            defaults.set(data, forKey: storeKey)
        }
    }

    func loadLocal(mode: String) -> [String: Any] {
        guard let entry = readLocalStore()[mode] else { return Self.blankProgress(mode: mode) }
        return [
            "level": Self.clampLevel(Self.int(entry["level"], default: Self.startingLevel), mode: mode),
            "mistakeBank": entry["mistakeBank"] as? [[String: Any]] ?? [],
            "totalSessions": Self.int(entry["totalSessions"]),
            "lifetimeStars": Self.int(entry["lifetimeStars"]),
            "bankItemStats": entry["bankItemStats"] as? [String: Any] ?? [:],
            "recentBankItemIds": entry["recentBankItemIds"] as? [String] ?? [],
        ]
    }

    func saveLocal(mode: String, data: [String: Any]) {
        var store = readLocalStore()
        let previous = store[mode] ?? [:]
        let mistakes = (data["mistakeBank"] as? [[String: Any]] ?? []).prefix(Self.maxPersistedMistakes)
        let recent = (data["recentBankItemIds"] as? [String] ?? []).suffix(Self.maxPersistedRecentIds)
        store[mode] = [
            "level": Self.clampLevel(Self.int(data["level"], default: Self.startingLevel), mode: mode),
            "mistakeBank": Array(mistakes),
            "totalSessions": Self.int(previous["totalSessions"]) + 1,
            "lifetimeStars": Self.int(previous["lifetimeStars"]) + Self.starsEarned(from: data),
            "bankItemStats": Self.mergeBankItemStats(
                previous["bankItemStats"] as? [String: [String: Any]] ?? [:],
                incoming: data["bankItemStats"] as? [String: [String: Any]] ?? [:]
            ),
            "recentBankItemIds": Array(recent),
        ]
        writeLocalStore(store)
    }

    // MARK: - Cloud

    /// A kid with no row yet inherits the household row (kid_id null) as a
    /// seed; their first save writes their own row (web parity).
    private func loadCloud(userId: UUID, kidId: UUID?, mode: String) async -> [String: Any] {
        var stats = (try? await supabase.fetchBankItemStats(userId: userId, kidId: kidId, mode: mode)) ?? [:]
        var row = try? await supabase.fetchProgressRow(userId: userId, kidId: kidId, mode: mode)
        if row == nil, kidId != nil {
            row = try? await supabase.fetchProgressRow(userId: userId, kidId: nil, mode: mode)
            stats = (try? await supabase.fetchBankItemStats(userId: userId, kidId: nil, mode: mode)) ?? [:]
        }
        guard let row else {
            var blank = Self.blankProgress(mode: mode)
            blank["bankItemStats"] = stats
            return blank
        }
        return [
            "level": Self.clampLevel(Self.int(row["level"], default: Self.startingLevel), mode: mode),
            "mistakeBank": row["mistake_bank"] as? [[String: Any]] ?? [],
            "totalSessions": Self.int(row["total_sessions"]),
            "lifetimeStars": Self.int(row["lifetime_stars"]),
            "bankItemStats": stats,
            // Persisted since PR B so the no-repeat window survives a device switch.
            "recentBankItemIds": row["recent_bank_item_ids"] as? [String] ?? [],
        ]
    }

    private func saveCloud(userId: UUID, kidId: UUID?, mode: String, data: [String: Any]) async {
        let existing = await loadCloud(userId: userId, kidId: kidId, mode: mode)
        let row: [String: Any] = [
            "level": Self.clampLevel(Self.int(data["level"], default: Self.startingLevel), mode: mode),
            "mistake_bank": Array((data["mistakeBank"] as? [[String: Any]] ?? []).prefix(Self.maxPersistedMistakes)),
            "total_sessions": Self.int(existing["totalSessions"]) + 1,
            "lifetime_stars": Self.int(existing["lifetimeStars"]) + Self.starsEarned(from: data),
            "recent_bank_item_ids": Array((data["recentBankItemIds"] as? [String] ?? []).suffix(Self.maxPersistedRecentIds)),
        ]
        try? await supabase.upsertProgress(userId: userId, kidId: kidId, mode: mode, row: row)
        try? await supabase.upsertBankItemStats(
            userId: userId,
            kidId: kidId,
            mode: mode,
            stats: data["bankItemStats"] as? [String: [String: Any]] ?? [:]
        )
    }

    // MARK: - Pure helpers (mirrors of the web functions, unit-tested)

    /// Numbers arrive as JSC doubles, JSON NSNumbers, or native Int/Double
    /// literals; only NSNumber bridges all three, so never `as? Int` directly.
    nonisolated static func int(_ value: Any?, default fallback: Int = 0) -> Int {
        (value as? NSNumber)?.intValue ?? fallback
    }

    nonisolated static func double(_ value: Any?, default fallback: Double = 0) -> Double {
        (value as? NSNumber)?.doubleValue ?? fallback
    }

    nonisolated static func clampLevel(_ level: Int, mode: String? = nil) -> Int {
        let cap = mode.map { GradeSeed.maxLevel(mode: $0) } ?? maxLevel
        return min(cap, max(1, level))
    }

    /// §01: `starsEarned` (the flight payout) wins when present — including an
    /// explicit 0 — and callers not yet on the Flight Report fall back to the
    /// historical one-star-per-first-try formula. Mirror of the web's
    /// `starsEarned ?? firstTryCorrect` in progressStore.js.
    nonisolated static func starsEarned(from data: [String: Any]) -> Int {
        if let explicit = data["starsEarned"] { return int(explicit) }
        return int(data["firstTryCorrect"])
    }

    /// Sum incoming per-item counters into the previous ones, keep the most
    /// recently seen 200 items (mirror of mergeBankItemStats in progressStore.js).
    nonisolated static func mergeBankItemStats(
        _ previous: [String: [String: Any]],
        incoming: [String: [String: Any]]
    ) -> [String: [String: Any]] {
        var merged = previous
        for (itemId, stats) in incoming {
            let base = merged[itemId] ?? [:]
            merged[itemId] = [
                "attempts": Self.int(base["attempts"]) + Self.int(stats["attempts"]),
                "firstTryCorrect": Self.int(base["firstTryCorrect"]) + Self.int(stats["firstTryCorrect"]),
                "correct": Self.int(base["correct"]) + Self.int(stats["correct"]),
                "totalResponseMs": Self.int(base["totalResponseMs"]) + Self.int(stats["totalResponseMs"]),
                "lastSeenAt": max(Self.double(base["lastSeenAt"], default: -1), Self.double(stats["lastSeenAt"], default: -1)),
            ]
        }
        guard merged.count > maxPersistedBankItems else { return merged }
        let kept = merged
            .sorted { Self.double($0.value["lastSeenAt"], default: -1) > Self.double($1.value["lastSeenAt"], default: -1) }
            .prefix(maxPersistedBankItems)
        return Dictionary(uniqueKeysWithValues: kept.map { ($0.key, $0.value) })
    }
}
