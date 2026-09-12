import { motion, AnimatePresence } from "framer-motion";
import QuestionDisplay from "./QuestionDisplay.jsx";
import Scaffold from "./Scaffold.jsx";
import ConfettiBurst from "./ConfettiBurst.jsx";
import { getWidget } from "./widgetRegistry.js";
import { KeyHint } from "./kit";

/**
 * The play stage: question card + answer widget (or choice bubbles), laid out
 * in the session's centered narrow column. MathExplorer drives it in a real
 * session; the admin review preview drives it with a pinned bank item so what
 * the reviewer approves is what the kid gets — same component, same CSS.
 *
 * `questionKey` must change per question: it keys the AnimatePresence card and
 * remounts the widget so its entry state resets. `stacked` forces the
 * phone-style column even on a wide screen (preview pane).
 */
export default function QuestionStage({
  question,
  questionKey,
  theme,
  modeColor,
  feedback,
  revealAnswer,
  shakenChoice,
  isRetry = false,
  scaffold = null,
  onSpeak = null,
  attempt = 0,
  answerType,
  lowMotionMode = false,
  lowEndDevice = false,
  numericChoices = false,
  onSubmit,
  qaSeq = null,
  stacked = false,
}) {
  return (
        <div className={`play-area${stacked ? " play-area--stacked" : ""}`}>
        <div className="play-pane">
        {/* popLayout, not wait: with "wait", a key change that lands while the
            previous card is still exiting (StrictMode double-load, the admin
            ?item= pin, a quick second chance) left the stale card at opacity 0
            and the new one never mounted (#68). popLayout pops the old card out
            of flow and mounts the new one immediately. */}
        <AnimatePresence mode="popLayout">
          <motion.section
            key={questionKey}
            className={`${theme.cardBg} relative rounded-3xl shadow-[0_6px_0_#14231F0f] p-5 sm:p-8 w-full`}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            aria-label="Math question"
            // QA (DEV only): AnimatePresence keeps the EXITING card — old
            // question plus its revealed answer — in the DOM while the new one
            // waits to enter. The seq stamp lets e2e drivers read exactly the
            // card belonging to the current question, never stale pixels.
            {...(qaSeq != null ? { "data-qa-seq": qaSeq } : {})}
          >
            {onSpeak && (
              <button
                type="button"
                onClick={onSpeak}
                aria-label="Read the question out loud"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-cream text-ink flex items-center justify-center cursor-pointer btn-press"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5 6 9H2v6h4l5 4V5z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                </svg>
              </button>
            )}
            {isRetry && (
              <p className={`text-center text-xs font-bold ${theme.textMuted} mb-2 uppercase tracking-wide`}>
                Let's try this one again!
              </p>
            )}
            {scaffold && (
              <p className="text-center text-xs font-bold text-ember mb-2 uppercase tracking-wide">
                Not quite — try once more
              </p>
            )}
            <QuestionDisplay question={question} modeColor={modeColor} feedback={feedback} revealAnswer={revealAnswer} />
            {scaffold && <Scaffold scaffold={scaffold} />}
          </motion.section>
        </AnimatePresence>
        </div>

        <div className="play-pane">
        {getWidget(answerType) ? (
          (() => {
            const { Component, props } = getWidget(answerType);
            return (
              // Same celebration as the choice bubbles: a correct answer earns
              // confetti no matter which widget it came through. w-full: the
              // pane centers its children, so without it this wrapper
              // shrink-wraps and every pad collapses to sliver-width keys.
              <div className="relative w-full">
                <Component
                  key={`${questionKey}:${attempt}`}
                  onSubmit={onSubmit}
                  feedback={feedback}
                  theme={theme}
                  lowMotionMode={lowMotionMode}
                  lowEndDevice={lowEndDevice}
                  {...(props ? props(question, { revealAnswer, shakenChoice }) : {})}
                />
                {feedback === "correct" && !lowMotionMode && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
                  </div>
                )}
              </div>
            );
          })()
        ) : (
        <section className="grid grid-cols-2 gap-3 w-full" aria-label="Answer choices">
          {(question.choices || []).map((choice, i) => {
            const isCorrectChoice = feedback === "correct" && choice === question.answer;
            const isRevealedCorrect = feedback === "wrong" && choice === revealAnswer;
            const isWrong = shakenChoice === choice;
            // Binary pairs use Seafoam and Apricot at equal visual weight
            // (§08) — never a light tile against a darker one, so color
            // never hints at the answer.
            const tintIndex = (question.choices || []).length === 2 ? i * 2 : i;
            return (
              <motion.button
                key={`${questionKey}:${attempt}-${choice}`}
                // Choices are numbers in most modes but words in others
                // ("Grapes", "a rectangle"), and a fixed text-3xl overflowed
                // the bubble for those. Type scales with the answer's length,
                // and long words wrap instead of spilling.
                className={`relative min-h-[72px] sm:min-h-[76px] px-3 py-2 rounded-[20px] bg-gradient-to-br ${theme.bubbleColors[tintIndex % theme.bubbleColors.length]} ${theme.bubbleEdges[tintIndex % theme.bubbleEdges.length]} btn-press text-ink font-display font-semibold cursor-pointer select-none leading-tight break-words ${
                  String(choice).length > 8
                    ? "text-lg sm:text-xl"
                    : String(choice).length > 4
                      ? "text-xl sm:text-2xl"
                      : "text-2xl sm:text-3xl"
                } ${
                  isCorrectChoice || isRevealedCorrect ? "ring-4 ring-teal" : ""
                } ${isWrong ? "ring-4 ring-ember" : ""}`}
                whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                animate={
                  isWrong
                    ? { x: lowEndDevice ? [0, -6, 6, 0] : [0, -10, 10, -10, 10, 0] }
                    : isCorrectChoice
                      ? { scale: [1, 1.1, 1] }
                      : isRevealedCorrect
                        ? { scale: [1, 1.15, 1.05] }
                        : {}
                }
                transition={isWrong ? { duration: lowEndDevice ? 0.22 : 0.4 } : { duration: 0.3 }}
                onClick={() => onSubmit(choice)}
                disabled={feedback === "correct" || feedback === "wrong"}
              >
                {choice}
                {!numericChoices && i < 9 && <KeyHint k={String(i + 1)} />}
                {isCorrectChoice && !lowMotionMode && (
                  <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
                )}
              </motion.button>
            );
          })}
        </section>
        )}
        </div>
        </div>
  );
}
