import SwiftUI

/// Visual answer widgets, batch 1 — ports of NumberLine.jsx, NumberBond.jsx,
/// AnalogClock.jsx, AngleFigure.jsx, DataGraph.jsx. Submission semantics match
/// the web exactly (all numeric through the shared submit path).

// MARK: - Number line (locate: tap a tick; jump: read a hop's distance)

struct NumberLineWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var picked: Double?

    private var minValue: Double { (display["min"] as? NSNumber)?.doubleValue ?? 0 }
    private var maxValue: Double { (display["max"] as? NSNumber)?.doubleValue ?? 10 }
    private var step: Double { (display["step"] as? NSNumber)?.doubleValue ?? 1 }
    private var from: Double? { (display["from"] as? NSNumber)?.doubleValue }
    private var to: Double? { (display["to"] as? NSNumber)?.doubleValue }
    private var labelEvery: Int { max(1, (display["labelEvery"] as? NSNumber)?.intValue ?? 1) }
    private var lineMode: String { display["lineMode"] as? String ?? "locate" }

    private var ticks: [Double] {
        var values: [Double] = []
        var v = minValue
        while v <= maxValue + 1e-9 {
            values.append((v * 10_000).rounded() / 10_000)
            v += step
        }
        return values
    }

    var body: some View {
        VStack(spacing: 14) {
            GeometryReader { proxy in
                lineCanvas(width: proxy.size.width)
                    .contentShape(Rectangle())
                    .onTapGesture { location in
                        guard lineMode == "locate", !disabled else { return }
                        picked = nearestTick(toX: location.x, width: proxy.size.width)
                    }
            }
            .frame(height: 96)
            .padding(12)
            .background(RoundedRectangle(cornerRadius: 24).fill(theme.cardBackground))

            if lineMode == "locate" {
                Text(picked == nil ? "Tap the number line" : "You picked \(AnswerFormatting.text(picked! as NSNumber))")
                    .font(.headline)
                    .fontDesign(.rounded)
                    .foregroundStyle(theme.textSecondary)
            }

            CheckButton(enabled: lineMode == "jump" || picked != nil) {
                if lineMode == "jump", let from, let to {
                    submit(abs(to - from))
                } else if let picked {
                    submit(picked == picked.rounded() ? Int(picked) as Any : picked as Any)
                }
            }
        }
        .disabled(disabled)
        .frame(maxWidth: 420)
    }

    private func xPosition(_ value: Double, width: CGFloat) -> CGFloat {
        let pad: CGFloat = 18
        let span = maxValue - minValue
        guard span > 0 else { return pad }
        return pad + CGFloat((value - minValue) / span) * (width - pad * 2)
    }

    private func nearestTick(toX x: CGFloat, width: CGFloat) -> Double? {
        ticks.min { abs(xPosition($0, width: width) - x) < abs(xPosition($1, width: width) - x) }
    }

    private func lineCanvas(width: CGFloat) -> some View {
        Canvas { ctx, size in
            let baseY: CGFloat = 62
            let pad: CGFloat = 18

            var line = Path()
            line.move(to: CGPoint(x: pad, y: baseY))
            line.addLine(to: CGPoint(x: size.width - pad, y: baseY))
            ctx.stroke(line, with: .color(FigureColors.ink), lineWidth: 3)

            // Arrowheads: the line continues in both directions.
            for (tip, back) in [(pad - 10, pad - 2), (size.width - pad + 10, size.width - pad + 2)] {
                var arrow = Path()
                arrow.move(to: CGPoint(x: tip, y: baseY))
                arrow.addLine(to: CGPoint(x: back, y: baseY - 5))
                arrow.addLine(to: CGPoint(x: back, y: baseY + 5))
                arrow.closeSubpath()
                ctx.fill(arrow, with: .color(FigureColors.ink))
            }

            for (index, value) in ticks.enumerated() {
                let major = index % labelEvery == 0
                let x = xPosition(value, width: size.width)
                var tick = Path()
                tick.move(to: CGPoint(x: x, y: baseY - (major ? 9 : 5)))
                tick.addLine(to: CGPoint(x: x, y: baseY + (major ? 9 : 5)))
                ctx.stroke(tick, with: .color(major ? FigureColors.ink : FigureColors.inkSoft), lineWidth: major ? 2.5 : 1.5)
                if major {
                    ctx.draw(
                        Text(AnswerFormatting.text(value as NSNumber))
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(FigureColors.ink),
                        at: CGPoint(x: x, y: baseY + 22)
                    )
                }
            }

            // The hop, drawn as an arc so it reads as a jump rather than a span.
            if lineMode == "jump", let from, let to {
                let x1 = xPosition(from, width: size.width)
                let x2 = xPosition(to, width: size.width)
                var hop = Path()
                hop.move(to: CGPoint(x: x1, y: baseY - 6))
                hop.addQuadCurve(to: CGPoint(x: x2, y: baseY - 6), control: CGPoint(x: (x1 + x2) / 2, y: baseY - 42))
                ctx.stroke(hop, with: .color(FigureColors.accent), lineWidth: 3)
                ctx.fill(Path(ellipseIn: CGRect(x: x1 - 6, y: baseY - 6, width: 12, height: 12)), with: .color(FigureColors.accent))
                ctx.fill(Path(ellipseIn: CGRect(x: x2 - 6, y: baseY - 6, width: 12, height: 12)), with: .color(FigureColors.warm))
            }

            if let picked {
                let x = xPosition(picked, width: size.width)
                ctx.fill(Path(ellipseIn: CGRect(x: x - 9, y: baseY - 9, width: 18, height: 18)), with: .color(FigureColors.accent))
            }
        }
    }
}

