import SwiftUI

/// Flight-log sheets — port of FlightLogSheet in PrintableWorksheet.jsx over
/// the shared generateFlightLog draw. One log = one US Letter page: header
/// lockup with "Flight log · {mode} · Level {n} · {scope}", Name/Date rules,
/// stacked computations three per row (or short prompts two per row), inline
/// items two per row, word problems full width, one-line footer. The answer
/// key is the same sheet with the answers filled, on its own page.
enum FlightLogPDF {

    static let pageSize = CGSize(width: 612, height: 792) // US Letter @ 72dpi
    static let margin: CGFloat = 32

    struct Log {
        let mode: ModeInfo
        let level: Int
        let scope: String
        let payload: [String: Any]

        var partA: [[String: Any]] { payload["partA"] as? [[String: Any]] ?? [] }
        var partB: [[String: Any]] { payload["partB"] as? [[String: Any]] ?? [] }
        var wordProblems: [[String: Any]] { payload["wordProblems"] as? [[String: Any]] ?? [] }
        var computational: Bool { (payload["computational"] as? Bool) == true }
        var itemCount: Int { (payload["itemCount"] as? NSNumber)?.intValue ?? (partA.count + partB.count + wordProblems.count) }
    }

    /// Render every log, then every log's answer key, to one temporary PDF.
    @MainActor
    static func render(logs: [Log], engine: EngineBridge) -> URL? {
        guard let first = logs.first else { return nil }
        var pages: [AnyView] = []
        for (i, log) in logs.enumerated() {
            pages.append(AnyView(FlightLogSheetView(log: log, engine: engine, answerKey: false, logIndex: i, logCount: logs.count)))
        }
        for (i, log) in logs.enumerated() {
            pages.append(AnyView(FlightLogSheetView(log: log, engine: engine, answerKey: true, logIndex: i, logCount: logs.count)))
        }

        let safeLabel = first.mode.label.replacingOccurrences(of: "!", with: "").replacingOccurrences(of: " ", with: "")
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("larkit-flight-log-\(safeLabel)-L\(first.level).pdf")
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
}

private let opSymbol: [String: String] = ["+": "+", "-": "−", "x": "×", "/": "÷"]

/// One Letter page. Black ink only — it prints.
struct FlightLogSheetView: View {
    let log: FlightLogPDF.Log
    let engine: EngineBridge
    let answerKey: Bool
    let logIndex: Int
    let logCount: Int

    private let ink = Color.black

    // Item numbers run partA → partB → word problems, assigned up front (a
    // counter inside a view builder is evaluated in no reliable order).
    private var numbered: (a: [(Int, [String: Any])], b: [(Int, [String: Any])], w: [(Int, [String: Any])]) {
        let a = log.partA.enumerated().map { ($0.offset + 1, $0.element) }
        let b = log.partB.enumerated().map { ($0.offset + 1 + a.count, $0.element) }
        let w = log.wordProblems.enumerated().map { ($0.offset + 1 + a.count + b.count, $0.element) }
        return (a, b, w)
    }

    var body: some View {
        let items = numbered
        VStack(alignment: .leading, spacing: 0) {
            header
            if answerKey {
                Text("Answer key").font(.system(size: 12, weight: .semibold)).foregroundStyle(ink).padding(.vertical, 10)
            } else {
                nameDate
            }

            // Stacked computations (three per row), or short prompts (two per row).
            if log.computational {
                grid(columns: 3, rowGap: 12, colGap: 24, items: items.a) { n, q in
                    StackedItem(question: q, number: n, answer: answerOf(q), ink: ink)
                }
                .padding(.top, 12)
            } else {
                grid(columns: 2, rowGap: 10, colGap: 24, items: items.a) { n, q in
                    PromptItem(question: q, number: n, answer: answerOf(q), engine: engine, ink: ink)
                }
                .padding(.top, 12)
            }

            // Inline items, two per row.
            grid(columns: 2, rowGap: 10, colGap: 24, items: items.b) { n, q in
                if log.computational {
                    InlineItem(question: q, number: n, answer: answerOf(q), ink: ink)
                } else {
                    PromptItem(question: q, number: n, answer: answerOf(q), engine: engine, ink: ink)
                }
            }
            .padding(.top, 16)

            // Word problems, full width, at the end.
            if !items.w.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(items.w, id: \.0) { n, item in
                        WordProblemItem(item: item, number: n, showAnswer: answerKey, engine: engine, ink: ink)
                    }
                }
                .padding(.top, 16)
            }

