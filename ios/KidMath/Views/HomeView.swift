import SwiftUI

/// Home (handoff 2a · 06): teal header, the Keep-going card, three tiles for
/// the kid's grade, topic rows, and a floating tab bar. Play by skill: the
/// card and the chips tell standing in skills, never a level.
struct HomeView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @State private var showSettings = false
    @State private var showWorksheets = false
    @State private var showAbout = false
    @State private var showPaywall = false
    @State private var showFirstFlight = false
    @State private var showProfilePicker = false
    @State private var showMeadow = false
    @State private var showStickers = false
    @State private var engagement: [String: Any] = [:]
    /// The active kid's local practice log — the mastery line on each card
    /// ("1 of 3 skills solid", HomePage.jsx) is computed over it.
    @State private var practiceSessions: [[String: Any]] = []
    /// Play by skill: tapping a topic opens its sheet,
    /// and each card carries "Grade 3 · 1/3" — the shared topicChip, computed
    /// once per refresh rather than per render.
    @State private var topicMode: ModeInfo?
    @State private var topicAutostart: SessionViewModel.SkillRequest?
    @State private var topicChips: [String: [String: Any]] = [:]

    /// Handoff 2a · 06. Teal header with a 110pt overhang the Keep-going card
    /// sits over; "For {grade}" tiles; topic rows; a floating Ink tab bar.
    /// Levels are gone: the card tells the kid's standing in skills.
    enum Tab: String, CaseIterable { case home = "Home", play = "Play", worksheets = "Worksheets", meadow = "Meadow" }
    @State private var tab: Tab = .home

    var body: some View {
        NavigationStack {
            GeometryReader { proxy in
            let regular = proxy.size.width >= 700
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    header(regular: regular, topInset: proxy.safeAreaInsets.top)
                    VStack(alignment: .leading, spacing: 0) {
                        if app.supabase.isSignedIn, app.kidProfiles.activeKidId == nil {
                            profilePrompt.padding(.top, 20)
                        } else {
                            keepGoingCard(regular: regular)
                                .padding(.top, -80)
                        }
                        if tab == .play {
                            allTopics(regular: regular).padding(.top, 28)
                        } else {
                            forGrade(regular: regular).padding(.top, 28)
                            topicRows(regular: regular).padding(.top, 28)
                        }
                    }
                    .padding(.horizontal, regular ? 48 : 20)
                    .frame(maxWidth: 1180)
                    .frame(maxWidth: .infinity)
                    .padding(.bottom, 120)
                }
            }
            .background(GraphPaperBackground())
            .ignoresSafeArea(edges: .top)
            .safeAreaInset(edge: .bottom) { tabBar }
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showSettings) { SettingsView() }
            .sheet(isPresented: $showWorksheets) { WorksheetView() }
            .fullScreenCover(isPresented: $showMeadow) { MeadowView() }
            .sheet(isPresented: $showAbout) { AboutView() }
            .sheet(isPresented: $showStickers, onDismiss: { engagement = EngagementStore().load() }) { StickerBookView(store: EngagementStore()) }
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .fullScreenCover(item: $topicMode, onDismiss: { Task { await refreshAfterPlay() } }) { mode in
                TopicSheetView(mode: mode, autostart: topicAutostart)
            }
            .fullScreenCover(isPresented: $showFirstFlight) { FirstFlightView() }
            .fullScreenCover(isPresented: $showProfilePicker) { ProfilePickerView() }
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
        topicMode = mode
    }

    private func refreshAfterPlay() async {
        topicAutostart = nil
        engagement = EngagementStore().load()
        practiceSessions = app.practiceLog?.readLocal(kidId: app.practiceLog?.activeKidId) ?? []
        await app.refreshModeLevels()
        refreshTopicChips()
    }

    private func refreshTopicChips() {
        guard let engine = app.engine else { return }
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
    /// The landing (2a flow §4): a signed-in parent never sees Welcome again —
    /// one kid goes straight to Home, two or more to the profile picker
    /// (no grown-up check on the way in; editing kids is gated inside).
    /// Signed out and never finished first flight → Welcome.
    private func presentFirstFlightIfNeeded() async {
        guard topicMode == nil, !showPaywall else { return }
        if await app.supabase.restoredSession() {
            UserDefaults.standard.set(true, forKey: FirstFlightView.completedKey)
            await app.kidProfiles.refresh()
            let kids = app.kidProfiles.kids
            if kids.count == 1, app.kidProfiles.activeKidId == nil {
                app.kidProfiles.setActiveKid(kids[0])
            } else if kids.count > 1, app.kidProfiles.activeKidId == nil || !kids.contains(where: { $0.id.uuidString == app.kidProfiles.activeKidId }) {
                showProfilePicker = true
            }
            refreshTopicChips()
        } else if !UserDefaults.standard.bool(forKey: FirstFlightView.completedKey) {
            showFirstFlight = true
        }
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
        guard topicMode == nil,
              let modeId = UserDefaults.standard.string(forKey: "autostartMode"),
              let mode = ModeCatalog.mode(modeId), mode.playable else { return }
        // `-autostartMode subtraction -autostartSkill sub-across-zeros` opens the
        // topic sheet and starts that skill; without a skill the sheet itself
        // is the landing.
        topicAutostart = UserDefaults.standard.string(forKey: "autostartSkill").map { .skill($0) }
        topicMode = mode
    }

    // MARK: - 06 pieces

    /// The topic the kid was in most recently (the practice log).
    private var playedMode: ModeInfo? {
        let last = practiceSessions.max { (($0["startedAt"] as? NSNumber)?.doubleValue ?? 0) < (($1["startedAt"] as? NSNumber)?.doubleValue ?? 0) }
        return (last?["mode"] as? String).flatMap { ModeCatalog.mode($0) }
    }

    /// What the big card offers: the last topic, else the Quick Start pick
    /// (the in-grade topic with the most room), else the first free one.
    private var lastMode: ModeInfo? {
        playedMode ?? quickStartMode ?? ModeCatalog.allModes.first { $0.playable && app.store.canPlay($0.id) }
    }

    private func header(regular: Bool, topInset: CGFloat) -> some View {
        HStack(alignment: .center) {
            Text(app.kidProfiles.activeKidName.map { "\(dayPart), \($0)" } ?? "\(dayPart) — pick a game")
                .font(theme.displayFont(size: regular ? 40 : 34))
                .foregroundStyle(Theme.cream)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer()
            HStack(spacing: 12) {
                Button { showStickers = true } label: {
                    HStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 2).fill(Theme.sun).frame(width: 13, height: 13).rotationEffect(.degrees(45))
                        Text("\(EngagementStore.starBalance(engagement))")
                            .font(theme.displayFont(size: 18))
                            .foregroundStyle(Theme.cream)
                    }
                    .padding(.horizontal, 16)
                    .frame(height: 44)
                    .background(Capsule().fill(Theme.deepTeal))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(EngagementStore.starBalance(engagement)) stars")
                if regular || app.kidProfiles.activeKidId != nil {
                    Button {
                        if app.supabase.isSignedIn, !app.kidProfiles.kids.isEmpty { showProfilePicker = true } else { showSettings = true }
                    } label: {
                        ZStack {
                            Circle().fill(Theme.seafoam)
                            if let kid = app.kidProfiles.kids.first(where: { $0.id.uuidString == app.kidProfiles.activeKidId }) {
                                Text(kid.initial).font(theme.displayFont(size: 20)).foregroundStyle(Theme.ink)
                            } else {
                                Image(systemName: "lock").font(.system(size: 16, weight: .semibold)).foregroundStyle(Theme.ink)
                            }
                        }
                        .frame(width: 48, height: 48)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(app.kidProfiles.activeKidId != nil ? "Switch kid" : "Grown-ups")
                }
            }
        }
        .padding(.horizontal, regular ? 48 : 20)
        .padding(.top, topInset + (regular ? 36 : 24))
        .padding(.bottom, 110)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.teal)
    }

    private var dayPart: String {
        let hour = Calendar.current.component(.hour, from: Date())
        return hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"
    }

    /// The Keep-going card: the last topic, where the kid stands in it by
    /// skill, the Fledging Flight pill when it is earned, and Fly.
    @ViewBuilder
    private func keepGoingCard(regular: Bool) -> some View {
        if let mode = lastMode {
            let chip = topicChips[mode.id]
            let mastered = ProgressStore.double(chip?["mastered"])
            let total = max(1, ProgressStore.double(chip?["total"], default: 1))
            let ready = chip?["flightReady"] as? Bool ?? false
            let body = VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    Text(playedMode == nil ? "START HERE" : "KEEP GOING")
                        .font(theme.bodyFont(size: 13, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(Theme.ink.opacity(0.6))
                    if ready {
                        Text("Ready to fledge")
                            .font(theme.bodyFont(size: 13, weight: .heavy))
                            .foregroundStyle(Theme.cream)
                            .padding(.horizontal, 12).padding(.vertical, 5)
                            .background(Capsule().fill(Theme.sun))
                    }
                }
                Text(mode.label)
                    .font(theme.displayFont(size: regular ? 34 : 28))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1).minimumScaleFactor(0.7)
                HStack(spacing: 14) {
                    GeometryReader { p in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.ink.opacity(0.08))
                            Capsule().fill(Theme.teal).frame(width: p.size.width * mastered / total)
                        }
                    }
                    .frame(height: 8)
                    .frame(maxWidth: regular ? 280 : .infinity)
                    Text(regular ? "\(chip?["gradeLabel"] as? String ?? "") · \(Int(mastered)) of \(Int(total)) skills" : "\(Int(mastered)) of \(Int(total)) skills")
                        .font(theme.bodyFont(size: 15, weight: .bold))
                        .foregroundStyle(Theme.ink.opacity(0.7))
                        .lineLimit(1)
                        .fixedSize()
                }
            }
            let fly = Button {
                topicAutostart = .mix(grade: nil)
                if app.store.canPlay(mode.id) { topicMode = mode } else { showPaywall = true }
            } label: {
                Text("Fly")
                    .font(theme.displayFont(size: 22))
                    .foregroundStyle(Theme.cream)
                    .padding(.horizontal, regular ? 44 : 0)
                    .frame(maxWidth: regular ? nil : .infinity)
                    .frame(height: 64)
                    .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal).shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 5))
            }
            .buttonStyle(SpringButtonStyle())
            let tile = Text(mode.glyph)
                .font(theme.displayFont(size: 40))
                .foregroundStyle(Theme.ink)
                .frame(width: regular ? 96 : 84, height: regular ? 96 : 84)
                .background(RoundedRectangle(cornerRadius: 22).fill(Theme.tealMid).shadow(color: Theme.tealMidDeep, radius: 0, x: 0, y: 5))

            Group {
                if regular {
                    HStack(spacing: 28) {
                        tile
                        body
                        Spacer(minLength: 12)
                        fly
                    }
                } else {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack(alignment: .top, spacing: 18) { tile; body }
                        fly
                    }
                }
            }
            .padding(regular ? 32 : 24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 28).fill(Color.white).shadow(color: Theme.ink.opacity(0.08), radius: 0, x: 0, y: 5))
        }
    }

    /// Three modes for the kid's grade, the last topic excluded.
    private func forGrade(regular: Bool) -> some View {
        let grade = app.kidProfiles.activeKidGrade
        let picks = ModeCatalog.allModes
            .filter { $0.playable && $0.id != lastMode?.id && (grade == nil || GradeSeed.gradeFit(mode: $0.id, grade: grade) == "in") }
            .prefix(3)
        let tints = [(Theme.seafoam, Theme.seafoamDeep), (Theme.apricot, Theme.apricotDeep), (Theme.sunLight, Theme.sunLightDeep)]
        return VStack(alignment: .leading, spacing: 14) {
            Text(grade.map { "For \(gradeWord($0))" } ?? "Try these")
                .font(theme.displayFont(size: 24))
                .foregroundStyle(Theme.ink)
            if regular {
                HStack(spacing: 18) {
                    ForEach(Array(picks.enumerated()), id: \.element.id) { i, mode in
                        gradeTile(mode, tint: tints[i % tints.count], regular: true)
                    }
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(Array(picks.enumerated()), id: \.element.id) { i, mode in
                            gradeTile(mode, tint: tints[i % tints.count], regular: false).frame(width: 150)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.horizontal, -20)
            }
        }
    }

    private func gradeWord(_ grade: String) -> String {
        grade == "K" ? "kindergarten" : "\(grade) grade"
    }

    private func gradeTile(_ mode: ModeInfo, tint: (Color, Color), regular: Bool) -> some View {
        let locked = !app.store.canPlay(mode.id)
        return Button {
            if locked { showPaywall = true } else { open(mode) }
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12).fill(Theme.cream)
                    if locked {
                        Image(systemName: "lock").font(.system(size: 18, weight: .semibold)).foregroundStyle(Theme.ink.opacity(0.5))
                    } else {
                        Text(mode.glyph).font(theme.displayFont(size: 20)).foregroundStyle(Theme.ink)
                    }
                }
                .frame(width: 48, height: 48)
                Spacer(minLength: 8)
                Text(mode.label)
                    .font(theme.displayFont(size: regular ? 20 : 18))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .multilineTextAlignment(.leading)
                if regular {
                    Text(mode.blurb)
                        .font(theme.bodyFont(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .padding(.top, 2)
                }
            }
            .padding(regular ? 22 : 18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: regular ? 150 : 132)
            .background(RoundedRectangle(cornerRadius: 20).fill(tint.0).shadow(color: tint.1, radius: 0, x: 0, y: 5))
        }
        .buttonStyle(SpringButtonStyle())
    }

    /// The topic rows under "For {grade}": the kid's own groups; "All 22
    /// modes" opens the Play tab with everything.
    private func topicRows(regular: Bool) -> some View {
        let grouped = GradeSeed.groupsForGrade(app.kidProfiles.activeKidGrade)
        let shown = Array(grouped.main.prefix(2))
        return VStack(alignment: .leading, spacing: 24) {
            ForEach(Array(shown.enumerated()), id: \.element.id) { i, group in
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(group.title).font(theme.displayFont(size: 22)).foregroundStyle(Theme.ink).lineLimit(1).minimumScaleFactor(0.8)
                        if regular {
                            Text(group.gradeHint.replacingOccurrences(of: "-", with: "–"))
                                .font(theme.bodyFont(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.ink.opacity(0.6))
                        }
                        Spacer()
                        if i == 0 {
                            Button("All \(ModeCatalog.allModes.filter(\.playable).count) modes") { withAnimation { tab = .play } }
                                .font(theme.bodyFont(size: 15, weight: .bold))
                                .foregroundStyle(Theme.teal)
                        }
                    }
                    modeRowFlow(group.modes, regular: regular)
                }
            }
        }
    }

    private func modeRowFlow(_ modes: [ModeInfo], regular: Bool) -> some View {
        Group {
            if regular {
                WrapRow(spacing: 14) {
                    ForEach(modes) { mode in modeRow(mode) }
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) { ForEach(modes) { mode in modeRow(mode) } }.padding(.horizontal, 20)
                }
                .padding(.horizontal, -20)
            }
        }
    }

    private func modeRow(_ mode: ModeInfo) -> some View {
        let locked = !app.store.canPlay(mode.id)
        let tint = theme.modeColor(mode.id)
        return Button {
            guard mode.playable else { return }
            if locked { showPaywall = true } else { open(mode) }
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10).fill(tint)
                    if locked {
                        Image(systemName: "lock").font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.ink.opacity(0.6))
                    } else {
                        Text(mode.glyph).font(theme.displayFont(size: 16)).foregroundStyle(Theme.ink)
                    }
                }
                .frame(width: 36, height: 36)
                Text(mode.label)
                    .font(theme.displayFont(size: 17))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                if !mode.playable { soonBadge }
                if !locked, let chip = topicChips[mode.id], chip["started"] as? Bool ?? false {
                    Text(chip["text"] as? String ?? "")
                        .font(theme.bodyFont(size: 12, weight: .bold))
                        .foregroundStyle(Theme.ink.opacity(0.6))
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, 14)
            .frame(height: 60)
            .background(RoundedRectangle(cornerRadius: 16).fill(Color.white))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink.opacity(0.08), lineWidth: 1))
            .opacity(mode.playable ? 1 : 0.5)
        }
        .buttonStyle(SpringButtonStyle())
        .disabled(!mode.playable)
    }

    /// The Play tab: every group.
    private func allTopics(regular: Bool) -> some View {
        let grouped = GradeSeed.groupsForGrade(app.kidProfiles.activeKidGrade)
        return VStack(alignment: .leading, spacing: 24) {
            Text("All modes").font(theme.displayFont(size: 28)).foregroundStyle(Theme.ink)
            ForEach(grouped.main + grouped.more) { group in
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(group.title).font(theme.displayFont(size: 22)).foregroundStyle(Theme.ink)
                        Text(group.gradeHint.replacingOccurrences(of: "-", with: "–"))
                            .font(theme.bodyFont(size: 14, weight: .semibold))
                            .foregroundStyle(Theme.ink.opacity(0.6))
                    }
                    modeRowFlow(group.modes, regular: regular)
                }
            }
        }
    }

    private var soonBadge: some View {
        Text("SOON")
            .font(.caption2.weight(.heavy))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Capsule().fill(Theme.cream))
            .foregroundStyle(Theme.ink)
    }

    /// The floating Ink tab bar (2a · 06): Home · Play · Worksheets · Meadow.
    private var tabBar: some View {
        HStack(spacing: 4) {
            ForEach(Tab.allCases, id: \.self) { item in
                let active = item == tab
                Button {
                    switch item {
                    case .home, .play: withAnimation(.easeOut(duration: 0.2)) { tab = item }
                    case .worksheets: if app.store.isUnlocked { showWorksheets = true } else { showPaywall = true }
                    case .meadow: showMeadow = true
                    }
                } label: {
                    Text(item.rawValue)
                        .font(theme.displayFont(size: 16))
                        .foregroundStyle(active ? Theme.ink : Theme.cream)
                        .padding(.horizontal, 18)
                        .frame(height: 44)
                        .background(Capsule().fill(active ? Theme.cream : Color.clear))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(6)
        .background(Capsule().fill(Theme.ink))
        .padding(.bottom, 12)
    }
}

/// Wraps its children onto as many rows as they need (Layout).
struct WrapRow: Layout {
    var spacing: CGFloat = 12

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

