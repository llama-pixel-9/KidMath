import SwiftUI

/// Printed worksheets — port of src/worksheets/WorksheetSheet.jsx over the
/// shared generateWorksheetRun draw. One sheet = one skill = ONE layout: a
/// parent never sees problems 1–12 stacked and 13–18 sideways. The layout
/// (stacked, horizontal, long division, prompts, figures, story boxes) and
/// its page budget come from the engine's catalog; this file only draws.
/// The answer key is the same sheet with the answers filled, on its own page.
///
/// Sizes are the web sheet's CSS pixels times `WorksheetPDF.scale`: the web
/// prints 744 px across the same Letter page this draws 548 pt across, so the
/// budgets measured by the web's PDF test hold here too.
enum WorksheetPDF {

    static let pageSize = CGSize(width: 612, height: 792) // US Letter @ 72dpi
    static let margin: CGFloat = 32
    static let scale: CGFloat = 548.0 / 744.0

    /// Grid + work space for one layout, from the engine's `layouts` table.
    struct Layout {
        let columns: Int
        let rowGap: CGFloat
        let workSpace: CGFloat

        init(_ raw: [String: Any]?) {
            columns = (raw?["columns"] as? NSNumber)?.intValue ?? 2
            rowGap = CGFloat((raw?["rowGap"] as? NSNumber)?.doubleValue ?? 14)
            workSpace = CGFloat((raw?["workSpace"] as? NSNumber)?.doubleValue ?? 0)
        }
    }

    /// One generated sheet plus what its header and footer say.
    struct Sheet {
        let header: String
        let footer: String
        let layouts: [String: Any]
        let storyWorkSpace: CGFloat
        let payload: [String: Any]

        var layoutName: String { payload["layout"] as? String ?? "prompt" }
        var items: [[String: Any]] { payload["items"] as? [[String: Any]] ?? [] }
        var wordProblems: [[String: Any]] { payload["wordProblems"] as? [[String: Any]] ?? [] }
        var itemCount: Int { (payload["itemCount"] as? NSNumber)?.intValue ?? (items.count + wordProblems.count) }
        var shortfall: Int { (payload["shortfall"] as? NSNumber)?.intValue ?? 0 }
        var layout: Layout { Layout(layouts[layoutName] as? [String: Any]) }
    }

    /// Render every sheet, then every sheet's answer key, to one temporary PDF
    /// named for the skill.
    @MainActor
    static func render(sheets: [Sheet], engine: EngineBridge, answerKey: Bool = true, fileName: String) -> URL? {
        guard !sheets.isEmpty else { return nil }
        var pages: [AnyView] = []
        for (i, sheet) in sheets.enumerated() {
            pages.append(AnyView(WorksheetSheetView(sheet: sheet, engine: engine, answerKey: false, sheetIndex: i, sheetCount: sheets.count)))
        }
        if answerKey {
            for (i, sheet) in sheets.enumerated() {
                pages.append(AnyView(WorksheetSheetView(sheet: sheet, engine: engine, answerKey: true, sheetIndex: i, sheetCount: sheets.count)))
            }
        }

        let safe = fileName.components(separatedBy: CharacterSet.alphanumerics.union(CharacterSet(charactersIn: " -")).inverted).joined()
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(safe).pdf")
        var mediaBox = CGRect(origin: .zero, size: pageSize)
        guard let context = CGContext(url as CFURL, mediaBox: &mediaBox, nil) else { return nil }
        for page in pages {
            let renderer = ImageRenderer(content: page.frame(width: pageSize.width, height: pageSize.height))
            renderer.proposedSize = ProposedViewSize(pageSize)
            context.beginPDFPage(nil)
            // No flip: ImageRenderer's draw closure already targets PDF space.
            // (The old flight-log renderer flipped here and printed upside down.)
            renderer.render { _, draw in draw(context) }
            context.endPDFPage()
        }
        context.closePDF()
        return url
    }

