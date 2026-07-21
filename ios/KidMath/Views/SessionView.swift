import SwiftUI

/// One adaptive session: question card → answer widget → feedback → next,
/// ending in the completion screen. Mirrors the play loop of MathExplorer.jsx.
struct SessionView: View {
    let mode: ModeInfo

    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: SessionViewModel

    init(mode: ModeInfo) {
        self.mode = mode
        // AppModel is guaranteed to exist by the time a session opens; fall
        // back to a fresh bridge only in previews.
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
                ProgressView().controlSize(.large)
            case .question, .feedback:
                playArea
            case .complete(let stars, let lifetime):
                SessionCompleteView(
                    mode: mode,
                    starsEarned: stars,
                    lifetimeStars: lifetime,
                    playAgain: { Task { await viewModel.start() } },
                    goHome: { finish() }
                )
            case .failed(let message):
                VStack(spacing: 12) {
                    Text("Something went wrong").font(.headline)
                    Text(message).font(.footnote).foregroundStyle(theme.textMuted)
                    Button("Back") { finish() }.buttonStyle(.borderedProminent)
                }
                .padding()
            }

            if viewModel.showLevelUp {
                levelUpBanner
            }
        }
        .task { await viewModel.start() }
    }

    private func finish() {
        Task { await app.refreshModeLevels() }
        dismiss()
    }

    // MARK: - Play area

    private var playArea: some View {
        VStack(spacing: 16) {
            header
            questionCard
            Spacer(minLength: 0)
            answerWidget
                .padding(.bottom, 12)
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
                    Capsule().fill(.white)
                    Capsule()
                        .fill(LinearGradient(colors: theme.progressFill, startPoint: .leading, endPoint: .trailing))
                        .frame(width: max(12, proxy.size.width * viewModel.progressFraction))
                        .animation(.spring(duration: 0.4), value: viewModel.progressFraction)
                }
            }
            .frame(height: 14)

            Text("Lv \(viewModel.level)")
                .font(.subheadline.weight(.heavy))
                .fontDesign(.rounded)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Capsule().fill(theme.modeColor(mode.id)))
                .foregroundStyle(.white)
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
            ForEach(Array(viewModel.promptLines.enumerated()), id: \.offset) { _, line in
                Text(line)
                    .font(promptFont)
                    .fontDesign(.rounded)
                    .foregroundStyle(theme.textPrimary)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.5)
            }
            feedbackLine
        }
        .padding(24)
        .frame(maxWidth: .infinity, minHeight: 170)
        .background(
            RoundedRectangle(cornerRadius: 28)
                .fill(theme.cardBackground)
                .overlay(RoundedRectangle(cornerRadius: 28).stroke(borderColor, lineWidth: 3))
        )
        .animation(.easeOut(duration: 0.2), value: feedbackState ?? true)
    }

    private var promptFont: Font {
        let joined = viewModel.promptLines.joined()
        return joined.count > 60
            ? .title3.weight(.semibold)
            : .system(size: 34, weight: .bold)
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

    @ViewBuilder
    private var answerWidget: some View {
        switch viewModel.answerType {
        case "numberPad", "fillBlank":
            NumberPadWidget(disabled: feedbackState != nil) { viewModel.submit($0) }
        case "symbolSelect":
            SymbolSelectWidget(disabled: feedbackState != nil) { viewModel.submit($0) }
        case "multiSelect":
            MultiSelectWidget(
                options: viewModel.multiSelectOptions,
                requiredCount: viewModel.multiSelectRequiredCount,
                disabled: feedbackState != nil
            ) { viewModel.submit($0) }
        default:
            ChoiceWidget(choices: viewModel.choices, disabled: feedbackState != nil) {
                viewModel.submit($0)
            }
        }
    }

    private var levelUpBanner: some View {
        Text("⭐️ Level up! ⭐️")
            .font(.title.weight(.heavy))
            .fontDesign(.rounded)
            .padding(.horizontal, 28)
            .padding(.vertical, 16)
            .background(
                Capsule().fill(LinearGradient(colors: theme.ctaGradient, startPoint: .leading, endPoint: .trailing))
            )
            .foregroundStyle(.white)
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
