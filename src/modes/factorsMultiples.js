import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";
import { maybeApplyFormat } from "./formats";

/**
 * Factors & multiples (Grade 4, 4.OA.B) — variety catalog from
 * docs/spec-part-c2-fractions-patterns.md §factorsMultiples.
 *
 * The mode used to ask two questions ("how many factors does n have?" and
 * "what is the kth multiple of n?"), which put it below the project's own
 * three-subskill floor. The catalog below separates listing from counting,
 * membership from generation, and — deliberately — asks `isFactorOf` and
 * `isMultipleOf` as a matched pair, because asking both is the only way the
 * `factorMultipleSwap` misconception becomes visible.
 *
 * `nthMultiple` and `factorPairs` carry a real `a x b = answer` relation, so
 * they feed the format layer (true/false, missing operator, fact family,
 * error analysis) for free.
 */

const SUBSKILLS = ["factorCount", "nthMultiple", "factorPairs", "primesAndCommon"];

const SUPPORTED_FORMATS = [
  "trueFalse",
  "equationReversed",
  "commutative",
  "missingOperator",
  "errorAnalysis",
  "estimation",
  "factFamily",
];

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava", "Priya", "Owen", "Jonas", "Kaia"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandFor = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);
const ordinal = (k) => ({ 1: "1st", 2: "2nd", 3: "3rd" }[k] || `${k}th`);

function factorsOf(n) {
  const out = [];
  for (let i = 1; i <= n; i += 1) if (n % i === 0) out.push(i);
  return out;
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) if (n % i === 0) return false;
  return true;
}

function lcm(a, b) {
  let x = a;
  let y = b;
  while (y) [x, y] = [y, x % y];
  return (a * b) / x;
}

/** Numbers a band works with. Structure first, size second. */
function targetPool(band) {
  if (band === 1) return [4, 6, 8, 9, 10, 12];
  if (band === 2) return [12, 14, 15, 16, 18, 20, 24, 25, 28, 30];
  return [24, 30, 32, 36, 40, 42, 45, 48, 50, 54, 60];
}

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

const CONCEPTUAL = ITEM_FAMILIES.CONCEPTUAL;
const PROCEDURAL = ITEM_FAMILIES.PROCEDURAL;
const APPLICATION = ITEM_FAMILIES.APPLICATION;

