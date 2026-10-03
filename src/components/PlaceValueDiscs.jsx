import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  digitKeyClass,
  PAD_BACKSPACE,
  SECONDARY_BUTTON,
  SUBMIT_BUTTON,
  TEXT_BUTTON,
  feedbackRing,
  isLocked,
  useAnswerKeys,
  useDigitKeys,
  KeyHint,
} from "./kit";
import ConfettiBurst from "./ConfettiBurst.jsx";
import {
  add,
  addLabel,
  breakDown,
  breakDownLabel,
  breakDownText,
  canAdd,
  canBreakDown,
  canCheck,
  canRemove,
  canTradeUp,
  feedbackLine,
  matValue,
  placeName,
  remove,
  removeLabel,
  sameMat,
  startMat,
  statusLine,
  tradeUp,
  tradeUpLabel,
  tradeUpText,
} from "./discMatBuild.js";

const PLACE_LABEL = { 1000: "1000", 100: "100", 10: "10", 1: "1" };
// One tile tint per place, ink labels (brand rule: never a colored label on a tint).
const PLACE_COLOR = { 1000: "bg-apricot", 100: "bg-seafoam", 10: "bg-teal-mid", 1: "bg-sun-light" };

/**
 * Place-value discs — the answer widget for `answerType: "placeValueDiscs"`.
 * Two modes, the way CoinTray has count/build:
 *
 *  read  — (default; every v1 bank row) a fixed mat from `cols`; the kid
 *          reads it and types the number on the digit pad.
 *  build — (`display.mode === "build"`) the kid changes the mat: add or take
 *          away discs, trade 10 of a place for 1 of the next, break 1 into
 *          10 of the place to its right, then Check. The answer is the number
 *          the finished mat shows, submitted as a Number like the pad's.
 *
 * QuestionStage keys the widget per question and attempt, so either mode
 * starts fresh on every new question.
 */
export default function PlaceValueDiscs({ mode = "read", ...props }) {
  return mode === "build" ? <BuildMat {...props} /> : <ReadMat {...props} />;
}

