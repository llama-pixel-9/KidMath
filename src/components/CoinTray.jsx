import { useState } from "react";
import { motion } from "framer-motion";
import {
  SUBMIT_BUTTON,
  feedbackRing,
  isLocked,
  tapMotion,
  hoverMotion,
  useIndexKeys,
  KeyHint,
} from "./kit";
import { COINS } from "./kit/coins.js";
import NumberPad from "./NumberPad.jsx";


// mm -> px. 1.3 keeps the smallest coin (a dime, 46px) above the 44px minimum
// touch target while a full 15-coin tray still fits in three rows.
const SCALE = 1.3;

function Coin({ coin, selected, onClick, locked, lowMotionMode, hint }) {
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
      className={`relative rounded-full disabled:cursor-default cursor-pointer select-none ${
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
      {hint && <KeyHint k={hint} />}
    </motion.button>
  );
}

/**
 * Tap coins to build or count an amount. `coins` is the tray contents, e.g.
 * ["quarter", "dime", "dime", "penny"]. Answer is the total in cents.
 *
 * mode="count"  — the tray is fixed; the child totals it and enters the answer
 *   on the app's own keypad (the same NumberPad the number items use), so a
 *   phone never has to open its system keyboard.
 * mode="build"  — the child taps coins to reach a target; total is the answer.
 *   With `requiredCount`, Check stays off until exactly that many coins are
 *   picked, so "6 coins worth 51¢" cannot be answered with two quarters.
 */
export default function CoinTray({
  onSubmit,
  feedback,
  theme,
  lowMotionMode,
  coins = [],
  mode = "count",
  targetCents = null,
  requiredCount = null,
}) {
  const [selected, setSelected] = useState([]);
  const locked = isLocked(feedback);

  const toggle = (i) => {
    if (locked) return;
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  };

  const selectedTotal = selected.reduce((sum, i) => sum + COINS[coins[i]].value, 0);
  const needCount = mode === "build" && Number.isInteger(requiredCount) && requiredCount > 0;
  const canSubmit = !needCount || selected.length === requiredCount;

  const submit = () => {
    if (locked || !canSubmit) return;
    onSubmit(selectedTotal);
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
            hint={mode === "build" && i < 10 ? (i === 9 ? "0" : String(i + 1)) : null}
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
          {needCount && (
            <p
              className={`text-sm font-bold ${selected.length === requiredCount ? "text-deep-teal" : theme?.textMuted || "text-slate-500"}`}
              aria-live="polite"
              data-qa="coin-count"
            >
              {selected.length} of {requiredCount} coins
            </p>
          )}
          {feedback === "wrong" && targetCents != null && selectedTotal !== targetCents && (
            <p className="text-sm font-bold text-ember">
              {selectedTotal < targetCents
                ? `${targetCents - selectedTotal}¢ short`
                : `${selectedTotal - targetCents}¢ too much`}
            </p>
          )}
        </div>
      ) : (
        <NumberPad onSubmit={onSubmit} feedback={feedback} theme={theme || {}} lowMotionMode={lowMotionMode} />
      )}

      {mode === "build" && (
        <button type="button" className={SUBMIT_BUTTON} disabled={locked || !canSubmit} onClick={submit}>
          Check
        </button>
      )}
      {mode === "build" && <BuildKeys locked={locked} count={coins.length} toggle={toggle} submit={submit} />}
    </section>
  );
}

/**
 * Build mode's keys: 1-9 and 0 toggle the first ten coins, Enter checks. Only
 * the most recently mounted key handler hears keys, and a parent's handler
 * mounts after its children's, so the tray must not register one in count
 * mode or it would sit above the keypad and swallow its digits. Hence a child
 * that only renders in build mode.
 */
function BuildKeys({ locked, count, toggle, submit }) {
  useIndexKeys({ locked, count, onIndex: toggle, onSubmit: submit });
  return null;
}