// MARK: - Number bond ("cherry" diagram; fill the missing part)

struct NumberBondWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""

    var body: some View {
        VStack(spacing: 12) {
            VStack(spacing: 0) {
                bondCircle(AnswerFormatting.text(display["whole"] ?? "?"), highlight: false)
                Canvas { ctx, size in
                    for targetX in [size.width / 2 - 40, size.width / 2 + 40] {
                        var branch = Path()
                        branch.move(to: CGPoint(x: size.width / 2, y: 2))
                        branch.addLine(to: CGPoint(x: targetX, y: size.height - 2))
                        ctx.stroke(branch, with: .color(theme.cardBorder), lineWidth: 3)
                    }
                }
                .frame(width: 140, height: 30)
                HStack(spacing: 40) {
                    bondCircle(AnswerFormatting.text(display["part"] ?? "?"), highlight: false)
                    bondCircle(entry.isEmpty ? "?" : entry, highlight: true)
                }
            }
            DigitPadView(entry: $entry) {
                if let value = Int(entry) { submit(value) }
                entry = ""
            }
        }
        .disabled(disabled)
    }

    private func bondCircle(_ text: String, highlight: Bool) -> some View {
        Text(text)
            .font(.title2.weight(.heavy))
            .fontDesign(.rounded)
            .frame(width: 64, height: 64)
            .background(Circle().fill(.white))
            .overlay(Circle().stroke(highlight ? FigureColors.accent : .clear, lineWidth: 4))
            .foregroundStyle(highlight ? FigureColors.accent : theme.textPrimary)
    }
}

// MARK: - Analog clock (read the time, type the answer)

struct AnalogClockWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""

    private var hour: Double { (display["hour"] as? NSNumber)?.doubleValue ?? 12 }
    private var minute: Double { (display["minute"] as? NSNumber)?.doubleValue ?? 0 }

    var body: some View {
        VStack(spacing: 12) {
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

            EntryReadout(entry: entry)
            DigitPadView(entry: $entry, maxLength: 2) {
                if let value = Int(entry) { submit(value) }
                entry = ""
            }
        }
        .disabled(disabled)
    }

    private func handPoint(center: CGPoint, length: CGFloat, angleDegrees: Double) -> CGPoint {
        let radians = angleDegrees * .pi / 180
        return CGPoint(x: center.x + length * sin(radians), y: center.y - length * cos(radians))
    }
}

