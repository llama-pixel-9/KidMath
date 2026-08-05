import XCTest
@testable import KidMath

/// §04–§06/§13 on iOS: the roster, zones and perch placement come from the
/// SHARED engine (one source of truth with the web), and FlockService owns
/// the state transitions on the per-kid engagement blob.
@MainActor
final class FlockTests: XCTestCase {

    private func makeFlock(_ name: String) throws -> (FlockService, EngagementStore, UserDefaults) {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: name))
        defaults.removePersistentDomain(forName: name)
        let engine = try EngineBridge()
        let engagement = EngagementStore(defaults: defaults)
        return (FlockService(engine: engine, engagement: engagement), engagement, defaults)
    }

    func testRosterAndZonesComeFromTheSharedEngine() throws {
        let (flock, _, _) = try makeFlock(#function)
        XCTAssertEqual(flock.species.count, 22)
        XCTAssertEqual(flock.species.filter { $0.tier == "common" }.count, 8)
        XCTAssertEqual(flock.species.filter { $0.tier == "legendary" }.count, 2)
        XCTAssertEqual(flock.species("skylark")?.starter, true)
        XCTAssertEqual(flock.species("barnOwl")?.price, 55)
        XCTAssertEqual(flock.species("whoopingCrane")?.egg, true)
        XCTAssertEqual(flock.allZones.map(\.id), ["meadow", "pond", "woods", "cliffs"])
        XCTAssertEqual(flock.allZones.map(\.unlockAt), [0, 5, 10, 15])
    }

    func testStarterArrivesOnceOnASuitablePerch() throws {
        let (flock, _, _) = try makeFlock(#function)
        let starter = try XCTUnwrap(flock.ensureStarter())
        let perchId = try XCTUnwrap(starter["perchId"] as? String)
        XCTAssertTrue(perchId.hasPrefix("meadow:"), "the first bird lands in the meadow")
        XCTAssertNil(flock.ensureStarter(), "idempotent — she arrives once")
        XCTAssertEqual(flock.flockCount(), 1)
        XCTAssertEqual(flock.earnedZones().map(\.id), ["meadow"])
        XCTAssertEqual(flock.frontierZone()?.id, "pond")
    }

    func testGiveHomeSpendsRefusesAndPlacesDistinctPerches() throws {
        let (flock, engagement, _) = try makeFlock(#function)
        engagement.recordSessionEnd(starsEarned: 100, dayKey: "2026-08-04")
        _ = flock.ensureStarter()

        // Short balance refuses; the starter and egg-only refuse at any price.
        XCTAssertNil(flock.giveHome("kestrel")) // 120 > 100
        XCTAssertNil(flock.giveHome("skylark"))
        XCTAssertNil(flock.giveHome("whoopingCrane"))

        let owl = try XCTUnwrap(flock.giveHome("barnOwl"))
        XCTAssertEqual(EngagementStore.starBalance(engagement.load()), 45)
        XCTAssertNil(flock.giveHome("barnOwl"), "never sold twice")

        let finch = try XCTUnwrap(flock.giveHome("houseFinch"))
        XCTAssertEqual(EngagementStore.starBalance(engagement.load()), 30)

        // Every bird has a distinct saved perch, chosen by the shared engine.
        let perchIds = flock.birds().compactMap { $0["perchId"] as? String }
        XCTAssertEqual(Set(perchIds).count, perchIds.count)
        XCTAssertTrue((owl["perchId"] as? String)?.isEmpty == false)
        XCTAssertTrue((finch["perchId"] as? String)?.isEmpty == false)

        // Preset name drawn from the species' curated six (§07).
        let names = flock.species("barnOwl")?.raw["presetNames"] as? [String] ?? []
        XCTAssertTrue(names.contains(owl["presetName"] as? String ?? ""))
    }

    func testZonesUnlockWithTheFlock() throws {
        let (flock, engagement, _) = try makeFlock(#function)
        engagement.recordSessionEnd(starsEarned: 500, dayKey: "2026-08-04")
        _ = flock.ensureStarter()
        for id in ["houseFinch", "mourningDove", "chickadee", "houseWren"] {
            XCTAssertNotNil(flock.giveHome(id), id)
        }
        XCTAssertEqual(flock.flockCount(), 5)
        XCTAssertEqual(flock.earnedZones().map(\.id), ["meadow", "pond"])
        XCTAssertEqual(flock.frontierZone()?.id, "woods")
    }
}