            Spacer(minLength: 0)
            footer
        }
        .padding(FlightLogPDF.margin)
        .frame(width: FlightLogPDF.pageSize.width, height: FlightLogPDF.pageSize.height, alignment: .top)
        .background(Color.white)
        .environment(\.colorScheme, .light)
    }

    private func answerOf(_ q: [String: Any]) -> Any? { answerKey ? q["answer"] : nil }

    private var header: some View {
        HStack(spacing: 10) {
            LarkMarkView(color: .black, accent: .black, eye: .white).frame(height: 32)
            Text("larkit").font(.custom("Fredoka-SemiBold", size: 24)).foregroundStyle(ink)
            Spacer()
            Text("Flight log · \(log.mode.label) · Level \(log.level) · \(log.scope)\(logCount > 1 ? " · Log \(logIndex + 1) of \(logCount)" : "")")
                .font(.system(size: 12, weight: .bold)).foregroundStyle(ink).multilineTextAlignment(.trailing)
        }
        .padding(.bottom, 12)
        .overlay(alignment: .bottom) { Rectangle().fill(ink).frame(height: 2) }
    }

    private var nameDate: some View {
        HStack(alignment: .bottom, spacing: 32) {
            HStack(alignment: .bottom, spacing: 8) {
                Text("Name").font(.system(size: 12, weight: .semibold)).foregroundStyle(ink).fixedSize()
                Rectangle().fill(ink).frame(width: 220, height: 1)
            }
            HStack(alignment: .bottom, spacing: 8) {
                Text("Date").font(.system(size: 12, weight: .semibold)).foregroundStyle(ink).fixedSize()
                Rectangle().fill(ink).frame(width: 110, height: 1)
            }
            Spacer()
        }
        .padding(.vertical, 10)
    }

    private var footer: some View {
        HStack {
            Text("larkit.io")
            Spacer()
            HStack(spacing: 6) {
                Text("Landed")
                Rectangle().stroke(ink, lineWidth: 1.5).frame(width: 14, height: 14)
                Text("of \(log.itemCount)")
            }
            Spacer()
            Text("\(log.mode.label) · L\(log.level)")
        }
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(ink)
        .padding(.top, 8)
        .overlay(alignment: .top) { Rectangle().fill(ink).frame(height: 1) }
    }

    private func grid<Content: View>(columns: Int, rowGap: CGFloat, colGap: CGFloat, items: [(Int, [String: Any])],
                                     @ViewBuilder cell: @escaping (Int, [String: Any]) -> Content) -> some View {
        let rows = stride(from: 0, to: items.count, by: columns).map { Array(items[$0..<min($0 + columns, items.count)]) }
        return VStack(alignment: .leading, spacing: rowGap) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(alignment: .top, spacing: colGap) {
                    ForEach(row, id: \.0) { n, q in
                        cell(n, q).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if row.count < columns {
                        ForEach(0..<(columns - row.count), id: \.self) { _ in Color.clear.frame(maxWidth: .infinity, maxHeight: 1) }
                    }
                }
            }
        }
    }
}

// MARK: - Items

private struct ItemNumber: View {
    let n: Int
    let ink: Color
    var body: some View {
        Text("\(n).").font(.system(size: 11, weight: .bold)).foregroundStyle(ink).frame(width: 20, alignment: .trailing).padding(.top, 3)
    }
}

private struct AnswerBox: View {
    let value: Any?
    var wide = false
    let ink: Color
    var body: some View {
        Text(value.map { AnswerFormatting.text($0) } ?? "")
            .font(.custom("Fredoka-SemiBold", size: 16)).foregroundStyle(ink)
            .frame(minWidth: wide ? 64 : 44, minHeight: 28)
            .frame(width: wide ? nil : 44, height: 28)
            .padding(.horizontal, wide ? 8 : 0)
            .overlay(Rectangle().stroke(ink, lineWidth: 1.5))
    }
}

