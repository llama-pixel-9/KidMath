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
    @State private var showMore = false
    @State private var showStickers = false
    @State private var engagement: [String: Any] = [:]
    /// The active kid's local practice log — the mastery line on each card
    /// ("1 of 3 skills solid", HomePage.jsx) is computed over it.
    @State private var practiceSessions: [[String: Any]] = []
    /// Play by skill (GamFlags.skillsPlay): tapping a topic opens its sheet,
    /// and each card carries "Grade 3 · 1/3" — the shared topicChip, computed
    /// once per refresh rather than per render.
    @State private var topicMode: ModeInfo?
    @State private var topicAutostart: SessionViewModel.SkillRequest?
    @State private var topicChips: [String: [String: Any]] = [:]

    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 220), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    hero
                    if app.supabase.isSignedIn, app.kidProfiles.activeKidId == nil {
                        profilePrompt
                    }
                    // Grade-aware order (HomePage.jsx groupsForGrade): the
                    // kid's groups first, outgrown ones after, bigger-kid
                    // topics folded away behind "Explore more".
                    let grouped = GradeSeed.groupsForGrade(app.kidProfiles.activeKidGrade)
                    ForEach(grouped.main) { group in
                        groupSection(group)
                    }
                    if !grouped.more.isEmpty {
                        Button {
                            withAnimation(.easeOut(duration: 0.2)) { showMore.toggle() }
                        } label: {
                            Text(showMore ? "Hide the bigger-kid topics" : "Explore more — \(grouped.more.count) topic\(grouped.more.count == 1 ? "" : "s") for bigger kids")
                                .font(theme.bodyFont(size: 15, weight: .bold))
                                .foregroundStyle(Theme.teal)
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(RoundedRectangle(cornerRadius: 14).stroke(Theme.teal, lineWidth: 1.5))
                        }
                        .buttonStyle(.plain)
                        if showMore {
                            ForEach(grouped.more) { group in
                                groupSection(group)
                            }
                        }
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
            .sheet(isPresented: $showStickers, onDismiss: { engagement = EngagementStore().load() }) { StickerBookView(store: EngagementStore()) }
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .fullScreenCover(item: $activeMode) { mode in
                SessionView(mode: mode)
            }
            .fullScreenCover(item: $topicMode, onDismiss: { Task { await refreshAfterPlay() } }) { mode in
                TopicSheetView(mode: mode, autostart: topicAutostart)
            }
            .fullScreenCover(isPresented: $showFirstFlight) { FirstFlightView() }
            .fullScreenCover(isPresented: $showProfilePicker) { ProfilePickerView() }
            .onChange(of: activeMode) { _, mode in
                if mode == nil {
                    engagement = EngagementStore().load()
                    practiceSessions = app.practiceLog?.readLocal(kidId: app.practiceLog?.activeKidId) ?? []
                }
            }
            .task {
                engagement = EngagementStore().load()
                practiceSessions = app.practiceLog?.readLocal(kidId: app.practiceLog?.activeKidId) ?? []
                await app.refreshModeLevels()
                refreshTopicChips()
                autostartIfRequested()
                await presentFirstFlightIfNeeded()
            }
        }
    }

    /// Open a topic: its sheet when playing by skill, else straight into the
    /// ladder session.
    private func open(_ mode: ModeInfo) {
        if GamFlags.skillsPlay { topicMode = mode } else { activeMode = mode }
    }

    private func refreshAfterPlay() async {
        topicAutostart = nil
        engagement = EngagementStore().load()
        practiceSessions = app.practiceLog?.readLocal(kidId: app.practiceLog?.activeKidId) ?? []
        await app.refreshModeLevels()
        refreshTopicChips()
    }

    private func refreshTopicChips() {
        guard GamFlags.skillsPlay, let engine = app.engine else { return }
        var chips: [String: [String: Any]] = [:]
        for mode in ModeCatalog.allModes where mode.playable {
            let context: [String: Any] = [
                "profileGrade": app.kidProfiles.activeKidGrade ?? NSNull(),
                "sessions": practiceSessions.filter { ($0["mode"] as? String) == mode.id },
            ]
            chips[mode.id] = engine.topicChip(mode: mode.id, progress: app.modeProgress[mode.id] ?? [:], context: context)
        }
        topicChips = chips
    }

    /// Quick Start by skill: the in-grade topic the family can open with the
    /// lowest share of its grade's skills mastered (HomePage.jsx quickStartFor).
    private var quickStartMode: ModeInfo? {
        let grade = app.kidProfiles.activeKidGrade
        guard GamFlags.skillsPlay else {
            return GradeSeed.quickStart(grade: grade, levels: app.modeLevels).flatMap { ModeCatalog.mode($0) }
        }
        guard GradeSeed.gradeIndex(grade) != nil else { return nil }
        func share(_ id: String) -> Double? {
            guard let chip = topicChips[id] else { return nil }
            return ProgressStore.double(chip["mastered"]) / max(1, ProgressStore.double(chip["total"], default: 1))
        }
        return ModeCatalog.groups.flatMap(\.modes)
            .filter { $0.playable && GradeSeed.gradeFit(mode: $0.id, grade: grade) == "in" && app.store.canPlay($0.id) && share($0.id) != nil }
            .min { (share($0.id) ?? 1) < (share($1.id) ?? 1) }
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
            if GamFlags.flightReport {
                EngagementBarView(state: engagement) { showStickers = true }
                    .padding(.top, 4)
            }
            HStack(spacing: 10) {
                // Quick Start: the in-grade mode with the most room to grow.
                if let mode = quickStartMode {
                    Button {
                        if !app.store.canPlay(mode.id) {
                            showPaywall = true
                        } else if GamFlags.skillsPlay {
                            // Straight into "Larkit picks" for the topic's focus grade.
                            topicAutostart = .mix(grade: nil)
                            topicMode = mode
                        } else {
                            activeMode = mode
                        }
                    } label: {
                        Label("Quick Start", systemImage: "bolt.fill")
                            .font(theme.bodyFont(size: 15, weight: .bold))
                            .foregroundStyle(Theme.cream)
                            .padding(.horizontal, 16)
                            .frame(height: 40)
                            .background(Capsule().fill(Theme.teal))
                    }
                    .buttonStyle(SpringButtonStyle())
                    .accessibilityHint("Starts \(mode.label)")
                }
                // The kid chip: who is playing, and the way to switch.
                if app.supabase.isSignedIn, !app.kidProfiles.kids.isEmpty {
                    Button {
                        showProfilePicker = true
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "person.crop.circle")
                            Text(app.kidProfiles.activeKidName ?? "Who's playing?")
                            Image(systemName: "chevron.down").font(.caption.weight(.bold))
                        }
                        .font(theme.bodyFont(size: 14, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 12)
                        .frame(height: 40)
                        .background(Capsule().fill(Color.white))
                        .overlay(Capsule().stroke(Theme.ink.opacity(0.12), lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Switch kid")
                }
            }
            .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }

    /// Signed in with no active kid: levels, stars and the progress report
    /// are per kid, so ask for a profile before anything is played.
    private var profilePrompt: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Set up a profile for your kid so their levels, stars and progress report are their own.")
                .font(theme.bodyFont(size: 15, weight: .semibold))
                .foregroundStyle(Theme.ink)
            Button(app.kidProfiles.kids.isEmpty ? "Add a kid" : "Choose who's playing") {
                if app.kidProfiles.kids.isEmpty { showFirstFlight = true } else { showProfilePicker = true }
            }
            .font(theme.bodyFont(size: 15, weight: .bold))
            .foregroundStyle(Theme.teal)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.seafoam.opacity(0.35)))
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
                open(mode)
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
                    // (A ladder nomination has no meaning by skill: the Fledging
                    // Flight is earned by mastering the grade, on the topic sheet.)
                    if !locked, GamFlags.fledging, !GamFlags.skillsPlay, EngagementStore().nomination(for: mode.id) != nil {
                        Text("Ready to fledge")
                            .font(theme.bodyFont(size: 11, weight: .heavy))
                            .foregroundStyle(Theme.ink)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(Theme.sun))
                    }
                    if !mode.playable {
                        soonBadge
                    } else if !locked, GamFlags.skillsPlay {
                        if let chip = topicChips[mode.id] {
                            chipBadge((chip["flightReady"] as? Bool ?? false) ? "Fledging Flight ready"
                                : (chip["started"] as? Bool ?? false) ? (chip["text"] as? String ?? "") : "New")
                        }
                    } else if !locked, let level = app.modeLevels[mode.id], level > 1 {
                        levelBadge(level)
                    }
                }
                Text(mode.label)
                    .font(theme.displayFont(size: 16))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2, reservesSpace: true)
                    .multilineTextAlignment(.leading)
                // "1 of 3 skills solid" — mastery over the practice log, the
                // shared masterySummary (teach-don't-grade: skills, not scores).
                if !locked, !GamFlags.skillsPlay, let line = app.engine?.masteryLine(sessions: practiceSessions, mode: mode.id) {
                    Text(line)
                        .font(theme.bodyFont(size: 11, weight: .bold))
                        .foregroundStyle(Theme.ink.opacity(0.65))
                        .lineLimit(1)
                }
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

    private func chipBadge(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.bold))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Capsule().fill(Theme.cream))
            .foregroundStyle(Theme.ink)
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

    /// Dev hooks: `simctl launch … io.larkit.app -autostartMode addition`
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
        guard activeMode == nil, topicMode == nil,
              let modeId = UserDefaults.standard.string(forKey: "autostartMode"),
              let mode = ModeCatalog.mode(modeId), mode.playable else { return }
        // `-skillsPlay 1 -autostartMode subtraction -autostartSkill sub-across-zeros`
        // opens the topic sheet and starts that skill; without a skill the
        // sheet itself is the landing.
        if GamFlags.skillsPlay {
            topicAutostart = UserDefaults.standard.string(forKey: "autostartSkill").map { .skill($0) }
            topicMode = mode
            return
        }
        activeMode = mode
    }
}
