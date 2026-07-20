import { useState } from "react";
import ConfettiBurst from "./ConfettiBurst.jsx";
import FigureDigitPad from "./FigureDigitPad.jsx";

// Bar-graph reader: draws a scaled bar chart; the child types a value read from
// it. Numeric answer through submitAnswer.
export default function DataGraph({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, bars }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const max = Math.max(1, ...(bars || []).map((b) => b.value));
  const tone = feedback === "correct" ? "text-green-600" : feedback === "wrong" ? "text-red-500" : theme.textPrimary;
  return (
    <section className="w-full max-w-sm flex flex-col items-center gap-3" aria-label="Bar graph">
      <div className="relative w-full flex items-end justify-center gap-3 h-40 px-2">
        {(bars || []).map((b) => (
          <div key={b.label} className="flex flex-col items-center justify-end gap-1 flex-1">
            <span className={`text-xs font-bold ${theme.textSecondary}`}>{b.value}</span>
            <div
              className="w-full max-w-[40px] rounded-t-md bg-sky-400"
              style={{ height: `${(b.value / max) * 110 + 6}px` }}
            />
            <span className={`text-[10px] font-bold ${theme.textSecondary} text-center`}>{b.label}</span>
          </div>
        ))}
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>
      <div className={`min-h-[36px] text-3xl font-extrabold ${tone}`} aria-live="polite">
        {entry === "" ? <span className={theme.textMuted}>—</span> : entry}
      </div>
      <FigureDigitPad
        entry={entry}
        onDigit={(d) => !locked && setEntry((e) => (e.length < 4 ? e + d : e))}
        onBackspace={() => !locked && setEntry((e) => e.slice(0, -1))}
        onSubmit={() => !locked && entry !== "" && onSubmit(Number(entry))}
        theme={theme}
        lowMotionMode={lowMotionMode}
        locked={locked}
      />
    </section>
  );
}
