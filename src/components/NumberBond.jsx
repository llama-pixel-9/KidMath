import { useState } from "react";
import { motion } from "framer-motion";
import { digitKeyClass, PAD_BACKSPACE } from "./kit";
import ConfettiBurst from "./ConfettiBurst.jsx";

// Number-bond ("cherry") builder. Two shapes:
//  - missing PART (default): the whole and one part are shown; the child
//    fills the blank part ({whole, part} props).
//  - missing WHOLE: `parts` (2 or 3 known parts) is passed instead; the top
//    circle is the blank. The registry infers the shape from display.parts.
// Numeric answer through submitAnswer either way.
export default function NumberBond({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, whole, part, parts }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const pressDigit = (d) => {
    if (!locked) setEntry((e) => (e.length < 4 ? e + d : e));
  };
  const backspace = () => {
    if (!locked) setEntry((e) => e.slice(0, -1));
  };
  const submit = () => {
    if (!locked && entry !== "") onSubmit(Number(entry));
  };

  const slotTone =
    feedback === "correct"
      ? "ring-4 ring-teal text-deep-teal"
      : feedback === "wrong"
        ? "ring-4 ring-ember text-ember"
        : "ring-4 ring-teal text-teal";
  const circle = "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold shadow";
  const wholeMissing = Array.isArray(parts) && parts.length >= 2;
  const branchXs = wholeMissing && parts.length === 3 ? [22, 70, 118] : [30, 110];

  const entrySlot = (
    <div className={`${circle} ${theme.cardBg} ${slotTone}`}>
      {entry === "" ? "?" : entry}
      {feedback === "correct" && !lowMotionMode && (
        <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
      )}
    </div>
  );

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Number bond">
      <div className="relative flex flex-col items-center">
        {wholeMissing ? (
          entrySlot
        ) : (
          <div className={`${circle} ${theme.cardBg} ${theme.textPrimary}`}>{whole}</div>
        )}
        <svg width="140" height="34" className="my-1" aria-hidden="true">
          {(wholeMissing ? branchXs : [30, 110]).map((x) => (
            <line key={x} x1="70" y1="2" x2={x} y2="32" className="stroke-slate-300" strokeWidth="3" />
          ))}
        </svg>
        {wholeMissing ? (
          <div className={parts.length === 3 ? "flex gap-4" : "flex gap-10"}>
            {parts.map((p, i) => (
              <div key={i} className={`${circle} ${theme.cardBg} ${theme.textPrimary}`}>
                {p}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-10">
            <div className={`${circle} ${theme.cardBg} ${theme.textPrimary}`}>{part}</div>
            {entrySlot}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <motion.button
            key={d}
            className={digitKeyClass(d)}
            whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => pressDigit(d)}
            disabled={locked}
          >
            {d}
          </motion.button>
        ))}
        <motion.button
          className={PAD_BACKSPACE}
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={backspace}
          disabled={locked}
          aria-label="Delete"
        >
          ⌫
        </motion.button>
        <motion.button
          className={digitKeyClass("0")}
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
