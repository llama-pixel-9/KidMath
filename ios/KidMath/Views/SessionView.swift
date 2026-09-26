import SwiftUI

/// One adaptive session: question card → answer widget → feedback → next,
/// ending in the completion screen. Mirrors the play loop AND layout of
/// MathExplorer.jsx: content lives in a centered narrow column (the web's
/// `max-w-sm`), question card and widget grouped in the vertical center —
/// never stretched edge to edge.
struct SessionView: View {
    let mode: ModeInfo

    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @StateObject private var viewModel: SessionViewModel

    /// Side pane (web SidePane.jsx): the hint or the work space. A right
    /// column when the play area is 800pt or wider (iPad landscape), a bottom
    /// sheet below that. The work pane's open state persists on the web's
    /// key; the hint pane closes with each new question.
    enum Pane: String { case hint, work }
    @State private var pane: Pane? = UserDefaults.standard.string(forKey: "kidmath-workpane-open") == "1" ? .work : nil
    private static let sidePaneBreakpoint: CGFloat = 800

    /// `skillRequest` (play by skill) is what the topic sheet started: one
    /// skill, "Larkit picks", or the Fledging Flight. Nil is a plain session (tests).
    init(mode: ModeInfo, skillRequest: SessionViewModel.SkillRequest? = nil) {
        self.mode = mode
        let app = AppEnvironment.current
        _viewModel = StateObject(wrappedValue: SessionViewModel(
            modeId: mode.id,
            engine: app.engine ?? (try! EngineBridge()),
            progressStore: app.progressStore,
            bankService: app.bankService,
            skillRequest: skillRequest,
            practiceLog: app.practiceLog
        ))
    }

    var body: some View {
        ZStack {
            theme.background.ignoresSafeArea()
            switch viewModel.phase {
            case .loading:
                // Nesting (§16): a skeleton in the question card's shape —
                // no spinner, no layout jump when the question lands.
                skeletonCard
            case .question, .feedback:
                GeometryReader { proxy in
                    let wide = proxy.size.width >= Self.sidePaneBreakpoint
                    HStack(spacing: 0) {
                        playArea
                        if wide, let pane {
                            sidePaneContent(pane)
                                .frame(width: 340)
                                .background(theme.cardBackground)
                                .overlay(alignment: .leading) { Rectangle().fill(Theme.ink.opacity(0.08)).frame(width: 1) }
                                .transition(.move(edge: .trailing))
                        }
                    }
                    .animation(.easeOut(duration: 0.2), value: pane)
                    .sheet(isPresented: Binding(get: { !wide && pane != nil }, set: { if !$0 { closePane() } })) {
                        if let pane {
                            sidePaneContent(pane)
                                .presentationDetents([.medium, .large])
                                .presentationDragIndicator(.visible)
                        }
                    }
                }
            case .complete(let stars, let lifetime):
                SessionCompleteView(
                    mode: mode,
                    starsEarned: stars,
                    totalQuestions: viewModel.sessionSize,
                    lifetimeStars: lifetime,
                    level: viewModel.level,
                    payout: viewModel.flightPayout,
                    summary: viewModel.flightSummary,
                    skillStanding: viewModel.skillStanding,
                    firstTryCount: viewModel.firstTryCount,
                    // A Fledging Flight is taken once: back to the topic sheet.
                    playAgain: { if viewModel.skillRequest == .flight { finish() } else { Task { await viewModel.start() } } },
                    goHome: { finish() }
                )
            case .failed(let message):
                // §16 error layout: mark, one Fredoka line, one plain line,
                // one obvious teal button. No codes, no apology paragraph.
                VStack(spacing: 14) {
                    LarkMarkView().frame(width: 64)
                    Text("That one flew off.")
                        .font(theme.displayFont(size: 24))
                        .foregroundStyle(Theme.ink)
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(theme.textMuted)
                        .multilineTextAlignment(.center)
                    Button {
                        Task { await viewModel.start() }
                    } label: {
                        Text("Try again")
                            .font(theme.displayFont(size: 18))
                            .padding(.horizontal, 36)
                            .frame(minHeight: 52)
                            .background(RoundedRectangle(cornerRadius: 16).fill(Theme.deepTeal).offset(y: 4))
                            .background(RoundedRectangle(cornerRadius: 16).fill(Theme.teal))
                            .foregroundStyle(Theme.cream)
                    }
                    .buttonStyle(SpringButtonStyle())
                }
                .padding()
            }

        }
        .task { await viewModel.start() }
        .onDisappear { leaveSession() }
        .onChange(of: viewModel.questionKey) { _, _ in
            if pane == .hint { pane = nil }
        }
    }

