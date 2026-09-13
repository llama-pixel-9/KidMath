import SwiftUI

/// The parent report — port of src/analytics/ParentReportPage.jsx over the
/// SAME `buildReport` model (shared through the engine), so the iPad and the
/// web tell a parent the same story from the same practice log. Sections in
/// the web's order: headline, totals, what to do, practice over time, skills,
/// strengths & shaky spots, questions that tripped them up, when they practice.
struct ParentReportView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme

    private static let ranges: [(days: Int?, label: String)] = [
        (7, "7 days"), (30, "30 days"), (90, "90 days"), (nil, "All time"),
    ]

    @State private var days: Int? = 30
    @State private var sessions: [[String: Any]] = []
    @State private var source = "local"
    @State private var busy = true
    @State private var expandedMode: String?

    private var kidName: String? { app.kidProfiles.activeKidName }

    private var report: [String: Any] {
        app.practiceLog?.buildReport(sessions: sessions, days: days) ?? [:]
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                let r = report
                let t = r["totals"] as? [String: Any] ?? [:]
                Text(busy ? "Loading…" : (app.practiceLog?.headline(report: r, kidName: kidName) ?? ""))
                    .font(theme.bodyFont(size: 17, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                tiles(t)
                recommendations(r["recommendations"] as? [[String: Any]] ?? [])
                overTime(r)
                skills(r["modes"] as? [[String: Any]] ?? [])
                strengthsAndShaky(strengths: r["strengths"] as? [[String: Any]] ?? [], needsWork: r["needsWork"] as? [[String: Any]] ?? [])
                struggles(r["struggles"] as? [[String: Any]] ?? [], slowButRight: r["slowButRight"] as? [[String: Any]] ?? [])
                whenTheyPractice(r["when"] as? [String: Any] ?? [:])
                Text(source == "cloud" ? "From your account — every device." : "From this device only. Sign in to include every device.")
                    .font(theme.bodyFont(size: 12, weight: .semibold))
                    .foregroundStyle(theme.textMuted)
                    .padding(.bottom, 24)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .frame(maxWidth: 760)
            .frame(maxWidth: .infinity)
        }
        .background(theme.background.ignoresSafeArea())
        .navigationTitle("Progress report")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        busy = true
        defer { busy = false }
        guard let log = app.practiceLog else { return }
        let result = await log.loadSessions()
        sessions = result.sessions
        source = result.source
    }

    // MARK: - Sections

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(kidName.map { "\($0)'s practice" } ?? "Practice report")
                .font(theme.displayFont(size: 30))
                .foregroundStyle(Theme.ink)
            HStack(spacing: 8) {
                ForEach(Self.ranges, id: \.label) { range in
                    let selected = range.days == days
                    Button(range.label) { days = range.days }
                        .font(theme.bodyFont(size: 14, weight: .bold))
                        .foregroundStyle(selected ? Theme.cream : Theme.ink)
                        .padding(.horizontal, 14)
                        .frame(height: 36)
                        .background(Capsule().fill(selected ? Theme.teal : Color.white))
                        .overlay(Capsule().stroke(Theme.ink.opacity(selected ? 0 : 0.12), lineWidth: 1.5))
                        .buttonStyle(.plain)
                }
            }
        }
    }

    private func tiles(_ t: [String: Any]) -> some View {
        let minutes = int(t["minutes"]), sessionsN = int(t["sessions"]), questions = int(t["questions"])
        let accuracy = t["accuracy"] as? NSNumber
        let streak = int(t["streakDays"]), levelUps = int(t["levelUps"])
        let activeDays = int(t["activeDays"]), retries = int(t["retriesMastered"]), perfect = int(t["perfectSessions"])
        let taken = int(t["challengesTaken"]), passed = int(t["challengesPassed"])
        let avg = (t["avgSessionMinutes"] as? NSNumber)?.doubleValue ?? 0
        let columns = [GridItem(.adaptive(minimum: 150), spacing: 10)]
        return LazyVGrid(columns: columns, spacing: 10) {
            tile("\(minutes)", "minutes practiced", sub: "\(avg.formatted(.number.precision(.fractionLength(0...1)))) min per session")
            tile("\(sessionsN)", "sessions", sub: "on \(activeDays) day\(activeDays == 1 ? "" : "s")")
            tile("\(questions)", "questions answered", sub: nil)
            tile(accuracy.map { "\($0.intValue)%" } ?? "—", "right on the first try", sub: retries > 0 ? "\(retries) fixed on a retry" : nil)
            tile("\(streak)", "day streak", sub: perfect > 0 ? "\(perfect) perfect session\(perfect == 1 ? "" : "s")" : nil)
            tile("\(levelUps)", "level-up\(levelUps == 1 ? "" : "s")", sub: taken > 0 ? "\(passed)/\(taken) challenge flights passed" : nil)
        }
    }

    private func tile(_ value: String, _ label: String, sub: String?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(theme.displayFont(size: 28)).foregroundStyle(Theme.ink)
            Text(label).font(theme.bodyFont(size: 13, weight: .bold)).foregroundStyle(Theme.ink.opacity(0.7))
            if let sub {
                Text(sub).font(theme.bodyFont(size: 12, weight: .semibold)).foregroundStyle(theme.textMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink.opacity(0.08), lineWidth: 1.5))
    }

    @ViewBuilder
    private func recommendations(_ items: [[String: Any]]) -> some View {
        if !items.isEmpty {
            section("What to do with this", intro: nil) {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                        HStack(alignment: .top, spacing: 8) {
                            Text("•").foregroundStyle(Theme.teal)
                            Text(item["text"] as? String ?? "")
                        }
                        .font(theme.bodyFont(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                    }
                }
            }
        }
    }

    private func overTime(_ r: [String: Any]) -> some View {
        let byDay = r["byDay"] as? [[String: Any]]
        let buckets = byDay ?? (r["byWeek"] as? [[String: Any]] ?? [])
        return section("Practice over time", intro: byDay != nil ? "Minutes each day." : "Minutes each week, with first-try accuracy under each bar.") {
            barChart(buckets, subKey: byDay != nil ? nil : "accuracy")
        }
    }

    private func barChart(_ buckets: [[String: Any]], subKey: String?, compact: Bool = false) -> some View {
        let maxMinutes = max(1, buckets.map { int($0["minutes"]) }.max() ?? 1)
        return HStack(alignment: .bottom, spacing: compact ? 4 : 8) {
            ForEach(Array(buckets.enumerated()), id: \.offset) { _, b in
                let m = int(b["minutes"])
                VStack(spacing: 3) {
                    if !compact {
                        Text(m > 0 ? "\(m)" : "").font(theme.bodyFont(size: 11, weight: .bold)).foregroundStyle(theme.textMuted)
                    }
                    RoundedRectangle(cornerRadius: 4)
                        .fill(m > 0 ? Theme.tealMid : Theme.ink.opacity(0.06))
                        .frame(height: CGFloat(m) / CGFloat(maxMinutes) * (compact ? 44 : 90) + 4)
                    Text(b["label"] as? String ?? "")
                        .font(theme.bodyFont(size: compact ? 9 : 11, weight: .bold))
                        .foregroundStyle(theme.textMuted)
                        .lineLimit(1).minimumScaleFactor(0.6)
                    if let subKey, let acc = b[subKey] as? NSNumber {
                        Text("\(acc.intValue)%").font(theme.bodyFont(size: 10, weight: .semibold)).foregroundStyle(theme.textMuted)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func skills(_ modes: [[String: Any]]) -> some View {
        section("Skills", intro: "Levels climb by skill, not time: each activity has its own ladder, and the grade range says what it covers. Tap a row to see it broken down by skill.") {
            VStack(spacing: 0) {
                if modes.isEmpty {
                    Text("No practice in this period yet.").font(theme.bodyFont(size: 14, weight: .semibold)).foregroundStyle(theme.textMuted)
                }
                ForEach(Array(modes.enumerated()), id: \.offset) { _, m in
                    skillRow(m)
                }
            }
        }
    }

    private func skillRow(_ m: [String: Any]) -> some View {
        let id = m["id"] as? String ?? ""
        let expanded = expandedMode == id
        let subskills = m["subskills"] as? [[String: Any]] ?? []
        return VStack(alignment: .leading, spacing: 6) {
            Button {
                withAnimation(.easeOut(duration: 0.2)) { expandedMode = expanded ? nil : id }
            } label: {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(m["label"] as? String ?? id).font(theme.bodyFont(size: 16, weight: .heavy)).foregroundStyle(Theme.ink)
                        Text("Level \(int(m["levelNow"]))\(int(m["levelStart"]) != int(m["levelNow"]) ? " (from \(int(m["levelStart"])))" : "") · \(m["gradeSpan"] as? String ?? "")")
                            .font(theme.bodyFont(size: 12, weight: .semibold)).foregroundStyle(theme.textMuted)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text((m["accuracy"] as? NSNumber).map { "\($0.intValue)%" } ?? "—").font(theme.bodyFont(size: 16, weight: .heavy)).foregroundStyle(Theme.ink)
                        Text("\(int(m["questions"])) q · \(int(m["minutes"])) min").font(theme.bodyFont(size: 12, weight: .semibold)).foregroundStyle(theme.textMuted)
                    }
                    Image(systemName: expanded ? "chevron.up" : "chevron.down").font(.caption.weight(.bold)).foregroundStyle(theme.textMuted)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if expanded {
                ForEach(Array(subskills.enumerated()), id: \.offset) { _, s in
                    HStack {
                        Text(s["label"] as? String ?? s["id"] as? String ?? "").font(theme.bodyFont(size: 13, weight: .semibold)).foregroundStyle(Theme.ink.opacity(0.8))
                        Spacer()
                        Text("\((s["accuracy"] as? NSNumber).map { "\($0.intValue)%" } ?? "—") · \(int(s["attempts"])) tries")
                            .font(theme.bodyFont(size: 12, weight: .semibold)).foregroundStyle(theme.textMuted)
                    }
                    .padding(.leading, 8)
                }
            }
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink.opacity(0.08)).frame(height: 1) }
    }

    @ViewBuilder
    private func strengthsAndShaky(strengths: [[String: Any]], needsWork: [[String: Any]]) -> some View {
        if !strengths.isEmpty || !needsWork.isEmpty {
            section("Strengths and shaky spots", intro: "Skills with at least four tries. Above 90% is solid; under 70% is worth a few extra minutes.") {
                VStack(alignment: .leading, spacing: 12) {
                    skillList("Solid", strengths, empty: "Not enough tries yet.", tint: Theme.teal)
                    skillList("Shaky", needsWork, empty: "Nothing under 70% — nice.", tint: Theme.sun)
                }
            }
        }
    }

    private func skillList(_ title: String, _ items: [[String: Any]], empty: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(theme.bodyFont(size: 12, weight: .heavy)).foregroundStyle(tint)
            if items.isEmpty {
                Text(empty).font(theme.bodyFont(size: 13, weight: .semibold)).foregroundStyle(theme.textMuted)
            }
            ForEach(Array(items.enumerated()), id: \.offset) { _, s in
                Text("\(s["label"] as? String ?? "") — \(s["modeLabel"] as? String ?? ""), \((s["accuracy"] as? NSNumber)?.intValue ?? 0)% of \(int(s["attempts"]))")
                    .font(theme.bodyFont(size: 14, weight: .semibold)).foregroundStyle(Theme.ink)
            }
        }
    }

    @ViewBuilder
    private func struggles(_ items: [[String: Any]], slowButRight: [[String: Any]]) -> some View {
        if !items.isEmpty {
            section("Questions that tripped them up", intro: "Missed on the first try, most-missed first. The app brings these back automatically; talking one through out loud helps too.") {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(Array(items.enumerated()), id: \.offset) { _, s in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(s["prompt"] as? String ?? "").font(theme.bodyFont(size: 15, weight: .bold)).foregroundStyle(Theme.ink)
                            Text("Answer \(s["answer"] as? String ?? ""), they said \(s["given"] as? String ?? "") · \(s["modeLabel"] as? String ?? "") · missed \(int(s["misses"]))×\((s["masteredLater"] as? Bool) == true ? " · got it later" : "")")
                                .font(theme.bodyFont(size: 12, weight: .semibold)).foregroundStyle(theme.textMuted)
                        }
                    }
                    if !slowButRight.isEmpty {
                        Text("Right, but slowly").font(theme.bodyFont(size: 12, weight: .heavy)).foregroundStyle(Theme.teal).padding(.top, 6)
                        ForEach(Array(slowButRight.enumerated()), id: \.offset) { _, s in
                            Text("\(s["prompt"] as? String ?? "") · \(Double(int(s["ms"])) / 1000, specifier: "%.0f")s")
                                .font(theme.bodyFont(size: 14, weight: .semibold)).foregroundStyle(Theme.ink)
                        }
                    }
                }
            }
        }
    }

    private func whenTheyPractice(_ when: [String: Any]) -> some View {
        section("When they practice", intro: nil) {
            VStack(alignment: .leading, spacing: 12) {
                barChart(when["byWeekday"] as? [[String: Any]] ?? [], subKey: nil, compact: true)
                barChart(when["byTimeOfDay"] as? [[String: Any]] ?? [], subKey: nil, compact: true)
                if let day = when["busiestDay"] as? String, let slot = when["busiestSlot"] as? String {
                    Text("Most practice happens on \(day), in the \(slot).")
                        .font(theme.bodyFont(size: 14, weight: .semibold)).foregroundStyle(Theme.ink.opacity(0.8))
                }
            }
        }
    }

    private func section<Content: View>(_ title: String, intro: String?, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(theme.displayFont(size: 20)).foregroundStyle(Theme.ink)
            if let intro {
                Text(intro).font(theme.bodyFont(size: 13, weight: .semibold)).foregroundStyle(theme.textMuted)
            }
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 18).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.ink.opacity(0.08), lineWidth: 1.5))
    }

    private func int(_ v: Any?) -> Int { (v as? NSNumber)?.intValue ?? 0 }
}
