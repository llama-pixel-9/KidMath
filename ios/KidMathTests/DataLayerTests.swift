import XCTest
@testable import KidMath

/// P1: the data layer around the engine — bank-row injection, progress
/// persistence shapes, and the local/cloud merge math (mirrors of
/// src/progressStore.js behavior).
final class DataLayerTests: XCTestCase {

    // MARK: - Bank rows into the engine (raw PostgREST shape)

    private static func validRow(itemId: String) -> [String: Any] {
        [
            "item_id": itemId,
            "mode_id": "addition",
            "item_family": "procedural",
            "subskill": "composeDecompose",
            "structure_type": "add-result-unknown",
            "level_min": 1,
            "level_max": 3,
            "review_status": "approved",
            "payload": [
                "a": 7, "b": 5, "op": "+", "answer": 12,
                "display": ["promptText": "7 + 5 = ?"],
            ],
            "representation_type": "symbolic",
            "source": "test",
            "level_band": "G2",
        ]
    }

    func testAddBankRowsNormalizesAndMerges() throws {
        let bridge = try EngineBridge()
        try bridge.resetBankToBundle()
        let seeded = try bridge.bankCount()
        XCTAssertGreaterThan(seeded, 0, "engine bundle should carry the seed bank")

        let added = try bridge.addBankRows([Self.validRow(itemId: "test-p1-1")])
        XCTAssertEqual(added, 1)
        XCTAssertEqual(try bridge.bankCount(), seeded + 1)

        // Same row again: deduped by itemId, not double-added.
        XCTAssertEqual(try bridge.addBankRows([Self.validRow(itemId: "test-p1-1")]), 0)

        // Invalid rows (numeric inconsistency / missing fields) are rejected
        // by the shared validator, never poisoning the bank.
        var bad = Self.validRow(itemId: "test-p1-2")
        var payload = bad["payload"] as! [String: Any]
        payload["answer"] = 99
        bad["payload"] = payload
        XCTAssertEqual(try bridge.addBankRows([bad, [:]]), 0)
        XCTAssertEqual(try bridge.bankCount(), seeded + 1)

        try bridge.resetBankToBundle()
        XCTAssertEqual(try bridge.bankCount(), seeded)
    }

    // MARK: - Progress: local store roundtrip (web localStorage parity)

    @MainActor
    func testLocalProgressRoundtripAccumulatesTotals() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        let store = ProgressStore(supabase: SupabaseService.shared, defaults: defaults)

        // Fresh mode: blank slate.
        let blank = store.loadLocal(mode: "addition")
        XCTAssertEqual(blank["level"] as? Int, 1)
        XCTAssertEqual((blank["mistakeBank"] as? [[String: Any]])?.count, 0)

        // One finished session.
        store.saveLocal(mode: "addition", data: [
            "level": 3,
            "mistakeBank": [["itemKey": "k1"]],
            "firstTryCorrect": 4,
            "bankItemStats": ["item-1": ["attempts": 2, "firstTryCorrect": 1, "correct": 2, "totalResponseMs": 4000, "lastSeenAt": 10.0]],
            "recentBankItemIds": ["item-1"],
        ])
        var loaded = store.loadLocal(mode: "addition")
        XCTAssertEqual(loaded["level"] as? Int, 3)
        XCTAssertEqual(loaded["totalSessions"] as? Int, 1)
        XCTAssertEqual(loaded["lifetimeStars"] as? Int, 4)

        // Second session: totals accumulate, stats sum.
        store.saveLocal(mode: "addition", data: [
            "level": 4,
            "mistakeBank": [],
            "firstTryCorrect": 5,
            "bankItemStats": ["item-1": ["attempts": 1, "firstTryCorrect": 1, "correct": 1, "totalResponseMs": 1000, "lastSeenAt": 20.0]],
            "recentBankItemIds": ["item-1"],
        ])
        loaded = store.loadLocal(mode: "addition")
        XCTAssertEqual(loaded["totalSessions"] as? Int, 2)
        XCTAssertEqual(loaded["lifetimeStars"] as? Int, 9)
        let stats = loaded["bankItemStats"] as? [String: [String: Any]]
        XCTAssertEqual(stats?["item-1"]?["attempts"] as? Int, 3)
        XCTAssertEqual(stats?["item-1"]?["totalResponseMs"] as? Int, 5000)

