import { useState } from "react";
import { motion } from "framer-motion";
import {
  SUBMIT_BUTTON,
  feedbackRing,
  selectionClasses,
  isLocked,
  tapMotion,
  hoverMotion,
} from "./kit";
import { Figure } from "./kit/shapes.jsx";
import { SHAPE_META } from "./kit/shapeData.js";

/**
 * Draws plane figures. `linesShapes` could emit 10 questions in total and never
 * showed a picture — a geometry mode that never draws a shape is a weak
 * product, and property questions ("which is NOT a triangle") are unanswerable
 * without one (spec C3).
 *
 * Shapes are unit polygons in a 0..1 box, scaled at render. Irregular variants
 * matter: children who only ever see an equilateral triangle pointing up learn
 * the picture, not the property.
 */
/**
 * mode="count"   one figure, type a property (sides, lines of symmetry)
 * mode="select"  several figures, tap the one that answers the question
 */
export default function ShapeFigure({
  onSubmit,
  feedback,
  theme,
  lowMotionMode,
  shape,
  options = [],
  rotate = 0,
  showSymmetry = false,
  mode = "count",
}) {
  const [entry, setEntry] = useState("");
  const [picked, setPicked] = useState(null);
  const locked = isLocked(feedback);

  const submit = () => {
    if (locked) return;
    if (mode === "select") {
      if (picked !== null) onSubmit(options[picked]?.value ?? picked);
    } else if (entry !== "") {
      onSubmit(Number(entry));
    }
  };

  const canSubmit = mode === "select" ? picked !== null : entry !== "";

  return (
    <section className="flex flex-col items-center gap-4 w-full max-w-sm" aria-label="Shape">
      {mode === "select" ? (
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, i) => (
            <motion.button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => setPicked(i)}
              aria-pressed={picked === i}
              aria-label={SHAPE_META[opt.shape]?.name || "shape"}
              className={`p-2 rounded-2xl ${theme?.cardBg || "bg-white/80"} ${selectionClasses(picked === i, feedback)} cursor-pointer`}
              {...hoverMotion(lowMotionMode)}
              {...tapMotion(lowMotionMode)}
            >
              <Figure shape={opt.shape} rotate={opt.rotate || 0} size={72} />
            </motion.button>
          ))}
        </div>
      ) : (
        <>
          <div className={`p-4 rounded-3xl ${theme?.cardBg || "bg-white/80"} ${feedbackRing(feedback)}`}>
            <Figure shape={shape} rotate={rotate} showSymmetry={showSymmetry} size={120} />
          </div>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={entry}
            disabled={locked}
            onChange={(e) => setEntry(e.target.value.replace(/\D/g, "").slice(0, 2))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            aria-label="Your answer"
            placeholder="?"
            className={`w-24 text-center text-3xl font-extrabold rounded-2xl py-2 ${theme?.cardBg || "bg-white/80"} ${theme?.textPrimary || "text-slate-700"}`}
          />
        </>
      )}

      <motion.button
        type="button"
        className={SUBMIT_BUTTON}
        disabled={locked || !canSubmit}
        onClick={submit}
        {...tapMotion(lowMotionMode)}
      >
        Check
      </motion.button>
    </section>
  );
}
