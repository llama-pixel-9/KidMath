import SwiftUI

// Figures drawn WITH the question (read, not answered into) — the Swift half
// of src/components/figureRegistry.js. Each view mirrors its .jsx sibling's
// viewBox geometry so the figure reads the same on both platforms:
//
//   PictographView        Pictograph.jsx     display.rows / keyValue
//   TallyChartView        TallyChart.jsx     display.rows
//   LinePlotView          LinePlot.jsx       display.points / axisLabel
//   AreaFigureView        AreaFigure.jsx     spec from KidMath.areaFigureSpec
//   SequenceNumberLineView QuestionDisplay.jsx SequenceNumberLine
//
// Adding one here means adding it to IOS_MIRRORED_FIGURES in
// src/itemBank/figureContracts.js too — that list is what lets the web CI
// assert the mode's items are drawable on iOS.

/// Scales a fixed SVG-style viewBox to the available width (like an
/// `<svg viewBox>` with `width:100%`), capping the height like `max-h-[40vh]`.
private struct ViewBoxCanvas<Content: View>: View {
    let width: CGFloat
    let height: CGFloat
    var maxWidth: CGFloat = 360
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .frame(width: width, height: height)
            .scaledToFitBox(width: width, height: height, maxWidth: maxWidth)
    }
}

private extension View {
    func scaledToFitBox(width: CGFloat, height: CGFloat, maxWidth: CGFloat) -> some View {
        GeometryReader { geo in
            let scale = min(min(geo.size.width, maxWidth) / width, 1.25)
            self
                .scaleEffect(scale, anchor: .topLeading)
                .frame(width: width * scale, height: height * scale, alignment: .topLeading)
                .frame(maxWidth: .infinity, alignment: .center)
        }
        .frame(height: height * min(1.25, maxWidth / width), alignment: .top)
        .frame(maxWidth: .infinity)
    }
}

private func num(_ v: Any?) -> Double? {
    if let n = v as? NSNumber { return n.doubleValue }
    if let s = v as? String, let d = Double(s) { return d }
    return nil
}

private func label(_ v: Double?, unit: String, unknown: Bool = false) -> String {
    guard !unknown, let v else { return "?" }
    let text = v == v.rounded() ? String(Int(v)) : String(v)
    return unit.isEmpty ? text : "\(text) \(unit)"
}

// MARK: - Pictograph

struct PictographView: View {
    let rows: [[String: Any]]
    let keyValue: Double
    /// The PRINTED chart (worksheets): black symbols inside a ruled table —
    /// mirror of Pictograph.jsx `paper`.
    var paper = false
    private var symbolColor: Color { paper ? .black : FigureColors.accent }

    private let viewW: CGFloat = 340
    private let rowH: CGFloat = 34
    private let keyH: CGFloat = 34
    private let padTop: CGFloat = 6
    private let labelW: CGFloat = 84
    private let symbolR: CGFloat = 9
    private let symbolGap: CGFloat = 24

    private var height: CGFloat { padTop + CGFloat(rows.count) * rowH + keyH }
    private var anyHalf: Bool { rows.contains { ($0["half"] as? Bool) == true } }

