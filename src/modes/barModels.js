import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";
import { maybeApplyFormat } from "./formats";

/**
 * Bar models / "model drawing" — the Singapore model method, and the variety
 * catalog in docs/spec-part-c2-fractions-patterns.md §barModels, which covers
 * all seven schemas of research §3.2.
 *
 * `barModels` is not a topic, it is a REPRESENTATION. The organising insight
 * from §3.2 is that variety comes from *moving the blank on one diagram*, not
 * from drawing new pictures: schema (b) is a single part-whole bar with three
 * possible unknowns, and rows 2 and 3 below are exactly that same picture with
 * the question changed.
 *
 * Which rows render a drawn bar is constrained by the widget, not by choice:
 * `BarModel` can only draw a part-whole bar whose whole and one part are known,
 * or a comparison bar whose smaller amount and difference are known. Any row
 * whose unknown sits elsewhere would have to print the answer inside the
 * diagram to draw it, so those rows are asked as typed or multiple-choice
 * items. The structure — which is what the spec is actually about — is intact
 * either way.
 */

const SUBSKILLS = ["partWhole", "comparison", "multiplicative", "fractionBar"];

// Only part-whole rows carry a literal `a - b = answer` relation. `-` (ASCII)
// is deliberate: MathExplorer renders a vertical sum for "+" and "−" (U+2212),
// which would replace the word problem with an arithmetic column.
const SUPPORTED_FORMATS = [
  "trueFalse",
  "equationReversed",
  "missingOperator",
  "errorAnalysis",
  "estimation",
];

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava", "Priya", "Owen", "Jonas", "Kaia"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandFor = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);

/** Number ceiling per band. Secondary to the schema. */
function scaleFor(band) {
  if (band === 1) return 20;
  if (band === 2) return 100;
  return 1000;
}

function two(names) {
  const a = pick(names);
  let b = pick(names);
  let guard = 0;
  while (b === a && guard++ < 20) b = pick(names);
  return [a, b];
}

function optionSet(answer, wrong) {
  const seen = new Set([answer]);
  const out = [answer];
  for (const w of wrong) {
    if (w == null || seen.has(w) || !Number.isInteger(w) || w <= 0) continue;
    seen.add(w);
    out.push(w);
    if (out.length === 4) break;
  }
  return shuffleArray(out);
}

const CONCEPTUAL = ITEM_FAMILIES.CONCEPTUAL;
const PROCEDURAL = ITEM_FAMILIES.PROCEDURAL;
const APPLICATION = ITEM_FAMILIES.APPLICATION;

