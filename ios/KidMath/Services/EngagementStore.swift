import Foundation

/// The engagement blob — Swift mirror of src/engagement/engagementStore.js.
///
/// One state PER KID (bird-world prerequisite): siblings must never share a
/// wallet, streak, or — later — a flock. The blob is scoped by the active kid
/// pointer (`kidmath-active-kid`, owned by KidProfilesService); an anonymous
/// device uses the bare key, the FIRST kid profile inherits that state once
/// (copy, never rename), and later kids start fresh — byte-for-byte the same
/// policy as the web store.
///
/// v1 is deliberately UserDefaults-only, like the web's localStorage v1. The
/// blob is kept as loose JSON (`[String: Any]`) rather than Codable so fields
/// written by the web build (birds, egg, nominations…) survive a round-trip
/// untouched until their features port.
///
/// Not actor-isolated: UserDefaults is thread-safe and everything else here is
/// pure, so the view model can hold one as a plain default argument.
final class EngagementStore {

    nonisolated static let dailyGoal = 10
    nonisolated private static let baseKey = "kidmath-engagement"
    nonisolated private static let activeKidKey = "kidmath-active-kid"
    nonisolated private static let migratedKey = "kidmath-engagement-migrated"

    private let defaults: UserDefaults

    /// The shared engagement RULES (src/engagement/engagementRules.js) run in
    /// one long-lived JSContext: session-end transition, sticker spend, the
    /// badge and sticker catalogues. One instance for the app — the bundle is
    /// parsed once. nil only if the engine fails to load, in which case the
    /// step-1 Swift mirror below still banks stars.
    nonisolated(unsafe) static let rules: EngineBridge? = try? EngineBridge()

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    // MARK: - Facts a session measures (applySessionEnd's `facts`)

    struct SessionFacts {
        var perfect = false
        var comebacks = 0
        var trapWins = 0
        var levelReached = 1

        var json: [String: Any] {
            ["perfect": perfect, "comebacks": comebacks, "trapWins": trapWins, "levelReached": levelReached]
        }
    }

    /// A badge or sticker as the catalogue describes it.
    struct Badge: Identifiable, Equatable {
        let id: String
        let emoji: String
        let name: String
        let blurb: String
    }

    struct Sticker: Identifiable, Equatable {
        let id: String
        let emoji: String
        let name: String
        let cost: Int
    }

    static func badges() -> [Badge] {
        guard let raw = try? rules?.call("badges").toArray() as? [[String: Any]] else { return [] }
        return raw.map { Badge(id: $0["id"] as? String ?? "", emoji: $0["emoji"] as? String ?? "", name: $0["name"] as? String ?? "", blurb: $0["blurb"] as? String ?? "") }
    }

    static func stickers() -> [Sticker] {
        guard let raw = try? rules?.call("stickers").toArray() as? [[String: Any]] else { return [] }
        return raw.map { Sticker(id: $0["id"] as? String ?? "", emoji: $0["emoji"] as? String ?? "", name: $0["name"] as? String ?? "", cost: ($0["cost"] as? NSNumber)?.intValue ?? 0) }
    }

    /// Badge ids the kid has earned, in the order earned.
    func earnedBadgeIds() -> [String] {
        ((load()["badges"] as? [[String: Any]]) ?? []).compactMap { $0["id"] as? String }
    }

    func ownedStickerIds() -> [String] {
        (load()["stickers"] as? [String]) ?? []
    }

    /// Today's stars, treating a stale todayDay as an empty day.
    nonisolated static func starsToday(_ state: [String: Any], dayKey: String = todayKey()) -> Int {
        (state["todayDay"] as? String) == dayKey ? ProgressStore.int(state["todayStars"]) : 0
    }

    /// Buy a sticker through the shared spend rule; false when refused
    /// (already owned, or the balance is short). Persists on success.
    @discardableResult
    func buySticker(_ sticker: Sticker) -> Bool {
        guard let rules = Self.rules else { return false }
        let payload: [String: Any] = ["id": sticker.id, "emoji": sticker.emoji, "name": sticker.name, "cost": sticker.cost]
        guard let result = try? rules.call("applySpend", [load(), payload]), !result.isNull, !result.isUndefined,
              let next = result.toDictionary() as? [String: Any] else { return false }
        persist(next)
        return true
    }

    // MARK: - Day math (device-LOCAL calendar day, like a child counts days)

