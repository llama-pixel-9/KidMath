import XCTest
@testable import KidMath

// MARK: - Grade-aware Home (HomePage.jsx groupsForGrade / quickStartFor)

@MainActor
final class GradeAwareHomeTests: XCTestCase {

    func testGradeFitMirrorsTheWeb() {
        XCTAssertEqual(GradeSeed.gradeFit(mode: "counting", grade: "K"), "in")
        XCTAssertEqual(GradeSeed.gradeFit(mode: "fractionOps", grade: "1st"), "above", "a Grade 5 mode is above a first grader")
        XCTAssertEqual(GradeSeed.gradeFit(mode: "counting", grade: "5th"), "below", "a fifth grader has outgrown counting")
        XCTAssertEqual(GradeSeed.gradeFit(mode: "addition", grade: nil), "in", "unknown grade never hides anything")
    }

    func testUnknownGradeKeepsTheAuthoredOrder() {
        let g = GradeSeed.groupsForGrade(nil)
        XCTAssertEqual(g.main.map(\.id), ModeCatalog.groups.map(\.id))
        XCTAssertTrue(g.more.isEmpty)
    }

    func testFirstGraderGetsInGradeGroupsFirstAndBiggerKidTopicsFolded() {
        let g = GradeSeed.groupsForGrade("1st")
        XCTAssertEqual(Set(g.main.map(\.id)).union(g.more.map(\.id)), Set(ModeCatalog.groups.map(\.id)), "every group is somewhere")
        XCTAssertFalse(g.more.isEmpty, "some topics are entirely above a first grader")
        for group in g.more {
            XCTAssertTrue(group.modes.allSatisfy { GradeSeed.gradeFit(mode: $0.id, grade: "1st") == "above" }, "\(group.id) folded away must be entirely above grade")
        }
        // The first main group has at least one in-grade mode; rank 0 groups precede rank 1.
        let ranks = g.main.map { grp -> Int in grp.modes.contains { GradeSeed.gradeFit(mode: $0.id, grade: "1st") == "in" } ? 0 : 1 }
        XCTAssertEqual(ranks, ranks.sorted())
    }

    func testQuickStartPicksTheInGradeModeWithTheLowestLevel() {
        let inGrade = ModeCatalog.allModes.filter { $0.playable && GradeSeed.gradeFit(mode: $0.id, grade: "2nd") == "in" }.map(\.id)
        XCTAssertGreaterThan(inGrade.count, 1)
        var levels = Dictionary(uniqueKeysWithValues: inGrade.map { ($0, 5) })
        levels[inGrade[1]] = 2
        XCTAssertEqual(GradeSeed.quickStart(grade: "2nd", levels: levels), inGrade[1])
        XCTAssertNil(GradeSeed.quickStart(grade: nil, levels: levels), "no grade, no quick start")
        XCTAssertNotEqual(GradeSeed.quickStart(grade: "K", levels: [:]), "volumeCoordinates", "never a SOON mode")
    }

    func testGradeWorkLabelStretchesTheSpan() {
        XCTAssertEqual(GradeSeed.gradeWork(mode: "counting", level: 1), "Kindergarten")
        XCTAssertTrue(GradeSeed.gradeWork(mode: "fractionOps", level: 12).hasPrefix("Grade "))
    }
}