function ReadMat({ onSubmit, feedback, theme, lowMotionMode, lowEndDevice, cols }) {
  const [entry, setEntry] = useState("");
  const locked = feedback === "correct" || feedback === "wrong";
  const pressDigit = (d) => {
    if (!locked) setEntry((e) => (e.length < 7 ? e + d : e));
  };
  const backspace = () => {
    if (!locked) setEntry((e) => e.slice(0, -1));
  };
  const submit = () => {
    if (!locked && entry !== "") onSubmit(Number(entry));
  };

  const displayTone =
    feedback === "correct" ? "text-deep-teal" : feedback === "wrong" ? "text-ember" : theme.textPrimary;

  useDigitKeys({ locked, onDigit: pressDigit, onBackspace: backspace, onSubmit: submit });

  return (
    <section className="w-full flex flex-col items-center gap-3" aria-label="Place value discs">
      <div className="relative w-full flex justify-center gap-2">
        {(cols || []).map(({ place, count }) => (
          <div key={place} className={`flex flex-col items-center gap-1 rounded-xl ${theme.cardBg} p-2 shadow-inner`}>
            <span className={`text-xs font-bold ${theme.textSecondary}`}>{PLACE_LABEL[place]}</span>
            <div className="flex flex-col-reverse gap-1 min-h-[80px] justify-start">
              {Array.from({ length: count }, (_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full ${PLACE_COLOR[place]} text-ink text-[10px] font-bold flex items-center justify-center shadow`}
                >
                  {PLACE_LABEL[place]}
                </div>
              ))}
            </div>
          </div>
        ))}
        {feedback === "correct" && !lowMotionMode && (
          <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
        )}
      </div>
      <div className={`min-h-[40px] text-3xl font-extrabold ${displayTone}`} aria-live="polite">
        {entry === "" ? <span className={theme.textMuted}>—</span> : entry}
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
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={backspace}
          disabled={locked}
          aria-label="Delete"
        >
          ⌫
        </motion.button>
        <motion.button
          className={digitKeyClass("0")}
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => pressDigit("0")}
          disabled={locked}
        >
          0
        </motion.button>
        <motion.button
          className="relative min-h-[64px] rounded-[18px] bg-teal text-cream text-xl font-display font-semibold shadow-[0_5px_0_#064A41] btn-press cursor-pointer select-none disabled:opacity-40"
          whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={submit}
          disabled={locked || entry === ""}
          aria-label="Submit answer"
        >
          Go
        </motion.button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Build mode: the tappable mat. The rules live in discMatBuild.js.
// ---------------------------------------------------------------------------

// The kit digit-pad row whose tint matches each place's disc, so − and + read
// as part of their column (Apricot 7-9, Seafoam 1-3, Teal Mid 4-6, Sun Light 0).
const STEP_KEY_TINT = { 1000: "7", 100: "1", 10: "4", 1: "0" };

// Keyboard: every action has a fixed key, column by column, left to right:
// − then + then the break-down then the trade-up (a trade-up's key is
// reserved even while its button is hidden). 1-9 and 0 first, then the
// q-row, as TenFrame does for cells 11-20. Enter checks, Escape starts over.
const ACTION_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "y"];

function actionSlots(mat) {
  const slots = [];
  mat.forEach((_, i) => {
    slots.push({ i, kind: "remove" }, { i, kind: "add" });
    if (i < mat.length - 1) slots.push({ i, kind: "breakDown" });
    if (i > 0) slots.push({ i, kind: "tradeUp" });
  });
  return slots.map((slot, n) => ({ ...slot, key: ACTION_KEYS[n] ?? null }));
}

const ACTIONS = { add, remove, tradeUp, breakDown };

const TRADE_TEXT = "text-[11px] @min-[92px]:text-[13px]";

function BuildMat({ onSubmit, feedback, theme, lowMotionMode, cols }) {
  const [start] = useState(() => startMat(cols));
  const [mat, setMat] = useState(start);
  // Discs pop in only once the kid starts changing the mat; the start mat
  // arrives with the question card.
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const rootRef = useRef(null);
  const locked = isLocked(feedback);
  const ready = canCheck(mat);
  const unchanged = sameMat(mat, start);

  const run = (kind, i) => {
    if (locked) return;
    setTouched(true);
    setMat((m) => ACTIONS[kind](m, i));
  };
  const startOver = () => {
    if (locked) return;
    setMat(start);
  };
  const check = () => {
    if (locked || !ready) return;
    const value = matValue(mat);
    setSubmitted(value);
    onSubmit(value);
  };

  const slots = actionSlots(mat);
  const keyFor = (kind, i) => slots.find((s) => s.kind === kind && s.i === i)?.key ?? null;

  useAnswerKeys((e) => {
    if (e.key === "Enter") {
      // A focused mat button takes Enter itself (the browser clicks it);
      // anywhere else Enter means Check, as on every other widget.
      if (e.target?.tagName === "BUTTON" && rootRef.current?.contains(e.target)) return false;
      check();
      return true;
    }
    if (e.key === "Escape") {
      startOver();
      return true;
    }
    const slot = e.key.length === 1 ? slots.find((s) => s.key === e.key.toLowerCase()) : null;
    if (!slot) return false;
    run(slot.kind, slot.i);
    return true;
  }, !locked);

  const showFeedback = locked && submitted !== null;
  const line = showFeedback ? feedbackLine(submitted, feedback === "correct") : statusLine(mat);
  const lineTone = showFeedback
    ? feedback === "correct"
      ? "text-deep-teal"
      : "text-ember"
    : "text-ink";
  const gridStyle = { gridTemplateColumns: `repeat(${mat.length}, minmax(0, 1fr))` };

  return (
    <section ref={rootRef} className="w-full flex flex-col items-center gap-2" aria-label="Disc mat">
      <div className={`grid w-full gap-1.5 rounded-xl ${feedbackRing(feedback)}`} style={gridStyle}>
        {mat.map(({ place, count }) => (
          <div
            key={place}
            className={`min-w-0 rounded-xl ${theme?.cardBg || "bg-white/80"} px-1 pt-0.5 pb-1.5 shadow-inner`}
          >
            <p className={`m-0 text-center text-xs font-bold leading-5 ${theme?.textSecondary || "text-ink/70"}`}>
              {placeName(place)}
            </p>
            <Discs place={place} count={count} animate={touched && !lowMotionMode} />
          </div>
        ))}
      </div>

      <div className="grid w-full gap-1.5 items-start" style={gridStyle}>
        {mat.map(({ place }, i) => (
          // Each column is a size container: where two 44px buttons do not
          // fit side by side (four places on a phone, under 92px a column),
          // − and + stack, + on top; trade labels step down a size too.
          <div key={place} className="@container min-w-0 flex flex-col gap-1.5">
            <div className="flex flex-col-reverse gap-1 @min-[92px]:grid @min-[92px]:grid-cols-2">
              <StepButton
                place={place}
                glyph="−"
                label={removeLabel(place)}
                disabled={locked || !canRemove(mat, i)}
                onClick={() => run("remove", i)}
                hint={keyFor("remove", i)}
              />
              <StepButton
                place={place}
                glyph="+"
                label={addLabel(place)}
                disabled={locked || !canAdd(mat, i)}
                onClick={() => run("add", i)}
                hint={keyFor("add", i)}
              />
            </div>
            {i < mat.length - 1 && (
              <button
                type="button"
                className={`${SECONDARY_BUTTON} ${TRADE_TEXT} w-full`}
                disabled={locked || !canBreakDown(mat, i)}
                onClick={() => run("breakDown", i)}
                aria-label={breakDownLabel(place)}
              >
                {keyFor("breakDown", i) && <KeyHint k={keyFor("breakDown", i)} inline />}
                <TradeText text={breakDownText(place)} />
              </button>
            )}
            {/* A trade-up shows only when it can happen, so the mat stays calm
                until a place reaches 10; its slot keeps its height meanwhile,
                so nothing below moves when it appears. */}
            {i > 0 && !canTradeUp(mat, i) && <div className="min-h-[44px]" aria-hidden="true" />}
            {i > 0 && canTradeUp(mat, i) && (
              <button
                type="button"
                className={`${SECONDARY_BUTTON} ${TRADE_TEXT} w-full`}
                disabled={locked}
                onClick={() => run("tradeUp", i)}
                aria-label={tradeUpLabel(place)}
              >
                {keyFor("tradeUp", i) && <KeyHint k={keyFor("tradeUp", i)} inline />}
                <TradeText text={tradeUpText(place)} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* The status line (or, once judged, the feedback line). Its height is
          held so Check does not jump when a place reaches 10. No running
          number while building: reading the mat is the skill. */}
      <p
        className={`m-0 min-h-[40px] w-full flex items-center justify-center text-center text-balance text-sm font-bold leading-5 ${lineTone}`}
        aria-live="polite"
        data-qa="disc-mat-status"
      >
        {line}
      </p>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          className={TEXT_BUTTON}
          disabled={locked || unchanged}
          onClick={startOver}
          aria-label="Start over"
        >
          <KeyHint k="Esc" inline />
          Start over
        </button>
        <button
          type="button"
          className={SUBMIT_BUTTON}
          disabled={locked || !ready}
          onClick={check}
          aria-label="Check"
        >
          Check
        </button>
      </div>
    </section>
  );
}

// "1 ten → 10 ones" breaks after the arrow when it must wrap, never inside
// a side ("1 ten → 10" / "ones").
function TradeText({ text }) {
  const [from, to] = text.split(" → ");
  return (
    <>
      <span className="inline-block">{from} →</span> <span className="inline-block">{to}</span>
    </>
  );
}

function StepButton({ place, glyph, label, disabled, onClick, hint }) {
  return (
    <button
      type="button"
      className={`${digitKeyClass(STEP_KEY_TINT[place] ?? "1")} w-full min-w-[44px] leading-none`}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      <span aria-hidden="true">{glyph}</span>
      {hint && <KeyHint k={hint} small />}
    </button>
  );
}

/**
 * One place's discs in rows of 5 — two full rows are a ten, with a little
 * more room after them — left to right, top row first. All 20 slots are
 * always laid out, so the mat keeps its height from 0 discs to 19 and the
 * buttons under it never move.
 */
function Discs({ place, count, animate }) {
  const label = PLACE_LABEL[place];
  const n = Math.min(count, 20);
  const block = (from) => (
    <div className="grid grid-cols-5 gap-[2px]">
      {Array.from({ length: 10 }, (_, k) => {
        const slot = from + k;
        return (
          <span key={slot} className="disc-slot block aspect-square">
            {slot < n && (
              <motion.span
                className={`flex w-full h-full items-center justify-center rounded-full ${PLACE_COLOR[place]} text-ink font-bold leading-none shadow-sm disc-label${
                  label.length > 3 ? " disc-label--long" : ""
                }`}
                initial={animate ? { scale: 0.5, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {label}
              </motion.span>
            )}
          </span>
        );
      })}
    </div>
  );
  return (
    <div
      className="mx-auto w-full max-w-[148px] flex flex-col gap-1.5"
      role="img"
      aria-label={count === 0 ? `No ${placeName(place, 1)} discs` : `${count} ${placeName(place, 1)} disc${count === 1 ? "" : "s"}`}
    >
      {block(0)}
      {block(10)}
    </div>
  );
}
