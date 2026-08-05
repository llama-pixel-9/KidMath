import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPECIES, SPECIES_BY_ID, TIERS } from "../roster.js";
import { ownsSpecies } from "../flock.js";
import { starBalance } from "../engagementStore.js";
import { seasonForDate, seasonChip, returnLine } from "../seasons.js";
import { presentInSeason } from "../roster.js";
import BirdSprite from "./BirdSprite.jsx";
import { useDragDismiss } from "./useDragDismiss.js";

/**
 * Give a home (§08). Never called a shop. A drawer pulled up from the bottom
 * in the app's own card language — deliberately unlike the guide — with two
 * bands: what a kid can afford today, and what to keep flying for ("20 away"
 * replaces any lock icon). One bird at a time, no basket, no bundles; the one
 * purchase screen shows balance-after, and the arrival flight is the receipt.
 * Stars are the only way to bring a bird home — never money.
 */

const FILTERS = ["everyone", "common", "uncommon", "rare"];

function StarChip({ value }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-sun-light/60 rounded-full px-3 py-1 text-[15px] font-bold text-ink">
      <span className="w-3 h-3 bg-sun rotate-45 rounded-[2px]" aria-hidden="true" />
      {value}
    </span>
  );
}

function BirdCard({ species, state, season, onPick, eggsEnabled }) {
  const balance = starBalance(state);
  const owned = ownsSpecies(state, species.id);
  const here = presentInSeason(species, season);
  const isEgg = Boolean(species.egg);
  const tier = TIERS[species.tier];
  const chip = seasonChip(species);
  const away = !isEgg && species.price > balance ? species.price - balance : 0;

  return (
    <button
      type="button"
      // §10: one egg incubates at a time — the next legendary waits until
      // this chick has landed. Without the ceremonies flag the row is
      // visible ("comes as an egg") but not yet tappable.
      disabled={owned || (!here && !isEgg) || (isEgg && (!eggsEnabled || Boolean(state.egg)))}
      onClick={() => onPick(species.id)}
      className={`w-full text-left bg-white rounded-2xl border-[1.5px] border-ink/10 px-4 py-3 flex items-center gap-4 ${
        owned ? "opacity-50" : "cursor-pointer btn-press [--press-edge:#14231F1a]"
      }`}
    >
      <svg width="52" height="46" viewBox="-30 -52 60 54" aria-hidden="true">
        <BirdSprite speciesId={species.id} x={0} y={0} depth={1} />
      </svg>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[16px] font-display font-semibold text-ink">{species.name}</span>
          {chip && (
            <span className="text-[11px] font-bold text-ink bg-seafoam rounded-full px-2 py-[2px] whitespace-nowrap">
              {here ? chip : returnLine(species)}
            </span>
          )}
        </span>
        <span className="block text-[13px] font-bold text-ink/60 truncate">
          {tier.label} · {species.signature ? species.signature.line.replace(/\.$/, "").toLowerCase() : tier.tag}
        </span>
      </span>
      <span className="shrink-0 text-right">
        {isEgg ? (
          <span className="text-[13px] font-bold text-ink/70">
            {state.egg?.speciesId === species.id ? "Already warming" : "Comes as an egg"}
          </span>
        ) : owned ? (
          <span className="text-[13px] font-bold text-teal">Home</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <StarChip value={species.price} />
            {away > 0 && here && <span className="text-[12px] font-bold text-ink/50 whitespace-nowrap">{away} away</span>}
          </span>
        )}
      </span>
    </button>
  );
}

function PurchaseScreen({ speciesId, state, onGiveHome, onBack }) {
  const species = SPECIES_BY_ID[speciesId];
  const balance = starBalance(state);
  const isEgg = Boolean(species.egg);
  const price = isEgg ? species.eggPrice : species.price;
  const after = balance - price;
  const pronounHim = species.pronoun === "he" ? "him" : "her";
  return (
    <div className="max-w-md mx-auto px-6 py-6 text-center">
      <div className="h-[180px] rounded-2xl bg-seafoam/60 flex items-center justify-center">
        <svg width="200" height="150" viewBox="-100 -135 200 150">
          <BirdSprite speciesId={speciesId} x={0} y={0} depth={1.5} label={species.name} />
        </svg>
      </div>
      <h2 className="mt-4 text-3xl font-display font-semibold text-ink">{species.name}</h2>
      <p className="mt-1 font-brand-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">
        {TIERS[species.tier].label} · {species.pronoun === "he" ? "he'll" : "she'll"} take a free perch
      </p>
      <p className="mt-3 text-[16px] font-bold text-ink leading-snug">{species.wow}</p>
      <p className="mt-4 text-[15px] font-bold text-ink">
        {price} stars now · {after} left after
      </p>
      <button
        type="button"
        className="mt-4 w-full h-14 bg-teal text-cream text-xl font-display font-semibold rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer disabled:opacity-40"
        disabled={after < 0}
        onClick={onGiveHome}
      >
        {isEgg ? "Bring the egg home" : `Give ${pronounHim} a home`}
      </button>
      <button type="button" className="mt-3 text-[15px] font-bold text-ink/70 cursor-pointer" onClick={onBack}>
        Not yet
      </button>
      <p className="mt-4 text-[12px] font-semibold text-ink/50">
        {isEgg
          ? "The egg sits in the Meadow and warms as you fly. At full warmth, it is yours to hatch — whenever you like."
          : `${species.pronoun === "he" ? "His" : "Her"} call and the rest of ${species.pronoun === "he" ? "his" : "her"} entry unlock when ${species.pronoun} moves in.`}
      </p>
    </div>
  );
}

