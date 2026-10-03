import JavaScriptCore
import SwiftUI
import XCTest
@testable import KidMath

/// The iPhone's topic list against the engine it plays — the Swift twin of
/// src/__tests__/modeGroups.spec.js: every engine mode has exactly one tile,
/// the groups are the web's in the web's order, the v2-only topics are left
/// out by the same switch rule (KidMath.hiddenTopics), and every tile's grade
/// span seeds and ranks exactly as the engine's gradeSeed.js does.
@MainActor
final class ModeCatalogTests: XCTestCase {

    private var bridge: EngineBridge!

    override func setUpWithError() throws {
        bridge = try EngineBridge()
    }

    private static let webGroupOrder = [
        "numbers", "addSubtract", "multiplyDivide", "fractionsDecimals",
        "measureMoneyTime", "shapesData", "facts", "stories", "multiDigit",
    ]

    func testModeCatalogCoversEngine() throws {
        let tiles = ModeCatalog.allModes.map(\.id)
        XCTAssertEqual(Set(tiles).count, tiles.count, "a mode listed twice: \(tiles)")
        XCTAssertEqual(tiles.sorted(), try bridge.modes().sorted(), "every engine mode needs exactly one tile")
        for mode in ModeCatalog.allModes {
            XCTAssertFalse(mode.label.isEmpty || mode.glyph.isEmpty || mode.blurb.isEmpty, "\(mode.id) needs a label, glyph and blurb")
        }
    }

    func testGroupsAreTheWebsInTheWebsOrder() {
        XCTAssertEqual(ModeCatalog.groups.map(\.id), Self.webGroupOrder)
        let byGroup = Dictionary(uniqueKeysWithValues: ModeCatalog.groups.map { ($0.id, $0.modes.map(\.id)) })
        XCTAssertEqual(byGroup["facts"], ["mathFacts"])
        XCTAssertEqual(byGroup["stories"], ["wordProblems"])
        XCTAssertEqual(byGroup["multiDigit"], ["multiDigit"])
    }

    /// Labels and glyphs are the web's (src/modes/*.js), blurbs its
    /// descriptions; the tint is the web tile's.
    func testTheV2OnlyTopicsHaveTheirWebTiles() throws {
        let facts = try XCTUnwrap(ModeCatalog.mode("mathFacts"))
        let stories = try XCTUnwrap(ModeCatalog.mode("wordProblems"))
        let multi = try XCTUnwrap(ModeCatalog.mode("multiDigit"))
        XCTAssertEqual([facts.label, stories.label, multi.label], ["Math Facts", "Word Problems", "Multi-Digit Math"])
        XCTAssertEqual([facts.glyph, stories.glyph, multi.glyph], ["=", "+−", "78+"])
        XCTAssertEqual(facts.blurb, "Add, subtract, multiply and divide from memory")
        XCTAssertTrue(facts.playable && stories.playable && multi.playable)
        XCTAssertEqual(Theme.larkit.modeColor("mathFacts"), Theme.apricot)
        XCTAssertEqual(Theme.larkit.modeColor("wordProblems"), Theme.tealMid)
        XCTAssertEqual(Theme.larkit.modeColor("multiDigit"), Theme.sunLight)
    }

    /// visibleModeGroups over the engine's hidden topics: Math Facts shows
    /// with no switch row, Word Problems and Multi-Digit Math only to preview
    /// viewers until Sai flips them, and a switch row decides from then on.
    func testHiddenTopicsLeaveTheirGroupsOut() throws {
        try bridge.setVersionSwitch(rows: [], preview: false)
        let hidden = Set(try bridge.hiddenTopics())
        XCTAssertEqual(hidden, ["wordProblems", "multiDigit"])
        let shown = ModeCatalog.visibleGroups(hidden: hidden)
        XCTAssertEqual(shown.map(\.id), Array(Self.webGroupOrder.prefix(7)), "no empty group is left behind")
        XCTAssertEqual(shown.flatMap(\.modes).count, ModeCatalog.allModes.count - 2)

        try bridge.setVersionSwitch(rows: [], preview: true)
        XCTAssertEqual(ModeCatalog.visibleGroups(hidden: Set(try bridge.hiddenTopics())).map(\.id), Self.webGroupOrder)

        try bridge.setVersionSwitch(
            rows: [["mode_id": "mathFacts", "live_version": "v1"], ["mode_id": "wordProblems", "live_version": "v2"]],
            preview: false
        )
        let flipped = ModeCatalog.visibleGroups(hidden: Set(try bridge.hiddenTopics())).map(\.id)
        XCTAssertFalse(flipped.contains("facts"), "a v1 row hides Math Facts")
        XCTAssertTrue(flipped.contains("stories"), "a v2 row shows Word Problems to everyone")
        XCTAssertFalse(flipped.contains("multiDigit"))
        XCTAssertEqual(ModeCatalog.visibleGroups(hidden: []).map(\.id), Self.webGroupOrder)
    }

    /// GradeSeed mirrors src/gradeSeed.js through the same span table; a tile
    /// with no span would seed and rank as "every grade" on the iPhone only.
    func testGradeSeedMatchesTheEngineForEveryTile() throws {
        let grades: [String?] = [nil, "K", "1st", "2nd", "3rd", "4th", "5th"]
        for mode in ModeCatalog.allModes {
            XCTAssertNotNil(GradeSeed.gradeSpans[mode.id], "\(mode.id) has no grade span")
            for grade in grades {
                var args: [Any] = [mode.id]
                if let grade { args.append(grade) } else { args.append(NSNull()) }
                let level = Int(try bridge.call("startingLevelFor", args).toInt32())
                let fit: String = try bridge.call("gradeFitFor", args).toString() ?? ""
                let label = "\(mode.id) at \(grade ?? "no grade")"
                XCTAssertEqual(GradeSeed.startingLevel(mode: mode.id, grade: grade), level, label)
                XCTAssertEqual(GradeSeed.gradeFit(mode: mode.id, grade: grade), fit, label)
            }
        }
    }
}
