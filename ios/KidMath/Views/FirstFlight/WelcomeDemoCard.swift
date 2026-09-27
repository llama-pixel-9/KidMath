import SwiftUI

/// The Welcome screen's "Try one" card (handoff 2a · 01): one white card on
/// the teal panel that cycles through three sample problems and is really
/// answerable — a right tap lights the tile teal and moves on, a wrong tap
/// shakes it. Nothing is scored or stored; it is the pitch.
struct WelcomeDemoCard: View {
    @Environment(\.theme) private var theme
    /// Compact (iPhone) shrinks the problem type and tiles.
    var compact = false

    private struct Sample {
        let mode: String
        let grade: String
        let answers: [String]
        let correct: String
        let figure: Figure
        enum Figure { case none, bars, hop }
    }

    private static let samples: [Sample] = [
        Sample(mode: "Multiplication Meadow", grade: "Grade 3", answers: ["42", "36", "48", "40"], correct: "42", figure: .none),
        Sample(mode: "Counting Chicks", grade: "Kindergarten", answers: ["Mon", "Tue", "Wed", "Thu"], correct: "Tue", figure: .bars),
        Sample(mode: "Fractions Feather", grade: "Grade 3", answers: ["2", "3", "4", "6"], correct: "3", figure: .hop),
    ]

    // §08 tile tints with their pressed-edge shades, fixed reading order.
    private static let tints: [(fill: Color, edge: Color)] = [
        (Theme.seafoam, Theme.seafoamDeep),
        (Theme.tealMid, Theme.tealMidDeep),
        (Theme.apricot, Theme.apricotDeep),
        (Theme.sunLight, Theme.sunLightDeep),
    ]

    @State private var index = 0
    @State private var picked: String?
    @State private var shaking: String?

    var body: some View {
        let sample = Self.samples[index]
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: compact ? 10 : 18) {
                HStack {
                    Text(sample.mode)
                        .font(theme.bodyFont(size: compact ? 16 : 17, weight: .bold))
                        .foregroundStyle(Theme.ink)
                    Spacer()
                    Text(sample.grade)
                        .font(theme.bodyFont(size: 13, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(Capsule().fill(Theme.apricot))
                }
                switch sample.figure {
                case .none:
                    Text("7 × 6")
                        .font(theme.displayFont(size: compact ? 40 : 56))
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity)
                case .bars:
                    DemoBars()
                        .frame(height: compact ? 96 : 110)
                    prompt("Which day had the most?")
                case .hop:
                    DemoNumberLine()
                        .frame(height: 64)
                    prompt("How far did she hop?")
                }
                let columns = [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)]
                LazyVGrid(columns: columns, spacing: 14) {
                    ForEach(Array(sample.answers.enumerated()), id: \.offset) { i, answer in
                        tile(answer, tint: Self.tints[i], correct: answer == sample.correct)
                    }
                }
            }
            .padding(compact ? 18 : 28)
            .background(RoundedRectangle(cornerRadius: 24).fill(Color.white))
            .id(index)
            .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .move(edge: .leading).combined(with: .opacity)))

            HStack(spacing: 10) {
                if !compact {
                    Text("Try one")
                        .font(theme.bodyFont(size: 15, weight: .bold))
                        .foregroundStyle(Theme.cream)
                }
                HStack(spacing: 6) {
                    ForEach(Self.samples.indices, id: \.self) { i in
                        Capsule()
                            .fill(Theme.cream.opacity(i == index ? 1 : 0.4))
                            .frame(width: i == index ? 22 : 8, height: 8)
                    }
                }
                .animation(.easeOut(duration: 0.2), value: index)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Sample \(index + 1) of \(Self.samples.count)")
        }
    }

    private func prompt(_ text: String) -> some View {
        Text(text)
            .font(theme.displayFont(size: compact ? 20 : 22))
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity)
    }

    private func tile(_ answer: String, tint: (fill: Color, edge: Color), correct: Bool) -> some View {
        let isPicked = picked == answer
        return Button {
            guard picked == nil else { return }
            if correct {
                picked = answer
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(700))
                    withAnimation(.spring(duration: 0.4)) {
                        index = (index + 1) % Self.samples.count
                        picked = nil
                    }
                }
            } else {
                withAnimation(.default) { shaking = answer }
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(350))
                    shaking = nil
                }
            }
        } label: {
            Text(answer)
                .font(theme.displayFont(size: compact ? 20 : 24))
                .foregroundStyle(isPicked ? Theme.cream : Theme.ink)
                .frame(maxWidth: .infinity)
                .frame(height: compact ? 52 : 68)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(isPicked ? Theme.teal : tint.fill)
                        .shadow(color: isPicked ? Theme.deepTeal : tint.edge, radius: 0, x: 0, y: 5)
                )
                .offset(x: shaking == answer ? -6 : 0)
                .animation(shaking == answer ? .default.repeatCount(3, autoreverses: true).speed(4) : .default, value: shaking)
        }
        .buttonStyle(SpringButtonStyle())
        .accessibilityLabel(answer)
    }
}

