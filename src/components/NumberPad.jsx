import { useState } from "react";
import { motion } from "framer-motion";
import ConfettiBurst from "./ConfettiBurst.jsx";

// Typed numeric answer control. It reports its value through the same
// `onSubmit` -> submitAnswer -> checkAnswer path as a tapped bubble, so the
// answer lock, telemetry, mistake bank, and correct/wrong feedback are
// identical to multiple choice (plan §6b). Remounted per question (key) so the
// entry resets.
export default function NumberPad({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, allowDecimal = false }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const pressDigit = (d) => {
    if (!locked) setEntry((e) => (e.length < 8 ? e + d : e));
  };
  const pressDot = () => {
    if (!locked) setEntry((e) => (e.includes(".") || e.length >= 7 ? e : e === "" ? "0." : e + "."));
  };
  const backspace = () => {
    if (!locked) setEntry((e) => e.slice(0, -1));
  };
  const submit = () => {
    if (!locked && entry !== "" && entry !== ".") onSubmit(Number(entry));
  };

  const displayTone =
    feedback === "correct"
      ? "ring-4 ring-green-400 text-green-600"
      : feedback === "wrong"
        ? "ring-4 ring-red-400 text-red-500"
        : theme.textPrimary;

  const keyClass = `relative pad-key rounded-2xl ${theme.cardBg} shadow-lg text-3xl font-extrabold ${theme.textPrimary} cursor-pointer select-none disabled:opacity-40`;
  const goClass =
    "relative pad-key rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 text-white text-2xl font-extrabold shadow-lg cursor-pointer select-none disabled:opacity-40";
  const goBtn = (
    <motion.button
      className={goClass}
      whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      onClick={submit}
      disabled={locked || entry === "" || entry === "."}
      aria-label="Submit answer"
    >
      Go
    </motion.button>
  );

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Number entry">
      <div
        className={`relative w-full pad-display rounded-3xl ${theme.cardBg} shadow-inner flex items-center justify-center text-4xl font-extrabold ${displayTone}`}
        aria-live="polite"
      >
        {entry === "" ? <span className={theme.textMuted}>—</span> : entry}
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <motion.button
            key={d}
            className={keyClass}
            whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => pressDigit(d)}
            disabled={locked}
          >
            {d}
          </motion.button>
        ))}
        <motion.button
          className={`${keyClass} text-2xl`}
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={backspace}
          disabled={locked}
          aria-label="Delete"
        >
          ⌫
        </motion.button>
        <motion.button
          className={keyClass}
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => pressDigit("0")}
          disabled={locked}
        >
          0
        </motion.button>
        {allowDecimal ? (
          <motion.button
            className={keyClass}
            whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={pressDot}
            disabled={locked}
            aria-label="Decimal point"
          >
            .
          </motion.button>
        ) : (
          goBtn
        )}
      </div>
      {allowDecimal && <div className="w-full">{goBtn}</div>}
    </section>
  );
}