// MARK: - Angle figure (two rays; type the degree measure)

struct AngleFigureWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""

    private var degrees: Double { (display["degrees"] as? NSNumber)?.doubleValue ?? 0 }

    var body: some View {
        VStack(spacing: 12) {
            Canvas { ctx, _ in
                let vertex = CGPoint(x: 20, y: 120)
                let length: CGFloat = 120
                let radians = degrees * .pi / 180

                var baseRay = Path()
                baseRay.move(to: vertex)
                baseRay.addLine(to: CGPoint(x: vertex.x + length, y: vertex.y))
                ctx.stroke(baseRay, with: .color(FigureColors.ink), style: StrokeStyle(lineWidth: 4, lineCap: .round))

                var ray = Path()
                ray.move(to: vertex)
                ray.addLine(to: CGPoint(x: vertex.x + length * cos(radians), y: vertex.y - length * sin(radians)))
                ctx.stroke(ray, with: .color(FigureColors.accent), style: StrokeStyle(lineWidth: 4, lineCap: .round))

                var arc = Path()
                arc.addArc(
                    center: vertex, radius: 26,
                    startAngle: .degrees(0), endAngle: .degrees(-degrees), clockwise: true
                )
                ctx.stroke(arc, with: .color(FigureColors.warm), lineWidth: 3)

                ctx.fill(Path(ellipseIn: CGRect(x: vertex.x - 4, y: vertex.y - 4, width: 8, height: 8)), with: .color(FigureColors.ink))
            }
            .frame(width: 160, height: 140)

            EntryReadout(entry: entry, suffix: entry.isEmpty ? "" : "°")
            DigitPadView(entry: $entry, maxLength: 3) {
                if let value = Int(entry) { submit(value) }
                entry = ""
            }
        }
        .disabled(disabled)
    }
}

// MARK: - Bar graph reader (read a value off a scaled chart)

struct DataGraphWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""

    private var bars: [(label: String, value: Double)] {
        (display["bars"] as? [[String: Any]] ?? []).map { bar in
            (bar["label"] as? String ?? "?", (bar["value"] as? NSNumber)?.doubleValue ?? 0)
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack(alignment: .bottom, spacing: 12) {
                let maxValue = max(1, bars.map(\.value).max() ?? 1)
                ForEach(Array(bars.enumerated()), id: \.offset) { _, bar in
                    VStack(spacing: 4) {
                        Text(AnswerFormatting.text(bar.value as NSNumber))
                            .font(.caption.weight(.bold))
                            .foregroundStyle(theme.textSecondary)
                        RoundedRectangle(cornerRadius: 5)
                            .fill(Color(red: 0.220, green: 0.741, blue: 0.973)) // sky-400
                            .frame(width: 40, height: bar.value / maxValue * 110 + 6)
                        Text(bar.label)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(theme.textSecondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                    }
                }
            }
            .frame(height: 170, alignment: .bottom)

            EntryReadout(entry: entry)
            DigitPadView(entry: $entry) {
                if let value = Int(entry) { submit(value) }
                entry = ""
            }
        }
        .disabled(disabled)
    }
}

/// Shared "Check" submit button (SUBMIT_BUTTON in the web kit).
struct CheckButton: View {
    @Environment(\.theme) private var theme
    let enabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("Check")
                .font(.title3.weight(.heavy))
                .fontDesign(.rounded)
                .padding(.horizontal, 32)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 16).fill(
                        LinearGradient(
                            colors: [FigureColors.accent, Color(red: 0.655, green: 0.545, blue: 0.980)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                    )
                )
                .foregroundStyle(.white)
                .opacity(enabled ? 1 : 0.4)
        }
        .disabled(!enabled)
        .buttonStyle(SpringButtonStyle())
    }
}