export const FACTOR_VARIETIES = [
  // --- factors -------------------------------------------------------------
  {
    id: "listFactors",
    subskill: "factorCount",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["missingOneOrSelf", "factorMultipleSwap"],
    build(band) {
      const n = pick(targetPool(band));
      const real = factorsOf(n);
      const decoys = [];
      for (let i = 2; i <= n && decoys.length < 6; i += 1) if (n % i !== 0) decoys.push(i);
      const options = shuffleArray([
        ...shuffleArray([...real]).slice(0, 3),
        ...shuffleArray(decoys).slice(0, 3),
      ]);
      // Graded from the options, never from an assumed list.
      const answer = options.filter((v) => n % v === 0);
      return {
        answer,
        answerType: "multiSelect",
        prompt: `Select every number below that is a factor of ${n}.`,
        display: { options, requiredCount: answer.length },
      };
    },
  },

  {
    id: "factorCount",
    subskill: "factorCount",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["missingOneOrSelf", "squareDoubleCount", "offByOne"],
    build(band) {
      const n = pick(targetPool(band));
      return {
        answer: factorsOf(n).length,
        answerType: "numberPad",
        prompt: `How many factors does ${n} have?`,
      };
    },
  },

  {
    id: "isFactorOf",
    subskill: "factorCount",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["factorMultipleSwap"],
    build(band) {
      const n = pick(targetPool(band));
      const real = factorsOf(n);
      const yes = Math.random() < 0.5;
      let candidate;
      if (yes) {
        candidate = pick(real);
      } else {
        candidate = randInt(2, n);
        let guard = 0;
        while (n % candidate === 0 && guard++ < 40) candidate = randInt(2, n);
        if (n % candidate === 0) candidate = n + 1; // guaranteed non-factor
      }
      return {
        answer: n % candidate === 0 ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        prompt: `Is ${candidate} a factor of ${n}?`,
      };
    },
  },

  {
    id: "oddOneOut",
    subskill: "factorCount",
    bands: [2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["missingOneOrSelf", "factorMultipleSwap"],
    build(band) {
      const n = pick(targetPool(band).filter((v) => factorsOf(v).length >= 5));
      const real = shuffleArray(factorsOf(n).filter((f) => f > 1 && f < n)).slice(0, 3);
      let odd = randInt(2, n - 1);
      let guard = 0;
      while (n % odd === 0 && guard++ < 40) odd = randInt(2, n - 1);
      if (n % odd === 0) odd = n + 1;
      return {
        answer: odd,
        answerType: "choice",
        choices: shuffleArray([...real, odd]),
        prompt: `Which one is NOT a factor of ${n}?`,
      };
    },
  },

  // --- multiples -----------------------------------------------------------
  {
    id: "nthMultiple",
    subskill: "nthMultiple",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["offByOneMultiple", "factNeighbor"],
    build(band) {
      const n = randInt(2, band === 1 ? 5 : band === 2 ? 9 : 12);
      const k = randInt(2, band === 1 ? 5 : 9);
      return {
        answer: n * k,
        answerType: "numberPad",
        prompt: `What is the ${ordinal(k)} multiple of ${n}?`,
        // A true multiplicative relation, so the format layer can re-present it.
        relation: { a: n, b: k, op: "x" },
      };
    },
  },

  {
    id: "isMultipleOf",
    subskill: "nthMultiple",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["factorMultipleSwap"],
    build(band) {
      const n = randInt(2, band === 1 ? 5 : 9);
      const yes = Math.random() < 0.5;
      // Band 1 keeps candidates ≤ 20 (K-1 magnitude rule) — n*9 reached 45.
      const maxK = band === 1 ? Math.max(2, Math.floor(20 / n) - 1) : 9;
      const candidate = yes ? n * randInt(2, maxK) : n * randInt(2, maxK) + randInt(1, n - 1);
      return {
        answer: candidate % n === 0 ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        prompt: `Is ${candidate} a multiple of ${n}?`,
      };
    },
  },

  {
    id: "multiplesInRange",
    subskill: "nthMultiple",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["factorMultipleSwap", "offByOneMultiple"],
    build(band) {
      const n = randInt(3, band === 2 ? 6 : 9);
      const low = n * randInt(2, 4);
      const high = low + n * 4;
      const values = new Set();
      for (let v = low; v <= high && values.size < 3; v += n) values.add(v);
      const decoys = new Set();
      let guard = 0;
      while (decoys.size < 3 && guard++ < 60) {
        const v = randInt(low, high);
        if (v % n !== 0) decoys.add(v);
      }
      const options = shuffleArray([...values, ...decoys]);
      const answer = options.filter((v) => v % n === 0);
      return {
        answer,
        answerType: "multiSelect",
        prompt: `Select every multiple of ${n} between ${low} and ${high}.`,
        display: { options, requiredCount: answer.length },
      };
    },
  },

  {
    id: "multipleInContext",
    subskill: "nthMultiple",
    bands: [1, 2, 3],
    family: APPLICATION,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["offByOneMultiple", "factNeighbor"],
    build(band) {
      const who = pick(NAMES);
      const n = randInt(2, band === 1 ? 5 : 9);
      const k = randInt(2, band === 1 ? 5 : 9);
      const [unit, group] = pick([
        ["chairs", "rows"],
        ["stickers", "sheets"],
        ["apples", "baskets"],
        ["pencils", "boxes"],
      ]);
      return {
        answer: n * k,
        answerType: "numberPad",
        prompt: `${who} packs ${n} ${unit} into every one of ${k} ${group}. How many ${unit} is that?`,
      };
    },
  },

  // --- factor pairs --------------------------------------------------------
  {
    id: "factorPairs",
    subskill: "factorPairs",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["factorMultipleSwap", "factNeighbor"],
    build(band) {
      const n = pick(targetPool(band).filter((v) => factorsOf(v).length >= 4));
      const real = factorsOf(n).filter((f) => f > 1 && f < n);
      const options = new Set(shuffleArray([...real]).slice(0, 3));
      let guard = 0;
      while (options.size < 5 && guard++ < 60) {
        const v = randInt(2, n - 1);
        if (n % v !== 0) options.add(v);
      }
      const list = shuffleArray([...options]);
      // Every unordered pair from the shown options whose product is n. Graded,
      // not assumed, so an accidental extra pair can never be marked wrong.
      const pairs = [];
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          if (list[i] * list[j] === n) pairs.push([list[i], list[j]]);
        }
      }
      if (!pairs.length) {
        const a = real[0];
        const b = n / a;
        const fallback = shuffleArray([a, b, a + 1, b + 1].filter((v, i, arr) => arr.indexOf(v) === i));
        return {
          answer: [[a, b]],
          answerType: "multiSelect",
          prompt: `Pick the two numbers that multiply to make ${n}.`,
          display: { options: fallback, requiredCount: 2 },
        };
      }
      return {
        answer: pairs,
        answerType: "multiSelect",
        prompt: `Pick the two numbers that multiply to make ${n}.`,
        display: { options: list, requiredCount: 2 },
      };
    },
  },

  {
    id: "arrayFactorContext",
    subskill: "factorPairs",
    bands: [2, 3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "manipulative",
    misconceptions: ["missingOneOrSelf", "squareDoubleCount"],
    build(band) {
      const who = pick(NAMES);
      const n = pick(targetPool(band));
      return {
        answer: factorsOf(n).length,
        answerType: "numberPad",
        prompt: `${who} arranges ${n} tiles into equal rows with none left over. How many different row sizes can ${who} use?`,
      };
    },
  },

  // --- primes and shared structure ----------------------------------------
  {
    id: "primeOrComposite",
    subskill: "primesAndCommon",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["oneIsPrime", "missingOneOrSelf"],
    build(band) {
      const pool =
        band === 1
          ? [2, 3, 4, 5, 6, 7, 8, 9]
          : band === 2
            ? [11, 12, 13, 15, 17, 18, 19, 21]
            : [23, 25, 27, 29, 31, 33, 37, 39, 41, 49];
      const n = pick(pool);
      return {
        answer: isPrime(n) ? "prime" : "composite",
        answerType: "choice",
        choices: ["prime", "composite"],
        prompt: `Is ${n} prime or composite?`,
      };
    },
  },

  {
    id: "commonFactor",
    subskill: "primesAndCommon",
    bands: [2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["commonFactorAdds", "factorMultipleSwap"],
    build(band) {
      const pool = targetPool(band);
      const a = pick(pool);
      let b = pick(pool);
      let guard = 0;
      while ((b === a || factorsOf(a).filter((f) => f > 1 && b % f === 0).length === 0) && guard++ < 40) {
        b = pick(pool);
      }
      const shared = factorsOf(a).filter((f) => f > 1 && b % f === 0);
      const answer = shared.length ? pick(shared) : 1;
      const wrong = [a + b, a - b > 1 ? a - b : a + 1, a + 1, b + 1].filter(
        (v) => v > 0 && !(a % v === 0 && b % v === 0)
      );
      return {
        answer,
        answerType: "choice",
        choices: optionSet(answer, wrong),
        prompt: `Which number is a factor of both ${a} and ${b}?`,
      };
    },
  },

  {
    id: "commonMultiple",
    subskill: "primesAndCommon",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK3",
    representation: "symbolic",
    misconceptions: ["commonFactorAdds", "factorMultipleSwap"],
    build() {
      const a = randInt(2, 8);
      let b = randInt(2, 9);
      let guard = 0;
      while (b === a && guard++ < 20) b = randInt(2, 9);
      return {
        answer: lcm(a, b),
        answerType: "numberPad",
        prompt: `What is the smallest number that is a multiple of both ${a} and ${b}?`,
      };
    },
  },
];

function selectVariety(level, context) {
  const band = bandFor(level);
  const inBand = FACTOR_VARIETIES.filter((v) => v.bands.includes(band));
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
  id: "factorsMultiples",
  label: "Factor Lab!",
  shortLabel: "Factors",
  description: "Factors, multiples, primes, and the numbers they share.",
  icon: "Sigma",
  op: "factor",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varietyIds: FACTOR_VARIETIES.map((v) => v.id),

  generate(level, context = {}) {
    const band = bandFor(level);
    const variety = selectVariety(level, context);
    const built = variety.build(band, level);

    const question = {
      op: built.relation?.op || "factor",
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
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "factorsMultiples",
      level,
      domain: "OA",
      cluster: "Gain familiarity with factors and multiples",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: variety.demand,
      representation: variety.representation,
      mathPractices: ["MP3", "MP7", "MP8"],
      standardRefs: ["4.OA"],
      misconceptionTags: variety.misconceptions,
      blueprintId: `factorsMultiples-${variety.family}-${variety.id}`,
    });

    // Same mathematics, asked another way (M3). Only the items that carry a
    // real a x b = answer relation can be re-presented; the rest pass through.
    return built.relation
      ? maybeApplyFormat(question, level, { actor: pick(NAMES), ...context }, SUPPORTED_FORMATS)
      : question;
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices) && question.choices.length >= 2) {
      return question.choices;
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
