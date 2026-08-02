import { useState } from "react";
import { motion } from "framer-motion";
import ConfettiBurst from "./ConfettiBurst.jsx";

const PLACE_LABEL = { 1000: "1000", 100: "100", 10: "10", 1: "1" };
const PLACE_COLOR = { 1000: "bg-violet-400", 100: "bg-sky-400", 10: "bg-emerald-400", 1: "bg-amber-400" };

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

  const keyClass = `relative min-h-[64px] rounded-2xl ${theme.cardBg} shadow-lg text-2xl font-extrabold ${theme.textPrimary} cursor-pointer select-none disabled:opacity-40`;
  const displayTone =
    feedback === "correct" ? "text-green-600" : feedback === "wrong" ? "text-red-500" : theme.textPrimary;

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
                  className={`w-7 h-7 rounded-full ${PLACE_COLOR[place]} text-white text-[10px] font-bold flex items-center justify-center shadow`}
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
          className="relative min-h-[64px] rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 text-white text-xl font-extrabold shadow-lg cursor-pointer select-none disabled:opacity-40"
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
