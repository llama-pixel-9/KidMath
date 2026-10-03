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

    /// Handoff 2a · 07 (revised): the hint is a sheet; the work space is a
    /// right-hand drawer on iPad (a full-height sheet on iPhone) — closed by
    /// default in every mode, and it closes and clears on the next problem.
    enum Pane: String { case hint, work }
    @State private var pane: Pane?
    /// The typed answer for number-pad questions — owned here so the answer
    /// box lives in the problem card while the keys sit beside it.
    @State private var entry = ""

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
            GraphPaperBackground()
            switch viewModel.phase {
            case .loading:
                // Nesting (§16): a skeleton in the question card's shape —
                // no spinner, no layout jump when the question lands.
                skeletonCard
            case .question, .feedback:
                GeometryReader { proxy in
                    let compact = proxy.size.width < 500
                    let landscape = proxy.size.width > proxy.size.height
                    playArea(size: proxy.size, landscape: landscape, compact: compact)
                        .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: pane)
                        .sheet(isPresented: Binding(get: { pane == .hint }, set: { if !$0 { closePane() } })) {
                            hintSheet
                                .presentationDetents([.medium, .large])
                                .presentationDragIndicator(.visible)
                        }
                        // iPhone: the work space is a full-height sheet with the
                        // problem pinned in short form and a way back.
                        .sheet(isPresented: Binding(get: { compact && pane == .work }, set: { if !$0 { closePane() } })) {
                            VStack(spacing: 0) {
                                Text(promptText ?? "")
                                    .font(theme.displayFont(size: 22))
                                    .foregroundStyle(Theme.ink)
                                    .lineLimit(2)
                                    .minimumScaleFactor(0.6)
                                    .padding(.horizontal, 20)
                                    .padding(.top, 18)
                                WorkspaceView()
                                    .id(viewModel.questionKey)
                                Button { closePane() } label: {
                                    Text("Back to the problem")
                                        .font(theme.displayFont(size: 18))
                                        .foregroundStyle(Theme.cream)
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 56)
                                        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.teal).shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 4))
                                }
                                .buttonStyle(SpringButtonStyle())
                                .padding(16)
                            }
                            .background(GraphPaperBackground())
                            .presentationDetents([.large])
                            .presentationCornerRadius(28)
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
            // A new problem: the hint and the work space close, the answer clears.
            pane = nil
            entry = ""
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
        pane = nil
    }

    private func toggleWorkPane() {
        pane = pane == .work ? nil : .work
    }

    private func openHint() {
        viewModel.markHintUsed()
        pane = pane == .hint ? nil : .hint
    }

    private var hintSheet: some View {
        VStack(spacing: 0) {
            HStack {
                Label("Hint", systemImage: "lightbulb")
                    .font(theme.bodyFont(size: 15, weight: .heavy)).foregroundStyle(Theme.ink)
                Spacer()
                Button { closePane() } label: {
                    Image(systemName: "xmark").font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.ink)
                        .frame(width: 32, height: 32).background(Circle().fill(Theme.ink.opacity(0.06)))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close the hint")
            }
            .padding(.horizontal, 16).padding(.top, 14).padding(.bottom, 6)
            if let hint = viewModel.hint {
                HintPaneView(hint: hint)
            } else {
                Text("No hint for this one — give it a go.")
                    .font(theme.bodyFont(size: 15, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)
                    .padding()
            }
            Spacer(minLength: 0)
        }
        .background(theme.cardBackground)
    }

    // MARK: - Play area (handoff 2a · 07, revised)

    /// One centred column (560pt landscape, 620pt portrait, full width on
    /// iPhone): problem card → figure → keypad, vertically centred. The work
    /// space is a right-hand drawer (480 / 400pt) that the column shifts left
    /// for, so the keypad and Go are never covered.
    private func playArea(size: CGSize, landscape: Bool, compact: Bool) -> some View {
        let drawerWidth: CGFloat = landscape ? 480 : 400
        let drawerOpen = pane == .work && !compact
        return HStack(spacing: 0) {
            VStack(spacing: 0) {
                hud(compact: compact, tight: drawerOpen)
                    .padding(.horizontal, compact ? 16 : 40)
                    .padding(.top, 8)
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
                        VStack(spacing: compact ? 20 : 24) {
                            questionCard
                            answerWidget
                                .id(viewModel.questionKey)
                        }
                        .frame(maxWidth: compact ? .infinity : (landscape ? 560 : 620))
                        .padding(.horizontal, compact ? 16 : 40)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity, minHeight: proxy.size.height)
                    }
                }
            }
            .frame(maxWidth: .infinity)

            if drawerOpen {
                WorkspaceView(onClose: { closePane() })
                    .id(viewModel.questionKey)
                    .frame(width: drawerWidth)
                    .background(Color.white)
                    .overlay(alignment: .leading) { Rectangle().fill(Theme.ink.opacity(0.08)).frame(width: 1) }
                    .transition(reduceMotion ? .opacity : .move(edge: .trailing))
            }
        }
    }

    private var usesNumberPad: Bool {
        ["numberPad", "fillBlank", "decimal"].contains(viewModel.answerType)
    }

    /// The typed answer (140×84, 2.5pt teal border) — in the card, not the pad.
    private var answerBox: some View {
        Text(entry.isEmpty ? " " : entry)
            .font(theme.displayFont(size: 34))
            .foregroundStyle(Theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .frame(width: 140, height: 84)
            .background(RoundedRectangle(cornerRadius: 16).fill(Theme.cream))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.teal, lineWidth: 2.5))
            .accessibilityLabel(entry.isEmpty ? "Your answer, empty" : "Your answer: \(entry)")
    }

    /// The HUD: close · lark progress bar · stars this flight · Hint · Work space.
    private func hud(compact: Bool, tight: Bool = false) -> some View {
        let iconOnly = compact || tight
        return HStack(spacing: compact ? 10 : 14) {
            Button { finish() } label: {
                FeatherIcon(glyph: .close, size: 18, color: Theme.ink)
                    .frame(width: 52, height: 52)
                    .background(Circle().fill(theme.cardBackground))
                    .accessibilityLabel("close")
            }
            .buttonStyle(.plain)

            LarkProgressBar(progress: viewModel.progressFraction, showsNest: !compact)
                .frame(height: 34)

            HStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 2).fill(Theme.sun).frame(width: 12, height: 12).rotationEffect(.degrees(45))
                Text("\(viewModel.starsThisFlight)")
                    .font(theme.displayFont(size: 18))
                    .foregroundStyle(Theme.ink)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(viewModel.starsThisFlight) stars this flight")

            hudPill(label: "Hint", icon: "lightbulb", active: pane == .hint, compact: iconOnly, accessibility: pane == .hint ? "Close the hint" : "Show a hint") { openHint() }
            hudPill(label: "Work space", icon: "pencil", active: pane == .work, compact: iconOnly, accessibility: pane == .work ? "Close the work space" : "Open the work space") { toggleWorkPane() }
        }
    }

    private func hudPill(label: String, icon: String, active: Bool, compact: Bool, accessibility: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 15, weight: .semibold))
                if !compact { Text(label).font(theme.bodyFont(size: 15, weight: .bold)) }
            }
            .foregroundStyle(active ? Theme.cream : Theme.ink)
            .padding(.horizontal, compact ? 0 : 18)
            .frame(width: compact ? 52 : nil, height: 52)
            .background(Capsule().fill(active ? Theme.ink : theme.cardBackground))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibility)
    }

    private var questionCard: some View {
        VStack(spacing: 12) {
            Text(mode.label.uppercased())
                .font(theme.bodyFont(size: 13, weight: .heavy))
                .tracking(1)
                .foregroundStyle(Theme.ink.opacity(0.6))
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
            // The answer box (number-pad questions) and read-aloud share a row.
            // Read-aloud (GamFlags.readAloud): the speaker reads the prompt
            // through the shared speakableText; K–1 kids hear it automatically.
            HStack(spacing: 20) {
                if usesNumberPad { answerBox }
                if GamFlags.readAloud, let prompt = promptText {
                    Button {
                        SpeechService.shared.speak(app.engine?.speakableText(prompt) ?? prompt)
                    } label: {
                        Label("Read it to me", systemImage: "speaker.wave.2")
                            .font(theme.bodyFont(size: 15, weight: .bold))
                            .foregroundStyle(Theme.teal)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Read the question aloud")
                }
            }
            .padding(.top, 6)
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
        .padding(28)
        .frame(maxWidth: .infinity, minHeight: 150)
        .background(
            RoundedRectangle(cornerRadius: 28)
                .fill(theme.cardBackground)
                .overlay(RoundedRectangle(cornerRadius: 28).stroke(borderColor, lineWidth: 3))
                .shadow(color: Theme.ink.opacity(0.08), radius: 0, y: 5)
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
            return "\(AnswerFormatting.text(a)) \(AnswerFormatting.opGlyph(op)) \(AnswerFormatting.text(b)) = ?"
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
            NumberPadWidget(disabled: locked, entry: $entry, showsBox: false) { viewModel.submit($0) }
        case "decimal":
            NumberPadWidget(allowDecimal: true, disabled: locked, entry: $entry, showsBox: false) { viewModel.submit($0) }
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
            // display.mode "build" is the tappable mat; it reads the feedback
            // for its "The mat shows 921." line.
            PlaceValueDiscsWidget(
                display: display, disabled: locked,
                feedback: feedbackState, calmMode: app.calmMode
            ) { viewModel.submit($0) }
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

    /// The sign a child sees: the bank and generators write "-", "x" and "/"
    /// in `op`, which stays as is for logic (mirror of src/opSigns.js opGlyph).
    static func opGlyph(_ op: String) -> String {
        switch op {
        case "-", "–": return "−"
        case "x", "*": return "×"
        case "/": return "÷"
        default: return op
        }
    }
}


/// The lark progress bar (2a · 07): a 3pt dotted Ink line at 20%, a solid
/// teal line up to progress, the lark riding the leading edge, "NEST" at the
/// end (dropped on iPhone).
struct LarkProgressBar: View {
    @Environment(\.theme) private var theme
    let progress: Double
    var showsNest = true

    var body: some View {
        HStack(spacing: 10) {
            GeometryReader { proxy in
                let width = proxy.size.width
                let mid = proxy.size.height / 2
                let x = width * min(max(progress, 0), 1)
                ZStack(alignment: .leading) {
                    Path { p in p.move(to: CGPoint(x: 0, y: mid)); p.addLine(to: CGPoint(x: width, y: mid)) }
                        .stroke(Theme.ink.opacity(0.2), style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [1, 6]))
                    Path { p in p.move(to: CGPoint(x: 0, y: mid)); p.addLine(to: CGPoint(x: x, y: mid)) }
                        .stroke(Theme.teal, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .animation(.spring(duration: 0.4), value: progress)
                    LarkMarkView()
                        .frame(width: 40, height: 34)
                        .position(x: max(20, min(width - 20, x)), y: mid - 4)
                        .animation(.spring(duration: 0.4), value: progress)
                }
            }
            if showsNest {
                Text("NEST")
                    .font(theme.bodyFont(size: 12, weight: .heavy))
                    .tracking(1.2)
                    .foregroundStyle(Theme.ink.opacity(0.6))
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Progress \(Int(progress * 100)) percent")
    }
}
