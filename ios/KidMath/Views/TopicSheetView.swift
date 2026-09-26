import SwiftUI

/// What a kid sees after tapping a topic: one big
/// default — "Practice — Larkit picks", an adaptive mix across their grade's
/// skills — and under it the grade's skills with where they stand, each
/// tappable. No levels. The SwiftUI twin of src/play/TopicSheet.jsx.
///
/// Everything shown is the shared `topicSheetModel` (src/skills/flow.js): the
/// grade is never asked (profile grade, or where the kid already is), earlier
/// grades are always open, a later grade opens by mastery or by a grown-up.
/// The same skills, with the same names, are what the worksheets print.
struct TopicSheetView: View {
    let mode: ModeInfo
    /// Dev hook (`-autostartSkill <id>`): open straight into one skill.
    var autostart: SessionViewModel.SkillRequest?

    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var sheet: [String: Any]?
    @State private var shownGrade: String?
    @State private var progress: [String: Any] = [:]
    @State private var sessions: [[String: Any]] = []
    @State private var running: Run?
    @State private var didAutostart = false

    /// One session launched from the sheet (Identifiable for the cover).
    struct Run: Identifiable {
        let id = UUID()
        let request: SessionViewModel.SkillRequest
    }

    /// Skill names are parent wording; the littlest kids get them read aloud.
    private var readAloud: Bool {
        (GradeSeed.gradeIndex(app.kidProfiles.activeKidGrade) ?? 9) <= 1
    }

