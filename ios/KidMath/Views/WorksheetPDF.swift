import SwiftUI

/// Printable worksheet rendering — port of PrintableWorksheet.jsx. The same
/// problem-rendering fallback chain (verbal prompt → vertical arithmetic →
/// plain prompt → sequence → emoji count → mystery operator → a op b), the
/// same name/date header, numbered two-column layout, decorative icons, and
/// an optional answer key on its own page.
enum WorksheetPDF {

    static let problemsPerPage = 10
    static let pageSize = CGSize(width: 612, height: 792) // US Letter @ 72dpi

    private static let decoEmoji = [
        "🚀", "⭐️", "❤️", "😊", "🏆", "✨", "☀️", "🌙", "☁️", "🌈",
        "🌸", "🌲", "🍎", "🍒", "🐟", "🐞", "🐦", "🐱", "🐶", "🐌",
        "🐢", "🐿️", "💎", "👑", "🎵", "🎨", "🧩", "🎮", "🚲", "✈️",
    ]
    private static let encouragements = [
        "You did it!", "Great job!", "Way to go!", "You're a math star!", "Awesome work!",
    ]

    /// Render the full document (problem pages + optional answer key) to a
    /// temporary PDF file the share sheet can hand to Print/Files/Mail.
    @MainActor
    static func render(modeLabel: String, problems: [[String: Any]], includeAnswerKey: Bool) -> URL? {
        var pages: [AnyView] = pageChunks(problems).enumerated().map { index, chunk in
            AnyView(WorksheetPageView(
                modeLabel: modeLabel,
                problems: chunk.problems,
                firstNumber: chunk.firstNumber,
                showAnswers: false,
                footer: index == pageChunks(problems).count - 1 ? encouragements[problems.count % encouragements.count] : nil
            ))
        }
        if includeAnswerKey {
            pages += pageChunks(problems).map { chunk in
                AnyView(WorksheetPageView(
                    modeLabel: "\(modeLabel) — Answer Key",
                    problems: chunk.problems,
                    firstNumber: chunk.firstNumber,
                    showAnswers: true,
                    footer: nil
                ))
            }
        }

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("larkit-\(modeLabel.replacingOccurrences(of: " ", with: ""))-Worksheet.pdf")
        var mediaBox = CGRect(origin: .zero, size: pageSize)
        guard let context = CGContext(url as CFURL, mediaBox: &mediaBox, nil) else { return nil }

        for page in pages {
            let renderer = ImageRenderer(content: page.frame(width: pageSize.width, height: pageSize.height))
            renderer.proposedSize = ProposedViewSize(pageSize)
            context.beginPDFPage(nil)
            // Flip: ImageRenderer draws in SwiftUI's top-left space; PDF is bottom-left.
            context.translateBy(x: 0, y: pageSize.height)
            context.scaleBy(x: 1, y: -1)
            renderer.render { _, draw in draw(context) }
            context.endPDFPage()
        }
        context.closePDF()
        return url
    }

    private static func pageChunks(_ problems: [[String: Any]]) -> [(firstNumber: Int, problems: [[String: Any]])] {
        stride(from: 0, to: problems.count, by: problemsPerPage).map { start in
            (start + 1, Array(problems[start..<min(start + problemsPerPage, problems.count)]))
        }
    }

    static func deco(_ index: Int) -> String {
        decoEmoji[index % decoEmoji.count]
    }
}

/// One US Letter page: header, name/date, numbered two-column problems.
struct WorksheetPageView: View {
    let modeLabel: String
    let problems: [[String: Any]]
    let firstNumber: Int
    let showAnswers: Bool
    let footer: String?