    var body: some View {
        ViewBoxCanvas(width: viewW, height: height) {
            Canvas { ctx, _ in
                let secondary = paper ? Color.black : FigureColors.inkSoft
                if paper { ruledTable(&ctx, top: padTop, rowHeight: rowH, rowCount: rows.count, width: viewW, divider: labelW) }
                for (i, r) in rows.enumerated() {
                    let cy = padTop + CGFloat(i) * rowH + rowH / 2
                    let name = r["label"] as? String ?? "?"
                    let symbols = Int(num(r["symbols"]) ?? 0)
                    let half = (r["half"] as? Bool) == true
                    ctx.draw(
                        Text(name).font(.system(size: 13, weight: .bold)).foregroundColor(secondary),
                        at: CGPoint(x: labelW - 10, y: cy), anchor: .trailing
                    )
                    for s in 0..<max(0, symbols) {
                        symbol(&ctx, cx: labelW + symbolGap / 2 + CGFloat(s) * symbolGap, cy: cy, half: false)
                    }
                    if half {
                        symbol(&ctx, cx: labelW + symbolGap / 2 + CGFloat(symbols) * symbolGap, cy: cy, half: true)
                    }
                }
                // The key, boxed off from the data like a printed chart.
                let ruleY = padTop + CGFloat(rows.count) * rowH + 6
                var rule = Path()
                rule.move(to: CGPoint(x: 8, y: ruleY))
                rule.addLine(to: CGPoint(x: viewW - 8, y: ruleY))
                if !paper { ctx.stroke(rule, with: .color(secondary.opacity(0.3)), lineWidth: 1) }
                let keyY = height - 14
                ctx.draw(Text("Key:").font(.system(size: 13, weight: .bold)).foregroundColor(secondary),
                         at: CGPoint(x: 10, y: keyY), anchor: .leading)
                symbol(&ctx, cx: 56, cy: keyY, half: false)
                ctx.draw(Text("= \(label(keyValue, unit: ""))").font(.system(size: 13, weight: .bold)).foregroundColor(secondary),
                         at: CGPoint(x: 70, y: keyY), anchor: .leading)
                if anyHalf {
                    symbol(&ctx, cx: 128, cy: keyY, half: true)
                    ctx.draw(Text("= \(label(keyValue / 2, unit: ""))").font(.system(size: 13, weight: .bold)).foregroundColor(secondary),
                             at: CGPoint(x: 142, y: keyY), anchor: .leading)
                }
            }
        }
        .accessibilityLabel(
            "Pictograph. Each symbol stands for \(label(keyValue, unit: "")). " +
            rows.map { "\($0["label"] as? String ?? "") \(Int(num($0["symbols"]) ?? 0))\(($0["half"] as? Bool) == true ? " and a half" : "") symbols" }
                .joined(separator: ", ")
        )
    }

    private func symbol(_ ctx: inout GraphicsContext, cx: CGFloat, cy: CGFloat, half: Bool) {
        let rect = CGRect(x: cx - symbolR, y: cy - symbolR, width: symbolR * 2, height: symbolR * 2)
        if !half {
            ctx.fill(Path(ellipseIn: rect), with: .color(symbolColor))
            return
        }
        ctx.stroke(Path(ellipseIn: rect), with: .color(symbolColor), lineWidth: 1.5)
        // Left half only: "half of one symbol" has to look like half of one.
        var p = Path()
        p.move(to: CGPoint(x: cx, y: cy - symbolR))
        p.addArc(center: CGPoint(x: cx, y: cy), radius: symbolR,
                 startAngle: .degrees(-90), endAngle: .degrees(90), clockwise: true)
        p.closeSubpath()
        ctx.fill(p, with: .color(symbolColor))
    }
}

/// The frame a printed picture graph or tally chart sits in: an outer box, a
/// rule under every row, and a divider between labels and data.
private func ruledTable(_ ctx: inout GraphicsContext, top: CGFloat, rowHeight: CGFloat, rowCount: Int, width: CGFloat, divider: CGFloat) {
    let bottom = top + CGFloat(rowCount) * rowHeight
    var p = Path()
    p.addRect(CGRect(x: 1, y: top, width: width - 2, height: bottom - top))
    p.move(to: CGPoint(x: divider, y: top))
    p.addLine(to: CGPoint(x: divider, y: bottom))
    for i in 1..<max(rowCount, 1) {
        p.move(to: CGPoint(x: 1, y: top + CGFloat(i) * rowHeight))
        p.addLine(to: CGPoint(x: width - 1, y: top + CGFloat(i) * rowHeight))
    }
    ctx.stroke(p, with: .color(.black), lineWidth: 1.2)
}

// MARK: - Tally chart

struct TallyChartView: View {
    let rows: [[String: Any]]
    /// The PRINTED chart (worksheets): ruled into a table, black marks.
    var paper = false

