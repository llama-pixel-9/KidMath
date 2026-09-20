import PDFKit
import XCTest
@testable import KidMath

/// Worksheets render through the shared skill catalog (src/worksheets/) to a
/// Letter PDF — one page per sheet, then one answer-key page per sheet. One
/// sheet is ONE layout, its title is a promise about every problem on it, and
/// every layout's budget has to fit the page.
final class WorksheetTests: XCTestCase {

    private func sheets(_ engine: EngineBridge, _ catalog: [String: Any], skillId: String, type: String = "practice", count: Int = 1) throws -> [WorksheetPDF.Sheet] {
        let skill = try XCTUnwrap((catalog["skills"] as? [[String: Any]])?.first { $0["id"] as? String == skillId }, skillId)
        return try engine.generateWorksheetRun(skillId: skillId, problemType: type, sheets: count).map {
            WorksheetPDF.Sheet(header: skill["header"] as? String ?? "", footer: "Test",
                               layouts: catalog["layouts"] as? [String: Any] ?? [:],
                               storyWorkSpace: CGFloat((catalog["storyWorkSpace"] as? NSNumber)?.doubleValue ?? 0),
                               payload: $0)
        }
    }

    @MainActor
    func testTheReportedSheetIsOneLayoutAndKeepsItsPromise() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let catalog = try engine.worksheetCatalog()
        let run = try sheets(engine, catalog, skillId: "sub-3digit-regroup", count: 2)
        XCTAssertEqual(run.count, 2)
        for sheet in run {
            XCTAssertEqual(sheet.layoutName, "stacked")
            XCTAssertEqual(sheet.items.count, 24, "the stacked budget")
            XCTAssertTrue(sheet.wordProblems.isEmpty)
            for q in sheet.items {
                let a = try XCTUnwrap((q["a"] as? NSNumber)?.intValue), b = try XCTUnwrap((q["b"] as? NSNumber)?.intValue)
                XCTAssertTrue(a >= 100 && b >= 100, "\(a) − \(b) is 3-digit − 3-digit")
                var (x, y, borrows) = (a, b, false)
                while y > 0 { if x % 10 < y % 10 { borrows = true }; x /= 10; y /= 10 }
                XCTAssertTrue(borrows, "\(a) − \(b) regroups")
            }
        }

