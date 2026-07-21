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

    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 220), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    hero
                    ForEach(ModeCatalog.groups) { group in
                        groupSection(group)
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
                        Image(systemName: "gearshape.fill")
                            .foregroundStyle(theme.textSecondary)
                    }
                }
            }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .sheet(isPresented: $showWorksheets) { WorksheetView() }
            .sheet(isPresented: $showAbout) { AboutView() }
            .fullScreenCover(item: $activeMode) { mode in
                SessionView(mode: mode)
            }
            .task {
                await app.refreshModeLevels()
                autostartIfRequested()
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("KidMath")
                .font(theme.displayFont(size: 38))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .foregroundStyle(
                    LinearGradient(colors: theme.heroGradient, startPoint: .leading, endPoint: .trailing)
                )
            Text("Pick a math adventure!")
                .font(.title3.weight(.medium))
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
        Button {
            guard mode.playable else { return }
            activeMode = mode
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(mode.emoji).font(.system(size: 34))
                    Spacer()
                    if mode.playable {
                        if let level = app.modeLevels[mode.id], level > 1 {
                            levelBadge(level)
                        }
                    } else {
                        soonBadge
                    }
                }
                Text(mode.label)
                    .font(.headline)
                    .fontDesign(.rounded)
                    .foregroundStyle(.white)
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

    /// The web homepage's worksheet callout, as a tappable card.
    private var worksheetCallout: some View {
        Button {
            showWorksheets = true
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
                        .font(.subheadline)
                        .foregroundStyle(theme.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(theme.textMuted)
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
            .background(Capsule().fill(.white.opacity(0.35)))
            .foregroundStyle(.white)
    }

    private var soonBadge: some View {
        Text("SOON")
            .font(.caption2.weight(.heavy))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Capsule().fill(.white.opacity(0.35)))
            .foregroundStyle(.white)
    }

    /// Dev hook: `simctl launch … com.kidmath.app -autostartMode addition`
    /// jumps straight into a session (screenshots, quick manual testing).
    private func autostartIfRequested() {
        guard activeMode == nil,
              let modeId = UserDefaults.standard.string(forKey: "autostartMode"),
              let mode = ModeCatalog.mode(modeId), mode.playable else { return }
        activeMode = mode
    }
}