    private let viewW: CGFloat = 340
    private let rowH: CGFloat = 40
    private let padTop: CGFloat = 8
    private let labelW: CGFloat = 84
    private let markH: CGFloat = 22
    private let markGap: CGFloat = 6
    private let gateGap: CGFloat = 16
    private var gateW: CGFloat { markGap * 3 }
    private var height: CGFloat { padTop * 2 + CGFloat(rows.count) * rowH }

    var body: some View {
        ViewBoxCanvas(width: viewW, height: height) {
            Canvas { ctx, _ in
                let ink = paper ? Color.black : FigureColors.inkSoft
                if paper { ruledTable(&ctx, top: padTop, rowHeight: rowH, rowCount: rows.count, width: viewW, divider: labelW - 4) }
                for (i, r) in rows.enumerated() {
                    let cy = padTop + CGFloat(i) * rowH + rowH / 2
                    let name = r["label"] as? String ?? "?"
                    let count = max(0, Int(num(r["count"]) ?? 0))
                    ctx.draw(Text(name).font(.system(size: 13, weight: .bold)).foregroundColor(ink),
                             at: CGPoint(x: labelW - 10, y: cy), anchor: .trailing)
                    var gates = Array(repeating: 5, count: count / 5)
                    if count % 5 != 0 { gates.append(count % 5) }
                    for (g, n) in gates.enumerated() {
                        gate(&ctx, x: labelW + CGFloat(g) * (gateW + gateGap), cy: cy, count: n, color: ink)
                    }
                }
            }
        }
        .accessibilityLabel("Tally chart. " + rows.map { "\($0["label"] as? String ?? "") \(Int(num($0["count"]) ?? 0))" }.joined(separator: ", "))
    }

    /// Four uprights with the fifth struck through — the gate is what makes a
    /// tally countable by fives (the `tallyFifthMiscount` misconception).
    private func gate(_ ctx: inout GraphicsContext, x: CGFloat, cy: CGFloat, count: Int, color: Color) {
        let top = cy - markH / 2
        let bottom = cy + markH / 2
        let style = StrokeStyle(lineWidth: 2.5, lineCap: .round)
        for i in 0..<min(count, 4) {
            var p = Path()
            p.move(to: CGPoint(x: x + CGFloat(i) * markGap, y: top))
            p.addLine(to: CGPoint(x: x + CGFloat(i) * markGap, y: bottom))
            ctx.stroke(p, with: .color(color), style: style)
        }
        if count == 5 {
            var p = Path()
            p.move(to: CGPoint(x: x - 4, y: bottom - 3))
            p.addLine(to: CGPoint(x: x + gateW + 4, y: top + 3))
            ctx.stroke(p, with: .color(color), style: style)
        }
    }
}

// MARK: - Line plot

struct LinePlotView: View {
    let points: [[String: Any]]
    let axisLabel: String?

    private let viewW: CGFloat = 340
    private let padLeft: CGFloat = 26
    private let padRight: CGFloat = 26
    private let padTop: CGFloat = 10
    private let axisLabelH: CGFloat = 34
    private let markStep: CGFloat = 15

    private var tallest: Int { max(1, points.map { Int(num($0["count"]) ?? 0) }.max() ?? 1) }
    private var plotH: CGFloat { CGFloat(tallest) * markStep + 8 }
    private var axisY: CGFloat { padTop + plotH }
    private var height: CGFloat { axisY + axisLabelH }

