import SwiftUI

/// The end card (§11): the lark sits inside the teal score ring so one object
/// carries both the celebration and the result; everything below it is
/// information. Headlines are bird puns, never a score judgement.
struct SessionCompleteView: View {
    @Environment(\.theme) private var theme
    let mode: ModeInfo
    let starsEarned: Int
    let totalQuestions: Int
    let lifetimeStars: Int
    let playAgain: () -> Void
    let goHome: () -> Void

    private static let puns = [
        "Talon-ted!", "Nice flying!", "Owl be impressed!", "Toucan-t stop you!",
        "Wing it again?", "Egg-cellent!", "That soared!", "Feather in your cap!",
    ]

    private var headline: String {
        Self.puns[(lifetimeStars + totalQuestions) % Self.puns.count]
    }

    private var ratio: Double {
        totalQuestions > 0 ? Double(starsEarned) / Double(totalQuestions) : 0
    }

    var body: some View {
        VStack(spacing: 16) {
            // Score ring: Lark Teal fill = fraction correct on an Ink 8% track;
            // the lark is the reward and appears at full colour here only.
            ZStack(alignment: .bottom) {
                ZStack {
                    Circle()
                        .stroke(Theme.ink.opacity(0.08), lineWidth: 14)
                    Circle()
                        .trim(from: 0, to: max(ratio, 0.03))
                        .stroke(Theme.teal, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    LarkMarkView()
                        .frame(width: 72)
                }
                .frame(width: 148, height: 148)
                .overlay { ConfettiView() }

                Text("\(starsEarned) / \(totalQuestions)")
                    .font(theme.displayFont(size: 17))
                    .foregroundStyle(Theme.cream)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 5)
                    .background(Capsule().fill(Theme.ink))
                    .offset(y: 8)
            }
            .padding(.bottom, 8)

            Text(headline)
                .font(theme.displayFont(size: 30))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .foregroundStyle(Theme.ink)

            // Stat strip on Apricot: Sun star diamond, +N stars, lifetime.
            HStack(spacing: 10) {
                Rectangle()
                    .fill(Theme.sun)
                    .frame(width: 15, height: 15)
                    .rotationEffect(.degrees(45))
                    .cornerRadius(3)
                Text("+\(starsEarned) \(starsEarned == 1 ? "star" : "stars")")
                    .font(theme.bodyFont(size: 15, weight: .bold))
                Rectangle()
                    .fill(Theme.ink.opacity(0.2))
                    .frame(width: 1, height: 18)
                Text("\(lifetimeStars) all-time")
                    .font(theme.bodyFont(size: 15, weight: .bold))
            }
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .background(RoundedRectangle(cornerRadius: 16).fill(Theme.apricot))

            VStack(spacing: 10) {
                Button(action: playAgain) {
                    Text("Play again")
                        .font(theme.displayFont(size: 20))
                        .frame(maxWidth: .infinity, minHeight: 54)
                        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.deepTeal).offset(y: 4))
                        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal))
                        .foregroundStyle(Theme.cream)
                }
                Button(action: goHome) {
                    Text("Back to the nest")
                        .font(theme.bodyFont(size: 15, weight: .bold))
                        .foregroundStyle(Theme.teal)
                        .frame(minHeight: 44)
                }
            }
            .buttonStyle(SpringButtonStyle())
            .frame(maxWidth: 380)
            .padding(.top, 8)
        }
        .padding(24)
    }
}
