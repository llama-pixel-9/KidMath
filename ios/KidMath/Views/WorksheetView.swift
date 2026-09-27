import SwiftUI

/// Worksheets — port of PrintableWorksheet.jsx over the shared skill catalog
/// (src/worksheets/). A parent picks a grade, then one of that grade's topics
/// (plain names: Multiplication, Fractions, Decimals…), then one of the
/// topic's skills (plain titles — no standard codes), then the
/// problem type, sheet count and answer key, and shares the PDF (AirPrint,
/// Files, Mail come free with the share sheet — the native replacement for
/// window.print()). There is no game picker and no "Level": the skill's
/// title is a promise about every problem on the sheet, and the engine keeps it.
///
/// Worded problems come from the item bank, so a skill's topic is loaded when
/// it is picked; what the loaded bank cannot fill is switched off, with the
/// reason — never padded with generated filler.
struct WorksheetView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    /// This screen's own memory. It READS the household word-problem
    /// preference (src/userPreferences.js, same key) as a default but never
    /// writes it: printing a drill must not switch word problems off in play.
    static let allowWordProblemsKey = "kidmath-allow-word-problems"
    static let gradeKey = "larkit-worksheet-grade"
    static let problemTypeKey = "larkit-worksheet-problem-type"

    struct Skill: Identifiable, Equatable {
        let id: String
        let grade: String
        let mode: String
        let title: String
        let computation: Bool
        let header: String
        let documentTitle: String
    }

    private static let problemTypes = ["practice", "stories", "mixed"]
    private static let sheetCounts = [1, 2, 3, 5]

    @State private var catalog: [String: Any] = [:]
    @State private var skills: [Skill] = []
    @State private var grade = UserDefaults.standard.string(forKey: WorksheetView.gradeKey) ?? ""
    @State private var topicMode = ""
    @State private var skill: Skill?
    @State private var problemType = WorksheetView.initialProblemType()
    @State private var sheetCount = 1
    @State private var answerKey = true
    @State private var capacity: [String: Int]?
    @State private var loading = false
    @State private var sheets: [WorksheetPDF.Sheet] = []
    @State private var pdfURL: URL?
    @State private var errorMessage = ""

    private static func initialProblemType() -> String {
        let defaults = UserDefaults.standard
        if let last = defaults.string(forKey: problemTypeKey), problemTypes.contains(last) { return last }
        return defaults.bool(forKey: allowWordProblemsKey) ? "mixed" : "practice"
    }

    private var grades: [String] { catalog["grades"] as? [String] ?? [] }
    private var topicLabels: [String: String] { catalog["topicLabels"] as? [String: String] ?? [:] }
    private var gradeLabels: [String: String] { catalog["gradeLabels"] as? [String: String] ?? [:] }

    /// The picked grade's skills, grouped by topic in home-screen order.
    private var topics: [(mode: String, skills: [Skill])] {
        let inGrade = skills.filter { $0.grade == grade }
        return (catalog["topicOrder"] as? [String] ?? []).compactMap { mode in
            let rows = inGrade.filter { $0.mode == mode }
            return rows.isEmpty ? nil : (mode, rows)
        }
    }

    /// A remembered "Word problems" choice must not strand a skill that has none.
    private var activeType: String {
        guard let capacity, (capacity[problemType] ?? 0) == 0, (capacity["practice"] ?? 0) > 0 else { return problemType }
        return "practice"
    }
    private var maxSheets: Int { capacity?[activeType] ?? Int.max }
    private var activeCount: Int { max(1, min(sheetCount, maxSheets)) }
    private var blocked: String? {
        guard let capacity, (capacity[activeType] ?? 0) == 0 else { return nil }
        return "Couldn't load this topic's problems. Sign in and check your connection."
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Print a Worksheet")
                        .font(theme.displayFont(size: 34))
                        .foregroundStyle(Theme.ink)
                    Text("Pick a grade, a topic, then the skill to practice. One sheet, one skill — the answer key prints as its own sheet.")
                        .font(theme.bodyFont(size: 17, weight: .semibold))
                        .foregroundStyle(Theme.ink.opacity(0.7))
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, 8)

                    card.padding(.top, 28)

                    if let first = sheets.first, let skill {
                        preview(first, skill: skill).padding(.top, 20)
                    }
                }
                .frame(maxWidth: 720, alignment: .leading)
                .padding(.horizontal, 24)
                .padding(.vertical, 24)
                .frame(maxWidth: .infinity)
            }
            .background(GraphPaperBackground())
            .navigationTitle("Worksheets")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
            .onAppear(perform: loadCatalog)
        }
    }

    // MARK: - The picker card (the web's PrintableWorksheet, in the 2a style)

    private var card: some View {
        VStack(alignment: .leading, spacing: 28) {
            field("Grade") {
                pillRow(grades, selected: grade, label: { $0 }, columns: 6) { value in
                    grade = value
                    UserDefaults.standard.set(value, forKey: Self.gradeKey)
                    if skill?.grade != value { pick(nil) }
                    // Keep the topic when the new grade has it too.
                    if !topics.contains(where: { $0.mode == topicMode }) { topicMode = "" }
                }
            }

            field("Topic") {
                if grade.isEmpty {
                    hint("Pick a grade to see its topics.")
                } else {
                    pillRow(topics.map(\.mode), selected: topicMode, label: { topicLabels[$0] ?? $0 }, columns: 3) { mode in
                        topicMode = mode
                        if skill?.mode != mode { pick(nil) }
                    }
                }
            }

            field("Skill") {
                if let topic = topics.first(where: { $0.mode == topicMode }) {
                    VStack(spacing: 10) {
                        ForEach(topic.skills) { row in
                            let on = row == skill
                            Button { pick(row) } label: {
                                HStack(spacing: 12) {
                                    Circle()
                                        .stroke(on ? Theme.teal : Theme.ink.opacity(0.25), lineWidth: 2)
                                        .background(Circle().fill(on ? Theme.teal : .clear).padding(4))
                                        .frame(width: 22, height: 22)
                                    Text(row.title)
                                        .font(theme.bodyFont(size: 17, weight: .bold))
                                        .foregroundStyle(on ? Theme.teal : Theme.ink)
                                        .multilineTextAlignment(.leading)
                                        .fixedSize(horizontal: false, vertical: true)
                                    Spacer(minLength: 0)
                                }
                                .padding(.horizontal, 18)
                                .frame(minHeight: 56)
                                .background(RoundedRectangle(cornerRadius: 16).fill(on ? Theme.seafoam.opacity(0.3) : .white))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(on ? Theme.teal : Theme.ink.opacity(0.1), lineWidth: on ? 2 : 1.5))
                            }
                            .buttonStyle(.plain)
                            .accessibilityAddTraits(on ? .isSelected : [])
                        }
                    }
                } else {
                    hint("Pick a topic to see its skills.")
                }
            }

            field("Problems") {
                pillRow(Self.problemTypes, selected: problemType, label: { type in
                    switch type {
                    case "stories": return "Word problems"
                    case "mixed": return "Mixed"
                    default: return skill?.computation == true ? "Computation" : "Practice"
                    }
                }, columns: 3, disabled: { type in
                    guard let capacity, type != "practice" else { return false }
                    return (capacity[type] ?? 0) == 0
                }) { value in
                    problemType = value
                    UserDefaults.standard.set(value, forKey: Self.problemTypeKey)
                    pdfURL = nil
                }
                if let capacity, (capacity["stories"] ?? 0) == 0 || (capacity["mixed"] ?? 0) == 0, (capacity["practice"] ?? 0) > 0 {
                    hint("There are not enough word problems for this skill yet.")
                }
            }

            field("Number of sheets") {
                pillRow(Self.sheetCounts.filter { $0 == 1 || $0 <= maxSheets }, selected: activeCount, label: { "\($0)" }, columns: 4) { value in
                    sheetCount = value
                    pdfURL = nil
                }
            }

            HStack {
                Text("INCLUDE ANSWER KEY")
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .tracking(0.8)
                    .foregroundStyle(Theme.ink.opacity(0.7))
                Spacer()
                Toggle("", isOn: $answerKey).labelsHidden().tint(Theme.teal)
                    .onChange(of: answerKey) { _, _ in pdfURL = nil }
            }

            VStack(spacing: 12) {
                Button { generate() } label: {
                    Text(ctaLabel)
                        .font(theme.displayFont(size: 20))
                        .foregroundStyle(Theme.cream)
                        .frame(maxWidth: .infinity)
                        .frame(height: 64)
                        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal).shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 5))
                        .opacity(ctaEnabled ? 1 : 0.45)
                }
                .buttonStyle(SpringButtonStyle())
                .disabled(!ctaEnabled)

                if let pdfURL {
                    ShareLink(item: pdfURL) {
                        HStack(spacing: 10) {
                            FeatherIcon(glyph: .print, size: 20, color: Theme.ink)
                            Text("Share / Print PDF").font(theme.displayFont(size: 18)).foregroundStyle(Theme.ink)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(RoundedRectangle(cornerRadius: 16).fill(.white))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink.opacity(0.12), lineWidth: 1.5))
                    }
                }
                if let blocked { Text(blocked).font(theme.bodyFont(size: 14, weight: .bold)).foregroundStyle(Theme.ember) }
                if !errorMessage.isEmpty { Text(errorMessage).font(theme.bodyFont(size: 14, weight: .bold)).foregroundStyle(Theme.ember) }
            }
        }
        .padding(28)
        .background(RoundedRectangle(cornerRadius: 28).fill(.white).shadow(color: Theme.ink.opacity(0.06), radius: 0, y: 5))
    }

    /// The button says what is still missing, as the web's does.
    private var ctaLabel: String {
        if grade.isEmpty { return "Pick a grade" }
        if topicMode.isEmpty { return "Pick a topic" }
        if skill == nil { return "Pick a skill" }
        if loading { return "Loading…" }
        return "Build the worksheet"
    }
    private var ctaEnabled: Bool { skill != nil && !loading && blocked == nil }

    private func field<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title.uppercased())
                .font(theme.bodyFont(size: 14, weight: .bold))
                .tracking(0.8)
                .foregroundStyle(Theme.ink.opacity(0.7))
            content()
        }
    }

    private func hint(_ text: String) -> some View {
        Text(text).font(theme.bodyFont(size: 16, weight: .semibold)).foregroundStyle(Theme.ink.opacity(0.45))
    }

    /// A grid of pill choices; the selected one is Seafoam with a teal ring.
    private func pillRow<T: Hashable>(_ options: [T], selected: T, label: @escaping (T) -> String, columns: Int, disabled: @escaping (T) -> Bool = { _ in false }, onPick: @escaping (T) -> Void) -> some View {
        let grid = Array(repeating: GridItem(.flexible(), spacing: 12), count: columns)
        return LazyVGrid(columns: grid, spacing: 12) {
            ForEach(options, id: \.self) { option in
                let on = option == selected
                let off = disabled(option)
                Button { onPick(option) } label: {
                    Text(label(option))
                        .font(theme.bodyFont(size: 17, weight: .bold))
                        .foregroundStyle(on ? Theme.teal : Theme.ink.opacity(off ? 0.35 : 0.8))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 10)
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .background(RoundedRectangle(cornerRadius: 16).fill(on ? Theme.seafoam.opacity(0.3) : .white))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(on ? Theme.teal : Theme.ink.opacity(0.12), lineWidth: on ? 2 : 1.5))
                }
                .buttonStyle(.plain)
                .disabled(off)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }

    private func preview(_ first: WorksheetPDF.Sheet, skill: Skill) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("PREVIEW")
                .font(theme.bodyFont(size: 14, weight: .bold)).tracking(0.8).foregroundStyle(Theme.ink.opacity(0.7))
            Text("\(skill.header) — \(first.itemCount) problems\(sheets.count > 1 ? " per sheet × \(sheets.count)" : "")\(answerKey ? " + answer key" : "")")
                .font(theme.bodyFont(size: 14, weight: .semibold)).foregroundStyle(Theme.ink.opacity(0.6))
            ForEach(Array(previewQuestions(first).prefix(6).enumerated()), id: \.offset) { index, q in
                HStack(alignment: .top, spacing: 8) {
                    Text("\(index + 1).").foregroundStyle(Theme.ink.opacity(0.5))
                    Text(previewLine(q)).foregroundStyle(Theme.ink)
                }
                .font(theme.bodyFont(size: 16, weight: .semibold))
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 24).fill(.white))
    }

    private func loadCatalog() {
        guard skills.isEmpty, let engine = app.engine, let raw = try? engine.worksheetCatalog() else { return }
        catalog = raw
        // Only topics this app can play: their figures are the ones it can draw.
        let playable = Set(ModeCatalog.allModes.filter(\.playable).map(\.id))
        skills = (raw["skills"] as? [[String: Any]] ?? []).compactMap { row in
            guard let id = row["id"] as? String, let grade = row["grade"] as? String, let mode = row["mode"] as? String,
                  let title = row["title"] as? String, playable.contains(mode) else { return nil }
            return Skill(id: id, grade: grade, mode: mode, title: title,
                         computation: (row["computation"] as? Bool) == true,
                         header: row["header"] as? String ?? title,
                         documentTitle: row["documentTitle"] as? String ?? title)
        }
        // The active kid's grade when there is one, else the last grade printed for.
        if let kid = Self.catalogGrade(app.kidProfiles.activeKidGrade), grades.contains(kid) { grade = kid }
    }

    /// "K" | "1st" … "6th" (KidProfile.grade) → the catalog's "K" | "1" … "5".
    private static func catalogGrade(_ kidGrade: String?) -> String? {
        guard let kidGrade else { return nil }
        if kidGrade.uppercased() == "K" { return "K" }
        guard let n = Int(kidGrade.prefix { $0.isNumber }), n >= 1 else { return nil }
        return String(min(n, 5))
    }

    /// Picking a skill loads its topic's bank, then asks the engine what that
    /// bank can fill.
    private func pick(_ next: Skill?) {
        skill = next
        sheets = []
        pdfURL = nil
        capacity = nil
        errorMessage = ""
        guard let next, let engine = app.engine else { return }
        loading = true
        Task {
            await app.bankService?.ensureModeLoaded(next.mode)
            guard skill == next else { return }
            capacity = engine.worksheetCapacity(skillId: next.id)
            loading = false
        }
    }

    private func previewQuestions(_ sheet: WorksheetPDF.Sheet) -> [[String: Any]] {
        sheet.items + sheet.wordProblems.compactMap { $0["question"] as? [String: Any] }
    }

    private func previewLine(_ q: [String: Any]) -> String {
        let display = q["display"] as? [String: Any] ?? [:]
        if let prompt = display["promptText"] as? String { return prompt }
        if let a = q["a"], let op = q["op"] as? String, let b = q["b"] {
            let sym = ["+": "+", "-": "−", "x": "×", "/": "÷"][op] ?? op
            return "\(AnswerFormatting.text(a)) \(sym) \(AnswerFormatting.text(b)) = ☐"
        }
        if let seq = display["sequence"] as? [Any] { return seq.map { AnswerFormatting.text($0) }.joined(separator: ", ") + ", …" }
        return ""
    }

    private func generate() {
        guard let engine = app.engine, let skill else { return }
        errorMessage = ""
        pdfURL = nil
        do {
            let run = try engine.generateWorksheetRun(skillId: skill.id, problemType: activeType, sheets: activeCount)
            let footer = "\(topicLabels[skill.mode] ?? skill.mode) · \(gradeLabels[skill.grade] ?? skill.grade)"
            sheets = run.map {
                WorksheetPDF.Sheet(header: skill.header, footer: footer,
                                   layouts: catalog["layouts"] as? [String: Any] ?? [:],
                                   storyWorkSpace: CGFloat((catalog["storyWorkSpace"] as? NSNumber)?.doubleValue ?? 0),
                                   payload: $0)
            }
            pdfURL = WorksheetPDF.render(sheets: sheets, engine: engine, answerKey: answerKey, fileName: skill.documentTitle)
            if pdfURL == nil { errorMessage = "Could not render the PDF." }
        } catch {
            errorMessage = "\(error)"
            sheets = []
        }
    }
}