        // The loaded shape feeds straight into the engine as savedProgress.
        let bridge = try EngineBridge()
        let session = try bridge.createSession(mode: "addition", sessionSize: 5, options: ["savedProgress": loaded])
        XCTAssertEqual(session.snapshot["level"] as? Int, 4)
    }

    @MainActor
    func testLevelClampAndMistakeTrim() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        let store = ProgressStore(supabase: SupabaseService.shared, defaults: defaults)

        let manyMistakes = (0..<30).map { ["itemKey": "k\($0)"] }
        store.saveLocal(mode: "division", data: [
            "level": 99, "mistakeBank": manyMistakes, "firstTryCorrect": 0,
            "bankItemStats": [String: Any](), "recentBankItemIds": [String](),
        ])
        let loaded = store.loadLocal(mode: "division")
        XCTAssertEqual(loaded["level"] as? Int, 10, "level clamps to MAX_LEVEL")
        XCTAssertEqual((loaded["mistakeBank"] as? [[String: Any]])?.count, 20, "mistake bank trims to 20")

        // Phase 3: Grade-5 modes run a 12-level ladder.
        store.saveLocal(mode: "fractionOps", data: [
            "level": 99, "mistakeBank": [[String: Any]](), "firstTryCorrect": 0,
            "bankItemStats": [String: Any](), "recentBankItemIds": [String](),
        ])
        XCTAssertEqual(store.loadLocal(mode: "fractionOps")["level"] as? Int, 12, "Grade-5 modes clamp to 12")
    }

    // MARK: - Merge math (mirror of mergeBankItemStats)

    func testMergeBankItemStatsSumsCountsAndTrims() {
        let merged = ProgressStore.mergeBankItemStats(
            ["a": ["attempts": 1, "firstTryCorrect": 1, "correct": 1, "totalResponseMs": 100, "lastSeenAt": 5.0]],
            incoming: ["a": ["attempts": 2, "firstTryCorrect": 0, "correct": 1, "totalResponseMs": 300, "lastSeenAt": 9.0]]
        )
        XCTAssertEqual(merged["a"]?["attempts"] as? Int, 3)
        XCTAssertEqual(merged["a"]?["lastSeenAt"] as? Double, 9.0)

        // Over the 200-item cap: least-recently-seen items are dropped.
        var big: [String: [String: Any]] = [:]
        for i in 0..<250 {
            big["item-\(i)"] = ["attempts": 1, "firstTryCorrect": 0, "correct": 0, "totalResponseMs": 0, "lastSeenAt": Double(i)]
        }
        let trimmed = ProgressStore.mergeBankItemStats([:], incoming: big)
        XCTAssertEqual(trimmed.count, 200)
        XCTAssertNil(trimmed["item-0"], "oldest dropped")
        XCTAssertNotNil(trimmed["item-249"], "newest kept")
    }

    // MARK: - Live PostgREST probe (network; skips offline)

    /// End-to-end query plumbing against the real project: anon cannot read
    /// item_bank (RLS), so a well-formed request must come back EMPTY — this
    /// verifies the URL/key/filters/JSON-decode path without needing auth.
    @MainActor
    func testAnonItemBankReadIsEmptyUnderRLS() async throws {
        let service = SupabaseService()
        do {
            let rows = try await service.fetchModeItemRows(modeId: "addition")
            XCTAssertTrue(rows.isEmpty, "anon should not see item_bank rows (RLS)")
        } catch {
            throw XCTSkip("network unavailable: \(error)")
        }
    }

    // MARK: - Per-kid scoping (mirror of src/__tests__/progressPerKid.spec.js)

    @MainActor
    func testFirstKidInheritsDeviceProgressOnceAndSiblingsStayIndependent() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: #function))
        defaults.removePersistentDomain(forName: #function)
        let store = ProgressStore(supabase: SupabaseService.shared, defaults: defaults)
        let flight: (Int, Int) -> [String: Any] = { level, stars in
            ["level": level, "mistakeBank": [[String: Any]](), "firstTryCorrect": stars, "starsEarned": stars,
             "bankItemStats": [String: Any](), "recentBankItemIds": [String]()]
        }

        // Anonymous play lands on the bare key.
        store.saveLocal(mode: "addition", data: flight(4, 7))
        XCTAssertNil(store.activeKidId)
        XCTAssertNotNil(defaults.data(forKey: "kidmath-progress"))

        // First kid inherits it exactly once; the device blob is copied, not renamed.
        let kidA = UUID().uuidString
        defaults.set(kidA, forKey: "kidmath-active-kid")
        XCTAssertEqual(ProgressStore.int(store.loadLocal(mode: "addition")["level"]), 4)
        XCTAssertEqual(defaults.string(forKey: "kidmath-progress-migrated"), kidA)
        XCTAssertNotNil(defaults.data(forKey: "kidmath-progress:\(kidA)"))
        XCTAssertNotNil(defaults.data(forKey: "kidmath-progress"))

        // A second kid starts fresh and never sees the sibling's level.
        let kidB = UUID().uuidString
        defaults.set(kidB, forKey: "kidmath-active-kid")
        XCTAssertEqual(ProgressStore.int(store.loadLocal(mode: "addition")["level"]), 1)
        store.saveLocal(mode: "addition", data: flight(2, 3))
        XCTAssertEqual(ProgressStore.int(store.loadLocal(mode: "addition")["lifetimeStars"]), 3)

        defaults.set(kidA, forKey: "kidmath-active-kid")
        XCTAssertEqual(ProgressStore.int(store.loadLocal(mode: "addition")["lifetimeStars"]), 7)
    }
}