export const BAR_VARIETIES = [
  // --- §3.2 (a) part-whole, total unknown ---------------------------------
  {
    id: "partWholeTotalUnknown",
    subskill: "partWhole",
    bands: [1, 2, 3],
    family: APPLICATION,
    demand: "DOK1",
    representation: "verbalContext",
    misconceptions: ["operationSwap", "offByOne"],
    build(band) {
      const max = scaleFor(band);
      const [one, other] = two(NAMES);
      const p1 = randInt(2, Math.max(3, Math.floor(max / 2)));
      const p2 = randInt(2, Math.max(3, Math.floor(max / 2)));
      const thing = pick(["oranges", "shells", "buttons", "stamps"]);
      return {
        answer: p1 + p2,
        answerType: "choice",
        prompt: `${one} has ${p1} ${thing}. ${other} has ${p2} ${thing}. How many ${thing} are there altogether?`,
        given: { a: p1, b: p2 },
      };
    },
  },

  // --- §3.2 (b) part-whole, one part unknown — one diagram, blank moved ----
  {
    id: "partWholePartUnknown",
    subskill: "partWhole",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "manipulative",
    misconceptions: ["partWholeSwap", "operationSwap", "offByOne"],
    build(band) {
      const max = scaleFor(band);
      const whole = randInt(4, max);
      const part = randInt(1, whole - 1);
      const who = pick(NAMES);
      return {
        answer: whole - part,
        answerType: "barModel",
        prompt: `${who} has ${whole} lego bricks and uses ${part} of them to build a car. How many bricks are left?`,
        display: { type: "barPartWhole", whole, part },
        relation: { a: whole, b: part, op: "-" },
      };
    },
  },

  {
    id: "partWholeFirstPartUnknown",
    subskill: "partWhole",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "manipulative",
    misconceptions: ["partWholeSwap", "operationSwap", "offByOne"],
    build(band) {
      const max = scaleFor(band);
      const whole = randInt(4, max);
      const part = randInt(1, whole - 1);
      const [first, second] = two(["blue", "red", "green", "yellow"]);
      return {
        answer: whole - part,
        answerType: "barModel",
        prompt: `A box holds ${whole} crayons. ${part} are ${first} and the rest are ${second}. How many are ${second}?`,
        display: { type: "barPartWhole", whole, part },
        relation: { a: whole, b: part, op: "-" },
      };
    },
  },

  {
    id: "partWholeThreeParts",
    subskill: "partWhole",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["partWholeSwap", "operationSwap"],
    build(band) {
      const max = scaleFor(band);
      const p1 = randInt(2, Math.floor(max / 4));
      const p2 = randInt(2, Math.floor(max / 4));
      const p3 = randInt(2, Math.floor(max / 4));
      const whole = p1 + p2 + p3;
      const who = pick(NAMES);
      return {
        answer: p3,
        answerType: "numberPad",
        prompt: `${who} read ${p1} pages on Monday, ${p2} on Tuesday, and some on Wednesday. ${who} read ${whole} pages in all. How many pages on Wednesday?`,
        given: { a: whole, b: p1 + p2 },
      };
    },
  },

  // --- §3.2 (c) comparison, five blanks on one picture --------------------
  {
    id: "compareDifferenceUnknown",
    subskill: "comparison",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["operationSwap", "compareDirection", "offByOne"],
    build(band) {
      const max = scaleFor(band);
      const [one, other] = two(NAMES);
      const big = randInt(5, max);
      const small = randInt(1, big - 1);
      const thing = pick(["lego bricks", "marbles", "cards", "coins"]);
      return {
        answer: big - small,
        answerType: "numberPad",
        prompt: `${one} has ${big} ${thing}. ${other} has ${small}. How many more does ${one} have?`,
        given: { a: big, b: small },
      };
    },
  },

  {
    id: "compareBiggerUnknownMore",
    subskill: "comparison",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "manipulative",
    misconceptions: ["compareDirection", "keywordTrap", "offByOne"],
    build(band) {
      const max = scaleFor(band);
      const a = randInt(2, max);
      const diff = randInt(1, Math.max(2, Math.floor(max / 2)));
      const [one, other] = two(NAMES);
      return {
        answer: a + diff,
        answerType: "barModel",
        prompt: `${one} scored ${a} points. ${other} scored ${diff} more than ${one}. How many points did ${other} score?`,
        display: { type: "barCompare", a, diff },
      };
    },
  },

  {
    id: "compareSmallerUnknownFewer",
    subskill: "comparison",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["compareDirection", "operationSwap"],
    build(band) {
      const max = scaleFor(band);
      const big = randInt(5, max);
      const diff = randInt(1, big - 1);
      const [one, other] = two(NAMES);
      return {
        answer: big - diff,
        answerType: "numberPad",
        prompt: `${other} has ${diff} fewer bricks than ${one}, who has ${big}. How many bricks does ${other} have?`,
        given: { a: big, b: diff },
      };
    },
  },

  {
    id: "compareSmallerUnknownMore",
    subskill: "comparison",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "verbalContext",
    // The language trap: the sentence says "more" and is solved by subtracting.
    // `keywordTrap` offers big + diff, which is exactly what a keyword-matcher
    // computes.
    misconceptions: ["keywordTrap", "compareDirection"],
    build(band) {
      const max = scaleFor(band);
      const big = randInt(10, max);
      const diff = randInt(2, Math.max(3, Math.floor(big / 2)));
      const [one, other] = two(NAMES);
      return {
        answer: big - diff,
        answerType: "choice",
        prompt: `${one} has ${diff} more stickers than ${other}. ${one} has ${big} stickers. How many stickers does ${other} have?`,
        given: { a: big, b: diff },
      };
    },
  },

  {
    id: "compareBiggerUnknownFewer",
    subskill: "comparison",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "manipulative",
    misconceptions: ["keywordTrap", "compareDirection"],
    build(band) {
      const max = scaleFor(band);
      const a = randInt(5, Math.floor(max / 2));
      const diff = randInt(2, Math.max(3, Math.floor(max / 4)));
      const [one, other] = two(NAMES);
      return {
        answer: a + diff,
        answerType: "barModel",
        prompt: `${one} has ${diff} fewer marbles than ${other}. ${one} has ${a} marbles. How many marbles does ${other} have?`,
        display: { type: "barCompare", a, diff },
      };
    },
  },

  // --- §3.2 (d) multiplicative comparison ---------------------------------
  {
    id: "multiplicativeTotalUnknown",
    subskill: "multiplicative",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["compareAsAdditive", "unitNotDefined"],
    build(band) {
      const unit = randInt(3, band === 2 ? 12 : 30);
      const times = randInt(2, 4);
      const [one, other] = two(NAMES);
      return {
        answer: unit + unit * times,
        answerType: "numberPad",
        prompt: `${one} has ${unit} flowers. ${other} has ${times} times as many as ${one}. How many flowers do they have altogether?`,
        given: { a: unit, b: unit * times },
      };
    },
  },

  {
    id: "multiplicativeUnitUnknown",
    subskill: "multiplicative",
    bands: [3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["unitNotDefined", "compareAsAdditive"],
    build() {
      const unit = randInt(4, 30);
      const times = randInt(2, 4);
      const total = unit * times;
      const [one, other] = two(NAMES);
      return {
        answer: unit,
        answerType: "choice",
        prompt: `${one} has ${total} flowers, which is ${times} times as many as ${other}. How many flowers does ${other} have?`,
        given: { a: total, b: times },
        distractors: [total * times, total - times, total + times],
      };
    },
  },

  {
    id: "multiplicativeCompareFactor",
    subskill: "multiplicative",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK3",
    representation: "verbalContext",
    misconceptions: ["compareAsAdditive", "divisionReversed"],
    build() {
      const unit = randInt(3, 12);
      const times = randInt(2, 6);
      const big = unit * times;
      const [one, other] = two(NAMES);
      return {
        answer: times,
        answerType: "numberPad",
        prompt: `${one} has ${big} beads and ${other} has ${unit}. How many times as many beads does ${one} have?`,
        given: { a: big, b: unit },
      };
    },
  },

  // --- §3.2 (e) two-step -----------------------------------------------
  {
    id: "twoStepCompareThenTotal",
    subskill: "comparison",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "verbalContext",
    // Chains Compare/Smaller (middle tier) with Part-Whole/Total (easy), never
    // two hard subtypes — the Progressions constraint quoted in the spec.
    misconceptions: ["stopsAtStepOne", "operationSwap"],
    build() {
      const girls = randInt(120, 900);
      const diff = randInt(10, Math.floor(girls / 2));
      const boys = girls - diff;
      return {
        answer: girls + boys,
        answerType: "numberPad",
        prompt: `There are ${girls} girls in the hall. There are ${diff} more girls than boys. How many children are in the hall in all?`,
        given: { a: girls, b: boys },
      };
    },
  },

  // --- §3.2 (g) fraction of a set on a bar --------------------------------
  {
    id: "fractionOfSetBar",
    subskill: "fractionBar",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "manipulative",
    misconceptions: ["fractionUnitMiscount"],
    build(band) {
      const den = pick([2, 3, 4, 5, 6]);
      const num = randInt(1, den - 1);
      const groups = randInt(2, band === 2 ? 5 : 8);
      const total = den * groups;
      const who = pick(NAMES);
      return {
        answer: groups * num,
        answerType: "fractionSet",
        prompt: `${who} has ${total} trucks. ${num}/${den} of them are painted red. How many trucks are red?`,
        display: { set: { total, num, den } },
      };
    },
  },

  {
    id: "fractionOfSetRemainder",
    subskill: "fractionBar",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "verbalContext",
    misconceptions: ["remainderIsWhole", "fractionUnitMiscount"],
    build() {
      const den = pick([3, 4, 5, 6]);
      const num = randInt(1, den - 1);
      const unit = randInt(10, 40);
      const total = den * unit;
      const rest = (den - num) * unit;
      const who = pick(NAMES);
      return {
        answer: total,
        answerType: "choice",
        prompt: `${who} read ${num}/${den} of a book on Saturday and the other ${rest} pages on Sunday. How many pages are in the book?`,
        given: { a: rest, b: num * unit },
        distractors: [rest, rest + num, num * unit, total + unit],
      };
    },
  },

  // --- §3.2 (f) before/after with a constant difference --------------------
  {
    id: "beforeAfterConstantDifference",
    subskill: "comparison",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "verbalContext",
    misconceptions: ["operationSwap", "stopsAtStepOne"],
    build() {
      // Each earns x; afterwards the first has twice the second:
      //   first + x = 2 (second + x)  =>  first = 2*second + x
      const earn = randInt(5, 60);
      const second = randInt(10, 80);
      const first = 2 * second + earn;
      const [one, other] = two(NAMES);
      return {
        answer: earn,
        answerType: "numberPad",
        prompt: `${one} had $${first} saved and ${other} had $${second}. They each earned the same amount, and then ${one} had twice as much as ${other}. How much did each earn?`,
        given: { a: first, b: second },
      };
    },
  },
];

function selectVariety(level, context) {
  const band = bandFor(level);
  const inBand = BAR_VARIETIES.filter((v) => v.bands.includes(band));
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
  id: "barModels",
  label: "Bar Models!",
  shortLabel: "Bar Models",
  description: "Draw the bar, find the missing amount.",
  icon: "BarChart3",
  op: "bar",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varietyIds: BAR_VARIETIES.map((v) => v.id),

  generate(level, context = {}) {
    const band = bandFor(level);
    const variety = selectVariety(level, context);
    const built = variety.build(band, level);

    const question = {
      op: built.relation?.op || "bar",
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
    } else if (built.given) {
      // Not an equation, but the two quantities the child was given: the
      // distractor strategies need them to model a wrong operation.
      question.a = built.given.a;
      question.b = built.given.b;
    }
    if (built.answerType) question.answerType = built.answerType;
    if (built.distractors) question.extraDistractors = built.distractors;

    question.metadata = createQuestionMetadata({
      modeId: "barModels",
      level,
      domain: "OA",
      cluster: "Represent and solve problems with bar models",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: variety.demand,
      representation: variety.representation,
      mathPractices: ["MP1", "MP2", "MP4"],
      standardRefs: ["2.OA", "3.OA", "4.OA"],
      misconceptionTags: variety.misconceptions,
      blueprintId: `barModels-${variety.family}-${variety.id}`,
    });

    return built.relation
      ? maybeApplyFormat(question, level, { actor: pick(NAMES), ...context }, SUPPORTED_FORMATS)
      : question;
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices) && question.choices.length >= 2) {
      return question.choices;
    }
    const extras = Array.isArray(question?.extraDistractors) ? question.extraDistractors : [];
    if (extras.length) {
      const options = optionSet(answer, extras);
      if (options.length >= 2) return options;
    }
    return buildDistractors({
      answer,
      a: question?.a,
      b: question?.b,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 1,
    });
  },
};
