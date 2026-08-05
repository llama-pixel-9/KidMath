/**
 * The four fixed 1024×588 zone scenes (§05) — flat sketch shapes on ONE shared
 * horizon, in the mock's palette. Scene art is placeholder composition (the
 * spec flags the illustration commission as the blocker); the furniture is
 * positioned to carry the named perches in perches.js, so finished art drops
 * in behind the same slots.
 */

import { useEffect, useRef, useState } from "react";
import { ZONE_W, ZONE_H, HORIZON_Y } from "../perches.js";

import { motion } from "framer-motion";
import { SEASON_TINTS } from "../seasons.js";
import { TIER1, TIER3 } from "./motionSpec.js";

const TRUNK = "#B08968";
const ROCK = "#9FBFB6";
const INK = "#14231F";

// §12: a season changes the canopy and ground tint (plus one particle and the
// store visitor) — nothing else. Birds and interface never retint.
const BASE_PALETTE = {
  sky: "#C9E8DF",
  farGrass: "#8ED0C0",
  ground: "#A7DED3",
  groundDeep: "#7FCFBE",
  canopy: "#6FC3B2",
  water: "#D6EEF2",
  frozen: false,
};

function paletteFor(season) {
  const tint = season && SEASON_TINTS[season];
  if (!tint) return BASE_PALETTE;
  return {
    ...BASE_PALETTE,
    sky: tint.sky,
    canopy: tint.canopy,
    ground: tint.ground,
    groundDeep: season === "winter" ? "#CBDDD6" : tint.canopy,
    farGrass: season === "winter" ? "#D8E5DF" : tint.ground,
    frozen: season === "winter",
  };
}

