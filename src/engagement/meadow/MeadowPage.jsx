import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { meadowEnabled, birdStoreEnabled, ceremoniesEnabled, meadowMotionEnabled } from "../../gamificationFlags.js";
import { loadCalmMode } from "../../userPreferences.js";
import { loadEngagement, todayKey } from "../engagementStore.js";
import {
  recordEnsureStarter,
  recordGiveHome,
  recordBuyEgg,
  recordHatch,
  recordDepartureSeen,
  recordReturnSeen,
  recordDepartureDeferred,
  recordSeasonSeen,
  flockCount,
  birdName,
} from "../flock.js";
import { SPECIES, SPECIES_BY_ID } from "../roster.js";
import { seasonForDate, isNight, seasonKeyForDate, migrationEvents, isAway } from "../seasons.js";
import MeadowScene from "./MeadowScene.jsx";
import { FieldGuideEntry, FieldGuideDrawer } from "./FieldGuide.jsx";
import GiveAHomeDrawer from "./GiveAHome.jsx";
import { HatchingCeremony, DeparturePrompt } from "./Ceremonies.jsx";

/**
 * The Meadow (§04): fourth tab on the perch. The scene owns the page; the
 * Field Guide waits behind a handle at the bottom; the store is a separate
 * drawer in the app's card language (§08). With the ceremonies flag on, this
 * page also runs the §10–§12 lifecycle: the hatch, the leaving and the coming
 * back, and the season's three changes.
 */
