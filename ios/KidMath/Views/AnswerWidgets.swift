import SwiftUI

/// P2 answer widgets: choice grid, number pad (also serves fillBlank),
/// symbol select, and multi-select. SwiftUI counterparts of the web's
/// widgetRegistry entries; each submits the exact value shape checkAnswer
/// expects. The visual widgets (clock, number line, shapes…) land in P3.

// MARK: - Multiple choice

struct ChoiceWidget: View {
    @Environment(\.theme) private var theme
    let choices: [Any]
    let disabled: Bool
    let submit: (Any) -> Void

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
    private let palette = [0, 1, 2, 3]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            ForEach(Array(choices.enumerated()), id: \.offset) { index, choice in
                // Binary pairs use Seafoam and Apricot at equal visual
                // weight (§08) — color never hints at the answer.
                let tintIndex = choices.count == 2 ? index * 2 : index
                Button {
                    submit(choice)
                } label: {
                    Text(AnswerFormatting.text(choice))
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .minimumScaleFactor(0.4)
                        .frame(maxWidth: .infinity, minHeight: 72)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(theme.bubbleEdges[tintIndex % theme.bubbleEdges.count])
                                .offset(y: 5)
                        )
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(theme.bubbleGradients[tintIndex % theme.bubbleGradients.count][0])
                        )
                        .foregroundStyle(Theme.ink)
                }
                .buttonStyle(SpringButtonStyle())
            }
        }
        .disabled(disabled)
        .frame(maxWidth: 480)
    }
}

// MARK: - Number pad (numberPad + fillBlank)

struct NumberPadWidget: View {
    @Environment(\.theme) private var theme
    var allowDecimal = false
    let disabled: Bool
    /// The typed answer. The session owns it so the answer box can sit in the
    /// problem card (handoff 2a · 07); `showsBox` draws one here instead.
    @Binding var entry: String
    var showsBox = true
    /// Compact rows for iPhone.
    @Environment(\.horizontalSizeClass) private var sizeClass
    private var compact: Bool { sizeClass == .compact }
    let submit: (Any) -> Void

    private var keys: [[String]] {
        let last = allowDecimal ? [".", "0", "⌫"] : ["0", "⌫"]
        return [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], last]
    }

    // Rows tinted Seafoam / Teal Mid / Apricot, then Sun Light 0 and a Sun backspace.
    private func tint(_ key: String, row: Int) -> (fill: Color, edge: Color, text: Color) {
        switch key {
        case "⌫": return (Theme.sun, Theme.ember, Theme.ink)
        case "0", ".": return (Theme.sunLight, Theme.sunLightDeep, Theme.ink)
        default:
            switch row {
            case 0: return (Theme.seafoam, Theme.seafoamDeep, Theme.ink)
            case 1: return (Theme.tealMid, Theme.tealMidDeep, Theme.ink)
            default: return (Theme.apricot, Theme.apricotDeep, Theme.ink)
            }
        }
    }

    var body: some View {
        let keyHeight: CGFloat = compact ? 64 : 84
        VStack(spacing: 12) {
            if showsBox {
                Text(entry.isEmpty ? " " : entry)
                    .font(theme.displayFont(size: 34))
                    .foregroundStyle(Theme.ink)
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .background(RoundedRectangle(cornerRadius: 16).fill(Theme.cream))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.teal, lineWidth: 2.5))
            }
            ForEach(Array(keys.enumerated()), id: \.offset) { row, line in
                HStack(spacing: 12) {
                    // The last row keeps the 3-column grid: 0 sits under the 8.
                    if line.count == 2 { Color.clear.frame(maxWidth: .infinity).frame(height: keyHeight) }
                    ForEach(line, id: \.self) { key in
                        let t = tint(key, row: row)
                        Button { tap(key) } label: {
                            Group {
                                if key == "⌫" {
                                    Image(systemName: "delete.left").font(.system(size: 26, weight: .semibold))
                                } else {
                                    Text(key).font(theme.displayFont(size: 30))
                                }
                            }
                            .foregroundStyle(t.text)
                            .frame(maxWidth: .infinity)
                            .frame(height: keyHeight)
                            .background(RoundedRectangle(cornerRadius: 18).fill(t.fill).shadow(color: t.edge, radius: 0, x: 0, y: 5))
                        }
                        .buttonStyle(SpringButtonStyle())
                        .accessibilityLabel(key == "⌫" ? "Delete" : key)
                    }
                }
            }

            Button {
                guard let value = Double(entry) else { return }
                submit(value == value.rounded() ? Int(value) as Any : value as Any)
                entry = ""
            } label: {
                Text("Check")
                    .font(theme.displayFont(size: 24))
                    .foregroundStyle(Theme.cream)
                    .frame(maxWidth: .infinity)
                    .frame(height: compact ? 64 : 80)
                    .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal).shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 5))
                    .opacity(Double(entry) == nil ? 0.4 : 1)
            }
            .disabled(Double(entry) == nil)
            .buttonStyle(SpringButtonStyle())
            .padding(.top, 4)
        }
        .disabled(disabled)
    }

    private func tap(_ key: String) {
        switch key {
        case "⌫":
            if !entry.isEmpty { entry.removeLast() }
        case ".":
            if !entry.contains(".") { entry += entry.isEmpty ? "0." : "." }
        default:
            if entry.count < 7 { entry += key }
        }
    }
}

