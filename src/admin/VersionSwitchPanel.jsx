import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "../useAuth";
import { useIsAdmin } from "../useIsAdmin";
import { TOPIC_LABELS } from "../skills/catalog.js";
import { listVersionSwitch, setLiveVersion, LIVE_VERSIONS } from "./versionSwitchApi.js";
import { previewEnabled, setPreviewEnabled } from "../itemBank/versionSwitch.js";

/**
 * /admin/switch — which bank version each skill serves (plan section 10).
 * One row per skill: the live version, who flipped it last and when, and a
 * v1 / preview / v2 control behind a confirm step, since a flip reaches
 * every kid's next session with no deploy in between. Anyone signed in can
 * read it (the loader reads the same table for kids); only admins get the
 * controls, and RLS refuses the write anyway if the client is wrong.
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

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await listVersionSwitch();
      setRows(new Map(list.map((r) => [r.modeId, r])));
    } catch (err) {
      setError(err.message || "Failed to load the version switch");
    } finally {
      setLoading(false);
    }
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
        version-2 rows to everyone. Rolling back is flipping the skill to v1.
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
                const live = row?.liveVersion || "v1";
                const isPending = pending?.modeId === modeId;
                return (
                  <tr key={modeId} className={`border-t border-gray-100 ${isPending ? "bg-violet-50" : ""}`}>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-slate-800">{TOPIC_LABELS[modeId] || modeId}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{modeId}</span>
                      {!row && (
                        <span className="ml-2 text-[10px] uppercase text-slate-400" title="No row yet; the loader treats it as v1">
                          no row
                        </span>
                      )}
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
                            {LIVE_VERSIONS.map((v) => (
                              <button
                                key={v}
                                type="button"
                                className={`px-2.5 py-1 text-xs font-bold ${
                                  v === live ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-violet-50"
                                }`}
                                onClick={() => v !== live && setPending({ modeId, liveVersion: v, note: "" })}
                                disabled={busy || v === live}
                                title={VERSION_HELP[v]}
                              >
                                {v}
                              </button>
                            ))}
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
