import SwiftUI

/// Worksheet builder: pick a mode, difficulty, and size; generate a printable
/// set through the shared engine (generateWorksheetSet — the same generator
/// the web's PrintableWorksheet uses) and share it as a PDF (AirPrint, Files,
/// Mail all come free with the share sheet — the native replacement for the
/// web's window.print()).
struct WorksheetView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    // The web's LEVEL_GROUPS: Beginner 1-3, Intermediate 4-6, Advanced 7-10.
    private static let difficulties: [(label: String, level: Int)] = [
        ("Beginner", 2), ("Intermediate", 5), ("Advanced", 8),
    ]

    @State private var modeId = "addition"
    @State private var difficultyIndex = 0
    @State private var count = 10
    @State private var includeAnswerKey = true
    @State private var problems: [[String: Any]] = []
    @State private var pdfURL: URL?
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            List {
                Section("Worksheet") {
                    Picker("Mode", selection: $modeId) {
                        ForEach(ModeCatalog.allModes) { mode in
                            Text("\(mode.emoji) \(mode.label)").tag(mode.id)
                        }
                    }
                    Picker("Difficulty", selection: $difficultyIndex) {
                        ForEach(Self.difficulties.indices, id: \.self) { index in
                            Text(Self.difficulties[index].label).tag(index)
                        }
                    }
                    .pickerStyle(.segmented)
                    Picker("Problems", selection: $count) {
                        Text("10").tag(10)
                        Text("20").tag(20)
                        Text("30").tag(30)
                    }
                    .pickerStyle(.segmented)
                    Toggle("Include answer key", isOn: $includeAnswerKey)
                }

                Section {
                    Button {
                        generate()
                    } label: {
                        Label("Generate worksheet", systemImage: "wand.and.stars")
                            .font(.headline)
                    }
                    if let pdfURL {
                        ShareLink(item: pdfURL) {
                            Label("Share / Print PDF", systemImage: "printer.fill")
                                .font(.headline)
                        }
                    }
                    if !errorMessage.isEmpty {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }
                }

                if !problems.isEmpty {
                    Section("Preview") {
                        ForEach(Array(problems.prefix(6).enumerated()), id: \.offset) { index, problem in
                            HStack(alignment: .top, spacing: 8) {
                                Text("\(index + 1).").foregroundStyle(theme.textMuted)
                                WorksheetProblemText(
                                    question: problem,
                                    showAnswer: false,
                                    ink: .primary,
                                    answerColor: .green
                                )
                            }
                        }
                        if problems.count > 6 {
                            Text("… and \(problems.count - 6) more on the PDF")
                                .font(.footnote)
                                .foregroundStyle(theme.textMuted)
                        }
                    }
                }
            }
            .navigationTitle("Worksheets")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func generate() {
        guard let engine = app.engine else { return }
        errorMessage = ""
        pdfURL = nil
        do {
            let level = Self.difficulties[difficultyIndex].level
            problems = try engine.generateWorksheetSet(
                mode: modeId, level: level, size: count,
                options: ["allowWordProblems": difficultyIndex > 0]
            )
            let label = ModeCatalog.mode(modeId)?.label.replacingOccurrences(of: "!", with: "") ?? modeId
            pdfURL = WorksheetPDF.render(modeLabel: label, problems: problems, includeAnswerKey: includeAnswerKey)
            if pdfURL == nil { errorMessage = "Could not render the PDF." }
        } catch {
            errorMessage = "\(error)"
            problems = []
        }
    }
}