    nonisolated static func todayKey(_ date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    nonisolated static func yesterdayKey(of dayKey: String) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.dateFormat = "yyyy-MM-dd"
        guard let day = formatter.date(from: dayKey),
              let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: day) else {
            return dayKey
        }
        return formatter.string(from: yesterday)
    }

    // MARK: - Load / persist (per-kid keys + one-time migration)

    private var storeKey: String {
        if let kid = defaults.string(forKey: Self.activeKidKey), !kid.isEmpty {
            return "\(Self.baseKey):\(kid)"
        }
        return Self.baseKey
    }

    func load() -> [String: Any] {
        let key = storeKey
        if let blob = readBlob(key) { return blob }
        // First open under a kid profile: exactly one kid — the first —
        // inherits the anonymous device state; everyone after starts fresh.
        if key != Self.baseKey, defaults.string(forKey: Self.migratedKey) == nil {
            defaults.set(String(key.dropFirst(Self.baseKey.count + 1)), forKey: Self.migratedKey)
            if let anonymous = readBlob(Self.baseKey) {
                write(anonymous, to: key)
                return anonymous
            }
        }
        return [:]
    }

    func persist(_ state: [String: Any]) {
        write(state, to: storeKey)
    }

    private func readBlob(_ key: String) -> [String: Any]? {
        guard let data = defaults.data(forKey: key),
              let blob = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            return nil
        }
        return blob
    }

    private func write(_ state: [String: Any], to key: String) {
        if let data = try? JSONSerialization.data(withJSONObject: state) {
            defaults.set(data, forKey: key)
        }
    }

    // MARK: - Reads

    nonisolated static func starBalance(_ state: [String: Any]) -> Int {
        max(0, ProgressStore.int(state["earnedStars"]) - ProgressStore.int(state["spentStars"]))
    }

    /// The streak as of today — yesterday's streak survives until today is missed.
    nonisolated static func currentStreak(_ state: [String: Any], dayKey: String = todayKey()) -> Int {
        guard let lastPlayDay = state["lastPlayDay"] as? String else { return 0 }
        if lastPlayDay == dayKey || lastPlayDay == yesterdayKey(of: dayKey) {
            return ProgressStore.int(state["streakDays"])
        }
        return 0
    }

    /// True during the kid's first seven days of flying — the Flight Report
    /// ledger defaults open while this holds (§02 state 3).
    nonisolated static func isFirstWeek(_ state: [String: Any], dayKey: String = todayKey()) -> Bool {
        guard let first = state["firstFlightDay"] as? String else { return true }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let firstDay = formatter.date(from: first), let today = formatter.date(from: dayKey) else {
            return true
        }
        return today.timeIntervalSince(firstDay) < 7 * 86_400
    }

    // MARK: - Session end (mirror of applySessionEnd, the step-1 subset)

    struct SessionEndResult {
        let state: [String: Any]
        let streak: Int
        let balance: Int
        let firstWeek: Bool
        /// Badges earned by THIS session (web: events.newBadges).
        var newBadges: [Badge] = []
        /// Exactly the crossing of the daily goal, so the toast fires once a day.
        var goalJustMet = false
        var streakExtended = false
    }

    /// Bank the flight's stars, roll the local-day streak, stamp the first
    /// flight, warm the egg if the web build left one incubating, and queue
    /// the stars for the Meadow's nest drop. Persists and returns the summary
    /// the Flight Report shows.
    @discardableResult
    func recordSessionEnd(starsEarned: Int, facts: SessionFacts = SessionFacts(), dayKey: String = EngagementStore.todayKey()) -> SessionEndResult {
        // The shared rule when the engine is up — identical transition to the
        // web, badges and daily goal included.
        if let rules = Self.rules,
           let result = try? rules.callDictionary("applySessionEnd", [load(), starsEarned, dayKey, facts.json]),
           let next = result["state"] as? [String: Any] {
            persist(next)
            let events = result["events"] as? [String: Any] ?? [:]
            let badges = (events["newBadges"] as? [[String: Any]] ?? []).map {
                Badge(id: $0["id"] as? String ?? "", emoji: $0["emoji"] as? String ?? "", name: $0["name"] as? String ?? "", blurb: $0["blurb"] as? String ?? "")
            }
            return SessionEndResult(
                state: next,
                streak: Self.currentStreak(next, dayKey: dayKey),
                balance: Self.starBalance(next),
                firstWeek: Self.isFirstWeek(next, dayKey: dayKey),
                newBadges: badges,
                goalJustMet: (events["goalJustMet"] as? Bool) == true,
                streakExtended: (events["streakExtended"] as? Bool) == true
            )
        }
        return recordSessionEndMirror(starsEarned: starsEarned, dayKey: dayKey)
    }

    /// The step-1 Swift mirror (stars, streak, first flight, egg warmth) —
    /// only reached if the engine failed to load.
    private func recordSessionEndMirror(starsEarned: Int, dayKey: String) -> SessionEndResult {
        var state = load()
        let before = (state["todayDay"] as? String) == dayKey ? ProgressStore.int(state["todayStars"]) : 0

        state["earnedStars"] = ProgressStore.int(state["earnedStars"]) + starsEarned
        state["todayDay"] = dayKey
        state["todayStars"] = before + starsEarned
        if state["firstFlightDay"] == nil { state["firstFlightDay"] = dayKey }
        state["pendingNestDrop"] = ProgressStore.int(state["pendingNestDrop"]) + max(0, starsEarned)

        if (state["lastPlayDay"] as? String) != dayKey {
            let continued = (state["lastPlayDay"] as? String) == Self.yesterdayKey(of: dayKey)
            state["streakDays"] = continued ? ProgressStore.int(state["streakDays"]) + 1 : 1
            state["lastPlayDay"] = dayKey
        }
        state["bestStreak"] = max(ProgressStore.int(state["bestStreak"]), ProgressStore.int(state["streakDays"]))
        state["sessionsCount"] = ProgressStore.int(state["sessionsCount"]) + 1

        // §10: an egg left warming by the web build keeps warming here.
        if var egg = state["egg"] as? [String: Any] {
            let target = 40
            egg["warmthStars"] = min(target, ProgressStore.int(egg["warmthStars"]) + max(0, starsEarned))
            state["egg"] = egg
        }

        persist(state)
        return SessionEndResult(
            state: state,
            streak: Self.currentStreak(state, dayKey: dayKey),
            balance: Self.starBalance(state),
            firstWeek: Self.isFirstWeek(state, dayKey: dayKey)
        )
    }
}

/// Kid-facing rank names (§02) — Fledgling / Flier / Skymaster. Parent
/// surfaces keep plain "Level n of 10" language.
enum RankBand {
    nonisolated static func name(forLevel level: Int) -> String {
        switch level {
        case ..<4: return "Fledgling"
        case ..<7: return "Flier"
        default: return "Skymaster"
        }
    }
}
