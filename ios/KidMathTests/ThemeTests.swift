import UIKit
import XCTest
@testable import KidMath

final class ThemeTests: XCTestCase {

    /// The bundled Google Fonts must register (UIAppFonts + resources).
    /// A typo'd PostScript name silently falls back to system — catch it here.
    func testBundledFontsAreRegistered() {
        for theme in Theme.all {
            XCTAssertNotNil(
                UIFont(name: theme.displayFontName, size: 16),
                "\(theme.id): font \(theme.displayFontName) is not registered"
            )
        }
        XCTAssertNotNil(UIFont(name: "Nunito-Regular", size: 16), "Nunito (body) is not registered")
    }

    /// Every id — including the retired skins a device may still have saved in
    /// UserDefaults — resolves to the one larkit theme.
    func testEveryLookupResolvesToLarkit() {
        XCTAssertEqual(Theme.named("nope").id, "larkit")
        XCTAssertEqual(Theme.named("mario").id, "larkit")
        XCTAssertEqual(Theme.named("default").id, "larkit")
        XCTAssertEqual(Theme.all.count, 1)
    }

    /// Every catalog mode resolves a color (map or fallback).
    @MainActor
    func testEveryModeHasAColor() {
        for theme in Theme.all {
            for mode in ModeCatalog.allModes {
                _ = theme.modeColor(mode.id) // must not crash; fallback covers gaps
            }
        }
    }
}
