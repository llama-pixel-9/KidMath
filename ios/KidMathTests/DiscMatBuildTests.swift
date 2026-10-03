import XCTest
@testable import KidMath

/// The build-mode disc mat's rules (DiscMatBuild) — the same cap, trades,
/// Check gate, status lines and labels as src/components/discMatBuild.js
/// (src/__tests__/discMatBuild.spec.js covers the web twin).
final class DiscMatBuildTests: XCTestCase {

    private func mat(_ counts: [(place: Int, count: Int)]) -> DiscMatBuild {
        DiscMatBuild(columns: counts.map { DiscMatBuild.Column(place: $0.place, count: $0.count) })
    }

    private func counts(_ m: DiscMatBuild) -> [Int] { m.columns.map(\.count) }
    private func places(_ m: DiscMatBuild) -> [Int] { m.columns.map(\.place) }

    // MARK: Start mat

    func testStartMatFromDisplayCols() {
        let m = DiscMatBuild(cols: [["place": 100, "count": 1], ["place": 10, "count": 1], ["place": 1, "count": 4]])
        XCTAssertEqual(places(m), [100, 10, 1])
        XCTAssertEqual(counts(m), [1, 1, 4])
        XCTAssertEqual(m.matValue, 114)
        XCTAssertTrue(m.isAtStart)
        XCTAssertTrue(m.canCheck)
        XCTAssertNil(m.statusLine)
        XCTAssertNil(m.overfullPlace)
    }

    func testStartMatCleansThePayload() {
        // Junk places dropped, counts truncated and clamped, numeric strings read.
        let m = DiscMatBuild(cols: [
            ["place": 5, "count": 2],
            ["place": "10", "count": 25],
            ["place": 1, "count": -3],
            ["place": 1, "count": 7], // a repeated place: the first one wins
        ])
        XCTAssertEqual(places(m), [10, 1])
        XCTAssertEqual(counts(m), [19, 0])

        let fractional = DiscMatBuild(cols: [["place": 10, "count": 3.7], ["place": 1.5, "count": 2]])
        XCTAssertEqual(places(fractional), [10])
        XCTAssertEqual(counts(fractional), [3])
    }

    func testStartMatSortsAndFillsASkippedPlace() {
        let m = DiscMatBuild(cols: [["place": 1, "count": 3], ["place": 100, "count": 2]])
        XCTAssertEqual(places(m), [100, 10, 1], "biggest first, the missing ten comes back empty")
        XCTAssertEqual(counts(m), [2, 0, 3])
        XCTAssertEqual(m.matValue, 203)
    }

    func testStartMatWithNoUsablePlaceIsAnEmptyHundredsTensOnes() {
        for cols: [[String: Any]] in [[], [["place": 7, "count": 3]], [["count": 2]]] {
            let m = DiscMatBuild(cols: cols)
            XCTAssertEqual(places(m), [100, 10, 1])
            XCTAssertEqual(counts(m), [0, 0, 0])
            XCTAssertEqual(m.matValue, 0)
            XCTAssertTrue(m.canCheck, "an empty mat still shows a number: 0")
        }
    }

    // MARK: Add and take away

    func testAddStopsAtTheCap() {
        var m = mat([(10, 18), (1, 0)])
        XCTAssertTrue(m.canAdd(0))
        m.add(0)
        XCTAssertEqual(counts(m), [19, 0])
        XCTAssertFalse(m.canAdd(0), "19 is the cap")
        m.add(0)
        XCTAssertEqual(counts(m), [19, 0], "a disabled add changes nothing")
        XCTAssertEqual(DiscMatBuild.cap, 19)
    }

    func testRemoveStopsAtZero() {
        var m = mat([(10, 1), (1, 1)])
        m.remove(1)
        XCTAssertEqual(counts(m), [1, 0])
        XCTAssertFalse(m.canRemove(1))
        m.remove(1)
        XCTAssertEqual(counts(m), [1, 0])
        XCTAssertFalse(m.isAtStart)
    }

