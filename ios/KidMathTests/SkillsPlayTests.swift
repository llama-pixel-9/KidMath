import XCTest
@testable import KidMath

/// Play by skill on iOS (GamFlags.skillsPlay): the same flow the web runs
/// (src/skills/flow.js through the bridge), driven the way the UI drives it.
@MainActor
final class SkillsPlayTests: XCTestCase {

    // Grade 2 Subtraction is three computation drills — no bank needed.
    private let grade2 = ["sub-2digit-no-regroup", "sub-2digit-regroup", "sub-3digit-no-regroup"]

    override func setUp() {
        super.setUp()
        UserDefaults.standard.set(true, forKey: "skillsPlay")
        UserDefaults.standard.set(false, forKey: "gamAll") // base economy, as SessionFlowTests
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "skillsPlay")
        UserDefaults.standard.removeObject(forKey: "gamAll")
        super.tearDown()
    }

    private func waitFor(_ condition: @escaping () -> Bool, timeout: TimeInterval = 5) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() {
            guard Date() < deadline else { return XCTFail("timed out waiting for condition") }
            try await Task.sleep(for: .milliseconds(10))
        }
    }

    private var logDefaults = UserDefaults.standard

    private func store(_ name: String) throws -> (ProgressStore, EngineBridge) {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: name))
        defaults.removePersistentDomain(forName: name)
        logDefaults = defaults
        let engine = try EngineBridge()
        try engine.setBankItems([])
        return (ProgressStore(supabase: .shared, defaults: defaults), engine)
    }

    private func model(_ request: SessionViewModel.SkillRequest?, _ store: ProgressStore, _ engine: EngineBridge, size: Int = 5) -> SessionViewModel {
        SessionViewModel(
            modeId: "subtraction", engine: engine, progressStore: store, bankService: nil,
            sessionSize: size, skillRequest: request, correctHold: .milliseconds(2), wrongHold: .milliseconds(2),
            // Mastery is settled from the closed practice record, so there must be a log.
            practiceLog: PracticeLog(engine: engine, supabase: .shared, defaults: logDefaults)
        )
    }

    /// Plays to the end card answering everything right; returns the skill id
    /// stamped on each question served.
    private func play(_ viewModel: SessionViewModel) async throws -> [String?] {
        var served: [String?] = []
        for _ in 0..<30 {
            if case .complete = viewModel.phase { break }
            try await waitFor { if case .question = viewModel.phase { return true } else { return false } }
            served.append(viewModel.question["skillId"] as? String)
            viewModel.submit(try XCTUnwrap(viewModel.question["answer"]))
            try await waitFor {
                if case .question = viewModel.phase { return true }
                if case .complete = viewModel.phase { return true }
                return false
            }
        }
        return served
    }

    private func mastered() -> [String: Any] {
        ["state": "mastered", "attempts": 10, "correct": 10, "recent": "1111111111", "sessions": 2,
         "needsReview": false, "masteredAt": 1, "lastSessionAt": 1, "sinceMastery": ""]
    }

    func testPinnedSkillServesOnlyItsSkillAndNeverMovesTheLevel() async throws {
        let (progress, engine) = try store(#function)
        progress.saveLocal(mode: "subtraction", data: ["level": 9]) // a level-9 kid practicing a grade-2 skill
        let viewModel = model(.skill("sub-2digit-regroup"), progress, engine)
        await viewModel.start()

        XCTAssertTrue(viewModel.isSkillSession)
        XCTAssertEqual(viewModel.sessionLabel, "Subtract 2-digit numbers with regrouping")
        let served = try await play(viewModel)
        XCTAssertEqual(served.count, 5)
        XCTAssertTrue(served.allSatisfy { $0 == "sub-2digit-regroup" }, "served: \(served)")
        XCTAssertFalse(viewModel.showLevelUp)

        let saved = progress.loadLocal(mode: "subtraction")
        XCTAssertEqual(ProgressStore.int(saved["level"]), 9, "a skill session never moves the saved level")
        XCTAssertEqual(ProgressStore.int(saved["totalSessions"]), 2)
        let entry = (saved["skillMastery"] as? [String: Any])?["sub-2digit-regroup"] as? [String: Any]
        XCTAssertEqual(entry?["state"] as? String, "practicing", "one session is never enough to master")
        XCTAssertEqual(viewModel.skillStanding?["line"] as? String, "Grade 2 · 0 of 3 skills mastered")
    }

    func testLarkitPicksMixesTheGradesSkills() async throws {
        let (progress, engine) = try store(#function)
        await progress.saveTopicState(mode: "subtraction", patch: ["grade": "2", "gradeUnlocked": "2"])
        let viewModel = model(.mix(grade: nil), progress, engine, size: 6)
        await viewModel.start()
        XCTAssertEqual(viewModel.sessionLabel, "Mixed · Grade 2")
        let served = Set(try await play(viewModel).compactMap { $0 })
        XCTAssertTrue(served.isSubset(of: Set(grade2)), "served: \(served)")
        XCTAssertGreaterThan(served.count, 1, "a mix is more than one skill")
    }

    func testEarnedFledgingFlightOpensTheNextGradeAndPaysNoStars() async throws {
        let (progress, engine) = try store(#function)
        let mastery = Dictionary(uniqueKeysWithValues: grade2.map { ($0, mastered() as Any) })
        await progress.saveTopicState(mode: "subtraction", patch: ["grade": "2", "gradeUnlocked": "2", "skillMastery": mastery])

        let sheet = try XCTUnwrap(engine.topicSheetModel(mode: "subtraction", progress: progress.loadLocal(mode: "subtraction"), context: [:]))
        XCTAssertEqual((sheet["flight"] as? [String: Any])?["button"] as? String, "Take the Fledging Flight")

        let viewModel = model(.flight, progress, engine, size: 10)
        await viewModel.start()
        XCTAssertTrue(viewModel.isFledgingRun)
        XCTAssertEqual(viewModel.sessionSize, 6)
        XCTAssertEqual(viewModel.sessionLabel, "Fledging Flight to Grade 3")
        let flown = try await play(viewModel)
        XCTAssertEqual(flown.count, 6)

        guard case .complete(let stars, _) = viewModel.phase else { return XCTFail("never completed") }
        XCTAssertEqual(stars, 0, "no stars ride on a Fledging Flight")
        let note = viewModel.skillStanding?["gradeUpNote"] as? [String: Any]
        XCTAssertEqual(note?["headline"] as? String, "You finished Grade 2 Subtraction!")
        XCTAssertEqual(note?["detail"] as? String, "Grade 3 is open.")
        let saved = progress.loadLocal(mode: "subtraction")
        XCTAssertEqual(saved["grade"] as? String, "3")
        XCTAssertEqual(saved["gradeUnlocked"] as? String, "3")
        XCTAssertEqual(ProgressStore.int(saved["lifetimeStars"]), 0)
    }

    func testUnearnedFlightAndFlagOffBothPlayTheLadder() async throws {
        let (progress, engine) = try store(#function)
        let unearned = model(.flight, progress, engine)
        await unearned.start()
        XCTAssertFalse(unearned.isSkillSession, "a Fledging Flight cannot be started before it is earned")
        XCTAssertNil(unearned.sessionLabel)

        UserDefaults.standard.set(false, forKey: "skillsPlay")
        let flagOff = model(.skill("sub-2digit-regroup"), progress, engine)
        await flagOff.start()
        XCTAssertFalse(flagOff.isSkillSession)
    }

    func testSavingTopicStateNeverCountsASessionOrMovesTheLevel() async throws {
        let (progress, _) = try store(#function)
        progress.saveLocal(mode: "subtraction", data: ["level": 7, "firstTryCorrect": 4])
        await progress.saveTopicState(mode: "subtraction", patch: ["grade": "3", "pinnedSkillId": "sub-across-zeros"])
        var saved = progress.loadLocal(mode: "subtraction")
        XCTAssertEqual(ProgressStore.int(saved["level"]), 7)
        XCTAssertEqual(ProgressStore.int(saved["totalSessions"]), 1)
        XCTAssertEqual(ProgressStore.int(saved["lifetimeStars"]), 4)
        XCTAssertEqual(saved["pinnedSkillId"] as? String, "sub-across-zeros")

        // A ladder session afterwards leaves the skill fields alone; un-pinning clears.
        progress.saveLocal(mode: "subtraction", data: ["level": 8])
        await progress.saveTopicState(mode: "subtraction", patch: ["pinnedSkillId": NSNull()])
        saved = progress.loadLocal(mode: "subtraction")
        XCTAssertEqual(saved["grade"] as? String, "3")
        XCTAssertNil(saved["pinnedSkillId"])
    }

    func testTopicSheetAndChipComeFromTheSharedFlow() throws {
        let engine = try EngineBridge()
        let context: [String: Any] = ["profileGrade": "3rd", "sessions": [[String: Any]]()]
        let sheet = try XCTUnwrap(engine.topicSheetModel(mode: "subtraction", progress: [:], context: context))
        XCTAssertEqual(sheet["gradeLabel"] as? String, "Grade 3")
        XCTAssertEqual(sheet["practiceLabel"] as? String, "Practice — Larkit picks")
        let skills = try XCTUnwrap(sheet["skills"] as? [[String: Any]])
        XCTAssertEqual(skills.count, 3)
        XCTAssertTrue(skills.allSatisfy { ($0["statusText"] as? String) == "Not started" })
        XCTAssertEqual((sheet["toSave"] as? [String: Any])?["grade"] as? String, "3")
        XCTAssertNotEqual(engine.topicSheetModel(mode: "subtraction", progress: [:], context: context, shownGrade: "4")?["grade"] as? String, "4", "a locked grade cannot be shown")

        let chip = try XCTUnwrap(engine.topicChip(mode: "subtraction", progress: [:], context: context))
        XCTAssertEqual(chip["text"] as? String, "Grade 3 · 0/3")
        XCTAssertEqual(chip["started"] as? Bool, false)

        let patch = engine.unlockGradePatch(mode: "subtraction", progress: [:], context: context, grade: "4")
        XCTAssertEqual(patch["gradeUnlocked"] as? String, "4")
    }
}
