import { motion } from "framer-motion";

// Shared digit pad used by the read-a-figure builders below (bar graph, angle).
export default function FigureDigitPad({ entry, onDigit, onBackspace, onSubmit, theme, lowMotionMode, locked }) {
  const keyClass = `relative pad-key rounded-2xl ${theme.cardBg} shadow-lg text-2xl font-extrabold ${theme.textPrimary} cursor-pointer select-none disabled:opacity-40`;
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <motion.button
          key={d}
          className={keyClass}
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onDigit(d)}
          disabled={locked}
        >
          {d}
        </motion.button>
      ))}
      <motion.button
        className={`${keyClass} text-xl`}
        whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBackspace}
        disabled={locked}
        aria-label="Delete"
      >
        ⌫
      </motion.button>
      <motion.button
        className={keyClass}
        whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onDigit("0")}
        disabled={locked}
      >
        0
      </motion.button>
      <motion.button
        className="relative pad-key rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 text-white text-xl font-extrabold shadow-lg cursor-pointer select-none disabled:opacity-40"
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
