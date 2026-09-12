import { useState } from "react";
import ConfettiBurst from "./ConfettiBurst.jsx";
import { digitKeyClass, PAD_BACKSPACE, PAD_GO, useDigitKeys } from "./kit";

// Typed numeric answer control. It reports its value through the same
// `onSubmit` -> submitAnswer -> checkAnswer path as a tapped bubble, so the
// answer lock, telemetry, mistake bank, and correct/wrong feedback are
// identical to multiple choice (plan §6b). Remounted per question (key) so the
// entry resets. Key styling comes from the kit's shared digit-pad vocabulary
// (§08) so this pad matches every other widget's.

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

  useDigitKeys({
    locked,
    onDigit: pressDigit,
    onBackspace: backspace,
    onSubmit: submit,
    onDot: allowDecimal ? pressDot : undefined,
  });

  const displayTone =
    feedback === "correct"
      ? "ring-4 ring-teal text-deep-teal"
      : feedback === "wrong"
        ? "ring-4 ring-ember text-ember"
        : "text-ink";

  const goBtn = (
    <button
      className={`${PAD_GO} w-full`}
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
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            className={digitKeyClass(d)}
            onClick={() => pressDigit(d)}
            disabled={locked}
          >
            {d}
          </button>
        ))}
        <button
          className={PAD_BACKSPACE}
          onClick={backspace}
          disabled={locked}
          aria-label="Delete"
        >
          ⌫
        </button>
        <button className={digitKeyClass("0")} onClick={() => pressDigit("0")} disabled={locked}>
          0
        </button>
        {allowDecimal ? (
          <button
            className={digitKeyClass("0")}
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
