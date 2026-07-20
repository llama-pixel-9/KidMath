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

/** Feedback ring classes, identical across widgets. */
export function feedbackRing(feedback) {
  if (feedback === "correct") return "ring-4 ring-green-400";
  if (feedback === "wrong") return "ring-4 ring-red-400";
  return "";
}

/** Selection state for tappable elements. */
export function selectionClasses(selected, feedback) {
  if (feedback === "correct" && selected) return "ring-4 ring-green-400 scale-105";
  if (feedback === "wrong" && selected) return "ring-4 ring-red-400";
  if (selected) return "ring-4 ring-sky-400 scale-105";
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

/** Palette hooks that follow the active theme where one is supplied. */
export const FIGURE_COLORS = {
  ink: "#334155",
  inkSoft: "#94a3b8",
  fill: "#e0f2fe",
  accent: "#0ea5e9",
  warm: "#fbbf24",
  correct: "#4ade80",
  wrong: "#f87171",
};

/** Shared submit-button styling so every widget's primary action matches. */
export const SUBMIT_BUTTON =
  "px-8 py-3 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-400 " +
  "text-white text-xl font-extrabold shadow-lg disabled:opacity-40 " +
  "disabled:cursor-not-allowed cursor-pointer select-none";
