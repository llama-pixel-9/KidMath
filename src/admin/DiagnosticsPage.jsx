import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldOff, ShieldCheck } from "lucide-react";
import RequireAdmin from "../RequireAdmin";
import { supabase } from "../supabaseClient";

function fmtMs(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)} m`;
  return `${(ms / 3_600_000).toFixed(1)} h`;
}

function fmtDate(value) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function classify(session) {
  if (session.freeze_detected) return { label: "FREEZE", color: "bg-red-100 text-red-800" };
  if (session.post_mortem && session.post_mortem.classification === "freeze_observed") {
    return { label: "PRIOR FREEZE", color: "bg-red-100 text-red-800" };
  }
  if (session.post_mortem && session.post_mortem.classification === "abrupt_unload") {
    return { label: "ABRUPT EXIT", color: "bg-orange-100 text-orange-800" };
  }
  if (!session.ended_at) return { label: "ACTIVE/NO-END", color: "bg-amber-100 text-amber-800" };
  return { label: "OK", color: "bg-emerald-100 text-emerald-800" };
}

function DiagnosticsInner() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [flagBusy, setFlagBusy] = useState(false);

  async function refresh() {
    if (!supabase) {
      setError("Supabase not configured");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("session_diagnostics")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(200);
      if (err) throw err;
      setSessions(data || []);
      const { data: flagRow } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", "session_telemetry")
        .single();
      if (flagRow) setFlagEnabled(flagRow.enabled !== false);
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function toggleFlag() {
    if (!supabase) return;
    setFlagBusy(true);
    try {
      const next = !flagEnabled;
      await supabase
        .from("feature_flags")
        .upsert({ key: "session_telemetry", enabled: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
      setFlagEnabled(next);
    } catch (err) {
      setError(err.message || "Failed to toggle");
    } finally {
      setFlagBusy(false);
    }
  }

  const summary = useMemo(() => {
    const total = sessions.length;
    const freezes = sessions.filter((s) => s.freeze_detected || (s.post_mortem && s.post_mortem.classification === "freeze_observed")).length;
    const noClean = sessions.filter((s) => !s.ended_at).length;
    const longTaskAvg = total ? Math.round(sessions.reduce((acc, s) => acc + ((s.counters && s.counters.maxLongTaskMs) || 0), 0) / total) : 0;
    return { total, freezes, noClean, longTaskAvg };
  }, [sessions]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">Session Diagnostics</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFlag}
            disabled={flagBusy}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${flagEnabled ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
            title="Killswitch — disable telemetry collection"
          >
            {flagEnabled ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
            Telemetry: {flagEnabled ? "ON" : "OFF"}
          </button>
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 text-rose-800 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-100 p-4">
          <div className="text-xs uppercase font-bold text-slate-500">Sessions (200 recent)</div>
          <div className="text-2xl font-extrabold text-slate-800">{summary.total}</div>
        </div>
        <div className="rounded-xl bg-rose-100 p-4">
          <div className="text-xs uppercase font-bold text-rose-600">Freezes detected</div>
          <div className="text-2xl font-extrabold text-rose-800">{summary.freezes}</div>
        </div>
        <div className="rounded-xl bg-amber-100 p-4">
          <div className="text-xs uppercase font-bold text-amber-700">No clean exit</div>
          <div className="text-2xl font-extrabold text-amber-800">{summary.noClean}</div>
        </div>
        <div className="rounded-xl bg-slate-100 p-4">
          <div className="text-xs uppercase font-bold text-slate-500">Avg max long task</div>
          <div className="text-2xl font-extrabold text-slate-800">{fmtMs(summary.longTaskAvg)}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Started</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Device</th>
                <th className="p-3">Max LT</th>
                <th className="p-3">Max Block</th>
                <th className="p-3">Counters</th>
                <th className="p-3">Post-mortem (prior)</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const cls = classify(s);
                const duration = s.last_heartbeat_at && s.started_at
                  ? new Date(s.last_heartbeat_at).getTime() - new Date(s.started_at).getTime()
                  : null;
                return (
                  <tr
                    key={s.id}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelected(s)}
                  >
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${cls.color}`}>{cls.label}</span>
                    </td>
                    <td className="p-3 text-slate-700">{fmtDate(s.started_at)}</td>
                    <td className="p-3 text-slate-700">{fmtMs(duration)}</td>
                    <td className="p-3 text-slate-700">{s.device_label || "—"}</td>
                    <td className="p-3 text-slate-700">{fmtMs(s.counters && s.counters.maxLongTaskMs)}</td>
                    <td className="p-3 text-slate-700">{fmtMs(s.freeze_max_block_ms)}</td>
                    <td className="p-3 text-slate-700 text-xs">
                      ans:{(s.counters && s.counters.answerProcessed) || 0} · drop:{(s.counters && s.counters.answerAttemptDropped) || 0} · sets:{(s.counters && s.counters.setsCompleted) || 0}
                    </td>
                    <td className="p-3 text-slate-700 text-xs">
                      {s.post_mortem ? s.post_mortem.classification : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-slate-800">Session detail</h2>
              <button className="text-slate-500" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="font-bold">Session ID:</span> <span className="font-mono text-xs">{selected.session_id}</span></div>
                <div><span className="font-bold">User:</span> <span className="font-mono text-xs">{selected.user_id || "anon"}</span></div>
                <div><span className="font-bold">Started:</span> {fmtDate(selected.started_at)}</div>
                <div><span className="font-bold">Last heartbeat:</span> {fmtDate(selected.last_heartbeat_at)}</div>
                <div><span className="font-bold">Ended:</span> {fmtDate(selected.ended_at)}</div>
                <div><span className="font-bold">End reason:</span> {selected.end_reason || "—"}</div>
                <div className="col-span-2"><span className="font-bold">UA:</span> {selected.user_agent}</div>
              </div>
              <div>
                <div className="font-bold mb-1">Counters</div>
                <pre className="bg-slate-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(selected.counters, null, 2)}</pre>
              </div>
              <div>
                <div className="font-bold mb-1">Events (last {selected.events ? selected.events.length : 0})</div>
                <pre className="bg-slate-50 p-3 rounded text-xs overflow-auto max-h-64">{JSON.stringify(selected.events, null, 2)}</pre>
              </div>
              {selected.post_mortem && (
                <div>
                  <div className="font-bold mb-1">Post-mortem of previous session</div>
                  <pre className="bg-rose-50 p-3 rounded text-xs overflow-auto max-h-64">{JSON.stringify(selected.post_mortem, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  return (
    <RequireAdmin>
      <DiagnosticsInner />
    </RequireAdmin>
  );
}
