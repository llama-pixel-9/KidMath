import SwiftUI

/// SwiftUI port of the web's theme system (src/themes.js) — the five themes'
/// Tailwind classes become concrete color tokens, and each theme's display
/// font (bundled .ttf, the same Google Fonts families the web loads) comes
/// through `displayFont`. Views only ever read tokens from here.
struct Theme: Identifiable {
    let id: String
    let label: String
    let emoji: String
    let themeDescription: String
    let completeMsg: String
    /// Neon renders on a dark stage; controls the color scheme of sheets etc.
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
    private let modeColorMap: [String: Color]

    let correct = Color(red: 0.290, green: 0.780, blue: 0.529)
    let wrong = Color(red: 0.973, green: 0.443, blue: 0.443)

    func displayFont(size: CGFloat) -> Font {
        .custom(displayFontName, size: size)
    }

    func modeColor(_ modeId: String) -> Color {
        if let color = modeColorMap[modeId] { return color }
        // Deterministic fallback for modes the web theme doesn't list.
        let index = modeId.unicodeScalars.reduce(0) { $0 + Int($1.value) }
        return bubbleGradients[index % bubbleGradients.count][0]
    }

    // MARK: - The five themes

    static let all: [Theme] = [.softPlay, .mario, .zelda, .minecraft, .neon]

    static func named(_ id: String) -> Theme {
        all.first { $0.id == id } ?? .softPlay
    }

    static let softPlay = Theme(
        id: "default", label: "Soft Play", emoji: "🌈",
        themeDescription: "Pastel colors & friendly vibes",
        completeMsg: "Amazing!", isDark: false, displayFontName: "Fredoka-SemiBold",
        background: Color(hex: 0xFFFBEB), // amber-50
        cardBackground: Color.white.opacity(0.9),
        cardBorder: Color(hex: 0xE5E7EB), // gray-200
        textPrimary: Color(hex: 0x334155), // slate-700
        textSecondary: Color(hex: 0x64748B), // slate-500
        textMuted: Color(hex: 0x94A3B8), // slate-400
        heroGradient: [Color(hex: 0xEC4899), Color(hex: 0x8B5CF6), Color(hex: 0x0EA5E9)],
        ctaGradient: [Color(hex: 0xF472B6), Color(hex: 0xA78BFA)],
        progressTrack: .white,
        progressFill: [Color(hex: 0xFCD34D), Color(hex: 0xFB923C)],
        bubbleGradients: [
            [Color(hex: 0xF472B6), Color(hex: 0xEC4899)], // pink
            [Color(hex: 0x38BDF8), Color(hex: 0x0EA5E9)], // sky
            [Color(hex: 0xA3E635), Color(hex: 0x84CC16)], // lime
            [Color(hex: 0xA78BFA), Color(hex: 0x8B5CF6)], // violet
        ],
        modeColorMap: [
            "addition": Color(hex: 0xF472B6), "subtraction": Color(hex: 0x38BDF8),
            "multiplication": Color(hex: 0xA78BFA), "division": Color(hex: 0xFBBF24),
            "comparing": Color(hex: 0x2DD4BF), "counting": Color(hex: 0xFB923C),
            "skipCounting": Color(hex: 0x22D3EE), "placeValue": Color(hex: 0xFB7185),
            "placeValueDiscs": Color(hex: 0xFBBF24), "numberBonds": Color(hex: 0xA78BFA),
            "fractions": Color(hex: 0xF472B6), "decimals": Color(hex: 0x38BDF8),
            "barModels": Color(hex: 0x2DD4BF), "factorsMultiples": Color(hex: 0xA3E635),
            "areaPerimeter": Color(hex: 0x22D3EE), "money": Color(hex: 0x4ADE80),
            "patterns": Color(hex: 0xFB7185), "measurement": Color(hex: 0xFB923C),
            "time": Color(hex: 0xA78BFA), "dataGraphs": Color(hex: 0x38BDF8),
            "angles": Color(hex: 0x2DD4BF), "linesShapes": Color(hex: 0xF472B6),
        ]
    )

