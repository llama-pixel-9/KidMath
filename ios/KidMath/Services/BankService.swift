import Foundation

/// Mode-scoped item-bank loading — Swift mirror of src/itemBank/modeLoader.js.
///
/// The engine bundle ships with the seed bank baked in, so every mode works
/// instantly and offline. When a mode is opened (and the user is signed in —
/// anon cannot read item_bank), fetch that mode's approved items and merge
/// them into the engine. Idempotent per mode; a failed fetch leaves the
/// seeded items in place rather than blocking play.
@MainActor
final class BankService {

    enum ModeStatus {
        case seeded, loading, loaded, failed
    }

    private let supabase: SupabaseService
    private let engine: EngineBridge
    private var status: [String: ModeStatus] = [:]
    private var inflight: [String: Task<Void, Never>] = [:]

    init(supabase: SupabaseService = .shared, engine: EngineBridge) {
        self.supabase = supabase
        self.engine = engine
    }

    func modeStatus(_ modeId: String) -> ModeStatus {
        status[modeId] ?? .seeded
    }

    /// Kick off (or join) the cloud fetch for one mode. Always safe to call;
    /// resolves without throwing so session start is never blocked.
    func ensureModeLoaded(_ modeId: String, levelRange: ClosedRange<Int>? = nil) async {
        if status[modeId] == .loaded { return }
        if let existing = inflight[modeId] {
            await existing.value
            return
        }
        guard supabase.isSignedIn else { return } // seed keeps working
        status[modeId] = .loading
        let task = Task { [weak self] in
            guard let self else { return }
            do {
                let rows = try await self.supabase.fetchModeItemRows(modeId: modeId, levelRange: levelRange)
                let added = try self.engine.addBankRows(rows)
                self.status[modeId] = .loaded
                _ = added
            } catch {
                self.status[modeId] = .failed
            }
        }
        inflight[modeId] = task
        await task.value
        inflight[modeId] = nil
    }

    /// Sign-out: drop cloud items back to the bundled seed (web parity).
    func reset() throws {
        status.removeAll()
        inflight.removeAll()
        try engine.resetBankToBundle()
    }
}
