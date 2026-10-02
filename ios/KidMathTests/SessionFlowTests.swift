import XCTest
@testable import KidMath

/// P2: a full session played through SessionViewModel — the same path the
/// UI drives — ends complete, awards stars, and persists progress locally.
@MainActor
final class SessionFlowTests: XCTestCase {

    // These tests assert the BASE economy (one star per first-try-correct
    // answer). GamFlags.all is on by default since parity-1 (matching web
    // prod), which adds Flight Report bonuses — FlightReportTests cover
    // those. Pin the base economy here.
    override func setUp() {
        super.setUp()
        UserDefaults.standard.set(false, forKey: "gamAll")
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "gamAll")
        super.tearDown()
    }

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

    /// A correct submission the way each widget would produce it.
    private func correctSubmission(_ viewModel: SessionViewModel) throws -> Any {
        let answer = try XCTUnwrap(viewModel.question["answer"])
        if viewModel.answerType == "multiSelect", let alternatives = answer as? [[Any]] {
            return alternatives.first ?? answer
        }
        return answer
    }

    func testFullSessionThroughViewModelPersistsProgress() async throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let progressStore = ProgressStore(supabase: .shared, defaults: defaults)

        let viewModel = SessionViewModel(
            modeId: "multiplication",
            engine: engine,
            progressStore: progressStore,
            bankService: nil,
            sessionSize: 5,
            correctHold: .milliseconds(5),
            wrongHold: .milliseconds(5)
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
        XCTAssertEqual(stars, 5, "all first-try-correct answers earn a star each")
        XCTAssertEqual(lifetime, 5)

        // Progress persisted locally in the web's localStorage shape.
        let saved = progressStore.loadLocal(mode: "multiplication")
        XCTAssertEqual(ProgressStore.int(saved["totalSessions"]), 1)
        XCTAssertEqual(ProgressStore.int(saved["lifetimeStars"]), 5)
    }

    /// P3: every mode in the catalog — including the visual-widget ones —
    /// plays a full session to completion through the view model. Catches a
    /// mode whose questions can't be answered by the widget contract.
    func testEveryCatalogModePlaysToCompletion() async throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let progressStore = ProgressStore(supabase: .shared, defaults: defaults)

        for mode in ModeCatalog.allModes where mode.playable {
            let viewModel = SessionViewModel(
                modeId: mode.id,
                engine: engine,
                progressStore: progressStore,
                bankService: nil,
                sessionSize: 3,
                correctHold: .milliseconds(2),
                wrongHold: .milliseconds(2)
            )
            await viewModel.start()

            var submissions = 0
            while submissions < 15 {
                if case .complete = viewModel.phase { break }
                try await waitFor { if case .question = viewModel.phase { return true } else { return false } }
                viewModel.submit(try correctSubmission(viewModel))
                submissions += 1
                try await waitFor {
                    if case .question = viewModel.phase { return true }
                    if case .complete = viewModel.phase { return true }
                    return false
                }
            }
            guard case .complete(let stars, _) = viewModel.phase else {
                return XCTFail("\(mode.id): session never completed (phase \(viewModel.phase))")
            }
            XCTAssertEqual(stars, 3, "\(mode.id): expected every answer to score correct")
        }
    }

    func testWrongAnswerRevealsAndContinues() async throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        let engine = try EngineBridge()
        try engine.setBankItems([])

        let viewModel = SessionViewModel(
            modeId: "addition",
            engine: engine,
            progressStore: ProgressStore(supabase: .shared, defaults: defaults),
            bankService: nil,
            sessionSize: 3,
            correctHold: .milliseconds(5),
            wrongHold: .milliseconds(5)
        )
        await viewModel.start()
        try await waitFor { if case .question = viewModel.phase { return true } else { return false } }

        viewModel.submit("definitely-wrong-answer")
        guard case .feedback(let correct) = viewModel.phase else {
            return XCTFail("expected feedback phase")
        }
        XCTAssertFalse(correct)
        XCTAssertNotNil(viewModel.revealAnswer, "wrong answers reveal the correct one")

        // Submissions during feedback are ignored (answer lock, web parity).
        viewModel.submit("another-answer")
        try await waitFor { if case .question = viewModel.phase { return true } else { return false } }
    }

    // MARK: - Word problems setting

    /// Never set reads ON: the engine treats a missing option as off, so the
    /// stored setting must say on until a grown-up turns it off.
    func testWordProblemsSettingIsOnWhenNeverSet() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        XCTAssertEqual(WordProblemsSetting.key, "kidmath-allow-word-problems", "the web's key (src/userPreferences.js)")
        XCTAssertNil(defaults.object(forKey: WordProblemsSetting.key))
        XCTAssertTrue(WordProblemsSetting.isOn(in: defaults), "word problems are on until a grown-up turns them off")

        WordProblemsSetting.set(false, in: defaults)
        XCTAssertFalse(WordProblemsSetting.isOn(in: defaults))
        WordProblemsSetting.set(true, in: defaults)
        XCTAssertTrue(WordProblemsSetting.isOn(in: defaults))
    }

    /// Plain and skill sessions both start with the stored setting (never
    /// set → on), so a chosen skill serves its story questions. This checks
    /// the option only: subtraction's stories stay held by the engine
    /// (src/skills/storyHold.js) whatever the setting.
    func testEverySessionGetsTheWordProblemsSetting() async throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let progressStore = ProgressStore(supabase: .shared, defaults: defaults)
        defer { UserDefaults.standard.removeObject(forKey: WordProblemsSetting.key) }

        let requests: [SessionViewModel.SkillRequest?] = [nil, SessionViewModel.SkillRequest.skill("sub-2digit-regroup")]
        let stored: [Bool?] = [nil, false, true]
        for setting in stored {
            if let setting {
                WordProblemsSetting.set(setting)
            } else {
                UserDefaults.standard.removeObject(forKey: WordProblemsSetting.key)
            }
            for request in requests {
                let viewModel = SessionViewModel(
                    modeId: "subtraction",
                    engine: engine,
                    progressStore: progressStore,
                    bankService: nil,
                    sessionSize: 3,
                    skillRequest: request,
                    correctHold: .milliseconds(2),
                    wrongHold: .milliseconds(2)
                )
                await viewModel.start()
                XCTAssertEqual(viewModel.isSkillSession, request != nil)
                let snapshot = try XCTUnwrap(viewModel.engineSessionForTesting?.snapshot)
                XCTAssertEqual(
                    snapshot["allowWordProblems"] as? Bool,
                    setting ?? true,
                    "stored \(String(describing: setting)), skill session \(request != nil)"
                )
            }
        }
    }
}
