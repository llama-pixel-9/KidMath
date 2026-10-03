import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "../useAuth";
import { useIsAdmin } from "../useIsAdmin";
import { TOPIC_LABELS } from "../skills/catalog.js";
import { listVersionSwitch, readTopicReadiness, setLiveVersion, LIVE_VERSIONS } from "./versionSwitchApi.js";
import { DEFAULT_LIVE_VERSION, previewEnabled, setPreviewEnabled } from "../itemBank/versionSwitch.js";
import { V2_ONLY_MODE_IDS } from "../modes/index.js";

/**
 * /admin/switch — which bank version each skill serves (plan section 10).
 * One row per skill: the live version, who flipped it last and when, and a
 * v1 / preview / v2 control behind a confirm step, since a flip reaches
 * every kid's next session with no deploy in between. Anyone signed in can
 * read it (the loader reads the same table for kids); only admins get the
 * controls, and RLS refuses the write anyway if the client is wrong.
 *
 * Each topic carries a readiness line, read from its approved version-2 rows
 * (a paged read filtered by mode, version 2 and approved): v2 stays disabled
 * until the topic has rows and every catalog skill serves from its own cell,
 * in the database and in this build's bundle (the seed signed-out and
 * offline kids play, so the manifest is deployed before the flip;
 * src/itemBank/v2/topicReadiness.js). When that read fails the line says
 * why and v2 stays disabled; v1 and preview work either way.
 */

const VERSION_BADGE_CLASS = {
  v1: "bg-gray-100 text-slate-700",
  preview: "bg-amber-100 text-amber-800",
  v2: "bg-emerald-100 text-emerald-800",
};

const VERSION_HELP = {
  v1: "version-1 rows for everyone",
  preview: "version-2 rows for preview browsers only",
  v2: "version-2 rows for everyone",
};