// MARK: - Symbol select (<, =, >)

struct SymbolSelectWidget: View {
    @Environment(\.theme) private var theme
    let disabled: Bool
    let submit: (Any) -> Void

    var body: some View {
        // Fixed order < = > matching the number line; two tints, not three —
        // < and > share Seafoam (the same operation mirrored), = is Apricot.
        HStack(spacing: 14) {
            ForEach(["<", "=", ">"], id: \.self) { symbol in
                Button {
                    submit(symbol)
                } label: {
                    Text(symbol)
                        .font(.system(size: 40, weight: .heavy, design: .rounded))
                        .frame(width: 96, height: 72)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(symbol == "=" ? Theme.apricotDeep : Theme.seafoamDeep)
                                .offset(y: 5)
                        )
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(symbol == "=" ? Theme.apricot : Theme.seafoam)
                        )
                        .foregroundStyle(Theme.ink)
                }
                .buttonStyle(SpringButtonStyle())
            }
        }
        .disabled(disabled)
    }
}

// MARK: - Multi-select (pick N)

struct MultiSelectWidget: View {
    @Environment(\.theme) private var theme
    let options: [Any]
    let requiredCount: Int
    let disabled: Bool
    let submit: ([Any]) -> Void

    @State private var selected: Set<Int> = []

    private let columns = [GridItem(.adaptive(minimum: 90, maximum: 140), spacing: 10)]

    var body: some View {
        VStack(spacing: 12) {
            Text("Pick \(requiredCount)")
                .font(.caption.weight(.bold))
                .foregroundStyle(theme.textMuted)
                .textCase(.uppercase)

            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(Array(options.enumerated()), id: \.offset) { index, option in
                    Button {
                        toggle(index)
                    } label: {
                        Text(AnswerFormatting.text(option))
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .minimumScaleFactor(0.5)
                            .frame(maxWidth: .infinity, minHeight: 56)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(selected.contains(index) ? Theme.seafoam : .white)
                            )
                            .foregroundStyle(theme.textPrimary)
                    }
                    .buttonStyle(SpringButtonStyle())
                }
            }

            Button {
                let values = selected.sorted().map { options[$0] }
                selected = []
                submit(values)
            } label: {
                Text("Check!")
                    .font(.title3.weight(.heavy))
                    .fontDesign(.rounded)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(RoundedRectangle(cornerRadius: 16).fill(Theme.deepTeal).offset(y: 4))
                    .background(RoundedRectangle(cornerRadius: 16).fill(Theme.teal))
                    .foregroundStyle(Theme.cream)
                    .opacity(selected.count == requiredCount ? 1 : 0.4)
            }
            .disabled(selected.count != requiredCount)
            .buttonStyle(SpringButtonStyle())
        }
        .disabled(disabled)
        .frame(maxWidth: 480)
        .onChange(of: options.count) { selected = [] }
    }

    private func toggle(_ index: Int) {
        if selected.contains(index) {
            selected.remove(index)
        } else if selected.count < requiredCount {
            selected.insert(index)
        }
    }
}

// MARK: - Shared button feel

struct SpringButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.93 : 1)
            .animation(.spring(duration: 0.2), value: configuration.isPressed)
    }
}
