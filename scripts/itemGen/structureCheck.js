/**
 * M6.2 — does the prose actually match the structure it claims?
 *
 * The characteristic LLM failure when asked for a hard structure is to quietly
 * write an easy one instead: ask for Add To / Start Unknown and you get Add To
 * / Result Unknown with the same nouns. The item reads fine, the schema
 * validates, and it lands in the bank under the wrong label — so the cell looks
 * covered while the child never meets the structure.
 *
 * The bank audit makes this the critical check: eight of the nine difficult
 * structures have never been authored, so almost every draft in the first
 * batches will be a structure the model has no habit of writing.
 *
 * These checks are deliberately conservative. They reject only when the
 * evidence is clear, because a false rejection costs one regenerated item while
 * a false acceptance costs a mislabelled item nobody looks at again.
 */

/** Numbers that appear in the prose, in order. */
function numbersIn(text) {
  return (text.match(/\d+/g) || []).map(Number);
}

const has = (text, re) => re.test(text);

/**
 * Per-structure checks. Each returns an array of problems (empty = accepted).
 * `q` is the item payload: { a, b, answer, display: { promptText } }.
 */
export const STRUCTURE_CHECKS = {
  // --- Start Unknown: the starting amount must NOT be stated ---------------
  addToStartUnknown: (text, q) => {
    const problems = [];
    if (!has(text, /\bsome\b|\bhow many .* (before|at first|to begin|to start)\b/i)) {
      problems.push('Start Unknown must leave the starting amount unstated ("Some bunnies were...")');
    }
    if (numbersIn(text).length !== 2) {
      problems.push(`Start Unknown states ${numbersIn(text).length} numbers; it must state exactly 2`);
    }
    if (q.answer != null && numbersIn(text).includes(q.answer)) {
      problems.push("the answer appears in the prompt — the unknown has been given away");
    }
    return problems;
  },

  takeFromStartUnknown: (text, q) => STRUCTURE_CHECKS.addToStartUnknown(text, q),

  // --- Change Unknown: the change must be the thing left vague -------------
  addToChangeUnknown: (text) =>
    has(text, /\bsome\b/i)
      ? []
      : ['Change Unknown should leave the change unstated ("Some more hopped over")'],

  takeFromChangeUnknown: (text) =>
    has(text, /\bsome\b/i) ? [] : ["Change Unknown should leave the amount removed unstated"],

  // --- Compare: the language variant IS the structure ----------------------
  compareDifferenceMore: (text) =>
    has(text, /\bmore\b/i) ? [] : ['this variant must ask "how many more"'],
  compareDifferenceFewer: (text) =>
    has(text, /\bfewer\b|\bless\b/i) ? [] : ['this variant must ask "how many fewer"'],

  compareBiggerMore: (text) =>
    has(text, /\bmore\b/i) ? [] : ['must use "more" — that is what makes this the consistent variant'],

  compareBiggerFewer: (text) => {
    const problems = [];
    if (!has(text, /\bfewer\b|\bless\b/i)) {
      problems.push('the language trap requires the word "fewer" even though the child must ADD');
    }
    if (has(text, /\bmore\b/i)) {
      problems.push('"more" appears, which removes the trap this structure exists to test');
    }
    return problems;
  },

  compareSmallerMore: (text) => {
    const problems = [];
    if (!has(text, /\bmore\b/i)) {
      problems.push('the language trap requires the word "more" even though the child must SUBTRACT');
    }
    if (has(text, /\bfewer\b|\bless\b/i)) {
      problems.push('"fewer" appears, which removes the trap this structure exists to test');
    }
    return problems;
  },

  compareSmallerFewer: (text) =>
    has(text, /\bfewer\b|\bless\b/i) ? [] : ['this variant must use "fewer"'],

  // --- Multiplicative ------------------------------------------------------
  equalGroupsNumberUnknown: (text) =>
    has(text, /how many (bags|boxes|groups|baskets|packs|rows|piles|teams)/i)
      ? []
      : ["quotitive division must ask how many GROUPS are needed, not how many per group"],

  equalGroupsSizeUnknown: (text) =>
    has(text, /how many .*(in each|per|each (bag|box|group|basket|plate))/i)
      ? []
      : ["partitive division must ask how many are in EACH group"],

  arrayRowCountUnknown: (text) =>
    has(text, /how many rows/i) ? [] : ["this structure must ask how many ROWS"],

  arrayRowSizeUnknown: (text) =>
    has(text, /how many .*(in each row|per row)/i)
      ? []
      : ["this structure must ask how many are IN EACH row"],

  compareProductUnknown: (text) =>
    has(text, /times as (much|many)/i)
      ? []
      : ['multiplicative compare must say "times as much/many", not "more"'],

  compareSetSizeUnknown: (text) =>
    has(text, /times as (much|many)/i)
      ? []
      : ['multiplicative compare must say "times as much/many", not "more"'],

  compareMultiplierUnknown: (text) =>
    has(text, /how many times as (much|many)/i)
      ? []
      : ['must ask "how many times as much/many"'],
};

/**
 * Check a draft against the structure it claims.
 * Returns { ok, problems }.
 */
export function checkStructure(item) {
  const structureType = item.structureType;
  const text = item.question?.display?.promptText || "";
  const problems = [];

  if (!structureType || structureType === "unknown") {
    problems.push("no structureType claimed");
    return { ok: false, problems };
  }

  const check = STRUCTURE_CHECKS[structureType];
  if (check) problems.push(...check(text, item.question || {}));

  // Universal: the arithmetic in the prose must support the stated answer.
  const nums = numbersIn(text);
  const { a, b, answer } = item.question || {};
  if (typeof answer === "number" && nums.length >= 2) {
    const plausible =
      nums.includes(answer) === false || // answer usually should NOT be stated
      structureType.endsWith("ResultUnknown");
    if (!plausible) {
      problems.push("the answer is stated in the prompt");
    }
  }
  // Both givens must be stated. Guarding this on "the prose has >= 2 numbers"
  // would skip the worst case — a prompt stating no numbers at all, which is
  // unanswerable and was previously accepted.
  if (typeof a === "number" && typeof b === "number") {
    const missing = [a, b].filter((n) => !nums.includes(n));
    if (missing.length) {
      problems.push(`payload numbers ${missing.join(", ")} do not appear in the prompt`);
    }
  }

  return { ok: problems.length === 0, problems };
}

/** Structures with a check. Used to report unguarded coverage. */
export const CHECKED_STRUCTURES = Object.keys(STRUCTURE_CHECKS);