function VersionBadge({ version }) {
  const cls = VERSION_BADGE_CLASS[version] || VERSION_BADGE_CLASS.v1;
  return <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${cls}`}>{version}</span>;
}

function fmtWhen(value) {
  if (!value) return "never";
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

// The audit column stores a user id, not a name; "you" is the only name
// this page can vouch for without a profiles lookup.
function fmtWho(changedBy, currentUserId) {
  if (!changedBy) return "—";
  if (currentUserId && changedBy === currentUserId) return "you";
  return changedBy.slice(0, 8);
}

// Readiness reads run a few at a time: one paged read per topic.
const READINESS_CONCURRENCY = 4;

async function eachLimited(list, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const value = list[next];
      next += 1;
      await fn(value);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
}

/**
 * Read each topic's readiness (one paged read per topic, a few at a time)
 * into `setReadiness`. `runRef` is bumped by every refresh, so a slow read
 * from an earlier refresh cannot land late.
 */
async function checkReadiness(ids, setReadiness, runRef) {
  const run = runRef.current;
  setReadiness((prev) => {
    const next = new Map(prev);
    for (const id of ids) next.set(id, { state: "loading" });
    return next;
  });
  await eachLimited(ids, READINESS_CONCURRENCY, async (modeId) => {
    let entry;
    try {
      entry = { state: "ok", ...(await readTopicReadiness(modeId)) };
    } catch (err) {
      entry = { state: "error", message: err?.message || "the read failed" };
    }
    if (runRef.current === run) setReadiness((prev) => new Map(prev).set(modeId, entry));
  });
}

/** Why v2 cannot be chosen for a topic now, or null when it can. */
function v2Blocker(entry) {
  if (!entry || entry.state === "loading") return "Checking whether every skill has version-2 rows to serve";
  if (entry.state === "error") return `Readiness unknown (${entry.message}); v2 stays off until it can be checked`;
  if (!entry.ready) return `Not ready: ${entry.reason}`;
  return null;
}

function ReadinessLine({ entry, onRetry }) {
  if (!entry || entry.state === "loading") return <div className="mt-0.5 text-xs text-slate-400">Checking v2 readiness...</div>;
  if (entry.state === "error") {
    return (
      <div className="mt-0.5 text-xs text-red-700">
        v2 readiness unknown: {entry.message}{" "}
        <button type="button" className="underline font-semibold" onClick={onRetry}>
          Check again
        </button>
      </div>
    );
  }
  const cls = entry.ready ? "text-emerald-700" : "text-amber-700";
  return (
    <div className={`mt-0.5 text-xs ${cls}`} title={entry.skills.map((s) => `${s.skillId}: ${s.count}`).join("\n")}>
      {entry.ready ? "v2 ready" : "v2 not ready"}: {entry.reason}
    </div>
  );
}

export default function VersionSwitchPanel() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [rows, setRows] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // The flip waiting for its confirm: { modeId, liveVersion, note }.
  const [pending, setPending] = useState(null);
  const [preview, setPreview] = useState(() => previewEnabled());
  // modeId -> { state: "loading" } | { state: "ok", ...topicReadiness } | { state: "error", message }
  const [readiness, setReadiness] = useState(() => new Map());
  // Each refresh bumps this, so a slow read from an earlier one cannot land late.
  const readinessRun = useRef(0);

  async function refresh() {
    setLoading(true);
    setError(null);
    readinessRun.current += 1;
    let list = [];
    try {
      list = await listVersionSwitch();
      setRows(new Map(list.map((r) => [r.modeId, r])));
    } catch (err) {
      setError(err.message || "Failed to load the version switch");
    } finally {
      setLoading(false);
    }
    // Readiness is read even when the switch read failed: it is a separate table.
    checkReadiness([...new Set([...Object.keys(TOPIC_LABELS), ...list.map((r) => r.modeId)])], setReadiness, readinessRun);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Every skill the catalog knows, plus any row the table has that the
  // catalog does not (a retired mode still carries its audit trail).
  const modeIds = useMemo(() => {
    const ids = new Set([...Object.keys(TOPIC_LABELS), ...rows.keys()]);
    return [...ids];
  }, [rows]);

  async function confirmFlip() {
    if (!pending) return;
    const blocker = pending.liveVersion === "v2" ? v2Blocker(readiness.get(pending.modeId)) : null;
    if (blocker) {
      setError(`${TOPIC_LABELS[pending.modeId] || pending.modeId}: ${blocker}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await setLiveVersion(pending.modeId, pending.liveVersion, pending.note);
      setRows((prev) => new Map(prev).set(updated.modeId, updated));
      setPending(null);
    } catch (err) {
      setError(err.message || "Flip failed");
    } finally {
      setBusy(false);
    }
  }

  function togglePreview() {
    const next = !preview;
    setPreviewEnabled(next);
    setPreview(next);
  }

  const canEdit = isAdmin && !adminLoading;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-800">Bank version switch</h1>
        <nav className="flex items-center gap-3 text-sm font-semibold text-violet-700">
          <Link to="/admin" className="hover:underline">
            Items
          </Link>
          <Link to="/admin/models" className="hover:underline">
            Item models
          </Link>
        </nav>
        <div className="flex-1" />
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-slate-700 text-sm font-bold"
          onClick={refresh}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <p className="text-sm text-slate-600">
        A flip reaches the next session of every kid, with no deploy: <b>v1</b> serves today&apos;s rows,{" "}
        <b>preview</b> serves version-2 rows only to browsers with the preview marker, <b>v2</b> serves
        version-2 rows to everyone. Rolling back is flipping the skill to v1. <b>v2</b> stays off until the
        topic&apos;s readiness line says every skill has approved version-2 rows to serve, in the database and in
        this build&apos;s bundle.
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={togglePreview}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${
            preview ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-slate-700"
          }`}
          aria-pressed={preview}
        >
          {preview ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
          Preview mode in this browser: {preview ? "on" : "off"}
        </button>
        <span className="text-xs text-slate-500">
          On, this browser sees version-2 rows for skills in <i>preview</i>. Stored locally only (also set by{" "}
          <code>?preview=v2</code>, cleared by <code>?preview=v1</code>).
        </span>
      </div>

      {!adminLoading && !isAdmin && (
        <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-sm">
          Read-only: admin access is needed to flip a skill.
        </div>
      )}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
      {loading && <div className="p-6 text-center text-sm text-slate-500">Loading...</div>}

      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Skill</th>
                <th className="px-3 py-2">Live</th>
                {canEdit && <th className="px-3 py-2">Set</th>}
                <th className="px-3 py-2">Changed by</th>
                <th className="px-3 py-2">Changed at</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {modeIds.map((modeId) => {
                const row = rows.get(modeId);
                // No row: what the loader serves, the topic's default (Math Facts
                // v2, so live; Word Problems and Multi-Digit Math preview, so
                // preview viewers only).
                const live = row?.liveVersion || DEFAULT_LIVE_VERSION[modeId] || "v1";
                const v2Only = V2_ONLY_MODE_IDS.includes(modeId);
                const isPending = pending?.modeId === modeId;
                return (
                  <tr key={modeId} className={`border-t border-gray-100 ${isPending ? "bg-violet-50" : ""}`}>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-slate-800">{TOPIC_LABELS[modeId] || modeId}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{modeId}</span>
                      {!row && (
                        <span className="ml-2 text-[10px] uppercase text-slate-400" title={`No row yet; the loader treats it as ${live}`}>
                          no row
                        </span>
                      )}
                      {v2Only && (
                        <span
                          className="ml-2 text-[10px] uppercase text-amber-700"
                          title="No version-1 rows: v1 hides the topic, preview shows it to preview browsers only, v2 shows it to everyone"
                        >
                          v2 only
                        </span>
                      )}
                      <ReadinessLine entry={readiness.get(modeId)} onRetry={() => checkReadiness([modeId], setReadiness, readinessRun)} />
                    </td>
                    <td className="px-3 py-2">
                      <VersionBadge version={live} />
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        {isPending ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-700">
                              Set to <b>{pending.liveVersion}</b> ({VERSION_HELP[pending.liveVersion]})?
                            </span>
                            <input
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs min-w-[160px]"
                              placeholder="Note (optional)"
                              value={pending.note}
                              onChange={(e) => setPending((p) => ({ ...p, note: e.target.value }))}
                              disabled={busy}
                            />
                            <button
                              type="button"
                              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50"
                              onClick={confirmFlip}
                              disabled={busy}
                            >
                              Really set {pending.liveVersion}
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1 rounded-lg border border-gray-300 text-xs font-semibold text-slate-600"
                              onClick={() => setPending(null)}
                              disabled={busy}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                            {LIVE_VERSIONS.map((v) => {
                              const blocked = v === "v2" && v !== live ? v2Blocker(readiness.get(modeId)) : null;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  className={`px-2.5 py-1 text-xs font-bold ${
                                    v === live
                                      ? "bg-violet-600 text-white"
                                      : blocked
                                        ? "bg-white text-slate-300 cursor-not-allowed"
                                        : "bg-white text-slate-600 hover:bg-violet-50"
                                  }`}
                                  onClick={() => v !== live && !blocked && setPending({ modeId, liveVersion: v, note: "" })}
                                  disabled={busy || v === live || Boolean(blocked)}
                                  title={blocked || VERSION_HELP[v]}
                                >
                                  {v}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono text-xs">{fmtWho(row?.changedBy, user?.id)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{fmtWhen(row?.changedAt)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 max-w-[240px] truncate" title={row?.note || ""}>
                      {row?.note || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
