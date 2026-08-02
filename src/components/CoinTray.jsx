import { useState } from "react";
import { motion } from "framer-motion";
import {
  SUBMIT_BUTTON,
  feedbackRing,
  isLocked,
  tapMotion,
  hoverMotion,
} from "./kit";
import { COINS } from "./kit/coins.js";


const SCALE = 1.15; // mm -> px, sized for a young child's fingertip

function Coin({ coin, selected, onClick, locked, lowMotionMode }) {
  const spec = COINS[coin];
  const size = spec.r * SCALE;
  return (
    <motion.button
      type="button"
      disabled={locked}
      onClick={onClick}
      aria-label={`${spec.name}, ${spec.label}`}
      aria-pressed={selected}
      className="rounded-full disabled:cursor-default cursor-pointer select-none"
      style={{ width: size * 2, height: size * 2 }}
      {...hoverMotion(lowMotionMode)}
      {...tapMotion(lowMotionMode)}
      animate={selected ? { y: -6 } : { y: 0 }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" role="presentation">
        <circle cx="50" cy="50" r="46" fill={spec.edge} />
        <circle cx="50" cy="50" r="41" fill={spec.fill} />
        {/* milled edge: quarters and dimes are reeded, pennies and nickels are not */}
        {(coin === "quarter" || coin === "dime") &&
          Array.from({ length: 28 }, (_, i) => {
            const a = (i / 28) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={50 + Math.cos(a) * 42}
                y1={50 + Math.sin(a) * 42}
                x2={50 + Math.cos(a) * 46}
                y2={50 + Math.sin(a) * 46}
                stroke={spec.edge}
                strokeWidth="2.5"
              />
            );
          })}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="30"
          fontWeight="800"
          fill={spec.text}
        >
          {spec.label}
        </text>
        {selected && <circle cx="50" cy="50" r="46" fill="none" stroke="#0ea5e9" strokeWidth="6" />}
      </svg>
    </motion.button>
  );
}

/**
 * Tap coins to build or count an amount. `coins` is the tray contents, e.g.
 * ["quarter", "dime", "dime", "penny"]. Answer is the total in cents.
 *
 * mode="count"  — the tray is fixed; the child totals it and types the answer.
 * mode="build"  — the child taps coins to reach a target; total is the answer.
 */
export default function CoinTray({
  onSubmit,
  feedback,
  theme,
  lowMotionMode,
  coins = [],
  mode = "count",
}) {
  const [selected, setSelected] = useState([]);
  const [entry, setEntry] = useState("");
  const locked = isLocked(feedback);

  const toggle = (i) => {
    if (locked) return;
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  };

  const selectedTotal = selected.reduce((sum, i) => sum + COINS[coins[i]].value, 0);
  const canSubmit = mode === "build" ? selected.length > 0 : entry !== "";

  const submit = () => {
    if (locked || !canSubmit) return;
    onSubmit(mode === "build" ? selectedTotal : Number(entry));
  };

  return (
    <section className="flex flex-col items-center gap-4 w-full" aria-label="Coins">
      <div
        className={`flex flex-wrap items-center justify-center gap-2 p-4 rounded-3xl w-full ${theme?.cardBg || "bg-white/80"} ${feedbackRing(feedback)}`}
      >
        {coins.map((coin, i) => (
          <Coin
            key={i}
            coin={coin}
            selected={selected.includes(i)}
            onClick={() => toggle(i)}
            locked={locked}
            lowMotionMode={lowMotionMode}
          />
        ))}
      </div>

      {mode === "build" ? (
        <p className={`text-2xl font-extrabold ${theme?.textPrimary || "text-slate-700"}`}>
          {selectedTotal}¢
        </p>
      ) : (
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={entry}
          disabled={locked}
          onChange={(e) => setEntry(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          aria-label="Total in cents"
          placeholder="?"
          className={`w-32 text-center text-3xl font-extrabold rounded-2xl py-2 ${theme?.cardBg || "bg-white/80"} ${theme?.textPrimary || "text-slate-700"} ${feedbackRing(feedback)}`}
        />
      )}

      <button type="button" className={SUBMIT_BUTTON} disabled={locked || !canSubmit} onClick={submit}>
        Check
      </button>
    </section>
  );
}
