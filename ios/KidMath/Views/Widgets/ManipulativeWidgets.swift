import SwiftUI

/// Visual answer widgets, batch 2 — ports of CoinTray.jsx, FractionInput.jsx,
/// FractionSet.jsx, PlaceValueDiscs.jsx, BarModel.jsx, ShapeFigure.jsx.

// MARK: - Coin tray (count a fixed tray, or build an amount by tapping)

private struct CoinSpec {
    let value: Int
    let label: String   // spoken, never printed on the face
    let name: String
    let radiusMM: Double // real-world proportions — a dime being smaller than
                         // a nickel is the misconception the mode teaches
    let asset: String    // Assets.xcassets/Coins, same PNGs the web serves
}

/// Mirrors src/components/kit/coins.js. The faces are public-domain US Mint
/// photographs rather than drawn discs: a disc stamped "10¢" turns coin
/// recognition into plain addition, and recognition is the skill.
private let coinSpecs: [String: CoinSpec] = [
    "penny": CoinSpec(value: 1, label: "1¢", name: "Penny", radiusMM: 19.05, asset: "penny"),
    "nickel": CoinSpec(value: 5, label: "5¢", name: "Nickel", radiusMM: 21.21, asset: "nickel"),
    "dime": CoinSpec(value: 10, label: "10¢", name: "Dime", radiusMM: 17.91, asset: "dime"),
    "quarter": CoinSpec(value: 25, label: "25¢", name: "Quarter", radiusMM: 24.26, asset: "quarter"),
]