/// Part A stacked item: both operands right-aligned in one column, the
/// operator on the second line, a rule, and a blank the height of a digit.
private struct StackedItem: View {
    let question: [String: Any]
    let number: Int
    let answer: Any?
    let ink: Color
    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            ItemNumber(n: number, ink: ink)
            VStack(alignment: .trailing, spacing: 0) {
                Text(AnswerFormatting.text(question["a"] ?? "")).padding(.trailing, 4)
                HStack {
                    Text(opSymbol[question["op"] as? String ?? ""] ?? (question["op"] as? String ?? ""))
                    Spacer()
                    Text(AnswerFormatting.text(question["b"] ?? ""))
                }
                .padding(.trailing, 4)
                Rectangle().fill(ink).frame(height: 1.5).padding(.top, 3)
                Text(answer.map { AnswerFormatting.text($0) } ?? " ").frame(height: 26).padding(.trailing, 4)
            }
            .font(.custom("Fredoka-SemiBold", size: 20)).monospacedDigit()
            .foregroundStyle(ink)
            .frame(width: 88)
            Spacer(minLength: 0)
        }
    }
}

/// Part B inline item: `a + b =` then the box. The box IS the blank.
private struct InlineItem: View {
    let question: [String: Any]
    let number: Int
    let answer: Any?
    let ink: Color
    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            ItemNumber(n: number, ink: ink)
            Text("\(AnswerFormatting.text(question["a"] ?? "")) \(opSymbol[question["op"] as? String ?? ""] ?? "") \(AnswerFormatting.text(question["b"] ?? "")) =")
                .font(.custom("Fredoka-SemiBold", size: 18)).foregroundStyle(ink)
            AnswerBox(value: answer, ink: ink)
            Spacer(minLength: 0)
        }
    }
}

/// A short prompt with its figure (grayscale), option bank, and either a
/// circle-Yes/No or an answer box.
private struct PromptItem: View {
    let question: [String: Any]
    let number: Int
    let answer: Any?
    let engine: EngineBridge
    let ink: Color

    private var display: [String: Any] { question["display"] as? [String: Any] ?? [:] }

    private var bodyText: String {
        if let p = display["promptText"] as? String { return p }
        if let seq = display["sequence"] as? [Any] { return seq.map { AnswerFormatting.text($0) }.joined(separator: ", ") + ", …" }
        if let emoji = display["emoji"] as? String {
            let count = (display["count"] as? NSNumber)?.intValue ?? 0
            return Array(repeating: emoji, count: max(0, count)).joined(separator: " ")
        }
        return ""
    }

    var body: some View {
        let subPrompt = (question["subPrompt"] as? String) ?? (display["subPrompt"] as? String)
        let judgment = engine.isYesNoJudgment(question: question)
        let bank = engine.printOptionBank(question: question)
        HStack(alignment: .top, spacing: 6) {
            ItemNumber(n: number, ink: ink)
            VStack(alignment: .leading, spacing: 6) {
                PrintFigure(question: question, engine: engine, settled: answer != nil)
                    .frame(maxWidth: 240, alignment: .leading)
                    .grayscale(1)
                HStack(alignment: .center, spacing: 6) {
                    Text([bodyText, subPrompt ?? ""].filter { !$0.isEmpty }.joined(separator: " "))
                        .font(.system(size: 13, weight: .semibold)).foregroundStyle(ink).fixedSize(horizontal: false, vertical: true)
                }
                if let bank {
                    HStack(spacing: 6) {
                        ForEach(Array(bank.enumerated()), id: \.offset) { _, c in
                            Text(AnswerFormatting.text(c)).font(.custom("Fredoka-SemiBold", size: 13)).foregroundStyle(ink)
                                .padding(.horizontal, 6).frame(height: 22).overlay(Rectangle().stroke(ink, lineWidth: 1))
                        }
                    }
                }
                if judgment {
                    HStack(spacing: 8) {
                        Text("Circle one:").font(.custom("Fredoka-SemiBold", size: 14)).foregroundStyle(ink)
                        ForEach(["Yes", "No"], id: \.self) { label in
                            let chosen = (answer as? String) == label
                            Text(label).font(.custom("Fredoka-SemiBold", size: 14)).foregroundStyle(ink)
                                .padding(.horizontal, 10).frame(height: 24)
                                .overlay(Capsule().stroke(chosen ? ink : ink.opacity(0.4), lineWidth: chosen ? 2.5 : 1))
                        }
                    }
                } else {
                    AnswerBox(value: answer, wide: true, ink: ink)
                }
            }
        }
    }
}

