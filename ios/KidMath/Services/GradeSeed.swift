import Foundation

/// Grade → starting level for a never-played mode. Mirrors `src/gradeSeed.js`
/// exactly (the JS version is also exposed on the engine as
/// `KidMath.startingLevelFor` for the parity test): a kid at or below a mode's
/// first grade starts at 1; each grade above adds three levels, capped below
/// the mode's top band (7 on a 10-level ladder, 9 on a 12-level one).
enum GradeSeed {
    static let maxSeededLevel = 7
    private static let levelsPerGrade = 3

    /// Mirror of src/modeLevels.js — the Grade-5 modes run to level 12.
    static let modeMaxLevels: [String: Int] = [
        "fractionOps": 12, "decimalOps": 12, "volumeCoordinates": 12,
    ]

    static func maxLevel(mode: String) -> Int {
        modeMaxLevels[mode] ?? 10
    }

    static func maxSeededLevel(mode: String) -> Int {
        maxLevel(mode: mode) - 3
    }

    /// Same table as `src/engagement/gradeSpans.js` — keep in sync.
    static let gradeSpans: [String: String] = [
        "counting": "K–1",
        "comparing": "K–2",
        "numberBonds": "K–2",
        "skipCounting": "K–2",
        "addition": "K–2",
        "subtraction": "K–2",
        "placeValue": "1–2",
        "placeValueDiscs": "1–4",
        "time": "1–3",
        "money": "1–4",
        "measurement": "K–4",
        "patterns": "K–4",
        "linesShapes": "K–4",
        "dataGraphs": "1–4",
        "barModels": "2–4",
        "multiplication": "2–4",
        "fractions": "2–4",
        "division": "3–4",
        "areaPerimeter": "3–4",
        "decimals": "4",
        "factorsMultiples": "4",
        "angles": "4",
        "fractionOps": "4–5",
        "decimalOps": "4–5",
        "volumeCoordinates": "5",
    ]

    /// "K" → 0, "1st" → 1 … "6th" → 6; nil when unknown.
    static func gradeIndex(_ grade: String?) -> Int? {
        guard let grade else { return nil }
        let s = grade.trimmingCharacters(in: .whitespaces).uppercased()
        if s == "K" || s == "0" { return 0 }
        let digits = s.prefix { $0.isNumber }
        guard let n = Int(digits), (1...6).contains(n) else { return nil }
        return n
    }

    static func parseSpan(_ span: String?) -> (Int, Int) {
        let parts = (span ?? "")
            .components(separatedBy: CharacterSet(charactersIn: "–-"))
            .map { gradeIndex($0) }
        guard let first = parts.first ?? nil else { return (0, 6) }
        let second = parts.count > 1 ? (parts[1] ?? first) : first
        return (first, second)
    }

    static func startingLevel(mode: String, grade: String?) -> Int {
        guard let g = gradeIndex(grade) else { return 1 }
        let (start, end) = parseSpan(gradeSpans[mode])
        let effective = min(g, end)
        if effective <= start { return 1 }
        return min(maxSeededLevel(mode: mode), 1 + levelsPerGrade * (effective - start))
    }

    /// "in" | "below" | "above" — the mode's relationship to the kid's grade
    /// (src/gradeSeed.js gradeFitFor). Unknown grade → "in".
    static func gradeFit(mode: String, grade: String?) -> String {
        guard let g = gradeIndex(grade) else { return "in" }
        let (start, end) = parseSpan(gradeSpans[mode])
        if g < start { return "above" }
        if g > end { return "below" }
        return "in"
    }

    /// "Grade 3" / "Kindergarten" for a level on a mode's ladder
    /// (gradeWorkForLevel): the span stretched across the seeded ladder + 3.
    static func gradeWork(mode: String, level: Int) -> String {
        let (start, end) = parseSpan(gradeSpans[mode])
        let maxL = maxSeededLevel(mode: mode) + 3
        let clamped = max(1, min(maxL, level))
        let g = start + Int((Double(clamped - 1) / Double(max(1, maxL - 1)) * Double(end - start)).rounded())
        return g == 0 ? "Kindergarten" : "Grade \(g)"
    }

    /// Order the topic groups for a kid (HomePage.jsx groupsForGrade): groups
    /// with at least one in-grade mode first, then outgrown groups, and
    /// groups entirely above the kid folded away. Unknown grade → as authored.
    static func groupsForGrade(_ grade: String?, groups: [ModeGroup] = ModeCatalog.groups) -> (main: [ModeGroup], more: [ModeGroup]) {
        guard gradeIndex(grade) != nil else { return (groups, []) }
        func rank(_ g: ModeGroup) -> Int {
            let fits = g.modes.map { gradeFit(mode: $0.id, grade: grade) }
            if fits.contains("in") { return 0 }
            return fits.allSatisfy { $0 == "above" } ? 2 : 1
        }
        let ranked = groups.enumerated().map { (g: $0.element, i: $0.offset, rank: rank($0.element)) }
            .sorted { $0.rank != $1.rank ? $0.rank < $1.rank : $0.i < $1.i }
        return (ranked.filter { $0.rank < 2 }.map(\.g), ranked.filter { $0.rank == 2 }.map(\.g))
    }

    /// Quick Start (HomePage.jsx quickStartFor): the in-grade playable mode
    /// with the lowest level — the most room to grow.
    static func quickStart(grade: String?, levels: [String: Int], groups: [ModeGroup] = ModeCatalog.groups) -> String? {
        guard gradeIndex(grade) != nil else { return nil }
        let inGrade = groups.flatMap(\.modes).filter { $0.playable && gradeFit(mode: $0.id, grade: grade) == "in" }
        return inGrade.map { ($0.id, levels[$0.id] ?? 1) }.min { $0.1 < $1.1 }?.0
    }
}