    /// The height a sheet WANTS at page width — the page-fit check: a fixed
    /// page frame clips an overfull sheet silently, so tests measure this.
    @MainActor
    static func naturalHeight(of sheet: Sheet, engine: EngineBridge) -> CGFloat {
        let view = WorksheetSheetView(sheet: sheet, engine: engine, answerKey: false, sheetIndex: 0, sheetCount: 1, fillPage: false)
            .frame(width: pageSize.width)
            .fixedSize(horizontal: false, vertical: true)
        let renderer = ImageRenderer(content: view)
        renderer.proposedSize = ProposedViewSize(width: pageSize.width, height: nil)
        return renderer.uiImage?.size.height ?? 0
    }
}

private let opSymbol: [String: String] = ["+": "+", "-": "−", "x": "×", "/": "÷"]
private func px(_ webPixels: CGFloat) -> CGFloat { webPixels * WorksheetPDF.scale }

/// What the key writes for a problem: "12 R 3" when there is a remainder.
private func printedAnswer(_ q: [String: Any]) -> Any? {
    guard let answer = q["answer"] else { return nil }
    if let remainder = (q["remainder"] as? NSNumber)?.intValue, remainder > 0 {
        return "\(AnswerFormatting.text(answer)) R \(remainder)"
    }
    return answer
}

/// One Letter page. Black ink only — it prints.
struct WorksheetSheetView: View {
    let sheet: WorksheetPDF.Sheet
    let engine: EngineBridge
    let answerKey: Bool
    let sheetIndex: Int
    let sheetCount: Int
    var fillPage = true

    private let ink = Color.black

    private var storiesOnly: Bool { sheet.layoutName == "stories" }

    // Item numbers run practice → word problems, assigned up front (a counter
    // inside a view builder is evaluated in no reliable order).
    private var numbered: (items: [(Int, [String: Any])], stories: [(Int, [String: Any])]) {
        let items = sheet.items.enumerated().map { ($0.offset + 1, $0.element) }
        let stories = sheet.wordProblems.enumerated().map { ($0.offset + 1 + items.count, $0.element) }
        return (items, stories)
    }

    private func pictured(_ item: [String: Any]) -> Bool {
        let q = item["question"] as? [String: Any] ?? [:]
        return (try? engine.call("paperFigureKey", [q]))?.isString == true
    }

    var body: some View {
        let all = numbered
        let layout = sheet.layout
        VStack(alignment: .leading, spacing: 0) {
            header
            if answerKey {
                Text("Answer key").font(.system(size: px(12), weight: .semibold)).foregroundStyle(ink).padding(.vertical, px(12))
            } else {
                nameDate
            }

            if !storiesOnly && !all.items.isEmpty {
                grid(columns: layout.columns, rowGap: px(layout.rowGap), colGap: px(24), items: all.items) { n, q in
                    practiceItem(q, number: n, layout: layout)
                }
                .padding(.top, px(16))
            }

            if storiesOnly {
                let withFigures = sheet.wordProblems.contains(where: pictured)
                grid(columns: withFigures ? 1 : 2, rowGap: px(14), colGap: px(16), items: all.stories) { n, item in
                    StoryBox(item: item, number: n, showAnswer: answerKey, tall: !withFigures, engine: engine, ink: ink)
                }
                .padding(.top, px(16))
            } else if !all.stories.isEmpty {
                VStack(alignment: .leading, spacing: px(16)) {
                    ForEach(all.stories, id: \.0) { n, item in
                        WordProblemItem(item: item, number: n, showAnswer: answerKey, workSpace: px(sheet.storyWorkSpace), engine: engine, ink: ink)
                    }
                }
                .padding(.top, px(24))
            }

            if fillPage { Spacer(minLength: 0) }
            footer.padding(.top, fillPage ? 0 : px(24))
        }
        .padding(WorksheetPDF.margin)
        .frame(width: WorksheetPDF.pageSize.width, height: fillPage ? WorksheetPDF.pageSize.height : nil, alignment: .top)
        .background(Color.white)
        .environment(\.colorScheme, .light)
    }

