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
        } else if display["figure"] as? String == "clockFace" {
            clockFaceQuestion
        } else if display["figure"] as? String == "discMat" {
            discMatQuestion
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

    // MARK: - 0b. Disc-mat question (read-only place-value disc mat(s);
    // mirror of DiscMat.jsx — the interactive discs widget draws its own)

    private var discMatQuestion: some View {
        let dm = display["discMat"] as? [String: Any] ?? [:]
        let matsRaw = dm["mats"] as? [[String: Any]]
        let single = dm["cols"] as? [[String: Any]]
        return VStack(spacing: 12) {
            if let mats = matsRaw {
                HStack(alignment: .top, spacing: 24) {
                    ForEach(Array(mats.enumerated()), id: \.offset) { _, m in
                        DiscMatView(cols: m["cols"] as? [[String: Any]] ?? [], label: m["label"] as? String)
                    }
                }
            } else {
                DiscMatView(cols: single ?? [], label: nil)
            }
            if let prompt = promptText {
                Text(prompt)
                    .font(.system(size: 24, weight: .heavy, design: .rounded))
                    .foregroundStyle(theme.textPrimary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - 0a. Clock-face question (read-only face above the prompt;
    // mirror of ClockFace.jsx — the interactive clock widget draws its own)

    private var clockFaceQuestion: some View {
        VStack(spacing: 12) {
            ClockFaceView(
                hour: ((display["clock"] as? [String: Any])?["hour"] as? NSNumber)?.doubleValue
                    ?? ((display["time"] as? [String: Any])?["hour"] as? NSNumber)?.doubleValue ?? 12,
                minute: ((display["clock"] as? [String: Any])?["minute"] as? NSNumber)?.doubleValue
                    ?? ((display["time"] as? [String: Any])?["minute"] as? NSNumber)?.doubleValue ?? 0
            )
            if let prompt = promptText {
                Text(prompt)
                    .font(.system(size: 24, weight: .heavy, design: .rounded))
                    .foregroundStyle(theme.textPrimary)
                    .multilineTextAlignment(.center)
            }
        }
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
        // The column layout claims "a op b = ?", so the answer must BE that
        // result. Unknown-addend/compare items ("10 + ? = 17", answer 7) also
        // carry numeric a/b — rendering them vertically shows a different
        // question than the one being scored (same guard as the web's
        // isVertical in MathExplorer.jsx).
        guard let answer = (question["answer"] as? NSNumber)?.intValue else { return false }
        return (a >= 10 || b >= 10) && answer == (op == "+" ? a + b : a - b)
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

/// Read-only clock face — the question-side figure (mirror of ClockFace.jsx).
/// AnalogClockWidget (FigureWidgets.swift) is the interactive sibling.
struct ClockFaceView: View {
    @Environment(\.theme) private var theme
    let hour: Double
    let minute: Double

    var body: some View {
        Canvas { ctx, size in
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            let face = Path(ellipseIn: CGRect(x: center.x - 70, y: center.y - 70, width: 140, height: 140))
            ctx.fill(face, with: .color(.white))
            ctx.stroke(face, with: .color(theme.cardBorder), lineWidth: 4)
            for i in 0..<12 {
                let point = handPoint(center: center, length: 62, angleDegrees: Double(i) * 30)
                ctx.fill(Path(ellipseIn: CGRect(x: point.x - 2.5, y: point.y - 2.5, width: 5, height: 5)), with: .color(FigureColors.inkSoft))
            }
            let hourEnd = handPoint(center: center, length: 40, angleDegrees: (hour.truncatingRemainder(dividingBy: 12) + minute / 60) * 30)
            var hourHand = Path()
            hourHand.move(to: center)
            hourHand.addLine(to: hourEnd)
            ctx.stroke(hourHand, with: .color(FigureColors.ink), style: StrokeStyle(lineWidth: 5, lineCap: .round))
            let minuteEnd = handPoint(center: center, length: 58, angleDegrees: minute * 6)
            var minuteHand = Path()
            minuteHand.move(to: center)
            minuteHand.addLine(to: minuteEnd)
            ctx.stroke(minuteHand, with: .color(FigureColors.accent), style: StrokeStyle(lineWidth: 3, lineCap: .round))
            ctx.fill(Path(ellipseIn: CGRect(x: center.x - 4, y: center.y - 4, width: 8, height: 8)), with: .color(FigureColors.ink))
        }
        .frame(width: 160, height: 160)
    }

    private func handPoint(center: CGPoint, length: CGFloat, angleDegrees: Double) -> CGPoint {
        let radians = angleDegrees * .pi / 180
        return CGPoint(x: center.x + length * sin(radians), y: center.y - length * cos(radians))
    }
}

/// Read-only place-value disc mat — mirror of DiscMat.jsx (the interactive
/// PlaceValueDiscsWidget in FigureWidgets.swift draws its own mat + pad).
struct DiscMatView: View {
    @Environment(\.theme) private var theme
    let cols: [[String: Any]]
    let label: String?

    private static let placeColors: [Int: Color] = [
        1000: FigureColors.accentSoft, 100: FigureColors.accent,
        10: FigureColors.ink, 1: FigureColors.inkSoft,
    ]

    var body: some View {
        VStack(spacing: 4) {
            if let label { Text(label).font(.system(size: 12, weight: .heavy, design: .rounded)).foregroundStyle(theme.textSecondary) }
            HStack(alignment: .bottom, spacing: 8) {
                ForEach(Array(cols.enumerated()), id: \.offset) { _, col in
                    let place = (col["place"] as? NSNumber)?.intValue ?? 1
                    let count = (col["count"] as? NSNumber)?.intValue ?? 0
                    VStack(spacing: 3) {
                        Text("\(place)").font(.system(size: 11, weight: .bold, design: .rounded)).foregroundStyle(theme.textSecondary)
                        VStack(spacing: 3) {
                            if count == 0 {
                                Text("—").font(.system(size: 11, weight: .bold)).foregroundStyle(theme.textSecondary)
                            }
                            ForEach(0..<max(count, 0), id: \.self) { _ in
                                Text("\(place)")
                                    .font(.system(size: 9, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white)
                                    .frame(width: 26, height: 26)
                                    .background(Circle().fill(Self.placeColors[place] ?? FigureColors.ink))
                            }
                        }
                    }
                    .padding(6)
                    .background(RoundedRectangle(cornerRadius: 10).fill(theme.cardBg.opacity(0.6)))
                }
            }
        }
    }
}
