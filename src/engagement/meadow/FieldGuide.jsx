import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPECIES, SPECIES_BY_ID, TIERS } from "../roster.js";
import { birdName, recordRename } from "../flock.js";
import { isAway, awayChip, leavingSoon, seasonKeyForDate } from "../seasons.js";
import { playBirdCall } from "../../sounds.js";
import BirdSprite from "./BirdSprite.jsx";
import { useDragDismiss } from "./useDragDismiss.js";

/**
 * The Field Guide (§07). Opened ONLY from a bird — one subject per sheet,
 * entering from the right. It is about the REAL species and nothing else:
 * no nickname, no perch, no tier badge, no join date, no prices. Formatting
 * is what separates it from the store: one subject, a full-width plate, a
 * 3px Ink rule under the name, ruled fact rows with mono labels, flat — no
 * cards, no shadows, no grid.
 *
 * Names live in the meadow, not the book; the one exception is Rename in the
 * entry's foot for hatched rarities (§10 beat 6).
 */

const TIER_TAB_TINT = {
  common: "bg-seafoam",
  uncommon: "bg-teal-mid",
  rare: "bg-apricot",
  legendary: "bg-sun-light",
};

function FactRow({ label, value }) {
  return (
    <div className="flex gap-4 py-2.5 border-b border-ink/15">
      <span className="w-[92px] shrink-0 font-brand-mono text-[10px] tracking-[0.08em] uppercase text-ink/50 pt-0.5">
        {label}
      </span>
      <span className="text-[15px] font-bold text-ink leading-snug">{value}</span>
    </div>
  );
}

function RenameFoot({ bird, onRenamed }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(bird.customName || bird.presetName);
  if (!bird.hatched) return null;
  return editing ? (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        // Anything they type is accepted (§10 beat 4) — no validation copy.
        const name = value.trim() || bird.presetName;
        recordRename(bird.speciesId, name);
        setEditing(false);
        onRenamed?.();
      }}
    >
      <input
        className="border-b-2 border-teal bg-transparent text-[14px] font-bold text-ink outline-none w-32"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <button type="submit" className="text-[14px] font-bold text-teal cursor-pointer">
        Save
      </button>
    </form>
  ) : (
    <button type="button" className="text-[14px] font-bold text-teal cursor-pointer hover:underline" onClick={() => setEditing(true)}>
      Rename
    </button>
  );
}

