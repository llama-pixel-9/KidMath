/**
 * Deterministic QC checks — run BEFORE any model is asked for an opinion.
 *
 * An LLM reviewing another LLM's output shares its blind spots: if the author
 * misread "3 times as much" as additive, a reviewer can accept it for the same
 * reason. So everything decidable by code is decided by code, and the model is
 * only asked about things code genuinely cannot judge (does this read naturally
 * to a 7-year-old, is the context sensible, is the situation coherent).
 *
 * Every check returns { id, severity, message } or null.
 *   fail  — must not reach a child
 *   warn  — a human or the model should look
 */

import { checkStructure } from "./structureCheck.js";

const fail = (id, message) => ({ id, severity: "fail", message });
const warn = (id, message) => ({ id, severity: "warn", message });

const numbersIn = (text) => (text.match(/\d+/g) || []).map(Number);

/**
 * Plurals of the countable nouns items actually use. Deliberately a closed
 * list: any heuristic broad enough to catch unknown plurals also catches verbs
 * and prepositions that happen to end in "s".
 */
const COUNTABLE_PLURALS = new Set([
  "apples", "stickers", "marbles", "shells", "books", "pencils", "buttons",
  "crayons", "cards", "blocks", "beads", "leaves", "bunnies", "birds",
  "flowers", "cookies", "plums", "chairs", "coins", "bags", "boxes", "baskets",
  "jars", "plates", "shelves", "rows", "groups", "bears", "ducks", "frogs",
  "cats", "dogs", "fish", "stars", "balls", "hats", "cups", "spoons", "eggs",
  "oranges", "bananas", "grapes", "berries", "seeds", "stones", "tiles",
  "stamps", "ribbons", "balloons", "candles", "muffins", "trucks", "trains",
]);

const OPS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "−": (a, b) => a - b,
  x: (a, b) => a * b,
  "*": (a, b) => a * b,
  "×": (a, b) => a * b,
  "/": (a, b) => (b === 0 ? null : a / b),
  "÷": (a, b) => (b === 0 ? null : a / b),
};

/**
 * Recompute the answer from the payload rather than trusting it.
 *
 * When `op` is known, check EXACTLY that operation — an earlier version
 * accepted the answer if any operation reached it, so `2 + 3 = 6` passed
 * because 2 x 3 = 6. That is precisely the class of error this check exists to
 * catch, so it was worse than useless.
 *
 * Two legitimate shapes: `a op b = answer`, and the embedded-unknown form where
 * the answer is a missing operand (`? + 3 = 5` stores a=null or a=one part).
 */
function arithmeticCheck(item) {
  const q = item.question || {};
  const { a, b, answer, op } = q;
  if (typeof answer !== "number") return null;
  if (typeof a !== "number" || typeof b !== "number") return null;
  const fn = OPS[op];
  if (!fn) return null; // no operator to check against

  // Direct: a op b = answer. Word-problem payloads do NOT guarantee operand
  // order (the two numbers are just "the two stated in the prompt"), so
  // subtraction and division accept either order — a Compare item storing
  // [difference, larger] is as valid as [larger, difference]. This stays
  // order-agnostic WITHIN the operation, so 2 + 3 = 6 still fails.
  if (op === "+" && (a + b === answer || a + answer === b || answer + b === a)) return null;
  if ((op === "-" || op === "−") &&
      (a - b === answer || b - a === answer || a - answer === b || b - answer === a)) return null;
  if ((op === "x" || op === "*" || op === "×") &&
      (a * b === answer || a * answer === b || answer * b === a)) return null;
  if ((op === "/" || op === "÷") && answer !== 0 &&
      (a / b === answer || (a !== 0 && b / a === answer) || a / answer === b || (b !== 0 && a / b === answer))) {
    return null;
  }

  return fail("arithmetic", `answer ${answer} is not consistent with ${a} and ${b} under ${op}`);
}

