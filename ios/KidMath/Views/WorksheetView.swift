import SwiftUI

/// Flight logs (printable worksheets) — port of PrintableWorksheet.jsx over
/// the shared generateFlightLog draw: pick a game and a level (grouped
/// Beginner 1–3 / Intermediate 4–6 / Advanced 7+), one to three logs, word
/// problems only when the parent allows them (the web's
/// `kidmath-allow-word-problems` preference, same key), then share the PDF
/// (AirPrint, Files, Mail come free with the share sheet — the native
/// replacement for window.print()). The answer key always prints as its own
/// sheet after the logs, as on the web.
struct WorksheetView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    /// Mirrors src/userPreferences.js — same key, same default (off).
    static let allowWordProblemsKey = "kidmath-allow-word-problems"

    @State private var modeId = "addition"
    @State private var level = 2
    @State private var sheetCount = 1
    @State private var allowWordProblems = UserDefaults.standard.object(forKey: WorksheetView.allowWordProblemsKey).map { _ in UserDefaults.standard.bool(forKey: WorksheetView.allowWordProblemsKey) } ?? false
    @State private var logs: [FlightLogPDF.Log] = []
    @State private var pdfURL: URL?
    @State private var errorMessage = ""
    @State private var rendering = false

    private var mode: ModeInfo? { ModeCatalog.mode(modeId) }
    private var maxLevel: Int { GradeSeed.maxLevel(mode: modeId) }

    /// The web's LEVEL_GROUPS: Beginner 1–3, Intermediate 4–6, Advanced 7–max.
    private var levelGroups: [(label: String, levels: [Int])] {
        [("Beginner", Array(1...3)), ("Intermediate", Array(4...6)), ("Advanced", Array(7...max(7, maxLevel)))]
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Flight log") {
                    Picker("Game", selection: $modeId) {
                        ForEach(ModeCatalog.allModes.filter(\.playable)) { mode in
                            Text("\(mode.emoji) \(mode.label)").tag(mode.id)
                        }
                    }
                    .onChange(of: modeId) { _, _ in level = min(level, maxLevel); pdfURL = nil }
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Level").font(.subheadline.weight(.semibold))
                        ForEach(levelGroups, id: \.label) { group in
                            HStack(spacing: 6) {
                                Text(group.label).font(.caption.weight(.bold)).foregroundStyle(theme.textMuted).frame(width: 88, alignment: .leading)
                                ForEach(group.levels, id: \.self) { n in
                                    let selected = n == level
                                    Button("\(n)") { level = n; pdfURL = nil }
                                        .font(.subheadline.weight(.bold))
                                        .foregroundStyle(selected ? Theme.cream : Theme.ink)
                                        .frame(width: 36, height: 32)
                                        .background(RoundedRectangle(cornerRadius: 9).fill(selected ? Theme.teal : Color.white))
                                        .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.ink.opacity(selected ? 0 : 0.12), lineWidth: 1.5))
                                        .buttonStyle(.plain)
                                }
                            }
                        }
                        Text("Level \(level): \(app.engine?.flightLogScope(mode: modeId, level: level) ?? "")")
                            .font(.caption).foregroundStyle(theme.textMuted)
                    }
                    .padding(.vertical, 4)
                    Picker("Logs", selection: $sheetCount) {
                        Text("1").tag(1)
                        Text("2").tag(2)
                        Text("3").tag(3)
                    }
                    .pickerStyle(.segmented)
                    Toggle("Include word problems", isOn: $allowWordProblems)
                        .onChange(of: allowWordProblems) { _, value in
                            UserDefaults.standard.set(value, forKey: Self.allowWordProblemsKey)
                            pdfURL = nil
                        }
                }

                Section {
                    Button {
                        generate()
                    } label: {
                        Label(rendering ? "Building…" : "Build the flight log", systemImage: "wand.and.stars").font(.headline)
                    }
                    .disabled(rendering)
                    if let pdfURL {
                        ShareLink(item: pdfURL) {
                            Label { Text("Share / Print PDF") } icon: { FeatherIcon(glyph: .print, size: 20, color: Theme.cream) }
                                .font(.headline)
                        }
                    }
                    if !errorMessage.isEmpty {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }
                }

                if let first = logs.first {
                    Section("Preview") {
                        Text("\(first.mode.label) · Level \(first.level) · \(first.scope) — \(first.itemCount) items\(logs.count > 1 ? " per log × \(logs.count)" : "") + answer key")
                            .font(.footnote).foregroundStyle(theme.textMuted)
                        ForEach(Array((first.partA + first.partB).prefix(6).enumerated()), id: \.offset) { index, q in
                            HStack(alignment: .top, spacing: 8) {
                                Text("\(index + 1).").foregroundStyle(theme.textMuted)
                                Text(previewLine(q)).font(.system(size: 16, weight: .semibold))
                            }
                        }
                    }
                }
            }
            .navigationTitle("Flight logs")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
        }
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
        guard let engine = app.engine, let mode else { return }
        errorMessage = ""
        pdfURL = nil
        rendering = true
        defer { rendering = false }
        do {
            let scope = engine.flightLogScope(mode: modeId, level: level)
            logs = try (0..<sheetCount).map { _ in
                FlightLogPDF.Log(mode: mode, level: level, scope: scope,
                                 payload: try engine.generateFlightLog(mode: modeId, level: level, allowWordProblems: allowWordProblems))
            }
            pdfURL = FlightLogPDF.render(logs: logs, engine: engine)
            if pdfURL == nil { errorMessage = "Could not render the PDF." }
        } catch {
            errorMessage = "\(error)"
            logs = []
        }
    }
}