function Cloud({ x, y, s = 1, ambient = false, group = 0 }) {
  const drift = TIER1.cloudDrift;
  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`} opacity={0.85}>
      <motion.g
        animate={ambient ? { x: [-drift.driftPx, drift.driftPx] } : { x: 0 }}
        transition={
          ambient
            ? { duration: group ? drift.loopS * 0.8 : drift.loopS, repeat: Infinity, repeatType: "mirror", ease: drift.ease }
            : { duration: 0.2 }
        }
      >
        <ellipse cx={0} cy={0} rx={58} ry={20} fill="#FFFDF4" />
        <ellipse cx={38} cy={-8} rx={40} ry={16} fill="#FFFDF4" />
      </motion.g>
    </g>
  );
}

function Tree({ x = 330, canopyR = 96, trunkH = 120, p = BASE_PALETTE, ambient = false }) {
  const sway = TIER1.canopySway;
  return (
    <motion.g
      style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      animate={ambient ? { rotate: [-sway.degrees, sway.degrees] } : { rotate: 0 }}
      transition={ambient ? { duration: sway.loopS, repeat: Infinity, repeatType: "mirror", ease: sway.ease } : { duration: 0.2 }}
    >
      <rect x={x - 14} y={HORIZON_Y - trunkH} width={28} height={trunkH + 40} rx={8} fill={TRUNK} />
      <path d={`M ${x - 44} ${HORIZON_Y - trunkH + 8} l -52 -34`} stroke={TRUNK} strokeWidth={12} strokeLinecap="round" />
      <circle cx={x} cy={HORIZON_Y - trunkH - canopyR * 0.62} r={canopyR} fill={p.canopy} />
      <circle cx={x - canopyR * 0.72} cy={HORIZON_Y - trunkH - canopyR * 0.28} r={canopyR * 0.62} fill={p.canopy} />
      <circle cx={x + canopyR * 0.72} cy={HORIZON_Y - trunkH - canopyR * 0.3} r={canopyR * 0.58} fill={p.canopy} />
      {/* trunk hollow */}
      <ellipse cx={x} cy={HORIZON_Y - 16} rx={9} ry={12} fill="#8A6A50" />
    </motion.g>
  );
}

function FencePosts({ x = 892 }) {
  return (
    <g>
      <rect x={x - 8} y={HORIZON_Y + 20} width={16} height={54} rx={4} fill={TRUNK} />
      <rect x={x + 68} y={HORIZON_Y + 48} width={16} height={54} rx={4} fill={TRUNK} />
      <rect x={x - 12} y={HORIZON_Y + 34} width={100} height={8} rx={4} fill={TRUNK} opacity={0.8} />
    </g>
  );
}

function Reeds({ x = 700, y = 462, p = BASE_PALETTE, ambient = false }) {
  const sway = TIER1.grassSway;
  return (
    <motion.g
      stroke={p.groundDeep}
      strokeWidth={5}
      strokeLinecap="round"
      style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      animate={ambient ? { rotate: [-sway.degrees, sway.degrees] } : { rotate: 0 }}
      transition={ambient ? { duration: sway.loopS, repeat: Infinity, repeatType: "mirror", ease: sway.ease } : { duration: 0.2 }}
    >
      {[0, 14, 28, 96, 108].map((dx, i) => (
        <line key={i} x1={x + dx} y1={y + 34} x2={x + dx + (i % 2 ? -6 : 6)} y2={y - 26} />
      ))}
    </motion.g>
  );
}

function Log({ x = 566, y = 488 }) {
  return (
    <g>
      <rect x={x - 44} y={y - 12} width={88} height={24} rx={12} fill={TRUNK} />
      <circle cx={x + 44} cy={y} r={12} fill="#8A6A50" />
    </g>
  );
}

function NestBox({ x = 178, y = 336 }) {
  return (
    <g>
      <rect x={x - 3} y={y} width={6} height={HORIZON_Y + 30 - y} fill={TRUNK} />
      <rect x={x - 16} y={y - 30} width={32} height={32} rx={4} fill={TRUNK} />
      <circle cx={x} cy={y - 14} r={5} fill={INK} opacity={0.7} />
    </g>
  );
}

function Feeder({ x = 940, y = 372 }) {
  return (
    <g>
      <rect x={x - 3} y={y} width={6} height={HORIZON_Y + 40 - y} fill={TRUNK} />
      <path d={`M ${x - 26} ${y} h 52 l -8 -18 h -36 z`} fill="#F26B3A" />
    </g>
  );
}

function Pond({ x = 190, y = 512, rx = 150, ry = 40, p = BASE_PALETTE, ambient = false }) {
  const ripple = TIER1.pondRipple;
  const rippling = ambient && !p.frozen;
  return (
    <g>
      <motion.ellipse
        cx={x}
        cy={y}
        rx={rx}
        ry={ry}
        fill={p.frozen ? "#EAF4F6" : p.water}
        stroke={p.groundDeep}
        strokeWidth={2}
        style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
        animate={rippling ? { scaleX: ripple.scaleX, opacity: ripple.opacity } : { scaleX: 1, opacity: 1 }}
        transition={rippling ? { duration: ripple.loopS, repeat: Infinity, repeatType: "mirror", ease: ripple.ease } : { duration: 0.2 }}
      />
      {!p.frozen && (
        <>
          <line x1={x - rx * 0.4} y1={y - 6} x2={x - rx * 0.1} y2={y - 6} stroke={p.groundDeep} strokeWidth={2} opacity={0.6} />
          <line x1={x + rx * 0.1} y1={y + 8} x2={x + rx * 0.45} y2={y + 8} stroke={p.groundDeep} strokeWidth={2} opacity={0.6} />
        </>
      )}
    </g>
  );
}

function BathAndDust({ bathX = 540, bathY = 448, dustX = 730, dustY = 486, p = BASE_PALETTE }) {
  return (
    <g>
      <ellipse cx={bathX} cy={bathY} rx={26} ry={8} fill={p.frozen ? "#EAF4F6" : p.water} stroke={p.groundDeep} strokeWidth={2} />
      <rect x={bathX - 5} y={bathY} width={10} height={22} fill={ROCK} />
      <ellipse cx={dustX} cy={dustY} rx={34} ry={10} fill="#E8D5B5" opacity={0.9} />
    </g>
  );
}

/** Shared ground bands — identical in every zone so the horizon runs true. */
function Ground({ p = BASE_PALETTE }) {
  return (
    <g>
      <rect width={ZONE_W} height={ZONE_H} fill={p.sky} />
      <rect y={HORIZON_Y - 42} width={ZONE_W} height={70} fill={p.farGrass} />
      <path
        d={`M 0 ${HORIZON_Y + 10} q ${ZONE_W / 4} -18 ${ZONE_W / 2} 0 t ${ZONE_W / 2} 0 V ${ZONE_H} H 0 z`}
        fill={p.groundDeep}
      />
      <rect y={HORIZON_Y + 52} width={ZONE_W} height={ZONE_H - HORIZON_Y - 52} fill={p.ground} />
    </g>
  );
}

function MeadowBackdrop({ p = BASE_PALETTE, ambient = false }) {
  return (
    <g>
      <Cloud x={520} y={120} ambient={ambient} />
      <Cloud x={840} y={180} s={0.7} ambient={ambient} group={1} />
      <Tree p={p} ambient={ambient} />
      <NestBox />
      <FencePosts />
      <Reeds p={p} ambient={ambient} />
      <Log />
      <Pond p={p} ambient={ambient} x={150} y={520} rx={120} ry={32} />
      <Feeder />
      <BathAndDust p={p} />
    </g>
  );
}

function PondBackdrop({ p = BASE_PALETTE, ambient = false }) {
  return (
    <g>
      <Cloud x={300} y={140} s={0.8} ambient={ambient} />
      <Cloud x={760} y={100} ambient={ambient} group={1} />
      <Pond p={p} ambient={ambient} x={480} y={520} rx={330} ry={54} />
      <Tree p={p} ambient={ambient} x={356} canopyR={78} trunkH={104} />
      <NestBox x={204} y={344} />
      <FencePosts x={918} />
      <Reeds p={p} ambient={ambient} x={726} y={470} />
      <Log x={592} y={496} />
      <Feeder x={966} y={380} />
      <BathAndDust p={p} bathX={566} bathY={456} dustX={756} dustY={494} />
    </g>
  );
}

function WoodsBackdrop({ p = BASE_PALETTE, ambient = false }) {
  return (
    <g>
      <Cloud x={620} y={110} s={0.8} ambient={ambient} />
      <Tree p={p} ambient={ambient} x={312} canopyR={104} trunkH={128} />
      <Tree p={p} ambient={ambient} x={80} canopyR={64} trunkH={96} />
      <Tree p={p} ambient={ambient} x={760} canopyR={72} trunkH={110} />
      <NestBox x={160} y={340} />
      <FencePosts x={874} />
      <Reeds p={p} ambient={ambient} x={682} y={466} />
      <Log x={548} y={492} />
      <Pond p={p} ambient={ambient} x={130} y={516} rx={100} ry={28} />
      <Feeder x={922} y={376} />
      <BathAndDust p={p} bathX={522} bathY={452} dustX={712} dustY={490} />
    </g>
  );
}

function CliffsBackdrop({ p = BASE_PALETTE, ambient = false }) {
  return (
    <g>
      <Cloud x={200} y={90} ambient={ambient} />
      <Cloud x={700} y={150} s={0.6} ambient={ambient} group={1} />
      <path d={`M 0 ${HORIZON_Y - 30} L 90 170 L 200 ${HORIZON_Y - 20} z`} fill={ROCK} />
      <path d={`M 640 ${HORIZON_Y - 20} L 800 120 L 980 ${HORIZON_Y - 26} z`} fill={ROCK} />
      <Tree p={p} ambient={ambient} x={342} canopyR={80} trunkH={112} />
      <NestBox x={190} y={330} />
      <FencePosts x={904} />
      <Reeds p={p} ambient={ambient} x={712} y={456} />
      <Log x={578} y={482} />
      <Pond p={p} ambient={ambient} x={142} y={510} rx={110} ry={30} />
      <Feeder x={952} y={366} />
      <BathAndDust p={p} bathX={552} bathY={442} dustX={742} dustY={480} />
    </g>
  );
}

const BACKDROPS = {
  meadow: MeadowBackdrop,
  pond: PondBackdrop,
  woods: WoodsBackdrop,
  cliffs: CliffsBackdrop,
};

export function ZoneBackdrop({ zoneId, season, ambient = false }) {
  const Backdrop = BACKDROPS[zoneId] || MeadowBackdrop;
  const p = paletteFor(season);
  return (
    <g>
      <Ground p={p} />
      <Backdrop p={p} ambient={ambient} />
    </g>
  );
}

/**
 * The Nest (§04): the star balance drawn literally, hanging in the meadow
 * tree. The only interface element drawn as scenery, and it never moves.
 *
 * §14 nest count-up: when `countFrom` is given, the balance ticks up over
 * 800ms ease-out (after `countDelayMs` — the stars must land first) and the
 * Nest pulses 1→1.06→1 on the final number.
 */
export function NestTree({ balance, countFrom = null, countDelayMs = 0 }) {
  const [shown, setShown] = useState(() => countFrom ?? balance);
  const [pulse, setPulse] = useState(false);
  const rafRef = useRef(null);
  const counting = countFrom != null && countFrom !== balance;
  useEffect(() => {
    if (!counting) return;
    const startAt = performance.now() + countDelayMs;
    const duration = TIER3.nestCountUp.ms;
    const tick = (t) => {
      if (t < startAt) {
        setShown(countFrom);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const k = Math.min(1, (t - startAt) / duration);
      const eased = 1 - (1 - k) * (1 - k); // ease-out
      setShown(Math.round(countFrom + (balance - countFrom) * eased));
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
      else setPulse(true);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [counting, balance, countFrom, countDelayMs]);
  const display = counting ? shown : balance;

  const cx = 330;
  const cy = 262;
  return (
    <g aria-label={`${balance} stars in the Nest`}>
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
        animate={pulse ? { scale: TIER3.nestCountUp.scalePulse } : { scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onAnimationComplete={() => setPulse(false)}
      >
        <path d={`M ${cx - 56} ${cy} a 56 50 0 0 0 112 0 z`} fill="#FFFDF4" stroke={INK} strokeWidth={3} />
        {[-26, 0, 26].map((dx, i) => (
          <rect
            key={i}
            x={cx + dx - 9}
            y={cy + 8}
            width={18}
            height={18}
            rx={4}
            fill="#F26B3A"
            transform={`rotate(45 ${cx + dx} ${cy + 17})`}
          />
        ))}
        <g transform={`translate(${cx}, ${cy + 74})`}>
          <rect x={-34} y={-16} width={68} height={30} rx={15} fill="#FFFDF4" stroke="#14231F1a" strokeWidth={1.5} />
          <text textAnchor="middle" y={5} fontFamily="Fredoka, sans-serif" fontWeight={600} fontSize={17} fill={INK}>
            {display}
          </text>
          <text textAnchor="middle" y={30} fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={1.4} fill="#14231F99">
            THE NEST
          </text>
        </g>
      </motion.g>
    </g>
  );
}

/**
 * The hedge (§05): a hard stop with a sign. Nothing is rendered behind it —
 * it IS the end of the world until the next zone opens.
 *
 * §14 zone-open choreography, once per zone ever: the sign swings (400ms),
 * then the hedge PARTS — two halves drawing back like curtains (500ms) —
 * and the camera pans through (600ms, driven by the scene).
 */
function hedgeHalf() {
  return `M 0 84 q 30 -34 60 0 q 30 -34 60 0 q 15 -17 30 -8 V ${ZONE_H} H 0 z`;
}

export function Hedge({ nextZone, remaining, width = 300, opening = false }) {
  const swingMs = TIER3.zoneOpens.signSwingMs / 1000;
  const partMs = TIER3.zoneOpens.hedgePartMs / 1000;
  return (
    <g>
      {/* left half parts left, right half (mirrored) parts right */}
      <motion.g
        animate={opening ? { x: -width * 0.75, opacity: 0.6 } : { x: 0, opacity: 1 }}
        transition={{ duration: partMs, ease: "easeInOut", delay: opening ? swingMs : 0 }}
      >
        <path d={hedgeHalf()} fill="#3E9E8E" />
        <path d={`M 24 150 q 20 -22 40 0`} stroke="#2E7A6D" strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d={`M 70 320 q 20 -22 40 0`} stroke="#2E7A6D" strokeWidth={5} fill="none" strokeLinecap="round" />
      </motion.g>
      <motion.g
        animate={opening ? { x: width * 0.75, opacity: 0.6 } : { x: 0, opacity: 1 }}
        transition={{ duration: partMs, ease: "easeInOut", delay: opening ? swingMs : 0 }}
      >
        <g transform={`translate(${width}, 0) scale(-1, 1)`}>
          <path d={hedgeHalf()} fill="#3E9E8E" />
          <path d={`M 40 220 q 20 -22 40 0`} stroke="#2E7A6D" strokeWidth={5} fill="none" strokeLinecap="round" />
        </g>
      </motion.g>
      {nextZone && (
        <g transform={`translate(${width / 2 - 8}, 300)`}>
          <rect x={-4} y={0} width={8} height={130} fill={TRUNK} />
          {/* the sign swings around its post before the hedge parts */}
          <motion.g
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
            animate={opening ? { rotate: [0, -12, 68], opacity: [1, 1, 0] } : { rotate: 0, opacity: 1 }}
            transition={{ duration: swingMs, ease: "easeInOut" }}
          >
            <g transform="translate(0, -12)">
              <rect x={-92} y={-74} width={184} height={86} rx={12} fill="#FFFDF4" stroke={INK} strokeWidth={2.5} />
              <text textAnchor="middle" y={-46} fontFamily="Fredoka, sans-serif" fontWeight={600} fontSize={19} fill={INK}>
                {nextZone.name}
              </text>
              <text textAnchor="middle" y={-24} fontFamily="Nunito, sans-serif" fontWeight={700} fontSize={13} fill="#14231Fcc">
                opens at {nextZone.unlockAt} birds
              </text>
              {remaining > 0 && (
                <text textAnchor="middle" y={-6} fontFamily="Nunito, sans-serif" fontWeight={800} fontSize={13} fill="#C4471B">
                  {remaining} more to go
                </text>
              )}
            </g>
          </motion.g>
        </g>
      )}
    </g>
  );
}
