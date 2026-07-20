import { useState } from "react";
import { motion } from "framer-motion";
import ConfettiBurst from "./ConfettiBurst.jsx";

// Fraction entry: tap the numerator or denominator to select it, then use the
// digit pad. Submits { num, den } through the shared submitAnswer path.
export default function FractionInput({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice }) {
  const [num, setNum] = useState("");
  const [den, setDen] = useState("");
  const [active, setActive] = useState("num");
  const locked = feedback === "correct" || feedback === "wrong";
  const set = active === "num" ? setNum : setDen;
  const cur = active === "num" ? num : den;
  const pressDigit = (d) => {
    if (!locked && cur.length < 4) set((v) => v + d);
  };
  const backspace = () => {
    if (!locked) set((v) => v.slice(0, -1));
  };
  const submit = () => {
    if (!locked && num !== "" && den !== "" && Number(den) !== 0) {
      onSubmit({ num: Number(num), den: Number(den) });
    }
  };

  const tone =
    feedback === "correct"
      ? "ring-4 ring-green-400 text-green-600"
      : feedback === "wrong"
        ? "ring-4 ring-red-400 text-red-500"
        : theme.textPrimary;
  const fieldClass = (field) =>
    `min-w-[72px] min-h-[56px] px-4 rounded-xl text-3xl font-extrabold flex items-center justify-center cursor-pointer select-none ${
      active === field ? "ring-4 ring-sky-400" : "ring-2 ring-transparent"
    }`;
  const keyClass = `relative min-h-[72px] rounded-2xl ${theme.cardBg} shadow-lg text-3xl font-extrabold ${theme.textPrimary} cursor-pointer select-none disabled:opacity-40`;

  return (
    <section className="w-full max-w-sm flex flex-col items-center gap-3" aria-label="Fraction entry">
      <div
        className={`relative flex flex-col items-center ${tone}`}
        aria-live="polite"
      >
        <button className={fieldClass("num")} onClick={() => !locked && setActive("num")} aria-label="Numerator">
          {num === "" ? <span className={theme.textMuted}>—</span> : num}
        </button>
        <div className="w-24 h-1 my-1 rounded bg-current" />
        <button className={fieldClass("den")} onClick={() => !locked && setActive("den")} aria-label="Denominator">
          {den === "" ? <span className={theme.textMuted}>—</span> : den}
        </button>
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
        <motion.button
          className="relative min-h-[72px] rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 text-white text-2xl font-extrabold shadow-lg cursor-pointer select-none disabled:opacity-40"
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={submit}
          disabled={locked || num === "" || den === ""}
          aria-label="Submit answer"
        >
          Go
        </motion.button>
      </div>
    </section>
  );
}
