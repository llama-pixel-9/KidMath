import { useState } from "react";
import { motion } from "framer-motion";
import { digitKeyClass, PAD_BACKSPACE, useDigitKeys } from "./kit";
import ConfettiBurst from "./ConfettiBurst.jsx";
import { clockHand } from "./clockHand.js";

export default function AnalogClock({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, hour, minute }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const pressDigit = (d) => {
    if (!locked) setEntry((e) => (e.length < 2 ? e + d : e));
  };
  const backspace = () => {
    if (!locked) setEntry((e) => e.slice(0, -1));
  };
  const submit = () => {
    if (!locked && entry !== "") onSubmit(Number(entry));
  };

  const cx = 80;
  const cy = 80;
  const minuteAngle = (minute || 0) * 6;
  const hourAngle = (((hour || 12) % 12) + (minute || 0) / 60) * 30;
  const mh = clockHand(cx, cy, 58, minuteAngle);
  const hh = clockHand(cx, cy, 40, hourAngle);
  const displayTone =
    feedback === "correct" ? "text-deep-teal" : feedback === "wrong" ? "text-ember" : theme.textPrimary;

  useDigitKeys({ locked, onDigit: pressDigit, onBackspace: backspace, onSubmit: submit });

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Clock">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={`clock showing ${hour}:${String(minute).padStart(2, "0")}`}>
          <circle cx={cx} cy={cy} r="70" className="fill-white stroke-slate-300" strokeWidth="4" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = clockHand(cx, cy, 62, i * 30);
            return <circle key={i} cx={a.x2} cy={a.y2} r="2.5" className="fill-slate-400" />;
          })}
          <line x1={cx} y1={cy} x2={hh.x2} y2={hh.y2} className="stroke-slate-700" strokeWidth="5" strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={mh.x2} y2={mh.y2} className="stroke-sky-500" strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" className="fill-slate-700" />
        </svg>
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>
      <div className={`min-h-[36px] text-3xl font-extrabold ${displayTone}`} aria-live="polite">
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
          className="relative min-h-[60px] rounded-[18px] bg-teal text-cream text-xl font-display font-semibold shadow-[0_5px_0_#064A41] btn-press cursor-pointer select-none disabled:opacity-40"
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
