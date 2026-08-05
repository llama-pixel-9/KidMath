import Foundation
import JavaScriptCore

/// Wraps the bundled JS math engine (KidMathEngine.bundle.js) in a JSContext
/// and exposes it as typed Swift methods. This is the ONLY seam between Swift
/// and the shared engine: everything crosses as JSON-serialisable values, per
/// the contract in src/engine/nativeEntry.js.
///
/// Ownership rules (mirror of the web app's split):
///   - Swift fetches bank items from Supabase and injects them (`setBankItems`).
///   - Swift owns saved progress and passes it into `createSession(options:)`
///     as `savedProgress`; the engine never persists anything.
///
/// Not thread-safe: JSContext must be used from one thread. Confine an
/// instance to a single queue or actor; the engine is synchronous, so run it
/// off the main thread if generation latency ever shows on low-end devices.
final class EngineBridge {

    enum EngineError: Error, CustomStringConvertible {
        case bundleResourceMissing
        case javascript(String)
        case badResult(String)

        var description: String {
            switch self {
            case .bundleResourceMissing:
                return "KidMathEngine.bundle.js is not in the app bundle — run `npm run build:engine` and rebuild"
            case .javascript(let message):
                return "JS engine exception: \(message)"
            case .badResult(let message):
                return "Unexpected engine result: \(message)"
            }
        }
    }

    /// What `recordAnswer` reports back after scoring one answer.
    struct RecordOutcome {
        let correct: Bool
        let levelChanged: Bool
        let newLevel: Int
    }

    /// §01 flight payout — the four-part settlement `summarizeFlight` returns.
    /// An unfinished flight pays nothing at all.
    struct FlightPayout {
        let finished: Bool
        let landing: Int
        let precision: Int
        let altitude: Int
        let circleBack: Int
        let total: Int
        let firstTryCorrect: Int
    }

    /// Opaque handle to a live adaptive-session object inside the JSContext.
    /// The JS engine treats sessions immutably (`recordAnswer` returns a new
    /// one); the bridge swaps the handle's value so Swift sees one session.
    final class Session {
        fileprivate var value: JSValue
        fileprivate init(_ value: JSValue) { self.value = value }

        /// JSON snapshot of the session state — what Swift persists to
        /// Supabase (level, mistakeBank, bankItemStats, ...).
        var snapshot: [String: Any] { self.value.toObject() as? [String: Any] ?? [:] }
    }

    /// JS exceptions land here via the context's exceptionHandler. A separate
    /// reference type so the handler closure needn't capture self during init.
    private final class ExceptionBox {
        var message: String?
    }

    private let context: JSContext
    private let api: JSValue
    private let exceptions: ExceptionBox

    init() throws {
        let exceptions = ExceptionBox()
        guard let context = JSContext() else {
            throw EngineError.javascript("could not create JSContext")
        }
        context.name = "KidMathEngine"
        context.exceptionHandler = { _, exception in
            exceptions.message = exception?.toString() ?? "unknown JS exception"
        }

        guard let url = Bundle(for: EngineBridge.self)
            .url(forResource: "KidMathEngine.bundle", withExtension: "js") else {
            throw EngineError.bundleResourceMissing
        }
        let source = try String(contentsOf: url, encoding: .utf8)
        context.evaluateScript(source, withSourceURL: url)
        if let message = exceptions.message {
            throw EngineError.javascript(message)
        }

        guard let api = context.objectForKeyedSubscript("KidMath"), api.isObject else {
            throw EngineError.badResult("bundle evaluated but the KidMath global is missing")
        }
        self.context = context
        self.api = api
        self.exceptions = exceptions
    }

    // MARK: - Metadata

    var version: Int {
        Int(api.objectForKeyedSubscript("version")?.toInt32() ?? 0)
    }

    func modes() throws -> [String] {
        let result = try call("modes")
        guard let modes = result.toObject() as? [String] else {
            throw EngineError.badResult("modes() did not return an array of strings")
        }
        return modes
    }

    // MARK: - Bank injection

    func setBankItems(_ items: [[String: Any]]) throws {
        try call("setBankItems", [items])
    }

    /// Raw PostgREST rows from Supabase; the engine normalizes them with the
    /// same code the web's cloud loaders use and merges them into the seeded
    /// bank. Returns how many rows were new.
    @discardableResult
    func addBankRows(_ rows: [[String: Any]]) throws -> Int {
        Int(try call("addBankRows", [rows]).toInt32())
    }