export const CHECKS = [
  {
    id: "structureMatch",
    run: (item) => {
      const { ok, problems } = checkStructure(item);
      return ok ? null : fail("structureMatch", problems.join("; "));
    },
  },

  { id: "arithmetic", run: arithmeticCheck },

  {
    id: "answerGivenAway",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      const answer = item.question?.answer;
      if (typeof answer !== "number") return null;

      // An explicit unknown marker IS the answer slot, so nothing is given
      // away no matter which numbers appear. `4 + ? = 8` has answer 4 — the
      // answer coincides with a given because it is a double, not because the
      // item leaks. Checking for the digit alone flagged 220 such items.
      if (/[?_]|___/.test(text)) return null;

      const nums = numbersIn(text);
      if (!nums.includes(answer)) return null;

      // In prose, the answer appearing is only suspicious when it is a number
      // ADDITIONAL to the givens; equalling a given is arithmetic coincidence.
      const givens = [item.question?.a, item.question?.b].filter((n) => typeof n === "number");
      if (givens.includes(answer)) return null;

      return warn("answerGivenAway", `the answer ${answer} appears in the prompt — check it is not stated outright`);
    },
  },

  {
    id: "negativeOrFractionalAnswer",
    run: (item) => {
      const answer = item.question?.answer;
      if (typeof answer !== "number") return null;
      if (answer < 0) return fail("negativeAnswer", `answer is negative (${answer})`);
      if (!Number.isInteger(answer) && !/decimal|fraction/i.test(item.modeId || "")) {
        return fail("fractionalAnswer", `answer is not a whole number (${answer})`);
      }
      return null;
    },
  },

  {
    id: "promptLength",
    run: (item) => {
      const text = (item.question?.display?.promptText || "").trim();
      if (!text) return fail("emptyPrompt", "prompt is empty");
      if (text.length > 220) return fail("promptLength", `prompt is ${text.length} chars (limit 220)`);
      if (text.split(/[.!?]+/).filter((s) => s.trim()).length > 3) {
        return warn("promptSentences", "more than 2 sentences — the authoring guide asks for 1-2");
      }
      return null;
    },
  },

  {
    id: "placeholderLeak",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      if (/\{|\}|\bundefined\b|\bNaN\b|\bnull\b|\$\{/.test(text)) {
        return fail("placeholderLeak", "prompt contains an unfilled placeholder or undefined value");
      }
      return null;
    },
  },

  {
    id: "grammarAgreement",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      // "1 apples" — the classic generated-prose tell.
      //
      // Matching "1 <word ending in s>" is far too naive: it flags "1 plus",
      // "1 times", "1 is itself" and "1 glass bead", all correct English. It
      // produced eight findings on the real bank and every one was wrong.
      // Checking against the actual countable-noun vocabulary instead makes
      // this precise — a check that cries wolf gets ignored.
      const match = text.match(/\b1 ([a-z]+)\b/i);
      if (match && COUNTABLE_PLURALS.has(match[1].toLowerCase())) {
        return fail("grammarAgreement", `"${match[0]}" — singular noun needed after 1`);
      }
      return null;
    },
  },

  {
    id: "readability",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      const words = text.split(/\s+/).filter(Boolean);
      const long = words.filter((w) => w.replace(/[^a-z]/gi, "").length > 10);
      if (long.length) {
        return warn("readability", `long words for K-4: ${long.join(", ")}`);
      }
      if (words.length > 40) return warn("readability", `${words.length} words is long for K-4`);
      return null;
    },
  },

  {
    id: "bandAppropriate",
    run: (item) => {
      const [min] = item.levelRange || [];
      const nums = numbersIn(item.question?.display?.promptText || "");
      const max = Math.max(0, ...nums);
      if (min <= 3 && max > 20) {
        return fail("bandAppropriate", `Kindergarten band item uses ${max}; totals should stay within 20`);
      }
      if (min <= 6 && max > 100) {
        return warn("bandAppropriate", `Grade 1-2 band item uses ${max}`);
      }
      return null;
    },
  },

  {
    id: "distractorSanity",
    run: (item) => {
      const choices = item.question?.choices;
      const answer = item.question?.answer;
      if (!Array.isArray(choices)) return null;
      if (!choices.includes(answer)) return fail("distractorSanity", "choices do not include the answer");
      if (new Set(choices).size !== choices.length) {
        return fail("distractorSanity", "choices contain a duplicate");
      }
      if (choices.some((c) => typeof c === "number" && c < 0)) {
        return fail("distractorSanity", "a choice is negative");
      }
      return null;
    },
  },
];

/** Run every deterministic check. */
export function runChecks(item) {
  const findings = [];
  for (const check of CHECKS) {
    try {
      const result = check.run(item);
      if (result) findings.push(result);
    } catch (err) {
      findings.push(warn(check.id, `check threw: ${err.message}`));
    }
  }
  return {
    itemId: item.itemId,
    pass: !findings.some((f) => f.severity === "fail"),
    findings,
  };
}

export const CHECK_IDS = CHECKS.map((c) => c.id);

/**
 * Run the checks on an item in the ADMIN shape (payload / levelMin / levelMax)
 * rather than the in-memory bank shape (question / levelRange). The admin UI
 * and the CLI QC run the exact same checks; this only reconciles the two field
 * conventions so there is one source of truth for what "a bad item" means.
 */
export function runChecksOnAdminItem(adminItem) {
  return runChecks({
    itemId: adminItem.itemId,
    modeId: adminItem.modeId,
    structureType: adminItem.structureType,
    levelRange: [Number(adminItem.levelMin), Number(adminItem.levelMax)],
    question: adminItem.payload,
  });
}
