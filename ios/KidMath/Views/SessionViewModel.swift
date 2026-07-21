import Foundation

/// Drives one adaptive session — the Swift counterpart of the session logic
/// in src/MathExplorer.jsx (submitAnswer / loadNextQuestion / finishSession).
/// Timing mirrors the web: correct feedback holds 1.2s, wrong holds 2s with
/// the right answer revealed, then the next question loads.
@MainActor
final class SessionViewModel: ObservableObject {

    enum Phase: Equatable {
        case loading
        case question
        case feedback(correct: Bool)
        case complete(starsEarned: Int, lifetimeStars: Int)
        case failed(String)
    }

    let modeId: String
    let sessionSize: Int
    /// Feedback hold times; tests shrink these to keep suites fast.
    let correctHold: Duration
    let wrongHold: Duration
    @Published private(set) var phase: Phase = .loading
    @Published private(set) var question: [String: Any] = [:]
    @Published private(set) var answerType = "choice"
    @Published private(set) var isRetry = false
    @Published private(set) var level = 1
    @Published private(set) var answeredCount = 0
    @Published private(set) var showLevelUp = false
    @Published private(set) var streak = 0
    /// Bumped per question so widget @State (entries, picks) resets with it.
    @Published private(set) var questionKey = 0
    /// Set during wrong-answer feedback so the widget can reveal the answer.
    @Published private(set) var revealAnswer: Any?

    private let engine: EngineBridge
    private let progressStore: ProgressStore
    private let bankService: BankService?
    private var session: EngineBridge.Session?
    private var questionStart = Date()
    private var locked = false

    init(
        modeId: String,
        engine: EngineBridge,
        progressStore: ProgressStore,
        bankService: BankService?,
        sessionSize: Int = 10,
        correctHold: Duration = .milliseconds(1200),
        wrongHold: Duration = .milliseconds(2000)
    ) {
        self.modeId = modeId
        self.engine = engine
        self.progressStore = progressStore
        self.bankService = bankService
        self.sessionSize = sessionSize
        self.correctHold = correctHold
        self.wrongHold = wrongHold
    }

    func start() async {
        await bankService?.ensureModeLoaded(modeId)
        let savedProgress = await progressStore.load(mode: modeId)
        do {
            let session = try engine.createSession(
                mode: modeId,
                sessionSize: sessionSize,
                options: ["savedProgress": savedProgress]
            )
            self.session = session
            self.level = ProgressStore.int(session.snapshot["level"], default: 1)
            loadNextQuestion()
        } catch {
            phase = .failed("\(error)")
        }
    }

    var progressFraction: Double {
        Double(answeredCount) / Double(sessionSize)
    }

    var promptLines: [String] {
        let display = question["display"] as? [String: Any]
        let prompt = (display?["promptText"] as? String)
            ?? (question["question"] as? String)
            ?? ""
        return prompt.split(separator: "\n").map(String.init)
    }

    var choices: [Any] {
        question["choices"] as? [Any] ?? []
    }

    var display: [String: Any] {
        question["display"] as? [String: Any] ?? [:]
    }

    var multiSelectOptions: [Any] {
        (question["display"] as? [String: Any])?["options"] as? [Any] ?? []
    }

    var multiSelectRequiredCount: Int {
        ProgressStore.int((question["display"] as? [String: Any])?["requiredCount"], default: 2)
    }

    private func loadNextQuestion() {
        guard let session else { return }
        do {
            let (question, isRetry) = try engine.nextQuestion(in: session)
            self.question = question
            self.isRetry = isRetry
            self.answerType = try engine.questionAnswerType(question: question)
            self.level = ProgressStore.int(session.snapshot["level"], default: level)
            self.answeredCount = ProgressStore.int(session.snapshot["questionsAnswered"])
            self.streak = ProgressStore.int(session.snapshot["correctStreak"])
            self.revealAnswer = nil
            self.questionStart = Date()
            self.locked = false
            self.questionKey += 1
            self.phase = .question
        } catch {
            phase = .failed("\(error)")
        }
    }

    /// The single answer-commit path, like the web's submitAnswer.
    func submit(_ value: Any) {
        guard let session, !locked, case .question = phase else { return }
        locked = true
        do {
            let responseTimeMs = Int(Date().timeIntervalSince(questionStart) * 1000)
            let outcome = try engine.recordAnswer(
                in: session,
                question: question,
                answer: value,
                responseTimeMs: responseTimeMs,
                wasRetry: isRetry
            )
            phase = .feedback(correct: outcome.correct)
            if !outcome.correct { revealAnswer = question["answer"] }
            if outcome.levelChanged, outcome.newLevel > level {
                showLevelUp = true
            }
            // Same sound priority as the web's submitAnswer.
            let newStreak = ProgressStore.int(session.snapshot["correctStreak"])
            if outcome.correct {
                if outcome.levelChanged, outcome.newLevel > level {
                    SoundPlayer.shared.playLevelUp()
                } else if newStreak >= 3 {
                    SoundPlayer.shared.playStreak()
                } else {
                    SoundPlayer.shared.playCorrect()
                }
            } else {
                SoundPlayer.shared.playWrong()
            }
            level = outcome.newLevel

            Task { [weak self] in
                try? await Task.sleep(for: outcome.correct ? correctHold : wrongHold)
                await self?.advance()
            }
        } catch {
            locked = false
            phase = .failed("\(error)")
        }
    }

    private func advance() async {
        guard let session else { return }
        showLevelUp = false
        if (try? engine.isSessionComplete(session)) == true {
            await finishSession()
        } else {
            loadNextQuestion()
        }
    }

    private func finishSession() async {
        guard let session else { return }
        let snapshot = session.snapshot
        let starsEarned = ProgressStore.int(snapshot["firstTryCorrect"])
        await progressStore.save(mode: modeId, data: [
            "level": snapshot["level"] ?? 1,
            "mistakeBank": snapshot["mistakeBank"] ?? [[String: Any]](),
            "firstTryCorrect": starsEarned,
            "bankItemStats": snapshot["bankItemStats"] ?? [String: Any](),
            "recentBankItemIds": snapshot["recentBankItemIds"] ?? [String](),
        ])
        let progress = await progressStore.load(mode: modeId)
        SoundPlayer.shared.playComplete()
        phase = .complete(
            starsEarned: starsEarned,
            lifetimeStars: ProgressStore.int(progress["lifetimeStars"])
        )
    }
}