    func testOutOfRangeIndexesAreNoOps() {
        var m = mat([(10, 1), (1, 1)])
        XCTAssertFalse(m.canAdd(5))
        XCTAssertFalse(m.canRemove(-1))
        XCTAssertFalse(m.canTradeUp(9))
        XCTAssertFalse(m.canBreakDown(9))
        m.add(5)
        m.remove(-1)
        m.tradeUp(9)
        m.breakDown(9)
        XCTAssertEqual(counts(m), [1, 1])
    }

    // MARK: Trades

    func testTradeUpTenOnesForOneTen() {
        var m = mat([(100, 1), (10, 1), (1, 12)])
        XCTAssertFalse(m.canTradeUp(0), "the biggest place has nowhere to go")
        XCTAssertFalse(m.canTradeUp(1), "only 1 ten")
        XCTAssertTrue(m.canTradeUp(2))
        let before = m.matValue
        m.tradeUp(2)
        XCTAssertEqual(counts(m), [1, 2, 2])
        XCTAssertEqual(m.matValue, before, "a trade keeps the value")
        XCTAssertFalse(m.canTradeUp(2), "2 ones left")
    }

    func testTradeUpBlockedWhenTheBiggerPlaceIsFull() {
        var m = mat([(10, 19), (1, 10)])
        XCTAssertFalse(m.canTradeUp(1))
        m.tradeUp(1)
        XCTAssertEqual(counts(m), [19, 10])
    }

    func testBreakDownOneTenForTenOnes() {
        var m = mat([(100, 2), (10, 0), (1, 4)])
        XCTAssertFalse(m.canBreakDown(1), "no tens to break")
        XCTAssertFalse(m.canBreakDown(2), "the ones have no smaller place")
        XCTAssertTrue(m.canBreakDown(0))
        m.breakDown(0)
        XCTAssertEqual(counts(m), [1, 10, 4])
        XCTAssertEqual(m.matValue, 204)
        m.breakDown(1)
        XCTAssertEqual(counts(m), [1, 9, 14])
        XCTAssertEqual(m.matValue, 204)
    }

    func testBreakDownBlockedPastTheCap() {
        var m = mat([(10, 1), (1, 10)])
        XCTAssertFalse(m.canBreakDown(0), "10 + 10 would be 20")
        m.breakDown(0)
        XCTAssertEqual(counts(m), [1, 10])
        let edge = mat([(10, 1), (1, 9)])
        XCTAssertTrue(edge.canBreakDown(0), "9 + 10 = 19 is allowed")
    }

    func testStartOverRestoresTheStartMat() {
        var m = mat([(100, 1), (10, 1), (1, 4)])
        m.add(2)
        m.breakDown(0)
        XCTAssertFalse(m.isAtStart)
        m.startOver()
        XCTAssertEqual(counts(m), [1, 1, 4])
        XCTAssertTrue(m.isAtStart)
    }

    // MARK: Check gate and status line

    func testCheckWaitsUntilEveryPlaceHoldsNineOrFewer() {
        var m = mat([(100, 9), (10, 2), (1, 9)])
        XCTAssertTrue(m.canCheck)
        XCTAssertEqual(m.matValue, 929)
        m.add(2)
        XCTAssertFalse(m.canCheck)
        XCTAssertEqual(m.overfullPlace, 2)
        XCTAssertEqual(m.statusLine, "The ones have 10 discs. Trade 10 ones for 1 ten.")
        m.tradeUp(2)
        XCTAssertTrue(m.canCheck)
        XCTAssertNil(m.statusLine)
        XCTAssertEqual(m.matValue, 930)
    }

