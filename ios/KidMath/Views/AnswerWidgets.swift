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
    let submit: (Any) -> Void

    @State private var entry = ""

    private var keys: [[String]] {
        [
            ["1", "2", "3"],
            ["4", "5", "6"],
            ["7", "8", "9"],
            [allowDecimal ? "." : "-", "0", "⌫"],
        ]
    }

    var body: some View {
        VStack(spacing: 10) {
            Text(entry.isEmpty ? " " : entry)
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(theme.textPrimary)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(.white)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(theme.cardBorder))
                )

            ForEach(keys, id: \.self) { row in
                HStack(spacing: 10) {
                    ForEach(row, id: \.self) { key in
                        let tint = DigitPadView.keyTint(key)
                        Button {
                            tap(key)
                        } label: {
                            Text(key)
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .frame(maxWidth: .infinity, minHeight: 54)
                                .background(RoundedRectangle(cornerRadius: 14).fill(tint.edge).offset(y: 4))
                                .background(RoundedRectangle(cornerRadius: 14).fill(tint.fill))
                                .foregroundStyle(Theme.ink)
                        }
                        .buttonStyle(SpringButtonStyle())
                    }
                }
            }

            Button {
                guard let value = Double(entry) else { return }
                submit(value == value.rounded() ? Int(value) as Any : value as Any)
                entry = ""
            } label: {
                Text("Check!")
                    .font(.title3.weight(.heavy))
                    .fontDesign(.rounded)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(RoundedRectangle(cornerRadius: 16).fill(Theme.deepTeal).offset(y: 4))
                    .background(RoundedRectangle(cornerRadius: 16).fill(Theme.teal))
                    .foregroundStyle(Theme.cream)
                    .opacity(Double(entry) == nil ? 0.4 : 1)
            }
            .disabled(Double(entry) == nil)
            .buttonStyle(SpringButtonStyle())
        }
        .disabled(disabled)
        .frame(maxWidth: 380)
    }

    private func tap(_ key: String) {
        switch key {
        case "⌫":
            if !entry.isEmpty { entry.removeLast() }
        case "-":
            if entry.isEmpty { entry = "-" }
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
