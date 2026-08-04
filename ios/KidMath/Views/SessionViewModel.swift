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
        /// §03: a pending nomination is offered at take-off — six questions,
        /// five to pass. Declining costs nothing.
        case fledgingOffer(level: Int)
        /// §03: pass fledges now (level +1, ceremony); a miss keeps the
        /// nomination and the normal flight follows either way.
        case fledgingResult(passed: Bool, newLevel: Int)
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
    /// §01/§02 (behind GamFlags.flightReport): the four-part settlement and
    /// the engagement summary the Flight Report shows. Nil while the flag is
    /// off — the classic end card renders then.
    @Published private(set) var flightPayout: EngineBridge.FlightPayout?
    @Published private(set) var flightSummary: EngagementStore.SessionEndResult?
    /// §03 (behind GamFlags.fledging): a nomination pending after this flight
    /// (drives the report's Seafoam note), whether this flight glid the level
    /// down, and whether the CURRENT run is a Fledging Flight challenge set.
    @Published private(set) var nominationPending = false
    @Published private(set) var glideDown = false
    @Published private(set) var isFledgingRun = false

    private let engine: EngineBridge
    private let progressStore: ProgressStore
    private let engagementStore: EngagementStore

    #if DEBUG
    /// Test-only: lets XCTest reach the live engine session (e.g. to force
    /// mastery via EngineBridge.forceHighMastery). Never used by the app.
    var engineSessionForTesting: EngineBridge.Session? { session }
    #endif
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
        wrongHold: Duration = .milliseconds(2000),
        engagementStore: EngagementStore = EngagementStore()
    ) {
        self.modeId = modeId
        self.engine = engine
        self.progressStore = progressStore
        self.bankService = bankService
        self.sessionSize = sessionSize
        self.correctHold = correctHold
        self.wrongHold = wrongHold
        self.engagementStore = engagementStore
    }

    /// `offerFledging` is false only for the normal flight that follows a
    /// Fledging Flight — one attempt per session, so the offer never loops.
    func start(offerFledging: Bool = true) async {
        await bankService?.ensureModeLoaded(modeId)
        let savedProgress = await progressStore.load(mode: modeId)
        do {
            let session = try engine.createSession(
                mode: modeId,
                sessionSize: sessionSize,
                options: [
                    "savedProgress": savedProgress,
                    // §03: with the flag on, promotion signals nominate
                    // instead of leveling mid-flight (shared engine rule).
                    "fledging": GamFlags.fledging,
                ]
            )
            self.session = session
            self.isFledgingRun = false
            self.nominationPending = false
            self.glideDown = false
            self.level = ProgressStore.int(session.snapshot["level"], default: 1)
            // §03 step 4: a pending nomination is offered at take-off.
            if offerFledging, GamFlags.fledging, engagementStore.nomination(for: modeId) != nil {
                phase = .fledgingOffer(level: level)
                return
            }
            loadNextQuestion()
        } catch {
            phase = .failed("\(error)")
        }
    }

    /// "Just a normal flight today" — declining costs nothing and the offer
    /// comes back at the next take-off.
    func declineFledging() {
        guard case .fledgingOffer = phase else { return }
        loadNextQuestion()
    }

    /// Take the Fledging Flight: a six-question challenge set at the CURRENT
    /// level, rotating through the weakest subskills recorded when the lark
    /// nominated. No stars ride on it.
    func acceptFledging() {
        guard case .fledgingOffer = phase else { return }
        let nomination = engagementStore.nomination(for: modeId)
        do {
            let challenge = try engine.createSession(
                mode: modeId,
                sessionSize: EngagementStore.fledgingQuestions,
                options: [
                    "fledging": true,
                    "challengeSubskills": nomination?["weakSubskills"] as? [String] ?? [String](),
                    "savedProgress": ["level": level],
                ]
            )
            self.session = challenge
            self.isFledgingRun = true
            loadNextQuestion()
        } catch {
            phase = .failed("\(error)")
        }
    }

    /// "Fly on" after the fledging ceremony — the normal flight begins at
    /// whatever level the ceremony left, with no second offer this session.
    func continueAfterFledging() async {
        guard case .fledgingResult = phase else { return }
        phase = .loading
        await start(offerFledging: false)
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
        let firstTryCorrect = ProgressStore.int(snapshot["firstTryCorrect"])
        let questionsAnswered = ProgressStore.int(snapshot["questionsAnswered"])

        // §03: a Fledging Flight settles its own way — no stars, no report.
        if isFledgingRun {
            isFledgingRun = false
            let passed = firstTryCorrect >= EngagementStore.fledgingPass
            engagementStore.recordFledgingResult(mode: modeId, passed: passed)
            let newLevel = passed ? min(level + 1, 10) : level
            await progressStore.save(mode: modeId, data: [
                "level": newLevel,
                "mistakeBank": snapshot["mistakeBank"] ?? [[String: Any]](),
                "firstTryCorrect": firstTryCorrect,
                "starsEarned": 0, // the ceremony is the reward
                "bankItemStats": snapshot["bankItemStats"] ?? [String: Any](),
                "recentBankItemIds": snapshot["recentBankItemIds"] ?? [String](),
            ])
            level = newLevel
            if passed { SoundPlayer.shared.playLevelUp() }
            phase = .fledgingResult(passed: passed, newLevel: newLevel)
            return
        }

        // §01 (flagged): the four-part settlement replaces one-star-per-
        // first-try, computed by the SAME shared engine code the web uses.
        let payout = GamFlags.flightReport ? (try? engine.summarizeFlight(session)) : nil
        let starsEarned = payout?.total ?? firstTryCorrect

        // §03 bookkeeping at flight end: the engine's in-flight signal becomes
        // a persisted nomination; a rough flight clears it silently; two
        // consecutive rough flights glide the level down one, saved below.
        var levelToSave = snapshot["level"] ?? 1
        if GamFlags.fledging {
            let outcome = engagementStore.recordFlightEnd(
                mode: modeId,
                precisionRatio: questionsAnswered > 0 ? Double(firstTryCorrect) / Double(questionsAnswered) : 0,
                nominated: snapshot["nominated"] as? Bool ?? false,
                weakSubskills: snapshot["nominationWeakSubskills"] as? [String] ?? []
            )
            nominationPending = outcome.nomination != nil
            glideDown = outcome.glideDown
            if outcome.glideDown {
                let glided = max(1, ProgressStore.int(snapshot["level"], default: 1) - 1)
                levelToSave = glided
                level = glided
            }
        }

        var data: [String: Any] = [
            "level": levelToSave,
            "mistakeBank": snapshot["mistakeBank"] ?? [[String: Any]](),
            "firstTryCorrect": firstTryCorrect,
            "bankItemStats": snapshot["bankItemStats"] ?? [String: Any](),
            "recentBankItemIds": snapshot["recentBankItemIds"] ?? [String](),
        ]
        if let payout { data["starsEarned"] = payout.total }
        await progressStore.save(mode: modeId, data: data)

        if let payout {
            flightPayout = payout
            flightSummary = engagementStore.recordSessionEnd(starsEarned: starsEarned)
        }

        let progress = await progressStore.load(mode: modeId)
        SoundPlayer.shared.playComplete()
        phase = .complete(
            starsEarned: starsEarned,
            lifetimeStars: ProgressStore.int(progress["lifetimeStars"])
        )
    }
}
