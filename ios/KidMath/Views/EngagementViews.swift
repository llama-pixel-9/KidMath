import SwiftUI

/// The always-visible loop summary above the aviary — port of
/// EngagementBar.jsx: star balance, day streak, daily goal. Tapping the stars
/// opens the sticker book.
struct EngagementBarView: View {
    @Environment(\.theme) private var theme
    let state: [String: Any]
    let onOpenStickers: () -> Void

    var body: some View {
        let balance = EngagementStore.starBalance(state)
        let streak = EngagementStore.currentStreak(state)
        let today = EngagementStore.starsToday(state)
        let goal = EngagementStore.dailyGoal
        let goalDone = today >= goal
        HStack(spacing: 8) {
            Button(action: onOpenStickers) {
                chip {
                    Text("⭐").font(.system(size: 14))
                    Text("\(balance)").font(theme.bodyFont(size: 14, weight: .heavy))
                    Text(balance == 1 ? "star" : "stars").font(theme.bodyFont(size: 13, weight: .semibold)).foregroundStyle(theme.textMuted)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(balance) stars — open the sticker book")

            chip {
                Text("🔥").font(.system(size: 14))
                Text("\(streak)").font(theme.bodyFont(size: 14, weight: .heavy))
                Text(streak == 1 ? "day" : "days").font(theme.bodyFont(size: 13, weight: .semibold)).foregroundStyle(theme.textMuted)
            }
            .accessibilityLabel("\(streak) day streak")

            chip {
                ZStack {
                    Circle().stroke(Theme.ink.opacity(0.12), lineWidth: 3)
                    Circle().trim(from: 0, to: min(1, Double(today) / Double(goal)))
                        .stroke(goalDone ? Theme.deepTeal : Theme.teal, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    if goalDone { Image(systemName: "checkmark").font(.system(size: 8, weight: .black)).foregroundStyle(Theme.deepTeal) }
                }
                .frame(width: 16, height: 16)
                Text("\(min(today, goal))/\(goal)")
                    .font(theme.bodyFont(size: 14, weight: .heavy))
                    .foregroundStyle(goalDone ? Theme.deepTeal : Theme.ink)
                Text("today").font(theme.bodyFont(size: 13, weight: .semibold)).foregroundStyle(theme.textMuted)
            }
            .accessibilityLabel(goalDone ? "Daily goal done" : "Earn \(goal - today) more stars today")
        }
    }

    private func chip<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        HStack(spacing: 5) { content() }
            .padding(.horizontal, 10)
            .frame(height: 34)
            .background(Capsule().fill(Color.white))
            .overlay(Capsule().stroke(Theme.ink.opacity(0.1), lineWidth: 1.5))
    }
}

/// Sticker book — port of StickerBook.jsx: earned badges on top, then the
/// sticker shelf, bought with stars through the shared spend rule.
struct StickerBookView: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    let store: EngagementStore

    @State private var state: [String: Any] = [:]
    @State private var justBought: String?

    private var balance: Int { EngagementStore.starBalance(state) }
    private var owned: Set<String> { Set((state["stickers"] as? [String]) ?? []) }
    private var earned: Set<String> { Set(((state["badges"] as? [[String: Any]]) ?? []).compactMap { $0["id"] as? String }) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        Text("⭐ \(balance)").font(theme.displayFont(size: 26)).foregroundStyle(Theme.ink)
                        Text(balance == 1 ? "star to spend" : "stars to spend").font(theme.bodyFont(size: 15, weight: .semibold)).foregroundStyle(theme.textMuted)
                    }

                    Text("Badges").font(theme.displayFont(size: 20)).foregroundStyle(Theme.ink)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 10)], spacing: 10) {
                        ForEach(EngagementStore.badges()) { badge in
                            let has = earned.contains(badge.id)
                            HStack(spacing: 8) {
                                Text(badge.emoji).font(.system(size: 26)).grayscale(has ? 0 : 1).opacity(has ? 1 : 0.45)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(badge.name).font(theme.bodyFont(size: 13, weight: .heavy))
                                    Text(badge.blurb).font(theme.bodyFont(size: 11, weight: .semibold)).foregroundStyle(theme.textMuted)
                                }
                                Spacer(minLength: 0)
                            }
                            .padding(10)
                            .background(RoundedRectangle(cornerRadius: 14).fill(has ? Theme.seafoam.opacity(0.45) : Color.white))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ink.opacity(0.08), lineWidth: 1.5))
                            .accessibilityLabel(has ? "\(badge.name) — \(badge.blurb)" : "Locked: \(badge.blurb)")
                        }
                    }

                    Text("Stickers").font(theme.displayFont(size: 20)).foregroundStyle(Theme.ink)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 84), spacing: 10)], spacing: 10) {
                        ForEach(EngagementStore.stickers()) { sticker in
                            let has = owned.contains(sticker.id)
                            let canBuy = !has && balance >= sticker.cost
                            Button {
                                guard canBuy, store.buySticker(sticker) else { return }
                                state = store.load()
                                justBought = sticker.id
                                SoundPlayer.shared.playLevelUp()
                            } label: {
                                VStack(spacing: 4) {
                                    Text(sticker.emoji).font(.system(size: 30)).grayscale(has || canBuy ? 0 : 1).opacity(has || canBuy ? 1 : 0.4)
                                        .scaleEffect(justBought == sticker.id ? 1.15 : 1)
                                    Text(sticker.name).font(theme.bodyFont(size: 11, weight: .bold)).lineLimit(1).minimumScaleFactor(0.7)
                                    Text(has ? "yours" : "⭐ \(sticker.cost)").font(theme.bodyFont(size: 11, weight: .semibold)).foregroundStyle(has ? Theme.deepTeal : theme.textMuted)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(8)
                                .background(RoundedRectangle(cornerRadius: 14).fill(has ? Theme.seafoam.opacity(0.45) : Color.white))
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(canBuy ? Theme.teal : Theme.ink.opacity(0.08), lineWidth: 1.5))
                            }
                            .buttonStyle(.plain)
                            .disabled(!canBuy)
                            .animation(.spring(duration: 0.3), value: justBought)
                            .accessibilityLabel(has ? "\(sticker.name) — owned" : "Buy \(sticker.name) for \(sticker.cost) stars")
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 760)
                .frame(maxWidth: .infinity)
            }
            .background(theme.background.ignoresSafeArea())
            .navigationTitle("Sticker book")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
            .onAppear { state = store.load() }
        }
    }
}