    @ViewBuilder
    private func practiceItem(_ q: [String: Any], number: Int, layout: WorksheetPDF.Layout) -> some View {
        let answer: Any? = answerKey ? printedAnswer(q) : nil
        switch sheet.layoutName {
        case "stacked", "stackedWide":
            StackedItem(question: q, number: number, answer: answer, workSpace: px(layout.workSpace), ink: ink)
        case "horizontal":
            InlineItem(question: q, number: number, answer: answer, ink: ink)
        case "longDivision":
            LongDivisionItem(question: q, number: number, answer: answer, workSpace: px(layout.workSpace), ink: ink)
        default:
            PromptItem(question: q, number: number, answer: answer, engine: engine, ink: ink)
        }
    }

    private var header: some View {
        HStack(spacing: px(10)) {
            LarkMarkView(color: .black, accent: .black, eye: .white).frame(height: px(32))
            Text("larkit").font(.custom("Fredoka-SemiBold", size: px(24))).foregroundStyle(ink)
            Spacer(minLength: px(24))
            Text("\(sheet.header)\(sheetCount > 1 ? " · Sheet \(sheetIndex + 1) of \(sheetCount)" : "")")
                .font(.system(size: px(12), weight: .bold)).foregroundStyle(ink).multilineTextAlignment(.trailing)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.bottom, px(12))
        .overlay(alignment: .bottom) { Rectangle().fill(ink).frame(height: 1.5) }
    }

    private var nameDate: some View {
        HStack(alignment: .bottom, spacing: px(32)) {
            HStack(alignment: .bottom, spacing: px(8)) {
                Text("Name").font(.system(size: px(12), weight: .semibold)).foregroundStyle(ink).fixedSize()
                Rectangle().fill(ink).frame(width: px(256), height: 1)
            }
            Spacer()
            HStack(alignment: .bottom, spacing: px(8)) {
                Text("Date").font(.system(size: px(12), weight: .semibold)).foregroundStyle(ink).fixedSize()
                Rectangle().fill(ink).frame(width: px(128), height: 1)
            }
        }
        .padding(.vertical, px(12))
    }

    private var footer: some View {
        HStack {
            Text("larkit.io")
            Spacer()
            HStack(spacing: px(6)) {
                Text("Landed")
                Rectangle().stroke(ink, lineWidth: 1.2).frame(width: px(14), height: px(14))
                Text("of \(sheet.itemCount)")
            }
            Spacer()
            Text(sheet.footer)
        }
        .font(.system(size: px(10), weight: .bold))
        .foregroundStyle(ink)
        .padding(.top, px(8))
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
        Text("\(n).").font(.system(size: px(11), weight: .bold)).foregroundStyle(ink).frame(width: px(20), alignment: .trailing).padding(.top, px(3))
    }
}

private struct AnswerBox: View {
    let value: Any?
    var wide = false
    let ink: Color
    var body: some View {
        Text(value.map { AnswerFormatting.text($0) } ?? "")
            .font(.custom("Fredoka-SemiBold", size: px(16))).foregroundStyle(ink)
            .frame(minWidth: px(wide ? 64 : 44), minHeight: px(28))
            .frame(width: wide ? nil : px(44), height: px(28))
            .padding(.horizontal, wide ? px(8) : 0)
            .overlay(Rectangle().stroke(ink, lineWidth: 1.2))
    }
}

