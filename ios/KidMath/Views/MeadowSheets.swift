import SwiftUI

/// The Field Guide entry (§07): about the REAL species and nothing else — no
/// nickname, no perch, no tier badge, no join date, no prices. One subject,
/// a full-width plate, a heavy rule under the name, ruled mono-labelled fact
/// rows, flat. The conservation line ends hopeful in every single entry.
struct FieldGuideSheet: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    let species: FlockService.Species
    /// §11: "Away · back in spring" while a migrant is south — the entry
    /// stays fully readable, call and all.
    var awayLine: String?

    private var pronoun: String { species.raw["pronoun"] as? String ?? "she" }
    private var facts: [String: Any] { species.raw["facts"] as? [String: Any] ?? [:] }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("FIELD GUIDE")
                    Spacer()
                    Text("A REAL BIRD")
                }
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .kerning(1.2)
                .foregroundStyle(Theme.ink.opacity(0.5))

                RoundedRectangle(cornerRadius: 14)
                    .fill(Theme.seafoam.opacity(0.6))
                    .frame(height: 206)
                    .overlay { BirdSpriteView().frame(width: 130, height: 112) }
                    .overlay(alignment: .topLeading) {
                        Text("SKETCH · PLATE SLOT")
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .kerning(1.1)
                            .foregroundStyle(Theme.ink.opacity(0.4))
                            .padding(10)
                    }
                    .padding(.top, 12)

                Text(species.name)
                    .font(theme.displayFont(size: 30))
                    .foregroundStyle(Theme.ink)
                    .padding(.top, 16)
                Rectangle().fill(Theme.ink).frame(height: 3).padding(.top, 8)
                Text(species.raw["latin"] as? String ?? "")
                    .font(theme.bodyFont(size: 14, weight: .semibold))
                    .italic()
                    .foregroundStyle(Theme.ink.opacity(0.6))
                    .padding(.top, 6)
                if let awayLine {
                    Text(awayLine)
                        .font(theme.bodyFont(size: 12, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Theme.seafoam))
                        .padding(.top, 8)
                }

                Button {
                    SoundPlayer.shared.playBirdCall()
                } label: {
                    Text("♪ \(pronoun == "she" ? "Her" : "His") call")
                        .font(theme.bodyFont(size: 14, weight: .bold))
                        .foregroundStyle(Theme.cream)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 36)
                        .background(Capsule().fill(Theme.teal))
                }
                .buttonStyle(SpringButtonStyle())
                .padding(.top, 12)
                Text(species.raw["callCaption"] as? String ?? "")
                    .font(theme.bodyFont(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.5))
                    .padding(.top, 4)

                Text(species.raw["wow"] as? String ?? "")
                    .font(theme.bodyFont(size: 17, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .padding(.top, 14)

                VStack(spacing: 0) {
                    factRow("HOW BIG", facts["howBig"])
                    factRow("WHAT \(pronoun.uppercased()) EATS", facts["eats"])
                    factRow("WHERE \(pronoun.uppercased()) LIVES", facts["lives"])
                    factRow("HOW \(pronoun.uppercased())'S DOING", facts["doing"])
                }
                .padding(.top, 12)

                HStack {
                    Text("A REAL BIRD · NOTHING ABOUT YOURS")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .kerning(1.1)
                        .foregroundStyle(Theme.ink.opacity(0.5))
                    Spacer()
                    Button("Close") { dismiss() }
                        .font(theme.bodyFont(size: 15, weight: .bold))
                        .foregroundStyle(Theme.teal)
                }
                .padding(.top, 18)
            }
            .padding(24)
        }
        .background(Color(red: 1, green: 0.99, blue: 0.96).ignoresSafeArea())
    }

    private func factRow(_ label: String, _ value: Any?) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Text(label)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .kerning(0.8)
                .foregroundStyle(Theme.ink.opacity(0.5))
                .frame(width: 96, alignment: .leading)
            Text(value as? String ?? "")
                .font(theme.bodyFont(size: 15, weight: .bold))
                .foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink.opacity(0.15)).frame(height: 1) }
    }
}

