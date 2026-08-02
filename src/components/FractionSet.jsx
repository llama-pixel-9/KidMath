import { useState } from "react";
import { motion } from "framer-motion";
import ConfettiBurst from "./ConfettiBurst.jsx";

// Fraction-of-a-set: the total is shown as objects split into `den` equal
// groups; the child finds how many are in `num` of those groups. Numeric answer.
export default function FractionSet({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, set }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const pressDigit = (d) => {
    if (!locked) setEntry((e) => (e.length < 5 ? e + d : e));
  };
  const backspace = () => {
    if (!locked) setEntry((e) => e.slice(0, -1));
  };
  const submit = () => {
    if (!locked && entry !== "") onSubmit(Number(entry));
  };

  const total = set?.total || 0;
  const den = set?.den || 1;
  const num = set?.num || 0;
  const perGroup = den > 0 ? total / den : 0;
  const keyClass = `relative min-h-[64px] rounded-2xl ${theme.cardBg} shadow-lg text-2xl font-extrabold ${theme.textPrimary} cursor-pointer select-none disabled:opacity-40`;
  const displayTone =
    feedback === "correct" ? "text-deep-teal" : feedback === "wrong" ? "text-ember" : theme.textPrimary;

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Fraction of a set">
      <div className="relative w-full flex flex-wrap justify-center gap-2">
        {Array.from({ length: den }, (_, g) => (
          <div key={g} className={`flex flex-wrap gap-1 p-2 rounded-xl ${theme.cardBg} shadow-inner`} style={{ maxWidth: "46%" }}>
            {Array.from({ length: perGroup }, (_, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full ${g < num ? "bg-lime-500" : "bg-slate-300"}`}
              />
            ))}
          </div>
        ))}
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>
      <div className={`text-sm font-bold ${theme.textSecondary}`}>
        {num}/{den} of {total} — green groups
      </div>
      <div className={`min-h-[36px] text-3xl font-extrabold ${displayTone}`} aria-live="polite">
        {entry === "" ? <span className={theme.textMuted}>—</span> : entry}
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
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
          className={`${keyClass} text-xl`}
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
        <motion.button
          className="relative min-h-[64px] rounded-[18px] bg-teal text-cream text-xl font-display font-semibold shadow-[0_5px_0_#064A41] btn-press cursor-pointer select-none disabled:opacity-40"
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={submit}
          disabled={locked || entry === ""}
          aria-label="Submit answer"
        >
          Go
        </motion.button>
      </div>
    </section>
  );
}

// Place-value disc chart. Reads discs in thousands/hundreds/tens/ones columns;
// the child types the number. Numeric answer through submitAnswer.
