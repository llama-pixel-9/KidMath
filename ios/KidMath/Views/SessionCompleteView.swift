import SwiftUI

/// The end card (§11): the lark sits inside the teal score ring so one object
/// carries both the celebration and the result; everything below it is
/// information. Headlines are bird puns, never a score judgement.
///
/// With the Flight Report flag on (§01/§02), the Apricot strip carries the
/// four-part settlement and can grow downward into the itemised ledger
/// ("How did I get 14?"), and the slot beneath holds the level bar with the
/// Nest total. The card is never fixed-height.
struct SessionCompleteView: View {
    @Environment(\.theme) private var theme
    let mode: ModeInfo
    let starsEarned: Int
    let totalQuestions: Int
    let lifetimeStars: Int
    var level: Int = 1
    var payout: EngineBridge.FlightPayout?
    var summary: EngagementStore.SessionEndResult?
    /// §03 state 2: the Seafoam note replaces the level bar in the slot when
    /// the lark has nominated; glide-down adds one kind line.
    var nominationPending: Bool = false
    var glideDown: Bool = false
    let playAgain: () -> Void
    let goHome: () -> Void

    /// Collapsed by default from the second week on (§02 state 3).
    @State private var ledgerOpen = false
    @State private var appeared = false

    private static let puns = [
        "Talon-ted!", "Nice flying!", "Owl be impressed!", "Toucan-t stop you!",
        "Wing it again?", "Egg-cellent!", "That soared!", "Feather in your cap!",
    ]

    private var headline: String {
        Self.puns[(lifetimeStars + totalQuestions) % Self.puns.count]
    }

    private var firstTryCorrect: Int {
        payout?.firstTryCorrect ?? starsEarned
    }

    private var ratio: Double {
        totalQuestions > 0 ? Double(firstTryCorrect) / Double(totalQuestions) : 0
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

                Text("\(firstTryCorrect) / \(totalQuestions)")
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

            if let payout {
                flightReportStrip(payout)
            } else {
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
            }

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
        .onAppear {
            // The ledger is expanded by default during the first week (§02).
            if payout != nil, let summary, summary.firstWeek { ledgerOpen = true }
        }
    }

    // MARK: - Flight Report (§01/§02, behind GamFlags.flightReport)

    /// The Apricot strip that grows downward into the four reasons on the
    /// same surface — one object opening, never a new panel. Zero-value rows
    /// are simply absent (nothing nags).
    @ViewBuilder
    private func flightReportStrip(_ payout: EngineBridge.FlightPayout) -> some View {
        VStack(spacing: 8) {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Rectangle()
                        .fill(Theme.sun)
                        .frame(width: 15, height: 15)
                        .rotationEffect(.degrees(45))
                        .cornerRadius(3)
                    Text("+\(payout.total) \(payout.total == 1 ? "star" : "stars")")
                        .font(theme.bodyFont(size: 15, weight: .bold))
                    if let summary, summary.streak > 1 {
                        Rectangle()
                            .fill(Theme.ink.opacity(0.2))
                            .frame(width: 1, height: 18)
                        Text("\(summary.streak) day migration")
                            .font(theme.bodyFont(size: 15, weight: .bold))
                    }
                }
                if ledgerOpen {
                    VStack(spacing: 5) {
                        Divider().overlay(Theme.ink.opacity(0.15)).padding(.vertical, 6)
                        if payout.landing > 0 { ledgerRow("You finished", payout.landing) }
                        if payout.precision > 0 {
                            ledgerRow("\(payout.firstTryCorrect) right first try", payout.precision)
                        }
                        if payout.altitude > 0 {
                            ledgerRow("\(RankBand.name(forLevel: level)) skies", payout.altitude)
                        }
                        if payout.circleBack > 0 {
                            ledgerRow(payout.circleBack == 1 ? "Old miss fixed" : "Old misses fixed", payout.circleBack)
                        }
                        ledgerRow("Into the Nest", payout.total, strong: true)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .frame(minWidth: 250)
            .background(RoundedRectangle(cornerRadius: 16).fill(Theme.apricot))

            Button {
                withAnimation(.easeInOut(duration: 0.2)) { ledgerOpen.toggle() }
            } label: {
                Text(ledgerOpen ? "Hide" : "How did I get \(payout.total)?")
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.teal)
                    .frame(minHeight: 32)
            }

            // The slot — three states, never fixed-height: level read-out,
            // the Seafoam nomination note (84px vs the bar's 39px), or the
            // expanded ledger above. "N stars to Level X" is gone.
            if nominationPending {
                HStack(spacing: 12) {
                    ZStack {
                        Circle().fill(Theme.cream)
                        LarkMarkView().frame(width: 26)
                    }
                    .frame(width: 44, height: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Ready for higher skies")
                            .font(theme.bodyFont(size: 15, weight: .heavy))
                        Text("Next time, six questions to reach Level \(min(level + 1, 10)).")
                            .font(theme.bodyFont(size: 14, weight: .bold))
                            .foregroundStyle(Theme.ink.opacity(0.8))
                    }
                    Spacer(minLength: 0)
                }
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(maxWidth: 320, minHeight: 84)
                .background(RoundedRectangle(cornerRadius: 16).fill(Theme.seafoam))
                .padding(.top, 4)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    GeometryReader { proxy in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.ink.opacity(0.1))
                            Capsule()
                                .fill(Theme.teal)
                                .frame(width: proxy.size.width * (appeared ? Double(level) / 10 : 0))
                                .animation(.easeOut(duration: 0.6), value: appeared)
                        }
                    }
                    .frame(height: 10)
                    .onAppear { appeared = true }
                    HStack {
                        Text("Level \(level) · \(RankBand.name(forLevel: level))")
                        Spacer()
                        Text("\(summary?.balance ?? 0) in the Nest")
                    }
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ink)
                }
                .frame(maxWidth: 320)
                .padding(.top, 4)
            }
            if glideDown {
                Text("Smoother skies for a bit.")
                    .font(theme.bodyFont(size: 13, weight: .bold))
                    .foregroundStyle(Theme.deepTeal)
            }
        }
    }

    private func ledgerRow(_ label: String, _ value: Int, strong: Bool = false) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text("+\(value)").monospacedDigit()
        }
        .font(theme.bodyFont(size: 14, weight: strong ? .heavy : .bold))
        .foregroundStyle(Theme.ink)
    }
}
