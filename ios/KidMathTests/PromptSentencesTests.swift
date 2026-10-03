import XCTest
@testable import KidMath

/// The question card's sentence split matches the web's `promptSentences`
/// (src/promptLayout.js) on the shared cases in Fixtures/promptSentences.json:
/// a "?" blank or a decimal point never ends a sentence.
final class PromptSentencesTests: XCTestCase {
    func testSentencesMatchSharedCases() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "promptSentences", withExtension: "json"))
        let root = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let cases = try XCTUnwrap(root["cases"] as? [[String: Any]])
        XCTAssertFalse(cases.isEmpty)
        for entry in cases {
            let prompt = try XCTUnwrap(entry["prompt"] as? String)
            let lines = try XCTUnwrap(entry["lines"] as? [String])
            XCTAssertEqual(QuestionDisplayView.sentences(of: prompt), lines, prompt)
        }
    }
}
