import { useState } from "react";
import { motion } from "framer-motion";
import { digitKeyClass, PAD_BACKSPACE, PAD_GO } from "./kit";
import ConfettiBurst from "./ConfettiBurst.jsx";

/**
 * Ten frame — the canonical K-1 representation (MiF, EngageNY): a 2×5 grid a
 * child fills with counters. Two modes:
 *
 *  count  — the frame shows `filled` counters; the child answers a question
 *           about it (how many, how many empty, how many to make ten) on the
 *           digit pad. The frame is the picture, the pad is the answer.
 *  build  — `filled` counters are fixed (red); the child taps empty cells to
 *           add their own (blue) and submits. The submitted answer is HOW MANY
 *           THEY ADDED — "put in more to make 10" is answered by doing it.
 *
 * `frames: 2` renders two stacked frames for teen numbers (a ten and some
 * more), filling left-to-right, top row first, first frame first.
 */
export default function TenFrame({
  onSubmit,
  feedback,
  lowMotionMode,
  lowEndDevice,
  filled = 0,
  filledB = 0,
  frames = 1,
  mode = "count",
}) {
  const [entry, setEntry] = useState("");
  const [added, setAdded] = useState(() => new Set());
  const locked = feedback === "correct" || feedback === "wrong";
  // Two fixed counter colors let one frame show an addition: `filled` red
  // counters then `filledB` blue ones (5 + 3 is VISIBLE as five-and-three).
  const fixed = filled + filledB;

  const toggleCell = (i) => {
    if (locked || mode !== "build" || i < fixed) return;
    setAdded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const pressDigit = (d) => {
    if (!locked) setEntry((e) => (e.length < 2 ? e + d : e));
  };
  const submit = () => {
    if (locked) return;
    if (mode === "build") onSubmit(added.size);
    else if (entry !== "") onSubmit(Number(entry));
  };

  const counterTone = (i) =>
    i < filled
      ? "bg-rose-500 border-rose-600"
      : i < fixed
        ? "bg-sky-500 border-sky-600"
        : added.has(i)
          ? "bg-sky-500 border-sky-600"
          : "bg-transparent border-transparent";

  const frameEls = [];
  for (let f = 0; f < frames; f += 1) {
    frameEls.push(
      <div
        key={f}
        className="grid grid-cols-5 rounded-xl border-4 border-slate-400 bg-white/80 overflow-hidden"
        role="group"
        aria-label={`Ten frame ${f + 1}`}
      >
        {Array.from({ length: 10 }, (_, c) => {
          const i = f * 10 + c;
          const isFixed = i < fixed;
          const isAdded = added.has(i);
          return (
            <motion.button
              key={i}
              type="button"
              className="w-12 h-12 sm:w-14 sm:h-14 border border-slate-300 flex items-center justify-center cursor-pointer disabled:cursor-default"
              whileTap={mode === "build" && !isFixed && !locked ? { scale: 0.85 } : undefined}
              onClick={() => toggleCell(i)}
              disabled={locked || mode !== "build" || isFixed}
              aria-label={isFixed ? "counter" : isAdded ? "your counter" : "empty cell"}
              aria-pressed={mode === "build" ? isAdded : undefined}
            >
              {(isFixed || isAdded) && (
                <motion.span
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shadow-sm ${counterTone(i)}`}
                  initial={lowMotionMode ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: lowEndDevice ? 0.1 : 0.18 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  const ring =
    feedback === "correct" ? "ring-4 ring-teal" : feedback === "wrong" ? "ring-4 ring-ember" : "";

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Ten frame">
      <div className={`relative flex flex-col items-center gap-2 rounded-2xl p-2 ${ring}`}>
        {frameEls}
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>

      {mode === "build" ? (
        <motion.button
          className={`${PAD_GO} w-full`}
          whileHover={lowMotionMode ? undefined : { scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={submit}
          disabled={locked}
          aria-label="Submit answer"
        >
          Go
        </motion.button>
      ) : (
        <>
        <div
          className="relative w-full pad-display rounded-3xl bg-white shadow-[0_4px_0_#14231F0f] flex items-center justify-center font-display font-semibold text-4xl text-ink"
          aria-live="polite"
        >
          {entry === "" ? <span className="text-ink/30">—</span> : entry}
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
            whileTap={{ scale: 0.9 }}
            onClick={() => !locked && setEntry((e) => e.slice(0, -1))}
            disabled={locked}
            aria-label="Delete"
          >
            ⌫
          </motion.button>
          <motion.button
            className={digitKeyClass("0")}
            whileTap={{ scale: 0.9 }}
            onClick={() => pressDigit("0")}
            disabled={locked}
          >
            0
          </motion.button>
          <motion.button
            className={PAD_GO}
            whileTap={{ scale: 0.9 }}
            onClick={submit}
            disabled={locked || entry === ""}
            aria-label="Submit answer"
          >
            Go
          </motion.button>
        </div>
        </>
      )}
    </section>
  );
}
