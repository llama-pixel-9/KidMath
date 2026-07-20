import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildSequenceDistractors, buildDistractors } from "./distractors";
import { maybeApplyFormat } from "./formats";

/**
 * Number and shape patterns (Grade 3-4, 4.OA.C) — variety catalog from
 * docs/spec-part-c2-fractions-patterns.md §patterns.
 *
 * Three things were wrong with the old mode and are fixed here:
 *
 *  1. Every item read left to right and asked for the next term. The catalog
 *     now extends leftwards, fills a gap, states a rule, applies a stated rule,
 *     finds a broken term, and reasons about the sequence without extending it.
 *  2. Repeating (AB / ABC) patterns — the Grade 1-2 form — did not exist at all.
 *  3. `chooseFamily()` wrote `application` into metadata for items that
 *     rendered identically to procedural ones (spec §D4). Family is now a
 *     property of the variety, and the application varieties really are word
 *     problems.
 */

const SUBSKILLS = [
  "repeatingPattern",
  "arithmeticNext",
  "geometricNext",
  "missingTerm",
  "patternRule",
];

// Geometric items carry a real `a x b = answer` relation, so the format layer
// can re-present them. Arithmetic items deliberately do not: setting op "+"
// with two-digit operands makes MathExplorer render them as a vertical sum,
// which would throw away the sequence.
const SUPPORTED_FORMATS = ["trueFalse", "commutative", "missingOperator", "errorAnalysis", "estimation"];

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava", "Priya", "Owen", "Jonas", "Kaia"];

const SHAPE_SETS = [
  ["circle", "square"],
  ["red", "blue"],
  ["star", "moon"],
  ["up", "down"],
  ["circle", "square", "triangle"],
  ["red", "red", "blue"],
];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandFor = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);
const ordinal = (k) => ({ 1: "1st", 2: "2nd", 3: "3rd" }[k] || `${k}th`);

function optionSet(answer, wrong) {
  const seen = new Set([answer]);
  const out = [answer];
  for (const w of wrong) {
    if (w == null || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length === 4) break;
  }
  return shuffleArray(out);
}

/** Step size by band. Structure varies first; this is the secondary dial. */
function stepFor(band) {
  if (band === 1) return randInt(2, 5);
  if (band === 2) return randInt(2, 9);
  return randInt(3, 12);
}

const CONCEPTUAL = ITEM_FAMILIES.CONCEPTUAL;
const PROCEDURAL = ITEM_FAMILIES.PROCEDURAL;
const APPLICATION = ITEM_FAMILIES.APPLICATION;

