import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import {
  ZONES,
  ZONE_W,
  ZONE_H,
  PERCH_BY_ID,
  DEPTHS,
  zoneIndex,
} from "../perches.js";
import { SPECIES_BY_ID } from "../roster.js";
import { earnedZones, frontierZone, flockCount, zonesAwaitingOpen, birdName } from "../flock.js";
import { recordViewedZone, recordZoneOpened } from "../flock.js";
import { ZoneBackdrop, NestTree, Hedge } from "./zoneScenes.jsx";
import BirdSprite from "./BirdSprite.jsx";
import { starBalance } from "../engagementStore.js";
import { playBirdCall } from "../../sounds.js";
import { rosterEnabled, meadowMotionEnabled } from "../../gamificationFlags.js";
import { recordNestDropPlayed } from "../flock.js";
import { TIER1, TIER3 } from "./motionSpec.js";
import { PLAY_SPOTS } from "../perches.js";
import {
  rigFor,
  answersWithSignature,
  nextSignatureDelay,
  nextPlayVisitDelay,
  inOwnHour,
  playSpotKindsFor,
  setPieceToday,
  SIGNATURES_PER_SESSION,
} from "./birdBehaviors.js";
import { EggSprite, DepartureFlight } from "./Ceremonies.jsx";
import { SEASON_TINTS } from "../seasons.js";

// §12: one drifting particle per season, 3–5 sprites, snow slowest. Fixed
// deterministic configs so nothing ever pulses in sync.
const PARTICLE_STYLE = {
  petals: { color: "#F6C6CF", sizes: [8, 10, 7, 9, 8], base: 16 },
  seeds: { color: "#FFFDF4", sizes: [6, 7, 5, 7, 6], base: 20 },
  leaves: { color: "#F0A47A", sizes: [10, 12, 9, 11, 10], base: 18 },
  snow: { color: "#FFFFFF", sizes: [6, 8, 5, 7, 6], base: 26 },
};

function SeasonParticles({ kind, height }) {
  const style = PARTICLE_STYLE[kind];
  if (!style) return null;
  const configs = [0.12, 0.34, 0.55, 0.72, 0.9].map((left, i) => ({
    left: `${left * 100}%`,
    size: style.sizes[i],
    duration: style.base + i * 2.4,
    delay: i * 3.7,
    drift: i % 2 ? 26 : -22,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {configs.map((c, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: c.left, top: -16, width: c.size, height: c.size, background: style.color, opacity: 0.85 }}
          animate={{ y: [0, height + 32], x: [0, c.drift, 0] }}
          transition={{ duration: c.duration, repeat: Infinity, ease: "linear", delay: c.delay }}
        />
      ))}
    </div>
  );
}

const AWAKE_AT_NIGHT = new Set(["barnOwl", "snowyOwl"]);

/**
 * The Meadow scene (§04–§06): the earned zones side by side on one continuous
 * horizon, dragged 1:1 with the finger. The hedge is a hard wall at the
 * frontier with a rubber-band; nothing is rendered behind it. Opening a zone
 * is the only scene change, once per zone, ever.
 *
 * Timings here follow §14 (zone pan 600ms / settle 240ms / rubber-band 40px,
 * hedge ceremony 400/500/600ms); the table itself lands as motionSpec.js in
 * the motion step.
 */

const HEDGE_W = 300;

