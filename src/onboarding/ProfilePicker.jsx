import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { MAX_KIDS, fetchKids, setActiveKid } from "../kidProfiles";
import GrownUpsPanel from "../engagement/GrownUpsPanel.jsx";

/**
 * §20 screen 05 — the returning path. Kid-facing, so it gets the bird voice.
 * Tinted discs, first name only — no level, no streak. Parent settings sit
 * top-right; kids never see a login form.
 */

const DISC_TINTS = ["bg-teal-mid", "bg-apricot", "bg-seafoam", "bg-sun-light"];

export default function ProfilePicker() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [kids, setKids] = useState(null);
  const [parentOpen, setParentOpen] = useState(false);
  const [grownUpsOpen, setGrownUpsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/welcome", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchKids(user.id).then((rows) => {
      if (!alive) return;
      if (rows.length === 0) navigate("/onboarding", { replace: true });
      else setKids(rows);
    });
    return () => { alive = false; };
  }, [user, navigate]);

  if (!user || kids === null) return null;

  const pick = (kid) => {
    setActiveKid(kid.id);
    navigate("/");
  };

  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div className="flex justify-end relative">
        <button
          type="button"
          className="text-sm font-bold text-ink/60 cursor-pointer bg-transparent border-none p-2 hover:text-ink"
          onClick={() => setParentOpen((o) => !o)}
        >
          Parent settings
        </button>
        {parentOpen && (
          <div className="absolute top-10 right-0 bg-white rounded-2xl border-[1.5px] border-ink/10 shadow-lg p-2 z-10 min-w-44">
            <button
              type="button"
              className="block w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-ink cursor-pointer hover:bg-ink/5"
              onClick={() => { setParentOpen(false); setGrownUpsOpen(true); }}
            >
              Progress report
            </button>
            <button
              type="button"
              className="block w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-ink cursor-pointer hover:bg-ink/5"
              onClick={() => { setActiveKid(null); signOut(); navigate("/welcome"); }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-16">
        <h1 className="font-display font-semibold text-4xl sm:text-5xl text-ink text-center m-0">
          Welcome back — who's flying?
        </h1>

        <div className="mt-12 flex flex-wrap items-start justify-center gap-10">
          {kids.map((kid, i) => (
            <button
              key={kid.id}
              type="button"
              className="flex flex-col items-center gap-4 cursor-pointer bg-transparent border-none group"
              onClick={() => pick(kid)}
            >
              <span
                className={`w-[150px] h-[150px] rounded-full ${DISC_TINTS[i % DISC_TINTS.length]} inline-flex items-center justify-center font-display font-medium text-6xl text-ink group-hover:scale-105 transition-transform`}
              >
                {kid.first_name.charAt(0).toUpperCase()}
              </span>
              <span className="text-xl font-semibold text-ink">{kid.first_name}</span>
            </button>
          ))}

          {kids.length < MAX_KIDS && (
            <button
              type="button"
              className="flex flex-col items-center gap-4 cursor-pointer bg-transparent border-none"
              onClick={() => navigate("/onboarding?add=1")}
            >
              <span className="w-[150px] h-[150px] rounded-full border-2 border-dashed border-teal/40 inline-flex items-center justify-center font-display text-4xl text-teal">
                +
              </span>
              <span className="text-xl font-semibold text-teal">Add</span>
            </button>
          )}
        </div>
      </div>

      <GrownUpsPanel open={grownUpsOpen} onClose={() => setGrownUpsOpen(false)} />
    </main>
  );
}
