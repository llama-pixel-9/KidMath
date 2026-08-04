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

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
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
    }

    /// Bank the flight's stars, roll the local-day streak, stamp the first
    /// flight, warm the egg if the web build left one incubating, and queue
    /// the stars for the Meadow's nest drop. Persists and returns the summary
    /// the Flight Report shows.
    @discardableResult
    func recordSessionEnd(starsEarned: Int, dayKey: String = EngagementStore.todayKey()) -> SessionEndResult {
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

// MARK: - Fledging (§03) — mirror of src/engagement/fledging.js

extension EngagementStore {

    nonisolated static let roughPrecision = 0.4
    nonisolated static let roughFlightsToGlide = 2
    nonisolated static let maxFledgingAttempts = 3
    nonisolated static let fledgingQuestions = 6
    nonisolated static let fledgingPass = 5

    struct FlightEndOutcome {
        let nomination: [String: Any]?
        let roughFlight: Bool
        let glideDown: Bool
    }

    func nomination(for mode: String) -> [String: Any]? {
        (load()["nominations"] as? [String: Any])?[mode] as? [String: Any]
    }

    /// End-of-normal-flight transition. A nomination clears exactly four ways
    /// (pass / rough flight / three failed attempts / any level change) and
    /// time away never clears it. Two CONSECUTIVE rough flights (< 40%
    /// precision) glide the kid down one level — the caller persists that.
    @discardableResult
    func recordFlightEnd(
        mode: String,
        precisionRatio: Double,
        nominated: Bool,
        weakSubskills: [String],
        dayKey: String = EngagementStore.todayKey()
    ) -> FlightEndOutcome {
        var state = load()
        var nominations = state["nominations"] as? [String: Any] ?? [:]
        var roughFlights = state["roughFlights"] as? [String: Any] ?? [:]
        let roughFlight = precisionRatio < Self.roughPrecision
        var glideDown = false

        if roughFlight {
            // Withdrawn by evidence — silently; the readiness signal is stale.
            nominations.removeValue(forKey: mode)
            let count = ProgressStore.int(roughFlights[mode]) + 1
            if count >= Self.roughFlightsToGlide {
                glideDown = true
                roughFlights[mode] = 0
            } else {
                roughFlights[mode] = count
            }
        } else {
            roughFlights[mode] = 0
            if nominated, nominations[mode] == nil {
                nominations[mode] = ["attempts": 0, "weakSubskills": weakSubskills, "day": dayKey]
            }
        }

        state["nominations"] = nominations
        state["roughFlights"] = roughFlights
        persist(state)
        return FlightEndOutcome(
            nomination: nominations[mode] as? [String: Any],
            roughFlight: roughFlight,
            glideDown: glideDown
        )
    }

    /// Fledging Flight result: pass consumes the nomination; a third failed
    /// attempt clears it for re-earning. One attempt per session — the caller
    /// only offers at take-off.
    @discardableResult
    func recordFledgingResult(mode: String, passed: Bool) -> (cleared: Bool, reearn: Bool) {
        var state = load()
        var nominations = state["nominations"] as? [String: Any] ?? [:]
        guard var nomination = nominations[mode] as? [String: Any] else { return (false, false) }

        var result: (cleared: Bool, reearn: Bool)
        if passed {
            nominations.removeValue(forKey: mode)
            result = (true, false)
        } else {
            let attempts = ProgressStore.int(nomination["attempts"]) + 1
            if attempts >= Self.maxFledgingAttempts {
                nominations.removeValue(forKey: mode)
                result = (true, true)
            } else {
                nomination["attempts"] = attempts
                nominations[mode] = nomination
                result = (false, false)
            }
        }
        state["nominations"] = nominations
        persist(state)
        return result
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