function PerchedBird({ bird, sceneOffsetX, onTap, tapped, lowMotionMode, performingRig, playSpot, asleep, idleBob }) {
  const perch = PERCH_BY_ID[bird.perchId];
  const species = SPECIES_BY_ID[bird.speciesId];
  if (!perch || !species) return null;
  const depth = DEPTHS[perch.depth] ?? 1;

  // §06/§09 behaviour layers: the OUTER group drifts to a play spot and back;
  // the INNER group carries the activity (idle bob, hop, play loop, signature
  // rig). The bob's period and delay were randomised at placement and SAVED,
  // so the flock never pulses together (§14 tier 1).
  const drift = playSpot ? { x: playSpot.x - perch.x, y: playSpot.y - perch.y } : { x: 0, y: 0 };
  const activity =
    performingRig && !lowMotionMode
      ? { keyframes: performingRig.keyframes, transition: { duration: performingRig.duration, ease: "easeInOut" } }
      : playSpot && !lowMotionMode
        ? {
            keyframes: { rotate: [0, -6, 6, -4, 4, 0], y: [0, -4, 0, -4, 0, 0] },
            transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          }
        : tapped && !lowMotionMode
          ? { keyframes: { y: [0, -14, 0], rotate: [0, 2, 0] }, transition: { duration: 0.2, ease: [0.34, 1.3, 0.64, 1] } }
          : idleBob && !asleep
            ? {
                keyframes: { y: [0, TIER1.birdIdleBob.riseYPx, 0] },
                transition: {
                  duration: idleBob.period,
                  delay: idleBob.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }
            : { keyframes: { y: 0, rotate: 0 }, transition: { duration: 0.2 } };

  return (
    <motion.g animate={drift} transition={{ duration: lowMotionMode ? 0 : 1.2, ease: "easeInOut" }}>
      <motion.g animate={activity.keyframes} transition={activity.transition}>
        <BirdSprite
          speciesId={bird.speciesId}
          x={perch.x + sceneOffsetX}
          y={perch.y}
          depth={depth}
          asleep={asleep}
          label={`${birdName(bird)} the ${species.name}`}
          onClick={() => onTap(bird, perch)}
        />
      </motion.g>
    </motion.g>
  );
}

function NameBubble({ bird, perch, sceneOffsetX, lowMotionMode }) {
  const species = SPECIES_BY_ID[bird.speciesId];
  const label = `${birdName(bird)} · ${species.name}`;
  const w = Math.max(120, label.length * 7.2 + 28);
  return (
    <motion.g
      initial={lowMotionMode ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: lowMotionMode ? 0.12 : 0.16, ease: "easeOut" }}
      pointerEvents="none"
    >
      <g transform={`translate(${perch.x + sceneOffsetX}, ${perch.y - 74})`}>
        <rect x={-w / 2} y={-18} width={w} height={34} rx={17} fill="#FFFDF4" stroke="#14231F1a" strokeWidth={1.5} />
        <text textAnchor="middle" y={4} fontFamily="Nunito, sans-serif" fontWeight={700} fontSize={13} fill="#14231F">
          {label}
        </text>
      </g>
    </motion.g>
  );
}

/**
 * §08: the arrival IS the receipt — the bird flies in from off-screen along a
 * shallow arc, lands on its saved perch, hops once, and its name bubble holds
 * 2s. Also used (step: ceremonies) for seasonal returns.
 */
