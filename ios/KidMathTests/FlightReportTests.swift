import XCTest
@testable import KidMath

/// §01/§02 on iOS, behind GamFlags.flightReport: the flight settles through
/// the SAME shared-engine `summarizeFlight` the web uses, the wallet banks the
/// payout per kid, and the flag OFF keeps the historical one-star-per-first-try
/// behaviour byte-for-byte (SessionFlowTests covers that side).
@MainActor
final class FlightReportTests: XCTestCase {

    private func waitFor(_ condition: @escaping () -> Bool, timeout: TimeInterval = 5) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() {
            guard Date() < deadline else {
                XCTFail("timed out waiting for condition")
                return
            }
            try await Task.sleep(for: .milliseconds(10))
        }
    }

    private func correctSubmission(_ viewModel: SessionViewModel) throws -> Any {
        let answer = try XCTUnwrap(viewModel.question["answer"])
        if viewModel.answerType == "multiSelect", let alternatives = answer as? [[Any]] {
            return alternatives.first ?? answer
        }
        return answer
    }

    func testFlaggedSessionPaysTheFourPartSettlement() async throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        UserDefaults.standard.set(true, forKey: "gamFlightReport")
        defer { UserDefaults.standard.removeObject(forKey: "gamFlightReport") }

        let engine = try EngineBridge()
        try engine.setBankItems([])
        let progressStore = ProgressStore(supabase: .shared, defaults: defaults)
        let engagementStore = EngagementStore(defaults: defaults)

        let viewModel = SessionViewModel(
            modeId: "multiplication",
            engine: engine,
            progressStore: progressStore,
            bankService: nil,
            sessionSize: 5,
            correctHold: .milliseconds(5),
            wrongHold: .milliseconds(5),
            engagementStore: engagementStore
        )
        await viewModel.start()

        var answered = 0
        while answered < 30 {
            if case .complete = viewModel.phase { break }
            try await waitFor { if case .question = viewModel.phase { return true } else { return false } }
            viewModel.submit(try correctSubmission(viewModel))
            answered += 1
            try await waitFor {
                if case .question = viewModel.phase { return true }
                if case .complete = viewModel.phase { return true }
                return false
            }
        }

        guard case .complete(let stars, let lifetime) = viewModel.phase else {
            return XCTFail("session never completed (phase: \(viewModel.phase))")
        }
        let payout = try XCTUnwrap(viewModel.flightPayout, "flag on → the payout rides the phase")
        XCTAssertTrue(payout.finished)
        XCTAssertEqual(payout.landing, 2, "landing pays 2 for finishing")
        XCTAssertEqual(payout.precision, 5, "one star per first-try correct")
        XCTAssertEqual(payout.circleBack, 0)
        XCTAssertEqual(payout.total, payout.landing + payout.precision + payout.altitude + payout.circleBack)
        XCTAssertEqual(stars, payout.total, "the flight pays the settlement, not first-try count")
        XCTAssertEqual(lifetime, payout.total)

        // Wallet banked per kid; ledger defaults open in the first week.
        let summary = try XCTUnwrap(viewModel.flightSummary)
        XCTAssertEqual(summary.balance, payout.total)
        XCTAssertEqual(summary.streak, 1)
        XCTAssertTrue(summary.firstWeek)

        // progressStore honoured starsEarned over firstTryCorrect.
        let saved = progressStore.loadLocal(mode: "multiplication")
        XCTAssertEqual(ProgressStore.int(saved["lifetimeStars"]), payout.total)
    }

    func testStarsEarnedWinsOverFirstTryCorrectIncludingZero() {
        XCTAssertEqual(ProgressStore.starsEarned(from: ["firstTryCorrect": 7]), 7)
        XCTAssertEqual(ProgressStore.starsEarned(from: ["starsEarned": 12, "firstTryCorrect": 7]), 12)
        XCTAssertEqual(
            ProgressStore.starsEarned(from: ["starsEarned": 0, "firstTryCorrect": 7]),
            0,
            "an explicit zero (a Fledging Flight) must not fall back"
        )
    }

    func testEngagementBlobIsScopedPerKidWithOneTimeMigration() {
        let defaults = UserDefaults(suiteName: #function)!
        defaults.removePersistentDomain(forName: #function)
        let store = EngagementStore(defaults: defaults)

        // Anonymous play banks on the device-global key.
        store.recordSessionEnd(starsEarned: 12, dayKey: "2026-08-04")
        XCTAssertEqual(EngagementStore.starBalance(store.load()), 12)

        // Kid A signs in → inherits the anonymous blob exactly once.
        defaults.set("kid-a", forKey: "kidmath-active-kid")
        XCTAssertEqual(EngagementStore.starBalance(store.load()), 12)
        store.recordSessionEnd(starsEarned: 5, dayKey: "2026-08-04")

        // Kid B starts fresh — no shared wallet.
        defaults.set("kid-b", forKey: "kidmath-active-kid")
        XCTAssertEqual(EngagementStore.starBalance(store.load()), 0)
        store.recordSessionEnd(starsEarned: 3, dayKey: "2026-08-04")

        // Back to A: intact and separate.
        defaults.set("kid-a", forKey: "kidmath-active-kid")
        XCTAssertEqual(EngagementStore.starBalance(store.load()), 17)
        defaults.set("kid-b", forKey: "kidmath-active-kid")
        XCTAssertEqual(EngagementStore.starBalance(store.load()), 3)
    }

    func testStreakAndFirstWeekMathMirrorTheWebStore() {
        let defaults = UserDefaults(suiteName: #function)!
        defaults.removePersistentDomain(forName: #function)
        let store = EngagementStore(defaults: defaults)

        store.recordSessionEnd(starsEarned: 10, dayKey: "2026-08-04")
        let next = store.recordSessionEnd(starsEarned: 8, dayKey: "2026-08-05")
        XCTAssertEqual(next.streak, 2, "consecutive local days extend the streak")
        XCTAssertEqual(EngagementStore.currentStreak(next.state, dayKey: "2026-08-07"), 0, "a missed day ends it")

        XCTAssertTrue(EngagementStore.isFirstWeek(next.state, dayKey: "2026-08-10"))
        XCTAssertFalse(EngagementStore.isFirstWeek(next.state, dayKey: "2026-08-11"))
    }
}
