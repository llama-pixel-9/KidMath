import { randInt, shuffleArray } from "./helpers";
import { buildComparingDistractors, buildDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

/**
 * comparing — Compare Quest! (spec-part-c1-number-sense.md §comparing)
 *
 * Before M4: one shape (two numerals, pick a symbol) and a "word problem" that
 * was the same item with a sentence in front of it. Two of the three declared
 * subskills were never realised.
 *
 * The spec calls #8 `relationalNoCompute` the most important row in this mode: a
 * child who computes both sides of `37 + 48 ___ 38 + 47` has missed the point.
 * That variety, plus `compareExpressions` and `trueFalseInequality`, is what
 * finally gives the `equalSignMisread` tag something to fire on — it existed in
 * metadata with no item behind it.
 *
 * No format transforms are wired: the equality formats all need an `a op b =
 * answer` relation, and a comparison has none. The transforms this mode wants
 * (true/false, odd-one-out, error analysis) are first-class varieties instead.
 */

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava"];
const OBJECTS = ["🍎", "⭐", "🐟", "🌸", "🍪", "🐢"];

const SUBSKILLS = ["symbolSelection", "benchmarkCompare", "distanceCompare"];
const SUPPORTED_FORMATS = [];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);

const RANGES = [
  { min: 1, max: 5 },
  { min: 1, max: 9 },
  { min: 1, max: 15 },
  { min: 1, max: 20 },
  { min: 1, max: 30 },
  { min: 5, max: 50 },
  { min: 10, max: 75 },
  { min: 10, max: 100 },
  { min: 50, max: 500 },
  { min: 100, max: 1000 },
];

const rangeFor = (level) => RANGES[Math.min(Math.max(level, 1), RANGES.length) - 1];

/** The comparison symbol relating two values. Always derived, never assumed. */
const symbolFor = (x, y) => (x > y ? ">" : x < y ? "<" : "=");

const units = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

