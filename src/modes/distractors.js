import { randInt, shuffleArray } from "./helpers";

/**
 * Misconception-linked distractors (implementation plan M5).
 *
 * A wrong answer should DIAGNOSE. If a child picks the option produced by
 * `keywordTrap` we know they followed the word rather than the structure; if
 * they pick a random near-miss we know nothing. That difference is the whole
 * reason the metadata carries misconception tags.
 *
 * Before this, four strategies existed (operationSwap, offByOne,
 * placeValueSlip, factNeighbor) and every other tag in the codebase was
 * decorative — written to metadata, never used to build an option. The registry
 * below closes that gap: adding a tag here makes it real everywhere at once.
 *
 * Each strategy returns candidate wrong values (or null/[] when it does not
 * apply to the item at hand). Non-integer, negative and duplicate candidates
 * are filtered downstream, so strategies can be written optimistically.
 */

const num = (v) => (Number.isFinite(v) ? v : null);

export const MISCONCEPTION_STRATEGIES = {
  // --- additive ------------------------------------------------------------
  /** Adds when the story says subtract, or vice versa. */
  operationSwap: ({ a, b }) => [num(Math.abs((a ?? 0) - (b ?? 0))), num((a ?? 0) + (b ?? 0))],

  /** Miscounts by one, typically when counting on. */
  offByOne: ({ answer }) => [answer + 1, answer - 1],

  /** Fails to regroup, or slips a place. */
  placeValueSlip: ({ answer }) => [answer + 10, answer - 10],

  /**
   * On a Start Unknown item the child adds the two given numbers instead of
   * solving backwards: `? + 3 = 5` answered as 8.
   */
  startAsResult: ({ a, b }) => [num((a ?? 0) + (b ?? 0))],

  /**
   * Compare language trap: follows "more"/"fewer" instead of the structure, so
   * performs the opposite operation. This is the single most valuable
   * distractor in the additive set.
   */
  keywordTrap: ({ a, b, answer }) => {
    const sum = (a ?? 0) + (b ?? 0);
    const diff = Math.abs((a ?? 0) - (b ?? 0));
    return [sum === answer ? diff : sum];
  },

  /** Reads "=" as "compute now", so answers the left-hand side. */
  equalsMeansCompute: ({ a, b }) => [num((a ?? 0) + (b ?? 0))],

  // --- multiplicative ------------------------------------------------------
  /** Recalls an adjacent fact. */
  factNeighbor: ({ answer, a, b }) => [answer + (b ?? 1), answer - (b ?? 1), answer + (a ?? 1)],

  /** Divides the wrong way round. */
  divisionReversed: ({ a, b }) => (a && b ? [num(b / a)] : []),

  /** Reports the number of groups when asked for group size, or vice versa. */
  partitiveQuotitiveConfusion: ({ a, b, answer }) =>
    a && answer ? [num(a / answer), num(b ? a / b : null)] : [],

  /** Reads "3 times as much" as "3 more" — the Grade 4 compare error. */
  compareAsAdditive: ({ a, b }) => [num((a ?? 0) + (b ?? 0))],

  /** Ignores a remainder that should round the answer up. */
  remainderDropped: ({ answer }) => [answer - 1],

  /** Multiplies by the wrong factor. */
  wrongFactor: ({ answer, a }) => [answer * 2, a ? num(answer / a) : null],

  // --- counting ------------------------------------------------------------
  /** Skips an object while counting. */
  skipObject: ({ answer }) => [answer - 1, answer - 2],

  /** Counts an object twice. */
  doubleCount: ({ answer }) => [answer + 1, answer + 2],

  // --- comparison / symbols ------------------------------------------------
  /** Reads the comparison symbol backwards. */
  symbolFlip: ({ answer }) => (answer === "<" ? [">"] : answer === ">" ? ["<"] : ["<", ">"]),

  // --- measurement & geometry ----------------------------------------------
  /** Computes perimeter when asked for area, or vice versa. */
  areaPerimeterSwap: ({ width, height }) =>
    width && height ? [width * height, 2 * (width + height)] : [],

  /** Reads the hour hand as minutes or vice versa. */
  hourMinuteSwap: ({ hour, minute }) =>
    hour != null && minute != null ? [hour * 60 + minute, minute * 60 + hour] : [],

  /** Reads the wrong scale on the protractor. */
  protractorMisread: ({ answer }) => [180 - answer, 360 - answer],

  /** Confuses a factor with a multiple. */
  factorMultipleSwap: ({ answer, a }) => (a ? [num(a / answer), a * answer] : []),

  /** Converts in the wrong direction. */
  conversionInverted: ({ answer, factor }) =>
    factor ? [num(answer / (factor * factor)), num(answer * factor)] : [],
};