struct CoinTrayWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var selected: Set<Int> = []
    @State private var entry = ""

    private var coins: [String] { display["coins"] as? [String] ?? [] }
    private var mode: String { display["coinMode"] as? String ?? "count" }
    private var selectedTotal: Int {
        selected.reduce(0) { $0 + (coinSpecs[coins[$1]]?.value ?? 0) }
    }

    var body: some View {
        VStack(spacing: 12) {
            // Wrapping tray of to-scale coins.
            FlowLayout(spacing: 8) {
                ForEach(Array(coins.enumerated()), id: \.offset) { index, coin in
                    coinView(coin, selected: selected.contains(index))
                        .onTapGesture { toggle(index) }
                        // Selecting is a real action in build mode, so VoiceOver
                        // needs it bound here, alongside the tap gesture.
                        .accessibilityAddTraits(mode == "build" ? .isButton : [])
                        .accessibilityAction { toggle(index) }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity)
            .background(RoundedRectangle(cornerRadius: 24).fill(theme.cardBackground))

            if mode == "build" {
                Text("\(selectedTotal)¢")
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundStyle(theme.textPrimary)
                CheckButton(enabled: !selected.isEmpty) {
                    submit(selectedTotal)
                    selected = []
                }
            } else {
                EntryReadout(entry: entry, suffix: entry.isEmpty ? "" : "¢")
                DigitPadView(entry: $entry) {
                    if let value = Int(entry) { submit(value) }
                    entry = ""
                }
            }
        }
        .disabled(disabled)
        .frame(maxWidth: 420)
    }

    private func coinView(_ coin: String, selected: Bool) -> some View {
        let spec = coinSpecs[coin] ?? coinSpecs["penny"]!
        let size = spec.radiusMM * 2 * 1.3 // web SCALE: mm -> pt, fingertip-sized
        return ZStack {
            Image(spec.asset)
                .resizable()
                .scaledToFit()
                // Lifts the coin off the tray so overlapping rims stay readable.
                .shadow(color: .black.opacity(0.28), radius: 2, y: 2)
            if selected {
                Circle().stroke(FigureColors.accent, lineWidth: 4)
            }
        }
        .frame(width: size, height: size)
        .offset(y: selected ? -6 : 0)
        .animation(.spring(duration: 0.25), value: selected)
        // The face carries no value, so this is the only thing VoiceOver has.
        .accessibilityElement()
        .accessibilityLabel("\(spec.name), \(spec.label)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func toggle(_ index: Int) {
        guard mode == "build", !disabled else { return }
        if selected.contains(index) { selected.remove(index) } else { selected.insert(index) }
    }
}

/// Minimal wrapping layout for the coin tray (web uses flex-wrap).
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        let width = proposal.width ?? rows.map(\.width).max() ?? 0
        let height = rows.reduce(0) { $0 + $1.height } + spacing * CGFloat(max(0, rows.count - 1))
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        var y = bounds.minY
        for row in rows {
            var x = bounds.minX + (bounds.width - row.width) / 2 // centered rows
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(
                    at: CGPoint(x: x, y: y + (row.height - size.height) / 2),
                    proposal: ProposedViewSize(size)
                )
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    private struct Row {
        var indices: [Int] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func computeRows(proposal: ProposedViewSize, subviews: Subviews) -> [Row] {
        let maxWidth = proposal.width ?? .infinity
        var rows: [Row] = []
        var current = Row()
        for (index, subview) in subviews.enumerated() {
            let size = subview.sizeThatFits(.unspecified)
            let addedWidth = current.indices.isEmpty ? size.width : size.width + spacing
            if current.width + addedWidth > maxWidth, !current.indices.isEmpty {
                rows.append(current)
                current = Row()
            }
            current.indices.append(index)
            current.width += current.indices.count == 1 ? size.width : size.width + spacing
            current.height = max(current.height, size.height)
        }
        if !current.indices.isEmpty { rows.append(current) }
        return rows
    }
}

// MARK: - Fraction entry (numerator/denominator + digit pad)

struct FractionInputWidget: View {
    @Environment(\.theme) private var theme
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var numerator = ""
    @State private var denominator = ""
    @State private var activeField = "num"

    private var activeEntry: Binding<String> {
        activeField == "num" ? $numerator : $denominator
    }

    var body: some View {
        VStack(spacing: 12) {
            VStack(spacing: 6) {
                field($numerator, name: "num")
                Rectangle()
                    .fill(theme.textPrimary)
                    .frame(width: 96, height: 4)
                    .clipShape(Capsule())
                field($denominator, name: "den")
            }

            DigitPadView(entry: activeEntry, maxLength: 4) {
                guard let num = Int(numerator), let den = Int(denominator), den != 0 else { return }
                submit(["num": num, "den": den])
                numerator = ""
                denominator = ""
                activeField = "num"
            }
        }
        .disabled(disabled)
    }

    private func field(_ text: Binding<String>, name: String) -> some View {
        Button {
            activeField = name
        } label: {
            Text(text.wrappedValue.isEmpty ? "—" : text.wrappedValue)
                .font(.system(size: 28, weight: .heavy, design: .rounded))
                .foregroundStyle(text.wrappedValue.isEmpty ? theme.textMuted : theme.textPrimary)
                .frame(minWidth: 72, minHeight: 52)
                .background(RoundedRectangle(cornerRadius: 14).fill(.white))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(activeField == name ? FigureColors.accent : .clear, lineWidth: 4)
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Fraction of a set (dots split into groups; num groups highlighted)

struct FractionSetWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""

    var body: some View {
        let set = display["set"] as? [String: Any] ?? [:]
        let total = (set["total"] as? NSNumber)?.intValue ?? 0
        let den = max(1, (set["den"] as? NSNumber)?.intValue ?? 1)
        let num = (set["num"] as? NSNumber)?.intValue ?? 0
        let perGroup = total / den

        VStack(spacing: 12) {
            FlowLayout(spacing: 8) {
                ForEach(0..<den, id: \.self) { group in
                    FlowLayout(spacing: 4) {
                        ForEach(0..<max(perGroup, 0), id: \.self) { _ in
                            Circle()
                                .fill(group < num
                                      ? Color(red: 0.518, green: 0.800, blue: 0.086) // lime-500
                                      : Color(red: 0.796, green: 0.835, blue: 0.882)) // slate-300
                                .frame(width: 20, height: 20)
                        }
                    }
                    .padding(8)
                    .frame(maxWidth: 150)
                    .background(RoundedRectangle(cornerRadius: 12).fill(theme.cardBackground))
                }
            }
            Text("\(num)/\(den) of \(total) — green groups")
                .font(.footnote.weight(.bold))
                .foregroundStyle(theme.textSecondary)

            EntryReadout(entry: entry)
            DigitPadView(entry: $entry, maxLength: 5) {
                if let value = Int(entry) { submit(value) }
                entry = ""
            }
        }
        .disabled(disabled)
        .frame(maxWidth: 420)
    }
}

// MARK: - Place-value discs (columns of 1000/100/10/1 discs; type the number)

struct PlaceValueDiscsWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""

    private static let placeColors: [Int: Color] = [
        1000: Color(red: 0.655, green: 0.545, blue: 0.980), // violet-400
        100: Color(red: 0.220, green: 0.741, blue: 0.973), // sky-400
        10: Color(red: 0.204, green: 0.827, blue: 0.600), // emerald-400
        1: Color(red: 0.984, green: 0.749, blue: 0.141), // amber-400
    ]

    var body: some View {
        let cols = (display["cols"] as? [[String: Any]] ?? []).map { col in
            (place: (col["place"] as? NSNumber)?.intValue ?? 1,
             count: (col["count"] as? NSNumber)?.intValue ?? 0)
        }

        VStack(spacing: 12) {
            HStack(alignment: .top, spacing: 8) {
                ForEach(Array(cols.enumerated()), id: \.offset) { _, col in
                    VStack(spacing: 4) {
                        Text("\(col.place)")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(theme.textSecondary)
                        VStack(spacing: 4) {
                            ForEach(0..<max(col.count, 0), id: \.self) { _ in
                                Text("\(col.place)")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 28, height: 28)
                                    .background(Circle().fill(Self.placeColors[col.place] ?? .gray))
                            }
                        }
                        .frame(minHeight: 80, alignment: .top)
                    }
                    .padding(8)
                    .background(RoundedRectangle(cornerRadius: 12).fill(theme.cardBackground))
                }
            }

            EntryReadout(entry: entry)
            DigitPadView(entry: $entry, maxLength: 7) {
                if let value = Int(entry) { submit(value) }
                entry = ""
            }
        }
        .disabled(disabled)
    }
}

// MARK: - Bar model (part-whole or comparison, segments drawn to scale)

struct BarModelWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""

    private let skyBar = Color(red: 0.220, green: 0.741, blue: 0.973)
    private let amberBar = Color(red: 0.984, green: 0.749, blue: 0.141)

    var body: some View {
        VStack(spacing: 12) {
            if display["type"] as? String == "barCompare" {
                compareDiagram
            } else {
                partWholeDiagram
            }
            DigitPadView(entry: $entry, maxLength: 5) {
                if let value = Int(entry) { submit(value) }
                entry = ""
            }
        }
        .disabled(disabled)
        .frame(maxWidth: 420)
    }

    private var unknownText: String { entry.isEmpty ? "?" : entry }

    private var compareDiagram: some View {
        let a = (display["a"] as? NSNumber)?.doubleValue ?? 1
        let diff = (display["diff"] as? NSNumber)?.doubleValue ?? 0
        let total = max(a + diff, 1)
        return VStack(spacing: 8) {
            GeometryReader { proxy in
                HStack(spacing: 8) {
                    rowLabel("A")
                    segment("\(Int(a))", color: skyBar, width: (proxy.size.width - 30) * a / total)
                    Spacer(minLength: 0)
                }
            }
            .frame(height: 48)
            GeometryReader { proxy in
                HStack(spacing: 8) {
                    rowLabel("B")
                    HStack(spacing: 0) {
                        segment("\(Int(a))", color: skyBar, width: (proxy.size.width - 30) * a / total)
                        segment("\(Int(diff))", color: amberBar, width: (proxy.size.width - 30) * diff / total)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    Spacer(minLength: 0)
                }
            }
            .frame(height: 48)
            Text("B = \(unknownText)")
                .font(.footnote.weight(.bold))
                .foregroundStyle(theme.textSecondary)
        }
    }

    private var partWholeDiagram: some View {
        let whole = max((display["whole"] as? NSNumber)?.doubleValue ?? 1, 1)
        let part = (display["part"] as? NSNumber)?.doubleValue ?? 0
        return VStack(spacing: 8) {
            Text("Whole = \(Int(whole))")
                .font(.footnote.weight(.bold))
                .foregroundStyle(theme.textSecondary)
            GeometryReader { proxy in
                HStack(spacing: 0) {
                    segment("\(Int(part))", color: skyBar, width: proxy.size.width * part / whole)
                    segment(unknownText, color: amberBar, width: proxy.size.width * (whole - part) / whole)
                }
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .frame(height: 48)
        }
    }

    private func rowLabel(_ text: String) -> some View {
        Text(text)
            .font(.footnote.weight(.bold))
            .foregroundStyle(theme.textSecondary)
            .frame(width: 22)
    }

    private func segment(_ label: String, color: Color, width: CGFloat) -> some View {
        Text(label)
            .font(.headline.weight(.heavy))
            .foregroundStyle(.white)
            .minimumScaleFactor(0.5)
            .frame(width: max(width, 0), height: 48)
            .background(color)
    }
}

// MARK: - Shape figure (count a property, or tap the matching figure)

struct ShapeFigureWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""
    @State private var picked: Int?

    private var shapeMode: String { display["shapeMode"] as? String ?? "count" }
    private var options: [[String: Any]] { display["options"] as? [[String: Any]] ?? [] }

    var body: some View {
        VStack(spacing: 14) {
            if shapeMode == "select" {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(Array(options.enumerated()), id: \.offset) { index, option in
                        Button {
                            picked = index
                        } label: {
                            FigureView(
                                shape: option["shape"] as? String ?? "square",
                                size: 72,
                                rotate: (option["rotate"] as? NSNumber)?.doubleValue ?? 0
                            )
                            .padding(10)
                            .background(RoundedRectangle(cornerRadius: 16).fill(theme.cardBackground))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(picked == index ? FigureColors.accent : .clear, lineWidth: 4)
                            )
                        }
                        .buttonStyle(SpringButtonStyle())
                    }
                }
                .frame(maxWidth: 300)
                CheckButton(enabled: picked != nil) {
                    guard let picked else { return }
                    submit(options[picked]["value"] ?? picked)
                    self.picked = nil
                }
            } else {
                FigureView(
                    shape: display["shape"] as? String ?? "square",
                    size: 120,
                    rotate: (display["rotate"] as? NSNumber)?.doubleValue ?? 0,
                    showSymmetry: display["showSymmetry"] as? Bool ?? false
                )
                .padding(16)
                .background(RoundedRectangle(cornerRadius: 24).fill(theme.cardBackground))

                EntryReadout(entry: entry)
                DigitPadView(entry: $entry, maxLength: 2) {
                    if let value = Int(entry) { submit(value) }
                    entry = ""
                }
            }
        }
        .disabled(disabled)
    }
}
