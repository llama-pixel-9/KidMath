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

    init(mode: ModeInfo) {
        self.mode = mode
        let app = AppEnvironment.current
        _viewModel = StateObject(wrappedValue: SessionViewModel(
            modeId: mode.id,
            engine: app.engine ?? (try! EngineBridge()),
            progressStore: app.progressStore,
            bankService: app.bankService
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
                playArea
            case .complete(let stars, let lifetime):
                SessionCompleteView(
                    mode: mode,
                    starsEarned: stars,
                    totalQuestions: viewModel.sessionSize,
                    lifetimeStars: lifetime,
                    playAgain: { Task { await viewModel.start() } },
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

            if viewModel.showLevelUp {
                levelUpBanner
            }
        }
        .task { await viewModel.start() }
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

    // MARK: - Play area (centered column, like the web's max-w-sm)

    private var playArea: some View {
        VStack(spacing: 0) {
            header
                .frame(maxWidth: 520)
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
                Image(systemName: "xmark")
                    .font(.headline)
                    .foregroundStyle(theme.textSecondary)
                    .padding(10)
                    .background(Circle().fill(theme.cardBackground))
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
                Label("\(viewModel.streak)", systemImage: "bolt.fill")
                    .font(.subheadline.weight(.heavy))
                    .foregroundStyle(Theme.sun)
            }

            Text("Lv \(viewModel.level)")
                .font(.subheadline.weight(.heavy))
                .fontDesign(.rounded)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Capsule().fill(theme.modeColor(mode.id)))
                .foregroundStyle(Theme.ink)
        }
        .padding(.top, 8)
    }

    private var questionCard: some View {
        VStack(spacing: 10) {
            if viewModel.isRetry {
                Text("Let's try this one again!")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(theme.textMuted)
                    .textCase(.uppercase)
            }
            QuestionDisplayView(question: viewModel.question, modeColor: theme.modeColor(mode.id))
            feedbackLine
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
            Label("Great job!", systemImage: "star.fill")
                .font(.headline.weight(.heavy))
                .foregroundStyle(theme.correct)
        case .some(false):
            VStack(spacing: 2) {
                Text("Not quite!")
                    .font(.headline.weight(.heavy))
                    .foregroundStyle(theme.wrong)
                if let answer = viewModel.revealAnswer {
                    Text("The answer is \(AnswerFormatting.text(answer))")
                        .font(.subheadline.weight(.semibold))
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
        default:
            ChoiceWidget(choices: viewModel.choices, disabled: locked) {
                viewModel.submit($0)
            }
        }
    }

    private var levelUpBanner: some View {
        Text("You've fledged — level up!")
            .font(theme.displayFont(size: 24))
            .padding(.horizontal, 28)
            .padding(.vertical, 16)
            .background(Capsule().fill(Theme.apricot))
            .foregroundStyle(Theme.ink)
            .transition(.scale.combined(with: .opacity))
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