    var body: some View {
        ViewBoxCanvas(width: viewW, height: height) {
            Canvas { ctx, _ in
                let ink = FigureColors.inkSoft
                let span = viewW - padLeft - padRight
                let gap = points.count > 1 ? span / CGFloat(points.count - 1) : 0
                func x(_ i: Int) -> CGFloat { padLeft + CGFloat(i) * gap }

                var axis = Path()
                axis.move(to: CGPoint(x: padLeft - 14, y: axisY))
                axis.addLine(to: CGPoint(x: viewW - padRight + 14, y: axisY))
                ctx.stroke(axis, with: .color(ink), lineWidth: 2)

                for (i, p) in points.enumerated() {
                    var tick = Path()
                    tick.move(to: CGPoint(x: x(i), y: axisY))
                    tick.addLine(to: CGPoint(x: x(i), y: axisY + 5))
                    ctx.stroke(tick, with: .color(ink), lineWidth: 2)
                    let value = p["value"].map { AnswerFormatting.text($0) } ?? "?"
                    ctx.draw(Text(value).font(.system(size: 12, weight: .bold)).foregroundColor(ink),
                             at: CGPoint(x: x(i), y: axisY + 15), anchor: .center)
                    let count = max(0, Int(num(p["count"]) ?? 0))
                    // Every tick is drawn whether or not it has data: a value
                    // with no ✕ above it is exactly what range questions ask.
                    for m in 0..<count {
                        ctx.draw(Text("✕").font(.system(size: 14, weight: .black)).foregroundColor(FigureColors.accent),
                                 at: CGPoint(x: x(i), y: axisY - 13 - CGFloat(m) * markStep), anchor: .center)
                    }
                }
                if let axisLabel, !axisLabel.isEmpty {
                    ctx.draw(Text(axisLabel).font(.system(size: 12, weight: .bold)).foregroundColor(ink),
                             at: CGPoint(x: viewW / 2, y: height - 8), anchor: .center)
                }
            }
        }
        .accessibilityLabel("Line plot. " + points.map { "\($0["value"].map { AnswerFormatting.text($0) } ?? ""): \(Int(num($0["count"]) ?? 0))" }.joined(separator: ", "))
    }
}

// MARK: - Area & perimeter figure

/// Draws the spec `KidMath.areaFigureSpec(question)` returns (shared with the
/// web — see src/figures/areaFigureSpec.js for the payload sources and
/// drawing rules). Perimeter items get a heavy boundary and no fill; area
/// items a tinted interior, gridded into unit squares when countable.
struct AreaFigureView: View {
    let spec: [String: Any]

    private let viewW: CGFloat = 320
    private let maxW: CGFloat = 230
    private let maxH: CGFloat = 150
    private let minRatio: CGFloat = 0.3

    private var unit: String { spec["unit"] as? String ?? "" }
    private var perim: Bool { (spec["perim"] as? Bool) == true }
    private var grid: Bool { (spec["grid"] as? Bool) == true }
    private var shape: String { spec["shape"] as? String ?? "" }

    private struct Fit { let pw: CGFloat; let ph: CGFloat; let s: CGFloat; let clamped: Bool }

    /// Scale so the largest extent fits; squash extreme aspects (notes it).
    private func fit(_ wUnits: CGFloat, _ hUnits: CGFloat) -> Fit {
        var w = wUnits, h = hUnits, clamped = false
        if h / w < minRatio { h = w * minRatio; clamped = true }
        if w / h < minRatio { w = h * minRatio; clamped = true }
        let s = min(maxW / w, maxH / h)
        return Fit(pw: w * s, ph: h * s, s: s, clamped: clamped)
    }

    private var layout: (height: CGFloat, note: String?) {
        switch shape {
        case "rect":
            let w = num(spec["w"]) ?? 1
            let h = num(spec["h"]) ?? max(1, (w * 0.6).rounded())
            let f = fit(w, h)
            return (14 + f.ph + 34, f.clamped ? "not drawn to scale" : nil)
        case "cut":
            let f = fit(num(spec["W"]) ?? 1, num(spec["H"]) ?? 1)
            return (14 + f.ph + 34, f.clamped ? "not drawn to scale" : nil)
        case "join":
            let a = num(spec["a"]) ?? 1, b = num(spec["b"]) ?? 1, c = num(spec["c"]) ?? 1, d = num(spec["d"]) ?? 1
            let f = fit(a + c, max(b, d))
            let s = min(f.pw / (a + c), f.ph / max(b, d))
            return (14 + max(b, d) * s + 34, f.clamped ? "not drawn to scale" : nil)
        case "split":
            let a = num(spec["a"]) ?? 1, b = num(spec["b"]) ?? 1, t = num(spec["T"]) ?? a * b
            let otherW = max(1, ((t - a * b) / b).rounded())
            let f = fit(a + otherW, b)
            let s = min(f.pw / (a + otherW), f.ph / b)
            return (14 + b * s + 34, nil)
        case "pair":
            let rects = (spec["rects"] as? [[Any]] ?? []).map { $0.compactMap(num) }
            guard rects.count == 2, rects[0].count == 2, rects[1].count == 2 else { return (200, nil) }
            let maxHv = max(rects[0][1], rects[1][1])
            let totalW = rects[0][0] + rects[1][0]
            let s = min((maxW + 40) / (totalW + max(2, totalW * 0.18)), maxH / maxHv)
            return (14 + maxHv * s + 34, nil)
        default:
            return (200, nil)
        }
    }

