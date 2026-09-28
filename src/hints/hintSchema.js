/**
 * The per-item hint object (item_bank.hint → item.hint → question.hint):
 *
 *   { nudge, steps[], picture, example, feedback, solution }
 *
 * Any field may be missing and every consumer tolerates a partial object.
 * This module is the one place that says what a well-formed field looks
 * like: hintFor takes the usable fields and falls back per field for the
 * rest, the authoring gate calls validateHint for the full list of problems,
 * and hintContainsAnswer is the check that refuses a nudge, step or feedback
 * line that hands over the answer. Pure and dependency-free so the native
 * engine can bundle it.
 */

/** Picture kinds a hint may name. Naming one does not mean the panel can
 * draw it yet; HintPane leaves out any it cannot. */
export const PICTURE_KINDS = Object.freeze([
  "coinTray",
  "tenFrame",
  "numberLine",
  "array",
  "dots",
  "strip",
  "tapeDiagram",
  "barModel",
  "clock",
  "placeValueDiscs",
  "hundredChart",
]);

const isText = (x) => typeof x === "string" && x.trim().length > 0;
const isRecord = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const isTextList = (x) => Array.isArray(x) && x.every(isText);
const isAnswer = (x) => isText(x) || (typeof x === "number" && Number.isFinite(x));
const isCount = (x) => Number.isInteger(x) && x >= 0;
const isNum = (x) => typeof x === "number" && Number.isFinite(x);

// The fields a picture is drawn from, for the kinds Scaffold draws today
// (the same shapes scaffold.js builds). A picture missing them would crash
// the drawer, so it is malformed and hintFor falls back to the number-based
// scaffold. The other kinds have no drawer yet, so only their kind is held.
const PICTURE_FIELDS = {
  dots: (p) => Array.isArray(p.groups) && p.groups.length > 0 && p.groups.every(isCount) && (p.takeAway == null || isCount(p.takeAway)),
  array: (p) => isCount(p.rows) && isCount(p.cols),
  strip: (p) => isCount(p.den) && p.den > 0 && isCount(p.shaded),
  numberLine: (p) => isNum(p.min) && isNum(p.max) && isNum(p.mark) && p.max > p.min,
};

function checkPicture(v) {
  if (!isRecord(v) || !PICTURE_KINDS.includes(v.kind)) return `picture.kind must be one of ${PICTURE_KINDS.join(", ")}`;
  const fields = PICTURE_FIELDS[v.kind];
  return !fields || fields(v) ? null : `picture of kind ${v.kind} is missing the fields it is drawn from`;
}

// One checker per field: null when the value is well formed, otherwise why
// not. A missing or null field is never checked — that is how an author
// says "none" on purpose, and how every v1 row looks.
const FIELD_CHECKS = {
  nudge: (v) => (isText(v) ? null : "nudge must be a non-empty string"),
  steps: (v) => (isTextList(v) && v.length ? null : "steps must be a non-empty list of strings"),
  picture: checkPicture,
  example: (v) =>
    isRecord(v) && isText(v.problem) && isTextList(v.steps) && isAnswer(v.answer)
      ? null
      : "example needs problem, steps[] and answer",
  feedback: (v) =>
    isRecord(v) && Object.values(v).every(isText) ? null : "feedback must map each wrong answer to a sentence",
  solution: (v) => (isRecord(v) && isTextList(v.steps) && isAnswer(v.answer) ? null : "solution needs steps[] and answer"),
};

/** Every problem with a hint object, for the authoring gate and the review
 * screen. Only present fields are judged; an empty object is a valid hint. */
export function validateHint(hint) {
  if (!isRecord(hint)) return { ok: false, errors: ["hint must be an object"] };
  const errors = [];
  for (const [field, check] of Object.entries(FIELD_CHECKS)) {
    const value = hint[field];
    if (value === undefined || value === null) continue;
    const problem = check(value);
    if (problem) errors.push(problem);
  }
  return { ok: errors.length === 0, errors };
}

/** The fields of a hint a consumer can use as they are: the well-formed
 * ones only, so a partial or malformed hint degrades field by field and
 * never throws. Anything that is not a hint object yields no fields. */
export function usableHintFields(hint) {
  const out = {};
  if (!isRecord(hint)) return out;
  for (const [field, check] of Object.entries(FIELD_CHECKS)) {
    const value = hint[field];
    if (value !== undefined && value !== null && !check(value)) out[field] = value;
  }
  return out;
}

// A number as it appears in kid text: "19", "$1.09", "1,200", "91¢",
// "91 cents", "3/4", "3:15". Only a whole token counts, so 9 is not found
// inside 19 or 9.5. Money is read on both sides of the decimal point so
// "$0.91" and "91 cents" both give away an answer of 91 (cents) or 0.91.
const NUMBER_RE = /(\$)?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(\/\d+|:\d{2})?(\s*(?:¢|cents?\b))?/giu;

function numberTokens(text) {
  const out = new Set();
  for (const m of String(text).matchAll(NUMBER_RE)) {
    const [, dollars, whole, decimals = "", tail = "", cents] = m;
    const digits = whole.replace(/,/g, "");
    if (tail) {
      // Fractions and clock times stay whole: "3/4" is not a 3 and a 4.
      out.add(`${digits}${decimals}${tail}`);
      continue;
    }
    const n = Number(`${digits}${decimals}`);
    out.add(String(n));
    if (dollars) out.add(String(Math.round(n * 100)));
    if (cents) out.add(String(n / 100));
  }
  return out;
}

/** The answer as tokens to look for: numbers (with their money forms) and,
 * for a word or symbol answer such as ">" or "triangle", the word itself. */
function answerTokens(answer) {
  const numbers = new Set();
  const words = new Set();
  const add = (v) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      v.forEach(add);
      return;
    }
    if (typeof v === "object") {
      if ("num" in v && "den" in v) add(`${v.num}/${v.den}`);
      else Object.values(v).forEach(add);
      return;
    }
    const text = String(v).trim();
    const found = numberTokens(text);
    if (found.size) found.forEach((t) => numbers.add(t));
    else if (text) words.add(text.toLowerCase());
  };
  add(answer);
  return { numbers, words };
}

function hasWord(line, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(line);
}

// The lines a kid reads before answering. The worked example and the
// solution may state an answer by design, so they are not checked.
function linesBeforeAnswering(hint) {
  if (!isRecord(hint)) return [];
  const lines = [];
  if (typeof hint.nudge === "string") lines.push(hint.nudge);
  if (Array.isArray(hint.steps)) lines.push(...hint.steps.filter((s) => typeof s === "string"));
  else if (typeof hint.steps === "string") lines.push(hint.steps);
  if (isRecord(hint.feedback)) lines.push(...Object.values(hint.feedback).filter((s) => typeof s === "string"));
  return lines;
}

/** True when the nudge, any step or any feedback line contains the answer
 * as a whole token, tolerant of $, cent signs, commas and units. A
 * malformed hint or an empty answer is never a hit. */
export function hintContainsAnswer(hint, answer) {
  const lines = linesBeforeAnswering(hint);
  if (!lines.length) return false;
  const { numbers, words } = answerTokens(answer);
  if (!numbers.size && !words.size) return false;
  return lines.some((line) => {
    if (numbers.size) {
      const found = numberTokens(line);
      for (const t of numbers) if (found.has(t)) return true;
    }
    for (const w of words) if (hasWord(line, w)) return true;
    return false;
  });
}