    static let mario = Theme(
        id: "mario", label: "Pixel Power", emoji: "🎮",
        themeDescription: "Retro arcade jumps & coin collecting!",
        completeMsg: "Level Up!", isDark: false, displayFontName: "PressStart2P-Regular",
        background: Color(hex: 0xE0F2FE), // sky-100
        cardBackground: Color.white.opacity(0.9),
        cardBorder: Color(hex: 0xFECACA), // red-200
        textPrimary: Color(hex: 0x991B1B), // red-800
        textSecondary: Color(hex: 0xDC2626), // red-600
        textMuted: Color(hex: 0xF87171), // red-400
        heroGradient: [Color(hex: 0xEF4444), Color(hex: 0xFACC15), Color(hex: 0x22C55E)],
        ctaGradient: [Color(hex: 0xEF4444), Color(hex: 0xDC2626)],
        progressTrack: Color(hex: 0xDCFCE7), // green-100
        progressFill: [Color(hex: 0x4ADE80), Color(hex: 0x22C55E)],
        bubbleGradients: [
            [Color(hex: 0xF87171), Color(hex: 0xEF4444)], // red
            [Color(hex: 0x4ADE80), Color(hex: 0x22C55E)], // green
            [Color(hex: 0xFACC15), Color(hex: 0xEAB308)], // yellow
            [Color(hex: 0x60A5FA), Color(hex: 0x3B82F6)], // blue
        ],
        modeColorMap: [
            "addition": Color(hex: 0xEF4444), "subtraction": Color(hex: 0x22C55E),
            "multiplication": Color(hex: 0xEAB308), "division": Color(hex: 0x3B82F6),
            "comparing": Color(hex: 0xF97316), "counting": Color(hex: 0xA855F7),
            "skipCounting": Color(hex: 0x06B6D4), "placeValue": Color(hex: 0xEC4899),
        ]
    )

    static let zelda = Theme(
        id: "zelda", label: "Adventure Quest", emoji: "⚔️",
        themeDescription: "Explore the math kingdom!",
        completeMsg: "Triforce Complete!", isDark: false, displayFontName: "MedievalSharp",
        background: Color(hex: 0xECFDF5), // emerald-50
        cardBackground: Color.white.opacity(0.85),
        cardBorder: Color(hex: 0xA7F3D0), // emerald-200
        textPrimary: Color(hex: 0x064E3B), // emerald-900
        textSecondary: Color(hex: 0x047857), // emerald-700
        textMuted: Color(hex: 0x10B981), // emerald-500
        heroGradient: [Color(hex: 0x10B981), Color(hex: 0x2DD4BF), Color(hex: 0xFACC15)],
        ctaGradient: [Color(hex: 0x10B981), Color(hex: 0x059669)],
        progressTrack: Color(hex: 0xFEF9C3), // yellow-100
        progressFill: [Color(hex: 0xFDE047), Color(hex: 0xFBBF24)],
        bubbleGradients: [
            [Color(hex: 0x34D399), Color(hex: 0x10B981)], // emerald
            [Color(hex: 0x2DD4BF), Color(hex: 0x14B8A6)], // teal
            [Color(hex: 0xFACC15), Color(hex: 0xF59E0B)], // yellow->amber
            [Color(hex: 0x38BDF8), Color(hex: 0x0EA5E9)], // sky
        ],
        modeColorMap: [
            "addition": Color(hex: 0x10B981), "subtraction": Color(hex: 0x14B8A6),
            "multiplication": Color(hex: 0xEAB308), "division": Color(hex: 0x0EA5E9),
            "comparing": Color(hex: 0xF59E0B), "counting": Color(hex: 0xF43F5E),
            "skipCounting": Color(hex: 0x06B6D4), "placeValue": Color(hex: 0x8B5CF6),
        ]
    )

