import { useState } from "react";
import BarChart from "./BarChart.jsx";
import ConfettiBurst from "./ConfettiBurst.jsx";
import FigureDigitPad from "./FigureDigitPad.jsx";

// Bar-graph reader: draws a scaled bar chart; the child types a value read from
// it. Numeric answer through submitAnswer.
export default function DataGraph({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, bars }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const tone = feedback === "correct" ? "text-green-600" : feedback === "wrong" ? "text-red-500" : theme.textPrimary;
  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Bar graph">
      <div className="relative w-full">
        {/* Values appear only once the answer is settled: until then the child
            reads the bar against the axis, which is the point of the item. */}
        <BarChart bars={bars} theme={theme} showValues={locked} />
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