    var body: some View {
        let (height, note) = layout
        VStack(spacing: 4) {
            ViewBoxCanvas(width: viewW + 40, height: height) {
                Canvas { ctx, _ in draw(&ctx) }
            }
            if let note {
                Text(note).font(.system(size: 12, weight: .semibold)).foregroundStyle(FigureColors.inkSoft)
            }
        }
        .accessibilityLabel("Shape with its measurements")
    }

    private func draw(_ ctx: inout GraphicsContext) {
        switch shape {
        case "rect":
            let w = num(spec["w"]) ?? 1
            let hKnown = num(spec["h"])
            let h = hKnown ?? max(1, (w * 0.6).rounded())
            let f = fit(w, h)
            let x = (viewW - f.pw) / 2 + 20
            rect(&ctx, x: x, y: 14, w: f.pw, h: f.ph, wUnits: w, hUnits: hKnown, perim: perim, grid: grid, unknownH: hKnown == nil)
        case "cut":
            let W = num(spec["W"]) ?? 1, H = num(spec["H"]) ?? 1, w = num(spec["w"]) ?? 0, h = num(spec["h"]) ?? 0
            let f = fit(W, H)
            let x = (viewW - f.pw) / 2 + 20, y: CGFloat = 14
            let cw = (w / W) * f.pw, ch = (h / H) * f.ph
            var p = Path()
            p.move(to: CGPoint(x: x, y: y))
            p.addLine(to: CGPoint(x: x + f.pw - cw, y: y))
            p.addLine(to: CGPoint(x: x + f.pw - cw, y: y + ch))
            p.addLine(to: CGPoint(x: x + f.pw, y: y + ch))
            p.addLine(to: CGPoint(x: x + f.pw, y: y + f.ph))
            p.addLine(to: CGPoint(x: x, y: y + f.ph))
            p.closeSubpath()
            if !perim { ctx.fill(p, with: .color(FigureColors.fill)) }
            ctx.stroke(p, with: .color(FigureColors.ink), lineWidth: perim ? 4 : 2.5)
            ctx.stroke(Path(CGRect(x: x + f.pw - cw, y: y, width: cw, height: ch)),
                       with: .color(FigureColors.inkSoft), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
            text(&ctx, label(W, unit: unit), at: CGPoint(x: x + f.pw / 2, y: y + f.ph + 14), size: 15, color: FigureColors.ink)
            text(&ctx, label(H, unit: unit), at: CGPoint(x: x - 8, y: y + f.ph / 2), size: 15, color: FigureColors.ink, anchor: .trailing)
            text(&ctx, label(w, unit: unit), at: CGPoint(x: x + f.pw - cw / 2, y: y - 8), size: 13, color: FigureColors.warm)
            text(&ctx, label(h, unit: unit), at: CGPoint(x: x + f.pw + 6, y: y + ch / 2), size: 13, color: FigureColors.warm, anchor: .leading)
        case "join":
            let a = num(spec["a"]) ?? 1, b = num(spec["b"]) ?? 1, c = num(spec["c"]) ?? 1, d = num(spec["d"]) ?? 1
            let totalW = a + c, totalH = max(b, d)
            let f = fit(totalW, totalH)
            let s = min(f.pw / totalW, f.ph / totalH)
            let x = (viewW - totalW * s) / 2 + 20
            let base = 14 + totalH * s
            rect(&ctx, x: x, y: base - b * s, w: a * s, h: b * s, wUnits: a, hUnits: b, perim: perim, grid: grid)
            rect(&ctx, x: x + a * s, y: base - d * s, w: c * s, h: d * s, wUnits: c, hUnits: d, perim: perim, grid: grid, labels: false)
            text(&ctx, label(c, unit: unit), at: CGPoint(x: x + a * s + (c * s) / 2, y: base + 14), size: 15, color: FigureColors.ink)
            text(&ctx, label(d, unit: unit), at: CGPoint(x: x + totalW * s + 8, y: base - (d * s) / 2), size: 15, color: FigureColors.ink, anchor: .leading)
        case "split":
            let a = num(spec["a"]) ?? 1, b = num(spec["b"]) ?? 1, t = num(spec["T"]) ?? a * b
            let otherW = max(1, ((t - a * b) / b).rounded())
            let totalW = a + otherW
            let f = fit(totalW, b)
            let s = min(f.pw / totalW, f.ph / b)
            let x = (viewW - totalW * s) / 2 + 20, y: CGFloat = 14
            rect(&ctx, x: x, y: y, w: a * s, h: b * s, wUnits: a, hUnits: b, perim: false, grid: grid)
            ctx.stroke(Path(CGRect(x: x + a * s, y: y, width: otherW * s, height: b * s)),
                       with: .color(FigureColors.warm), style: StrokeStyle(lineWidth: 2.5, dash: [6, 5]))
            text(&ctx, "?", at: CGPoint(x: x + a * s + (otherW * s) / 2, y: y + (b * s) / 2), size: 22, color: FigureColors.warm)
            let unitLabel = unit.isEmpty ? "" : "square \(unit)"
            text(&ctx, "\(label(t, unit: unitLabel)) in all", at: CGPoint(x: x + (totalW * s) / 2, y: y - 8), size: 13, color: FigureColors.inkSoft)
        case "pair":
            let rects = (spec["rects"] as? [[Any]] ?? []).map { $0.compactMap(num) }
            guard rects.count == 2, rects[0].count == 2, rects[1].count == 2 else { return }
            let (a, b, c, d) = (rects[0][0], rects[0][1], rects[1][0], rects[1][1])
            let maxHv = max(b, d), totalW = a + c
            let s = min((maxW + 40) / (totalW + max(2, totalW * 0.18)), maxH / maxHv)
            let gap: CGFloat = 34
            let x1 = (viewW - (totalW * s + gap)) / 2 + 20
            let base = 14 + maxHv * s
            rect(&ctx, x: x1, y: base - b * s, w: a * s, h: b * s, wUnits: a, hUnits: b, perim: perim, grid: grid)
            rect(&ctx, x: x1 + a * s + gap, y: base - d * s, w: c * s, h: d * s, wUnits: c, hUnits: d, perim: perim, grid: grid)
        default:
            break
        }
    }

    private func rect(_ ctx: inout GraphicsContext, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat,
                      wUnits: Double, hUnits: Double?, perim: Bool, grid: Bool,
                      unknownH: Bool = false, labels: Bool = true) {
        let r = CGRect(x: x, y: y, width: w, height: h)
        let p = Path(roundedRect: r, cornerRadius: 2)
        if !perim { ctx.fill(p, with: .color(FigureColors.fill)) }
        ctx.stroke(p, with: .color(FigureColors.ink), lineWidth: perim ? 4 : 2.5)
        if grid, let hUnits, wUnits >= 1, hUnits >= 1, wUnits * hUnits <= 60 {
            let cw = w / wUnits, ch = h / hUnits
            var lines = Path()
            for i in 1..<max(1, Int(wUnits)) {
                lines.move(to: CGPoint(x: x + CGFloat(i) * cw, y: y))
                lines.addLine(to: CGPoint(x: x + CGFloat(i) * cw, y: y + h))
            }
            for j in 1..<max(1, Int(hUnits)) {
                lines.move(to: CGPoint(x: x, y: y + CGFloat(j) * ch))
                lines.addLine(to: CGPoint(x: x + w, y: y + CGFloat(j) * ch))
            }
            ctx.stroke(lines, with: .color(FigureColors.inkSoft), lineWidth: 1)
        }
        if labels {
            text(&ctx, label(wUnits, unit: unit), at: CGPoint(x: x + w / 2, y: y + h + 14), size: 15, color: FigureColors.ink)
            text(&ctx, label(hUnits, unit: unit, unknown: unknownH), at: CGPoint(x: x - 8, y: y + h / 2), size: 15,
                 color: unknownH ? FigureColors.warm : FigureColors.ink, anchor: .trailing)
        }
    }

    private func text(_ ctx: inout GraphicsContext, _ s: String, at p: CGPoint, size: CGFloat, color: Color, anchor: UnitPoint = .center) {
        ctx.draw(Text(s).font(.system(size: size, weight: .heavy)).foregroundColor(color), at: p, anchor: anchor)
    }
}

// MARK: - Sequence number line (counting patterns, unit step)

/// Mirror of SequenceNumberLine in QuestionDisplay.jsx: only for unit-step
/// integer sequences whose span (with the answer) fits in ten ticks. The
/// answer tick shows "?" until the answer is judged.
struct SequenceNumberLineView: View {
    let sequence: [Int]
    let answer: Int
    let revealed: Bool