/// Bars in the fixed §09 ramp; axis Ink 15%, baseline only.
private struct DemoBars: View {
    @Environment(\.theme) private var theme
    private let days: [(label: String, value: CGFloat, fill: Color)] = [
        ("Mon", 4, Theme.seafoam), ("Tue", 7, Theme.tealMid), ("Wed", 5, Theme.apricot), ("Thu", 3, Theme.sunLight),
    ]

    var body: some View {
        GeometryReader { proxy in
            let barHeight = proxy.size.height - 22
            VStack(spacing: 0) {
                HStack(alignment: .bottom, spacing: 18) {
                    ForEach(days, id: \.label) { day in
                        Rectangle().fill(day.fill).frame(width: 44, height: barHeight * day.value / 7)
                    }
                }
                .frame(maxWidth: .infinity)
                Rectangle().fill(Theme.ink.opacity(0.15)).frame(height: 2)
                HStack(spacing: 18) {
                    ForEach(days, id: \.label) { day in
                        Text(day.label)
                            .font(theme.bodyFont(size: 12, weight: .bold))
                            .foregroundStyle(Theme.ink)
                            .frame(width: 44)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
            }
        }
    }
}

/// Number line 0–10 with Teal dots at 3 and 6 and the Sun hop arc between
/// them (§10: Sun is the measurement drawn on top).
private struct DemoNumberLine: View {
    @Environment(\.theme) private var theme

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let inset: CGFloat = 12
            let y = proxy.size.height - 22
            let x = { (value: CGFloat) in inset + value / 10 * (width - inset * 2) }
            ZStack(alignment: .topLeading) {
                Path { path in
                    path.move(to: CGPoint(x: x(3), y: y - 4))
                    path.addQuadCurve(to: CGPoint(x: x(6), y: y - 4), control: CGPoint(x: x(4.5), y: y - 34))
                }
                .stroke(Theme.sun, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                Path { path in
                    path.move(to: CGPoint(x: x(0), y: y))
                    path.addLine(to: CGPoint(x: x(10), y: y))
                    for value in 0...10 {
                        path.move(to: CGPoint(x: x(CGFloat(value)), y: y - 5))
                        path.addLine(to: CGPoint(x: x(CGFloat(value)), y: y + 5))
                    }
                }
                .stroke(Theme.ink, lineWidth: 1.5)
                ForEach([3, 6], id: \.self) { value in
                    Circle().fill(Theme.teal).frame(width: 9, height: 9).position(x: x(CGFloat(value)), y: y)
                }
                ForEach([0, 2, 4, 6, 8, 10], id: \.self) { value in
                    Text("\(value)")
                        .font(theme.bodyFont(size: 10, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .position(x: x(CGFloat(value)), y: y + 14)
                }
            }
        }
    }
}