    func testStatusNamesTheSmallestPlaceThatCanTrade() {
        let m = mat([(100, 1), (10, 12), (1, 12)])
        XCTAssertEqual(m.overfullPlace, 2)
        XCTAssertEqual(m.statusLine, "The ones have 12 discs. Trade 10 ones for 1 ten.")

        // The tens are full, so the ones can't trade: the tens go first.
        let blocked = mat([(100, 1), (10, 19), (1, 12)])
        XCTAssertEqual(blocked.overfullPlace, 1)
        XCTAssertEqual(blocked.statusLine, "The tens have 19 discs. Trade 10 tens for 1 hundred.")
    }

    func testStatusSaysTakeAwayWhenTheBiggestPlaceIsFull() {
        let m = mat([(100, 10), (10, 3), (1, 4)])
        XCTAssertFalse(m.canCheck)
        XCTAssertEqual(m.overfullPlace, 0)
        XCTAssertEqual(m.statusLine, "The hundreds have 10 discs. Take some discs away.")

        let stuck = mat([(100, 19), (10, 19), (1, 19)])
        XCTAssertEqual(stuck.overfullPlace, 0, "no trade can run anywhere")
        XCTAssertEqual(stuck.statusLine, "The hundreds have 19 discs. Take some discs away.")
    }

    // MARK: Words

    func testLabelsMatchTheWeb() {
        XCTAssertEqual(DiscMatBuild.placeName(1000), "thousands")
        XCTAssertEqual(DiscMatBuild.placeName(1, count: 1), "one")
        XCTAssertEqual(DiscMatBuild.addLabel(1), "Add a one disc")
        XCTAssertEqual(DiscMatBuild.removeLabel(10), "Take away a ten disc")
        XCTAssertEqual(DiscMatBuild.tradeUpText(1), "10 ones → 1 ten")
        XCTAssertEqual(DiscMatBuild.tradeUpLabel(1), "Trade 10 ones for 1 ten")
        XCTAssertEqual(DiscMatBuild.breakDownText(10), "1 ten → 10 ones")
        XCTAssertEqual(DiscMatBuild.breakDownLabel(100), "Trade 1 hundred for 10 tens")
        XCTAssertEqual(DiscMatBuild.tradeUpLabel(100), "Trade 10 hundreds for 1 thousand")
        XCTAssertEqual(DiscMatBuild.discCountLabel(place: 1, count: 4), "4 one discs")
        XCTAssertEqual(DiscMatBuild.discCountLabel(place: 100, count: 1), "1 hundred disc")
        XCTAssertEqual(DiscMatBuild.discCountLabel(place: 10, count: 0), "No ten discs")
    }

    func testFeedbackLines() {
        XCTAssertEqual(DiscMatBuild.feedbackLine(value: 921, correct: true), "The mat shows 921.")
        XCTAssertEqual(DiscMatBuild.feedbackLine(value: 911, correct: false), "Your mat shows 911.")
        XCTAssertEqual(DiscMatBuild.feedbackLine(value: 1040, correct: true), "The mat shows 1040.", "plain digits")
    }

    // MARK: The engine scores the submitted Int

    func testEngineScoresTheMatValue() throws {
        let engine = try EngineBridge()
        let cols: [[String: Any]] = [["place": 100, "count": 1], ["place": 10, "count": 1], ["place": 1, "count": 4]]
        let display: [String: Any] = ["mode": "build", "cols": cols]
        let question: [String: Any] = ["answerType": "placeValueDiscs", "answer": 921, "display": display]
        var m = DiscMatBuild(cols: cols)
        for _ in 0..<8 { m.add(0) }      // 9 hundreds, 1 ten, 4 ones
        m.breakDown(1)                   // 9, 0, 14
        XCTAssertFalse(m.canCheck)
        m.tradeUp(2)                     // 9, 1, 4
        m.add(1)                         // 9, 2, 4
        for _ in 0..<3 { m.remove(2) }   // 9, 2, 1
        XCTAssertEqual(counts(m), [9, 2, 1])
        XCTAssertEqual(m.matValue, 921)
        XCTAssertTrue(try engine.checkAnswer(question: question, submitted: m.matValue))
        XCTAssertFalse(try engine.checkAnswer(question: question, submitted: 911))
    }
}
