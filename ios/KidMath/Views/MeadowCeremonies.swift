import SwiftUI

/// §10 on iOS: the egg on the grass at the horizon line — warmth ring, crack
/// lines at 25/50/75%, a slow glow at 100% — and the hatch, the longest
/// ceremony in the app and the only place a kid names anything. Nothing is
/// persisted until the naming resolves, so a closed app loses nothing.
struct EggSpriteView: View {
    let warmthPercent: Int
    let ready: Bool
    let speciesName: String
    var reduceMotion = false

    @State private var glowing = false

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                if ready, !reduceMotion {
                    Ellipse()
                        .fill(Theme.sun)
                        .frame(width: 60, height: 72)
                        .opacity(glowing ? 0.3 : 0.12)
                        .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: glowing)
                        .onAppear { glowing = true }
                }
                Ellipse()
                    .fill(Color(red: 1, green: 0.99, blue: 0.96))
                    .overlay(Ellipse().stroke(Theme.ink, lineWidth: 2))
                    .frame(width: 40, height: 52)
                cracks
                if !ready {
                    Circle()
                        .stroke(Theme.ink.opacity(0.1), lineWidth: 4)
                        .frame(width: 68, height: 68)
                    Circle()
                        .trim(from: 0, to: Double(warmthPercent) / 100)
                        .stroke(Theme.sun, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .frame(width: 68, height: 68)
                }
            }
            .frame(height: 76)
            Text(ready ? "The egg is ready" : "\(speciesName) egg · warm \(warmthPercent)%")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Theme.ink)
            if !ready {
                Text("Keep flying to keep it warm")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.6))
            }
        }
    }

    private var cracks: some View {
        Path { p in
            if warmthPercent >= 25 {
                p.move(to: CGPoint(x: -8, y: -14))
                p.addLine(to: CGPoint(x: -3, y: -8))
                p.addLine(to: CGPoint(x: -7, y: -3))
            }
            if warmthPercent >= 50 {
                p.move(to: CGPoint(x: 7, y: -8))
                p.addLine(to: CGPoint(x: 3, y: -2))
                p.addLine(to: CGPoint(x: 8, y: 3))
            }
            if warmthPercent >= 75 {
                p.move(to: CGPoint(x: -2, y: 4))
                p.addLine(to: CGPoint(x: 3, y: 8))
                p.addLine(to: CGPoint(x: 0, y: 13))
            }
        }
        .stroke(Theme.ink, lineWidth: 1.5)
        .offset(x: 20, y: 26)
        .frame(width: 40, height: 52)
    }
}

/// The hatch, beats 2–5: rock and crack (with the app's only percussive
/// taps), the chick, the naming that accepts anything, then first flight —
/// which is when the caller persists.
struct HatchSheet: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    let species: FlockService.Species
    var reduceMotion = false
    let onNamed: (String) -> Void

    @State private var beat = 2
    @State private var rocking = false
    @State private var name = ""

    private var pronoun: String { species.raw["pronoun"] as? String ?? "she" }

    var body: some View {
        VStack(spacing: 16) {
            switch beat {
            case 2:
                Ellipse()
                    .fill(Color(red: 1, green: 0.99, blue: 0.96))
                    .overlay(Ellipse().stroke(Theme.ink, lineWidth: 3))
                    .frame(width: 96, height: 124)
                    .rotationEffect(.degrees(rocking ? 6 : -6))
                    .animation(
                        reduceMotion ? nil : .easeInOut(duration: 0.24).repeatCount(5, autoreverses: true),
                        value: rocking
                    )
                    .onAppear {
                        rocking = true
                        SoundPlayer.shared.playSoftTap()
                        Task {
                            try? await Task.sleep(for: .milliseconds(700))
                            SoundPlayer.shared.playSoftTap()
                            try? await Task.sleep(for: .milliseconds(800))
                            beat = 3
                        }
                    }
                Text("It rocks, then cracks…")
                    .font(theme.displayFont(size: 22))
                    .foregroundStyle(Theme.ink)
            case 3:
                BirdSpriteView()
                    .frame(width: 84, height: 73)
                    .scaleEffect(0.9)
                    .onAppear {
                        Task {
                            try? await Task.sleep(for: .milliseconds(reduceMotion ? 300 : 1500))
                            beat = 4
                        }
                    }
                Text("The chick!")
                    .font(theme.displayFont(size: 22))
                    .foregroundStyle(Theme.ink)
            default:
                BirdSpriteView().frame(width: 96, height: 84)
                Text("You name \(pronoun == "she" ? "her" : "him")")
                    .font(theme.displayFont(size: 24))
                    .foregroundStyle(Theme.ink)
                // Suggestion chips keep pre-readers moving; typing is optional
                // and anything they type is accepted — no validation copy.
                let suggestions = species.raw["presetNames"] as? [String] ?? []
                FlowChips(names: suggestions, selected: $name)
                TextField("…or type a name", text: $name)
                    .font(theme.bodyFont(size: 17, weight: .bold))
                    .multilineTextAlignment(.center)
                    .textFieldStyle(.plain)
                    .padding(.vertical, 6)
                    .overlay(alignment: .bottom) { Rectangle().fill(Theme.teal).frame(height: 2) }
                    .frame(maxWidth: 260)
                Button {
                    SoundPlayer.shared.playBirdCall()
                    onNamed(name)
                    dismiss()
                } label: {
                    Text("First flight")
                        .font(theme.displayFont(size: 19))
                        .frame(maxWidth: .infinity, minHeight: 54)
                        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.deepTeal).offset(y: 4))
                        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal))
                        .foregroundStyle(Theme.cream)
                        .opacity(name.trimmingCharacters(in: .whitespaces).isEmpty ? 0.4 : 1)
                }
                .buttonStyle(SpringButtonStyle())
                .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                .frame(maxWidth: 320)
            }
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 1, green: 0.99, blue: 0.96).ignoresSafeArea())
        // Beats 2 and 3 are skippable with a tap; the naming waits (§10).
        .contentShape(Rectangle())
        .onTapGesture { if beat < 4 { beat = 4 } }
        .interactiveDismissDisabled(false)
    }
}

/// Simple wrapping chip row for the naming suggestions.
struct FlowChips: View {
    @Environment(\.theme) private var theme
    let names: [String]
    @Binding var selected: String

    var body: some View {
        let rows = stride(from: 0, to: names.count, by: 3).map { Array(names[$0..<min($0 + 3, names.count)]) }
        VStack(spacing: 8) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: 8) {
                    ForEach(row, id: \.self) { chip in
                        Button {
                            selected = chip
                        } label: {
                            Text(chip)
                                .font(theme.bodyFont(size: 14, weight: .bold))
                                .foregroundStyle(selected == chip ? Theme.cream : Theme.ink)
                                .padding(.horizontal, 13)
                                .padding(.vertical, 7)
                                .background(Capsule().fill(selected == chip ? Theme.teal : Theme.seafoam))
                        }
                    }
                }
            }
        }
    }
}
