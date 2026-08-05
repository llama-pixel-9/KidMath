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

    func testEggLifecycleMirrorsTheWeb() throws {
        let (flock, engagement, _) = try makeFlock(#function)
        engagement.recordSessionEnd(starsEarned: 200, dayKey: "2026-08-01")

        // A legendary is never bought — an egg arrives, one at a time.
        XCTAssertFalse(flock.buyEgg("robin"), "ordinary species never come as eggs")
        XCTAssertTrue(flock.buyEgg("whoopingCrane"))
        XCTAssertEqual(EngagementStore.starBalance(engagement.load()), 20)
        XCTAssertFalse(flock.buyEgg("condor"), "one egg incubates at a time")

        // Warmth = earned stars after purchase, capped at the target; the
        // ready egg WAITS — hatching only happens on the kid's tap.
        XCTAssertEqual(flock.eggWarmthPercent(), 0)
        engagement.recordSessionEnd(starsEarned: 15, dayKey: "2026-08-02")
        XCTAssertEqual(flock.eggWarmthPercent(), 38)
        XCTAssertNil(flock.hatch(name: "Hope"), "not warm yet — nothing persists early")
        engagement.recordSessionEnd(starsEarned: 30, dayKey: "2026-08-03")
        XCTAssertTrue(flock.eggReady())
        engagement.recordSessionEnd(starsEarned: 10, dayKey: "2026-08-04")
        XCTAssertEqual(flock.eggWarmthPercent(), 100, "warmth never overfills")

        // The hatch consumes the egg and the chick keeps the chosen name.
        let hope = try XCTUnwrap(flock.hatch(name: "  Hope  "))
        XCTAssertNil(flock.egg())
        XCTAssertEqual(hope["customName"] as? String, "Hope")
        XCTAssertEqual(hope["hatched"] as? Bool, true)
        XCTAssertTrue(flock.ownsSpecies("whoopingCrane"))
        XCTAssertFalse(flock.buyEgg("whoopingCrane"), "never sold twice")
    }

    func testSeasonsAndAwayBirds() throws {
        let (flock, _, _) = try makeFlock(#function)
        XCTAssertEqual(Seasons.current(date(2026, 1, 10)), "winter")
        XCTAssertEqual(Seasons.current(date(2026, 8, 4)), "summer")
        XCTAssertTrue(Seasons.isNight(date(2026, 1, 10, hour: 19)))
        XCTAssertFalse(Seasons.isNight(date(2026, 7, 10, hour: 19)), "summer night starts at 9pm")
        XCTAssertTrue(Seasons.isNight(date(2026, 7, 10, hour: 21)))
        // In August the junco is away and the robin is home.
        let junco = try XCTUnwrap(flock.species("junco"))
        XCTAssertFalse(Seasons.presentNow(junco.raw, date: date(2026, 8, 4)))
        XCTAssertEqual(Seasons.awayLine(junco.raw), "Away · back in winter")
        let robin = try XCTUnwrap(flock.species("robin"))
        XCTAssertTrue(Seasons.presentNow(robin.raw, date: date(2026, 8, 4)))
        XCTAssertNil(Seasons.awayLine(robin.raw))
    }

    private func date(_ year: Int, _ month: Int, _ day: Int, hour: Int = 12) -> Date {
        Calendar.current.date(from: DateComponents(year: year, month: month, day: day, hour: hour))!
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