/// Give a home (§08). Never called a shop: two bands — what a kid can afford
/// today, and what to keep flying for ('N away' replaces any lock) — one bird
/// at a time, and ONE purchase screen showing balance-after. The arrival is
/// the receipt. Egg-only legendaries wait for the ceremonies port.
struct GiveAHomeSheet: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    let flock: FlockService
    /// §10 (ceremonies flag): legendaries become tappable — an egg arrives.
    var eggsEnabled = false
    let onPurchase: () -> Void

    @State private var picked: FlockService.Species?
    @State private var balance = 0

    private var listed: [FlockService.Species] {
        flock.species.filter { !$0.starter && !flock.ownsSpecies($0.id) }
    }

    private func here(_ species: FlockService.Species) -> Bool {
        guard let seasons = species.raw["seasons"] as? [String] else { return true }
        return seasons.contains(Self.currentSeason())
    }

    static func currentSeason(_ date: Date = Date()) -> String {
        switch Calendar.current.component(.month, from: date) {
        case 3...5: return "spring"
        case 6...8: return "summer"
        case 9...11: return "autumn"
        default: return "winter"
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if let picked {
                    purchaseScreen(picked)
                } else {
                    list
                }
            }
            .background(theme.background.ignoresSafeArea())
        }
        .onAppear { balance = EngagementStore.starBalance(EngagementStore().load()) }
    }

    private var list: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Text("Give a home")
                        .font(theme.displayFont(size: 24))
                        .foregroundStyle(Theme.ink)
                    Text("\(listed.count) birds looking for one")
                        .font(theme.bodyFont(size: 13, weight: .bold))
                        .foregroundStyle(Theme.ink.opacity(0.6))
                    Spacer()
                    starChip(balance)
                }

                let today = listed.filter { !$0.egg && here($0) && ($0.price ?? .max) <= balance }
                let todayIds = Set(today.map(\.id))
                let later = listed.filter { !todayIds.contains($0.id) }

                if !today.isEmpty {
                    bandLabel("YOU CAN GIVE A HOME TODAY")
                    ForEach(today, id: \.id) { birdRow($0, affordable: true) }
                }
                if !later.isEmpty {
                    bandLabel("KEEP FLYING FOR THESE")
                    ForEach(later, id: \.id) { birdRow($0, affordable: false) }
                }

                Text("Every bird here is real, and stars are the only way to bring one home. Nothing in the Meadow can be bought with money.")
                    .font(theme.bodyFont(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.5))
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 14)
            }
            .padding(20)
        }
    }

    private func bandLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .medium, design: .monospaced))
            .kerning(1.1)
            .foregroundStyle(Theme.ink.opacity(0.5))
            .padding(.top, 10)
    }

    private func birdRow(_ species: FlockService.Species, affordable: Bool) -> some View {
        let isEgg = species.egg
        let present = here(species)
        let eggBuyable = isEgg && eggsEnabled && flock.egg() == nil
            && ((species.raw["eggPrice"] as? NSNumber)?.intValue ?? .max) <= balance && present
        return Button {
            if affordable || eggBuyable { picked = species }
        } label: {
            HStack(spacing: 14) {
                BirdSpriteView().frame(width: 46, height: 40)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(species.name)
                            .font(theme.displayFont(size: 16))
                            .foregroundStyle(Theme.ink)
                        if let seasons = species.raw["seasons"] as? [String], let first = seasons.first {
                            Text(present ? "\(first.capitalized) only" : "back next \(first)")
                                .font(theme.bodyFont(size: 11, weight: .bold))
                                .foregroundStyle(Theme.ink)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Capsule().fill(Theme.seafoam))
                        }
                    }
                    Text(tierLine(species))
                        .font(theme.bodyFont(size: 13, weight: .bold))
                        .foregroundStyle(Theme.ink.opacity(0.6))
                        .lineLimit(1)
                }
                Spacer()
                if isEgg {
                    Text(flock.egg()?["speciesId"] as? String == species.id
                         ? "Already warming · \(flock.eggWarmthPercent())%"
                         : "Comes as an egg")
                        .font(theme.bodyFont(size: 13, weight: .bold))
                        .foregroundStyle(Theme.ink.opacity(0.7))
                } else if let price = species.price {
                    HStack(spacing: 6) {
                        starChip(price)
                        if price > balance, present {
                            Text("\(price - balance) away")
                                .font(theme.bodyFont(size: 12, weight: .bold))
                                .foregroundStyle(Theme.ink.opacity(0.5))
                        }
                    }
                }
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(.white)
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink.opacity(0.1), lineWidth: 1.5))
            )
        }
        .buttonStyle(.plain)
        .disabled(!(affordable || eggBuyable))
    }

    private func tierLine(_ species: FlockService.Species) -> String {
        let tier = species.tier == "legendary" ? "One of a kind" : species.tier.capitalized
        if let signature = species.raw["signature"] as? [String: Any],
           let line = signature["line"] as? String {
            return "\(tier) · \(line.lowercased().trimmingCharacters(in: CharacterSet(charactersIn: ".")))"
        }
        return tier
    }

    private func starChip(_ value: Int) -> some View {
        HStack(spacing: 6) {
            Rectangle().fill(Theme.sun)
                .frame(width: 12, height: 12)
                .rotationEffect(.degrees(45))
                .cornerRadius(2)
            Text("\(value)")
                .font(theme.bodyFont(size: 15, weight: .bold))
                .foregroundStyle(Theme.ink)
        }
        .padding(.horizontal, 11)
        .padding(.vertical, 5)
        .background(Capsule().fill(Theme.sunLight.opacity(0.6)))
    }

    /// The ONE purchase screen (§08): balance-after before the tap, no
    /// confirm-again, no undo — the arrival is the receipt.
    private func purchaseScreen(_ species: FlockService.Species) -> some View {
        let isEgg = species.egg
        let price = isEgg ? ((species.raw["eggPrice"] as? NSNumber)?.intValue ?? 0) : (species.price ?? 0)
        let pronounHim = (species.raw["pronoun"] as? String ?? "she") == "he" ? "him" : "her"
        return ScrollView {
            VStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Theme.seafoam.opacity(0.6))
                    .frame(height: 170)
                    .overlay { BirdSpriteView().frame(width: 120, height: 104) }
                Text(species.name)
                    .font(theme.displayFont(size: 28))
                    .foregroundStyle(Theme.ink)
                Text("\(species.tier.uppercased()) · \(pronounHim == "him" ? "HE'LL" : "SHE'LL") TAKE A FREE PERCH")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .kerning(1.1)
                    .foregroundStyle(Theme.ink.opacity(0.5))
                Text(species.raw["wow"] as? String ?? "")
                    .font(theme.bodyFont(size: 16, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.center)
                Text("\(price) stars now · \(balance - price) left after")
                    .font(theme.bodyFont(size: 15, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .padding(.top, 4)

                Button {
                    let succeeded = isEgg ? flock.buyEgg(species.id) : (flock.giveHome(species.id) != nil)
                    if succeeded {
                        onPurchase()
                        dismiss()
                    }
                } label: {
                    Text(isEgg ? "Bring the egg home" : "Give \(pronounHim) a home")
                        .font(theme.displayFont(size: 19))
                        .frame(maxWidth: .infinity, minHeight: 54)
                        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.deepTeal).offset(y: 4))
                        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal))
                        .foregroundStyle(Theme.cream)
                }
                .buttonStyle(SpringButtonStyle())
                .padding(.top, 6)

                Button("Not yet") { picked = nil }
                    .font(theme.bodyFont(size: 15, weight: .bold))
                    .foregroundStyle(Theme.ink.opacity(0.7))
                    .frame(minHeight: 44)

                Text(isEgg
                     ? "The egg sits in the Meadow and warms as you fly. At full warmth, it is yours to hatch — whenever you like."
                     : "\(pronounHim == "him" ? "His" : "Her") call and the rest of \(pronounHim == "him" ? "his" : "her") entry unlock when \(pronounHim == "him" ? "he" : "she") moves in.")
                    .font(theme.bodyFont(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.5))
                    .multilineTextAlignment(.center)
            }
            .padding(24)
            .frame(maxWidth: 420)
            .frame(maxWidth: .infinity)
        }
    }
}