export function FieldGuideEntry({ speciesId, metBirds, onFlipTo, onClose, onRenamed, lowMotionMode, ceremonies = false }) {
  const species = SPECIES_BY_ID[speciesId];
  const plateNumber = SPECIES.findIndex((s) => s.id === speciesId) + 1;
  const bird = metBirds.find((b) => b.speciesId === speciesId);
  if (!species) return null;
  // §11: the entry stays fully readable while a migrant is away — the one
  // addition is the Seafoam chip; a week out, the restlessness line.
  const away = ceremonies && bird && isAway(species);
  const restless = ceremonies && bird && !away && leavingSoon(species);

  return (
    <motion.aside
      className="absolute top-0 right-0 h-full w-full sm:w-[560px] bg-[#FFFDF4] border-l border-ink/10 flex"
      initial={lowMotionMode ? { opacity: 0 } : { x: "100%" }}
      animate={lowMotionMode ? { opacity: 1 } : { x: 0 }}
      exit={lowMotionMode ? { opacity: 0 } : { x: "100%" }}
      transition={
        lowMotionMode
          ? { duration: 0.12 }
          : { duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }
      }
      aria-label={`Field Guide — ${species.name}`}
    >
      {/* Tier tabs down the edge: birds you have never met have no tab. */}
      <div className="w-9 shrink-0 border-r border-ink/10 flex flex-col items-center gap-1.5 py-4 overflow-y-auto">
        {metBirds.map((b) => {
          const s = SPECIES_BY_ID[b.speciesId];
          return (
            <button
              key={b.speciesId}
              type="button"
              onClick={() => onFlipTo(b.speciesId)}
              aria-label={s.name}
              title={s.name}
              className={`w-5 h-8 rounded-md cursor-pointer ${TIER_TAB_TINT[s.tier]} ${
                b.speciesId === speciesId ? "ring-2 ring-ink" : "opacity-70"
              }`}
            />
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="flex items-center justify-between font-brand-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">
          <span>Field Guide</span>
          <span>
            Plate {String(plateNumber).padStart(2, "0")} of {SPECIES.length}
          </span>
        </div>

        {/* The plate slot never collapses (§14 entry swap). */}
        <div className="mt-3 h-[206px] rounded-xl bg-seafoam/60 relative overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={speciesId}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <svg width="220" height="170" viewBox="-110 -150 220 170">
                <BirdSprite speciesId={speciesId} x={0} y={0} depth={1.6} label={species.name} />
              </svg>
            </motion.div>
          </AnimatePresence>
          <span className="absolute top-2 left-3 font-brand-mono text-[9px] tracking-[0.08em] uppercase text-ink/40">
            Sketch · plate slot
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={speciesId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h2 className="mt-4 text-3xl font-display font-semibold text-ink border-b-[3px] border-ink pb-2">
              {species.name}
            </h2>
            <p className="mt-1.5 text-[14px] italic text-ink/60 font-semibold">{species.latin}</p>
            {away && (
              <span className="mt-2 inline-block bg-seafoam text-ink text-[12px] font-bold rounded-full px-2.5 py-[3px]">
                {awayChip(species)}
              </span>
            )}
            {restless && (
              <p className="mt-2 text-[13px] font-bold text-ink/70">
                {species.pronoun === "she" ? "She" : "He"} is getting ready to go south.
              </p>
            )}

            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 bg-teal text-cream rounded-full px-3.5 py-1.5 text-[14px] font-bold cursor-pointer btn-press shadow-[0_3px_0_#064A41]"
              onClick={() => playBirdCall()}
            >
              ♪ {species.pronoun === "she" ? "Her" : "His"} call
            </button>
            <p className="mt-1.5 text-[12px] text-ink/50 font-semibold">{species.callCaption}</p>

            <p className="mt-4 text-[17px] font-bold text-ink leading-snug">{species.wow}</p>

            <div className="mt-4">
              <FactRow label="How big" value={species.facts.howBig} />
              <FactRow label={`What ${species.pronoun} eats`} value={species.facts.eats} />
              <FactRow label={`Where ${species.pronoun} lives`} value={species.facts.lives} />
              <FactRow label={`How ${species.pronoun}'s doing`} value={species.facts.doing} />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="font-brand-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">
                A real bird · nothing about yours
              </span>
              <div className="flex items-center gap-4">
                {bird && <RenameFoot bird={bird} onRenamed={onRenamed} />}
                <button type="button" className="text-[15px] font-bold text-teal cursor-pointer hover:underline" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

/**
 * The guide drawer (§04/§14): pulled up from the 78px handle to 82% height.
 * The flock strip — every bird the kid has met, named — opening entries.
 */
export function FieldGuideDrawer({ open, metBirds, onOpenEntry, onClose, lowMotionMode, ceremonies = false, engagement = null }) {
  const { y, handleProps } = useDragDismiss(open, onClose);
  const byTier = useMemo(() => {
    const groups = [];
    for (const tier of Object.keys(TIERS)) {
      const birds = metBirds.filter((b) => SPECIES_BY_ID[b.speciesId].tier === tier);
      if (birds.length) groups.push({ tier: TIERS[tier], birds });
    }
    return groups;
  }, [metBirds]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.section
            className="fixed left-0 right-0 bottom-0 z-50 h-[82vh] bg-[#FFFDF4] rounded-t-3xl border border-b-0 border-ink/10 overflow-y-auto"
            style={lowMotionMode ? undefined : { y }}
            initial={lowMotionMode ? { opacity: 0 } : { y: "100%" }}
            animate={lowMotionMode ? { opacity: 1 } : { y: 0 }}
            exit={lowMotionMode ? { opacity: 0 } : { y: "100%" }}
            transition={lowMotionMode ? { duration: 0.12 } : { duration: 0.32, ease: [0.2, 0.9, 0.25, 1] }}
            aria-label="Field Guide"
          >
            <div className="max-w-3xl mx-auto px-6 py-5">
              {/* drag strip: follows the finger 1:1, snaps past 40% */}
              <div {...handleProps} className="-mx-6 -mt-5 px-6 pt-5 pb-1">
                <span className="w-10 h-1.5 rounded-full bg-ink/15 block mx-auto" aria-hidden="true" />
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <h2 className="text-2xl font-display font-semibold text-ink">Field Guide</h2>
                <span className="text-[14px] font-bold text-ink/60">
                  {metBirds.length} of {SPECIES.length} birds
                </span>
                <button type="button" className="ml-auto text-[15px] font-bold text-teal cursor-pointer hover:underline" onClick={onClose}>
                  Close
                </button>
              </div>
              {/* §11: after a departure, one line about who stayed — how a kid
                  learns the difference between a migrant and a resident. */}
              {ceremonies &&
                Object.values(engagement?.departuresSeen || {}).includes(seasonKeyForDate()) && (
                  <p className="mt-3 text-[13px] font-bold text-ink/70">
                    Some birds fly south for a season and come back every year. The ones who stayed
                    live here all year round.
                  </p>
                )}
              {byTier.map(({ tier, birds }) => (
                <div key={tier.id} className="mt-5">
                  <p className="font-brand-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">{tier.label}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {birds.map((b) => {
                      const s = SPECIES_BY_ID[b.speciesId];
                      return (
                        <button
                          key={b.speciesId}
                          type="button"
                          className="flex items-center gap-3 bg-white rounded-2xl border-[1.5px] border-ink/10 px-4 py-2.5 cursor-pointer btn-press [--press-edge:#14231F1a]"
                          onClick={() => onOpenEntry(b.speciesId)}
                        >
                          <svg width="40" height="36" viewBox="-24 -42 48 44" aria-hidden="true">
                            <BirdSprite speciesId={b.speciesId} x={0} y={0} depth={0.85} />
                          </svg>
                          <span className="text-left">
                            <span className="block text-[15px] font-display font-semibold text-ink">{birdName(b)}</span>
                            <span className="block text-[12px] font-bold text-ink/60">{s.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
