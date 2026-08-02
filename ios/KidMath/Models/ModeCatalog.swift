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
            ModeInfo(id: "counting", label: "Count It Up!", emoji: "🔢", playable: true),
            ModeInfo(id: "numberBonds", label: "Number Bonds!", emoji: "🔗", playable: true),
            ModeInfo(id: "comparing", label: "Compare Quest!", emoji: "⚖️", playable: true),
            ModeInfo(id: "skipCounting", label: "Skip Count!", emoji: "🐸", playable: true),
            ModeInfo(id: "placeValue", label: "Place Value!", emoji: "🏗️", playable: true),
            ModeInfo(id: "placeValueDiscs", label: "Disc Builder!", emoji: "🪙", playable: true),
        ]),
        ModeGroup(id: "addSubtract", title: "Add & Subtract", gradeHint: "Grades 1-3", modes: [
            ModeInfo(id: "addition", label: "Sum Perch", emoji: "➕", playable: true),
            ModeInfo(id: "subtraction", label: "Countdown Coop", emoji: "➖", playable: true),
            ModeInfo(id: "barModels", label: "Bar Models!", emoji: "📊", playable: true),
        ]),
        ModeGroup(id: "multiplyDivide", title: "Multiply & Divide", gradeHint: "Grades 2-4", modes: [
            ModeInfo(id: "multiplication", label: "Times Tree", emoji: "✖️", playable: true),
            ModeInfo(id: "division", label: "Split the Nest", emoji: "➗", playable: true),
            ModeInfo(id: "factorsMultiples", label: "Factor Lab!", emoji: "🧪", playable: true),
            ModeInfo(id: "patterns", label: "Pattern Play!", emoji: "🧩", playable: true),
        ]),
        ModeGroup(id: "fractionsDecimals", title: "Fractions & Decimals", gradeHint: "Grades 3-4", modes: [
            ModeInfo(id: "fractions", label: "Fraction Frenzy!", emoji: "🍕", playable: true),
            ModeInfo(id: "decimals", label: "Decimal Dash!", emoji: "🎯", playable: true),
        ]),
        ModeGroup(id: "measureMoneyTime", title: "Measure, Money & Time", gradeHint: "Grades 1-4", modes: [
            ModeInfo(id: "measurement", label: "Weigh Station", emoji: "📏", playable: true),
            ModeInfo(id: "money", label: "Money Market!", emoji: "💰", playable: true),
            ModeInfo(id: "time", label: "Tell the Hour", emoji: "⏰", playable: true),
            ModeInfo(id: "areaPerimeter", label: "Area & Perimeter!", emoji: "🖼️", playable: true),
        ]),
        ModeGroup(id: "shapesData", title: "Shapes & Data", gradeHint: "Grades 3-4", modes: [
            ModeInfo(id: "linesShapes", label: "Shape Explorer!", emoji: "🔷", playable: true),
            ModeInfo(id: "angles", label: "Angle Ace!", emoji: "📐", playable: true),
            ModeInfo(id: "dataGraphs", label: "Graph Reader!", emoji: "📈", playable: true),
        ]),
    ]

    static var allModes: [ModeInfo] { groups.flatMap(\.modes) }

    static func mode(_ id: String) -> ModeInfo? {
        allModes.first { $0.id == id }
    }
}