/// Both operands right-aligned in one column, the operator on the second
/// line, a rule, then `workSpace` of clear room for the child's own writing —
/// taller where partial products have to fit.
private struct StackedItem: View {
    let question: [String: Any]
    let number: Int
    let answer: Any?
    let workSpace: CGFloat
    let ink: Color
    var body: some View {
        HStack(alignment: .top, spacing: px(6)) {
            ItemNumber(n: number, ink: ink)
            VStack(alignment: .trailing, spacing: 0) {
                Text(AnswerFormatting.text(question["a"] ?? "")).padding(.trailing, px(4))
                HStack {
                    Text(opSymbol[question["op"] as? String ?? ""] ?? (question["op"] as? String ?? ""))
                    Spacer()
                    Text(AnswerFormatting.text(question["b"] ?? ""))
                }
                .padding(.trailing, px(4))
                Rectangle().fill(ink).frame(height: 1.2).padding(.top, px(3))
                Text(answer.map { AnswerFormatting.text($0) } ?? " ")
                    .frame(maxWidth: .infinity, minHeight: workSpace, alignment: .topTrailing).padding(.trailing, px(4))
            }
            .font(.custom("Fredoka-SemiBold", size: px(20))).monospacedDigit()
            .foregroundStyle(ink)
            .frame(width: px(88))
            Spacer(minLength: 0)
        }
    }
}

/// `a + b =` then the box. The box IS the blank.
private struct InlineItem: View {
    let question: [String: Any]
    let number: Int
    let answer: Any?
    let ink: Color
    var body: some View {
        HStack(alignment: .top, spacing: px(6)) {
            ItemNumber(n: number, ink: ink)
            Text("\(AnswerFormatting.text(question["a"] ?? "")) \(opSymbol[question["op"] as? String ?? ""] ?? "") \(AnswerFormatting.text(question["b"] ?? "")) =")
                .font(.custom("Fredoka-SemiBold", size: px(18))).foregroundStyle(ink)
            AnswerBox(value: answer, ink: ink)
            Spacer(minLength: 0)
        }
    }
}

/// Division the way it is worked on paper: divisor, a bracket over the
/// dividend, the quotient above the bar, work space underneath. Never
/// stacked like a subtraction.
private struct LongDivisionItem: View {
    let question: [String: Any]
    let number: Int
    let answer: Any?
    let workSpace: CGFloat
    let ink: Color
    var body: some View {
        HStack(alignment: .top, spacing: px(6)) {
            ItemNumber(n: number, ink: ink)
            VStack(alignment: .leading, spacing: 0) {
                Text(answer.map { AnswerFormatting.text($0) } ?? " ")
                    .font(.custom("Fredoka-SemiBold", size: px(17))).padding(.leading, px(44)).frame(height: px(26))
                HStack(alignment: .top, spacing: 0) {
                    Text(AnswerFormatting.text(question["b"] ?? "")).frame(width: px(36), alignment: .trailing).padding(.trailing, px(6))
                    Text(AnswerFormatting.text(question["a"] ?? ""))
                        .padding(.leading, px(8)).padding(.trailing, px(12)).frame(minWidth: px(64), alignment: .leading)
                        .overlay(alignment: .topLeading) {
                            // The bracket: a bar over the dividend and a stroke down its left.
                            ZStack(alignment: .topLeading) {
                                Rectangle().fill(ink).frame(height: 1.2)
                                Rectangle().fill(ink).frame(width: 1.2)
                            }
                        }
                }
                Color.clear.frame(height: workSpace)
            }
            .font(.custom("Fredoka-SemiBold", size: px(20))).monospacedDigit()
            .foregroundStyle(ink)
            Spacer(minLength: 0)
        }
    }
}

/// A worded item with its figure, option bank, and either a circle-Yes/No or
/// an answer box.
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
        HStack(alignment: .top, spacing: px(6)) {
            ItemNumber(n: number, ink: ink)
            VStack(alignment: .leading, spacing: px(6)) {
                PrintFigure(question: question, engine: engine, settled: answer != nil)
                Text([bodyText, subPrompt ?? ""].filter { !$0.isEmpty }.joined(separator: " "))
                    .font(.system(size: px(13), weight: .semibold)).foregroundStyle(ink).fixedSize(horizontal: false, vertical: true)
                if let bank {
                    HStack(spacing: px(6)) {
                        ForEach(Array(bank.enumerated()), id: \.offset) { _, c in
                            Text(AnswerFormatting.text(c)).font(.custom("Fredoka-SemiBold", size: px(13))).foregroundStyle(ink)
                                .padding(.horizontal, px(6)).frame(height: px(22)).overlay(Rectangle().stroke(ink, lineWidth: 1))
                        }
                    }
                }
                if judgment {
                    HStack(spacing: px(8)) {
                        Text("Circle one:").font(.custom("Fredoka-SemiBold", size: px(14))).foregroundStyle(ink)
                        ForEach(["Yes", "No"], id: \.self) { label in
                            let chosen = (answer as? String) == label
                            Text(label).font(.custom("Fredoka-SemiBold", size: px(14))).foregroundStyle(ink)
                                .padding(.horizontal, px(10)).frame(height: px(24))
                                .overlay(Capsule().stroke(chosen ? ink : ink.opacity(0.4), lineWidth: chosen ? 2 : 1))
                        }
                    }
                } else {
                    AnswerBox(value: answer, wide: true, ink: ink)
                }
            }
        }
    }
}

