import SwiftUI

/// The generated Meadow art — Swift mirror of src/engagement/meadow/artAssets.js.
/// Images live in Assets.xcassets/Meadow/<group>/<id> (synced from
/// public/meadow by `npm run ios:art`, the web being the only place art is
/// edited); MeadowArtManifest carries each file's intrinsic size so views can
/// fit by aspect. Every helper returns nil when an asset is missing, and the
/// callers keep their code-drawn placeholder — a partial kit never breaks the
/// scene.
enum MeadowArt {
    struct Asset {
        let name: String
        let size: CGSize
        let uiImage: UIImage
        var aspect: CGFloat { size.height > 0 ? size.width / size.height : 1 }
        var image: Image { Image(uiImage: uiImage) }
    }

    /// Decoded once per file for the app's life (59 small WebPs).
    nonisolated(unsafe) private static var cache: [String: Asset] = [:]
    nonisolated(unsafe) private static var missing: Set<String> = []

    private static func entry(_ group: String, _ id: String, file: String? = nil) -> Asset? {
        let key = "\(group)/\(id)"
        if let hit = cache[key] { return hit }
        if missing.contains(key) { return nil }
        guard let size = MeadowArtManifest.sizes[key],
              let url = Bundle.main.url(forResource: "meadow-\(group)-\(file ?? id)", withExtension: "webp"),
              let data = try? Data(contentsOf: url),
              let ui = UIImage(data: data) else {
            missing.insert(key)
            return nil
        }
        let asset = Asset(name: key, size: size, uiImage: ui)
        cache[key] = asset
        return asset
    }

    /// Sprite art for a species, or a variant like "downyWoodpecker-cling".
    static func bird(_ speciesId: String, variant: String? = nil) -> Asset? {
        if let variant, let v = entry("birds", "\(speciesId)-\(variant)") { return v }
        return entry("birds", speciesId)
    }

    static func prop(_ id: String) -> Asset? { entry("props", id) }

    /// Feather badge art, keyed by badge id (badges.js).
    static func feather(_ badgeId: String) -> Asset? { entry("feathers", badgeId) }

    static func zone(_ zoneId: String) -> Asset? { entry("zones", zoneId) }

    /// Egg art by warmth percent: pristine → three crack stages.
    static func egg(percent: Int) -> (asset: Asset, stage: Int)? {
        let stage = percent >= 75 ? 3 : percent >= 50 ? 2 : percent >= 25 ? 1 : 0
        // The manifest keys eggs by stage number; the file is stage<N>.webp.
        return entry("egg", "\(stage)", file: "stage\(stage)").map { ($0, stage) }
    }

    /// Furniture per zone from the shared SCENERY table (zone px, 1024×588):
    /// prop id, base-centre x/y, target height, sway flag.
    struct Furniture {
        let prop: String
        let x: CGFloat
        let y: CGFloat
        let height: CGFloat
        let sway: Bool
    }

    static func scenery(zoneId: String) -> [Furniture] {
        guard let all = try? EngagementStore.rules?.callDictionary("meadowScenery"),
              let items = all[zoneId] as? [[String: Any]] else { return [] }
        return items.compactMap { item in
            guard let prop = item["prop"] as? String else { return nil }
            return Furniture(
                prop: prop,
                x: CGFloat((item["x"] as? NSNumber)?.doubleValue ?? 0),
                y: CGFloat((item["y"] as? NSNumber)?.doubleValue ?? 0),
                height: CGFloat((item["h"] as? NSNumber)?.doubleValue ?? 0),
                sway: (item["sway"] as? Bool) == true
            )
        }
    }
}
