import Foundation

/// Per-mode saved progress — Swift mirror of src/progressStore.js.
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
    nonisolated private static let startingLevel = 1
    nonisolated private static let maxLevel = 10
    nonisolated private static let maxPersistedMistakes = 20
    nonisolated private static let maxPersistedBankItems = 200
    nonisolated private static let maxPersistedRecentIds = 12

    private let supabase: SupabaseService
    private let defaults: UserDefaults

    init(supabase: SupabaseService = .shared, defaults: UserDefaults = .standard) {
        self.supabase = supabase
        self.defaults = defaults
    }

    nonisolated static func blankProgress() -> [String: Any] {
        [
            "level": startingLevel,
            "mistakeBank": [[String: Any]](),
            "totalSessions": 0,
            "lifetimeStars": 0,
            "bankItemStats": [String: Any](),
            "recentBankItemIds": [String](),
        ]
    }

    // MARK: - Public API (same shape as the web's loadProgress/saveProgress)

    func load(mode: String) async -> [String: Any] {
        if let userId = supabase.userId {
            return await loadCloud(userId: userId, mode: mode)
        }
        return loadLocal(mode: mode)
    }

    /// `data` comes from a finished engine session snapshot: level,
    /// mistakeBank, firstTryCorrect, bankItemStats, recentBankItemIds.
    func save(mode: String, data: [String: Any]) async {
        if let userId = supabase.userId {
            await saveCloud(userId: userId, mode: mode, data: data)
        } else {
            saveLocal(mode: mode, data: data)
        }
    }

    /// First sign-in: fold anonymous local progress into the cloud, then
    /// clear local so the cloud is the single source of truth.
    func mergeLocalToCloud(userId: UUID) async {
        let store = readLocalStore()
        guard !store.isEmpty else { return }
        for (mode, local) in store {
            let cloud = await loadCloud(userId: userId, mode: mode)
            let localMistakes = (local["mistakeBank"] as? [[String: Any]] ?? [])
            let cloudMistakes = (cloud["mistakeBank"] as? [[String: Any]] ?? [])
            let merged: [String: Any] = [
                "level": max(
                    Self.clampLevel(Self.int(local["level"], default: 1)),
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
                try await supabase.upsertProgress(userId: userId, mode: mode, row: merged)
                try await supabase.upsertBankItemStats(userId: userId, mode: mode, stats: mergedStats)
            } catch {
                return // keep local copy; retry on a later sign-in
            }
        }
        defaults.removeObject(forKey: Self.localKey)
    }

    // MARK: - Local (UserDefaults, same JSON shape as web localStorage)

    private func readLocalStore() -> [String: [String: Any]] {
        guard let data = defaults.data(forKey: Self.localKey),
              let store = (try? JSONSerialization.jsonObject(with: data)) as? [String: [String: Any]] else {
            return [:]
        }
        return store
    }

    private func writeLocalStore(_ store: [String: [String: Any]]) {
        if let data = try? JSONSerialization.data(withJSONObject: store) {
            defaults.set(data, forKey: Self.localKey)
        }
    }

    func loadLocal(mode: String) -> [String: Any] {
        guard let entry = readLocalStore()[mode] else { return Self.blankProgress() }
        return [
            "level": Self.clampLevel(Self.int(entry["level"], default: Self.startingLevel)),
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
            "level": Self.clampLevel(Self.int(data["level"], default: Self.startingLevel)),
            "mistakeBank": Array(mistakes),
            "totalSessions": Self.int(previous["totalSessions"]) + 1,
            "lifetimeStars": Self.int(previous["lifetimeStars"]) + Self.int(data["firstTryCorrect"]),
            "bankItemStats": Self.mergeBankItemStats(
                previous["bankItemStats"] as? [String: [String: Any]] ?? [:],
                incoming: data["bankItemStats"] as? [String: [String: Any]] ?? [:]
            ),
            "recentBankItemIds": Array(recent),
        ]
        writeLocalStore(store)
    }

    // MARK: - Cloud

    private func loadCloud(userId: UUID, mode: String) async -> [String: Any] {
        let stats = (try? await supabase.fetchBankItemStats(userId: userId, mode: mode)) ?? [:]
        guard let row = try? await supabase.fetchProgressRow(userId: userId, mode: mode) else {
            var blank = Self.blankProgress()
            blank["bankItemStats"] = stats
            return blank
        }
        return [
            "level": Self.clampLevel(Self.int(row["level"], default: Self.startingLevel)),
            "mistakeBank": row["mistake_bank"] as? [[String: Any]] ?? [],
            "totalSessions": Self.int(row["total_sessions"]),
            "lifetimeStars": Self.int(row["lifetime_stars"]),
            "bankItemStats": stats,
            // Session-window concern; not persisted across devices (web parity).
            "recentBankItemIds": [String](),
        ]
    }

    private func saveCloud(userId: UUID, mode: String, data: [String: Any]) async {
        let existing = await loadCloud(userId: userId, mode: mode)
        let row: [String: Any] = [
            "level": Self.clampLevel(Self.int(data["level"], default: Self.startingLevel)),
            "mistake_bank": Array((data["mistakeBank"] as? [[String: Any]] ?? []).prefix(Self.maxPersistedMistakes)),
            "total_sessions": Self.int(existing["totalSessions"]) + 1,
            "lifetime_stars": Self.int(existing["lifetimeStars"]) + Self.int(data["firstTryCorrect"]),
        ]
        try? await supabase.upsertProgress(userId: userId, mode: mode, row: row)
        try? await supabase.upsertBankItemStats(
            userId: userId,
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

    nonisolated static func clampLevel(_ level: Int) -> Int {
        min(maxLevel, max(1, level))
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
