import { motion, AnimatePresence } from "framer-motion";
import Feather from "../components/feather.jsx";
import { useTheme } from "../useTheme.js";
import { MODE_IDS, getModeConfig } from "../modes";
import { loadProgressSync } from "../progressStore";
import { loadEngagement, starBalance, currentStreak } from "./engagementStore.js";
import { gradeSpanFor } from "./gradeSpans.js";
import { SPECIES_BY_ID } from "./roster.js";
import { meadowEnabled } from "../gamificationFlags.js";

/**
 * The parent snapshot: one screen answering "is my kid practicing, and where
 * do they stand?" in grade language. Reads the same local stores the game
 * writes — v1 shows this device's play.
 */
export default function GrownUpsPanel({ open, onClose }) {
  const { theme } = useTheme();
  if (!open) return null;

  const eng = loadEngagement();
  const streak = currentStreak(eng);
  // The one bird thing parents see is the collection itself, stated factually
  // — a real-species conservation-education angle, not a pun.
  const birdWorld = meadowEnabled();
  const flock = eng.birds || [];
  const rareCount = flock.filter((b) => {
    const tier = SPECIES_BY_ID[b.speciesId]?.tier;
    return tier === "rare" || tier === "legendary";
  }).length;
  const rows = MODE_IDS.map((id) => ({ id, progress: loadProgressSync(id) || {} }))
    .filter(({ progress }) => (progress.totalSessions ?? 0) > 0 || (progress.level ?? 1) > 1)
    .sort((a, b) => (b.progress.lifetimeStars ?? 0) - (a.progress.lifetimeStars ?? 0));

  const stat = `rounded-2xl p-3 text-center ${theme.cardBg} shadow-sm`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
          initial={{ scale: 0.85, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-extrabold text-slate-800">For Grown-Ups</h2>
            <button type="button" className="p-2 rounded-full text-slate-400 cursor-pointer" onClick={onClose} aria-label="Close">
              <Feather name="close" size={20} className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Practice on this device. Levels climb by skill, not time — the grade range says
            what each activity covers.
          </p>

          <div className={`grid ${birdWorld ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"} gap-2 mb-5`}>
            <div className={stat}>
              <Feather name="streak" size={16} className="h-5 w-5 text-orange-500 mx-auto" />
              <p className="text-lg font-extrabold text-slate-800">{streak}</p>
              <p className="text-[11px] font-semibold text-slate-500">day streak (best {eng.bestStreak})</p>
            </div>
            <div className={stat}>
              <Feather name="star" size={16} className="h-5 w-5 text-yellow-500 fill-yellow-400 mx-auto" />
              <p className="text-lg font-extrabold text-slate-800">{eng.earnedStars}</p>
              <p className="text-[11px] font-semibold text-slate-500">stars earned ({starBalance(eng)} unspent)</p>
            </div>
            <div className={stat}>
              <Feather name="check" size={16} className="h-5 w-5 text-violet-500 mx-auto" />
              <p className="text-lg font-extrabold text-slate-800">
                {birdWorld ? eng.sessionsCount ?? 0 : (eng.badges ?? []).length}
              </p>
              <p className="text-[11px] font-semibold text-slate-500">
                {birdWorld ? "practice sessions" : `badges · ${eng.sessionsCount ?? 0} sessions`}
              </p>
            </div>
            {birdWorld && (
              <div className={stat}>
                <Feather name="nest" size={16} className="h-5 w-5 text-teal mx-auto" />
                <p className="text-lg font-extrabold text-slate-800">{flock.length}</p>
                <p className="text-[11px] font-semibold text-slate-500">
                  bird species collected{rareCount > 0 ? ` (${rareCount} rare or endangered)` : ""}
                </p>
              </div>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No practice yet on this device — progress will appear after the first session.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="py-1.5">Skill</th>
                  <th className="py-1.5">Standing</th>
                  <th className="py-1.5 text-right">Stars</th>
                  <th className="py-1.5 text-right">In review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ id, progress }) => {
                  const level = progress.level ?? 1;
                  const reviewCount = Array.isArray(progress.mistakeBank) ? progress.mistakeBank.length : 0;
                  return (
                    <tr key={id} className="border-t border-slate-100">
                      <td className="py-2">
                        <p className="font-bold text-slate-700">{getModeConfig(id).shortLabel}</p>
                        <p className="text-[11px] text-slate-400">Grades {gradeSpanFor(id)}</p>
                      </td>
                      {/* Parents get plain vocabulary — no rank names here (bird
                          language is kid-surface only). */}
                      <td className="py-2 text-slate-600 font-semibold">Level {level} of 10</td>
                      <td className="py-2 text-right font-bold text-slate-700">{progress.lifetimeStars ?? 0}</td>
                      <td className="py-2 text-right">
                        {reviewCount > 0 ? (
                          <span className="font-bold text-amber-600" title="Tricky problems the app will bring back">
                            {reviewCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {birdWorld && (
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5">
              {/* Plain-language answers to the two questions parents actually
                  ask about the bird collection. */}
              <p className="text-[12px] text-slate-500">
                The bird collection features real species with true facts — a conservation-education
                angle, not a game of chance. Stars are earned only by practicing and can never be
                bought, at any price.
              </p>
              <p className="text-[12px] text-slate-500">
                A few birds migrate with the real seasons: they leave for a season, their spot is
                kept, and they always come back. No bird is ever lost, and the collection never
                affects which math activities are available.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
