import SwiftUI

/// What a grown-up can change about play by skill, per kid and per topic:
/// open a later grade (the 2nd grader who is ahead) and pin a skill — which
/// becomes the topic sheet's big "Practice" button until it is mastered. The
/// SwiftUI twin of TopicControls in src/engagement/GrownUpsPanel.jsx; the
/// options and the patches are the shared flow's (skillParentControls /
/// unlockGradePatch). Reached from Settings behind the parental gate.
struct TopicControlsView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme

    @State private var progress: [String: [String: Any]] = [:]
    @State private var sessions: [[String: Any]] = []
    @State private var loaded = false

    var body: some View {
        Form {
            Section {
                Text("Larkit starts each topic at \(app.kidProfiles.activeKidName ?? "your kid")'s grade and opens the next grade when every skill is mastered. Open a grade early, or pin one skill to practice first.")
                    .font(theme.bodyFont(size: 14, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)
            }
            if !loaded {
                Section { ProgressView() }
            }
            ForEach(ModeCatalog.groups) { group in
                Section(group.title) {
                    ForEach(group.modes.filter { $0.playable && app.store.canPlay($0.id) }) { mode in
                        if let controls = controls(for: mode.id) {
                            topicRows(mode, controls)
                        }
                    }
                }
            }
        }
        .navigationTitle("Skills to practice")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    @ViewBuilder
    private func topicRows(_ mode: ModeInfo, _ controls: [String: Any]) -> some View {
        let grades = controls["grades"] as? [[String: Any]] ?? []
        let groups = controls["pinGroups"] as? [[String: Any]] ?? []
        VStack(alignment: .leading, spacing: 6) {
            Text(mode.label).font(theme.bodyFont(size: 16, weight: .heavy)).foregroundStyle(Theme.ink)
            Picker("Open a grade", selection: Binding(
                get: { controls["gradeUnlocked"] as? String ?? "" },
                set: { grade in Task { await unlock(mode.id, grade: grade) } }
            )) {
                ForEach(grades.indices, id: \.self) { i in
                    Text(grades[i]["label"] as? String ?? "").tag(grades[i]["grade"] as? String ?? "")
                }
            }
            .accessibilityLabel("Open a grade for \(mode.label)")
            Picker("Pin a skill", selection: Binding(
                get: { controls["pinnedSkillId"] as? String ?? "" },
                set: { id in Task { await save(mode.id, patch: ["pinnedSkillId": id.isEmpty ? NSNull() : id]) } }
            )) {
                Text("No pinned skill — Larkit picks").tag("")
                ForEach(groups.indices, id: \.self) { g in
                    let skills = groups[g]["skills"] as? [[String: Any]] ?? []
                    Section(groups[g]["label"] as? String ?? "") {
                        ForEach(skills.indices, id: \.self) { i in
                            Text(skills[i]["title"] as? String ?? "").tag(skills[i]["id"] as? String ?? "")
                        }
                    }
                }
            }
            .accessibilityLabel("Pin a skill for \(mode.label)")
        }
        .font(theme.bodyFont(size: 14, weight: .semibold))
    }

    // MARK: - Model

    private func context(_ mode: String) -> [String: Any] {
        [
            "profileGrade": app.kidProfiles.activeKidGrade ?? NSNull(),
            "sessions": sessions.filter { ($0["mode"] as? String) == mode },
        ]
    }

    private func controls(for mode: String) -> [String: Any]? {
        guard loaded else { return nil }
        return app.engine?.skillParentControls(mode: mode, progress: progress[mode] ?? [:], context: context(mode))
    }

    private func load() async {
        sessions = await app.practiceLog?.loadSessions().sessions ?? []
        await app.refreshModeLevels()
        progress = app.modeProgress
        loaded = true
    }

    private func unlock(_ mode: String, grade: String) async {
        guard let engine = app.engine else { return }
        await save(mode, patch: engine.unlockGradePatch(mode: mode, progress: progress[mode] ?? [:], context: context(mode), grade: grade))
    }

    private func save(_ mode: String, patch: [String: Any]) async {
        guard !patch.isEmpty else { return }
        await app.progressStore.saveTopicState(mode: mode, patch: patch)
        var entry = progress[mode] ?? [:]
        for (key, value) in patch {
            if value is NSNull { entry.removeValue(forKey: key) } else { entry[key] = value }
        }
        progress[mode] = entry
    }
}
