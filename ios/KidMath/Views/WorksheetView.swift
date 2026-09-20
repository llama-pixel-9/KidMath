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
            List {
                Section("Grade") {
                    Picker("Grade", selection: $grade) {
                        ForEach(grades, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: grade) { _, value in
                        UserDefaults.standard.set(value, forKey: Self.gradeKey)
                        if skill?.grade != value { pick(nil) }
                        // Keep the topic when the new grade has it too.
                        if !topics.contains(where: { $0.mode == topicMode }) { topicMode = "" }
                    }
                }

                if grade.isEmpty {
                    Section { Text("Pick a grade to see its topics.").foregroundStyle(theme.textMuted) }
                } else {
                    Section("Topic") {
                        ForEach(topics, id: \.mode) { topic in
                            Button {
                                topicMode = topic.mode
                                if skill?.mode != topic.mode { pick(nil) }
                            } label: {
                                HStack {
                                    Text(topicLabels[topic.mode] ?? topic.mode).font(.subheadline.weight(.semibold))
                                        .foregroundStyle(topic.mode == topicMode ? Theme.teal : Theme.ink)
                                    Spacer()
                                    if topic.mode == topicMode { Image(systemName: "checkmark").foregroundStyle(Theme.teal) }
                                }
                            }
                            .buttonStyle(.plain)
                            .accessibilityAddTraits(topic.mode == topicMode ? .isSelected : [])
                        }
                    }
                }
                if let topic = topics.first(where: { $0.mode == topicMode }) {
                    Section("Skill") {
                        ForEach(topic.skills) { row in
                            Button { pick(row) } label: {
                                HStack(alignment: .top, spacing: 10) {
                                    Image(systemName: row == skill ? "largecircle.fill.circle" : "circle")
                                        .foregroundStyle(row == skill ? Theme.teal : theme.textMuted)
                                    Text(row.title).font(.subheadline.weight(.semibold))
                                        .foregroundStyle(row == skill ? Theme.teal : Theme.ink)
                                        .multilineTextAlignment(.leading)
                                }
                            }
                            .buttonStyle(.plain)
                            .accessibilityAddTraits(row == skill ? .isSelected : [])
                        }
                    }
                }

                if skill != nil {
                    Section("Problems") {
                        Picker("Problems", selection: $problemType) {
                            Text(skill?.computation == true ? "Computation" : "Practice").tag("practice")
                            Text("Word problems").tag("stories")
                            Text("Mixed").tag("mixed")
                        }
                        .pickerStyle(.segmented)
                        .onChange(of: problemType) { _, value in
                            UserDefaults.standard.set(value, forKey: Self.problemTypeKey)
                            pdfURL = nil
                        }
                        if let capacity, (capacity["stories"] ?? 0) == 0 || (capacity["mixed"] ?? 0) == 0, (capacity["practice"] ?? 0) > 0 {
                            Text("There are not enough word problems for this skill yet.")
                                .font(.caption).foregroundStyle(theme.textMuted)
                        }
                        Picker("Sheets", selection: $sheetCount) {
                            ForEach(Self.sheetCounts.filter { $0 == 1 || $0 <= maxSheets }, id: \.self) { Text("\($0)").tag($0) }
                        }
                        .pickerStyle(.segmented)
                        .onChange(of: sheetCount) { _, _ in pdfURL = nil }
                        Toggle("Include answer key", isOn: $answerKey)
                            .onChange(of: answerKey) { _, _ in pdfURL = nil }
                    }

                    Section {
                        Button { generate() } label: {
                            Label(loading ? "Loading…" : "Build the worksheet", systemImage: "wand.and.stars").font(.headline)
                        }
                        .disabled(loading || blocked != nil)
                        if let pdfURL {
                            ShareLink(item: pdfURL) {
                                Label { Text("Share / Print PDF") } icon: { FeatherIcon(glyph: .print, size: 20, color: Theme.cream) }
                                    .font(.headline)
                            }
                        }
                        if let blocked { Text(blocked).font(.footnote).foregroundStyle(.red) }
                        if !errorMessage.isEmpty { Text(errorMessage).font(.footnote).foregroundStyle(.red) }
                    }
                }

                if let first = sheets.first, let skill {
                    Section("Preview") {
                        Text("\(skill.header) — \(first.itemCount) problems\(sheets.count > 1 ? " per sheet × \(sheets.count)" : "")\(answerKey ? " + answer key" : "")")
                            .font(.footnote).foregroundStyle(theme.textMuted)
                        ForEach(Array(previewQuestions(first).prefix(6).enumerated()), id: \.offset) { index, q in
                            HStack(alignment: .top, spacing: 8) {
                                Text("\(index + 1).").foregroundStyle(theme.textMuted)
                                Text(previewLine(q)).font(.system(size: 16, weight: .semibold))
                            }
                        }
                    }
                }
            }
            .navigationTitle("Worksheets")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
            .onAppear(perform: loadCatalog)
        }
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
