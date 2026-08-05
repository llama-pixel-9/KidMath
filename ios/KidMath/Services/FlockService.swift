import Foundation

/// The flock (§04–§06, §13) — Swift mirror of src/engagement/flock.js, built
/// on the per-kid engagement blob. Species data, zones and perch placement
/// come from the shared JS engine (one source of truth); this service owns
/// the state transitions: the starter Skylark, zone unlocks, and Give a home.
@MainActor
final class FlockService {

    struct Species {
        let id: String
        let name: String
        let tier: String
        let price: Int?
        let starter: Bool
        let egg: Bool
        let raw: [String: Any]

        init(raw: [String: Any]) {
            self.id = raw["id"] as? String ?? ""
            self.name = raw["name"] as? String ?? ""
            self.tier = raw["tier"] as? String ?? "common"
            self.price = (raw["price"] as? NSNumber)?.intValue
            self.starter = raw["starter"] as? Bool ?? false
            self.egg = raw["egg"] as? Bool ?? false
            self.raw = raw
        }
    }

    struct Zone {
        let id: String
        let name: String
        let unlockAt: Int
    }

    private let engine: EngineBridge
    private let engagement: EngagementStore
    private(set) var species: [Species] = []
    private(set) var allZones: [Zone] = []

    init(engine: EngineBridge, engagement: EngagementStore = EngagementStore()) {
        self.engine = engine
        self.engagement = engagement
        self.species = (try? engine.roster())?.map(Species.init) ?? []
        self.allZones = ((try? engine.zones()) ?? []).map {
            Zone(
                id: $0["id"] as? String ?? "",
                name: $0["name"] as? String ?? "",
                unlockAt: ProgressStore.int($0["unlockAt"])
            )
        }
    }

    func species(_ id: String) -> Species? {
        species.first { $0.id == id }
    }

    // MARK: - Reads over the blob

    func birds() -> [[String: Any]] {
        engagement.load()["birds"] as? [[String: Any]] ?? []
    }

    /// Birds away on migration still count toward zone unlocks (§11).
    func flockCount() -> Int { birds().count }

    func earnedZones() -> [Zone] {
        let count = flockCount()
        return allZones.filter { count >= $0.unlockAt }
    }

    func frontierZone() -> Zone? {
        let count = flockCount()
        return allZones.first { count < $0.unlockAt }
    }

    func ownsSpecies(_ id: String) -> Bool {
        birds().contains { ($0["speciesId"] as? String) == id }
    }

    static func birdName(_ bird: [String: Any]) -> String {
        (bird["customName"] as? String) ?? (bird["presetName"] as? String) ?? ""
    }

    // MARK: - Arrivals (mirror of applyAddBird / applyEnsureStarter / applyGiveHome)

    /// One bird per species; preset name drawn from the species' curated six;
    /// the perch is chosen once by the shared engine and saved forever, along
    /// with the idle-bob rig (§14).
    @discardableResult
    private func addBird(_ speciesId: String, dayKey: String = EngagementStore.todayKey()) -> [String: Any]? {
        guard let species = species(speciesId), !ownsSpecies(speciesId) else { return nil }
        var state = engagement.load()
        var flock = state["birds"] as? [[String: Any]] ?? []
        let earnedIds = earnedZones().map(\.id)
        let viewed = (state["lastViewedZone"] as? String).flatMap { earnedIds.contains($0) ? $0 : nil } ?? "meadow"
        let perchId = (try? engine.choosePerch(
            birds: flock, speciesId: speciesId, viewedZoneId: viewed, earnedZoneIds: earnedIds
        )) ?? nil
        let presetNames = species.raw["presetNames"] as? [String] ?? [species.name]
        let bird: [String: Any] = [
            "speciesId": speciesId,
            "presetName": presetNames.randomElement() ?? species.name,
            "perchId": perchId ?? "",
            "arrivalDay": dayKey,
            "bob": [
                "period": Double.random(in: 4...6).rounded(toPlaces: 2),
                "delay": Double.random(in: 0...4).rounded(toPlaces: 2),
            ],
        ]
        flock.append(bird)
        state["birds"] = flock
        engagement.persist(state)
        return bird
    }

    /// The Skylark is not bought — she is there on day one (§13). Idempotent.
    @discardableResult
    func ensureStarter() -> [String: Any]? {
        guard !ownsSpecies("skylark") else { return nil }
        return addBird("skylark")
    }

    /// §08: spend the stars, then the arrival — the receipt. Returns the new
    /// bird, or nil when refused (short balance, owned, starter, egg-only).
    @discardableResult
    func giveHome(_ speciesId: String) -> [String: Any]? {
        guard let species = species(speciesId), !species.starter, !species.egg,
              let price = species.price, !ownsSpecies(speciesId) else { return nil }
        var state = engagement.load()
        guard EngagementStore.starBalance(state) >= price else { return nil }
        state["spentStars"] = ProgressStore.int(state["spentStars"]) + price
        engagement.persist(state)
        return addBird(speciesId)
    }

    func recordViewedZone(_ zoneId: String) {
        var state = engagement.load()
        state["lastViewedZone"] = zoneId
        engagement.persist(state)
    }
}

private extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let factor = pow(10.0, Double(places))
        return (self * factor).rounded() / factor
    }
}
