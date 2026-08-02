import SwiftUI

/// About / learning principles — port of AboutPage.jsx's copy.
struct AboutView: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var showGate = false

    private static let principles: [(emoji: String, title: String, description: String)] = [
        ("🎯", "Standards-Aligned Skills",
         "Questions are mapped to K-5 learning progressions so practice matches what kids should learn next."),
        ("🧠", "Concept + Fluency + Application",
         "We balance understanding, speed, and real use. Kids see number patterns, practice facts, and solve story contexts."),
        ("🔀", "Smarter Mixed Practice",
         "Question families rotate so students do not only drill one type. This builds flexible thinking, not memorization only."),
        ("⏰", "Spaced Review",
         "Tricky questions come back later at spaced intervals to strengthen memory over time."),
        ("📈", "Diagnostic Adaptivity",
         "larkit tracks subskills and targets weaker areas so each child gets practice that fits their needs."),
        ("♿️", "Accessible by Design",
         "Word problems can be limited for early readers, and visual/symbolic questions stay central for foundational levels."),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Our Learning Principles")
                        .font(theme.displayFont(size: 28))
                        .minimumScaleFactor(0.6)
                        .foregroundStyle(theme.textPrimary)
                    Text("larkit is built with research-backed teaching and assessment practices so kids get practice that is joyful, targeted, and effective.")
                        .font(.body)
                        .foregroundStyle(theme.textSecondary)

                    ForEach(Self.principles, id: \.title) { principle in
                        HStack(alignment: .top, spacing: 12) {
                            Text(principle.emoji).font(.title2)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(principle.title)
                                    .font(.headline)
                                    .fontDesign(.rounded)
                                    .foregroundStyle(theme.textPrimary)
                                Text(principle.description)
                                    .font(.subheadline)
                                    .foregroundStyle(theme.textSecondary)
                            }
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 18).fill(theme.cardBackground))
                    }

                    // Kids category: leaving the app goes through the gate.
                    Button {
                        showGate = true
                    } label: {
                        Label("Privacy Policy (opens in browser)", systemImage: "hand.raised.fill")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(theme.textSecondary)
                            .frame(maxWidth: .infinity)
                    }
                    .padding(.top, 4)

                    Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0") · engine shared with larkit web")
                        .font(.footnote)
                        .foregroundStyle(theme.textMuted)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 8)
                }
                .frame(maxWidth: 700)
                .padding()
                .frame(maxWidth: .infinity)
            }
            .background(theme.background)
            .navigationTitle("About")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showGate) {
                ParentalGateView {
                    openURL(AppLinks.privacyPolicy)
                }
            }
        }
    }
}
