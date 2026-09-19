import PDFKit
import XCTest
@testable import KidMath

/// Flight logs render through the shared generateFlightLog draw to a Letter
/// PDF — one page per log, then one answer-key page per log.
final class WorksheetTests: XCTestCase {

    @MainActor
    func testFlightLogRendersOnePagePerLogPlusKeys() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        let mode = try XCTUnwrap(ModeCatalog.mode("addition"))
        let scope = engine.flightLogScope(mode: "addition", level: 2)
        XCTAssertEqual(scope, "Sums to 10", "level-aware scope phrase")
        let logs = try (0..<2).map { _ in
            FlightLogPDF.Log(mode: mode, level: 2, scope: scope,
                             payload: try engine.generateFlightLog(mode: "addition", level: 2, allowWordProblems: true))
        }
        XCTAssertTrue(logs[0].computational)
        XCTAssertEqual(logs[0].partA.count, 12)
        XCTAssertEqual(logs[0].partB.count, 6)
        XCTAssertEqual(logs[0].wordProblems.count, 2)
        XCTAssertEqual(logs[0].itemCount, 20)

        let url = try XCTUnwrap(FlightLogPDF.render(logs: logs, engine: engine))
        if let dir = ProcessInfo.processInfo.environment["KIDMATH_FIGURE_SNAPSHOT_DIR"] {
            try? FileManager.default.removeItem(at: URL(fileURLWithPath: dir).appendingPathComponent("flight-log.pdf"))
            try FileManager.default.copyItem(at: url, to: URL(fileURLWithPath: dir).appendingPathComponent("flight-log.pdf"))
            // A prompt sheet too, for the figure/bank/judgment layouts.
            let dg = try XCTUnwrap(ModeCatalog.mode("dataGraphs"))
            let promptLog = FlightLogPDF.Log(mode: dg, level: 3, scope: engine.flightLogScope(mode: "dataGraphs", level: 3),
                                             payload: try engine.generateFlightLog(mode: "dataGraphs", level: 3, allowWordProblems: true))
            if let purl = FlightLogPDF.render(logs: [promptLog], engine: engine) {
                try? FileManager.default.removeItem(at: URL(fileURLWithPath: dir).appendingPathComponent("flight-log-prompts.pdf"))
                try FileManager.default.copyItem(at: purl, to: URL(fileURLWithPath: dir).appendingPathComponent("flight-log-prompts.pdf"))
            }
        }
        let document = try XCTUnwrap(PDFDocument(url: url))
        XCTAssertEqual(document.pageCount, 4, "2 logs + 2 answer keys")
        let firstPage = document.page(at: 0)?.string ?? ""
        XCTAssertTrue(firstPage.contains("larkit"), "header lockup")
        XCTAssertTrue(firstPage.contains("Worksheet"), "header line")
        XCTAssertTrue(firstPage.contains("Sums to 10"), "scope in header")
        XCTAssertTrue(firstPage.contains("Log 1 of 2"))
        XCTAssertTrue(firstPage.contains("Name"), "name line")
        XCTAssertTrue(firstPage.contains("Landed"), "footer")
        let keyPage = document.page(at: 2)?.string ?? ""
        XCTAssertTrue(keyPage.contains("Answer key"))
        XCTAssertFalse(keyPage.contains("Name"), "the key sheet has no name line")
    }

    /// Every playable mode draws a non-empty flight log, prompt sheets
    /// included, and renders without a word problem when the parent says no.
    @MainActor
    func testEveryPlayableModeDrawsAFlightLog() throws {
        let engine = try EngineBridge()
        try engine.setBankItems([])
        for mode in ModeCatalog.allModes where mode.playable {
            let log = FlightLogPDF.Log(mode: mode, level: 3, scope: engine.flightLogScope(mode: mode.id, level: 3),
                                       payload: try engine.generateFlightLog(mode: mode.id, level: 3, allowWordProblems: false))
            XCTAssertGreaterThan(log.partA.count + log.partB.count, 0, "\(mode.id): empty flight log")
            XCTAssertEqual(log.wordProblems.count, 0, "\(mode.id): word problems off means none")
            for q in log.partA + log.partB {
                XCTAssertNotNil(q["answer"], "\(mode.id): item has no answer")
            }
            XCTAssertNotNil(FlightLogPDF.render(logs: [log], engine: engine), "\(mode.id): PDF failed")
        }
    }
}
