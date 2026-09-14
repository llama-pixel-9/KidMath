import SwiftUI

/// Port of Scaffold.jsx: the model shown on a first miss — dots (with the
/// taken-away ones crossed), an array, a fraction strip, or a number line —
/// under its one-line hint. "look" shows only the hint.
struct ScaffoldView: View {
    @Environment(\.theme) private var theme
    let scaffold: [String: Any]
    let hint: String

    private var kind: String { scaffold["kind"] as? String ?? "look" }

    var body: some View {
        VStack(spacing: 12) {
            Text(hint)
                .font(theme.bodyFont(size: 14, weight: .bold))
                .foregroundStyle(Theme.ink.opacity(0.8))
                .multilineTextAlignment(.center)
            switch kind {
            case "dots":
                dots(groups: (scaffold["groups"] as? [Any] ?? []).map { ($0 as? NSNumber)?.intValue ?? 0 },
                     takeAway: (scaffold["takeAway"] as? NSNumber)?.intValue)
            case "array":
                arrayGrid(rows: int("rows"), cols: int("cols"))
            case "strip":
                strip(den: int("den"), shaded: int("shaded"))
            case "numberLine":
                line(min: int("min"), max: int("max"), mark: int("mark"))
            default:
                EmptyView()
            }
        }
        .padding(.top, 12)
        .overlay(alignment: .top) { Rectangle().fill(Theme.ink.opacity(0.1)).frame(height: 1) }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(scaffold["label"] as? String ?? hint)
    }

    private func int(_ key: String) -> Int { (scaffold[key] as? NSNumber)?.intValue ?? 0 }

    private func dots(groups: [Int], takeAway: Int?) -> some View {
        let total = groups.reduce(0, +)
        var drawn = 0
        let rows: [[(index: Int, group: Int)]] = groups.enumerated().map { gi, count in
            (0..<max(0, count)).map { _ in defer { drawn += 1 }; return (drawn, gi) }
        }
        return VStack(spacing: 8) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                let columns = Array(repeating: GridItem(.fixed(24), spacing: 6), count: min(10, max(1, row.count)))
                LazyVGrid(columns: columns, spacing: 6) {
                    ForEach(row, id: \.index) { dot in
                        let crossed = takeAway.map { dot.index >= total - $0 } ?? false
                        Circle()
                            .fill(dot.group == 0 ? Theme.teal : Theme.ember)
                            .frame(width: 24, height: 24)
                            .opacity(crossed ? 0.3 : 1)
                            .overlay {
                                if crossed {
                                    Rectangle().fill(Theme.ink).frame(width: 30, height: 2.5).rotationEffect(.degrees(-45))
                                }
                            }
                    }
                }
                .frame(maxWidth: 280)
            }
        }
    }

    private func arrayGrid(rows: Int, cols: Int) -> some View {
        let columns = Array(repeating: GridItem(.fixed(20), spacing: 6), count: max(1, min(cols, 12)))
        return LazyVGrid(columns: columns, spacing: 6) {
            ForEach(0..<max(0, rows * cols), id: \.self) { _ in
                Circle().fill(Theme.teal).frame(width: 20, height: 20)
            }
        }
        .frame(maxWidth: CGFloat(max(1, min(cols, 12))) * 26)
    }

    private func strip(den: Int, shaded: Int) -> some View {
        HStack(spacing: 0) {
            ForEach(0..<max(1, den), id: \.self) { i in
                Rectangle()
                    .fill(i < shaded ? Theme.teal : Color.white)
                    .overlay(alignment: .trailing) {
                        if i < den - 1 { Rectangle().fill(Theme.ink.opacity(0.4)).frame(width: 1) }
                    }
            }
        }
        .frame(maxWidth: 300)
        .frame(height: 36)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink.opacity(0.6), lineWidth: 2))
    }

    private func line(min lo: Int, max hi: Int, mark: Int) -> some View {
        Canvas { ctx, size in
            let w = size.width, y: CGFloat = 30
            let span = CGFloat(max(1, hi - lo))
            func x(_ n: Int) -> CGFloat { 16 + CGFloat(n - lo) / span * (w - 32) }
            var axis = Path()
            axis.move(to: CGPoint(x: 8, y: y)); axis.addLine(to: CGPoint(x: w - 8, y: y))
            ctx.stroke(axis, with: .color(FigureColors.inkSoft), lineWidth: 2.5)
            let step = max(1, Int((Double(hi - lo) / 10).rounded(.up)))
            for n in stride(from: lo, through: hi, by: step) {
                var tick = Path()
                tick.move(to: CGPoint(x: x(n), y: y - 6)); tick.addLine(to: CGPoint(x: x(n), y: y + 6))
                ctx.stroke(tick, with: .color(FigureColors.inkSoft), lineWidth: 2)
                ctx.draw(Text(String(n)).font(.system(size: 12, weight: .bold)).foregroundColor(FigureColors.ink),
                         at: CGPoint(x: x(n), y: y + 20), anchor: .center)
            }
            ctx.fill(Path(ellipseIn: CGRect(x: x(mark) - 7, y: y - 7, width: 14, height: 14)), with: .color(Theme.teal))
        }
        .frame(maxWidth: 320)
        .frame(height: 60)
    }
}
