import XCTest
import SwiftUI
@testable import KidMath

/// The read-only figures (DataFigures.swift) and the ten frame render to a
/// non-empty image for representative payloads — the shapes the bank actually
/// ships. Set KIDMATH_FIGURE_SNAPSHOT_DIR to also write PNGs for eyeballing.
@MainActor
final class FigureRenderTests: XCTestCase {

    private func render<V: View>(_ name: String, _ view: V, width: CGFloat = 380) throws {
        let renderer = ImageRenderer(content: view.frame(width: width).padding(12).background(Color.white))
        renderer.scale = 2
        let image = try XCTUnwrap(renderer.uiImage, "\(name) rendered nothing")
        XCTAssertGreaterThan(image.size.width, 100, name)
        XCTAssertGreaterThan(image.size.height, 40, name)
        if let dir = ProcessInfo.processInfo.environment["KIDMATH_FIGURE_SNAPSHOT_DIR"], let png = image.pngData() {
            try png.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
        }
    }

    func testPictographRenders() throws {
        try render("pictograph", PictographView(
            rows: [["label": "Cats", "symbols": 3, "half": true], ["label": "Dogs", "symbols": 5], ["label": "Fish", "symbols": 1]],
            keyValue: 2
        ))
    }

    func testTallyChartRenders() throws {
        try render("tally", TallyChartView(rows: [["label": "Red", "count": 12], ["label": "Blue", "count": 5], ["label": "Green", "count": 3]]))
    }

    func testLinePlotRenders() throws {
        try render("linePlot", LinePlotView(
            points: [["value": 3, "count": 2], ["value": 4, "count": 0], ["value": 5, "count": 4], ["value": 6, "count": 1]],
            axisLabel: "Plant height (cm)"
        ))
    }

    func testAreaFigureShapesRender() throws {
        let engine = try EngineBridge()
        let rect = try XCTUnwrap(engine.areaFigureSpec(question: [
            "mode": "areaPerimeter", "display": ["promptText": "A rug is 5 cm by 3 cm. What is its area?"],
        ]))
        XCTAssertEqual(rect["shape"] as? String, "rect")
        try render("area-rect", AreaFigureView(spec: rect))
        try render("area-grid", AreaFigureView(spec: ["shape": "rect", "w": 4, "h": 3, "unit": "", "perim": false, "grid": true]))
        try render("area-perim-missing", AreaFigureView(spec: ["shape": "rect", "w": 9, "h": NSNull(), "unit": "m", "perim": true, "grid": false]))
        try render("area-cut", AreaFigureView(spec: ["shape": "cut", "W": 10, "H": 6, "w": 3, "h": 2, "unit": "cm", "perim": false, "grid": false]))
        try render("area-join", AreaFigureView(spec: ["shape": "join", "a": 4, "b": 3, "c": 5, "d": 2, "unit": "ft", "perim": false, "grid": false]))
        try render("area-split", AreaFigureView(spec: ["shape": "split", "a": 3, "b": 2, "T": 14, "unit": "cm", "perim": false, "grid": false]))
        try render("area-pair", AreaFigureView(spec: ["shape": "pair", "rects": [[6, 2], [3, 3]], "unit": "", "perim": true, "grid": false]))
        XCTAssertNil(engine.areaFigureSpec(question: ["mode": "areaPerimeter", "display": ["promptText": "Which shape is bigger?"]]))
    }

    func testSequenceNumberLineEligibility() throws {
        let ok = try XCTUnwrap(SequenceNumberLineView.eligible(sequence: [4, 5, 6], step: 1, answer: 7))
        XCTAssertEqual(ok.answer, 7)
        try render("seqline", SequenceNumberLineView(sequence: ok.seq, answer: ok.answer, revealed: false))
        XCTAssertNil(SequenceNumberLineView.eligible(sequence: [2, 4, 6], step: 2, answer: 8), "skip counting has no unit line")
        XCTAssertNil(SequenceNumberLineView.eligible(sequence: [1, 2, 3], step: 1, answer: 40), "span over ten ticks")
    }

    func testTenFrameRenders() throws {
        try render("tenframe-count", TenFrameWidget(display: ["filled": 5, "filledB": 3, "frames": 1, "frameMode": "count"], disabled: false) { _ in })
        try render("tenframe-build2", TenFrameWidget(display: ["filled": 10, "filledB": 3, "frames": 2, "frameMode": "build"], disabled: false) { _ in })
    }
}
