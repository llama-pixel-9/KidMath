import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPECIES_BY_ID } from "../roster.js";
import { PERCH_BY_ID, zoneIndex, ZONE_W } from "../perches.js";
import { eggWarmthPercent, eggReady } from "../flock.js";
import { EGG_WARMTH_TARGET } from "../engagementStore.js";
import { TIER3 } from "./motionSpec.js";
import { playSoftTap, playBirdCall } from "../../sounds.js";
import BirdSprite from "./BirdSprite.jsx";

/**
 * §10 eggs + hatching and §11 the leaving. The hatch is the longest ceremony
 * in the app and the only place a kid names anything; the departure is the
 * only moment the app removes something a child earned, so it is a goodbye
 * with a promise. Closing the app mid-hatch loses nothing — the egg persists
 * as "ready" and the ceremony restarts from beat 1.
 */

// The egg sits on the grass at the horizon line (§04), warming as the kid
// flies: a warmth ring, crack lines drawn at 25/50/75%, a slow glow at 100%.
export function EggSprite({ state, x = 460, y = 512, onHatchStart, lowMotionMode, warmthFrom = null, warmthDelayMs = 0 }) {
  const pct = eggWarmthPercent(state);
  const ready = eggReady(state);
  const species = SPECIES_BY_ID[state.egg?.speciesId];
  if (!state.egg || !species) return null;
  const ringR = 34;
  const circumference = 2 * Math.PI * ringR;
  // §14 "egg warms": on arriving with fresh stars the ring fills to the new
  // value over 700ms, and any crack crossed in that fill draws on with a
  // shiver. Static otherwise (and always static under reduced motion).
  const fromPct =
    warmthFrom != null && !lowMotionMode
      ? Math.min(100, Math.round((warmthFrom / EGG_WARMTH_TARGET) * 100))
      : null;
  const filling = fromPct != null && fromPct < pct;
  const crackAnim = (threshold) =>
    filling && fromPct < threshold
      ? {
          initial: { pathLength: 0, x: 0 },
          animate: { pathLength: 1, x: [0, -3, 3, 0] },
          transition: {
            pathLength: { duration: TIER3.eggWarms.crackDrawMs / 1000, delay: (warmthDelayMs + TIER3.eggWarms.ms) / 1000 },
            x: { duration: 0.3, delay: (warmthDelayMs + TIER3.eggWarms.ms) / 1000 },
          },
        }
      : { initial: false, animate: { pathLength: 1, x: 0 } };
  return (
    <g
      role={ready ? "button" : undefined}
      aria-label={
        ready ? `The ${species.name} egg is ready — tap to hatch` : `${species.name} egg · warm ${pct}%`
      }
      onClick={ready ? onHatchStart : undefined}
      style={ready ? { cursor: "pointer" } : undefined}
    >
      {ready && !lowMotionMode && (
        <motion.ellipse
          cx={x}
          cy={y - 20}
          rx={30}
          ry={36}
          fill="#F26B3A"
          animate={{ opacity: [0.12, 0.3, 0.12] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <ellipse cx={x} cy={y - 18} rx={20} ry={26} fill="#FFFDF4" stroke="#14231F" strokeWidth={2} />
      {pct >= 25 && (
        <motion.path d={`M ${x - 8} ${y - 30} l 5 6 l -4 5`} fill="none" stroke="#14231F" strokeWidth={1.5} {...crackAnim(25)} />
      )}
      {pct >= 50 && (
        <motion.path d={`M ${x + 7} ${y - 24} l -4 6 l 5 5`} fill="none" stroke="#14231F" strokeWidth={1.5} {...crackAnim(50)} />
      )}
      {pct >= 75 && (
        <motion.path d={`M ${x - 2} ${y - 12} l 5 4 l -3 5`} fill="none" stroke="#14231F" strokeWidth={1.5} {...crackAnim(75)} />
      )}
      {!ready && (
        <g transform={`translate(${x}, ${y - 18}) rotate(-90)`}>
          <circle r={ringR} fill="none" stroke="#14231F1a" strokeWidth={4} />
          <motion.circle
            r={ringR}
            fill="none"
            stroke="#F26B3A"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={filling ? { strokeDashoffset: circumference * (1 - fromPct / 100) } : false}
            animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
            transition={
              filling
                ? { duration: TIER3.eggWarms.ms / 1000, ease: "easeOut", delay: warmthDelayMs / 1000 }
                : { duration: 0 }
            }
          />
        </g>
      )}
      <text
        x={x}
        y={y + 30}
        textAnchor="middle"
        fontFamily="Nunito, sans-serif"
        fontWeight={700}
        fontSize={12}
        fill="#14231F"
      >
        {ready ? "The egg is ready" : `${species.name.split(" ").pop()} egg · warm ${pct}%`}
      </text>
      {!ready && (
        <text x={x} y={y + 46} textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight={600} fontSize={11} fill="#14231F99">
          Keep flying to keep it warm
        </text>
      )}
    </g>
  );
}

/**
 * The hatch, beats 1–4 (§10): rock + crack (skippable), the chick with the
 * scene dimmed to 30% (skippable), then the naming — which waits for the kid,
 * accepts anything, and keeps pre-readers moving with suggestion chips.
 * Beat 5 (first flight) plays in the scene after this resolves.
 */
export function HatchingCeremony({ speciesId, onNamed, lowMotionMode }) {
  const species = SPECIES_BY_ID[speciesId];
  const [beat, setBeat] = useState(lowMotionMode ? 3 : 2);
  const [name, setName] = useState("");

  useEffect(() => {
    if (beat === 2) {
      playSoftTap();
      const t = setTimeout(() => {
        playSoftTap();
        setBeat(3);
      }, 1500);
      return () => clearTimeout(t);
    }
    if (beat === 3) {
      const t = setTimeout(() => setBeat(4), lowMotionMode ? 300 : 1500);
      return () => clearTimeout(t);
    }
  }, [beat, lowMotionMode]);

  const skippable = beat === 2 || beat === 3;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(20, 35, 31, 0.7)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: lowMotionMode ? 0.12 : 0.2 }}
      onClick={skippable ? () => setBeat(4) : undefined}
    >
      <div className="bg-white rounded-3xl shadow-[0_8px_0_#14231F14] p-8 mx-4 max-w-sm w-full text-center">
        {beat === 2 && (
          <>
            <motion.div
              className="mx-auto w-24 h-32 relative"
              animate={lowMotionMode ? {} : { rotate: [0, -6, 6, -6, 6, 0] }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 96 128" className="w-full h-full">
                <ellipse cx={48} cy={72} rx={38} ry={50} fill="#FFFDF4" stroke="#14231F" strokeWidth={3} />
                <motion.path
                  d="M 30 48 l 12 10 l -8 10 l 14 8"
                  fill="none"
                  stroke="#14231F"
                  strokeWidth={2.5}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                />
                <motion.path
                  d="M 66 42 l -10 12 l 9 9"
                  fill="none"
                  stroke="#14231F"
                  strokeWidth={2.5}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.8 }}
                />
              </svg>
            </motion.div>
            <p className="mt-4 text-xl font-display font-semibold text-ink">It rocks, then cracks…</p>
          </>
        )}
        {beat === 3 && (
          <>
            <motion.div
              className="mx-auto"
              initial={lowMotionMode ? {} : { scale: 0.4, y: 10 }}
              animate={{ scale: 0.6, y: 0, rotate: [0, -4, 4, 0] }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <svg width="200" height="150" viewBox="-100 -135 200 150">
                <BirdSprite speciesId={speciesId} x={0} y={0} depth={1.4} label={`${species.name} chick`} />
              </svg>
            </motion.div>
            <p className="mt-2 text-xl font-display font-semibold text-ink">The chick!</p>
          </>
        )}
        {beat === 4 && (
          <>
            <svg width="140" height="110" viewBox="-70 -100 140 110" className="mx-auto">
              <BirdSprite speciesId={speciesId} x={0} y={0} depth={1.0} label={`${species.name} chick`} />
            </svg>
            <h2 className="text-2xl font-display font-semibold text-ink mt-2">
              You name {species.pronoun === "she" ? "her" : "him"}
            </h2>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {species.presetNames.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`text-[14px] font-display font-semibold rounded-full px-3.5 py-1.5 cursor-pointer ${
                    name === n ? "bg-teal text-cream" : "bg-seafoam text-ink"
                  }`}
                  onClick={() => setName(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              className="mt-3 w-full border-b-2 border-teal bg-transparent text-center text-lg font-bold text-ink outline-none"
              placeholder="…or type a name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="mt-5 w-full h-14 bg-teal text-cream text-xl font-display font-semibold rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer disabled:opacity-40"
              disabled={!name.trim()}
              onClick={() => {
                playBirdCall();
                onNamed(name.trim());
              }}
            >
              First flight
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/**
 * §11: one gentle prompt on the morning a visitor goes. "Later today"
 * genuinely defers — until the kid watches or the next day comes. No
 * countdowns, no missed-event screen, ever.
 */
export function DeparturePrompt({ speciesId, birdLabel, onWatch, onLater }) {
  const species = SPECIES_BY_ID[speciesId];
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-[0_8px_0_#14231F14] p-8 mx-4 max-w-sm w-full text-center"
        initial={{ scale: 0.7, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        <svg width="140" height="110" viewBox="-70 -100 140 110" className="mx-auto">
          <BirdSprite speciesId={speciesId} x={0} y={0} depth={1.0} label={species.name} />
        </svg>
        <h2 className="text-2xl font-display font-semibold text-ink mt-2">
          {birdLabel} is leaving today
        </h2>
        <p className="mt-2 text-[15px] font-semibold text-ink/80">
          {species.pronoun === "she" ? "She" : "He"} flies south for the {species.seasons?.[0] === "winter" ? "summer" : "winter"} and
          comes back every year. Come and see {species.pronoun === "she" ? "her" : "him"} off?
        </p>
        <button
          type="button"
          className="mt-5 w-full h-14 bg-teal text-cream text-xl font-display font-semibold rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
          onClick={onWatch}
        >
          Come and see {species.pronoun === "she" ? "her" : "him"} off
        </button>
        <button type="button" className="mt-3 text-[15px] font-semibold text-ink/80 cursor-pointer" onClick={onLater}>
          Later today
        </button>
      </motion.div>
    </motion.div>
  );
}

/**
 * §11 the circle and the V (3000ms): lift off, one circle of the zone so the
 * kid can follow, then join a V of silhouettes crossing the sky.
 */
export function DepartureFlight({ bird, onDone, lowMotionMode }) {
  const perch = PERCH_BY_ID[bird.perchId];
  useEffect(() => {
    const t = setTimeout(onDone, lowMotionMode ? 400 : 3200);
    return () => clearTimeout(t);
  }, [onDone, lowMotionMode]);
  if (!perch) return null;
  const offset = zoneIndex(perch.zone) * ZONE_W;
  return (
    <g>
      <motion.g
        initial={{ x: 0, y: 0, opacity: 1 }}
        animate={
          lowMotionMode
            ? { opacity: 0 }
            : {
                x: [0, 180, 60, -120, 0, 300, 700],
                y: [0, -120, -220, -160, -240, -320, -420],
                opacity: [1, 1, 1, 1, 1, 0.9, 0],
              }
        }
        transition={{ duration: lowMotionMode ? 0.4 : 3, ease: "easeInOut" }}
      >
        <BirdSprite speciesId={bird.speciesId} x={perch.x + offset} y={perch.y} depth={1} label="" />
      </motion.g>
      {!lowMotionMode && (
        <motion.g
          initial={{ x: -300, y: 0, opacity: 0 }}
          animate={{ x: 900, y: -60, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3, ease: "linear" }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              transform={`translate(${offset + 100 + i * 34}, ${90 + Math.abs(i - 2) * 18})`}
              d="M -8 0 Q 0 -6 8 0 Q 0 -2 -8 0"
              fill="#14231F"
              opacity={0.6}
            />
          ))}
        </motion.g>
      )}
    </g>
  );
}
