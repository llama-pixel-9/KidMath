import Foundation

/// App-wide dependencies, created once at launch. The engine is a single
/// JSContext confined to the main actor (generation is ~µs-fast, verified by
/// the test suite, so main-thread use is fine at P2 scale).
@MainActor
final class AppModel: ObservableObject {
    let engine: EngineBridge?
    let engineError: String?
    let supabase: SupabaseService
    let progressStore: ProgressStore
    let bankService: BankService?
    /// The practice log (parent report source); nil only when the engine failed.
    let practiceLog: PracticeLog?
    let store: StoreService
    let kidProfiles: KidProfilesService

    /// modeId -> saved level, for the badges on the home grid.
    @Published var modeLevels: [String: Int] = [:]
    /// Each topic's saved progress — play by skill reads the grade pointer
    /// and mastery off it for the Home chip and Quick Start.
    @Published var modeProgress: [String: [String: Any]] = [:]

    /// Active theme, persisted like the web's theme choice.
    @Published var themeId: String = UserDefaults.standard.string(forKey: "kidmath-theme") ?? "default" {
        didSet { UserDefaults.standard.set(themeId, forKey: "kidmath-theme") }
    }
    var theme: Theme { Theme.named(themeId) }

    @Published var isMuted: Bool = SoundPlayer.shared.isMuted {
        didSet { SoundPlayer.shared.isMuted = isMuted }
    }

    /// Calm mode (brand §12): drops confetti, card shake, and pop scaling.
    /// It never disables the star or the level bar.
    @Published var calmMode: Bool = UserDefaults.standard.bool(forKey: "kidmath-calm-mode") {
        didSet { UserDefaults.standard.set(calmMode, forKey: "kidmath-calm-mode") }
    }

    /// Word problems in play (Settings, behind the parental gate). On unless
    /// a grown-up turned them off; a session reads it when it starts.
    @Published var allowWordProblems: Bool = WordProblemsSetting.isOn() {
        didSet { WordProblemsSetting.set(allowWordProblems) }
    }

    init() {
        supabase = .shared
        let isTestHost = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
        store = StoreService(supabase: .shared, autostart: !isTestHost)
        progressStore = ProgressStore(supabase: supabase)
        kidProfiles = KidProfilesService(supabase: supabase)
        do {
            let engine = try EngineBridge()
            self.engine = engine
            progressStore.engine = engine
            self.bankService = BankService(supabase: supabase, engine: engine)
            self.practiceLog = PracticeLog(engine: engine, supabase: supabase)
            self.engineError = nil
        } catch {
            self.engine = nil
            self.bankService = nil
            self.practiceLog = nil
            self.engineError = "\(error)"
        }
    }

    func refreshModeLevels() async {
        var levels: [String: Int] = [:]
        var saved: [String: [String: Any]] = [:]
        for mode in ModeCatalog.allModes where mode.playable {
            let progress = await progressStore.load(mode: mode.id)
            levels[mode.id] = ProgressStore.int(progress["level"], default: 1)
            saved[mode.id] = progress
        }
        modeLevels = levels
        modeProgress = saved
    }
}

/// The word-problems preference, stored on the web's key
/// (src/userPreferences.js). ON when the key was never written: a kid who
/// chooses a skill, or moves through a topic, meets its story questions
/// unless a grown-up switched them off. Every play session the engine builds
/// gets it as `allowWordProblems`; worksheets do not read it.
enum WordProblemsSetting {
    static let key = "kidmath-allow-word-problems"

    /// `object(forKey:)`, never `bool(forKey:)`: that reads a missing key as false.
    static func isOn(in defaults: UserDefaults = .standard) -> Bool {
        defaults.object(forKey: key) as? Bool ?? true
    }

    static func set(_ allowed: Bool, in defaults: UserDefaults = .standard) {
        defaults.set(allowed, forKey: key)
    }
}
