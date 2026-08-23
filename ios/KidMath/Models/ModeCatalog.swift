import SwiftUI

/// Kid-facing mode metadata — Swift mirror of MODE_GROUPS + mode labels in
/// src/modes/index.js. Every engine mode appears in exactly one group (the
/// web enforces this in modeGroups.spec.js; testModeCatalogCoversEngine does
/// the same here against the live engine).
struct ModeInfo: Identifiable, Hashable {
    let id: String
    let label: String
    let emoji: String

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
            ModeInfo(id: "counting", label: "Counting Chicks", emoji: "🔢", playable: true),
            ModeInfo(id: "numberBonds", label: "Number Bonds!", emoji: "🔗", playable: true),
            ModeInfo(id: "comparing", label: "Comparison Crow", emoji: "⚖️", playable: true),
            ModeInfo(id: "skipCounting", label: "Skip Count!", emoji: "🐸", playable: true),
            ModeInfo(id: "placeValue", label: "Place Value Perch", emoji: "🏗️", playable: true),
            ModeInfo(id: "placeValueDiscs", label: "Disc Builder!", emoji: "🪙", playable: true),
        ]),
        ModeGroup(id: "addSubtract", title: "Add & Subtract", gradeHint: "Grades 1-3", modes: [
            ModeInfo(id: "addition", label: "Addition Acorns", emoji: "➕", playable: true),
            ModeInfo(id: "subtraction", label: "Subtraction Swoop", emoji: "➖", playable: true),
            ModeInfo(id: "barModels", label: "Bar Models!", emoji: "📊", playable: true),
        ]),
        ModeGroup(id: "multiplyDivide", title: "Multiply & Divide", gradeHint: "Grades 2-4", modes: [
            ModeInfo(id: "multiplication", label: "Multiplication Meadow", emoji: "✖️", playable: true),
            ModeInfo(id: "division", label: "Division Dive", emoji: "➗", playable: true),
            ModeInfo(id: "factorsMultiples", label: "Factor Lab!", emoji: "🧪", playable: true),
            ModeInfo(id: "patterns", label: "Pattern Play!", emoji: "🧩", playable: true),
        ]),
        ModeGroup(id: "fractionsDecimals", title: "Fractions & Decimals", gradeHint: "Grades 3-5", modes: [
            ModeInfo(id: "fractions", label: "Fractions Feather", emoji: "🍕", playable: true),
            ModeInfo(id: "decimals", label: "Decimal Dash!", emoji: "🎯", playable: true),
            ModeInfo(id: "fractionOps", label: "Fraction Forge", emoji: "🍕", playable: true),
            ModeInfo(id: "decimalOps", label: "Decimal Drift", emoji: "💧", playable: true),
        ]),
        ModeGroup(id: "measureMoneyTime", title: "Measure, Money & Time", gradeHint: "Grades 1-4", modes: [
            ModeInfo(id: "measurement", label: "Measuring Wings", emoji: "📏", playable: true),
            ModeInfo(id: "money", label: "Money Magpie", emoji: "💰", playable: true),
            ModeInfo(id: "time", label: "Time Tweet", emoji: "⏰", playable: true),
            ModeInfo(id: "areaPerimeter", label: "Area & Perimeter!", emoji: "🖼️", playable: true),
        ]),
        ModeGroup(id: "shapesData", title: "Shapes & Data", gradeHint: "Grades 3-5", modes: [
            ModeInfo(id: "linesShapes", label: "Shapes Shell", emoji: "🔷", playable: true),
            ModeInfo(id: "angles", label: "Angle Ace!", emoji: "📐", playable: true),
            ModeInfo(id: "dataGraphs", label: "Graph Reader!", emoji: "📈", playable: true),
            // Grade-5 volume/coordinates: cubeGrid + coordGrid figures are not
            // drawn in Swift yet — SOON badge until they are.
            ModeInfo(id: "volumeCoordinates", label: "Cube & Compass", emoji: "🧊", playable: false),
        ]),
    ]

    static var allModes: [ModeInfo] { groups.flatMap(\.modes) }

    static func mode(_ id: String) -> ModeInfo? {
        allModes.first { $0.id == id }
    }
}
