import XCTest
@testable import KidMath

/// §03 on iOS, behind GamFlags.fledging: the engine nominates instead of
/// leveling mid-flight, the nomination lifecycle clears exactly four ways,
/// and the Fledging Flight runs as a six-question challenge set through the
/// same view-model path the UI drives.
@MainActor
final class FledgingTests: XCTestCase {

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

    // MARK: - Pure lifecycle (mirror of the web fledging.spec)

    func testNominationLifecycleClearsExactlyFourWays() {
        let defaults = UserDefaults(suiteName: #function)!
        defaults.removePersistentDomain(forName: #function)
        let store = EngagementStore(defaults: defaults)

        // A nominated good flight sets a persisted nomination.
        var outcome = store.recordFlightEnd(
            mode: "addition", precisionRatio: 0.9, nominated: true, weakSubskills: ["makeTen"]
        )
        XCTAssertNotNil(outcome.nomination)
        XCTAssertFalse(outcome.roughFlight)

        // Re-nomination never resets failed-attempt counts.
        _ = store.recordFledgingResult(mode: "addition", passed: false)
        outcome = store.recordFlightEnd(
            mode: "addition", precisionRatio: 0.9, nominated: true, weakSubskills: []
        )
        XCTAssertEqual(ProgressStore.int(outcome.nomination?["attempts"]), 1)

        // A rough flight clears it silently and counts toward gliding down.
        outcome = store.recordFlightEnd(
            mode: "addition", precisionRatio: 0.3, nominated: false, weakSubskills: []
        )
        XCTAssertNil(outcome.nomination)
        XCTAssertTrue(outcome.roughFlight)
        XCTAssertFalse(outcome.glideDown)

        // Two consecutive rough flights glide down and reset the counter.
        outcome = store.recordFlightEnd(
            mode: "addition", precisionRatio: 0.2, nominated: false, weakSubskills: []
        )
        XCTAssertTrue(outcome.glideDown)

        // A good flight in between resets the rough counter.
        _ = store.recordFlightEnd(mode: "addition", precisionRatio: 0.3, nominated: false, weakSubskills: [])
        _ = store.recordFlightEnd(mode: "addition", precisionRatio: 0.8, nominated: false, weakSubskills: [])
        outcome = store.recordFlightEnd(mode: "addition", precisionRatio: 0.3, nominated: false, weakSubskills: [])
        XCTAssertFalse(outcome.glideDown)

        // Three failed attempts clear it for re-earning.
        _ = store.recordFlightEnd(mode: "division", precisionRatio: 0.9, nominated: true, weakSubskills: [])
        XCTAssertEqual(store.recordFledgingResult(mode: "division", passed: false).cleared, false)
        XCTAssertEqual(store.recordFledgingResult(mode: "division", passed: false).cleared, false)
        let third = store.recordFledgingResult(mode: "division", passed: false)
        XCTAssertTrue(third.cleared)
        XCTAssertTrue(third.reearn)
        XCTAssertNil(store.nomination(for: "division"))

        // Passing consumes it.
        _ = store.recordFlightEnd(mode: "money", precisionRatio: 0.9, nominated: true, weakSubskills: [])
        let pass = store.recordFledgingResult(mode: "money", passed: true)
        XCTAssertTrue(pass.cleared)
        XCTAssertFalse(pass.reearn)
        XCTAssertNil(store.nomination(for: "money"))
    }

    // MARK: - The full flagged flow through the view model

    func testFlaggedFlightNominatesThenFledgingFlightPromotes() async throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        UserDefaults.standard.set(true, forKey: "gamFledging")
        defer { UserDefaults.standard.removeObject(forKey: "gamFledging") }

        let engine = try EngineBridge()
        try engine.setBankItems([])
        let progressStore = ProgressStore(supabase: .shared, defaults: defaults)
        let engagementStore = EngagementStore(defaults: defaults)

        func makeViewModel() -> SessionViewModel {
            SessionViewModel(
                modeId: "multiplication",
                engine: engine,
                progressStore: progressStore,
                bankService: nil,
                sessionSize: 6,
                correctHold: .milliseconds(5),
                wrongHold: .milliseconds(5),
                engagementStore: engagementStore
            )
        }

        // Flight 1: all first-try, fast, with mastery forced high — the engine
        // NOMINATES and the level must NOT move mid-flight.
        let first = makeViewModel()
        await first.start()
        let startLevel = first.level
        var answered = 0
        while answered < 30 {
            if case .complete = first.phase { break }
            try await waitFor { if case .question = first.phase { return true } else { return false } }
            try engine.forceHighMastery(in: try XCTUnwrap(first.engineSessionForTesting))
            first.submit(try correctSubmission(first))
            answered += 1
            try await waitFor {
                if case .question = first.phase { return true }
                if case .complete = first.phase { return true }
                return false
            }
        }
        guard case .complete = first.phase else {
            return XCTFail("first flight never completed (phase: \(first.phase))")
        }
        XCTAssertEqual(first.level, startLevel, "fledging flag: no mid-flight level change")
        XCTAssertTrue(first.nominationPending, "the report should carry the Seafoam note")
        XCTAssertNotNil(engagementStore.nomination(for: "multiplication"))

        // Flight 2: the offer appears at take-off; accept and pass 5/6 —
        // the kid fledges, no stars ride on it, the normal flight follows.
        let second = makeViewModel()
        await second.start()
        guard case .fledgingOffer(let offeredLevel) = second.phase else {
            return XCTFail("expected the take-off offer (phase: \(second.phase))")
        }
        XCTAssertEqual(offeredLevel, startLevel)
        let starsBefore = ProgressStore.int(progressStore.loadLocal(mode: "multiplication")["lifetimeStars"])

        second.acceptFledging()
        XCTAssertTrue(second.isFledgingRun)
        var challengeAnswers = 0
        while challengeAnswers < 12 {
            if case .fledgingResult = second.phase { break }
            try await waitFor {
                if case .question = second.phase { return true }
                if case .fledgingResult = second.phase { return true }
                return false
            }
            if case .fledgingResult = second.phase { break }
            second.submit(try correctSubmission(second))
            challengeAnswers += 1
        }
        try await waitFor { if case .fledgingResult = second.phase { return true } else { return false } }
        guard case .fledgingResult(let passed, let newLevel) = second.phase else {
            return XCTFail("challenge never resolved (phase: \(second.phase))")
        }
        XCTAssertTrue(passed)
        XCTAssertEqual(newLevel, startLevel + 1)

        // Consumed nomination, promoted level persisted, zero stars paid.
        XCTAssertNil(engagementStore.nomination(for: "multiplication"))
        let saved = progressStore.loadLocal(mode: "multiplication")
        XCTAssertEqual(ProgressStore.int(saved["level"]), startLevel + 1)
        XCTAssertEqual(ProgressStore.int(saved["lifetimeStars"]), starsBefore, "no stars ride on a Fledging Flight")

        // Fly on → the normal flight begins with no second offer this session.
        await second.continueAfterFledging()
        try await waitFor { if case .question = second.phase { return true } else { return false } }
        XCTAssertEqual(second.level, startLevel + 1)
    }
}
