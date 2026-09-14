import SwiftUI

/// Port of HintPane.jsx over the shared hintFor: the idea in kid language,
/// "Try this" steps built from the live item's numbers (never the answer),
/// "Picture it" (the scaffold), and a worked example.
struct HintPaneView: View {
    @Environment(\.theme) private var theme
    let hint: [String: Any]

    private var steps: [String] { (hint["steps"] as? [String]) ?? [] }
    private var example: [String: Any]? { hint["example"] as? [String: Any] }
    private var visual: [String: Any]? { hint["visual"] as? [String: Any] }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(hint["modeTitle"] as? String ?? "Math")
                    .font(theme.bodyFont(size: 11, weight: .bold)).textCase(.uppercase).tracking(0.6)
                    .foregroundStyle(Theme.teal)
                Text(hint["title"] as? String ?? "Hint")
                    .font(theme.displayFont(size: 24)).foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)

                if let idea = hint["idea"] as? String, !idea.isEmpty {
                    section("The idea") {
                        Text(idea).font(theme.bodyFont(size: 16, weight: .semibold)).foregroundStyle(Theme.ink.opacity(0.85))
                    }
                }
                if !steps.isEmpty {
                    section("Try this") {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(Array(steps.enumerated()), id: \.offset) { i, step in
                                HStack(alignment: .top, spacing: 10) {
                                    Text("\(i + 1)")
                                        .font(theme.bodyFont(size: 12, weight: .heavy)).foregroundStyle(Theme.cream)
                                        .frame(width: 22, height: 22).background(Circle().fill(Theme.teal))
                                    Text(step).font(theme.bodyFont(size: 15, weight: .semibold)).foregroundStyle(Theme.ink)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                    }
                }
                if let visual, (visual["kind"] as? String) != "look" {
                    section("Picture it") {
                        ScaffoldView(scaffold: visual, hint: "")
                    }
                }
                if let example {
                    section("Worked example") {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(example["problem"] as? String ?? "").font(theme.displayFont(size: 18)).foregroundStyle(Theme.ink)
                            ForEach(Array(((example["steps"] as? [String]) ?? []).enumerated()), id: \.offset) { _, s in
                                Text("• \(s)").font(theme.bodyFont(size: 14, weight: .semibold)).foregroundStyle(Theme.ink.opacity(0.85))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Text("Answer: \(example["answer"].map { AnswerFormatting.text($0) } ?? "")")
                                .font(theme.bodyFont(size: 14, weight: .heavy)).foregroundStyle(Theme.teal)
                        }
                    }
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func section<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(theme.bodyFont(size: 11, weight: .bold)).textCase(.uppercase).tracking(0.6).foregroundStyle(Theme.teal)
            content()
        }
    }
}
