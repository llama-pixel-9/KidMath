import XCTest
@testable import KidMath

/// Teach-don't-grade on iOS reads the same scaffold, spoken text and mastery
/// model the web uses (src/scaffold.js, src/speakable.js, masterySummary.js).
@MainActor
final class TeachDontGradeTests: XCTestCase {

    func testScaffoldModelsMatchTheWeb() throws {
        let engine = try EngineBridge()
        let add = engine.scaffoldFor(question: ["mode": "addition", "a": 3, "b": 4, "op": "+", "answer": 7])
        XCTAssertEqual(add["kind"] as? String, "dots")
        XCTAssertEqual((add["groups"] as? [NSNumber])?.map(\.intValue), [3, 4])
        XCTAssertEqual(engine.scaffoldHint(add), "Count all the dots together.")

        let sub = engine.scaffoldFor(question: ["mode": "subtraction", "a": 7, "b": 2, "op": "-", "answer": 5])
        XCTAssertEqual(sub["kind"] as? String, "dots")
        XCTAssertEqual((sub["takeAway"] as? NSNumber)?.intValue, 2)
        XCTAssertEqual(engine.scaffoldHint(sub), "Count them, then cross some out.")

        let mul = engine.scaffoldFor(question: ["mode": "multiplication", "a": 3, "b": 4, "op": "×", "answer": 12])
        XCTAssertEqual(mul["kind"] as? String, "array")

        let big = engine.scaffoldFor(question: ["mode": "addition", "a": 340, "b": 275, "op": "+", "answer": 615])
        XCTAssertEqual(big["kind"] as? String, "look", "too big to model")
        XCTAssertEqual(engine.scaffoldHint(big), "Look again — take your time.")
    }

    func testSpeakableTextReadsEmojiAndOperators() throws {
        let engine = try EngineBridge()
        XCTAssertEqual(engine.speakableText("3 × 4 = ?"), "3 times 4 equals what")
        XCTAssertEqual(engine.speakableText("🍪🍪🍪🍪🍪 How many?", noun: "cookies"), "5 cookies How many what")
        XCTAssertEqual(engine.speakableText("What is 1/2 of 8?"), "What is 1 over 2 of 8 what")
    }

    func testMasteryLineOverThePracticeLog() throws {
        let engine = try EngineBridge()
        XCTAssertNil(engine.masteryLine(sessions: [], mode: "addition"), "nothing to say yet")
        let attempts: [[String: Any]] = (0..<5).map { ["subskill": "joinResultUnknown", "correct": true, "retry": false, "t": $0] }
        let session: [String: Any] = ["mode": "addition", "endedAt": 1, "startedAt": 0, "questions": 5, "firstTryCorrect": 5, "attempts": attempts]
        let line = try XCTUnwrap(engine.masteryLine(sessions: [session], mode: "addition"))
        XCTAssertTrue(line.hasSuffix("skills solid"), line)
        XCTAssertTrue(line.hasPrefix("1 of "), line)
    }

    func testAutoReadOnlyForKAndFirstGrade() {
        UserDefaults.standard.set(true, forKey: "gamReadAloud")
        defer { UserDefaults.standard.removeObject(forKey: "gamReadAloud") }
        XCTAssertTrue(SpeechService.autoReadEnabled(grade: "K"))
        XCTAssertTrue(SpeechService.autoReadEnabled(grade: "1st"))
        XCTAssertFalse(SpeechService.autoReadEnabled(grade: "2nd"))
        XCTAssertFalse(SpeechService.autoReadEnabled(grade: nil))
    }
}

@MainActor
final class HintPaneTests: XCTestCase {
    func testHintComesFromTheSharedHintFor() throws {
        let engine = try EngineBridge()
        let q: [String: Any] = ["mode": "addition", "a": 6, "b": 3, "op": "+", "answer": 9,
                                "display": ["promptText": "6 + 3 = ?"], "metadata": ["subskill": "joinResultUnknown", "modeId": "addition"]]
        let hint = try XCTUnwrap(engine.hintFor(question: q))
        XCTAssertFalse((hint["title"] as? String ?? "").isEmpty)
        XCTAssertEqual(hint["modeTitle"] as? String, "Adding")
        let steps = try XCTUnwrap(hint["steps"] as? [String])
        XCTAssertFalse(steps.isEmpty)
        XCTAssertFalse(steps.joined(separator: " ").contains("= 9"), "steps never give the answer")
        XCTAssertEqual((hint["visual"] as? [String: Any])?["kind"] as? String, "dots")
        XCTAssertNotNil(hint["example"])
    }
}
