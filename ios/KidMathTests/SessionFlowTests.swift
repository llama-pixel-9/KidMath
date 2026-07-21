import XCTest
@testable import KidMath

/// P2: a full session played through SessionViewModel — the same path the
/// UI drives — ends complete, awards stars, and persists progress locally.
@MainActor
final class SessionFlowTests: XCTestCase {

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
}
