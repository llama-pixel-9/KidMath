import Foundation

/// Grade → starting level for a never-played mode. Mirrors `src/gradeSeed.js`
/// exactly (the JS version is also exposed on the engine as
/// `KidMath.startingLevelFor` for the parity test): a kid at or below a mode's
/// first grade starts at 1; each grade above adds three levels, capped at 7.
enum GradeSeed {
    static let maxSeededLevel = 7
    private static let levelsPerGrade = 3

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
        return min(maxSeededLevel, 1 + levelsPerGrade * (effective - start))
    }
}
