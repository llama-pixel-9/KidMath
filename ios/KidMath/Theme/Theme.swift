import SwiftUI

/// SwiftUI port of the web's default "Soft Play" theme (src/themes.js) —
/// Tailwind classes become concrete color tokens. The remaining four themes
/// and a theme switcher arrive in P3; views only read tokens from here.
struct Theme {
    let background = Color(red: 1.0, green: 0.984, blue: 0.922) // amber-50
    let cardBackground = Color.white.opacity(0.9)
    let cardBorder = Color(red: 0.898, green: 0.906, blue: 0.922) // gray-200
    let textPrimary = Color(red: 0.201, green: 0.255, blue: 0.331) // slate-700
    let textSecondary = Color(red: 0.394, green: 0.455, blue: 0.545) // slate-500
    let textMuted = Color(red: 0.580, green: 0.639, blue: 0.722) // slate-400

    let heroGradient = [
        Color(red: 0.925, green: 0.286, blue: 0.600), // pink-500
        Color(red: 0.545, green: 0.361, blue: 0.965), // violet-500
        Color(red: 0.055, green: 0.647, blue: 0.914), // sky-500
    ]
    let ctaGradient = [
        Color(red: 0.957, green: 0.447, blue: 0.714), // pink-400
        Color(red: 0.655, green: 0.545, blue: 0.980), // violet-400
    ]
    let progressFill = [
        Color(red: 0.988, green: 0.827, blue: 0.302), // amber-300
        Color(red: 0.984, green: 0.573, blue: 0.235), // orange-400
    ]

    let correct = Color(red: 0.290, green: 0.780, blue: 0.529) // emerald-ish
    let wrong = Color(red: 0.973, green: 0.443, blue: 0.443) // red-400

    /// Per-mode card accents (modeColors in themes.js, extended to all 22).
    private static let modeColors: [String: Color] = [
        "addition": Color(red: 0.957, green: 0.447, blue: 0.714), // pink-400
        "subtraction": Color(red: 0.220, green: 0.741, blue: 0.973), // sky-400
        "multiplication": Color(red: 0.655, green: 0.545, blue: 0.980), // violet-400
        "division": Color(red: 0.984, green: 0.749, blue: 0.141), // amber-400
        "comparing": Color(red: 0.176, green: 0.831, blue: 0.749), // teal-400
        "counting": Color(red: 0.984, green: 0.573, blue: 0.235), // orange-400
        "skipCounting": Color(red: 0.133, green: 0.827, blue: 0.933), // cyan-400
        "placeValue": Color(red: 0.984, green: 0.443, blue: 0.522), // rose-400
        "placeValueDiscs": Color(red: 0.984, green: 0.749, blue: 0.141),
        "numberBonds": Color(red: 0.655, green: 0.545, blue: 0.980),
        "fractions": Color(red: 0.957, green: 0.447, blue: 0.714),
        "decimals": Color(red: 0.220, green: 0.741, blue: 0.973),
        "barModels": Color(red: 0.176, green: 0.831, blue: 0.749),
        "factorsMultiples": Color(red: 0.639, green: 0.800, blue: 0.153), // lime-400
        "areaPerimeter": Color(red: 0.133, green: 0.827, blue: 0.933),
        "money": Color(red: 0.290, green: 0.780, blue: 0.529),
        "patterns": Color(red: 0.984, green: 0.443, blue: 0.522),
        "measurement": Color(red: 0.984, green: 0.573, blue: 0.235),
        "time": Color(red: 0.655, green: 0.545, blue: 0.980),
        "dataGraphs": Color(red: 0.220, green: 0.741, blue: 0.973),
        "angles": Color(red: 0.176, green: 0.831, blue: 0.749),
        "linesShapes": Color(red: 0.957, green: 0.447, blue: 0.714),
    ]

    func modeColor(_ modeId: String) -> Color {
        Self.modeColors[modeId] ?? ctaGradient[1]
    }
}

extension EnvironmentValues {
    @Entry var theme = Theme()
}
