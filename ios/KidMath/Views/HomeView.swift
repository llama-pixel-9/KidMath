import SwiftUI

/// Home: hero header + the grouped mode grid (mirror of src/HomePage.jsx
/// structure — same groups, labels, and grade hints).
struct HomeView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @State private var activeMode: ModeInfo?
    @State private var showSettings = false
    @State private var showWorksheets = false
    @State private var showAbout = false
    @State private var showPaywall = false
    @State private var showFirstFlight = false
    @State private var showProfilePicker = false
    @State private var showMeadow = false

    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 220), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    hero
                    ForEach(ModeCatalog.groups) { group in
                        groupSection(group)
                    }
                    if GamFlags.meadow {
                        meadowCallout
                    }
                    worksheetCallout
                }
                .frame(maxWidth: 760) // centered content column, like the web
                .padding(.horizontal)
                .padding(.bottom, 24)
                .frame(maxWidth: .infinity)
            }
            .background(theme.background)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showAbout = true
                    } label: {
                        Image(systemName: "info.circle")
                            .foregroundStyle(theme.textSecondary)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        FeatherIcon(glyph: .settings, size: 22, color: Theme.ink)
                            .accessibilityLabel("settings")
                    }
                }
            }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .sheet(isPresented: $showWorksheets) { WorksheetView() }
            .fullScreenCover(isPresented: $showMeadow) { MeadowView() }
            .sheet(isPresented: $showAbout) { AboutView() }
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .fullScreenCover(item: $activeMode) { mode in
                SessionView(mode: mode)
            }
            .fullScreenCover(isPresented: $showFirstFlight) { FirstFlightView() }
            .fullScreenCover(isPresented: $showProfilePicker) { ProfilePickerView() }
            .task {
                await app.refreshModeLevels()
                autostartIfRequested()
                await presentFirstFlightIfNeeded()
            }
        }
    }

    /// §14: one greeting line above the aviary — time of day, first name when
    /// a kid profile is active, no exclamation stacking, no streak pressure.
    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let dayPart = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"
        if let name = app.kidProfiles.activeKidName {
            return "\(dayPart), \(name) — pick a game."
        }
        return "\(dayPart) — pick a game."
    }

    /// First flight (§20): new families get the value → account → kid flow;
    /// a returning signed-in family with kids and no active kid gets the
    /// profile picker — never a login form.
    private func presentFirstFlightIfNeeded() async {
        guard activeMode == nil, !showPaywall else { return }
        if app.supabase.isSignedIn {
            UserDefaults.standard.set(true, forKey: FirstFlightView.completedKey)
            await app.kidProfiles.refresh()
            if !app.kidProfiles.kids.isEmpty && app.kidProfiles.activeKidId == nil {
                showProfilePicker = true
            }
        } else if !UserDefaults.standard.bool(forKey: FirstFlightView.completedKey) {
            showFirstFlight = true
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Mark + wordmark, always together. The wordmark is lowercase
            // Fredoka 600 in Lark Teal — never a gradient.
            HStack(spacing: 10) {
                LarkMarkView()
                    .frame(height: 34)
                Text("larkit")
                    .font(theme.displayFont(size: 38))
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .foregroundStyle(Theme.teal)
            }
            Text(greeting)
                .font(theme.bodyFont(size: 19, weight: .semibold))
                .foregroundStyle(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }

    private func groupSection(_ group: ModeGroup) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(group.title)
                    .font(theme.displayFont(size: 22))
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                    .foregroundStyle(theme.textPrimary)
                Text(group.gradeHint)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(theme.textMuted)
            }
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(group.modes) { mode in
                    modeCard(mode)
                }
            }
        }
    }

    private func modeCard(_ mode: ModeInfo) -> some View {
        // The same five free modes as the web; the rest need the trial or
        // subscription once the launch switch flips.
        let locked = !app.store.canPlay(mode.id)
        return Button {
            guard mode.playable else { return }
            if locked {
                showPaywall = true
            } else {
                activeMode = mode
            }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    // §14: locked cards keep full opacity and swap the glyph
                    // for the lock at 40%, with no badge.
                    if locked {
                        FeatherIcon(glyph: .lock, size: 30, color: Theme.ink)
                            .opacity(0.4)
                            .frame(height: 41)
                    } else {
                        Text(mode.emoji).font(.system(size: 34))
                    }
                    Spacer()
                    // §03 step 3: the nomination survives leaving the app as
                    // a Sun pill on the mode's card (Ink text — cream on Sun
                    // is forbidden).
                    if !locked, GamFlags.fledging, EngagementStore().nomination(for: mode.id) != nil {
                        Text("Ready to fledge")
                            .font(theme.bodyFont(size: 11, weight: .heavy))
                            .foregroundStyle(Theme.ink)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(Theme.sun))
                    }
                    if !mode.playable {
                        soonBadge
                    } else if !locked, let level = app.modeLevels[mode.id], level > 1 {
                        levelBadge(level)
                    }
                }
                Text(mode.label)
                    .font(theme.displayFont(size: 16))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2, reservesSpace: true)
                    .multilineTextAlignment(.leading)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(theme.modeColor(mode.id))
                    .opacity(mode.playable ? 1 : 0.45)
            )
        }
        .buttonStyle(.plain)
        .disabled(!mode.playable)
    }

    /// §04: the Meadow entry — the fourth tab on the web's perch, a card
    /// here until iOS grows a tab bar. Behind GamFlags.meadow.
    private var meadowCallout: some View {
        Button {
            showMeadow = true
        } label: {
            HStack(spacing: 14) {
                Text("🌿").font(.system(size: 36))
                VStack(alignment: .leading, spacing: 4) {
                    Text("The Meadow")
                        .font(theme.displayFont(size: 18))
                        .foregroundStyle(theme.textPrimary)
                    Text("Your birds, your nest, and every star you have earned.")
                        .font(theme.bodyFont(size: 14))
                        .foregroundStyle(theme.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(theme.textSecondary)
            }
            .padding(16)
            .background(RoundedRectangle(cornerRadius: 20).fill(Theme.seafoam))
        }
        .buttonStyle(.plain)
    }

    /// The web homepage's worksheet callout, as a tappable card.
    private var worksheetCallout: some View {
        Button {
            if app.store.isUnlocked {
                showWorksheets = true
            } else {
                showPaywall = true
            }
        } label: {
            HStack(spacing: 14) {
                Text("🖨️").font(.system(size: 36))
                VStack(alignment: .leading, spacing: 4) {
                    Text("Printable worksheets")
                        .font(theme.displayFont(size: 18))
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                        .foregroundStyle(theme.textPrimary)
                    Text("Generate kid-friendly practice sheets to print or share as PDF.")
                        .font(theme.bodyFont(size: 14))
                        .foregroundStyle(theme.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                FeatherIcon(glyph: .next, size: 18, color: Theme.ink.opacity(0.5))
            }
            .padding(16)
            .background(RoundedRectangle(cornerRadius: 20).fill(theme.cardBackground))
        }
        .buttonStyle(SpringButtonStyle())
    }

    private func levelBadge(_ level: Int) -> some View {
        Text("Lv \(level)")
            .font(.caption.weight(.bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Capsule().fill(Theme.cream))
            .foregroundStyle(Theme.ink)
    }

    private var soonBadge: some View {
        Text("SOON")
            .font(.caption2.weight(.heavy))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Capsule().fill(Theme.cream))
            .foregroundStyle(Theme.ink)
    }

    /// Dev hooks: `simctl launch … com.kidmath.app -autostartMode addition`
    /// jumps straight into a session; `-showPaywall 1` presents the paywall
    /// (screenshots, quick manual testing).
    private func autostartIfRequested() {
        if UserDefaults.standard.bool(forKey: "showPaywall") {
            showPaywall = true
            return
        }
        if GamFlags.meadow, UserDefaults.standard.bool(forKey: "autostartMeadow") {
            showMeadow = true
            return
        }
        guard activeMode == nil,
              let modeId = UserDefaults.standard.string(forKey: "autostartMode"),
              let mode = ModeCatalog.mode(modeId), mode.playable else { return }
        activeMode = mode
    }
}
