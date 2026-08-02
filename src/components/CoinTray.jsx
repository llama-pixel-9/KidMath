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


// mm -> px. 1.3 keeps the smallest coin (a dime, 46px) above the 44px minimum
// touch target while a full 15-coin tray still fits in three rows.
const SCALE = 1.3;

function Coin({ coin, selected, onClick, locked, lowMotionMode }) {
  const spec = COINS[coin];
  const size = spec.r * 2 * SCALE;
  return (
    <motion.button
      type="button"
      disabled={locked}
      onClick={onClick}
      // The face carries no value, so the label is the only thing a screen
      // reader has to go on.
      aria-label={`${spec.name}, ${spec.label}`}
      aria-pressed={selected}
      className={`rounded-full disabled:cursor-default cursor-pointer select-none ${
        selected ? "ring-4 ring-teal" : ""
      }`}
      style={{ width: size, height: size }}
      {...hoverMotion(lowMotionMode)}
      {...tapMotion(lowMotionMode)}
      animate={selected ? { y: -6 } : { y: 0 }}
    >
      <img
        src={spec.src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        decoding="async"
        className="w-full h-full rounded-full pointer-events-none"
        // Lifts the coin off the tray so overlapping rims stay readable.
        style={{ filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.28))" }}
      />
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
  targetCents = null,
}) {
  const [selected, setSelected] = useState([]);
  const [entry, setEntry] = useState("");
  const locked = isLocked(feedback);

  const toggle = (i) => {
    if (locked) return;
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  };

  const selectedTotal = selected.reduce((sum, i) => sum + COINS[coins[i]].value, 0);
  const canSubmit = mode === "build" ? true : entry !== "";

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
        <div className="flex flex-col items-center gap-1">
          {/* Running total (§18): Fredoka, updates on every tap — the
              feedback loop is the lesson. Deep Teal once correct. */}
          <motion.p
            className={`text-[34px] leading-none font-display font-semibold ${
              feedback === "correct" ? "text-deep-teal" : "text-ink"
            }`}
            animate={feedback === "wrong" && !lowMotionMode ? { x: [0, -6, 6, -6, 6, 0] } : {}}
            transition={{ duration: 0.24 }}
            aria-live="polite"
          >
            {selectedTotal}¢
          </motion.p>
          {feedback === "wrong" && targetCents != null && selectedTotal !== targetCents && (
            <p className="text-sm font-bold text-ember">
              {selectedTotal < targetCents
                ? `${targetCents - selectedTotal}¢ short`
                : `${selectedTotal - targetCents}¢ too much`}
            </p>
          )}
        </div>
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