    var body: some View {
        ZStack {
            theme.background.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Button { dismiss() } label: {
                        Text("← Topics")
                            .font(theme.bodyFont(size: 15, weight: .bold))
                            .foregroundStyle(theme.textSecondary)
                            .frame(minHeight: 44, alignment: .leading)
                    }
                    .buttonStyle(.plain)

                    if let sheet {
                        content(sheet)
                    } else {
                        RoundedRectangle(cornerRadius: 18).fill(Theme.ink.opacity(0.06))
                            .frame(height: 64)
                            .padding(.top, 60)
                    }
                }
                .frame(maxWidth: 400) // the session's centered narrow column
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
                .frame(maxWidth: .infinity)
            }
        }
        .task { await load() }
        .fullScreenCover(item: $running, onDismiss: { Task { await load() } }) { run in
            SessionView(mode: mode, skillRequest: run.request)
        }
    }

    @ViewBuilder
    private func content(_ sheet: [String: Any]) -> some View {
        let grade = sheet["grade"] as? String ?? ""
        let open = sheet["open"] as? [[String: Any]] ?? []
        let skills = sheet["skills"] as? [[String: Any]] ?? []

        Text(sheet["topicLabel"] as? String ?? mode.label)
            .font(theme.displayFont(size: 32))
            .foregroundStyle(theme.textPrimary)
            .padding(.top, 4)
        Text(sheet["gradeLabel"] as? String ?? "")
            .font(theme.bodyFont(size: 15, weight: .semibold))
            .foregroundStyle(theme.textSecondary)

        if open.count > 1 {
            HStack(spacing: 6) {
                ForEach(open.indices, id: \.self) { i in
                    let g = open[i]["grade"] as? String ?? ""
                    Button {
                        shownGrade = g
                        rebuild()
                    } label: {
                        Text(g)
                            .font(theme.bodyFont(size: 15, weight: .bold))
                            .foregroundStyle(g == grade ? Theme.teal : theme.textSecondary)
                            .frame(minWidth: 40, minHeight: 40)
                            .background(Circle().fill(g == grade ? Theme.seafoam.opacity(0.3) : Color.white))
                            .overlay(Circle().stroke(g == grade ? Theme.teal : Theme.ink.opacity(0.1), lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(open[i]["label"] as? String ?? g)
                    .accessibilityAddTraits(g == grade ? .isSelected : [])
                }
            }
            .padding(.top, 12)
        }

        if let flight = sheet["flight"] as? [String: Any] {
            flightCard(flight)
        }

        Button {
            start(practiceRequest(sheet))
        } label: {
            // (SF Symbol, not "▶": iOS draws that character as an emoji.)
            HStack(spacing: 8) {
                Image(systemName: "play.fill").font(.system(size: 16, weight: .bold))
                Text(sheet["practiceLabel"] as? String ?? "Practice")
                    .font(theme.displayFont(size: 21))
                    .multilineTextAlignment(.center)
            }
            .foregroundStyle(Theme.cream)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: 64)
            // Nearest background first: the teal face, then its deep-teal edge.
            .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal))
            .background(RoundedRectangle(cornerRadius: 18).fill(Theme.deepTeal).offset(y: 5))
        }
        .buttonStyle(SpringButtonStyle())
        .padding(.top, 20)
        Text(sheet["practiceNote"] as? String ?? "")
            .font(theme.bodyFont(size: 12, weight: .semibold))
            .foregroundStyle(theme.textMuted)
            .frame(maxWidth: .infinity)
            .multilineTextAlignment(.center)
            .padding(.top, 12)

        Text("OR PICK A SKILL")
            .font(theme.bodyFont(size: 12, weight: .bold))
            .tracking(0.8)
            .foregroundStyle(theme.textMuted)
            .padding(.top, 28)
            .padding(.bottom, 8)
        VStack(spacing: 8) {
            ForEach(skills.indices, id: \.self) { i in
                skillCard(skills[i])
            }
        }

        Text(sheet["footer"] as? String ?? "")
            .font(theme.bodyFont(size: 15, weight: .bold))
            .foregroundStyle(theme.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
        if let note = sheet["completeNote"] as? String {
            Text(note)
                .font(theme.bodyFont(size: 12, weight: .semibold))
                .foregroundStyle(theme.textMuted)
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
        }
    }

    /// The earned Fledging Flight — or "one more good practice first".
    private func flightCard(_ flight: [String: Any]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(flight["headline"] as? String ?? "")
                .font(theme.bodyFont(size: 15, weight: .heavy))
            Text(flight["detail"] as? String ?? "")
                .font(theme.bodyFont(size: 14, weight: .bold))
                .foregroundStyle(Theme.ink.opacity(0.8))
                .fixedSize(horizontal: false, vertical: true)
            if !(flight["needsPractice"] as? Bool ?? false) {
                Button { start(.flight) } label: {
                    Text(flight["button"] as? String ?? "Take the Fledging Flight")
                        .font(theme.displayFont(size: 18))
                        .foregroundStyle(Theme.cream)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.ink))
                }
                .buttonStyle(SpringButtonStyle())
                .padding(.top, 4)
            }
        }
        .foregroundStyle(Theme.ink)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.sunLight))
        .padding(.top, 20)
    }

    private func skillCard(_ skill: [String: Any]) -> some View {
        let title = skill["title"] as? String ?? ""
        let mastered = (skill["state"] as? String) == "mastered"
        return HStack(spacing: 0) {
            Button {
                if let id = skill["id"] as? String { start(.skill(id)) }
            } label: {
                HStack(spacing: 12) {
                    SkillBadgeView(skill: skill)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(theme.bodyFont(size: 15, weight: .bold))
                            .foregroundStyle(theme.textPrimary)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(skill["statusText"] as? String ?? "")
                            .font(theme.bodyFont(size: 12, weight: .semibold))
                            .foregroundStyle(mastered ? Theme.teal : theme.textMuted)
                    }
                    Spacer(minLength: 0)
                    if !readAloud {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(Theme.ink.opacity(0.3))
                    }
                }
                .padding(.leading, 12)
                .padding(.trailing, 10)
                .padding(.vertical, 12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(title) — \(skill["stateLabel"] as? String ?? "")")

            if readAloud {
                Rectangle().fill(Theme.ink.opacity(0.05)).frame(width: 2)
                Button { SpeechService.shared.speak(title) } label: {
                    Image(systemName: "speaker.wave.2")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Theme.teal)
                        .frame(width: 48)
                        .frame(maxHeight: .infinity)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Read aloud: \(title)")
            }
        }
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.white))
        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.deepTeal.opacity(0.08)).offset(y: 3))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink.opacity(0.1), lineWidth: 2))
    }

    // MARK: - Model

    private var context: [String: Any] {
        ["profileGrade": app.kidProfiles.activeKidGrade ?? NSNull(), "sessions": sessions]
    }

    private func practiceRequest(_ sheet: [String: Any]) -> SessionViewModel.SkillRequest {
        let request = sheet["practiceRequest"] as? [String: Any] ?? [:]
        if let skill = request["skill"] as? String { return .skill(skill) }
        return .mix(grade: request["grade"] as? String)
    }

    private func start(_ request: SessionViewModel.SkillRequest) {
        running = Run(request: request)
    }

    private func rebuild() {
        sheet = app.engine?.topicSheetModel(mode: mode.id, progress: progress, context: context, shownGrade: shownGrade)
    }

    /// Progress and the practice log (the family account's when signed in),
    /// then the model — and whatever the saved row was missing (a grade for a
    /// kid who played before skills, mastery rebuilt from the log, a focus
    /// that moved up) is written down once. Never the level.
    private func load() async {
        progress = await app.progressStore.load(mode: mode.id)
        let log = await app.practiceLog?.loadSessions().sessions ?? []
        sessions = log.filter { ($0["mode"] as? String) == mode.id }
        rebuild()
        if let toSave = sheet?["toSave"] as? [String: Any], !toSave.isEmpty {
            await app.progressStore.saveTopicState(mode: mode.id, patch: toSave)
            progress.merge(toSave) { _, new in new }
            rebuild()
        }
        if let autostart, !didAutostart {
            didAutostart = true
            start(autostart)
        }
    }
}

/// Where a skill stands, as a badge a kid can read without words: a play
/// button (not started), a ring filling toward mastery, a star.
struct SkillBadgeView: View {
    let skill: [String: Any]

    var body: some View {
        let state = skill["state"] as? String ?? "new"
        ZStack {
            if state == "mastered" {
                Circle().fill(Theme.teal)
                Image(systemName: "star.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Theme.sun)
            } else if state == "new" {
                Circle().fill(Theme.seafoam.opacity(0.5))
                Image(systemName: "play.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Theme.teal)
                    .offset(x: 1)
            } else {
                let right = ProgressStore.double(skill["right"])
                let goal = max(1, ProgressStore.double(skill["goal"], default: 8))
                Circle().stroke(Theme.ink.opacity(0.1), lineWidth: 4).padding(2)
                Circle()
                    .trim(from: 0, to: min(1, right / goal))
                    .stroke(Theme.teal, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .padding(2)
                Text("\(Int(right))")
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.teal)
            }
        }
        .frame(width: 40, height: 40)
        .accessibilityHidden(true)
    }
}