function ArrivingBird({ bird, onDone, lowMotionMode }) {
  const perch = PERCH_BY_ID[bird.perchId];
  const species = SPECIES_BY_ID[bird.speciesId];
  const [landed, setLanded] = useState(lowMotionMode);
  useEffect(() => {
    const flight = lowMotionMode ? 0 : 1200;
    const t1 = setTimeout(() => setLanded(true), flight);
    const t2 = setTimeout(onDone, flight + 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone, lowMotionMode]);
  if (!perch || !species) return null;
  const offset = zoneIndex(perch.zone) * ZONE_W;
  const depth = DEPTHS[perch.depth] ?? 1;
  return (
    <g>
      <motion.g
        initial={lowMotionMode ? false : { x: -380, y: -220, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ duration: lowMotionMode ? 0.12 : 1.2, ease: "easeOut" }}
      >
        <BirdSprite
          speciesId={bird.speciesId}
          x={perch.x + offset}
          y={perch.y}
          depth={depth}
          label={`${birdName(bird)} the ${species.name} arriving`}
        />
      </motion.g>
      {landed && <NameBubble bird={bird} perch={perch} sceneOffsetX={offset} lowMotionMode={lowMotionMode} />}
    </g>
  );
}

export default function MeadowScene({
  state,
  onStateChange,
  lowMotionMode,
  onBirdOpen,
  sheetSpecies,
  arriving,
  onArrivalDone,
  // §10–§12 (ceremonies flag): season drives tint + particle; night the
  // palette swap; awayIds keeps a migrant's perch empty and reserved.
  season = null,
  night = false,
  awayIds = null,
  departing = null,
  onDepartureDone,
  onEggTap,
}) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(1024);
  const scale = width / ZONE_W;
  const height = Math.round(ZONE_H * scale);

  const earned = useMemo(() => earnedZones(state), [state]);
  const frontier = useMemo(() => frontierZone(state), [state]);
  const count = flockCount(state);
  const x = useMotionValue(0);
  const [activeZone, setActiveZone] = useState(() =>
    earned.some((z) => z.id === state.lastViewedZone) ? state.lastViewedZone : "meadow"
  );
  const [tappedBird, setTappedBird] = useState(null); // { bird, perch }
  const bubbleTimer = useRef(null);
  const [opening, setOpening] = useState(null); // zone mid-ceremony
  // §09 behaviour state: which bird is mid-signature, and the one play-spot
  // visit in progress ({ speciesId, spot }) — one bird per spot, second waits.
  const [performing, setPerforming] = useState(null);
  const [playVisit, setPlayVisit] = useState(null);
  const behaviorsOn = rosterEnabled() && !lowMotionMode;
  // §14: tier 1 runs only under the motion flag and never under reduced motion.
  const motionOn = meadowMotionEnabled() && !lowMotionMode;
  // Tier 3, first in the queue: stars from the last Flight Report arc into the
  // Nest — the one ceremony that is NOT tap-skippable (600ms is short enough).
  const [nestDrop, setNestDrop] = useState(null);
  useEffect(() => {
    const pending = state.pendingNestDrop || 0;
    if (!pending) return;
    if (!meadowMotionEnabled() || lowMotionMode) {
      // Reduced motion / flag off: still frame — the count is simply current.
      recordNestDropPlayed();
      onStateChange();
      return;
    }
    const sprites = Math.min(TIER3.starsIntoNest.spriteCap, pending);
    setNestDrop({ sprites, pending });
    // The count-up ends as the last diamond lands (§14).
    const landing = TIER3.starsIntoNest.perStarMs + sprites * TIER3.starsIntoNest.staggerMs;
    const t = setTimeout(() => {
      recordNestDropPlayed();
      setNestDrop(null);
      onStateChange();
    }, Math.max(landing, TIER3.nestCountUp.ms) + 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoneOffset = useCallback((zoneId) => -zoneIndex(zoneId) * width, [width]);
  // Rest stops: one per earned zone, plus one facing the hedge (so the sign is
  // readable at rest). Dragging past the hedge stop is the 40px rubber-band.
  const hedgePx = frontier ? HEDGE_W * scale : 0;
  const stops = useMemo(() => {
    const zoneStops = earned.map((z) => zoneOffset(z.id));
    return frontier ? [...zoneStops, -((earned.length - 1) * width + hedgePx)] : zoneStops;
  }, [earned, frontier, width, hedgePx, zoneOffset]);

  // Start on the saved zone, no animation.
  useEffect(() => {
    x.set(zoneOffset(activeZone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const panTo = useCallback(
    (zoneId, { duration = 0.6 } = {}) => {
      setActiveZone(zoneId);
      recordViewedZone(zoneId);
      animate(x, zoneOffset(zoneId), { duration: lowMotionMode ? 0 : duration, ease: "easeInOut" });
    },
    [x, zoneOffset, lowMotionMode]
  );

  // §05 zone-open ceremony — the only scene change, once per zone, ever:
  // pan back to the wall, the sign swings (400ms), the hedge parts (500ms),
  // the camera pans through (600ms), and the chip joins the rail. Guarded by
  // a ref so mid-ceremony renders never restart (or cancel) the timers.
  const openingRef = useRef(false);
  useEffect(() => {
    if (openingRef.current) return;
    // §14 queue: stars land in the Nest before the hedge opens.
    if (nestDrop) return;
    const pending = zonesAwaitingOpen(state);
    if (!pending.length) return;
    const zone = pending[0];
    if (lowMotionMode) {
      // Reduced motion: the still frame — the zone is simply open.
      recordZoneOpened(zone.id);
      onStateChange();
      return;
    }
    openingRef.current = true;
    setOpening(zone);
    const prevZone = ZONES[Math.max(0, zoneIndex(zone.id) - 1)];
    animate(x, zoneOffset(prevZone.id), { duration: 0.4, ease: "easeInOut" });
    const t1 = setTimeout(() => {
      // sign has swung, hedge has parted — pan through
      animate(x, zoneOffset(zone.id), { duration: 0.6, ease: "easeInOut" });
    }, 900);
    const t2 = setTimeout(() => {
      recordZoneOpened(zone.id);
      openingRef.current = false;
      setOpening(null);
      setActiveZone(zone.id);
      recordViewedZone(zone.id);
      onStateChange();
    }, 1600);
    return () => {
      // Cleanup fires on unmount or a state refresh; a completed ceremony's
      // timers are already spent, and an interrupted one must release the
      // guard so the next mount can replay it (nothing was recorded).
      clearTimeout(t1);
      clearTimeout(t2);
      openingRef.current = false;
    };
    // `opening` is deliberately NOT a dependency — it is render state for the
    // hedge, and re-running on it would cancel the ceremony mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, nestDrop, lowMotionMode]);

  const settle = useCallback(() => {
    // Release settles 240ms, snapping to whichever stop holds more screen.
    const cur = x.get();
    const nearest = stops.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a));
    const idx = Math.min(earned.length - 1, Math.max(0, Math.round(-nearest / width)));
    const zone = earned[idx] ?? ZONES[0];
    setActiveZone(zone.id);
    recordViewedZone(zone.id);
    animate(x, nearest, { duration: 0.24, ease: "easeOut" });
  }, [earned, stops, width, x]);

  const onBirdTap = useCallback(
    (bird, perch) => {
      clearTimeout(bubbleTimer.current);
      setTappedBird({ bird, perch });
      playBirdCall();
      // rise 160 + hold 900 + fade 200 (§14 call bubble)
      bubbleTimer.current = setTimeout(() => setTappedBird(null), 1260);
      // §14: a rare bird answers with its signature move instead of the hop.
      if (behaviorsOn && answersWithSignature(bird.speciesId) && !performing) {
        const rig = rigFor(bird.speciesId);
        if (rig) {
          setPerforming(bird.speciesId);
          setTimeout(() => setPerforming((cur) => (cur === bird.speciesId ? null : cur)), rig.duration * 1000);
        }
      }
      // §04: hop, call, THEN the guide entry slides in from the right.
      if (onBirdOpen) setTimeout(() => onBirdOpen(bird.speciesId), 600);
    },
    [onBirdOpen, behaviorsOn, performing]
  );
  useEffect(() => () => clearTimeout(bubbleTimer.current), []);

  // §09 schedulers — signatures 3–4×/session at ≥90s random intervals
  // (busier in a rare bird's own hour), play-spot visits every few minutes,
  // and the legendary set piece on its calm ~3-days-a-week cadence. Nothing
  // here demands attention; it simply happens whether or not anyone watches.
  useEffect(() => {
    if (!behaviorsOn) return;
    let cancelled = false;
    const timers = [];
    const signatureCounts = {};
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(id);
    };

    const scheduleSignature = () => {
      later(() => {
        const candidates = (state.birds || []).filter((b) => {
          const species = SPECIES_BY_ID[b.speciesId];
          return (
            rigFor(b.speciesId) &&
            !species.setPiece &&
            (signatureCounts[b.speciesId] || 0) < SIGNATURES_PER_SESSION
          );
        });
        if (candidates.length) {
          const boosted = candidates.filter((b) => inOwnHour(SPECIES_BY_ID[b.speciesId]));
          const pool = boosted.length ? boosted : candidates;
          const bird = pool[Math.floor(Math.random() * pool.length)];
          const rig = rigFor(bird.speciesId);
          signatureCounts[bird.speciesId] = (signatureCounts[bird.speciesId] || 0) + 1;
          setPerforming(bird.speciesId);
          later(() => setPerforming((cur) => (cur === bird.speciesId ? null : cur)), rig.duration * 1000);
        }
        scheduleSignature();
      }, nextSignatureDelay());
    };

    const schedulePlayVisit = () => {
      later(() => {
        const candidates = (state.birds || [])
          .map((b) => {
            const perch = PERCH_BY_ID[b.perchId];
            const species = SPECIES_BY_ID[b.speciesId];
            if (!perch || !species) return null;
            const kinds = playSpotKindsFor(species);
            const spots = PLAY_SPOTS.filter((s) => s.zone === perch.zone && kinds.includes(s.kind));
            return spots.length ? { bird: b, spot: spots[Math.floor(Math.random() * spots.length)] } : null;
          })
          .filter(Boolean);
        if (candidates.length) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          setPlayVisit({ speciesId: pick.bird.speciesId, spot: pick.spot });
          // Uses it for the spot's loop (plus the drift there and back), then home.
          later(() => setPlayVisit(null), pick.spot.seconds * 1000 + 2400);
        }
        schedulePlayVisit();
      }, nextPlayVisitDelay());
    };

    // Legendary set piece: a few times a week, a little while after arriving.
    for (const b of state.birds || []) {
      const species = SPECIES_BY_ID[b.speciesId];
      if (species?.setPiece && setPieceToday(species)) {
        later(() => {
          const rig = rigFor(b.speciesId);
          if (!rig) return;
          setPerforming(b.speciesId);
          later(() => setPerforming((cur) => (cur === b.speciesId ? null : cur)), rig.duration * 1000);
        }, 20_000 + Math.random() * 40_000);
      }
    }

    scheduleSignature();
    schedulePlayVisit();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [behaviorsOn, state]);

  // §07/§14 scene shift: when the entry sheet is open the scene slides left
  // only as far as needed to keep the tapped bird clear of it (max 180px),
  // and settles back to a stop on close.
  useEffect(() => {
    if (!sheetSpecies) return;
    const bird = (state.birds || []).find((b) => b.speciesId === sheetSpecies);
    const perch = bird && PERCH_BY_ID[bird.perchId];
    if (!perch) return;
    const sheetW = Math.min(560, width);
    const birdPx = (zoneIndex(perch.zone) * ZONE_W + perch.x) * scale + x.get();
    const clear = width - sheetW - 60;
    if (birdPx > clear) {
      animate(x, x.get() - Math.min(180, birdPx - clear), { duration: 0.3, ease: "easeInOut" });
    }
    return () => {
      const cur = x.get();
      const nearest = stops.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a));
      animate(x, nearest, { duration: 0.3, ease: "easeInOut" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetSpecies]);

  const stripWidth = earned.length * width + hedgePx;
  const dragBound = stops[stops.length - 1];

  // Manual 1:1 drag with pointer capture. Beyond a bound the scene follows at
  // one third of the finger, capped at the spec's 40px rubber-band; release
  // settles via `settle`.
  const dragState = useRef(null);
  const onPointerDown = (e) => {
    dragState.current = { startX: e.clientX, startVal: x.get() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragState.current;
    if (!d) return;
    let next = d.startVal + (e.clientX - d.startX);
    if (next > 0) next = Math.min(40, next * 0.3);
    if (next < dragBound) next = dragBound - Math.min(40, (dragBound - next) * 0.3);
    x.set(next);
  };
  const endDrag = () => {
    if (!dragState.current) return;
    dragState.current = null;
    settle();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[1024px] mx-auto overflow-hidden rounded-3xl bg-[#C9E8DF]" style={{ height }}>
      <motion.div
        className="absolute top-0 left-0 h-full"
        style={{ x, width: stripWidth, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <svg
          width={stripWidth}
          height={height}
          viewBox={`0 0 ${stripWidth / scale} ${ZONE_H}`}
          className="block"
        >
          {earned.map((zone) => (
            <g key={zone.id} transform={`translate(${zoneIndex(zone.id) * ZONE_W}, 0)`}>
              <ZoneBackdrop zoneId={zone.id} season={season} ambient={motionOn} />
              {zone.id === "meadow" && (
                <NestTree
                  balance={starBalance(state)}
                  countFrom={nestDrop ? starBalance(state) - nestDrop.pending : null}
                  countDelayMs={
                    nestDrop
                      ? Math.max(
                          0,
                          TIER3.starsIntoNest.perStarMs +
                            nestDrop.sprites * TIER3.starsIntoNest.staggerMs -
                            TIER3.nestCountUp.ms
                        )
                      : 0
                  }
                />
              )}
              {zone.id === "meadow" && state.egg && (
                <EggSprite
                  state={state}
                  onHatchStart={onEggTap}
                  lowMotionMode={lowMotionMode}
                  warmthFrom={nestDrop ? Math.max(0, (state.egg.warmthStars ?? 0) - nestDrop.pending) : null}
                  warmthDelayMs={nestDrop ? TIER3.starsIntoNest.perStarMs + nestDrop.sprites * TIER3.starsIntoNest.staggerMs : 0}
                />
              )}
              {zone.id === "meadow" &&
                nestDrop &&
                Array.from({ length: nestDrop.sprites }).map((_, i) => (
                  <motion.g
                    key={i}
                    initial={{ x: 330 + ((i % 7) - 3) * 46, y: -30, opacity: 1 }}
                    animate={{ x: 330 + ((i % 3) - 1) * 12, y: 252, opacity: [1, 1, 0] }}
                    transition={{
                      duration: TIER3.starsIntoNest.perStarMs / 1000,
                      delay: (i * TIER3.starsIntoNest.staggerMs) / 1000,
                      ease: "easeInOut",
                    }}
                  >
                    <rect x={-9} y={-9} width={18} height={18} rx={4} fill="#F26B3A" transform="rotate(45)" />
                  </motion.g>
                ))}
            </g>
          ))}
          {(state.birds || []).map((bird) => {
            const perch = PERCH_BY_ID[bird.perchId];
            if (!perch) return null;
            // §11: an away migrant's perch stays hers and stays empty.
            if (awayIds?.has(bird.speciesId) && departing?.speciesId !== bird.speciesId) return null;
            if (departing?.speciesId === bird.speciesId) {
              return (
                <DepartureFlight key={bird.speciesId} bird={bird} onDone={onDepartureDone} lowMotionMode={lowMotionMode} />
              );
            }
            if (arriving && bird.speciesId === arriving) {
              return (
                <ArrivingBird key={bird.speciesId} bird={bird} onDone={onArrivalDone} lowMotionMode={lowMotionMode} />
              );
            }
            return (
              <PerchedBird
                key={bird.speciesId}
                bird={bird}
                sceneOffsetX={zoneIndex(perch.zone) * ZONE_W}
                onTap={onBirdTap}
                tapped={tappedBird?.bird.speciesId === bird.speciesId}
                lowMotionMode={lowMotionMode}
                performingRig={performing === bird.speciesId ? rigFor(bird.speciesId) : null}
                playSpot={playVisit?.speciesId === bird.speciesId ? playVisit.spot : null}
                asleep={night && !AWAKE_AT_NIGHT.has(bird.speciesId)}
                idleBob={motionOn ? bird.bob : null}
              />
            );
          })}
          {tappedBird && (
            <NameBubble
              bird={tappedBird.bird}
              perch={tappedBird.perch}
              sceneOffsetX={zoneIndex(tappedBird.perch.zone) * ZONE_W}
              lowMotionMode={lowMotionMode}
            />
          )}
          {(frontier || opening) && (
            // Static translate on a plain <g> — framer-motion owns the
            // transform of motion elements and would clobber it. During the
            // once-ever opening, the hedge stands at the OPENING zone's edge
            // (overlapping the previous zone's right side, where the wall
            // stood) and carries that zone's sign; otherwise it walls off the
            // frontier past the last earned zone.
            <g
              transform={`translate(${
                opening ? zoneIndex(opening.id) * ZONE_W - HEDGE_W : earned.length * ZONE_W
              }, 0)`}
            >
              <Hedge
                nextZone={opening ?? frontier}
                remaining={opening ? 0 : Math.max(0, frontier.unlockAt - count)}
                width={HEDGE_W}
                opening={Boolean(opening)}
              />
            </g>
          )}
        </svg>
      </motion.div>

      {/* §12 night: a palette swap, not a redraw — Deep Teal over the scene. */}
      {night && (
        <div className="absolute inset-0 bg-[#0E3B34]/45 pointer-events-none" aria-hidden="true" />
      )}
      {season && !lowMotionMode && (
        <SeasonParticles kind={SEASON_TINTS[season]?.particle} height={height} />
      )}

      {/* Zone chips: only places you can go. An unearned zone has no chip. */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {earned.map((zone) => (
          <button
            key={zone.id}
            type="button"
            onClick={() => panTo(zone.id)}
            className={`text-[14px] font-display font-semibold rounded-full px-3.5 py-1.5 cursor-pointer transition-colors ${
              activeZone === zone.id ? "bg-white text-ink shadow-sm" : "bg-white/50 text-ink/70"
            }`}
          >
            {zone.name}
          </button>
        ))}
        <span className="hidden sm:inline text-[10px] font-brand-mono tracking-[0.08em] uppercase text-ink/50 ml-1">
          {earned.length} {earned.length === 1 ? "place" : "places"} you can visit
        </span>
      </div>
    </div>
  );
}