        let url = try XCTUnwrap(WorksheetPDF.render(sheets: run, engine: engine, fileName: "Larkit Worksheet - Test"))
        if let dir = ProcessInfo.processInfo.environment["KIDMATH_FIGURE_SNAPSHOT_DIR"] {
            let copy = URL(fileURLWithPath: dir).appendingPathComponent("worksheet.pdf")
            try? FileManager.default.removeItem(at: copy)
            try FileManager.default.copyItem(at: url, to: copy)
        }
        let document = try XCTUnwrap(PDFDocument(url: url))
        XCTAssertEqual(document.pageCount, 4, "2 sheets + 2 answer keys")
        let firstPage = document.page(at: 0)?.string ?? ""
        XCTAssertTrue(firstPage.contains("larkit"), "header lockup")
        XCTAssertTrue(firstPage.contains("Subtract 3-digit numbers with regrouping"), "the header names the skill")
        XCTAssertTrue(firstPage.contains("Grade 3"))
        XCTAssertFalse(firstPage.contains("3.NBT.A.2"), "standard codes are data, not copy")
        XCTAssertTrue(firstPage.contains("Sheet 1 of 2"))
        XCTAssertFalse(firstPage.contains("Level"), "no level on paper")
        XCTAssertFalse(firstPage.lowercased().contains("flight log"))
        XCTAssertTrue(firstPage.contains("Name"), "name line")
        XCTAssertTrue(firstPage.contains("Landed"), "footer")
        // Right way up: PDF space starts at the bottom, so the footer sits low
        // and the Name line high. (The old renderer printed upside down.)
        let page = try XCTUnwrap(document.page(at: 0))
        let footerY = try XCTUnwrap(document.findString("Landed", withOptions: []).first).bounds(for: page).midY
        let nameY = try XCTUnwrap(document.findString("Name", withOptions: []).first).bounds(for: page).midY
        XCTAssertLessThan(footerY, WorksheetPDF.pageSize.height * 0.2, "footer at the bottom")
        XCTAssertGreaterThan(nameY, WorksheetPDF.pageSize.height * 0.8, "name line at the top")
        let keyPage = document.page(at: 2)?.string ?? ""
        XCTAssertTrue(keyPage.contains("Answer key"))
        XCTAssertFalse(keyPage.contains("Name"), "the key sheet has no name line")
    }

    /// Every computation layout fills its budget and fits the page. A fixed
    /// page frame clips an overfull sheet silently, so measure what it wants.
    @MainActor
    func testEveryComputationLayoutFitsOnePage() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let catalog = try engine.worksheetCatalog()
        let layouts = try XCTUnwrap(catalog["layouts"] as? [String: [String: Any]])
        let cases = ["sub-3digit-regroup", "sub-2digit-1digit", "mul-3digit-by-2digit", "add-4digit",
                     "mul-tables-7-8-9", "add-within-5", "div-2digit-remainder", "div-by-2digit"]
        for skillId in cases {
            let sheet = try XCTUnwrap(try sheets(engine, catalog, skillId: skillId).first, skillId)
            let budget = try XCTUnwrap((layouts[sheet.layoutName]?["practice"] as? NSNumber)?.intValue)
            XCTAssertEqual(sheet.items.count, budget, "\(skillId): fills the \(sheet.layoutName) budget")
            XCTAssertEqual(sheet.shortfall, 0, skillId)
            let height = WorksheetPDF.naturalHeight(of: sheet, engine: engine)
            XCTAssertGreaterThan(height, WorksheetPDF.pageSize.height * 0.6, "\(skillId): fills most of the page")
            XCTAssertLessThanOrEqual(height, WorksheetPDF.pageSize.height, "\(skillId): \(sheet.layoutName) spills past the page")
        }
    }

    /// Division carries its remainder onto the answer key as "q R r".
    @MainActor
    func testDivisionWithRemaindersPrintsBracketsAndRemainders() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let catalog = try engine.worksheetCatalog()
        let run = try sheets(engine, catalog, skillId: "div-2digit-remainder")
        XCTAssertEqual(run.first?.layoutName, "longDivision")
        for q in run.first?.items ?? [] {
            let a = (q["a"] as? NSNumber)?.intValue ?? 0, b = (q["b"] as? NSNumber)?.intValue ?? 1
            let quotient = (q["answer"] as? NSNumber)?.intValue ?? 0, r = (q["remainder"] as? NSNumber)?.intValue ?? 0
            XCTAssertEqual(b * quotient + r, a)
            XCTAssertTrue(r > 0 && r < b)
        }
        let url = try XCTUnwrap(WorksheetPDF.render(sheets: run, engine: engine, fileName: "Larkit Worksheet - Division"))
        let key = PDFDocument(url: url)?.page(at: 1)?.string ?? ""
        XCTAssertTrue(key.contains(" R "), "remainders on the key")
    }

    /// Worded skills come from the bank and are never padded: with no bank
    /// injected they can fill nothing, say so, and render without crashing.
    @MainActor
    func testBankSkillsAreNeverPaddedWithGeneratedFiller() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let catalog = try engine.worksheetCatalog()
        XCTAssertEqual(engine.worksheetCapacity(skillId: "time-read-clock-4-pic")["practice"], 0)
        XCTAssertTrue(try engine.generateWorksheetRun(skillId: "time-read-clock-4-pic", problemType: "practice", sheets: 2).isEmpty)
        // A drill has no bank to wait for, and no stories without one.
        let drill = engine.worksheetCapacity(skillId: "mul-tables-7-8-9")
        XCTAssertGreaterThan(drill["practice"] ?? 0, 5)
        XCTAssertEqual(drill["stories"], 0)

        let skills = try XCTUnwrap(catalog["skills"] as? [[String: Any]])
        XCTAssertGreaterThan(skills.count, 250)
        XCTAssertEqual(Set(skills.compactMap { $0["grade"] as? String }), ["K", "1", "2", "3", "4", "5"])
        for skill in skills {
            let header = try XCTUnwrap(skill["header"] as? String)
            XCTAssertFalse(header.contains("Level"), header)
        }
    }

    /// Figures print in their PAPER designs (black bars on a labelled axis,
    /// outlined discs on a ruled mat, a numbered clock…), and a sheet of them
    /// fits its page. The bank is not bundled with the tests, so the items are
    /// hand-built in the bank's payload shapes.
    @MainActor
    func testFigureSheetsPrintTheirPaperDesigns() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let catalog = try engine.worksheetCatalog()
        func item(_ prompt: String, _ display: [String: Any], answer: Any, choices: [Any]? = nil) -> [String: Any] {
            var q: [String: Any] = ["mode": "dataGraphs", "answer": answer, "display": display.merging(["promptText": prompt]) { a, _ in a }]
            if let choices { q["choices"] = choices; q["answerType"] = "choice" }
            return q
        }
        let bars: [[String: Any]] = [["label": "apples", "value": 7], ["label": "pears", "value": 14], ["label": "plums", "value": 11], ["label": "cherries", "value": 5]]
        let charts = [
            item("Read the fruit stand graph carefully. How many cherries does it show?", ["figure": "barGraph", "bars": bars], answer: 5),
            item("Which statement matches the fruit stand graph?", ["figure": "barGraph", "bars": bars], answer: "pears got the most",
                 choices: ["pears got the most", "plums got the fewest", "every bar is the same", "apples got the most"]),
            item("In the pet fair picture chart, each picture means 2. How many kittens?",
                 ["figure": "pictograph", "keyValue": 2, "rows": [["label": "kittens", "symbols": 2, "half": true], ["label": "puppies", "symbols": 4]]], answer: 5),
            item("Add the fruit stand tallies for plums and cherries. How many marks in all?",
                 ["figure": "tallyChart", "rows": [["label": "plums", "count": 8], ["label": "cherries", "count": 13]]], answer: 21),
        ]
        let small = [
            item("Nia reads this clock as 3:07. Is Nia right?", ["figure": "clockFace", "clock": ["hour": 3, "minute": 7]], answer: "Yes", choices: ["Yes", "No"]),
            item("Here is Theo's disc mat. Which number does it show?",
                 ["figure": "discMat", "discMat": ["cols": [["place": 1000, "count": 1], ["place": 100, "count": 2], ["place": 10, "count": 6], ["place": 1, "count": 9]]]],
                 answer: 1269, choices: [1296, 2269, 2169, 1269]),
        ]
        func sheet(_ layout: String, _ items: [[String: Any]]) -> WorksheetPDF.Sheet {
            WorksheetPDF.Sheet(header: "Graphs & Data · Test figures · Grade 2", footer: "Test",
                               layouts: catalog["layouts"] as? [String: Any] ?? [:], storyWorkSpace: 52,
                               payload: ["layout": layout, "items": items, "wordProblems": [], "itemCount": items.count])
        }
        let sheets = [sheet("figure", charts), sheet("figureSmall", small + small + small)]
        for page in sheets {
            XCTAssertLessThanOrEqual(WorksheetPDF.naturalHeight(of: page, engine: engine), WorksheetPDF.pageSize.height, "\(page.layoutName) spills past the page")
        }
        let url = try XCTUnwrap(WorksheetPDF.render(sheets: sheets, engine: engine, fileName: "Larkit Worksheet - Figures"))
        if let dir = ProcessInfo.processInfo.environment["KIDMATH_FIGURE_SNAPSHOT_DIR"] {
            let copy = URL(fileURLWithPath: dir).appendingPathComponent("worksheet-figures.pdf")
            try? FileManager.default.removeItem(at: copy)
            try FileManager.default.copyItem(at: url, to: copy)
        }
        let document = try XCTUnwrap(PDFDocument(url: url))
        let charted = document.page(at: 0)?.string ?? ""
        // A labelled value axis — and never the bar's value handed over on top of it.
        XCTAssertTrue(charted.contains("14") && charted.contains("cherries"), "axis + category labels")
        XCTAssertTrue(charted.contains("Circle one:"), "option banks are circled, not copied into a box")
        XCTAssertTrue(charted.contains("Key:"))
        let smalls = document.page(at: 1)?.string ?? ""
        XCTAssertTrue(smalls.contains("12") && smalls.contains("11"), "the printed clock is numbered")
        XCTAssertTrue(smalls.contains("1000"), "disc mat header")
    }
}
