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

    /// modeId -> saved level, for the badges on the home grid.
    @Published var modeLevels: [String: Int] = [:]

    init() {
        supabase = .shared
        progressStore = ProgressStore(supabase: supabase)
        do {
            let engine = try EngineBridge()
            self.engine = engine
            self.bankService = BankService(supabase: supabase, engine: engine)
            self.engineError = nil
        } catch {
            self.engine = nil
            self.bankService = nil
            self.engineError = "\(error)"
        }
    }

    func refreshModeLevels() async {
        var levels: [String: Int] = [:]
        for mode in ModeCatalog.allModes where mode.playable {
            let progress = await progressStore.load(mode: mode.id)
            levels[mode.id] = ProgressStore.int(progress["level"], default: 1)
        }
        modeLevels = levels
    }
}
