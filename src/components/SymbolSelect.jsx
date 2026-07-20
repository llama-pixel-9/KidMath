import { motion } from "framer-motion";
import ConfettiBurst from "./ConfettiBurst.jsx";

const COMPARISON_SYMBOLS = ["<", "=", ">"];

export default function SymbolSelect({ onSubmit, feedback, revealAnswer, shakenChoice, theme, lowMotionMode, lowEndDevice }) {
  const locked = feedback === "correct" || feedback === "wrong";
  return (
    <section className="grid grid-cols-3 gap-3 w-full max-w-sm" aria-label="Comparison symbols">
      {COMPARISON_SYMBOLS.map((sym, i) => {
        const isCorrectChoice = feedback === "correct" && sym === revealAnswer;
        const isRevealedCorrect = feedback === "wrong" && sym === revealAnswer;
        const isWrong = shakenChoice === sym;
        return (
          <motion.button
            key={sym}
            className={`relative min-h-[80px] rounded-3xl bg-gradient-to-br ${theme.bubbleColors[i % theme.bubbleColors.length]} text-white text-4xl font-extrabold shadow-lg cursor-pointer select-none ${
              isCorrectChoice || isRevealedCorrect ? "ring-4 ring-green-400" : ""
            } ${isWrong ? "ring-4 ring-red-400" : ""}`}
            whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            animate={
              isWrong
                ? { x: lowEndDevice ? [0, -6, 6, 0] : [0, -10, 10, -10, 10, 0] }
                : isCorrectChoice
                  ? { scale: [1, 1.1, 1] }
                  : {}
            }
            transition={isWrong ? { duration: lowEndDevice ? 0.22 : 0.4 } : { duration: 0.3 }}
            onClick={() => onSubmit(sym)}
            disabled={locked}
            aria-label={sym === "<" ? "less than" : sym === ">" ? "greater than" : "equal to"}
          >
            {sym}
            {isCorrectChoice && !lowMotionMode && (
              <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
            )}
          </motion.button>
        );
      })}
    </section>
  );
}
