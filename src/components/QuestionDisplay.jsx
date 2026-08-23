import { motion } from "framer-motion";
import { isVerbalPrompt } from "../modes/helpers";
import { emojiPromptLines } from "../promptLayout";
import { FIGURE_COLORS } from "./kit";
import { useTheme } from "../useTheme";
import { getFigure } from "./figureRegistry.js";

// The question card's content — prompt, figure, sub-prompt, vertical layouts —
// exactly as the session shows it. Extracted from MathExplorer so the admin
// review preview renders the same component, not a second drawing of it.

function AnswerSlot({ feedback, revealAnswer }) {
  if (feedback === "correct" && revealAnswer != null) {
    return (
      <motion.span
        className="text-teal"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: [0, 1.4, 1], rotate: 0 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
      >
        {revealAnswer}
      </motion.span>
    );
  }
  if (feedback === "wrong" && revealAnswer != null) {
    return (
      <motion.span
        className="text-teal"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {revealAnswer}
      </motion.span>
    );
  }
  return <span className="text-sun">?</span>;
}

// The worked-algorithm layout with a STATED result — used by judgment items
// whose claim ("2 + 19 = 21") must be shown complete, never as "?".
function VerticalEquation({ a, op, b, result, theme }) {
  const aDigits = String(a).split("");
  const bDigits = String(b).split("");
  const rDigits = String(result).split("");
  const cols = Math.max(aDigits.length, bDigits.length, rDigits.length) + 1;
  return (
    <div className="flex justify-center">
      <div
        className={`inline-grid items-center justify-items-center font-extrabold ${theme.textPrimary}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, 0.75em)`,
          fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
          lineHeight: 1.4,
        }}
      >
        {Array.from({ length: cols - aDigits.length }, (_, i) => <span key={`pa${i}`} />)}
        {aDigits.map((d, i) => <span key={`a${i}`}>{d}</span>)}
        <span className="text-[0.85em]">{op}</span>
        {Array.from({ length: cols - bDigits.length - 1 }, (_, i) => <span key={`pb${i}`} />)}
        {bDigits.map((d, i) => <span key={`b${i}`}>{d}</span>)}
        <span className="border-b-4 border-ink/40 w-full my-1" style={{ gridColumn: "1 / -1" }} />
        {Array.from({ length: cols - rDigits.length }, (_, i) => <span key={`pr${i}`} />)}
        {rDigits.map((d, i) => (
          <span key={`r${i}`} className="text-teal">{d}</span>
        ))}
      </div>
    </div>
  );
}