    func bankCount() throws -> Int {
        Int(try call("bankCount").toInt32())
    }

    func resetBankToBundle() throws {
        try call("resetBankToBundle")
    }

    // MARK: - Stateless generation + scoring

    func generateQuestion(mode: String, level: Int, context: [String: Any]? = nil) throws -> [String: Any] {
        let result = try call("generateQuestion", [mode, level, context ?? NSNull()])
        return try dictionary(from: result, in: "generateQuestion")
    }

    func checkAnswer(question: [String: Any], submitted: Any) throws -> Bool {
        try call("checkAnswer", [question, submitted]).toBool()
    }

    func generateChoices(answer: Any, count: Int = 4, question: [String: Any]? = nil) throws -> [Any] {
        let result = try call("generateChoices", [answer, count, question ?? NSNull()])
        guard let choices = result.toObject() as? [Any] else {
            throw EngineError.badResult("generateChoices did not return an array")
        }
        return choices
    }

    func questionAnswerType(question: [String: Any]) throws -> String {
        guard let type = try call("questionAnswerType", [question]).toString() else {
            throw EngineError.badResult("questionAnswerType did not return a string")
        }
        return type
    }

    func generateWorksheetSet(mode: String, level: Int, size: Int, options: [String: Any] = [:]) throws -> [[String: Any]] {
        let result = try call("generateWorksheetSet", [mode, level, size, options])
        guard let set = result.toObject() as? [[String: Any]] else {
            throw EngineError.badResult("generateWorksheetSet did not return an array of questions")
        }
        return set
    }

    // MARK: - Adaptive session

    /// `options` may carry `savedProgress` (level/mistakeBank/bankItemStats/
    /// recentBankItemIds from Supabase) and `allowWordProblems`.
    func createSession(mode: String, sessionSize: Int, options: [String: Any] = [:]) throws -> Session {
        let result = try call("createAdaptiveSession", [mode, sessionSize, options])
        guard result.isObject else {
            throw EngineError.badResult("createAdaptiveSession did not return a session object")
        }
        return Session(result)
    }

    func nextQuestion(in session: Session) throws -> (question: [String: Any], isRetry: Bool) {
        let result = try call("getNextQuestion", [session.value])
        let payload = try dictionary(from: result, in: "getNextQuestion")
        guard let question = payload["question"] as? [String: Any] else {
            throw EngineError.badResult("getNextQuestion returned no question")
        }
        return (question, payload["isRetry"] as? Bool ?? false)
    }

    func recordAnswer(
        in session: Session,
        question: [String: Any],
        answer: Any,
        responseTimeMs: Int,
        wasRetry: Bool
    ) throws -> RecordOutcome {
        let result = try call("recordAnswer", [session.value, question, answer, responseTimeMs, wasRetry])
        let payload = try dictionary(from: result, in: "recordAnswer")
        guard let updated = result.objectForKeyedSubscript("session"), updated.isObject else {
            throw EngineError.badResult("recordAnswer returned no updated session")
        }
        session.value = updated
        return RecordOutcome(
            correct: payload["correct"] as? Bool ?? false,
            levelChanged: payload["levelChanged"] as? Bool ?? false,
            newLevel: (payload["newLevel"] as? NSNumber)?.intValue ?? 1
        )
    }

    func isSessionComplete(_ session: Session) throws -> Bool {
        try call("isSessionComplete", [session.value]).toBool()
    }

    /// §01: the four-part settlement (landing / precision / altitude /
    /// circle-back), computed by the same shared engine code the web uses so
    /// the two platforms can never pay differently.
    func summarizeFlight(_ session: Session) throws -> FlightPayout {
        let result = try call("summarizeFlight", [session.value])
        let payload = try dictionary(from: result, in: "summarizeFlight")
        return FlightPayout(
            finished: payload["finished"] as? Bool ?? false,
            landing: ProgressStore.int(payload["landing"]),
            precision: ProgressStore.int(payload["precision"]),
            altitude: ProgressStore.int(payload["altitude"]),
            circleBack: ProgressStore.int(payload["circleBack"]),
            total: ProgressStore.int(payload["total"]),
            firstTryCorrect: ProgressStore.int(payload["firstTryCorrect"])
        )
    }

