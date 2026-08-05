import { useState } from "react";
import ConfettiBurst from "./ConfettiBurst.jsx";
import FigureDigitPad from "./FigureDigitPad.jsx";

// Angle figure: two rays from a vertex at the given degree measure. The child
// types the measure. Numeric answer through submitAnswer.
export default function AngleFigure({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, degrees }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  // Vertex centered horizontally: the mode serves measures up to 180°, and a
  // left-edge vertex clipped every ray past ~90° outside the viewBox.
  const cx = 120;
  const cy = 120;
  const len = 100;
  const rad = ((degrees || 0) * Math.PI) / 180;
  const end = { x: cx + len * Math.cos(rad), y: cy - len * Math.sin(rad) };
  const tone = feedback === "correct" ? "text-deep-teal" : feedback === "wrong" ? "text-ember" : theme.textPrimary;
  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Angle figure">
      <div className="relative">
        <svg width="240" height="140" viewBox="0 0 240 140" role="img" aria-label={`angle of ${degrees} degrees`}>
          <line x1={cx} y1={cy} x2={cx + len} y2={cy} className="stroke-slate-600" strokeWidth="4" strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={end.x} y2={end.y} className="stroke-sky-500" strokeWidth="4" strokeLinecap="round" />
          <path
            d={`M ${cx + 26} ${cy} A 26 26 0 0 0 ${cx + 26 * Math.cos(rad)} ${cy - 26 * Math.sin(rad)}`}
            className="fill-none stroke-amber-400"
            strokeWidth="3"
          />
          <circle cx={cx} cy={cy} r="4" className="fill-slate-600" />
        </svg>
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>
      <div className={`min-h-[36px] text-3xl font-extrabold ${tone}`} aria-live="polite">
        {entry === "" ? <span className={theme.textMuted}>—</span> : `${entry}°`}
      </div>
      <FigureDigitPad
        entry={entry}
        onDigit={(d) => !locked && setEntry((e) => (e.length < 3 ? e + d : e))}
        onBackspace={() => !locked && setEntry((e) => e.slice(0, -1))}
        onSubmit={() => !locked && entry !== "" && onSubmit(Number(entry))}
        theme={theme}
        lowMotionMode={lowMotionMode}
        locked={locked}
      />
    </section>
  );
}

// Comparison-symbol picker (<, =, >). Reports the chosen symbol through the
// shared submitAnswer path; feedback affordances mirror the bubble grid.
