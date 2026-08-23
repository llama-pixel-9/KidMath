import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { supabase } from "../supabaseClient";
import { fetchKids, activeKidId, setActiveKid } from "../kidProfiles";
import { paywallEnabled } from "../premium";

/**
 * /account — the parental rights surface (16 CFR §312.6, Apple 5.1.1(v)).
 * A parent can see exactly what we hold about each child, delete a child's
 * profile (that is the "refuse further collection" right), and delete the
 * whole account with everything in it. Deletion is deletion — the
 * delete-account Edge Function purges rows and the auth user; nothing is
 * merely deactivated.
 */

/** Buttons that destroy data ask twice, inline — no browser confirm(). */
function DangerButton({ label, confirmLabel, onConfirm, busy }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={`px-4 h-11 rounded-xl border-2 text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 ${
        armed
          ? "border-ember bg-ember text-white"
          : "border-ember/40 text-ember hover:border-ember"
      }`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [kids, setKids] = useState([]);
  const [progress, setProgress] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/signup", { replace: true });
  }, [user, loading, navigate]);

  const refresh = useCallback(async () => {
    if (!user || !supabase) return;
    setKids(await fetchKids(user.id));
    const { data } = await supabase
      .from("progress")
      .select("kid_id, mode, level, total_sessions, lifetime_stars")
      .eq("user_id", user.id)
      .order("mode");
    setProgress(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading || !user) return null;

  const deleteKid = async (kid) => {
    setError("");
    setBusy(true);
    try {
      const { error: err } = await supabase.from("kid_profiles").delete().eq("id", kid.id);
      if (err) throw new Error(err.message);
      if (activeKidId() === kid.id) setActiveKid(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not delete the profile — try again.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setError("");
    setBusy(true);
    try {
      const { error: err } = await supabase.functions.invoke("delete-account", {
        body: { action: "account" },
      });
      if (err) throw new Error(err.message);
      // The cloud copy is gone; wipe this device's copy too.
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("kidmath") || k.startsWith("larkit"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* private mode */
      }
      await signOut();
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.message || "Could not delete the account — try again.");
      setBusy(false);
    }
  };

  const totalStars = progress.reduce((sum, row) => sum + (row.lifetime_stars || 0), 0);
  const totalSessions = progress.reduce((sum, row) => sum + (row.total_sessions || 0), 0);
  const kidName = (id) => kids.find((k) => k.id === id)?.first_name || "A deleted profile";
  const progressByKid = [...new Set(progress.map((r) => r.kid_id || null))].map((kidId) => ({
    kidId,
    label: kidId ? kidName(kidId) : "Before profiles (this household)",
    rows: progress.filter((r) => (r.kid_id || null) === kidId),
  }));

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
      <h1 className="font-display font-semibold text-4xl text-ink m-0">Your account</h1>
      <p className="mt-2 text-base font-semibold text-ink/60">{user.email}</p>

      {/* §312.6(a)(1): show the parent everything we hold about each child. */}
      <section className="mt-10">
        <h2 className="font-display font-medium text-2xl text-ink m-0">Your kids</h2>
        <p className="mt-1 text-sm font-semibold text-ink/60">
          Everything we store about each child is shown here: first name, age, and grade,
          plus their practice progress, summarized below.
        </p>
        {kids.length === 0 && (
          <p className="mt-4 text-sm font-semibold text-ink/50">No child profiles yet.</p>
        )}
        <div className="mt-4 space-y-3">
          {kids.map((kid) => (
            <div
              key={kid.id}
              className="bg-white rounded-[18px] border-[1.5px] border-ink/10 p-5 flex items-center justify-between gap-4 flex-wrap"
            >
              <div>
                <p className="m-0 font-bold text-lg text-ink">{kid.first_name}</p>
                <p className="m-0 mt-1 text-sm font-semibold text-ink/60">
                  Age {kid.age} · Grade {kid.grade} · added{" "}
                  {new Date(kid.created_at).toLocaleDateString()}
                </p>
              </div>
              <DangerButton
                label="Delete this profile"
                confirmLabel={`Really delete ${kid.first_name}'s profile?`}
                busy={busy}
                onConfirm={() => deleteKid(kid)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-medium text-2xl text-ink m-0">Practice progress we hold</h2>
        <p className="mt-1 text-sm font-semibold text-ink/60">
          The readable version — time, accuracy by skill, and missed questions — is the{" "}
          <Link to="/report" className="text-teal underline">progress report</Link>.
        </p>
        {progress.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-ink/50">No cloud progress yet.</p>
        ) : (
          <>
            <p className="mt-1 text-sm font-semibold text-ink/60">
              {totalSessions} practice sessions · {totalStars} stars, across{" "}
              {progress.length} game{progress.length === 1 ? "" : "s"}.
            </p>
            {/* Progress is per kid (kid_id); a null kid_id is the household
                row from a device that practiced before any profile existed. */}
            {progressByKid.map(({ kidId, label, rows }) => (
              <div key={kidId || "household"} className="mt-4">
                <p className="text-sm font-bold text-ink">{label}</p>
                <ul className="mt-2 m-0 p-0 list-none grid sm:grid-cols-2 gap-2">
                  {rows.map((row) => (
                    <li
                      key={`${kidId}-${row.mode}`}
                      className="bg-white rounded-xl border-[1.5px] border-ink/10 px-4 py-2 text-sm font-semibold text-ink"
                    >
                      {row.mode} — level {row.level}, {row.total_sessions} sessions,{" "}
                      {row.lifetime_stars} stars
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </section>

      {paywallEnabled() && (
        <section className="mt-10">
          <h2 className="font-display font-medium text-2xl text-ink m-0">Billing</h2>
          <p className="mt-1 text-sm font-semibold text-ink/60">
            Manage or cancel your subscription in one step from{" "}
            <Link to="/account/billing" className="underline text-teal">your billing settings</Link>.
          </p>
        </section>
      )}

      <section className="mt-10 rounded-[18px] border-2 border-ember/25 p-5">
        <h2 className="font-display font-medium text-2xl text-ink m-0">Delete my account</h2>
        <p className="mt-1 text-sm font-semibold text-ink/60">
          Permanently deletes your account, every child profile, and all practice data —
          on our servers and on this device. This cannot be undone.
        </p>
        <div className="mt-4">
          <DangerButton
            label="Delete my account and all data"
            confirmLabel="Really delete everything? This cannot be undone"
            busy={busy}
            onConfirm={deleteAccount}
          />
        </div>
      </section>

      {error && <p className="mt-5 text-sm font-bold text-ember">{error}</p>}
    </main>
  );
}
