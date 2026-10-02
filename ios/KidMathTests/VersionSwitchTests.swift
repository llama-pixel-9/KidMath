import JavaScriptCore
import XCTest
@testable import KidMath

/// The item bank version switch on iOS. BankService reads
/// `item_version_switch` and injects it with the preview flag (UserDefaults
/// `previewV2`, set by `kidmath://preview?v=2` or `-previewV2 1`) through
/// EngineBridge.setVersionSwitch; the engine serves
/// what src/itemBank/versionRules.js allows, the same rule the web loaders
/// run. Engine-only, no network: the Swift twin of
/// src/__tests__/nativeVersionSwitch.spec.js.
final class VersionSwitchTests: XCTestCase {

    private var bridge: EngineBridge!

    override func setUpWithError() throws {
        bridge = try EngineBridge()
        try bridge.resetBankToBundle()
    }

    /// A raw PostgREST addition row, the shape fetchModeItemRows returns.
    private static func additionRow(_ itemId: String, version: Int, a: Int, status: String = "approved") -> [String: Any] {
        [
            "item_id": itemId,
            "mode_id": "addition",
            "item_family": "procedural",
            "subskill": "composeDecompose",
            "structure_type": "add-result-unknown",
            "level_min": 1,
            "level_max": 3,
            "review_status": status,
            "payload": [
                "a": a, "b": 5, "op": "+", "answer": a + 5,
                "display": ["promptText": "\(a) + 5 = ?"],
            ],
            "representation_type": "symbolic",
            "source": "test",
            "level_band": "G2",
            "version": version,
        ]
    }

    /// One approved v1 row, one approved v2 row, one v2 draft (never served).
    private static var rows: [[String: Any]] {
        [
            additionRow("ios-v1", version: 1, a: 7),
            additionRow("ios-v2", version: 2, a: 8),
            additionRow("ios-v2-draft", version: 2, a: 9, status: "draft"),
        ]
    }

    private static func switchRows(_ modeId: String, _ live: String) -> [[String: Any]] {
        [["mode_id": modeId, "live_version": live]]
    }

    /// The item ids the engine would serve for a topic, sorted.
    private func servedIds(_ modeId: String) throws -> [String] {
        let items = try bridge.call("getBankItems").toObject() as? [[String: Any]] ?? []
        return items
            .filter { $0["modeId"] as? String == modeId }
            .compactMap { $0["itemId"] as? String }
            .sorted()
    }

    func testDefaultSwitchServesV1RowsInPlaceOfTheSeed() throws {
        XCTAssertFalse(try servedIds("addition").isEmpty, "the seed should carry addition items")
        try bridge.setVersionSwitch(rows: [], preview: false)
        XCTAssertEqual(try bridge.addBankRows(Self.rows), 3)
        XCTAssertEqual(try servedIds("addition"), ["ios-v1"])
    }

    func testSwitchFlipsTheServedRowsWithoutARefetch() throws {
        try bridge.addBankRows(Self.rows)

        try bridge.setVersionSwitch(rows: Self.switchRows("addition", "v2"), preview: false)
        XCTAssertEqual(try servedIds("addition"), ["ios-v2"])

        try bridge.setVersionSwitch(rows: Self.switchRows("addition", "preview"), preview: false)
        XCTAssertEqual(try servedIds("addition"), ["ios-v1"])

        try bridge.setVersionSwitch(rows: Self.switchRows("addition", "preview"), preview: true)
        XCTAssertEqual(try servedIds("addition"), ["ios-v2"])

        try bridge.setVersionSwitch(rows: Self.switchRows("addition", "v1"), preview: true)
        XCTAssertEqual(try servedIds("addition"), ["ios-v1"])

        // Another topic's row leaves addition at its default.
        try bridge.setVersionSwitch(rows: Self.switchRows("money", "v2"), preview: false)
        XCTAssertEqual(try servedIds("addition"), ["ios-v1"])
    }

    func testSwitchInjectedBeforeTheRowsAppliesToThem() throws {
        try bridge.setVersionSwitch(rows: Self.switchRows("addition", "v2"), preview: false)
        try bridge.addBankRows(Self.rows)
        XCTAssertEqual(try servedIds("addition"), ["ios-v2"])
    }

    func testTopicWithoutCloudRowsKeepsItsSeed() throws {
        let seededAddition = try servedIds("addition")
        let seeded = try bridge.bankCount()
        try bridge.setVersionSwitch(rows: Self.switchRows("addition", "v2"), preview: true)
        XCTAssertEqual(try servedIds("addition"), seededAddition)
        XCTAssertEqual(try bridge.bankCount(), seeded)
    }

