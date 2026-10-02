import Foundation

/// Mode-scoped item-bank loading — Swift mirror of src/itemBank/modeLoader.js.
///
/// The engine bundle ships with the seed bank baked in, so every mode works
/// instantly and offline. When a mode is opened (and the user is signed in —
/// anon cannot read item_bank), fetch that mode's approved items and hand
/// them to the engine, which serves them in place of the mode's seed items.
/// Idempotent per mode; a failed fetch leaves the seeded items in place
/// rather than blocking play.
///
/// The item bank version switch (`item_version_switch`) is read alongside
/// and injected before the rows. The engine holds both versions and serves
/// what src/itemBank/versionRules.js allows, the same rule the web runs, so
/// a flip only needs a fresh read of the switch, never a re-fetch. The read
/// happens as a session starts (at most once per `switchTTL`), never in the
/// background, so a flip cannot change the items under a running session.
@MainActor
final class BankService {

    enum ModeStatus {
        case seeded, loading, loaded, failed
    }

    /// How long a successful read of the switch is trusted: the web's
    /// refresh debounce (cloudLoader.js REFRESH_DEBOUNCE_MS).
    private static let switchTTL: TimeInterval = 30

    /// Whether this device sees topics in `preview` at v2: the iOS twin of
    /// the web's `?preview=v2` marker. UserDefaults `previewV2`, persistent
    /// like the web's localStorage marker. Set by opening
    /// `kidmath://preview?v=2` (cleared by `?v=1`, see `handlePreviewURL`), or
    /// for one launch by the argument `-previewV2 1` (Xcode or simctl).
    nonisolated static var previewEnabled: Bool {
        UserDefaults.standard.bool(forKey: "previewV2")
    }

    /// `kidmath://preview?v=2` makes this device a preview viewer and
    /// `kidmath://preview?v=1` stops it, as the web's `?preview=v2` and
    /// `?preview=v1` links do. True when the URL was a preview link (handled,
    /// even with no or an unknown `v`); false for any other URL, which the
    /// caller passes on (the auth callback is `kidmath://auth-callback`).
    /// The caller then calls `applyPreview()` so the change needs no restart.
    nonisolated static func handlePreviewURL(_ url: URL) -> Bool {
        guard let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
              parts.scheme == "kidmath", parts.host == "preview" else { return false }
        let wanted = parts.queryItems?.first(where: { $0.name == "v" })?.value
        if wanted == "2" {
            UserDefaults.standard.set(true, forKey: "previewV2")
        } else if wanted == "1" {
            UserDefaults.standard.removeObject(forKey: "previewV2")
        }
        return true
    }

    private let supabase: SupabaseService
    private let engine: EngineBridge
    private var status: [String: ModeStatus] = [:]
    private var inflight: [String: Task<Void, Never>] = [:]
    /// The last switch rows read successfully; [] (every topic at its
    /// default) until a read succeeds.
    private var switchRows: [[String: Any]] = []
    /// When the switch was last read, successful or not: like the web's
    /// refresh debounce, a failing network costs one attempt per TTL, not
    /// one per session start.
    private var switchTriedAt: Date?
    private var switchInflight: Task<Void, Never>?

    init(supabase: SupabaseService = .shared, engine: EngineBridge) {
        self.supabase = supabase
        self.engine = engine
    }

    func modeStatus(_ modeId: String) -> ModeStatus {
        status[modeId] ?? .seeded
    }

    /// Kick off (or join) the cloud fetch for one mode. Always safe to call;
    /// resolves without throwing, so session start is never blocked by a
    /// failure. Always the whole mode: its rows replace the mode's seed in
    /// the engine, so there is no level-window variant.
    func ensureModeLoaded(_ modeId: String) async {
        if status[modeId] == .loaded {
            // The rows are held already. Bring the switch up to date before
            // the caller creates its session (free inside the TTL, one small
            // read past it), so a flip lands between sessions, never in one.
            await refreshVersionSwitch()
            return
        }
        if let existing = inflight[modeId] {
            await existing.value
            return
        }
        guard supabase.isSignedIn else { return } // seed keeps working
        status[modeId] = .loading
        let task = Task { [weak self] in
            guard let self else { return }
            // The switch read overlaps the first page (as modeLoader.js does)
            // and lands before the rows, so no row is served without it.
            let switchLoad = Task { await self.refreshVersionSwitch() }
            do {
                let rows = try await self.supabase.fetchModeItemRows(modeId: modeId)
                await switchLoad.value
                // modeId: the mode's seed goes even if it has no rows.
                let added = try self.engine.addBankRows(rows, modeId: modeId)
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

    /// Read `item_version_switch` (at most once per `switchTTL`) and inject
    /// it, with this device's preview flag, into the engine. Never throws: a
    /// failed read keeps the last good rows (as the web's getVersionSwitch
    /// does), and before any success that is [] (v1 everywhere, Math Facts
    /// at v2), what the web serves when its read fails.
    func refreshVersionSwitch() async {
        if let switchInflight {
            await switchInflight.value
            return
        }
        if let triedAt = switchTriedAt, Date().timeIntervalSince(triedAt) < BankService.switchTTL { return }
        switchTriedAt = Date()
        let task = Task { [weak self] in
            guard let self else { return }
            if let rows = try? await self.supabase.fetchVersionSwitchRows() {
                self.switchRows = rows
            }
            self.applyPreview()
        }
        switchInflight = task
        await task.value
        switchInflight = nil
    }

    /// Re-inject the last switch rows with the current preview flag, with no
    /// fetch: what a preview link calls so the change applies at once. The
    /// engine skips the rebuild when nothing changed.
    func applyPreview() {
        try? engine.setVersionSwitch(rows: switchRows, preview: BankService.previewEnabled)
    }

    /// Sign-out: drop cloud items back to the bundled seed (web parity).
    /// The switch stays injected; it only filters cloud rows.
    func reset() throws {
        status.removeAll()
        inflight.removeAll()
        try engine.resetBankToBundle()
    }
}
