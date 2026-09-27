import SwiftUI

/// Kid-facing mode metadata — Swift mirror of MODE_GROUPS + mode labels in
/// src/modes/index.js. Every engine mode appears in exactly one group (the
/// web enforces this in modeGroups.spec.js; testModeCatalogCoversEngine does
/// the same here against the live engine).
struct ModeInfo: Identifiable, Hashable {
    let id: String
    let label: String
    let emoji: String
    /// §14 card glyph: one Ink math mark in a cream well (no emoji).
    let glyph: String
    /// One line under the name on a grade tile.
    let blurb: String

    /// Whether the widget set covers every answer type this mode can
    /// generate. All 22 modes are playable as of P3; the gate (and the SOON
    /// badge it drives) stays for any future mode that ships before its
    /// widgets do.
    let playable: Bool
}

struct ModeGroup: Identifiable {
    let id: String
    let title: String
    let gradeHint: String
    let modes: [ModeInfo]
}

enum ModeCatalog {

    static let groups: [ModeGroup] = [
        ModeGroup(id: "numbers", title: "Counting & Numbers", gradeHint: "Grades 1-2", modes: [
            ModeInfo(id: "counting", label: "Counting Chicks", emoji: "🔢", glyph: "12", blurb: "Count to 100", playable: true),
            ModeInfo(id: "numberBonds", label: "Number Bonds!", emoji: "🔗", glyph: "⊕", blurb: "Parts and wholes", playable: true),
            ModeInfo(id: "comparing", label: "Comparison Crow", emoji: "⚖️", glyph: "<", blurb: "More, less, equal", playable: true),
            ModeInfo(id: "skipCounting", label: "Skip Count!", emoji: "🐸", glyph: "+5", blurb: "By 2s, 5s and 10s", playable: true),
            ModeInfo(id: "placeValue", label: "Place Value Perch", emoji: "🏗️", glyph: "10", blurb: "Tens and ones", playable: true),
            ModeInfo(id: "placeValueDiscs", label: "Disc Builder!", emoji: "🪙", glyph: "◎", blurb: "Read and trade discs", playable: true),
        ]),
        ModeGroup(id: "addSubtract", title: "Add & Subtract", gradeHint: "Grades 1-3", modes: [
            ModeInfo(id: "addition", label: "Addition Acorns", emoji: "➕", glyph: "+", blurb: "Sums to 20", playable: true),
            ModeInfo(id: "subtraction", label: "Subtraction Swoop", emoji: "➖", glyph: "−", blurb: "Take away to 20", playable: true),
            ModeInfo(id: "barModels", label: "Bar Models!", emoji: "📊", glyph: "▭", blurb: "Draw the bar, find the missing amount", playable: true),
        ]),
        ModeGroup(id: "multiplyDivide", title: "Multiply & Divide", gradeHint: "Grades 2-4", modes: [
            ModeInfo(id: "multiplication", label: "Multiplication Meadow", emoji: "✖️", glyph: "×", blurb: "2× to 12×", playable: true),
            ModeInfo(id: "division", label: "Division Dive", emoji: "➗", glyph: "÷", blurb: "Share into equal groups", playable: true),
            ModeInfo(id: "factorsMultiples", label: "Factor Lab!", emoji: "🧪", glyph: "ƒ", blurb: "Factors, multiples, primes", playable: true),
            ModeInfo(id: "patterns", label: "Pattern Play!", emoji: "🧩", glyph: "…", blurb: "Extend and explain patterns", playable: true),
        ]),
        ModeGroup(id: "fractionsDecimals", title: "Fractions & Decimals", gradeHint: "Grades 3-5", modes: [
            ModeInfo(id: "fractions", label: "Fractions Feather", emoji: "🍕", glyph: "½", blurb: "Halves, thirds, fourths", playable: true),
            ModeInfo(id: "decimals", label: "Decimal Dash!", emoji: "🎯", glyph: "0.1", blurb: "Tenths and hundredths", playable: true),
            ModeInfo(id: "fractionOps", label: "Fraction Forge", emoji: "🍕", glyph: "¾", blurb: "Add and multiply fractions", playable: true),
            ModeInfo(id: "decimalOps", label: "Decimal Drift", emoji: "💧", glyph: "0.5", blurb: "Add and multiply decimals", playable: true),
        ]),
        ModeGroup(id: "measureMoneyTime", title: "Measure, Money & Time", gradeHint: "Grades 1-4", modes: [
            ModeInfo(id: "measurement", label: "Measuring Wings", emoji: "📏", glyph: "cm", blurb: "Length & angles", playable: true),
            ModeInfo(id: "money", label: "Money Magpie", emoji: "💰", glyph: "¢", blurb: "Coins & change", playable: true),
            ModeInfo(id: "time", label: "Time Tweet", emoji: "⏰", glyph: "◷", blurb: "To the nearest 5 minutes", playable: true),
            ModeInfo(id: "areaPerimeter", label: "Area & Perimeter!", emoji: "🖼️", glyph: "▢", blurb: "Cover and measure rectangles", playable: true),
        ]),
        ModeGroup(id: "shapesData", title: "Shapes & Data", gradeHint: "Grades 3-5", modes: [
            ModeInfo(id: "linesShapes", label: "Shapes Shell", emoji: "🔷", glyph: "▲", blurb: "2D shapes", playable: true),
            ModeInfo(id: "angles", label: "Angle Ace!", emoji: "📐", glyph: "∠", blurb: "Classify and measure angles", playable: true),
            ModeInfo(id: "dataGraphs", label: "Graph Reader!", emoji: "📈", glyph: "▥", blurb: "Bar graphs, pictographs, tallies", playable: true),
            // Grade-5 volume/coordinates: cubeGrid + coordGrid figures are not
            // drawn in Swift yet — SOON badge until they are.
            ModeInfo(id: "volumeCoordinates", label: "Cube & Compass", emoji: "🧊", glyph: "⬚", blurb: "Cubes and the coordinate grid", playable: false),
        ]),
    ]

    static var allModes: [ModeInfo] { groups.flatMap(\.modes) }

    static func mode(_ id: String) -> ModeInfo? {
        allModes.first { $0.id == id }
    }
}
