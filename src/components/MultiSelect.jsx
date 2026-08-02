import { useState } from "react";
import { motion } from "framer-motion";
import {
  SUBMIT_BUTTON,
  selectionClasses,
  isLocked,
  tapMotion,
  hoverMotion,
} from "./kit";

/**
 * Pick every option that satisfies the prompt.
 *
 * This is the cheapest widget with the widest reach: it unlocks Both Addends
 * Unknown ("how many in the red vase and how many in the blue?"), "show three
 * ways to make 8", "pick every expression equal to 12", fraction ordering and
 * the Open Middle rows — varieties across five modes that were unshippable
 * while the engine compared a single `answer` value.
 *
 * Scoring lives in mathEngine.checkAnswer (`multiSelect`): every required value
 * must be chosen and nothing extra, so selecting everything is wrong.
 */
export default function MultiSelect({
  onSubmit,
  feedback,
  theme,
  lowMotionMode,
  options = [],
  requiredCount = null,
}) {
  const [selected, setSelected] = useState([]);
  const locked = isLocked(feedback);

  const toggle = (value) => {
    if (locked) return;
    setSelected((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));
  };

  // When the prompt names how many to pick ("choose 2"), enforce it before
  // submission rather than marking a half-finished answer wrong.
  const countSatisfied = requiredCount === null || selected.length === requiredCount;
  const canSubmit = selected.length > 0 && countSatisfied;

  const submit = () => {
    if (!locked && canSubmit) onSubmit(selected);
  };

  return (
    <section className="flex flex-col items-center gap-4 w-full" aria-label="Choose all that apply">
      <div className="grid grid-cols-2 gap-3 w-full">
        {options.map((opt) => {
          const value = typeof opt === "object" ? opt.value : opt;
          const label = typeof opt === "object" ? opt.label : String(opt);
          const on = selected.includes(value);
          return (
            <motion.button
              key={String(value)}
              type="button"
              disabled={locked}
              onClick={() => toggle(value)}
              aria-pressed={on}
              className={`min-h-[72px] rounded-3xl text-2xl font-extrabold shadow-md cursor-pointer select-none
                ${on ? "bg-seafoam text-ink" : `${theme?.cardBg || "bg-white"} ${theme?.textPrimary || "text-ink"}`}
                ${selectionClasses(on, feedback)}`}
              {...hoverMotion(lowMotionMode)}
              {...tapMotion(lowMotionMode)}
            >
              {label}
            </motion.button>
          );
        })}
      </div>

      <p className={`text-lg font-bold ${theme?.textSecondary || "text-slate-500"}`}>
        {requiredCount !== null
          ? `Chosen ${selected.length} of ${requiredCount}`
          : selected.length === 0
            ? "Tap all that apply"
            : `Chosen ${selected.length}`}
      </p>

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
