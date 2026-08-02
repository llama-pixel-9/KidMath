import PDFKit
import XCTest
@testable import KidMath

final class WorksheetTests: XCTestCase {

    /// Generate a worksheet through the engine and render it to PDF — the
    /// full path behind the Share/Print button. 20 problems + answer key at
    /// 10 per page must produce a 4-page document.
    @MainActor
    func testWorksheetRendersMultiPagePDF() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let problems = try engine.generateWorksheetSet(
            mode: "addition", level: 2, size: 20, options: ["allowWordProblems": false]
        )
        XCTAssertEqual(problems.count, 20)

        let url = try XCTUnwrap(
            WorksheetPDF.render(modeLabel: "Addition Fun", problems: problems, includeAnswerKey: true)
        )
        let document = try XCTUnwrap(PDFDocument(url: url))
        XCTAssertEqual(document.pageCount, 4, "20 problems at 10/page + answer key = 4 pages")

        // Problem pages carry the header and blanks; key pages carry answers.
        let firstPage = document.page(at: 0)?.string ?? ""
        XCTAssertTrue(firstPage.contains("larkit"), "header missing from page 1")
        XCTAssertTrue(firstPage.contains("Name"), "name line missing from page 1")
        let keyPage = document.page(at: 2)?.string ?? ""
        XCTAssertTrue(keyPage.contains("Answer Key"), "answer key page missing")
    }

    /// Every catalog mode must produce a renderable worksheet line for each
    /// of its problems (no silent "? = _" fallbacks from missing fields
    /// would be caught by inspecting the attributed output being non-trivial).
    @MainActor
    func testEveryModeGeneratesWorksheetProblems() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        for mode in ModeCatalog.allModes {
            let problems = try engine.generateWorksheetSet(mode: mode.id, level: 3, size: 5, options: [:])
            XCTAssertEqual(problems.count, 5, "\(mode.id): worksheet generation failed")
            for problem in problems {
                XCTAssertNotNil(problem["answer"], "\(mode.id): worksheet problem has no answer")
            }
        }
    }
}