    private var skeletonCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            RoundedRectangle(cornerRadius: 8).fill(Theme.ink.opacity(0.06))
                .frame(height: 22)
                .frame(maxWidth: 200)
            RoundedRectangle(cornerRadius: 10).fill(Theme.ink.opacity(0.08))
                .frame(height: 38)
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 10).fill(Theme.ink.opacity(0.06)).frame(height: 34)
                RoundedRectangle(cornerRadius: 10).fill(Theme.ink.opacity(0.06)).frame(height: 34)
            }
        }
        .padding(28)
        .frame(maxWidth: 400)
        .background(
            RoundedRectangle(cornerRadius: 28)
                .fill(theme.cardBackground)
                .shadow(color: Theme.ink.opacity(0.06), radius: 0, y: 6)
        )
        .padding(.horizontal)
    }

    private func finish() {
        Task { await app.refreshModeLevels() }
        dismiss()
    }

    /// Any way out of the session (X, swipe, app killed later) — a flight left
    /// early still reaches the parent report as a partial record.
    private func leaveSession() {
        viewModel.savePartialIfAbandoned()
    }

    private func closePane() {
        if pane == .work { UserDefaults.standard.set("0", forKey: "kidmath-workpane-open") }
        pane = nil
    }

    private func toggleWorkPane() {
        let next: Pane? = pane == .work ? nil : .work
        UserDefaults.standard.set(next == .work ? "1" : "0", forKey: "kidmath-workpane-open")
        pane = next
    }

    private func openHint() {
        viewModel.markHintUsed()
        pane = pane == .hint ? nil : .hint
    }

    @ViewBuilder
    private func sidePaneContent(_ pane: Pane) -> some View {
        VStack(spacing: 0) {
            HStack {
                Label(pane == .hint ? "Hint" : "Work space", systemImage: pane == .hint ? "lightbulb.fill" : "pencil.tip")
                    .font(theme.bodyFont(size: 15, weight: .heavy)).foregroundStyle(Theme.ink)
                Spacer()
                Button { closePane() } label: {
                    Image(systemName: "xmark").font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.ink)
                        .frame(width: 32, height: 32).background(Circle().fill(Theme.ink.opacity(0.06)))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(pane == .hint ? "Close the hint" : "Close the work space")
            }
            .padding(.horizontal, 16).padding(.top, 14).padding(.bottom, 6)
            switch pane {
            case .hint:
                if let hint = viewModel.hint {
                    HintPaneView(hint: hint)
                } else {
                    Text("No hint for this one — give it a go.").padding()
                }
            case .work:
                WorkspaceView().id(viewModel.questionKey)
            }
        }
        .background(theme.cardBackground)
    }

    // MARK: - Play area (centered column, like the web's max-w-sm)

    private var playArea: some View {
        VStack(spacing: 0) {
            header
                .frame(maxWidth: 520)
            // Play by skill: topic and skill read as one title, the skill
            // under its topic (the web's session header).
            if let label = viewModel.sessionLabel {
                VStack(spacing: 1) {
                    Text(mode.label)
                        .font(theme.displayFont(size: 17))
                        .foregroundStyle(theme.textPrimary)
                    Text(label)
                        .font(theme.bodyFont(size: 13, weight: .bold))
                        .foregroundStyle(theme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 6)
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("session-skill")
            }
            if viewModel.isFledgingRun {
                Text("\(viewModel.flightPass) of \(viewModel.sessionSize) to pass")
                    .font(theme.bodyFont(size: 13, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 5)
                    .background(Capsule().fill(Theme.seafoam))
                    .padding(.top, 6)
            }
            GeometryReader { proxy in
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 22) {
                        questionCard
                        answerWidget
                            .id(viewModel.questionKey)
                    }
                    .frame(maxWidth: 400)
                    .padding(.horizontal)
                    .padding(.vertical, 12)
                    .frame(maxWidth: .infinity, minHeight: proxy.size.height)
                }
            }
        }
        .padding(.horizontal)
    }

    private var header: some View {
        HStack(spacing: 12) {
            Button {
                finish()
            } label: {
                FeatherIcon(glyph: .close, size: 18, color: Theme.ink)
                    .padding(12)
                    .background(Circle().fill(theme.cardBackground))
                    .accessibilityLabel("close")
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(theme.progressTrack)
                    Capsule()
                        .fill(LinearGradient(colors: theme.progressFill, startPoint: .leading, endPoint: .trailing))
                        .frame(width: max(12, proxy.size.width * viewModel.progressFraction))
                        .animation(.spring(duration: 0.4), value: viewModel.progressFraction)
                }
            }
            .frame(height: 14)

            if viewModel.streak >= 3 {
                HStack(spacing: 4) {
                    FeatherIcon(glyph: .streak, size: 16, color: Theme.sun)
                    Text("\(viewModel.streak)")
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(Theme.ember)
                }
            }

            Button { openHint() } label: {
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(pane == .hint ? Theme.cream : Theme.ink)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(pane == .hint ? Theme.ink : theme.cardBackground))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(pane == .hint ? "Close the hint" : "Show a hint")

            Button { toggleWorkPane() } label: {
                Image(systemName: "pencil.tip")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(pane == .work ? Theme.cream : Theme.ink)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(pane == .work ? Theme.ink : theme.cardBackground))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(pane == .work ? "Close the work space" : "Open the work space")

        }
        .padding(.top, 8)
    }

    private var questionCard: some View {
        VStack(spacing: 10) {
            if viewModel.isRetry {
                Text("Let's try this one again!")
                    .font(theme.bodyFont(size: 12, weight: .bold))
                    .foregroundStyle(theme.textMuted)
                    .textCase(.uppercase)
            }
            QuestionDisplayView(
                question: viewModel.question,
                modeColor: theme.modeColor(mode.id),
                revealed: feedbackState != nil,
                areaFigure: mode.id == "areaPerimeter" ? viewModel.areaFigureSpec : nil
            )
            // Read-aloud (GamFlags.readAloud): the speaker reads the prompt
            // through the shared speakableText; K–1 kids hear it automatically.
            if GamFlags.readAloud, let prompt = promptText {
                Button {
                    SpeechService.shared.speak(app.engine?.speakableText(prompt) ?? prompt)
                } label: {
                    Label("Read it to me", systemImage: "speaker.wave.2.fill")
                        .font(theme.bodyFont(size: 13, weight: .bold))
                        .foregroundStyle(Theme.teal)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Read the question aloud")
            }
            // Teach-don't-grade: the model shown after a first miss.
            if let scaffold = viewModel.scaffold {
                ScaffoldView(scaffold: scaffold, hint: viewModel.scaffoldHint)
                    .transition(.opacity)
            }
            feedbackLine
        }
        .onChange(of: viewModel.questionKey) { _, _ in
            guard viewModel.scaffold == nil, SpeechService.autoReadEnabled(grade: app.kidProfiles.activeKidGrade),
                  let prompt = promptText else { return }
            SpeechService.shared.speak(app.engine?.speakableText(prompt) ?? prompt)
        }
        .padding(24)
        .frame(maxWidth: .infinity, minHeight: 150)
        .background(
            RoundedRectangle(cornerRadius: 28)
                .fill(theme.cardBackground)
                .overlay(RoundedRectangle(cornerRadius: 28).stroke(borderColor, lineWidth: 3))
                .shadow(color: Theme.ink.opacity(0.06), radius: 0, y: 6)
        )
        .overlay {
            if feedbackState == true, !reduceMotion, !app.calmMode {
                ConfettiView()
            }
        }
        .animation(.easeOut(duration: 0.2), value: feedbackState ?? true)
    }

    private var feedbackState: Bool? {
        if case .feedback(let correct) = viewModel.phase { return correct }
        return nil
    }

    /// The prompt to read aloud — the same text the practice log stores.
    private var promptText: String? {
        let display = viewModel.question["display"] as? [String: Any] ?? [:]
        if let p = display["promptText"] as? String, !p.isEmpty { return p }
        if let a = viewModel.question["a"], let op = viewModel.question["op"] as? String, let b = viewModel.question["b"] {
            return "\(AnswerFormatting.text(a)) \(op) \(AnswerFormatting.text(b)) = ?"
        }
        return nil
    }

    private var borderColor: Color {
        switch feedbackState {
        case .some(true): theme.correct
        case .some(false): theme.wrong
        case nil: .clear
        }
    }

    @ViewBuilder
    private var feedbackLine: some View {
        switch feedbackState {
        case .some(true):
            HStack(spacing: 8) {
                Rectangle()
                    .fill(Theme.sun)
                    .frame(width: 12, height: 12)
                    .rotationEffect(.degrees(45))
                    .cornerRadius(2.5)
                Text("Great job!")
                    .font(.headline.weight(.heavy))
                    .foregroundStyle(theme.correct)
            }
        case .some(false):
            VStack(spacing: 2) {
                Text(viewModel.secondChancePending ? "Not quite — look at this, then try once more." : "Not quite!")
                    .font(.headline.weight(.heavy))
                    .foregroundStyle(theme.wrong)
                    .multilineTextAlignment(.center)
                if let answer = viewModel.revealAnswer {
                    Text("The answer is \(AnswerFormatting.text(answer))")
                        .font(theme.bodyFont(size: 15, weight: .semibold))
                        .foregroundStyle(theme.textSecondary)
                }
            }
        case nil:
            EmptyView()
        }
    }

    /// answerType -> widget, the Swift widgetRegistry.js. Anything
    /// unregistered falls back to the multiple-choice grid, like the web.
    @ViewBuilder
    private var answerWidget: some View {
        let locked = feedbackState != nil
        let display = viewModel.display
        switch viewModel.answerType {
        case "numberPad", "fillBlank":
            NumberPadWidget(disabled: locked) { viewModel.submit($0) }
        case "decimal":
            NumberPadWidget(allowDecimal: true, disabled: locked) { viewModel.submit($0) }
        case "fraction":
            FractionInputWidget(disabled: locked) { viewModel.submit($0) }
        case "symbolSelect":
            SymbolSelectWidget(disabled: locked) { viewModel.submit($0) }
        case "multiSelect":
            MultiSelectWidget(
                options: viewModel.multiSelectOptions,
                requiredCount: viewModel.multiSelectRequiredCount,
                disabled: locked
            ) { viewModel.submit($0) }
        case "numberLine":
            NumberLineWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "numberBond":
            NumberBondWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "clock":
            AnalogClockWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "angle":
            AngleFigureWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "barGraph":
            DataGraphWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "coinTray":
            CoinTrayWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "fractionSet":
            FractionSetWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "placeValueDiscs":
            PlaceValueDiscsWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "barModel":
            BarModelWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "shapeFigure":
            ShapeFigureWidget(display: display, disabled: locked) { viewModel.submit($0) }
        case "tenFrame":
            TenFrameWidget(display: display, disabled: locked) { viewModel.submit($0) }
        default:
            ChoiceWidget(choices: viewModel.choices, disabled: locked) {
                viewModel.submit($0)
            }
        }
    }

}

/// Formats an engine answer value for the "The answer is …" reveal.
enum AnswerFormatting {
    static func text(_ value: Any) -> String {
        switch value {
        case let number as NSNumber:
            return number.doubleValue == number.doubleValue.rounded()
                ? "\(number.intValue)"
                : "\(number.doubleValue)"
        case let string as String:
            return string
        case let dictionary as [String: Any]:
            // Fraction answers cross as {num, den}.
            if let num = dictionary["num"], let den = dictionary["den"] {
                return "\(text(num))/\(text(den))"
            }
            return "\(dictionary)"
        case let array as [Any]:
            // multiSelect: a list of acceptable selections shows the first.
            if let first = array.first as? [Any] {
                return first.map { text($0) }.joined(separator: " and ")
            }
            return array.map { text($0) }.joined(separator: ", ")
        default:
            return "\(value)"
        }
    }
}
