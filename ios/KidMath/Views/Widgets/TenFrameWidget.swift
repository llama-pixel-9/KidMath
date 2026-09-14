import SwiftUI

/// Ten frame — port of TenFrame.jsx, the canonical K–1 representation: a 2×5
/// grid a child fills with counters. Two modes, chosen by display.frameMode:
///
///   count — the frame shows `filled` (red) then `filledB` (blue) counters so
///           5 + 3 is VISIBLE as five-and-three; the child answers on the
///           digit pad.
///   build — the fixed counters are locked; the child taps empty cells to add
///           their own and submits HOW MANY THEY ADDED ("put in more to make
///           10" is answered by doing it).
///
/// `frames: 2` stacks two frames for teen numbers, filling left-to-right, top
/// row first, first frame first. Used by seven modes (addition, subtraction,
/// comparing, counting, numberBonds, placeValue, skipCounting); before this
/// existed iOS fell back to a choice grid for all of them.
struct TenFrameWidget: View {
    @Environment(\.theme) private var theme
    let display: [String: Any]
    let disabled: Bool
    let submit: (Any) -> Void

    @State private var entry = ""
    @State private var added: Set<Int> = []

    private var filled: Int { max(0, ProgressStore.int(display["filled"])) }
    private var filledB: Int { max(0, ProgressStore.int(display["filledB"])) }
    private var frames: Int { max(1, min(2, ProgressStore.int(display["frames"]) == 0 ? 1 : ProgressStore.int(display["frames"]))) }
    private var isBuild: Bool { (display["frameMode"] as? String) == "build" }
    private var fixed: Int { filled + filledB }

    var body: some View {
        VStack(spacing: 12) {
            VStack(spacing: 8) {
                ForEach(0..<frames, id: \.self) { f in
                    frame(f)
                }
            }
            .padding(6)

            if isBuild {
                Button {
                    submit(added.count)
                } label: {
                    Text("Go")
                        .font(.title3.weight(.heavy))
                        .fontDesign(.rounded)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.teal))
                        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.deepTeal).offset(y: 4))
                        .foregroundStyle(Theme.cream)
                }
                .buttonStyle(SpringButtonStyle())
                .frame(maxWidth: 380)
                .accessibilityLabel("Submit answer")
            } else {
                EntryReadout(entry: entry)
                DigitPadView(entry: $entry, maxLength: 2) {
                    if let value = Int(entry) { submit(value) }
                    entry = ""
                }
            }
        }
        .disabled(disabled)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Ten frame")
    }

    private func frame(_ f: Int) -> some View {
        let columns = Array(repeating: GridItem(.fixed(52), spacing: 0), count: 5)
        return LazyVGrid(columns: columns, spacing: 0) {
            ForEach(0..<10, id: \.self) { c in
                let i = f * 10 + c
                cell(i)
            }
        }
        .background(Color.white.opacity(0.8))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.systemGray3), lineWidth: 4))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .accessibilityLabel("Ten frame \(f + 1)")
    }

    private func cell(_ i: Int) -> some View {
        let isFixed = i < fixed
        let isAdded = added.contains(i)
        let tappable = isBuild && !isFixed && !disabled
        return Button {
            guard tappable else { return }
            if isAdded { added.remove(i) } else { added.insert(i) }
        } label: {
            ZStack {
                Rectangle().fill(Color.clear)
                    .overlay(Rectangle().stroke(Color(.systemGray4), lineWidth: 1))
                if isFixed || isAdded {
                    Circle()
                        .fill(i < filled ? Color(red: 0.94, green: 0.27, blue: 0.40) : Color(red: 0.05, green: 0.65, blue: 0.91))
                        .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 2))
                        .frame(width: 36, height: 36)
                        .transition(.scale)
                }
            }
            .frame(width: 52, height: 52)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!tappable)
        .accessibilityLabel(isFixed ? "counter" : isAdded ? "your counter" : "empty cell")
        .accessibilityAddTraits(isBuild && isAdded ? .isSelected : [])
    }
}
