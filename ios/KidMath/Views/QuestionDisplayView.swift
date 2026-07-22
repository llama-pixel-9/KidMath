import SwiftUI

/// The question card's content — port of QuestionDisplay in MathExplorer.jsx.
/// Variants, in the web's precedence order:
///   1. emoji count ("How many?" + a wrap of objects)
///   2. sequence ("What comes next?" + the terms and a blank)
///   3. verbal/story prompt (sentence-per-line)
///   4. mystery operator (a ? b in a colored circle)
///   5. vertical column form for double-digit +/−
///   6. plain prompt text fallback
struct QuestionDisplayView: View {
    @Environment(\.theme) private var theme
    let question: [String: Any]
    let modeColor: Color

    private var display: [String: Any] { question["display"] as? [String: Any] ?? [:] }
    private var promptText: String? { display["promptText"] as? String }

    var body: some View {
        if display["bars"] != nil && question["answerType"] as? String != "barGraph" {
            // A chart the question asks about, answered through another widget
            // (choice, multiSelect). When the answer widget IS the graph, it
            // draws its own chart.
            barChartQuestion
        } else if let emoji = display["emoji"] as? String {
            emojiCount(emoji: emoji, count: (display["count"] as? NSNumber)?.intValue ?? 0)
        } else if let sequence = display["sequence"] as? [Any] {
            sequenceDisplay(sequence)
        } else if let prompt = promptText, Self.isVerbalPrompt(prompt) {
            storyPrompt(prompt)
        } else if question["op"] as? String == "?" {
            mysteryOperator
        } else if isVertical {
            verticalArithmetic
        } else if let prompt = promptText {
            plainPrompt(prompt)
        } else {
            plainPrompt(fallbackEquation)
        }
    }

    /// Web heuristic: six or more letters means a verbal prompt.
    static func isVerbalPrompt(_ text: String) -> Bool {
        text.filter { $0.isLetter }.count >= 6
    }

    // MARK: - 0. Bar chart question (chart above the prompt)

    private var barChartQuestion: some View {
        VStack(spacing: 12) {
            BarChartView(display: display)
            if let prompt = promptText {
                Text(prompt)
                    .font(.system(size: 24, weight: .heavy, design: .rounded))
                    .foregroundStyle(theme.textPrimary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - 1. Emoji count

    private func emojiCount(emoji: String, count: Int) -> some View {
        VStack(spacing: 10) {
            caption("How many?")
            FlowLayout(spacing: 6) {
                ForEach(0..<max(count, 0), id: \.self) { _ in
                    Text(emoji).font(.system(size: 32))
                }
            }
            .frame(maxWidth: 280)
        }
    }

    // MARK: - 2. Sequence

    private func sequenceDisplay(_ sequence: [Any]) -> some View {
        VStack(spacing: 10) {
            caption("What comes next?")
            HStack(spacing: 4) {
                ForEach(Array(sequence.enumerated()), id: \.offset) { index, term in
                    if index > 0 { comma }
                    Text(AnswerFormatting.text(term))
                        .font(.system(size: 32, weight: .heavy, design: .rounded))
                        .foregroundStyle(theme.textPrimary)
                }
                comma
                Text("?")
                    .font(.system(size: 32, weight: .heavy, design: .rounded))
                    .foregroundStyle(FigureColors.warm)
            }
            .minimumScaleFactor(0.5)
            .lineLimit(1)
        }
    }

    private var comma: some View {
        Text(",").font(.system(size: 32, weight: .heavy)).foregroundStyle(theme.textMuted)
    }

    // MARK: - 3. Story prompt (sentence per line, last line emphasized)

    private func storyPrompt(_ prompt: String) -> some View {
        let lines = Self.sentences(of: prompt)
        let isStory = (question["metadata"] as? [String: Any])?["itemFamily"] as? String == "application"
        return VStack(spacing: 6) {
            if isStory { caption("Story problem") }
            ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                Text(line)
                    .font(index == lines.count - 1
                          ? .system(size: 24, weight: .heavy, design: .rounded)
                          : .system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.textPrimary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    static func sentences(of text: String) -> [String] {
        var lines: [String] = []
        var current = ""
        for character in text {
            current.append(character)
            if ".!?".contains(character) {
                lines.append(current.trimmingCharacters(in: .whitespaces))
                current = ""
            }
        }
        let rest = current.trimmingCharacters(in: .whitespaces)
        if !rest.isEmpty { lines.append(rest) }
        return lines.isEmpty ? [text] : lines
    }

    // MARK: - 4. Mystery operator (a ? b)

    private var mysteryOperator: some View {
        HStack(spacing: 16) {
            operand(question["a"])
            Text("?")
                .font(.system(size: 30, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 52, height: 52)
                .background(Circle().fill(modeColor))
            operand(question["b"])
        }
    }

    private func operand(_ value: Any?) -> some View {
        Text(value.map(AnswerFormatting.text) ?? "?")
            .font(.system(size: 48, weight: .heavy, design: .rounded))
            .foregroundStyle(theme.textPrimary)
    }

    // MARK: - 5. Vertical column arithmetic

    private var isVertical: Bool {
        guard let op = question["op"] as? String, op == "+" || op == "−" || op == "-",
              let a = (question["a"] as? NSNumber)?.intValue,
              let b = (question["b"] as? NSNumber)?.intValue else { return false }
        return a >= 10 || b >= 10
    }

    private var verticalArithmetic: some View {
        let a = String((question["a"] as? NSNumber)?.intValue ?? 0)
        let op = question["op"] as? String ?? "+"
        let b = String((question["b"] as? NSNumber)?.intValue ?? 0)
        let width = max(a.count, b.count + 1)

        return VStack(alignment: .trailing, spacing: 2) {
            digitsRow(a)
            HStack(spacing: 0) {
                Text(op)
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                    .foregroundStyle(theme.textPrimary)
                Spacer(minLength: 8)
                digitsRow(b)
            }
            .frame(width: CGFloat(width + 1) * 34)
            Rectangle()
                .fill(theme.textMuted)
                .frame(width: CGFloat(width + 1) * 34, height: 4)
                .clipShape(Capsule())
                .padding(.vertical, 4)
            Text("?")
                .font(.system(size: 44, weight: .heavy, design: .rounded))
                .foregroundStyle(FigureColors.warm)
        }
    }

    private func digitsRow(_ digits: String) -> some View {
        HStack(spacing: 0) {
            ForEach(Array(digits.enumerated()), id: \.offset) { _, digit in
                Text(String(digit))
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .foregroundStyle(theme.textPrimary)
                    .frame(width: 34)
            }
        }
    }

    // MARK: - 6. Plain prompt

    private func plainPrompt(_ prompt: String) -> some View {
        Text(prompt)
            .font(.system(size: prompt.count > 40 ? 24 : 32, weight: .heavy, design: .rounded))
            .foregroundStyle(theme.textPrimary)
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.5)
    }

    private var fallbackEquation: String {
        let a = question["a"].map(AnswerFormatting.text) ?? "?"
        let op = question["op"] as? String ?? "+"
        let b = question["b"].map(AnswerFormatting.text) ?? "?"
        return "\(a) \(op) \(b) = ?"
    }

    private func caption(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.bold))
            .textCase(.uppercase)
            .kerning(1)
            .foregroundStyle(theme.textMuted)
    }
}