    func testEmptyBankStaysEmptyAcrossSwitches() throws {
        try bridge.setBankItems([])
        try bridge.setVersionSwitch(rows: Self.switchRows("addition", "v2"), preview: true)
        XCTAssertEqual(try bridge.bankCount(), 0)
        try bridge.setVersionSwitch(rows: [], preview: false)
        XCTAssertEqual(try bridge.bankCount(), 0)
    }

    func testResetDropsTheCloudRows() throws {
        let seeded = try bridge.bankCount()
        try bridge.addBankRows(Self.rows)
        try bridge.setVersionSwitch(rows: Self.switchRows("addition", "v2"), preview: false)
        try bridge.resetBankToBundle()
        XCTAssertEqual(try bridge.bankCount(), seeded)
        XCTAssertFalse(try servedIds("addition").contains("ios-v2"))
    }

    func testMathFactsIsHiddenOnlyWhereTheSwitchSaysSo() throws {
        try bridge.setVersionSwitch(rows: [], preview: false)
        XCTAssertEqual(try bridge.hiddenTopics(), [])
        try bridge.setVersionSwitch(rows: Self.switchRows("mathFacts", "v1"), preview: true)
        XCTAssertEqual(try bridge.hiddenTopics(), ["mathFacts"])
        try bridge.setVersionSwitch(rows: Self.switchRows("mathFacts", "preview"), preview: false)
        XCTAssertEqual(try bridge.hiddenTopics(), ["mathFacts"])
        try bridge.setVersionSwitch(rows: Self.switchRows("mathFacts", "preview"), preview: true)
        XCTAssertEqual(try bridge.hiddenTopics(), [])
        try bridge.setVersionSwitch(rows: Self.switchRows("mathFacts", "v2"), preview: false)
        XCTAssertEqual(try bridge.hiddenTopics(), [])
    }

    func testAFetchWithNoRowsStillReplacesItsTopicsSeed() throws {
        let seeded = try bridge.bankCount()
        let seededAddition = try servedIds("addition").count
        XCTAssertGreaterThan(seededAddition, 0)
        XCTAssertEqual(try bridge.addBankRows([], modeId: "addition"), 0)
        XCTAssertEqual(try servedIds("addition"), [])
        XCTAssertEqual(try bridge.bankCount(), seeded - seededAddition)
        XCTAssertEqual(try bridge.addBankRows(Self.rows, modeId: "addition"), 3)
        XCTAssertEqual(try servedIds("addition"), ["ios-v1"])
    }

    /// The preview tests write the test host's real `previewV2` key; skip
    /// when the scheme passes `-previewV2` (the argument domain would win
    /// over the writes), and put back whatever was stored.
    private func withPreviewKey(_ body: (UserDefaults) throws -> Void) throws {
        let defaults = UserDefaults.standard
        if defaults.volatileDomain(forName: UserDefaults.argumentDomain)["previewV2"] != nil {
            throw XCTSkip("launched with -previewV2")
        }
        let stored = defaults.object(forKey: "previewV2")
        defer {
            if let stored {
                defaults.set(stored, forKey: "previewV2")
            } else {
                defaults.removeObject(forKey: "previewV2")
            }
        }
        try body(defaults)
    }

    func testPreviewFlagReadsThePreviewKey() throws {
        try withPreviewKey { defaults in
            defaults.set(true, forKey: "previewV2")
            XCTAssertTrue(BankService.previewEnabled)
            defaults.removeObject(forKey: "previewV2")
            XCTAssertFalse(BankService.previewEnabled, "nobody previews unless the key is set")
        }
    }

    func testPreviewLinkSetsAndClearsTheFlag() throws {
        try withPreviewKey { defaults in
            defaults.removeObject(forKey: "previewV2")
            XCTAssertTrue(BankService.handlePreviewURL(try XCTUnwrap(URL(string: "kidmath://preview?v=2"))))
            XCTAssertTrue(BankService.previewEnabled)
            XCTAssertTrue(BankService.handlePreviewURL(try XCTUnwrap(URL(string: "kidmath://preview?v=7"))))
            XCTAssertTrue(BankService.previewEnabled, "an unknown value leaves the flag alone")
            XCTAssertTrue(BankService.handlePreviewURL(try XCTUnwrap(URL(string: "kidmath://preview?v=1"))))
            XCTAssertFalse(BankService.previewEnabled)
            XCTAssertFalse(BankService.handlePreviewURL(try XCTUnwrap(URL(string: "kidmath://auth-callback?code=abc"))))
            XCTAssertFalse(BankService.handlePreviewURL(try XCTUnwrap(URL(string: "https://larkit.io/?preview=v2"))))
            XCTAssertFalse(BankService.previewEnabled)
        }
    }
}