// A counting sequence ("12, 11, 10, __") shown ON a number line, so the
// pattern is a walk along positions rather than a list to decode (#32). Only
// unit steps get one — skip-counting jumps would need arc arrows to read
// honestly, and patterns mode sequences aren't positional at all.
function SequenceNumberLine({ sequence, step, answer, feedback }) {
  if (
    Math.abs(step ?? 0) !== 1 ||
    !Array.isArray(sequence) ||
    !sequence.every((n) => Number.isInteger(n)) ||
    !Number.isInteger(answer)
  ) {
    return null;
  }
  const nums = [...sequence, answer];
  const lo = Math.min(...nums) - 1;
  const hi = Math.max(...nums) + 1;
  if (hi - lo > 10) return null;
  const W = 320;
  const PAD = 22;
  const y = 26;
  const x = (n) => PAD + ((n - lo) * (W - 2 * PAD)) / (hi - lo);
  const inSequence = new Set(sequence);
  const revealed = feedback === "correct" || feedback === "wrong";
  return (
    <svg
      viewBox={`0 0 ${W} 64`}
      className="mx-auto mt-4 w-full max-w-[320px]"
      role="img"
      aria-label="Number line for the counting pattern"
    >
      <line x1={PAD - 8} y1={y} x2={W - PAD + 8} y2={y} stroke={FIGURE_COLORS.inkSoft} strokeWidth="2.5" />
      {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((n) => (
        <g key={n}>
          <line x1={x(n)} y1={y - 6} x2={x(n)} y2={y + 6} stroke={FIGURE_COLORS.inkSoft} strokeWidth="2" />
          {inSequence.has(n) && <circle cx={x(n)} cy={y} r="6" fill={FIGURE_COLORS.accent} />}
          {n === answer && (
            <circle cx={x(n)} cy={y} r="8" fill="none" stroke={FIGURE_COLORS.warm} strokeWidth="2.5" />
          )}
          <text
            x={x(n)}
            y={y + 26}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill={n === answer ? FIGURE_COLORS.warm : FIGURE_COLORS.ink}
          >
            {n === answer && !revealed ? "?" : n}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function QuestionDisplay({ question, modeColor, feedback, revealAnswer }) {
  const { theme } = useTheme();
  const q = question;
  const showAnswer = feedback && revealAnswer != null;
  // Format transforms carry their instruction ("Is this right?") inside
  // `display`; reading only the top-level field silently dropped it (#32).
  const subPrompt = q.subPrompt ?? q.display?.subPrompt;

  if (q.display?.emoji) {
    // Rows of ten, split five-and-five, so a bigger set reads as ten frames
    // do — count the full rows, not every object (#32).
    const count = q.display.count;
    const rows = [];
    for (let start = 0; start < count; start += 10) {
      rows.push(Array.from({ length: Math.min(10, count - start) }, (_, i) => start + i));
    }
    return (
      <div className="text-center">
        <p className={`text-sm font-bold ${theme.textMuted} mb-3 uppercase tracking-wide`}>How many?</p>
        <div className="flex flex-col items-center gap-1.5">
          {rows.map((row, r) => (
            <div key={r} className="flex items-center gap-1 whitespace-nowrap">
              {row.map((i) => (
                <span key={i} className={`text-2xl sm:text-3xl ${i % 10 === 5 ? "ml-3" : ""}`}>
                  {q.display.emoji}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (q.display?.sequence) {
    // Type scales with the row's length and it may wrap: a numeric run
    // ("1, 2, 3, ?") gets the big size; a word pattern ("red, blue, red,
    // blue, red, blue, ?" — patterns mode, up to 15 tokens) shrank past the
    // card edge at a fixed text-4xl. Thresholds are character counts of the
    // joined row, tuned so each size fills the ~24rem column without clipping.
    const seqChars = q.display.sequence.join(", ").length + 3;
    const seqSize =
      seqChars <= 16
        ? "text-3xl sm:text-4xl"
        : seqChars <= 30
          ? "text-2xl sm:text-3xl"
          : seqChars <= 48
            ? "text-xl sm:text-2xl"
            : "text-lg sm:text-xl";
    return (
      <div className="text-center">
        <p className={`text-sm font-bold ${theme.textMuted} mb-3 uppercase tracking-wide`}>What comes next?</p>
        <div className={`flex flex-wrap items-center justify-center gap-x-1 gap-y-1 ${seqSize} font-extrabold leading-tight ${theme.textPrimary}`}>
          {q.display.sequence.map((n, i) => (
            <span key={i} className="whitespace-nowrap">
              {n}
              <span className={`${theme.textMuted} mr-1`}>,</span>
            </span>
          ))}
          <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
        </div>
        <SequenceNumberLine sequence={q.display.sequence} step={q.display.step} answer={q.answer} feedback={feedback} />
      </div>
    );
  }

  // Word/story prompts take precedence. Bank-authored items sometimes ship a
  // fully symbolic prompt like "65 + 35 = ?" though, which should still get
  // the vertical treatment below for double-digit add/sub.
  const promptText = q.display?.promptText;
  const hasVerbalPrompt = promptText && isVerbalPrompt(promptText);

  // A figure the question asks ABOUT — bar graph, pictograph, tally, line plot
  // — answered through some other widget (choice, number pad, multiSelect).
  // Widgets that draw their own figure are excluded by the registry.
  const figure = getFigure(q);
  if (figure) {
    const { Component: Figure, props } = figure;
    const settled = feedback === "correct" || feedback === "wrong";
    return (
      <div className="text-center space-y-3">
        <Figure theme={theme} {...(props ? props(q, { settled }) : {})} />
        {promptText && (
          <p className={`text-2xl sm:text-3xl font-extrabold ${theme.textPrimary} leading-snug`}>
            {promptText}
          </p>
        )}
        {showAnswer && (
          <div className="mt-2 text-3xl sm:text-4xl font-extrabold">
            <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
          </div>
        )}
      </div>
    );
  }

  if (hasVerbalPrompt) {
    const runLines = emojiPromptLines(promptText);
    if (runLines) {
      // Question sentences render first, centered like every other prompt;
      // the object-set lines sit below as the picture, labels aligned (#32).
      const textLines = runLines.filter((line) => !line.isRun);
      const objectLines = runLines.filter((line) => line.isRun);
      return (
        <div className="text-center space-y-2">
          {textLines.map((line, index) => (
            <p
              key={`${line.text}-${index}`}
              className={`text-xl sm:text-2xl font-extrabold ${theme.textPrimary} leading-snug`}
            >
              {line.text}
            </p>
          ))}
          <div className="w-fit max-w-full mx-auto text-left space-y-1.5 pt-1">
            {objectLines.map((line, index) => (
              <p
                key={`${line.text}-${index}`}
                className={`text-lg sm:text-xl font-extrabold ${theme.textPrimary} leading-snug`}
              >
                {line.label && <span>{line.label} </span>}
                <span className="whitespace-nowrap" style={{ letterSpacing: "0.18em" }}>{line.run ?? line.text}</span>
              </p>
            ))}
          </div>
          {subPrompt && (
            <p className={`text-sm font-bold uppercase tracking-wide ${theme.textMuted}`}>
              {subPrompt}
            </p>
          )}
          {showAnswer && (
            <div className="mt-2 text-4xl sm:text-5xl font-extrabold">
              <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
            </div>
          )}
        </div>
      );
    }
    const promptLines = promptText
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const isStoryProblem = q.metadata?.itemFamily === "application";
    return (
      <div className="text-center space-y-2">
        {isStoryProblem && (
          <p className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${theme.textMuted}`}>
            Story problem
          </p>
        )}
        <div className="space-y-1">
          {(promptLines.length > 0 ? promptLines : [promptText]).map((line, index, arr) => (
            <p
              key={`${line}-${index}`}
              className={`${
                index === arr.length - 1 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
              } font-extrabold ${theme.textPrimary} leading-snug`}
            >
              {line}
            </p>
          ))}
        </div>
        {q.display?.numberLine && (
          <SequenceNumberLine
            sequence={q.display.numberLine.marks}
            step={1}
            answer={q.answer}
            feedback={feedback}
          />
        )}
        {subPrompt && (
          <p className={`text-sm font-bold uppercase tracking-wide ${theme.textMuted}`}>
            {subPrompt}
          </p>
        )}
        {showAnswer && (
          <div className="mt-2 text-4xl sm:text-5xl font-extrabold">
            <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
          </div>
        )}
      </div>
    );
  }

  if (q.op === "?") {
    return (
      <div className={`flex items-center justify-center gap-4 text-5xl sm:text-6xl font-extrabold ${theme.textPrimary}`}>
        <span>{q.a}</span>
        <span
          className={`${modeColor} text-ink w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-3xl sm:text-4xl`}
        >
          {showAnswer ? <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} /> : "?"}
        </span>
        <span>{q.b}</span>
      </div>
    );
  }

  // Format-transformed judgment items ("2 + 19 = 21" + "Is this right?")
  // carry a COMPLETE claim. The vertical compute layout below would replace
  // the claimed result with "?" and make the question unanswerable — so any
  // item with a subPrompt renders its full equation, vertically when the
  // claim fits that shape, and always shows the sub-prompt instruction.
  if (promptText && subPrompt && !hasVerbalPrompt) {
    const claim = promptText.match(/^\s*(\d+)\s*([+−])\s*(\d+)\s*=\s*(\d+)\s*$/);
    const bigClaim = claim && (Number(claim[1]) >= 10 || Number(claim[3]) >= 10 || Number(claim[4]) >= 10);
    return (
      <div className="text-center space-y-4">
        {bigClaim ? (
          <VerticalEquation a={claim[1]} op={claim[2]} b={claim[3]} result={claim[4]} theme={theme} />
        ) : (
          <p
            className={`font-extrabold ${theme.textPrimary}`}
            style={{ fontSize: "clamp(1.8rem, 7vw, 3rem)", lineHeight: 1.3 }}
          >
            {promptText}
          </p>
        )}
        <p className={`text-sm sm:text-base font-bold uppercase tracking-wide ${theme.textMuted}`}>
          {subPrompt}
        </p>
      </div>
    );
  }

  // Vertical form for addition/subtraction with double-digit numbers. Runs
  // even when the item has a symbolic promptText (e.g. bank-authored
  // "65 + 35 = ?") so long as both operands are concrete integers AND the
  // answer really is `a op b`. Unknown-addend/compare items ("10 + ? = 17",
  // answer 7) also carry numeric a/b — laying those out as "10 + 17 = ?"
  // shows a different question than the one being scored, so any item whose
  // answer isn't the computed result must fall through to its promptText.
  const isVertical =
    (q.op === "+" || q.op === "−") &&
    typeof q.a === "number" &&
    typeof q.b === "number" &&
    (q.a >= 10 || q.b >= 10) &&
    Number(q.answer) === (q.op === "+" ? q.a + q.b : q.a - q.b);

  if (isVertical) {
    const aDigits = String(q.a).split("");
    const bDigits = String(q.b).split("");
    const ansLen = String(q.answer).length;
    const maxLen = Math.max(aDigits.length, bDigits.length, ansLen);
    const cols = maxLen + 1; // +1 for operator column
    const padA = cols - aDigits.length;
    const padB = cols - bDigits.length - 1; // -1 because operator takes first cell

    return (
      <div className="flex justify-center">
        <div
          className={`inline-grid items-center justify-items-center font-extrabold ${theme.textPrimary}`}
          style={{
            gridTemplateColumns: `repeat(${cols}, 0.75em)`,
            fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
            lineHeight: 1.4,
          }}
        >
          {Array.from({ length: padA }, (_, i) => <span key={`pa${i}`} />)}
          {aDigits.map((d, i) => <span key={`a${i}`}>{d}</span>)}

          <span className="text-[0.85em]">{q.op}</span>
          {Array.from({ length: padB }, (_, i) => <span key={`pb${i}`} />)}
          {bDigits.map((d, i) => <span key={`b${i}`}>{d}</span>)}

          <span className="border-b-4 border-ink/40 w-full my-1" style={{ gridColumn: "1 / -1" }} />

          {showAnswer ? (
            <>
              {Array.from({ length: cols - String(revealAnswer).length }, (_, i) => <span key={`pans${i}`} />)}
              {String(revealAnswer).split("").map((d, i) => (
                <motion.span
                  key={`ans${i}`}
                  className="text-teal"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: [0, 1.4, 1], rotate: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4, type: "spring", stiffness: 300 }}
                >
                  {d}
                </motion.span>
              ))}
            </>
          ) : (
            <>
              {Array.from({ length: cols - 1 }, (_, i) => <span key={`pq${i}`} />)}
              <span className="text-sun">?</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Symbolic-but-non-vertical prompts (e.g. "6 + ? = 10", "3 tens and 5 ones = ?").
  // These don't fit the vertical layout (often because one operand is unknown)
  // but still need to render the authored prompt text rather than fall back to
  // "a op b = ?" which would print "null" for missing operands.
  if (promptText) {
    return (
      <div className="text-center space-y-2">
        <p className={`text-3xl sm:text-4xl font-extrabold ${theme.textPrimary} leading-snug`}>
          {promptText}
        </p>
        {showAnswer && (
          <div className="mt-2 text-4xl sm:text-5xl font-extrabold">
            <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
          </div>
        )}
      </div>
    );
  }

  // Default horizontal: a op b = ?
  return (
    <div className={`flex items-center justify-center gap-3 text-5xl sm:text-6xl font-extrabold ${theme.textPrimary}`}>
      <span>{q.a}</span>
      <span
        className={`${modeColor} text-ink w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-3xl sm:text-4xl`}
      >
        {q.op}
      </span>
      <span>{q.b}</span>
      <span className={theme.textMuted}>=</span>
      <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
    </div>
  );
}
