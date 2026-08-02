import { useState } from "react";
import { motion } from "framer-motion";
import ConfettiBurst from "./ConfettiBurst.jsx";

// Bar-model builder (part-whole or comparison). The bar segments are drawn to
// scale so the relationship is visible; the child taps digits for the missing
// amount. Numeric answer through submitAnswer.
export default function BarModel({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, spec }) {
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

  const seg = "h-12 flex items-center justify-center text-lg font-extrabold text-white overflow-hidden";
  const unknown = entry === "" ? "?" : entry;
  const keyClass = `relative min-h-[64px] rounded-2xl ${theme.cardBg} shadow-lg text-2xl font-extrabold ${theme.textPrimary} cursor-pointer select-none disabled:opacity-40`;

  let diagram;
  if (spec?.type === "barCompare") {
    const total = spec.a + spec.diff;
    diagram = (
      <div className="w-full flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-6 text-sm font-bold ${theme.textSecondary}`}>A</span>
          <div className="flex-1 rounded-lg overflow-hidden">
            <div className={`${seg} bg-sky-400 rounded-lg`} style={{ width: `${(spec.a / total) * 100}%` }}>
              {spec.a}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-6 text-sm font-bold ${theme.textSecondary}`}>B</span>
          <div className="flex-1 flex rounded-lg overflow-hidden">
            <div className={`${seg} bg-sky-400`} style={{ width: `${(spec.a / total) * 100}%` }}>
              {spec.a}
            </div>
            <div className={`${seg} bg-amber-400`} style={{ width: `${(spec.diff / total) * 100}%` }}>
              {spec.diff}
            </div>
          </div>
        </div>
        <div className={`text-center text-sm font-bold ${theme.textSecondary}`}>B = {unknown}</div>
      </div>
    );
  } else {
    const whole = spec?.whole || 1;
    const part = spec?.part || 0;
    diagram = (
      <div className="w-full flex flex-col gap-2">
        <div className={`text-center text-sm font-bold ${theme.textSecondary}`}>Whole = {whole}</div>
        <div className="flex rounded-lg overflow-hidden">
          <div className={`${seg} bg-sky-400`} style={{ width: `${(part / whole) * 100}%` }}>
            {part}
          </div>
          <div className={`${seg} bg-amber-400`} style={{ width: `${((whole - part) / whole) * 100}%` }}>
            {unknown}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Bar model">
      <div
        className={`relative w-full ${
          feedback === "correct" ? "text-deep-teal" : feedback === "wrong" ? "text-ember" : ""
        }`}
        aria-live="polite"
      >
        {diagram}
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
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
