import { useState } from "react";
import ConfettiBurst from "./ConfettiBurst.jsx";

// Typed numeric answer control. It reports its value through the same
// `onSubmit` -> submitAnswer -> checkAnswer path as a tapped bubble, so the
// answer lock, telemetry, mistake bank, and correct/wrong feedback are
// identical to multiple choice (plan §6b). Remounted per question (key) so the
// entry resets.
//
// Brand spec §08: keypad digits carry the four answer tints one per row
// (Seafoam 1-3, Teal Mid 4-6, Apricot 7-9, Sun Light 0) so a typed answer
// feels like the tiles. Backspace is solid Sun with an Ink glyph, Go is solid
// Lark Teal with a Cream label. Labels are always Ink — never cream on a tint.
const ROW_TINTS = [
  "bg-seafoam shadow-[0_4px_0_#7FCFBE] [--press-edge:#7FCFBE]",
  "bg-teal-mid shadow-[0_4px_0_#3E9E8E] [--press-edge:#3E9E8E]",
  "bg-apricot shadow-[0_4px_0_#F0A47A] [--press-edge:#F0A47A]",
  "bg-sun-light shadow-[0_4px_0_#E8895A] [--press-edge:#E8895A]",
];

export default function NumberPad({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, allowDecimal = false }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const pressDigit = (d) => {
    if (!locked) setEntry((e) => (e.length < 8 ? e + d : e));
  };
  const pressDot = () => {
    if (!locked) setEntry((e) => (e.includes(".") || e.length >= 7 ? e : e === "" ? "0." : e + "."));
  };
  const backspace = () => {
    if (!locked) setEntry((e) => e.slice(0, -1));
  };
  const submit = () => {
    if (!locked && entry !== "" && entry !== ".") onSubmit(Number(entry));
  };

  const displayTone =
    feedback === "correct"
      ? "ring-4 ring-teal text-deep-teal"
      : feedback === "wrong"
        ? "ring-4 ring-ember text-ember"
        : "text-ink";

  const keyBase =
    "relative pad-key rounded-[18px] font-display font-semibold text-3xl text-ink btn-press cursor-pointer select-none disabled:opacity-40";
  const keyClass = (row) => `${keyBase} ${ROW_TINTS[row]}`;
  const goBtn = (
    <button
      className="relative pad-key w-full rounded-[18px] bg-teal text-cream font-display font-semibold text-2xl shadow-[0_4px_0_#064A41] btn-press cursor-pointer select-none disabled:opacity-40"
      onClick={submit}
      disabled={locked || entry === "" || entry === "."}
      aria-label="Submit answer"
    >
      Go
    </button>
  );

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Number entry">
      <div
        className={`relative w-full pad-display rounded-3xl bg-white shadow-[0_4px_0_#14231F0f] flex items-center justify-center font-display font-semibold text-4xl ${displayTone}`}
        aria-live="polite"
      >
        {entry === "" ? <span className={theme.textMuted}>—</span> : entry}
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d, i) => (
          <button
            key={d}
            className={keyClass(Math.floor(i / 3))}
            onClick={() => pressDigit(d)}
            disabled={locked}
          >
            {d}
          </button>
        ))}
        <button
          className="relative pad-key rounded-[18px] bg-sun shadow-[0_4px_0_#C4471B] [--press-edge:#C4471B] font-display font-semibold text-2xl text-ink btn-press cursor-pointer select-none disabled:opacity-40"
          onClick={backspace}
          disabled={locked}
          aria-label="Delete"
        >
          ⌫
        </button>
        <button className={keyClass(3)} onClick={() => pressDigit("0")} disabled={locked}>
          0
        </button>
        {allowDecimal ? (
          <button
            className={keyClass(3)}
            onClick={pressDot}
            disabled={locked}
            aria-label="Decimal point"
          >
            .
          </button>
        ) : (
          goBtn
        )}
      </div>
      {allowDecimal && <div className="w-full">{goBtn}</div>}
    </section>
  );
}