/// A word problem under a practice block, full width, with scratch room.
private struct WordProblemItem: View {
    let item: [String: Any]
    let number: Int
    let showAnswer: Bool
    let workSpace: CGFloat
    let engine: EngineBridge
    let ink: Color

    var body: some View {
        let q = item["question"] as? [String: Any] ?? [:]
        let display = q["display"] as? [String: Any] ?? [:]
        HStack(alignment: .top, spacing: px(6)) {
            ItemNumber(n: number, ink: ink)
            VStack(alignment: .leading, spacing: px(6)) {
                PrintFigure(question: q, engine: engine, settled: showAnswer)
                HStack(alignment: .center, spacing: px(6)) {
                    Text(display["promptText"] as? String ?? "").font(.system(size: px(14), weight: .semibold)).foregroundStyle(ink)
                        .fixedSize(horizontal: false, vertical: true)
                    AnswerBox(value: showAnswer ? q["answer"] : nil, wide: true, ink: ink)
                }
                Color.clear.frame(height: workSpace)
            }
        }
    }
}

/// A word-problems-only sheet gives every story a bordered box: the story on
/// top, room to draw and work underneath, the answer line at the bottom.
private struct StoryBox: View {
    let item: [String: Any]
    let number: Int
    let showAnswer: Bool
    let tall: Bool
    let engine: EngineBridge
    let ink: Color

    var body: some View {
        let q = item["question"] as? [String: Any] ?? [:]
        let display = q["display"] as? [String: Any] ?? [:]
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: px(6)) {
                ItemNumber(n: number, ink: ink)
                VStack(alignment: .leading, spacing: px(6)) {
                    PrintFigure(question: q, engine: engine, settled: showAnswer)
                    Text(display["promptText"] as? String ?? "").font(.system(size: px(14), weight: .semibold)).foregroundStyle(ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: px(12))
            HStack(spacing: px(8)) {
                Spacer()
                Text("Answer").font(.system(size: px(12), weight: .bold)).foregroundStyle(ink)
                AnswerBox(value: showAnswer ? q["answer"] : nil, wide: true, ink: ink)
            }
        }
        .padding(px(12))
        .frame(maxWidth: .infinity, minHeight: tall ? px(264) : nil, alignment: .topLeading)
        .overlay(RoundedRectangle(cornerRadius: px(10)).stroke(ink, lineWidth: 1.2))
    }
}

/// The question's figure, if it has one — same registry the session uses,
/// grayscale with the contrast pushed (on-screen tints print as pale ghosts).
private struct PrintFigure: View {
    let question: [String: Any]
    let engine: EngineBridge
    let settled: Bool

    private var display: [String: Any] { question["display"] as? [String: Any] ?? [:] }

    var body: some View {
        figure
            .frame(maxWidth: px(240), alignment: .leading)
            .grayscale(1)
            .contrast(2.2)
    }

    @ViewBuilder
    private var figure: some View {
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
            ClockFaceView(hour: (clock["hour"] as? NSNumber)?.doubleValue ?? 12, minute: (clock["minute"] as? NSNumber)?.doubleValue ?? 0, numbered: true)
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
