import SwiftUI

/// End-of-session celebration: stars earned this round + lifetime stars
/// (mirror of the completion card in MathExplorer.jsx).
struct SessionCompleteView: View {
    @Environment(\.theme) private var theme
    let mode: ModeInfo
    let starsEarned: Int
    let lifetimeStars: Int
    let playAgain: () -> Void
    let goHome: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Text(mode.emoji)
                .font(.system(size: 64))
                .overlay { ConfettiView() }
            Text(theme.completeMsg)
                .font(theme.displayFont(size: 36))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .foregroundStyle(
                    LinearGradient(colors: theme.heroGradient, startPoint: .leading, endPoint: .trailing)
                )

            HStack(spacing: 6) {
                ForEach(0..<max(starsEarned, 1), id: \.self) { _ in
                    Image(systemName: "star.fill")
                        .font(.title)
                        .foregroundStyle(.yellow)
                }
            }
            Text("You earned \(starsEarned) \(starsEarned == 1 ? "star" : "stars")!")
                .font(.title3.weight(.bold))
                .fontDesign(.rounded)
                .foregroundStyle(theme.textPrimary)
            Text("\(lifetimeStars) stars earned all-time!")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.textSecondary)

            VStack(spacing: 10) {
                Button(action: playAgain) {
                    Text("Play again!")
                        .font(.title3.weight(.heavy))
                        .fontDesign(.rounded)
                        .frame(maxWidth: .infinity, minHeight: 54)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(LinearGradient(colors: theme.ctaGradient, startPoint: .leading, endPoint: .trailing))
                        )
                        .foregroundStyle(.white)
                }
                Button(action: goHome) {
                    Text("Back to home")
                        .font(.headline)
                        .fontDesign(.rounded)
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(theme.cardBackground)
                                .overlay(RoundedRectangle(cornerRadius: 18).stroke(theme.cardBorder))
                        )
                        .foregroundStyle(theme.textSecondary)
                }
            }
            .buttonStyle(SpringButtonStyle())
            .frame(maxWidth: 380)
            .padding(.top, 8)
        }
        .padding(24)
    }
}
