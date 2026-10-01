/**
 * Operation signs, written two ways. Logic reads the ASCII sign ("-", "x",
 * "/"); what a child sees or hears uses the typeset one ("−", "×", "÷"). The
 * bank stores both spellings in `op` (and generators write ASCII), so every
 * place that compares a sign goes through `asciiOp`, and every place that
 * draws one goes through `opGlyph`.
 *
 * `op` itself is never rewritten: it is part of each question's itemKey, so
 * changing it would orphan mistake-bank entries already saved.
 *
 * Pure, no imports: safe for the native engine bundle (no lookbehind either,
 * for JavaScriptCore).
 */

const ASCII = { "−": "-", "–": "-", "×": "x", "*": "x", "÷": "/" };
const GLYPH = { "-": "−", "–": "−", x: "×", "*": "×", "/": "÷" };

/** "−" → "-", "×" → "x", "÷" → "/"; anything else unchanged. */
export function asciiOp(op) {
  return ASCII[op] || op;
}

/** "-" → "−", "x" → "×", "/" → "÷"; anything else unchanged. */
export function opGlyph(op) {
  return GLYPH[op] || op;
}

/**
 * Typeset the ASCII signs of a written equation: "17 - 5 = ?" → "17 − 5 = ?",
 * "? x 3 = 21" → "? × 3 = 21", "114 / 6" → "114 ÷ 6". Only a sign with a space
 * on each side and a number (or ?, or a bracket) on each side changes, so
 * fractions ("3/4"), hyphenated ranges ("5-10") and words ("x-coordinate")
 * stay as they are.
 */
export function typesetSigns(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/([\d?)])\s+-\s+(?=[\d?(])/g, "$1 − ")
    .replace(/([\d?)])\s+x\s+(?=[\d?(])/g, "$1 × ")
    .replace(/(\d)\s+\/\s+(?=[\d?])/g, "$1 ÷ ");
}
