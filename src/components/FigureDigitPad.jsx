import { motion } from "framer-motion";
import { digitKeyClass, PAD_BACKSPACE, useDigitKeys } from "./kit";

// Shared digit pad used by the read-a-figure builders below (bar graph, angle).
export default function FigureDigitPad({ entry, onDigit, onBackspace, onSubmit, lowMotionMode, locked }) {
  useDigitKeys({
    locked,
    onDigit,
    onBackspace,
    onSubmit: () => entry !== "" && onSubmit(),
  });
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <motion.button
          key={d}
          className={digitKeyClass(d)}
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onDigit(d)}
          disabled={locked}
        >
          {d}
        </motion.button>
      ))}
      <motion.button
        className={PAD_BACKSPACE}
        whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBackspace}
        disabled={locked}
        aria-label="Delete"
      >
        ⌫
      </motion.button>
      <motion.button
        className={digitKeyClass("0")}
        whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onDigit("0")}
        disabled={locked}
      >
        0
      </motion.button>
      <motion.button
        className="relative pad-key rounded-[18px] bg-teal text-cream text-xl font-display font-semibold shadow-[0_5px_0_#064A41] btn-press cursor-pointer select-none disabled:opacity-40"
        whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={onSubmit}
        disabled={locked || entry === ""}
        aria-label="Submit answer"
      >
        Go
      </motion.button>
    </div>
  );
}
