import Foundation

/// Gamification rollout flags — the Swift mirror of src/gamificationFlags.js,
/// following the same launch-switch pattern as `StoreService.paywallEnabled`:
/// every step is OFF by default and can be forced on for manual testing via
/// the simulator argument domain, e.g.
/// `simctl launch io.larkit.app -gamFlightReport 1`.
///
/// Flip a step's default to `true` together with the matching web env var
/// (`VITE_GAM_FLIGHT_REPORT` etc.) so both platforms settle flights the same
/// way — the payout formula must never differ between a kid's iPad and the web.
enum GamFlags {
    /// Master launch switch — the Swift mirror of the web's `VITE_GAM_ALL`.
    /// Flip this to `true` (together with the web env var) to turn every step
    /// on; a step's own launch arg still wins either way, so
    /// `-gamMeadow 0 -gamAll 1` runs everything except the Meadow.
    nonisolated static var all: Bool {
        if UserDefaults.standard.object(forKey: "gamAll") != nil {
            return UserDefaults.standard.bool(forKey: "gamAll")
        }
        // Web prod has had VITE_GAM_ALL=true since 2026-09-12 — iOS follows.
        return true
    }

    nonisolated static func step(_ key: String) -> Bool {
        if UserDefaults.standard.object(forKey: key) != nil {
            return UserDefaults.standard.bool(forKey: key)
        }
        return all
    }

    /// §01 economy + §02 Flight Report.
    nonisolated static var flightReport: Bool { step("gamFlightReport") }
    /// §03 nomination + Fledging Flights (not yet ported — reserved).
    nonisolated static var fledging: Bool { step("gamFledging") }
    /// §04–§06 the Meadow.
    nonisolated static var meadow: Bool { step("gamMeadow") }
    /// §09 behaviour rigs (signature moves, rare tap responses).
    nonisolated static var roster: Bool { step("gamRoster") }
    /// §10–§12 eggs/hatching, seasons and night.
    nonisolated static var ceremonies: Bool { step("gamCeremonies") }
    /// §14 ambient motion (idle bob etc.); always subordinate to the OS
    /// reduce-motion setting and Calm mode.
    nonisolated static var meadowMotion: Bool { step("gamMeadowMotion") }
    /// §07 Field Guide + §08 Give a home (web: VITE_GAM_BIRD_STORE).
    nonisolated static var birdStore: Bool { step("gamBirdStore") }
    /// Ladder v2 — relative-pace promotion, no-repeat window
    /// (web: VITE_GAM_LADDER_V2). Passed to createAdaptiveSession as
    /// options.ladderV2; the engine owns the rule, so both platforms climb
    /// the same ladder.
    nonisolated static var ladderV2: Bool { step("gamLadderV2") }
    /// Teach-don't-grade second chance with a scaffold on the first miss
    /// (web: VITE_GAM_SECOND_CHANCE). Not yet rendered on iOS.
    nonisolated static var secondChance: Bool { step("gamSecondChance") }
    /// Read-aloud prompts (web: VITE_GAM_READ_ALOUD). Not yet wired on iOS.
    nonisolated static var readAloud: Bool { step("gamReadAloud") }

    /// Play by skill — Grade → Topic → Skill with durable mastery instead of
    /// the level ladder (web: VITE_SKILLS_PLAY, on in prod since 2026-09-26).
    /// ON by default; `-skillsPlay 0` is the kill switch. Never a gamification
    /// step — it does not follow `all`.
    nonisolated static var skillsPlay: Bool {
        if UserDefaults.standard.object(forKey: "skillsPlay") != nil {
            return UserDefaults.standard.bool(forKey: "skillsPlay")
        }
        return true
    }
}