/// A story problem (or a pick-two problem with its number box).
private struct WordProblemItem: View {
    let item: [String: Any]
    let number: Int
    let showAnswer: Bool
    let engine: EngineBridge
    let ink: Color

    var body: some View {
        let q = item["question"] as? [String: Any] ?? [:]
        let display = q["display"] as? [String: Any] ?? [:]
        HStack(alignment: .top, spacing: 6) {
            ItemNumber(n: number, ink: ink)
            if (item["kind"] as? String) == "pickTwo" {
                let options = display["options"] as? [Any] ?? []
                let pair: [Any] = ((q["answer"] as? [Any])?.first as? [Any]) ?? (q["answer"] as? [Any] ?? [])
                VStack(alignment: .leading, spacing: 12) {
                    Text((display["promptText"] as? String ?? "").replacingOccurrences(of: "Pick two numbers", with: "Pick two numbers from the box"))
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(ink)
                    HStack(spacing: 8) {
                        ForEach(Array(options.enumerated()), id: \.offset) { _, opt in
                            Text(AnswerFormatting.text(opt)).font(.custom("Fredoka-SemiBold", size: 17)).foregroundStyle(ink)
                                .frame(width: 34, height: 30).overlay(Rectangle().stroke(ink, lineWidth: 1.5))
                        }
                    }
                    HStack(spacing: 8) {
                        AnswerBox(value: showAnswer ? pair.first : nil, ink: ink)
                        Text("+")
                        AnswerBox(value: showAnswer && pair.count > 1 ? pair[1] : nil, ink: ink)
                        Text("= \(AnswerFormatting.text(q["a"] ?? ""))")
                    }
                    .font(.custom("Fredoka-SemiBold", size: 19)).foregroundStyle(ink)
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    PrintFigure(question: q, engine: engine, settled: showAnswer).frame(maxWidth: 240, alignment: .leading).grayscale(1)
                    HStack(alignment: .center, spacing: 6) {
                        Text(display["promptText"] as? String ?? "").font(.system(size: 14, weight: .semibold)).foregroundStyle(ink)
                            .fixedSize(horizontal: false, vertical: true)
                        AnswerBox(value: showAnswer ? q["answer"] : nil, wide: true, ink: ink)
                    }
                }
            }
        }
    }
}

/// The question's figure, if it has one — same registry the session uses.
private struct PrintFigure: View {
    let question: [String: Any]
    let engine: EngineBridge
    let settled: Bool

    private var display: [String: Any] { question["display"] as? [String: Any] ?? [:] }

    var body: some View {
        switch display["figure"] as? String {
        case "barGraph":
            BarChartView(display: display)
        case "pictograph":
            PictographView(rows: display["rows"] as? [[String: Any]] ?? [], keyValue: (display["keyValue"] as? NSNumber)?.doubleValue ?? 1)
        case "tallyChart":
            TallyChartView(rows: display["rows"] as? [[String: Any]] ?? [])
        case "linePlot":
            LinePlotView(points: display["points"] as? [[String: Any]] ?? [], axisLabel: display["axisLabel"] as? String)
        case "clockFace":
            let clock = (display["clock"] as? [String: Any]) ?? (display["time"] as? [String: Any]) ?? [:]
            ClockFaceView(hour: (clock["hour"] as? NSNumber)?.doubleValue ?? 12, minute: (clock["minute"] as? NSNumber)?.doubleValue ?? 0)
        case "discMat":
            let dm = display["discMat"] as? [String: Any] ?? [:]
            if let cols = dm["cols"] as? [[String: Any]] { DiscMatView(cols: cols, label: nil) }
        default:
            if (question["mode"] as? String) == "areaPerimeter" || ((question["metadata"] as? [String: Any])?["modeId"] as? String) == "areaPerimeter",
               let spec = engine.areaFigureSpec(question: question) {
                AreaFigureView(spec: spec)
            } else if display["bars"] != nil {
                BarChartView(display: display)
            }
        }
    }
}
