import { motion } from "framer-motion";
import ConfettiBurst from "./ConfettiBurst.jsx";
import { useAnswerKeys, KeyHint } from "./kit";

const COMPARISON_SYMBOLS = ["<", "=", ">"];

// Comparison keys (brand spec §08): fixed order < = > matching the number
// line, never shuffled. Two tints, not three — < and > share Seafoam (the
// same operation mirrored), = is Apricot, the odd one out. Colour is bound to
// position, never to meaning. Ink glyphs, never cream.
const KEY_TINTS = {
  "<": "bg-seafoam shadow-[0_5px_0_#7FCFBE] [--press-edge:#7FCFBE]",
  "=": "bg-apricot shadow-[0_5px_0_#F0A47A] [--press-edge:#F0A47A]",
  ">": "bg-seafoam shadow-[0_5px_0_#7FCFBE] [--press-edge:#7FCFBE]",
};

// Correct: the pressed key deepens one step on its own hue.
const KEY_DEEPENED = {
  "<": "bg-seafoam-deep",
  "=": "bg-apricot-deep",
  ">": "bg-seafoam-deep",
};

export default function SymbolSelect({ onSubmit, feedback, revealAnswer, shakenChoice, lowMotionMode, lowEndDevice }) {
  const locked = feedback === "correct" || feedback === "wrong";
  // Keyboard: the symbol itself (< = >, shift not needed: , and . work too)
  // or 1/2/3 by position.
  useAnswerKeys((e) => {
    const byKey = { "<": "<", ",": "<", "=": "=", ">": ">", ".": ">", 1: "<", 2: "=", 3: ">" }[e.key];
    if (!byKey) return false;
    onSubmit(byKey);
    return true;
  }, !locked);
  return (
    <section className="grid grid-cols-3 gap-3 w-full" aria-label="Comparison symbols">
      {COMPARISON_SYMBOLS.map((sym) => {
        const isCorrectChoice = feedback === "correct" && sym === revealAnswer;
        const isRevealedCorrect = feedback === "wrong" && sym === revealAnswer;
        const isWrong = shakenChoice === sym;
        const tint = isCorrectChoice ? KEY_DEEPENED[sym] : KEY_TINTS[sym];
        return (
          <motion.button
            key={sym}
            className={`relative min-h-[72px] rounded-2xl ${tint} btn-press text-ink text-4xl font-display font-semibold cursor-pointer select-none ${
              isRevealedCorrect ? "ring-4 ring-teal" : ""
            } ${isWrong ? "ring-4 ring-ember" : ""}`}
            animate={
              isWrong
                ? { x: lowEndDevice ? [0, -6, 6, 0] : [0, -6, 6, -6, 6, 0] }
                : isCorrectChoice
                  ? { scale: [1, 1.08, 1] }
                  : {}
            }
            transition={isWrong ? { duration: lowEndDevice ? 0.22 : 0.24 } : { duration: 0.32 }}
            onClick={() => onSubmit(sym)}
            disabled={locked}
            aria-label={sym === "<" ? "less than" : sym === ">" ? "greater than" : "equal to"}
          >
            {sym}
            <KeyHint k={sym} />
            {isCorrectChoice && !lowMotionMode && (
              <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
            )}
          </motion.button>
        );
      })}
    </section>
  );
}
