import Foundation
import Supabase

/// The practice log — one record per finished session with every attempt
/// inside it; the parent report is built from these. Swift mirror of
/// src/analytics/sessionLog.js: the RECORD is the shared engine's
/// (KidMath.openSessionRecord / appendAttempt / closeSessionRecord), so an
/// iPad session is byte-for-byte the row a web session would be. Storage
/// mirrors progress: always written locally under `kidmath-sessions[:kid]`
/// (the web's localStorage key; same JSON, `synced` flag included), and
/// upserted into `practice_sessions` when signed in.
@MainActor
final class PracticeLog {

    nonisolated private static let storeKey = "kidmath-sessions"
    nonisolated private static let activeKidKey = "kidmath-active-kid" // KidProfilesService owns this key
    nonisolated private static let maxLocalSessions = 400
    nonisolated private static let pageSize = 1000

    private let engine: EngineBridge
    private let supabase: SupabaseService
    private let defaults: UserDefaults

    init(engine: EngineBridge, supabase: SupabaseService = .shared, defaults: UserDefaults = .standard) {
        self.engine = engine
        self.supabase = supabase
        self.defaults = defaults
    }

    /// An open record — the engine's JSON, kept as a dictionary.
    typealias Record = [String: Any]

    var activeKidId: String? {
        let raw = defaults.string(forKey: Self.activeKidKey)
        return (raw?.isEmpty ?? true) ? nil : raw
    }

    // MARK: - Record lifecycle (engine-owned)

    func open(mode: String, level: Int, kind: String = "normal", now: Date = Date()) -> Record? {
        var args: [String: Any] = ["mode": mode, "level": level, "kind": kind, "now": now.timeIntervalSince1970 * 1000]
        args["kidId"] = activeKidId ?? NSNull()
        return try? engine.callDictionary("openSessionRecord", [args])
    }

    func append(_ record: Record?, question: [String: Any], submitted: Any, correct: Bool,
                wasRetry: Bool, responseTimeMs: Int, level: Int, hintUsed: Bool = false, now: Date = Date()) -> Record? {
        guard let record else { return nil }
        let args: [String: Any] = [
            "question": question, "submitted": submitted, "correct": correct, "wasRetry": wasRetry,
            "responseTimeMs": responseTimeMs, "level": level, "hintUsed": hintUsed,
            "now": now.timeIntervalSince1970 * 1000,
        ]
        return (try? engine.callDictionary("appendAttempt", [record, args])) ?? record
    }

    func close(_ record: Record?, session: [String: Any]?, starsEarned: Int, levelEnd: Int?, now: Date = Date()) -> Record? {
        guard let record else { return nil }
        var args: [String: Any] = ["starsEarned": starsEarned, "now": now.timeIntervalSince1970 * 1000]
        if let levelEnd { args["levelEnd"] = levelEnd }
        return try? engine.callDictionary("closeSessionRecord", [record, session ?? NSNull(), args])
    }

    // MARK: - Persistence (local mirror first, then cloud)

    private func storeKey(for kidId: String?) -> String {
        kidId.map { "\(Self.storeKey):\($0)" } ?? Self.storeKey
    }

    func readLocal(kidId: String?) -> [Record] {
        guard let data = defaults.data(forKey: storeKey(for: kidId)),
              let rows = try? JSONSerialization.jsonObject(with: data) as? [Record] else { return [] }
        return rows
    }

    private func writeLocal(kidId: String?, rows: [Record]) {
        let trimmed = Array(rows.suffix(Self.maxLocalSessions))
        if let data = try? JSONSerialization.data(withJSONObject: trimmed) {
            defaults.set(data, forKey: storeKey(for: kidId))
        }
    }

    /// Persist a closed record: local mirror synchronously, then the cloud
    /// copy when signed in (flipping `synced` on success).
    func save(_ record: Record?) async {
        guard var record, record["endedAt"] != nil, !(record["endedAt"] is NSNull) else { return }
        let kidId = record["kidId"] as? String
        let id = record["id"] as? String
        func put(synced: Bool) {
            record["synced"] = synced
            let others = readLocal(kidId: kidId).filter { ($0["id"] as? String) != id }
            writeLocal(kidId: kidId, rows: others + [record])
        }
        put(synced: false)
        guard let userId = supabase.userId else { return }
        if await upload(userId: userId, records: [record]) { put(synced: true) }
    }

    private func upload(userId: UUID, records: [Record]) async -> Bool {
        guard !records.isEmpty else { return false }
        do {
            let rows = try records.map { try engine.callDictionary("sessionRecordToRow", [$0, userId.uuidString]) }
            try await supabase.client
                .from("practice_sessions")
                .upsert(AnyJSON.from(rows), onConflict: "id")
                .execute()
            return true
        } catch {
            return false
        }
    }

    /// Push any local rows that never reached the cloud (offline, or
    /// pre-sign-in).
    func flushUnsynced(userId: UUID, kidId: String?) async {
        let rows = readLocal(kidId: kidId)
        let pending = rows.filter { ($0["synced"] as? Bool) != true }
        guard !pending.isEmpty else { return }
        if await upload(userId: userId, records: pending) {
            writeLocal(kidId: kidId, rows: rows.map { var r = $0; r["synced"] = true; return r })
        }
    }

    /// Every session for the report. Signed-in: the cloud copy (paginated —
    /// the 1,000-row cap is a wrong read), filtered by kid. Otherwise this
    /// device's rows for the active kid.
    func loadSessions(kidId: String? = nil) async -> (source: String, sessions: [Record]) {
        let kid = kidId ?? activeKidId
        if let userId = supabase.userId {
            await flushUnsynced(userId: userId, kidId: kid)
            var out: [Record] = []
            var from = 0
            while true {
                do {
                    var query = supabase.client
                        .from("practice_sessions")
                        .select("*")
                        .eq("user_id", value: userId.uuidString)
                    if let kid { query = query.eq("kid_id", value: kid) }
                    let response = try await query
                        .order("started_at", ascending: true)
                        .range(from: from, to: from + Self.pageSize - 1)
                        .execute()
                    let rows = try JSONSerialization.jsonObject(with: response.data) as? [[String: Any]] ?? []
                    out.append(contentsOf: rows.compactMap { try? engine.callDictionary("sessionRecordFromRow", [$0]) })
                    if rows.count < Self.pageSize { return ("cloud", out) }
                    from += Self.pageSize
                } catch {
                    break
                }
            }
        }
        let local = readLocal(kidId: kid).sorted {
            (($0["startedAt"] as? NSNumber)?.doubleValue ?? 0) < (($1["startedAt"] as? NSNumber)?.doubleValue ?? 0)
        }
        return ("local", local)
    }

    // MARK: - Report

    /// `buildReport` from reportModel.js — pure, shared. `days` nil = all time.
    func buildReport(sessions: [Record], days: Int?, progressByMode: [String: Any] = [:], now: Date = Date()) -> [String: Any]? {
        var options: [String: Any] = ["now": now.timeIntervalSince1970 * 1000, "progressByMode": progressByMode]
        options["days"] = days ?? NSNull()
        return try? engine.callDictionary("buildReport", [sessions, options])
    }

    func headline(report: [String: Any], kidName: String?) -> String {
        (try? engine.callString("reportHeadline", [report, kidName ?? NSNull()])) ?? ""
    }
}