export const PATTERN_VARIETIES = [
  // --- repeating patterns --------------------------------------------------
  {
    id: "repeatingShapeNext",
    subskill: "repeatingPattern",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK1",
    representation: "visual",
    misconceptions: ["coreMiscounted", "repeatsLastTerm"],
    build() {
      const core = pick(SHAPE_SETS);
      const shown = [];
      const length = core.length * 2 + randInt(0, core.length - 1);
      for (let i = 0; i < length; i += 1) shown.push(core[i % core.length]);
      const answer = core[length % core.length];
      const distinct = [...new Set(core)];
      return {
        answer,
        answerType: "choice",
        choices: distinct.length >= 2 ? shuffleArray([...distinct]) : ["circle", "square"],
        prompt: `Pattern: ${shown.join(", ")}, ? — what comes next?`,
        display: { sequence: shown },
      };
    },
  },

  {
    id: "repeatingCoreIdentify",
    subskill: "repeatingPattern",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "visual",
    misconceptions: ["coreMiscounted"],
    build() {
      const core = pick(SHAPE_SETS);
      const shown = [];
      for (let i = 0; i < core.length * 3; i += 1) shown.push(core[i % core.length]);
      const answer = core.join(", ");
      return {
        answer,
        answerType: "choice",
        choices: optionSet(answer, [
          core.slice(0, core.length - 1).join(", "),
          [...core, core[0]].join(", "),
          [...core].reverse().join(", "),
          core[0],
        ]),
        prompt: `Pattern: ${shown.join(", ")}. Which part repeats?`,
        display: { sequence: shown },
      };
    },
  },

  // --- arithmetic sequences ------------------------------------------------
  {
    id: "arithmeticNext",
    subskill: "arithmeticNext",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "sequence",
    misconceptions: ["wrongStep", "patternReset", "repeatsLastTerm"],
    build(band) {
      const start = randInt(0, 9);
      const step = stepFor(band);
      const sequence = [start, start + step, start + 2 * step, start + 3 * step];
      return {
        answer: start + 4 * step,
        answerType: "fillBlank",
        prompt: `Pattern: ${sequence.join(", ")}, ? — what comes next?`,
        display: { sequence, step },
        step,
      };
    },
  },

  {
    id: "arithmeticBackwards",
    subskill: "arithmeticNext",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "sequence",
    misconceptions: ["backwardsAddsInstead", "wrongStep"],
    build(band) {
      const step = stepFor(band);
      const first = randInt(1, 9) + step; // keeps the hidden term positive
      const sequence = ["?", first, first + step, first + 2 * step, first + 3 * step];
      return {
        answer: first - step,
        answerType: "fillBlank",
        prompt: `Pattern: ${sequence.join(", ")} — what comes first?`,
        display: { sequence, step },
        step,
      };
    },
  },

  {
    id: "subtractPattern",
    subskill: "arithmeticNext",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "sequence",
    misconceptions: ["wrongStep", "backwardsAddsInstead"],
    build(band) {
      const step = stepFor(band);
      const answer = randInt(1, 20);
      const start = answer + 4 * step;
      const sequence = [start, start - step, start - 2 * step, start - 3 * step];
      return {
        answer,
        answerType: "fillBlank",
        prompt: `Pattern: ${sequence.join(", ")}, ? — what comes next?`,
        display: { sequence, step },
        step,
      };
    },
  },

  {
    id: "missingTerm",
    subskill: "missingTerm",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "sequence",
    misconceptions: ["repeatsLastTerm", "wrongStep"],
    build(band) {
      const start = randInt(1, 9);
      const step = stepFor(band);
      const full = [start, start + step, start + 2 * step, start + 3 * step];
      const gap = randInt(1, 2); // never the first or last term
      const sequence = full.map((v, i) => (i === gap ? "?" : v));
      return {
        answer: full[gap],
        answerType: "fillBlank",
        prompt: `Fill the gap: ${sequence.join(", ")}.`,
        display: { sequence, step },
        step,
      };
    },
  },

  // --- geometric sequences -------------------------------------------------
  {
    id: "geometricNext",
    subskill: "geometricNext",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "sequence",
    misconceptions: ["additiveForMultiplicative", "wrongStep"],
    build(band) {
      const start = randInt(1, band === 1 ? 2 : 4);
      const factor = band === 1 ? 2 : randInt(2, 3);
      const sequence = [start, start * factor, start * factor ** 2, start * factor ** 3];
      const last = sequence[3];
      return {
        answer: last * factor,
        answerType: "fillBlank",
        prompt: `Pattern: ${sequence.join(", ")}, ? — each term is ${factor} times the one before.`,
        display: { sequence, step: factor },
        relation: { a: last, b: factor, op: "x" },
      };
    },
  },

  // --- rules ---------------------------------------------------------------
  {
    id: "ruleIdentify",
    subskill: "patternRule",
    bands: [2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "sequence",
    misconceptions: ["additiveForMultiplicative", "wrongStep"],
    build(band) {
      const multiplicative = Math.random() < 0.5;
      if (multiplicative) {
        const factor = randInt(2, 4);
        const start = randInt(1, 4);
        const sequence = [start, start * factor, start * factor ** 2, start * factor ** 3];
        const answer = `multiply by ${factor}`;
        return {
          answer,
          answerType: "choice",
          choices: optionSet(answer, [
            `add ${factor}`,
            `multiply by ${factor + 1}`,
            `add ${sequence[1] - sequence[0]}`,
            `subtract ${factor}`,
          ]),
          prompt: `Pattern: ${sequence.join(", ")}. What is the rule?`,
          display: { sequence },
        };
      }
      const step = stepFor(band);
      const start = randInt(1, 9);
      const sequence = [start, start + step, start + 2 * step, start + 3 * step];
      const answer = `add ${step}`;
      return {
        answer,
        answerType: "choice",
        choices: optionSet(answer, [
          `add ${step + 1}`,
          `subtract ${step}`,
          `multiply by ${step}`,
          `add ${step - 1 > 0 ? step - 1 : step + 2}`,
        ]),
        prompt: `Pattern: ${sequence.join(", ")}. What is the rule?`,
        display: { sequence },
      };
    },
  },

  {
    id: "applyGivenRule",
    subskill: "patternRule",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "sequence",
    misconceptions: ["stepCountOffByOne", "patternReset"],
    build(band) {
      const start = randInt(2, 9);
      const step = stepFor(band);
      const term = randInt(3, band === 1 ? 4 : 6);
      return {
        answer: start + (term - 1) * step,
        answerType: "fillBlank",
        prompt: `Start at ${start} and add ${step} each time. What is the ${ordinal(term)} number?`,
        display: { start, step, term },
        step,
      };
    },
  },

  {
    id: "findTheError",
    subskill: "patternRule",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK3",
    representation: "sequence",
    misconceptions: ["wrongStep", "repeatsLastTerm"],
    build(band) {
      const who = pick(NAMES);
      const start = randInt(2, 9);
      const step = stepFor(band);
      const full = [start, start + step, start + 2 * step, start + 3 * step, start + 4 * step];
      const badIndex = randInt(1, 3);
      const drift = Math.random() < 0.5 ? 1 : -1;
      const broken = full[badIndex] + drift;
      const shown = full.map((v, i) => (i === badIndex ? broken : v));
      return {
        answer: broken,
        answerType: "choice",
        choices: shown.slice(0, 4).includes(broken)
          ? shuffleArray([...new Set(shown.slice(0, 4))])
          : shuffleArray([...new Set([broken, ...shown.slice(0, 3)])]),
        prompt: `${who} wrote ${shown.join(", ")}. Which number is wrong?`,
        display: { sequence: shown },
      };
    },
  },

  {
    id: "growingShapePattern",
    subskill: "patternRule",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK3",
    representation: "visual",
    misconceptions: ["stepCountOffByOne", "wrongStep"],
    build() {
      const start = randInt(2, 5);
      const step = randInt(2, 4);
      const target = randInt(5, 7);
      return {
        answer: start + (target - 1) * step,
        answerType: "numberPad",
        prompt: `Step 1 has ${start} tiles, step 2 has ${start + step}, step 3 has ${
          start + 2 * step
        }. How many tiles are in step ${target}?`,
        display: { start, step, term: target },
        step,
      };
    },
  },

  {
    id: "patternFeature",
    subskill: "patternRule",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK3",
    representation: "sequence",
    misconceptions: ["patternReset", "stepCountOffByOne"],
    build() {
      const step = randInt(2, 6);
      const start = randInt(1, 8);
      const sequence = [start, start + step, start + 2 * step, start + 3 * step];
      const term = randInt(8, 12);
      const value = start + (term - 1) * step;
      const even = value % 2 === 0;
      return {
        answer: even ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        prompt: `The pattern ${sequence.join(
          ", "
        )} keeps adding ${step}. Will the ${ordinal(term)} number be even?`,
        display: { sequence },
      };
    },
  },

  // --- the missing application family (spec §D4) ---------------------------
  {
    id: "patternInContext",
    subskill: "arithmeticNext",
    bands: [1, 2, 3],
    family: APPLICATION,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["stepCountOffByOne", "patternReset"],
    build(band) {
      const who = pick(NAMES);
      const step = band === 1 ? randInt(2, 5) : randInt(3, 9);
      const start = band === 1 ? randInt(1, 6) : randInt(5, 20);
      const weeks = randInt(3, band === 1 ? 4 : 6);
      return {
        answer: start + step * weeks,
        answerType: "numberPad",
        prompt: `${who} starts with ${start} stickers and earns ${step} more every week. How many stickers after ${weeks} weeks?`,
        display: { start, step, term: weeks },
        step,
      };
    },
  },
];

function selectVariety(level, context) {
  const band = bandFor(level);
  const inBand = PATTERN_VARIETIES.filter((v) => v.bands.includes(band));
  const base =
    context?.allowWordProblems === false
      ? inBand.filter((v) => v.family !== APPLICATION)
      : inBand;
  const pool = base.length ? base : inBand;

  let candidates = pool;
  if (context?.itemFamily) {
    const byFamily = candidates.filter((v) => v.family === context.itemFamily);
    if (byFamily.length) candidates = byFamily;
  }
  if (context?.targetSubskill) {
    const bySubskill = candidates.filter((v) => v.subskill === context.targetSubskill);
    if (bySubskill.length) candidates = bySubskill;
  }
  return pick(candidates.length ? candidates : pool);
}

export default {
  id: "patterns",
  label: "Pattern Power!",
  shortLabel: "Patterns",
  description: "Extend, complete, and explain number and shape patterns.",
  icon: "Spline",
  op: "pattern",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varietyIds: PATTERN_VARIETIES.map((v) => v.id),

  generate(level, context = {}) {
    const band = bandFor(level);
    const variety = selectVariety(level, context);
    const built = variety.build(band, level);

    const question = {
      op: built.relation?.op || "pattern",
      answer: built.answer,
      level,
      display: {
        promptText: built.prompt,
        representation: variety.representation,
        ...(built.display || {}),
      },
    };
    if (built.relation) {
      question.a = built.relation.a;
      question.b = built.relation.b;
    }
    if (built.step != null) question.step = built.step;
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "patterns",
      level,
      domain: "OA",
      cluster: "Generate and analyze patterns",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: variety.demand,
      representation: variety.representation,
      mathPractices: ["MP3", "MP7", "MP8"],
      standardRefs: ["3.OA", "4.OA"],
      misconceptionTags: variety.misconceptions,
      blueprintId: `patterns-${variety.family}-${variety.id}`,
    });

    return built.relation
      ? maybeApplyFormat(question, level, { actor: pick(NAMES), ...context }, SUPPORTED_FORMATS)
      : question;
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices) && question.choices.length >= 2) {
      return question.choices;
    }
    const misconceptions = question?.metadata?.misconceptionTags || [];
    if (typeof question?.step === "number" && question.step > 0) {
      return buildSequenceDistractors({ answer, step: question.step, misconceptions });
    }
    return buildDistractors({ answer, misconceptions, min: 0 });
  },
};
