import SwiftUI

/// The standardised play cards for the first-flight screens (§20): cream
/// card, name Nunito 700/14 left, Sun level pill right, the figure, then the
/// prompt in Fredoka 600 centred. The one full-bleed teal panel a screen is
/// allowed — it holds live play cards, never mascot art, and shows all four
/// tile tints in §08 order.
struct PlayCardPanel: View {
    @Environment(\.theme) private var theme

    var body: some View {
        VStack(spacing: 16) {
            multiplicationCard
            countingCard
            fractionsCard
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: 24).fill(Theme.teal))
    }

    private func card<Content: View>(
        _ name: String, level: Int, @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(spacing: 10) {
            HStack {
                Text(name)
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text("Level \(level)")
                    .font(theme.bodyFont(size: 12, weight: .bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(Theme.sun))
                    .foregroundStyle(Theme.ink)
            }
            content()
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.cream))
    }

    private func prompt(_ text: String) -> some View {
        Text(text)
            .font(theme.displayFont(size: 17))
            .foregroundStyle(Theme.ink)
    }

    // §08 tile tints with their pressed-edge shades, fixed reading order.
    private static let tints: [(fill: Color, edge: Color)] = [
        (Theme.seafoam, Theme.seafoamDeep),
        (Theme.tealMid, Theme.tealMidDeep),
        (Theme.apricot, Theme.apricotDeep),
        (Theme.sunLight, Theme.sunLightDeep),
    ]

    private var multiplicationCard: some View {
        card("Multiplication Meadow", level: 3) {
            Text("7 × 6")
                .font(theme.displayFont(size: 30))
                .foregroundStyle(Theme.ink)
            let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(Array([42, 36, 48, 40].enumerated()), id: \.offset) { index, value in
                    let tint = Self.tints[index]
                    Text("\(value)")
                        .font(theme.displayFont(size: 18))
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(tint.fill)
                                .shadow(color: tint.edge, radius: 0, x: 0, y: 4)
                        )
                }
            }
            .padding(.bottom, 4)
        }
    }

    private var countingCard: some View {
        card("Counting Chicks", level: 2) {
            // Bars in the fixed §09 ramp; axis Ink 15%, baseline only.
            let days: [(label: String, value: CGFloat, fill: Color)] = [
                ("Mon", 4, Theme.seafoam),
                ("Tue", 7, Theme.tealMid),
                ("Wed", 5, Theme.apricot),
                ("Thu", 3, Theme.sunLight),
            ]
            VStack(spacing: 6) {
                HStack(alignment: .bottom, spacing: 14) {
                    ForEach(days, id: \.label) { day in
                        VStack(spacing: 4) {
                            Rectangle()
                                .fill(day.fill)
                                .frame(width: 38, height: day.value * 10)
                            Text(day.label)
                                .font(theme.bodyFont(size: 11, weight: .bold))
                                .foregroundStyle(Theme.ink)
                        }
                    }
                }
                Rectangle()
                    .fill(Theme.ink.opacity(0.15))
                    .frame(height: 2)
                    .padding(.horizontal, 6)
                    .padding(.top, -26)
                    .offset(y: -20)
            }
            prompt("Which day had the most?")
        }
    }

    private var fractionsCard: some View {
        card("Fractions Feather", level: 1) {
            NumberLineHop()
                .frame(height: 64)
            prompt("How far did she hop?")
        }
    }
}

/// Number line 0–10 with Teal dots at 3 and 6 and the Sun hop arc between
/// them (§10: Sun is the measurement drawn on top).
private struct NumberLineHop: View {
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
                    path.addQuadCurve(
                        to: CGPoint(x: x(6), y: y - 4),
                        control: CGPoint(x: x(4.5), y: y - 34)
                    )
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
                    Circle()
                        .fill(Theme.teal)
                        .frame(width: 9, height: 9)
                        .position(x: x(CGFloat(value)), y: y)
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
