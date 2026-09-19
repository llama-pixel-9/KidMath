import XCTest
import SwiftUI
@testable import KidMath

/// The Meadow art kit ships in the asset catalog (synced from public/meadow
/// by `npm run ios:art`) and resolves the way artAssets.js does. Set
/// TEST_RUNNER_KIDMATH_FIGURE_SNAPSHOT_DIR to also write PNGs.
@MainActor
final class MeadowArtTests: XCTestCase {

    func testKitIsComplete() {
        XCTAssertEqual(MeadowArtManifest.sizes.count, 59, "one manifest entry per shipped file")
        for key in MeadowArtManifest.sizes.keys {
            let parts = key.split(separator: "/").map(String.init)
            let file = parts[0] == "egg" ? "stage\(parts[1])" : parts[1]
            XCTAssertNotNil(Bundle.main.url(forResource: "meadow-\(parts[0])-\(file)", withExtension: "webp"), "missing resource \(key)")
        }
        XCTAssertNotNil(MeadowArt.bird("skylark"))
        XCTAssertNotNil(MeadowArt.bird("downyWoodpecker", variant: "cling"), "variant art")
        XCTAssertEqual(MeadowArt.bird("robin", variant: "cling")?.name, "birds/robin", "no variant → base art")
        XCTAssertNil(MeadowArt.bird("dodo"))
        XCTAssertEqual(MeadowArt.egg(percent: 0)?.stage, 0)
        XCTAssertEqual(MeadowArt.egg(percent: 30)?.stage, 1)
        XCTAssertEqual(MeadowArt.egg(percent: 80)?.stage, 3)
        for zone in ["meadow", "pond", "woods", "cliffs"] {
            XCTAssertNotNil(MeadowArt.zone(zone), zone)
            XCTAssertFalse(MeadowArt.scenery(zoneId: zone).isEmpty, "\(zone) furniture from the shared SCENERY table")
        }
        for badge in EngagementStore.badges() {
            XCTAssertNotNil(MeadowArt.feather(badge.id), "feather for \(badge.id)")
        }
    }

    func testMeadowRendersWithArt() throws {
        let scene = ZStack(alignment: .topLeading) {
            ZoneBackdropView(zoneId: "meadow", nestBalance: 12, season: nil)
            BirdSpriteView(speciesId: "skylark").frame(width: 46, height: 40).position(x: 330, y: 300)
            BirdSpriteView(speciesId: "cardinal").frame(width: 46, height: 40).position(x: 940, y: 350)
            BirdSpriteView(asleep: true, speciesId: "barnOwl").frame(width: 46, height: 48).position(x: 178, y: 320)
            EggSpriteView(warmthPercent: 60, ready: false, speciesName: "Puffin").position(x: 566, y: 470)
        }
        .frame(width: 1024, height: 588)
        let renderer = ImageRenderer(content: scene)
        renderer.scale = 1
        let image = try XCTUnwrap(renderer.uiImage)
        XCTAssertEqual(Int(image.size.width), 1024)
        if let dir = ProcessInfo.processInfo.environment["KIDMATH_FIGURE_SNAPSHOT_DIR"] {
            try image.pngData()?.write(to: URL(fileURLWithPath: dir).appendingPathComponent("meadow-art.png"))
            let badges = HStack(spacing: 12) {
                ForEach(EngagementStore.badges()) { BadgeGlyph(badge: $0, size: 48) }
            }.padding().background(Color.white)
            let r2 = ImageRenderer(content: badges); r2.scale = 1
            try r2.uiImage?.pngData()?.write(to: URL(fileURLWithPath: dir).appendingPathComponent("feathers.png"))
        }
    }
}
