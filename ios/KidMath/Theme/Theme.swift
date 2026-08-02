import SwiftUI

/// The larkit palette — the only theme. Mirrors src/themes.js on the web;
/// design/larkit/README.md is the source of truth for every value here.
///
/// The alt skins (mario/zelda/minecraft/neon) and the theme picker are gone
/// by design: color carries meaning in this brand (Ink is what is given,
/// Lark Teal is the thing in play, Sun is the measurement), so it is not
/// decoration to hand out. The struct shape is unchanged so every
/// `@Environment(\.theme)` consumer keeps working.
struct Theme: Identifiable {
    let id: String
    let label: String
    let emoji: String
    let themeDescription: String
    let completeMsg: String
    let isDark: Bool
    /// PostScript name of the bundled display font (hero, titles, buttons).
    let displayFontName: String

    let background: Color
    let cardBackground: Color
    let cardBorder: Color
    let textPrimary: Color
    let textSecondary: Color
    let textMuted: Color
    let heroGradient: [Color]
    let ctaGradient: [Color]
    let progressTrack: Color
    let progressFill: [Color]
    let bubbleGradients: [[Color]]
    /// Pressed/edge shade per bubble tint, same fixed order.
    let bubbleEdges: [Color]
    private let modeColorMap: [String: Color]

    /// Correct deepens toward brand teal; wrong is Ember — never green/red.
    let correct = Theme.teal
    let wrong = Theme.ember

    func displayFont(size: CGFloat) -> Font {
        .custom(displayFontName, size: size)
    }

    /// Body face — Nunito (bundled static cuts: Regular/SemiBold/Bold).
    func bodyFont(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .bold, .heavy, .black: return .custom("Nunito-Bold", size: size)
        case .semibold, .medium: return .custom("Nunito-SemiBold", size: size)
        default: return .custom("Nunito-Regular", size: size)
        }
    }

    func modeColor(_ modeId: String) -> Color {
        if let color = modeColorMap[modeId] { return color }
        // Deterministic fallback for modes the map doesn't list.
        let index = modeId.unicodeScalars.reduce(0) { $0 + Int($1.value) }
        return bubbleGradients[index % bubbleGradients.count][0]
    }

    // MARK: - Brand constants (design/larkit/README.md §Color)

    static let cream = Color(hex: 0xFFFBEB)
    static let teal = Color(hex: 0x0B7A6A)
    static let sun = Color(hex: 0xF26B3A)
    static let ember = Color(hex: 0xC4471B)
    static let ink = Color(hex: 0x14231F)
    static let night = Color(hex: 0x10221E)
    static let mint = Color(hex: 0x4FD1BC)
    static let peach = Color(hex: 0xFFB088)

    static let seafoam = Color(hex: 0xA7DED3)
    static let seafoamDeep = Color(hex: 0x7FCFBE)
    static let tealMid = Color(hex: 0x6FC3B2)
    static let tealMidDeep = Color(hex: 0x3E9E8E)
    static let apricot = Color(hex: 0xFBC7A8)
    static let apricotDeep = Color(hex: 0xF0A47A)
    static let sunLight = Color(hex: 0xF9A97F)
    static let sunLightDeep = Color(hex: 0xE8895A)
    static let deepTeal = Color(hex: 0x064A41)

    // MARK: - The theme

    static let all: [Theme] = [.larkit]

    static func named(_ id: String) -> Theme { .larkit }

    static let larkit = Theme(
        id: "larkit", label: "larkit", emoji: "🐦",
        themeDescription: "Math that feels like play.",
        completeMsg: "That soared!", isDark: false, displayFontName: "Fredoka-SemiBold",
        background: Theme.cream,
        cardBackground: .white,
        cardBorder: Theme.ink.opacity(0.10),
        textPrimary: Theme.ink,
        textSecondary: Theme.ink.opacity(0.70),
        textMuted: Theme.ink.opacity(0.50),
        heroGradient: [Theme.teal, Theme.teal],
        ctaGradient: [Theme.teal, Theme.teal],
        progressTrack: Theme.ink.opacity(0.10),
        progressFill: [Theme.teal, Theme.teal],
        // The four answer-surface tints, fixed order (reading order):
        // Seafoam, Teal Mid, Apricot, Sun Light. Flat fills — the pairs exist
        // only because call sites draw gradients; both stops are the same hue.
        bubbleGradients: [
            [Theme.seafoam, Theme.seafoam],
            [Theme.tealMid, Theme.tealMid],
            [Theme.apricot, Theme.apricot],
            [Theme.sunLight, Theme.sunLight],
        ],
        bubbleEdges: [Theme.seafoamDeep, Theme.tealMidDeep, Theme.apricotDeep, Theme.sunLightDeep],
        modeColorMap: [
            "addition": Theme.seafoam, "subtraction": Theme.tealMid,
            "multiplication": Theme.apricot, "division": Theme.sunLight,
            "comparing": Theme.seafoam, "counting": Theme.apricot,
            "skipCounting": Theme.tealMid, "placeValue": Theme.sunLight,
            "placeValueDiscs": Theme.apricot, "numberBonds": Theme.seafoam,
            "fractions": Theme.tealMid, "decimals": Theme.sunLight,
            "barModels": Theme.seafoam, "factorsMultiples": Theme.apricot,
            "areaPerimeter": Theme.tealMid, "money": Theme.sunLight,
            "patterns": Theme.seafoam, "measurement": Theme.apricot,
            "time": Theme.tealMid, "dataGraphs": Theme.sunLight,
            "angles": Theme.seafoam, "linesShapes": Theme.apricot,
        ]
    )
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

extension EnvironmentValues {
    @Entry var theme = Theme.larkit
}