const VARIETIES = [
  // 1 — 1.NBT.3 / 2.NBT.4 pick the symbol.
  {
    id: "symbolBetweenNumerals",
    bands: [1, 2, 3],
    subskill: "symbolSelection",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const r = rangeFor(level);
      const a = randInt(r.min, r.max);
      // Spec reviewer note: 20% equals over-represented "=" badly against a
      // 3-option picker. 12% keeps it visible without padding the frequency.
      const b = Math.random() < 0.12 ? a : randInt(r.min, r.max);
      return {
        a,
        b,
        answer: symbolFor(a, b),
        answerType: "symbolSelect",
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptions: ["symbolFlip", "moreDigitsMoreValue"],
      };
    },
  },

  // 2 — K.CC.6 which group has more?
  {
    id: "compareObjectSets",
    bands: [1, 2],
    subskill: "distanceCompare",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const a = randInt(3, 9);
      let b = randInt(3, 9);
      while (b === a) b = randInt(3, 9);
      const emoji = pick(OBJECTS);
      return {
        answer: a > b ? "Basket A" : "Basket B",
        choices: ["Basket A", "Basket B"],
        display: {
          promptText: `Basket A: ${emoji.repeat(a)} Basket B: ${emoji.repeat(b)} Which basket has more?`,
        },
        representation: "objectSet",
        cognitiveDemand: "DOK2",
        misconceptions: ["moreDigitsMoreValue"],
      };
    },
  },

  // 3 — compare two expressions rather than two numerals.
  {
    id: "compareExpressions",
    bands: [2, 3],
    subskill: "symbolSelection",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const top = bandOf(level) === 2 ? 9 : 20;
      const a1 = randInt(2, top);
      const a2 = randInt(2, top);
      const equal = Math.random() < 0.35;
      const b1 = equal ? a2 : randInt(2, top);
      const b2 = equal ? a1 : randInt(2, top);
      return {
        // Strings render straight into the `a ? b` layout, which is what makes
        // an expression comparison expressible at all.
        a: `${a1} + ${a2}`,
        b: `${b1} + ${b2}`,
        answer: symbolFor(a1 + a2, b1 + b2),
        answerType: "symbolSelect",
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["symbolFlip", "equalSignMisread"],
      };
    },
  },

  // 4 — compare stated decompositions, not numerals.
  {
    id: "compareByPlaceValue",
    bands: [2, 3],
    subskill: "symbolSelection",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const t1 = randInt(1, 9);
      const o1 = randInt(0, 9);
      const t2 = randInt(1, 9);
      const o2 = randInt(0, 9);
      return {
        a: `${units(t1, "ten", "tens")} ${units(o1, "one", "ones")}`,
        b: `${units(t2, "ten", "tens")} ${units(o2, "one", "ones")}`,
        answer: symbolFor(t1 * 10 + o1, t2 * 10 + o2),
        answerType: "symbolSelect",
        representation: "decomposition",
        cognitiveDemand: "DOK2",
        misconceptions: ["symbolFlip", "compareLeftmostOnly"],
      };
    },
  },

  // 5 — order a set, not a pair.
  {
    id: "orderThreeNumbers",
    bands: [2, 3],
    subskill: "distanceCompare",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const r = rangeFor(level);
      const set = new Set();
      while (set.size < 3) set.add(randInt(r.min, r.max));
      const nums = [...set];
      const sorted = [...nums].sort((x, y) => x - y);
      const correct = sorted.join(", ");
      const wrong = [
        [sorted[1], sorted[0], sorted[2]],
        [sorted[2], sorted[1], sorted[0]],
        [sorted[0], sorted[2], sorted[1]],
      ].map((arr) => arr.join(", "));
      return {
        answer: correct,
        choices: shuffleArray([...new Set([correct, ...wrong])]),
        display: { promptText: `Put these in order from smallest to largest: ${nums.join(", ")}.` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["moreDigitsMoreValue", "compareLeftmostOnly"],
      };
    },
  },

  // 6 — compare against a landmark without computing.
  {
    id: "benchmarkCompare",
    bands: [2, 3],
    subskill: "benchmarkCompare",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const tens = bandOf(level) === 2 ? randInt(1, 8) : randInt(1, 90);
      let ones = randInt(1, 9);
      while (ones === 5) ones = randInt(1, 9); // a tie has no single right answer
      const n = tens * 10 + ones;
      const lower = tens * 10;
      const upper = lower + 10;
      return {
        answer: ones < 5 ? lower : upper,
        choices: shuffleArray([lower, upper]),
        display: { promptText: `Is ${n} closer to ${lower} or to ${upper}?` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["compareLeftmostOnly"],
      };
    },
  },

  // 7 — judge a stated comparison. `9 = 9` is rejected by children who read "="
  // as "here comes the answer".
  {
    id: "trueFalseInequality",
    bands: [2, 3],
    subskill: "benchmarkCompare",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const r = rangeFor(level);
      const a = randInt(r.min, r.max);
      const b = Math.random() < 0.4 ? a : randInt(r.min, r.max);
      const symbol = pick(["<", ">", "="]);
      return {
        answer: symbolFor(a, b) === symbol ? "True" : "False",
        choices: ["True", "False"],
        display: { promptText: `True or false: ${a} ${symbol} ${b}` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["equalSignMisread", "symbolFlip"],
      };
    },
  },

  // 8 — decidable by compensation; computing is the wrong move.
  {
    id: "relationalNoCompute",
    bands: [3],
    subskill: "symbolSelection",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const a = randInt(21, 49);
      const b = randInt(21, 49);
      const shift = randInt(1, 5);
      const balanced = Math.random() < 0.5;
      const c = a + shift;
      const d = balanced ? b - shift : b - shift + randInt(1, 3);
      return {
        a: `${a} + ${b}`,
        b: `${c} + ${d}`,
        answer: symbolFor(a + b, c + d),
        answerType: "symbolSelect",
        display: { subPrompt: "Try not to add." },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["equalSignMisread", "symbolFlip"],
      };
    },
  },

  // 9 — Table 1 Compare / Difference Unknown.
  {
    id: "differenceUnknown",
    bands: [1, 2, 3],
    subskill: "distanceCompare",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const smaller = bandOf(level) === 1 ? randInt(2, 8) : randInt(5, 40);
      const diff = randInt(1, bandOf(level) === 1 ? 4 : 15);
      const [one, two] = shuffleArray([...NAMES]).slice(0, 2);
      return {
        a: smaller + diff,
        b: smaller,
        answer: diff,
        answerType: "numberPad",
        display: {
          promptText: `${one} has ${smaller + diff} shells and ${two} has ${smaller} shells. How many more shells does ${one} have?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["differenceAsLarger", "operationSwap"],
      };
    },
  },

  // 10 — Compare / Smaller Unknown with "more" language. The Progressions call
  // this phrasing harder, and that is the one difficulty claim in the spec that
  // is actually sourced.
  {
    id: "compareLanguageTrap",
    bands: [3],
    subskill: "distanceCompare",
    family: ITEM_FAMILIES.APPLICATION,
    build: () => {
      const diff = randInt(2, 9);
      const bigger = randInt(diff + 2, diff + 40);
      const [one, two] = shuffleArray([...NAMES]).slice(0, 2);
      return {
        a: bigger,
        b: diff,
        answer: bigger - diff,
        answerType: "numberPad",
        display: {
          promptText: `${one} has ${diff} more books than ${two}. ${one} has ${bigger} books. How many books does ${two} have?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["keywordMore", "operationSwap"],
      };
    },
  },

  // 11 — constraint satisfaction. Several numbers satisfy it, so the options
  // carry the constraint instead of a free-text answer the engine cannot judge.
  {
    id: "whatCouldItBe",
    bands: [2, 3],
    subskill: "benchmarkCompare",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const lo = bandOf(level) === 2 ? randInt(10, 80) : randInt(100, 800);
      const hi = lo + 5;
      const correct = randInt(lo + 1, hi - 1);
      const options = [correct, lo - 1, hi + 1, hi + 4];
      return {
        answer: correct,
        choices: shuffleArray([...new Set(options)]),
        display: { promptText: `Which number is greater than ${lo} and less than ${hi}?` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["compareLeftmostOnly"],
      };
    },
  },

  // 12 — Open Middle. `digitTiles` is unbuilt; `multiSelect` expresses the same
  // "make it true" reasoning with a checkable answer.
  {
    id: "openMiddleMakeItTrue",
    bands: [3],
    subskill: "benchmarkCompare",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const statements = [];
      const truths = [];
      while (truths.length < 2) {
        const x = randInt(10, 98);
        const y = randInt(x + 1, 99);
        const s = `${x} < ${y}`;
        if (!statements.includes(s)) {
          statements.push(s);
          truths.push(s);
        }
      }
      while (statements.length < 4) {
        const x = randInt(11, 99);
        const y = randInt(10, x - 1);
        const s = `${x} < ${y}`;
        if (!statements.includes(s)) statements.push(s);
      }
      return {
        answer: [...truths],
        answerType: "multiSelect",
        display: {
          promptText: "Choose BOTH statements that are true.",
          options: shuffleArray([...statements]),
          requiredCount: 2,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["symbolFlip"],
      };
    },
  },

  // 13 — diagnose a reversed symbol.
  {
    id: "errorAnalysisSymbolFlip",
    bands: [2, 3],
    subskill: "symbolSelection",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const r = rangeFor(level);
      const a = randInt(r.min, r.max);
      let b = randInt(r.min, r.max);
      while (b === a) b = randInt(r.min, r.max);
      const correct = symbolFor(a, b);
      const wrote = correct === "<" ? ">" : "<";
      const actor = pick(NAMES);
      return {
        a,
        b,
        answer: correct,
        answerType: "symbolSelect",
        display: {
          promptText: `${actor} wrote ${a} ${wrote} ${b} and said the open side always points right. Which symbol should ${actor} have used?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["symbolFlip"],
      };
    },
  },

  // 14 — Would You Rather: the comparison IS the work.
  {
    id: "wouldYouRather",
    bands: [3],
    subskill: "benchmarkCompare",
    family: ITEM_FAMILIES.APPLICATION,
    build: () => {
      const bagsA = randInt(3, 6);
      const perA = randInt(8, 14);
      const bagsB = randInt(3, 6);
      let perB = randInt(8, 14);
      // A tie has no better option, so keep drawing until the totals differ.
      while (bagsB * perB === bagsA * perA) perB = randInt(8, 14);
      const optionA = `${bagsA} bags of ${perA}`;
      const optionB = `${bagsB} bags of ${perB}`;
      return {
        answer: bagsA * perA > bagsB * perB ? optionA : optionB,
        choices: shuffleArray([optionA, optionB]),
        display: {
          promptText: `Would you rather have ${optionA} marbles or ${optionB} marbles? Choose the one with more marbles.`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["moreDigitsMoreValue"],
      };
    },
  },

  // 15 — distance on a number line. The widget had no caller before M4 and
  // "how far apart" is exactly the distanceCompare subskill.
  {
    id: "numberLineBetween",
    bands: [2, 3],
    subskill: "distanceCompare",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const scale = bandOf(level) === 2 ? 1 : 5;
      const lo = randInt(1, 9) * (scale * 2);
      const span = 5 * scale * 2;
      const min = lo;
      const max = lo + span;
      const mid = lo + span / 2;
      return {
        answer: mid,
        answerType: "numberLine",
        display: {
          promptText: `Tap the number halfway between ${min} and ${max}.`,
          min,
          max,
          step: scale,
          labelEvery: 5,
          lineMode: "locate",
        },
        representation: "numberLine",
        cognitiveDemand: "DOK2",
        misconceptions: ["compareLeftmostOnly"],
      };
    },
  },
];

export const COMPARING_VARIETY_IDS = VARIETIES.map((v) => v.id);

function chooseVariety(level, context = {}) {
  if (context.varietyId) {
    const forced = VARIETIES.find((v) => v.id === context.varietyId);
    if (forced) return forced;
  }
  const band = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(band));

  if (context.itemFamily) {
    const byFamily = pool.filter((v) => v.family === context.itemFamily);
    const anyBand = VARIETIES.filter((v) => v.family === context.itemFamily);
    pool = byFamily.length ? byFamily : anyBand.length ? anyBand : pool;
  } else if (context.allowWordProblems === false) {
    pool = pool.filter((v) => v.family !== ITEM_FAMILIES.APPLICATION);
  }

  if (context.targetSubskill) {
    // A targeted subskill wins over the band filter too: the session engine asks
    // for the child's weakest subskill, and answering with a different one would
    // silently defeat the adaptive loop. Magnitude still scales with level.
    const inBand = pool.filter((v) => v.subskill === context.targetSubskill);
    const anyBand = VARIETIES.filter((v) => v.subskill === context.targetSubskill);
    if (inBand.length) pool = inBand;
    else if (anyBand.length) pool = anyBand;
  }
  return pool.length ? pick(pool) : VARIETIES[0];
}

export default {
  id: "comparing",
  label: "Compare Quest!",
  shortLabel: "Comparing",
  description: "Greater, less or equal — with numerals, sets, expressions and number lines.",
  icon: "ArrowLeftRight",
  op: "vs",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varieties: COMPARING_VARIETY_IDS,

  generate(level, context = {}) {
    const variety = chooseVariety(level, context);
    const built = variety.build(level);

    const question = {
      a: built.a ?? null,
      b: built.b ?? null,
      // "?" is the renderer's cue to draw `a ? b` with the symbol slot between
      // them; anything else falls through to the prompt text.
      op: built.answerType === "symbolSelect" && !built.display?.promptText ? "?" : "vs",
      answer: built.answer,
      level,
    };
    if (built.display) question.display = built.display;
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "comparing",
      level,
      domain: "NBT",
      cluster: "Compare two numbers",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP6", "MP7"],
      standardRefs: ["K.CC", "1.NBT", "2.NBT"],
      misconceptionTags: built.misconceptions,
      blueprintId: `comparing-${variety.family}-${variety.id}`,
      structureType: variety.id,
    });

    return question;
  },

  generateChoices(answer, question) {
    if (answer === "<" || answer === ">" || answer === "=") {
      return buildComparingDistractors();
    }
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      a: typeof question.a === "number" ? question.a : answer,
      b: typeof question.b === "number" ? question.b : 0,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
