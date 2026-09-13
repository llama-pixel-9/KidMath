import { useEffect, useState } from "react";
import { Gift, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

/**
 * Complimentary larkit Plus for pilot families, reviewers and make-goods.
 * Everything goes through the admin-comps Edge Function — the entitlements
 * table is service-role-write only, and the function re-checks
 * profiles.is_admin before touching it.
 */
async function callComps(body) {
  const { data, error } = await supabase.functions.invoke("admin-comps", { body });
  if (error) {
    let message = error.message;
    try {
      const parsed = await error.context?.json?.();
      if (parsed?.error) message = parsed.error;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function fmtDate(value) {
  if (!value) return "no expiry";
  try {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return value;
  }
}

export default function CompsPanel() {
  const [comps, setComps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { tone: "ok" | "err", text }

  async function refresh() {
    setLoading(true);
    try {
      const { comps: rows } = await callComps({ action: "list" });
      setComps(rows || []);
    } catch (e) {
      setNotice({ tone: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function grant(e) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await callComps({ action: "grant", email, until: until || null });
      setNotice({ tone: "ok", text: res.message });
      setEmail("");
      setUntil("");
      await refresh();
    } catch (err) {
      setNotice({ tone: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(target) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await callComps({ action: "revoke", email: target });
      setNotice({ tone: "ok", text: res.message });
      await refresh();
    } catch (err) {
      setNotice({ tone: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={grant} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-teal" />
          <h2 className="text-lg font-extrabold text-slate-800 m-0">Grant larkit Plus</h2>
        </div>
        <p className="text-sm text-slate-500 m-0">
          The parent must have signed in on larkit.io once. Leave the date empty for no expiry.
          A comp never replaces a live paid subscription, and a later real purchase overwrites the comp.
        </p>
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1">Parent email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="parent@example.com"
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1">Until (optional)</span>
            <input
              type="date"
              value={until}
              onChange={(ev) => setUntil(ev.target.value)}
              className="h-11 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !email}
            className="h-11 px-5 rounded-xl bg-teal text-cream font-bold text-sm disabled:opacity-50 cursor-pointer"
          >
            Grant
          </button>
        </div>
        {notice && (
          <p className={`text-sm font-semibold m-0 ${notice.tone === "ok" ? "text-emerald-700" : "text-rose-600"}`}>
            {notice.text}
          </p>
        )}
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-slate-800 m-0">Current comps</h2>
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : comps.length === 0 ? (
          <p className="text-sm text-slate-500">No complimentary accounts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-2">Email</th>
                <th className="py-2">Status</th>
                <th className="py-2">Expires</th>
                <th className="py-2">Updated</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {comps.map((row) => (
                <tr key={row.user_id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-800">{row.email || row.user_id}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        row.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600">{fmtDate(row.expires_at)}</td>
                  <td className="py-2 text-slate-500">{fmtDate(row.updated_at)}</td>
                  <td className="py-2 text-right">
                    {row.status === "active" && row.email && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => revoke(row.email)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
