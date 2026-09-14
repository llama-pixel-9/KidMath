import XCTest
@testable import KidMath

/// Badges, stickers and the daily goal come from the SHARED rules
/// (engagementRules.js via the engine) — the same transition the web applies.
final class EngagementRulesTests: XCTestCase {

    private func store(_ name: String) throws -> EngagementStore {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: name))
        defaults.removePersistentDomain(forName: name)
        return EngagementStore(defaults: defaults)
    }

    func testCataloguesMatchTheWeb() {
        XCTAssertNotNil(EngagementStore.rules, "engine must load for the shared rules")
        XCTAssertEqual(EngagementStore.badges().count, 8)
        XCTAssertEqual(EngagementStore.badges().first?.id, "firstSession")
        XCTAssertEqual(EngagementStore.stickers().count, 22)
        XCTAssertEqual(EngagementStore.stickers().first?.cost, 10)
        XCTAssertEqual(EngagementStore.stickers().last?.cost, 100)
        XCTAssertEqual(EngagementStore.dailyGoal, 10)
    }

    func testFirstSessionEarnsFirstStepsAndAPerfectRound() throws {
        let s = try store(#function)
        let result = s.recordSessionEnd(starsEarned: 6, facts: .init(perfect: true, comebacks: 0, trapWins: 0, levelReached: 2), dayKey: "2026-09-13")
        XCTAssertEqual(result.balance, 6)
        XCTAssertEqual(result.streak, 1)
        XCTAssertTrue(result.streakExtended)
        XCTAssertFalse(result.goalJustMet, "6 of 10 — not yet")
        XCTAssertEqual(Set(result.newBadges.map(\.id)), ["firstSession", "perfectRound"])
        XCTAssertEqual(s.earnedBadgeIds().sorted(), ["firstSession", "perfectRound"])
        // Facts persisted for the badges that need a tally.
        let state = s.load()
        XCTAssertEqual(ProgressStore.int(state["perfectSessions"]), 1)
        XCTAssertEqual(ProgressStore.int(state["sessionsCount"]), 1)
        XCTAssertEqual(ProgressStore.int(state["maxLevel"]), 2)
    }

    func testDailyGoalFiresExactlyOnTheCrossing() throws {
        let s = try store(#function)
        XCTAssertFalse(s.recordSessionEnd(starsEarned: 6, dayKey: "2026-09-13").goalJustMet)
        XCTAssertTrue(s.recordSessionEnd(starsEarned: 5, dayKey: "2026-09-13").goalJustMet, "6 → 11 crosses 10")
        XCTAssertFalse(s.recordSessionEnd(starsEarned: 5, dayKey: "2026-09-13").goalJustMet, "already met today")
        XCTAssertEqual(EngagementStore.starsToday(s.load(), dayKey: "2026-09-13"), 16)
        XCTAssertEqual(EngagementStore.starsToday(s.load(), dayKey: "2026-09-14"), 0, "stale day reads as empty")
    }

    func testStreakBadgesAndPeakClimber() throws {
        let s = try store(#function)
        for day in ["2026-09-10", "2026-09-11", "2026-09-12"] {
            _ = s.recordSessionEnd(starsEarned: 3, dayKey: day)
        }
        XCTAssertTrue(s.earnedBadgeIds().contains("streak3"))
        let peak = s.recordSessionEnd(starsEarned: 3, facts: .init(levelReached: 7), dayKey: "2026-09-13")
        XCTAssertTrue(peak.newBadges.contains { $0.id == "peakClimber" })
    }

    func testStickerSpendGoesThroughTheSharedRule() throws {
        let s = try store(#function)
        let cat = try XCTUnwrap(EngagementStore.stickers().first { $0.id == "cat" })
        XCTAssertFalse(s.buySticker(cat), "no stars yet")
        _ = s.recordSessionEnd(starsEarned: 12, dayKey: "2026-09-13")
        XCTAssertTrue(s.buySticker(cat))
        XCTAssertEqual(s.ownedStickerIds(), ["cat"])
        XCTAssertEqual(EngagementStore.starBalance(s.load()), 2)
        XCTAssertFalse(s.buySticker(cat), "already owned")
        let galaxy = try XCTUnwrap(EngagementStore.stickers().first { $0.id == "galaxy" })
        XCTAssertFalse(s.buySticker(galaxy), "balance short")
    }
}