    static let minecraft = Theme(
        id: "minecraft", label: "Block Builder", emoji: "⛏️",
        themeDescription: "Mine your way through math!",
        completeMsg: "Crafted It!", isDark: false, displayFontName: "Silkscreen-Regular",
        background: Color(hex: 0xF5F5F4), // stone-100
        cardBackground: Color(hex: 0xFAFAF9).opacity(0.9), // stone-50
        cardBorder: Color(hex: 0xD6D3D1), // stone-300
        textPrimary: Color(hex: 0x292524), // stone-800
        textSecondary: Color(hex: 0x57534E), // stone-600
        textMuted: Color(hex: 0x78716C), // stone-500
        heroGradient: [Color(hex: 0x84CC16), Color(hex: 0x10B981), Color(hex: 0x57534E)],
        ctaGradient: [Color(hex: 0x84CC16), Color(hex: 0x059669)],
        progressTrack: Color(hex: 0xECFCCB), // lime-100
        progressFill: [Color(hex: 0xA3E635), Color(hex: 0x10B981)],
        bubbleGradients: [
            [Color(hex: 0xA3E635), Color(hex: 0x84CC16)], // lime
            [Color(hex: 0xF59E0B), Color(hex: 0xD97706)], // amber
            [Color(hex: 0x22D3EE), Color(hex: 0x06B6D4)], // cyan
            [Color(hex: 0xA8A29E), Color(hex: 0x78716C)], // stone
        ],
        modeColorMap: [
            "addition": Color(hex: 0x84CC16), "subtraction": Color(hex: 0xF59E0B),
            "multiplication": Color(hex: 0x06B6D4), "division": Color(hex: 0x10B981),
            "comparing": Color(hex: 0xF97316), "counting": Color(hex: 0x0EA5E9),
            "skipCounting": Color(hex: 0x14B8A6), "placeValue": Color(hex: 0xF43F5E),
        ]
    )

    static let neon = Theme(
        id: "neonBeatHunters", label: "Neon Beat Hunters", emoji: "🎤",
        themeDescription: "Neon stage lights & monster-chasing beats!",
        completeMsg: "Encore Unleashed!", isDark: true, displayFontName: "Bungee-Regular",
        background: Color(hex: 0x1B0A38), // deep violet stage
        cardBackground: Color(hex: 0x2E1065).opacity(0.7), // violet-950
        cardBorder: Color(hex: 0xE879F9).opacity(0.5), // fuchsia-400
        textPrimary: Color(hex: 0xFDF4FF), // fuchsia-50
        textSecondary: Color(hex: 0xA5F3FC), // cyan-200
        textMuted: Color(hex: 0xF0ABFC).opacity(0.8), // fuchsia-300
        heroGradient: [Color(hex: 0xE879F9), Color(hex: 0xF9A8D4), Color(hex: 0x67E8F9)],
        ctaGradient: [Color(hex: 0xD946EF), Color(hex: 0xEC4899), Color(hex: 0x22D3EE)],
        progressTrack: Color(hex: 0x2E1065).opacity(0.8),
        progressFill: [Color(hex: 0xD946EF), Color(hex: 0xF472B6), Color(hex: 0x22D3EE)],
        bubbleGradients: [
            [Color(hex: 0xD946EF), Color(hex: 0xEC4899), Color(hex: 0xFB7185)],
            [Color(hex: 0x8B5CF6), Color(hex: 0xA855F7), Color(hex: 0x818CF8)],
            [Color(hex: 0x22D3EE), Color(hex: 0x38BDF8), Color(hex: 0x3B82F6)],
            [Color(hex: 0xEC4899), Color(hex: 0xD946EF), Color(hex: 0xA855F7)],
        ],
        modeColorMap: [
            "addition": Color(hex: 0xD946EF), "subtraction": Color(hex: 0x22D3EE),
            "multiplication": Color(hex: 0x8B5CF6), "division": Color(hex: 0x6366F1),
            "comparing": Color(hex: 0xF43F5E), "counting": Color(hex: 0xA855F7),
            "skipCounting": Color(hex: 0x2DD4BF), "placeValue": Color(hex: 0xEC4899),
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
    @Entry var theme = Theme.softPlay
}
