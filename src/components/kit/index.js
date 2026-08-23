/**
 * Shared visual kit for answer widgets.
 *
 * Ten widgets built independently look like ten different products. These are
 * the tokens and states every widget draws with, so a coin, a shape and a
 * number line read as one system (implementation plan M2.1).
 *
 * Everything is inline SVG or Tailwind classes: the app themes through Tailwind
 * class strings, so bitmap assets could not follow the theme, would break in
 * dark mode, and would cost network requests. SVG also animates with the
 * framer-motion already in the bundle.
 *
 * Coins are the one deliberate exception (see kit/coins.js). Real money has
 * fixed colours that must NOT follow the theme — copper is the recognition cue
 * for a penny in every skin — and a child identifies a coin by Lincoln's
 * profile and a reeded rim, which a flat disc cannot supply.
 */

/** One stroke weight and radius vocabulary across every figure. */
export const STROKE = {
  hairline: 1.5,
  normal: 2.5,
  bold: 4,
};

export const RADIUS = {
  chip: 12,
  tile: 16,
  card: 24,
};

/** Feedback ring classes, identical across widgets. Correct deepens toward
 * the brand teal; wrong outlines Ember — never a red X, never green/red. */
export function feedbackRing(feedback) {
  if (feedback === "correct") return "ring-4 ring-teal";
  if (feedback === "wrong") return "ring-4 ring-ember";
  return "";
}

/** Selection state for tappable elements: a Lark Teal ring (§18 coin rule). */
export function selectionClasses(selected, feedback) {
  if (feedback === "correct" && selected) return "ring-4 ring-teal scale-105";
  if (feedback === "wrong" && selected) return "ring-4 ring-ember";
  if (selected) return "ring-4 ring-teal scale-105";
  return "ring-2 ring-transparent";
}

/** Whether input should be frozen. Feedback means the item is already judged. */
export function isLocked(feedback) {
  return feedback === "correct" || feedback === "wrong";
}

/**
 * One animation vocabulary. Respects lowMotionMode and lowEndDevice everywhere
 * so accessibility settings don't have to be re-implemented per widget.
 */
export function tapMotion(lowMotionMode) {
  return lowMotionMode ? { whileTap: { scale: 0.97 } } : { whileTap: { scale: 0.9 } };
}

export function hoverMotion(lowMotionMode) {
  return lowMotionMode ? {} : { whileHover: { scale: 1.05 } };
}

export function shakeAnimation(lowEndDevice) {
  return lowEndDevice ? { x: [0, -6, 6, 0] } : { x: [0, -10, 10, -10, 10, 0] };
}

/**
 * Diagram palette — the three-role system from brand spec §10: Ink is what is
 * given (axes, outlines, dials), Teal (`accent`) is the part in question (the
 * moving ray, the shaded fraction, the plotted point), Sun (`warm`) is the
 * measurement drawn on top (arcs, spans, jump curves). Nothing else gets a
 * color; a diagram that needs a fourth is two diagrams.
 */
export const FIGURE_COLORS = {
  ink: "#14231F",
  inkSoft: "#14231F99",
  fill: "#A7DED3",
  accent: "#0B7A6A",
  warm: "#F26B3A",
  correct: "#0B7A6A",
  wrong: "#C4471B",
};

/**
 * Digit-pad keys (§08): one vocabulary for every widget that types an answer.
 * Rows carry the four tints (Seafoam 1-3, Teal Mid 4-6, Apricot 7-9,
 * Sun Light 0), backspace is solid Sun with an Ink glyph, Go is solid Lark
 * Teal — so a typed answer feels like the tiles, whichever mode it's in.
 * Key height comes from .pad-key (clamped 52-64px per the spec's 64px keys).
 */
const PAD_KEY_BASE =
  "relative pad-key rounded-[18px] font-display font-semibold text-ink " +
  "btn-press cursor-pointer select-none disabled:opacity-40";

const PAD_ROW_TINTS = [
  "bg-seafoam shadow-[0_4px_0_#7FCFBE] [--press-edge:#7FCFBE]",
  "bg-teal-mid shadow-[0_4px_0_#3E9E8E] [--press-edge:#3E9E8E]",
  "bg-apricot shadow-[0_4px_0_#F0A47A] [--press-edge:#F0A47A]",
  "bg-sun-light shadow-[0_4px_0_#E8895A] [--press-edge:#E8895A]",
];

export function digitKeyClass(digit) {
  const n = Number(digit);
  const row = n === 0 ? 3 : Math.ceil(n / 3) - 1;
  return `${PAD_KEY_BASE} text-2xl ${PAD_ROW_TINTS[row]}`;
}

export const PAD_BACKSPACE =
  `${PAD_KEY_BASE} text-xl bg-sun shadow-[0_4px_0_#C4471B] [--press-edge:#C4471B]`;

export const PAD_GO =
  "relative pad-key rounded-[18px] bg-teal text-cream font-display font-semibold " +
  "text-xl shadow-[0_4px_0_#064A41] btn-press cursor-pointer select-none disabled:opacity-40";

/** Shared submit-button styling: the standard larkit button — flat Lark Teal
 * over a Deep Teal bottom edge, Cream Fredoka label, press sinks 4px. */
export const SUBMIT_BUTTON =
  "px-8 h-14 rounded-[18px] bg-teal shadow-[0_5px_0_#064A41] btn-press " +
  "text-cream text-xl font-display font-semibold disabled:opacity-40 " +
  "disabled:cursor-not-allowed cursor-pointer select-none";

export { useAnswerKeys, useDigitKeys, useIndexKeys } from "./useAnswerKeys.js";
export { default as KeyHint } from "./KeyHint.jsx";