    private let ink = Color.black
    private let soft = Color.black.opacity(0.6)
    private let answerColor = Color.black

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text("larkit")
                    .font(.custom("Fredoka-SemiBold", size: 26))
                    .foregroundStyle(Color.black)
                Text("· \(modeLabel)")
                    .font(.custom("Fredoka-SemiBold", size: 20))
                    .foregroundStyle(ink)
                Spacer()
                Text(WorksheetPDF.deco(firstNumber)).font(.system(size: 24))
            }
            if !showAnswers {
                HStack(spacing: 24) {
                    labeledBlank("Name", width: 200)
                    labeledBlank("Date", width: 120)
                    Spacer()
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(soft)
            }

            // Two columns, five rows (the web's grid-cols-2 print layout).
            let rows = stride(from: 0, to: problems.count, by: 2).map { Array(problems[$0..<min($0 + 2, problems.count)]) }
            Grid(alignment: .topLeading, horizontalSpacing: 24, verticalSpacing: 26) {
                ForEach(Array(rows.enumerated()), id: \.offset) { rowIndex, row in
                    GridRow {
                        ForEach(Array(row.enumerated()), id: \.offset) { columnIndex, problem in
                            problemCell(problem, number: firstNumber + rowIndex * 2 + columnIndex)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Spacer(minLength: 0)
            if let footer {
                HStack {
                    Spacer()
                    Text("\(WorksheetPDF.deco(7)) \(footer) \(WorksheetPDF.deco(12))")
                        .font(.custom("Fredoka-SemiBold", size: 16))
                        .foregroundStyle(soft)
                    Spacer()
                }
            }
        }
        .padding(44)
        .frame(width: WorksheetPDF.pageSize.width, height: WorksheetPDF.pageSize.height, alignment: .top)
        .background(Color.white)
    }

    private func labeledBlank(_ label: String, width: CGFloat) -> some View {
        HStack(spacing: 6) {
            Text("\(label):")
            Rectangle().fill(soft.opacity(0.6)).frame(width: width, height: 1.5).offset(y: 5)
        }
    }

    private func problemCell(_ question: [String: Any], number: Int) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text(WorksheetPDF.deco(number - 1)).font(.system(size: 15))
            Text("\(number).")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(soft)
            WorksheetProblemText(question: question, showAnswer: showAnswers, ink: ink, answerColor: answerColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// The problem line — port of WorksheetProblem/AnswerKeyProblem's chain.
struct WorksheetProblemText: View {
    let question: [String: Any]
    let showAnswer: Bool
    let ink: Color
    let answerColor: Color

    var body: some View {
        Text(attributed)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(ink)
            .lineSpacing(3)
    }

    private var blank: AttributedString {
        var text = AttributedString("______")
        text.foregroundColor = Color.black.opacity(0.4)
        return text
    }

    private var answerText: AttributedString {
        var text = AttributedString(AnswerFormatting.text(question["answer"] ?? "?"))
        text.foregroundColor = answerColor
        return text
    }

    private var slot: AttributedString {
        showAnswer ? answerText : blank
    }

    private var attributed: AttributedString {
        let display = question["display"] as? [String: Any] ?? [:]
        let prompt = display["promptText"] as? String

        if let prompt, QuestionDisplayView.isVerbalPrompt(prompt) {
            return AttributedString(prompt + " ") + slot
        }
        if let a = question["a"] as? NSNumber, let b = question["b"] as? NSNumber,
           let op = question["op"] as? String {
            if op == "?" {
                return AttributedString("\(a) ") + slot + AttributedString(" \(b)")
            }
            if let prompt { return AttributedString(prompt + " ") + slot }
            return AttributedString("\(a) \(op) \(b) = ") + slot
        }
        if let prompt {
            return AttributedString(prompt + " ") + slot
        }
        if let sequence = display["sequence"] as? [Any] {
            let terms = sequence.map { AnswerFormatting.text($0) }.joined(separator: ", ")
            return AttributedString(terms + ", ") + slot
        }
        if let emoji = display["emoji"] as? String, let count = (display["count"] as? NSNumber)?.intValue {
            return AttributedString(Array(repeating: emoji, count: count).joined(separator: " ") + " = ") + slot
        }
        return AttributedString("? = ") + slot
    }
}