export default function GiveAHomeDrawer({ open, state, onGiveHome, onClose, lowMotionMode, eggsEnabled = false }) {
  const [filter, setFilter] = useState("everyone");
  const [picked, setPicked] = useState(null);
  const { y, handleProps } = useDragDismiss(open, onClose);
  const season = seasonForDate();
  const balance = starBalance(state);

  const listed = useMemo(
    () =>
      SPECIES.filter(
        (s) =>
          !s.starter &&
          !ownsSpecies(state, s.id) &&
          (filter === "everyone" || s.tier === filter || (filter === "rare" && s.tier === "legendary"))
      ),
    [state, filter]
  );
  const today = listed.filter((s) => !s.egg && presentInSeason(s, season) && s.price <= balance);
  const later = listed.filter((s) => !today.includes(s));

  const close = () => {
    setPicked(null);
    onClose();
  };

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
            onClick={close}
          />
          <motion.section
            className="fixed left-0 right-0 bottom-0 z-50 h-[82vh] bg-cream rounded-t-3xl border border-b-0 border-ink/10 overflow-y-auto"
            style={lowMotionMode ? undefined : { y }}
            initial={lowMotionMode ? { opacity: 0 } : { y: "100%" }}
            animate={lowMotionMode ? { opacity: 1 } : { y: 0 }}
            exit={lowMotionMode ? { opacity: 0 } : { y: "100%" }}
            transition={lowMotionMode ? { duration: 0.12 } : { duration: 0.32, ease: [0.2, 0.9, 0.25, 1] }}
            aria-label="Give a home"
          >
            {picked ? (
              <PurchaseScreen
                speciesId={picked}
                state={state}
                onBack={() => setPicked(null)}
                onGiveHome={() => {
                  const id = picked;
                  setPicked(null);
                  // No confirm-again dialog and no undo — the drawer closes
                  // and the arrival flight is the receipt.
                  onGiveHome(id);
                }}
              />
            ) : (
              <div className="max-w-3xl mx-auto px-6 py-5">
                {/* drag strip: follows the finger 1:1, snaps past 40% */}
                <div {...handleProps} className="-mx-6 -mt-5 px-6 pt-5 pb-1">
                  <span className="w-10 h-1.5 rounded-full bg-ink/15 block mx-auto" aria-hidden="true" />
                </div>
                <div className="flex items-baseline gap-3 flex-wrap mt-2">
                  <h2 className="text-2xl font-display font-semibold text-ink">Give a home</h2>
                  <span className="text-[14px] font-bold text-ink/60">
                    {listed.length} {listed.length === 1 ? "bird" : "birds"} looking for one
                  </span>
                  <span className="ml-auto">
                    <StarChip value={balance} />
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`text-[14px] font-display font-semibold rounded-full px-3.5 py-1.5 cursor-pointer capitalize ${
                        filter === f ? "bg-teal text-cream" : "bg-white text-ink border-[1.5px] border-ink/10"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {today.length > 0 && (
                  <>
                    <p className="mt-5 font-brand-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">
                      You can give a home today
                    </p>
                    <div className="mt-2 space-y-2.5">
                      {today.map((s) => (
                        <BirdCard key={s.id} species={s} state={state} season={season} onPick={setPicked} eggsEnabled={eggsEnabled} />
                      ))}
                    </div>
                  </>
                )}

                {later.length > 0 && (
                  <>
                    <p className="mt-6 font-brand-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">
                      Keep flying for these
                    </p>
                    <div className="mt-2 space-y-2.5">
                      {later.map((s) => (
                        <BirdCard key={s.id} species={s} state={state} season={season} onPick={setPicked} eggsEnabled={eggsEnabled} />
                      ))}
                    </div>
                  </>
                )}

                <p className="mt-6 mb-2 text-center text-[12px] font-semibold text-ink/50">
                  Every bird here is real, and stars are the only way to bring one home. Nothing in
                  the Meadow can be bought with money.
                </p>
              </div>
            )}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