/** Candidate wrong answers implied by an item's misconception tags. */
export function misconceptionCandidates(tags = [], context = {}) {
  const out = [];
  for (const tag of tags) {
    const strategy = MISCONCEPTION_STRATEGIES[tag];
    if (!strategy) continue;
    try {
      const values = strategy(context);
      if (Array.isArray(values)) out.push(...values);
      else if (values != null) out.push(values);
    } catch {
      // A strategy that does not fit this item simply contributes nothing.
    }
  }
  return out.filter((v) => v != null);
}

function addNumericCandidates(set, candidates, answer) {
  for (const candidate of candidates) {
    if (Number.isFinite(candidate) && Number.isInteger(candidate) && candidate >= 0 && candidate !== answer) {
      set.add(candidate);
    }
  }
}

export function buildArithmeticDistractors({ answer, a, b, misconceptions = [], min = 0, ...rest }) {
  const choices = new Set([answer]);

  // Misconception-linked options first, so the diagnostic ones survive the
  // 4-option cap rather than being crowded out by generic near-misses.
  const candidates = misconceptionCandidates(misconceptions, { answer, a, b, ...rest });

  const spread = Math.max(3, Math.ceil(Math.abs(answer) * 0.2));
  candidates.push(answer + spread, answer - spread, answer + spread + 1, answer - spread - 1);

  addNumericCandidates(choices, candidates.filter((n) => n >= min), answer);
  let attempts = 0;
  while (choices.size < 4 && attempts < 64) {
    attempts++;
    const off = randInt(1, Math.max(4, spread)) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + off;
    if (candidate >= min && candidate !== answer) choices.add(candidate);
  }
  let filler = 1;
  while (choices.size < 4 && filler < 256) {
    const candidate = answer + filler;
    if (candidate >= min && candidate !== answer) choices.add(candidate);
    filler++;
  }
  filler = 1;
  while (choices.size < 4 && filler < 256) {
    const candidate = answer - filler;
    if (candidate >= min && candidate !== answer) choices.add(candidate);
    filler++;
  }

  return shuffleArray([...choices].slice(0, 4));
}

export function buildSequenceDistractors({ answer, step, misconceptions = [] }) {
  const choices = new Set([answer]);
  const candidates = [
    ...misconceptionCandidates(misconceptions, { answer, step }),
    answer + step,
    answer - step,
    answer + step * 2,
    answer - step * 2,
    answer + 1,
    answer - 1,
  ];
  addNumericCandidates(choices, candidates, answer);
  let attempts = 0;
  while (choices.size < 4 && attempts < 64) {
    attempts++;
    const candidate = answer + randInt(1, Math.max(1, step * 3)) * (Math.random() < 0.5 ? -1 : 1);
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
  }
  let filler = 1;
  while (choices.size < 4 && filler < 256) {
    const candidate = answer + filler;
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
    filler++;
  }
  filler = 1;
  while (choices.size < 4 && filler < 256) {
    const candidate = answer - filler;
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
    filler++;
  }
  return shuffleArray([...choices].slice(0, 4));
}

export function buildComparingDistractors() {
  return shuffleArray([">", "<", "="]);
}

/**
 * Generic four-option builder for the modes that ship none. Takes whatever
 * misconception context the mode can supply and falls back to near-misses.
 */
export function buildDistractors({ answer, misconceptions = [], min = 0, ...context }) {
  if (typeof answer !== "number") return null;
  return buildArithmeticDistractors({ answer, misconceptions, min, ...context });
}
