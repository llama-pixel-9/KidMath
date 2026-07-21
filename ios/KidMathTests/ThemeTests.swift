import UIKit
import XCTest
@testable import KidMath

final class ThemeTests: XCTestCase {

    /// All five bundled Google Fonts must register (UIAppFonts + resources).
    /// A typo'd PostScript name silently falls back to system — catch it here.
    func testBundledDisplayFontsAreRegistered() {
        for theme in Theme.all {
            XCTAssertNotNil(
                UIFont(name: theme.displayFontName, size: 16),
                "\(theme.id): font \(theme.displayFontName) is not registered"
            )
        }
    }

    func testThemeLookupFallsBackToSoftPlay() {
        XCTAssertEqual(Theme.named("nope").id, "default")
        XCTAssertEqual(Theme.named("mario").label, "Pixel Power")
        XCTAssertEqual(Theme.all.count, 5)
    }

    /// Every catalog mode resolves a color in every theme (map or fallback).
    @MainActor
    func testEveryModeHasAColorInEveryTheme() {
        for theme in Theme.all {
            for mode in ModeCatalog.allModes {
                _ = theme.modeColor(mode.id) // must not crash; fallback covers gaps
            }
        }
    }
}
