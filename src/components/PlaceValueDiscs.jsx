import { useState } from "react";
import { motion } from "framer-motion";
import { digitKeyClass, PAD_BACKSPACE } from "./kit";
import ConfettiBurst from "./ConfettiBurst.jsx";

const PLACE_LABEL = { 1000: "1000", 100: "100", 10: "10", 1: "1" };
// One tile tint per place, ink labels (brand rule: never a colored label on a tint).
const PLACE_COLOR = { 1000: "bg-apricot", 100: "bg-seafoam", 10: "bg-teal-mid", 1: "bg-sun-light" };

export default function PlaceValueDiscs({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, cols }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const pressDigit = (d) => {
    if (!locked) setEntry((e) => (e.length < 7 ? e + d : e));
  };
  const backspace = () => {
    if (!locked) setEntry((e) => e.slice(0, -1));
  };
  const submit = () => {
    if (!locked && entry !== "") onSubmit(Number(entry));
  };

  const displayTone =
    feedback === "correct" ? "text-deep-teal" : feedback === "wrong" ? "text-ember" : theme.textPrimary;

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Place value discs">
      <div className="relative w-full flex justify-center gap-2">
        {(cols || []).map(({ place, count }) => (
          <div key={place} className={`flex flex-col items-center gap-1 rounded-xl ${theme.cardBg} p-2 shadow-inner`}>
            <span className={`text-xs font-bold ${theme.textSecondary}`}>{PLACE_LABEL[place]}</span>
            <div className="flex flex-col-reverse gap-1 min-h-[80px] justify-start">
              {Array.from({ length: count }, (_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full ${PLACE_COLOR[place]} text-ink text-[10px] font-bold flex items-center justify-center shadow`}
                >
                  {PLACE_LABEL[place]}
                </div>
              ))}
            </div>
          </div>
        ))}
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>
      <div className={`min-h-[40px] text-3xl font-extrabold ${displayTone}`} aria-live="polite">
        {entry === "" ? <span className={theme.textMuted}>—</span> : entry}
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