    static func eligible(sequence: [Any]?, step: Any?, answer: Any?) -> (seq: [Int], answer: Int)? {
        guard let stepValue = num(step), abs(stepValue) == 1,
              let raw = sequence, !raw.isEmpty,
              let ans = num(answer), ans == ans.rounded() else { return nil }
        var ints: [Int] = []
        for item in raw {
            guard let v = num(item), v == v.rounded() else { return nil }
            ints.append(Int(v))
        }
        let nums = ints + [Int(ans)]
        guard let lo = nums.min(), let hi = nums.max(), (hi + 1) - (lo - 1) <= 10 else { return nil }
        return (ints, Int(ans))
    }

    private let w: CGFloat = 320
    private let pad: CGFloat = 22
    private let y: CGFloat = 26

    var body: some View {
        let nums = sequence + [answer]
        let lo = (nums.min() ?? 0) - 1
        let hi = (nums.max() ?? 0) + 1
        let inSequence = Set(sequence)
        ViewBoxCanvas(width: w, height: 64, maxWidth: 320) {
            Canvas { ctx, _ in
                func x(_ n: Int) -> CGFloat { pad + CGFloat(n - lo) * (w - 2 * pad) / CGFloat(max(1, hi - lo)) }
                var axis = Path()
                axis.move(to: CGPoint(x: pad - 8, y: y))
                axis.addLine(to: CGPoint(x: w - pad + 8, y: y))
                ctx.stroke(axis, with: .color(FigureColors.inkSoft), lineWidth: 2.5)
                for n in lo...hi {
                    var tick = Path()
                    tick.move(to: CGPoint(x: x(n), y: y - 6))
                    tick.addLine(to: CGPoint(x: x(n), y: y + 6))
                    ctx.stroke(tick, with: .color(FigureColors.inkSoft), lineWidth: 2)
                    if inSequence.contains(n) {
                        ctx.fill(Path(ellipseIn: CGRect(x: x(n) - 6, y: y - 6, width: 12, height: 12)), with: .color(FigureColors.accent))
                    }
                    if n == answer {
                        ctx.stroke(Path(ellipseIn: CGRect(x: x(n) - 8, y: y - 8, width: 16, height: 16)), with: .color(FigureColors.warm), lineWidth: 2.5)
                    }
                    let isAnswer = n == answer
                    ctx.draw(
                        Text(isAnswer && !revealed ? "?" : String(n))
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(isAnswer ? FigureColors.warm : FigureColors.ink),
                        at: CGPoint(x: x(n), y: y + 22), anchor: .center
                    )
                }
            }
        }
        .accessibilityLabel("Number line for the counting pattern")
    }
}
