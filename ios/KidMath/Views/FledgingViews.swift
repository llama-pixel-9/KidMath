import SwiftUI

/// §03 step 4: the Fledging Flight offered at take-off. Declining costs
/// nothing and is plain text at body size — never a shrunken escape hatch.
struct FledgingOfferView: View {
    @Environment(\.theme) private var theme
    let level: Int
    let accept: () -> Void
    let decline: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle().fill(Theme.seafoam)
                LarkMarkView().frame(width: 36)
            }
            .frame(width: 68, height: 68)

            Text("Ready for higher skies?")
                .font(theme.displayFont(size: 26))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)

            Text("Six questions, five to pass — and Level \(min(level + 1, 10)) is yours. No stars ride on this one.")
                .font(theme.bodyFont(size: 15, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.8))
                .multilineTextAlignment(.center)

            Button(action: accept) {
                Text("Take the Fledging Flight")
                    .font(theme.displayFont(size: 19))
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(RoundedRectangle(cornerRadius: 18).fill(Theme.deepTeal).offset(y: 4))
                    .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal))
                    .foregroundStyle(Theme.cream)
            }
            .buttonStyle(SpringButtonStyle())
            .padding(.top, 6)

            Button(action: decline) {
                Text("Just a normal flight today")
                    .font(theme.bodyFont(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.8))
                    .frame(minHeight: 44)
            }
        }
        .padding(28)
        .frame(maxWidth: 380)
        .background(
            RoundedRectangle(cornerRadius: 28)
                .fill(theme.cardBackground)
                .shadow(color: Theme.ink.opacity(0.06), radius: 0, y: 6)
        )
        .padding(.horizontal)
    }
}

/// §17 fledging moment: lark on the Apricot disc, a flight word, the level
/// bar filling over 600ms, one button, auto-advance at 4s. No confetti —
/// that belongs to the end of a run only. The miss copy is kind.
struct FledgingCeremonyView: View {
    @Environment(\.theme) private var theme
    let passed: Bool
    let level: Int
    let flyOn: () -> Void

    @State private var barFilled = false

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle().fill(Theme.apricot)
                LarkMarkView().frame(width: 44)
            }
            .frame(width: 84, height: 84)

            Text(passed ? "You’ve fledged!" : "Almost there")
                .font(theme.displayFont(size: 28))
                .foregroundStyle(Theme.ink)

            Text(passed
                 ? "Level \(level) skies are yours now."
                 : "A little more practice and you’ll be soaring.")
                .font(theme.bodyFont(size: 15, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.8))
                .multilineTextAlignment(.center)

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.ink.opacity(0.1))
                    Capsule()
                        .fill(Theme.teal)
                        .frame(width: proxy.size.width * (barFilled ? Double(level) / 10 : Double(max(1, passed ? level - 1 : level)) / 10))
                        .animation(.easeOut(duration: 0.6), value: barFilled)
                }
            }
            .frame(height: 10)

            Button(action: flyOn) {
                Text("Fly on")
                    .font(theme.displayFont(size: 19))
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(RoundedRectangle(cornerRadius: 18).fill(Theme.deepTeal).offset(y: 4))
                    .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal))
                    .foregroundStyle(Theme.cream)
            }
            .buttonStyle(SpringButtonStyle())
            .padding(.top, 6)
        }
        .padding(28)
        .frame(maxWidth: 380)
        .background(
            RoundedRectangle(cornerRadius: 28)
                .fill(theme.cardBackground)
                .shadow(color: Theme.ink.opacity(0.06), radius: 0, y: 6)
        )
        .padding(.horizontal)
        .onAppear { barFilled = true }
        .task {
            // Auto-advance at 4s, like the web ceremony.
            try? await Task.sleep(for: .seconds(4))
            flyOn()
        }
    }
}