export default function MeadowPage() {
  const prefersReducedMotion = useReducedMotion();
  const [calmMode] = useState(() => loadCalmMode());
  // The Skylark arrives with you on day one — granted on first visit if the
  // first flight hasn't already done it.
  const [engagement, setEngagement] = useState(() => {
    recordEnsureStarter();
    return loadEngagement();
  });
  const [guideOpen, setGuideOpen] = useState(false);
  const [entrySpecies, setEntrySpecies] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [arriving, setArriving] = useState(null);
  const [hatching, setHatching] = useState(null); // speciesId mid-ceremony
  const [departPrompt, setDepartPrompt] = useState(null); // species due a send-off
  const [departing, setDeparting] = useState(null); // bird instance mid-flight

  const refresh = useCallback(() => setEngagement(loadEngagement()), []);

  const ceremonies = ceremoniesEnabled();
  const season = seasonForDate();
  const night = ceremonies && isNight();

  // §11/§12 on open: mark the season seen (the turn plays once per quarter),
  // then surface at most one migration event — departures ask first ("come and
  // see him off?"), returns simply arrive. A departure deferred with "Later
  // today" waits until watched or the next day; a new day means it was missed:
  // no missed-event screen, just the empty perch and the chip.
  useEffect(() => {
    if (!ceremonies) return;
    recordSeasonSeen(seasonKeyForDate());
    let cancelled = false;
    const runEvents = () => {
      if (cancelled) return;
      const state = loadEngagement();
      const owned = (state.birds || []).map((b) => SPECIES_BY_ID[b.speciesId]).filter(Boolean);
      const { departures, returns, key } = migrationEvents(state, owned);
      if (departures.length) {
        const deferred = state.departureDeferredDay;
        if (deferred && deferred !== todayKey()) {
          departures.forEach((s) => recordDepartureSeen(s.id, key));
          refresh();
        } else if (!deferred) {
          setDepartPrompt(departures[0]);
        }
        return;
      }
      if (returns.length && !night) {
        const bird = (state.birds || []).find((b) => b.speciesId === returns[0].id);
        if (bird) {
          recordReturnSeen(returns[0].id, key);
          refresh();
          setArriving(returns[0].id);
        }
      }
    };
    // §14 queue: one tier-3 ceremony at a time — if stars are still landing
    // in the Nest, migration events wait their turn.
    const pending = loadEngagement().pendingNestDrop || 0;
    const t = setTimeout(runEvents, pending > 0 && meadowMotionEnabled() ? 2000 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremonies]);

  if (!meadowEnabled()) return <Navigate to="/" replace />;

  const lowMotionMode = Boolean(prefersReducedMotion) || calmMode;
  const storeEnabled = birdStoreEnabled();
  const metBirds = engagement.birds || [];
  const awayIds = ceremonies
    ? new Set(metBirds.map((b) => b.speciesId).filter((id) => isAway(SPECIES_BY_ID[id])))
    : null;

  const giveHome = (speciesId) => {
    const species = SPECIES_BY_ID[speciesId];
    if (species?.egg) {
      // §10: a legendary is never bought — an egg arrives and warms as the kid flies.
      if (recordBuyEgg(speciesId)) refresh();
      setStoreOpen(false);
      return;
    }
    const result = recordGiveHome(speciesId);
    setStoreOpen(false);
    if (result?.bird) {
      refresh();
      // The arrival flight is the receipt (§08) — no confirm, no undo.
      setArriving(result.bird.speciesId);
    }
  };

  return (
    <main className="flex-1 bg-cream bg-graph-paper">
      <div className="max-w-[1064px] mx-auto px-4 pt-6 pb-4">
        <div className="relative max-w-[1024px] mx-auto overflow-hidden rounded-3xl">
          <MeadowScene
            state={engagement}
            onStateChange={refresh}
            lowMotionMode={lowMotionMode}
            onBirdOpen={storeEnabled ? setEntrySpecies : undefined}
            sheetSpecies={entrySpecies}
            arriving={arriving}
            onArrivalDone={() => setArriving(null)}
            season={ceremonies ? season : null}
            night={night}
            awayIds={awayIds}
            departing={departing}
            onDepartureDone={() => {
              if (departing) recordDepartureSeen(departing.speciesId, seasonKeyForDate());
              setDeparting(null);
              refresh();
            }}
            onEggTap={ceremonies ? () => setHatching(engagement.egg?.speciesId) : undefined}
          />
          <AnimatePresence>
            {entrySpecies && (
              <FieldGuideEntry
                key="entry"
                speciesId={entrySpecies}
                metBirds={metBirds}
                onFlipTo={setEntrySpecies}
                onClose={() => setEntrySpecies(null)}
                onRenamed={refresh}
                lowMotionMode={lowMotionMode}
                ceremonies={ceremonies}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Guide handle: always visible at 78px, never overlapping a bird. */}
        <div className="max-w-[1024px] mx-auto h-[78px] relative bg-[#FFFDF4] rounded-b-3xl border border-t-0 border-ink/10 flex items-center px-6 gap-4">
          <span className="w-10 h-1.5 rounded-full bg-ink/15 absolute left-1/2 -translate-x-1/2 top-2.5" aria-hidden="true" />
          <button
            type="button"
            className={`flex items-baseline gap-3 ${storeEnabled ? "cursor-pointer" : "cursor-default"}`}
            onClick={storeEnabled ? () => setGuideOpen(true) : undefined}
          >
            <h2 className="text-xl font-display font-semibold text-ink">Field Guide</h2>
            <span className="text-[14px] font-bold text-ink/60">
              {flockCount(engagement)} of {SPECIES.length} birds
            </span>
            {storeEnabled && <span className="text-[14px] font-bold text-teal">Pull up to open</span>}
          </button>
          {storeEnabled && (
            <button
              type="button"
              className="ml-auto h-11 px-5 bg-teal text-cream text-[16px] font-display font-semibold rounded-[14px] shadow-[0_4px_0_#064A41] btn-press cursor-pointer"
              onClick={() => setStoreOpen(true)}
            >
              Give a home
            </button>
          )}
        </div>
      </div>

      {storeEnabled && (
        <>
          <FieldGuideDrawer
            open={guideOpen}
            metBirds={metBirds}
            onOpenEntry={(id) => {
              setGuideOpen(false);
              setEntrySpecies(id);
            }}
            onClose={() => setGuideOpen(false)}
            lowMotionMode={lowMotionMode}
            ceremonies={ceremonies}
            engagement={engagement}
          />
          <GiveAHomeDrawer
            open={storeOpen}
            state={engagement}
            onGiveHome={giveHome}
            onClose={() => setStoreOpen(false)}
            lowMotionMode={lowMotionMode}
            eggsEnabled={ceremonies}
          />
        </>
      )}

      <AnimatePresence>
        {hatching && (
          <HatchingCeremony
            key="hatch"
            speciesId={hatching}
            lowMotionMode={lowMotionMode}
            onNamed={(name) => {
              // Beat 6 is the only persistence point — closing the app any
              // earlier leaves the egg "ready", restartable from beat 1.
              const result = recordHatch(name);
              setHatching(null);
              if (result?.bird) {
                refresh();
                setArriving(result.bird.speciesId); // beat 5: the first flight
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {departPrompt && (
          <DeparturePrompt
            key="depart"
            speciesId={departPrompt.id}
            birdLabel={birdName(metBirds.find((b) => b.speciesId === departPrompt.id) || { presetName: departPrompt.name })}
            onWatch={() => {
              const bird = metBirds.find((b) => b.speciesId === departPrompt.id);
              setDepartPrompt(null);
              if (bird) setDeparting(bird);
            }}
            onLater={() => {
              recordDepartureDeferred();
              setDepartPrompt(null);
              refresh();
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