    // MARK: - Test support

    /// Replace the engine's Math.random with the same mulberry32 PRNG the
    /// Node parity harness uses (scripts/engineParity.mjs), so a fixture
    /// generated in Node and a question generated here walk the same
    /// random sequence. Test-only.
    func reseedRandom(_ seed: UInt32) throws {
        exceptions.message = nil
        context.evaluateScript(
            """
            (function () {
              let a = \(seed) >>> 0;
              Math.random = function () {
                a |= 0; a = (a + 0x6d2b79f5) | 0;
                let t = Math.imul(a ^ (a >>> 15), 1 | a);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
              };
            })();
            """
        )
        try throwPendingException()
    }

    // MARK: - Bird world (§04–§13) — data + placement shared with the web

    /// The 22-species roster, verbatim from src/engagement/roster.js — one
    /// source of truth so a price or fact can never drift between platforms.
    func roster() throws -> [[String: Any]] {
        guard let list = try call("roster").toObject() as? [[String: Any]] else {
            throw EngineError.badResult("roster() did not return an array")
        }
        return list
    }

    func zones() throws -> [[String: Any]] {
        guard let list = try call("zones").toObject() as? [[String: Any]] else {
            throw EngineError.badResult("zones() did not return an array")
        }
        return list
    }

    func perches() throws -> [[String: Any]] {
        guard let list = try call("perches").toObject() as? [[String: Any]] else {
            throw EngineError.badResult("perches() did not return an array")
        }
        return list
    }

    func playSpots() throws -> [[String: Any]] {
        guard let list = try call("playSpots").toObject() as? [[String: Any]] else {
            throw EngineError.badResult("playSpots() did not return an array")
        }
        return list
    }

    /// §06 placement, chosen once when a bird moves in: species-suitable
    /// perch types, ≥96px spacing, 7-per-zone cap, reserved rects never
    /// picked. Returns nil when nothing suitable is free.
    func choosePerch(
        birds: [[String: Any]],
        speciesId: String,
        viewedZoneId: String,
        earnedZoneIds: [String]
    ) throws -> String? {
        let result = try call("choosePerch", [birds, speciesId, viewedZoneId, earnedZoneIds])
        return result.isString ? result.toString() : nil
    }

    /// Force every subskill in the session to a high observed mastery rate, so
    /// promotion/nomination signals can be exercised deterministically.
    /// Test-only, like reseedRandom.
    func forceHighMastery(in session: Session) throws {
        exceptions.message = nil
        context.globalObject.setObject(session.value, forKeyedSubscript: "__kidmathTestSession" as NSString)
        context.evaluateScript(
            """
            Object.values(__kidmathTestSession.skillMastery || {}).forEach(function (entry) {
              entry.attempts = 10;
              entry.correct = 10;
            });
            delete globalThis.__kidmathTestSession;
            """
        )
        try throwPendingException()
    }

    /// Canonical JSON of a generated question, stringified INSIDE the JS realm
    /// so undefined-dropping and number formatting match Node's JSON.stringify.
    func generateQuestionJSON(mode: String, level: Int) throws -> String {
        let question = try call("generateQuestion", [mode, level, NSNull()])
        exceptions.message = nil
        guard let json = context.objectForKeyedSubscript("JSON")?
            .invokeMethod("stringify", withArguments: [question]) else {
            throw EngineError.badResult("JSON.stringify unavailable in context")
        }
        try throwPendingException()
        guard let string = json.toString() else {
            throw EngineError.badResult("JSON.stringify returned no string")
        }
        return string
    }

    // MARK: - Plumbing

    @discardableResult
    private func call(_ method: String, _ arguments: [Any] = []) throws -> JSValue {
        exceptions.message = nil
        guard let result = api.invokeMethod(method, withArguments: arguments) else {
            throw EngineError.badResult("\(method) returned nothing")
        }
        try throwPendingException()
        return result
    }

    private func dictionary(from value: JSValue, in method: String) throws -> [String: Any] {
        guard let dictionary = value.toObject() as? [String: Any] else {
            throw EngineError.badResult("\(method) did not return an object")
        }
        return dictionary
    }

    private func throwPendingException() throws {
        if let message = exceptions.message {
            exceptions.message = nil
            throw EngineError.javascript(message)
        }
    }
}
