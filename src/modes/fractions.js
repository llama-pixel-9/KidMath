import { randInt, shuffleArray } from "./helpers";
import { gcd } from "../fractions.js";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * Grade 3-4 fractions (3.NF / 4.NF) — variety catalog from
 * docs/spec-part-c2-fractions-patterns.md §fractions.
 *
 * The old generator had four shapes that were really four *difficulty tiers of
 * one idea*: give the child a symbol pair and ask them to manipulate it. The
 * catalog below is organised around genuinely DISTINCT concepts instead:
 *
 *   part-whole on an area model   vs  part-whole on a discrete set
 *   fraction as a NUMBER (a point on the line, the concept most often skipped)
 *   equivalence, in both the "produce one" and "reduce one" directions
 *   three separate comparison strategies — same denominator, same numerator,
 *     and benchmarking to 1/2 — deliberately not collapsed, because a child can
 *     do the first and fail the second
 *   addition/subtraction over a common denominator
 *   fraction-of-a-set, forward and inverse
 *   mixed vs improper
 *
 * Difficulty varies by STRUCTURE, not by bigger denominators: band 1 (levels
 * 1-3) meets naming and same-denominator comparison, band 2 (4-6) meets the
 * number line and equivalence, band 3 (7-10) meets ordering, mixed numbers,
 * the inverse fraction-of-set and other people's wrong reasoning.
 *
 * The format layer (src/modes/formats) is NOT wired here: every transform it
 * offers requires an integer `a op b = answer` relation, which no fraction item
 * has. The format-shaped rows the spec asks for (true/false, odd-one-out,
 * multi-select, error analysis) are therefore built natively below.
 */

const SUBSKILLS = [
  "partWhole",
  "fractionAsNumber",
  "equivalence",
  "compareFractions",
  "addLikeDenominators",
  "fractionOfSet",
];

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava", "Priya", "Owen", "Jonas", "Kaia"];

const DEN_WORDS = {
  2: "halves",
  3: "thirds",
  4: "fourths",
  5: "fifths",
  6: "sixths",
  8: "eighths",
  10: "tenths",
  12: "twelfths",
};

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandFor = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);
const fracLabel = (num, den) => `${num}/${den}`;
const ordinal = (k) => ({ 1: "1st", 2: "2nd", 3: "3rd" }[k] || `${k}th`);

/** Denominators a band may use. Secondary dial: structure comes first. */
function denPool(band) {
  if (band === 1) return [2, 3, 4];
  if (band === 2) return [2, 3, 4, 5, 6, 8];
  return [2, 3, 4, 5, 6, 8, 10, 12];
}

/** Denominators that read cleanly as ticks on a 0-1 line. */
function lineDenPool(band) {
  if (band === 1) return [2, 4];
  if (band === 2) return [2, 3, 4, 5, 6];
  return [3, 4, 5, 6, 8, 10];
}

/** The tick value the NumberLine widget will submit for num/den. */
function tickValue(num, den) {
  return Number((num / den).toFixed(4));
}

/** A reduced proper fraction with denominator drawn from the band pool. */
function reducedProper(band) {
  const pool = denPool(band).filter((d) => d >= 2);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const den = pick(pool);
    const num = randInt(1, den - 1);
    if (gcd(num, den) === 1) return { num, den };
  }
  return { num: 1, den: 2 };
}

/** `<`, `>` or `=` for a/b against c/d, by cross-multiplication. */
function compareSymbol(a, b, c, d) {
  const left = a * d;
  const right = c * b;
  return left > right ? ">" : left < right ? "<" : "=";
}

/** Distinct option strings, correct answer guaranteed present. */
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

export const FRACTION_VARIETIES = [
  // --- part-whole: area model -------------------------------------------
  {
    id: "partWholeAreaName",
    subskill: "partWhole",
    bands: [1, 2, 3],
    // Reclassified CONCEPTUAL→PROCEDURAL (2026-08-21): naming the shaded
    // fraction is a DOK1 drill, and band 1 otherwise has no procedural
    // partWhole variety — which made the bank's band-1 procedural cell
    // unreachable (the engine consults the bank by the generated family).
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "visual",
    misconceptions: ["partToPartConfusion"],
    build(band) {
      const shape = pick(["circle", "rectangle", "paper strip", "square"]);
      const den = pick(denPool(band));
      const num = randInt(1, den - 1);
      return {
        answer: fracLabel(num, den),
        answerType: "choice",
        choices: optionSet(fracLabel(num, den), [
          fracLabel(num, den - num), // part-to-part
          fracLabel(den - num, den), // the unshaded share
          fracLabel(den, num), // inverted
        ]),
        prompt: `A ${shape} is cut into ${den} equal parts. ${
          num === 1 ? "1 part is" : `${num} parts are`
        } shaded. What fraction is shaded?`,
      };
    },
  },

  {
    id: "equalPartsCheck",
    subskill: "partWhole",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "visual",
    misconceptions: ["unequalPartsAccepted"],
    build(band) {
      const den = pick(band === 1 ? [3, 4] : [3, 4, 6, 8]);
      const equal = Math.random() < 0.5;
      const prompt = equal
        ? `A rectangle is split into ${den} equal parts. 1 part is shaded. Can the shaded part be called 1/${den}?`
        : `A rectangle is split into ${den} parts, but the parts are not the same size. 1 part is shaded. Can the shaded part be called 1/${den}?`;
      return {
        answer: equal ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        prompt,
      };
    },
  },

  // --- part-whole: discrete set ------------------------------------------
  {
    id: "partWholeSetName",
    subskill: "partWhole",
    bands: [1, 2, 3],
    family: APPLICATION,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["partToPartConfusion"],
    build(band) {
      const [thing, kind] = pick([
        ["muffins", "blueberry"],
        ["marbles", "blue"],
        ["stickers", "gold"],
        ["pencils", "red"],
      ]);
      const total = band === 1 ? randInt(4, 8) : randInt(6, 12);
      const part = randInt(1, total - 1);
      const who = pick(NAMES);
      return {
        answer: fracLabel(part, total),
        answerType: "choice",
        choices: optionSet(fracLabel(part, total), [
          fracLabel(part, total - part), // part-to-part
          fracLabel(total - part, total), // the other kind
          fracLabel(total, part), // inverted
        ]),
        prompt: `${who} has a tray of ${total} ${thing}. ${part} of them are ${kind}. What fraction of the ${thing} are ${kind}?`,
      };
    },
  },

  {
    id: "unitFractionMeaning",
    subskill: "partWhole",
    bands: [1, 2],
    family: APPLICATION,
    demand: "DOK1",
    representation: "verbalContext",
    misconceptions: ["wholeNumberBias"],
    build(band) {
      const den = pick(band === 1 ? [2, 3, 4] : [3, 4, 5, 6, 8]);
      const who = pick(NAMES);
      const thing = pick(["ribbon", "rope", "paper strip", "cake"]);
      return {
        answer: fracLabel(1, den),
        answerType: "choice",
        choices: optionSet(fracLabel(1, den), [
          fracLabel(den - 1, den), // the pieces left behind
          `${den}`, // whole-number bias: counted the pieces
          fracLabel(1, den + 1),
        ]),
        prompt: `A ${thing} is cut into ${den} equal pieces. ${who} takes one piece. What fraction of the ${thing} did ${who} take?`,
      };
    },
  },

  // --- fraction as a number ----------------------------------------------
  {
    id: "fractionOnNumberLine",
    subskill: "fractionAsNumber",
    bands: [1, 2, 3],
    // Reclassified CONCEPTUAL→PROCEDURAL (2026-08-21): band 1's only
    // fractionAsNumber variety — the bank's band-1 procedural cell was
    // unreachable while this was conceptual.
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "visual",
    misconceptions: ["numberLineCountsTicks", "wholeNumberBias"],
    build(band) {
      const den = pick(lineDenPool(band));
      const num = randInt(1, den - 1);
      return {
        answer: tickValue(num, den),
        answerType: "numberLine",
        prompt: `Place ${fracLabel(num, den)} on the number line. It runs from 0 to 1 in ${DEN_WORDS[den]}.`,
        display: {
          min: 0,
          max: 1,
          step: 1 / den,
          labelEvery: den,
          lineMode: "locate",
        },
      };
    },
  },

  {
    id: "numberLineReadOff",
    subskill: "fractionAsNumber",
    bands: [2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "visual",
    misconceptions: ["numberLineCountsTicks"],
    build(band) {
      const den = pick(lineDenPool(band));
      const k = randInt(1, den - 1);
      const point = pick(["A", "B", "P"]);
      return {
        answer: fracLabel(k, den),
        answerType: "choice",
        choices: optionSet(fracLabel(k, den), [
          fracLabel(k + 1, den), // counted the tick at 0
          fracLabel(k, den + 1), // counted ticks, not intervals
          fracLabel(den - k, den), // counted from the wrong end
        ]),
        prompt: `A number line runs from 0 to 1 in ${DEN_WORDS[den]}. Point ${point} sits on the ${ordinal(
          k
        )} tick after 0. What fraction is ${point}?`,
      };
    },
  },

  // --- equivalence --------------------------------------------------------
  {
    id: "equivalenceGenerate",
    subskill: "equivalence",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["wholeNumberBias", "nonEquivalence"],
    build(band) {
      const { num: n, den: d } = reducedProper(band);
      const m = band === 1 ? 2 : randInt(2, 4);
      return {
        answer: fracLabel(n * m, d * m),
        answerType: "choice",
        choices: optionSet(fracLabel(n * m, d * m), [
          fracLabel(n + m, d + m),
          fracLabel(n * m, d),
          fracLabel(n, d * m),
          fracLabel(n + 1, d + 1),
        ]),
        prompt: `Which fraction is equal to ${fracLabel(n, d)}?`,
      };
    },
  },

  {
    id: "equivalenceSimplify",
    subskill: "equivalence",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["nonEquivalence"],
    build(band) {
      const { num: n, den: d } = reducedProper(band);
      const k = randInt(2, 3);
      return {
        answer: fracLabel(n, d),
        answerType: "choice",
        choices: optionSet(fracLabel(n, d), [
          fracLabel(n * k, d), // only the bottom simplified
          fracLabel(n, d * k), // only the top simplified
          fracLabel(n * k - 1, d * k - 1), // subtracted instead of divided
        ]),
        prompt: `Write ${fracLabel(n * k, d * k)} in simplest form.`,
      };
    },
  },

  {
    id: "equivalenceMultiSelect",
    subskill: "equivalence",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK3",
    representation: "symbolic",
    misconceptions: ["wholeNumberBias", "nonEquivalence"],
    build() {
      const base = pick([
        { num: 1, den: 2 },
        { num: 1, den: 3 },
        { num: 2, den: 3 },
        { num: 1, den: 4 },
      ]);
      // Options are built first, then graded — the answer is whatever really
      // is equivalent, never a value the builder assumed.
      const candidates = new Set();
      for (const k of [2, 3, 4, 5]) candidates.add(fracLabel(base.num * k, base.den * k));
      for (const k of [1, 2, 3]) {
        candidates.add(fracLabel(base.num + k, base.den + k));
        candidates.add(fracLabel(base.num * k, base.den + k));
      }
      const options = shuffleArray([...candidates]).slice(0, 6);
      const isEqual = (label) => {
        const [n, d] = label.split("/").map(Number);
        return n * base.den === base.num * d;
      };
      const correct = options.filter(isEqual);
      const wrong = options.filter((o) => !isEqual(o));
      if (!correct.length || !wrong.length) {
        // Fall back to a hand-checked pair rather than emit an ungradeable item.
        const safeOptions = shuffleArray([
          fracLabel(base.num * 2, base.den * 2),
          fracLabel(base.num * 3, base.den * 3),
          fracLabel(base.num + 1, base.den + 2),
          fracLabel(base.num + 2, base.den + 1),
        ]);
        return {
          answer: safeOptions.filter(isEqual),
          answerType: "multiSelect",
          prompt: `Select every fraction equal to ${fracLabel(base.num, base.den)}.`,
          display: { options: safeOptions, requiredCount: safeOptions.filter(isEqual).length },
        };
      }
      const shown = shuffleArray([...correct.slice(0, 2), ...wrong.slice(0, 2)]);
      const answer = shown.filter(isEqual);
      return {
        answer,
        answerType: "multiSelect",
        prompt: `Select every fraction equal to ${fracLabel(base.num, base.den)}.`,
        display: { options: shown, requiredCount: answer.length },
      };
    },
  },

  {
    id: "mixedImproperConvert",
    subskill: "equivalence",
    bands: [3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["mixedDropsWhole", "wholeNumberBias"],
    build() {
      const whole = randInt(2, 4);
      const den = pick([2, 3, 4, 5, 6]);
      const rem = randInt(1, den - 1);
      const improper = whole * den + rem;
      const answer = `${whole} ${fracLabel(rem, den)}`;
      return {
        answer,
        answerType: "choice",
        choices: optionSet(answer, [
          `1 ${fracLabel(rem, den)}`, // mixedDropsWhole
          `${rem} ${fracLabel(whole, den)}`, // whole/remainder swapped
          `${whole + 1} ${fracLabel(rem, den)}`,
          `${whole} ${fracLabel(den, rem)}`,
        ]),
        prompt: `Write ${fracLabel(improper, den)} as a mixed number.`,
      };
    },
  },

  // --- comparison: three distinct strategies ------------------------------
  {
    id: "compareSameDenominator",
    subskill: "compareFractions",
    bands: [1, 2, 3],
    // Reclassified CONCEPTUAL→PROCEDURAL (2026-08-21): a bare symbol drill,
    // and band 1's only compareFractions variety — kept conceptual it blocked
    // the bank's band-1 procedural cell.
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["symbolFlip"],
    build(band) {
      const den = pick(denPool(band).filter((d) => d >= 3));
      const a = randInt(1, den - 1);
      const c = Math.random() < 0.2 ? a : randInt(1, den - 1);
      return {
        answer: compareSymbol(a, den, c, den),
        answerType: "symbolSelect",
        prompt: `Compare: ${fracLabel(a, den)} ? ${fracLabel(c, den)}. Use <, >, or =.`,
      };
    },
  },

  {
    id: "compareSameNumerator",
    subskill: "compareFractions",
    bands: [2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["biggerDenominatorBigger", "symbolFlip"],
    build(band) {
      const pool = denPool(band).filter((d) => d >= 3);
      const d1 = pick(pool);
      let d2 = pick(pool);
      let guard = 0;
      while (d2 === d1 && guard++ < 20) d2 = pick(pool);
      const n = randInt(1, Math.min(d1, d2) - 1);
      return {
        answer: compareSymbol(n, d1, n, d2),
        answerType: "symbolSelect",
        prompt: `Compare: ${fracLabel(n, d1)} ? ${fracLabel(n, d2)}. Use <, >, or =.`,
      };
    },
  },

  {
    id: "compareToHalf",
    subskill: "compareFractions",
    bands: [2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["numeratorOnly", "wholeNumberBias"],
    build(band) {
      const den = pick(band === 2 ? [3, 5, 6, 8] : [5, 6, 8, 10, 12]);
      const num = randInt(1, den - 1);
      const cmp = 2 * num - den;
      const answer =
        cmp < 0 ? "less than 1/2" : cmp > 0 ? "greater than 1/2" : "equal to 1/2";
      return {
        answer,
        answerType: "choice",
        choices: ["less than 1/2", "equal to 1/2", "greater than 1/2"],
        prompt: `Is ${fracLabel(num, den)} less than, equal to, or greater than 1/2?`,
      };
    },
  },

  {
    id: "greaterThanHalfMultiSelect",
    subskill: "compareFractions",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK3",
    representation: "symbolic",
    misconceptions: ["numeratorOnly", "biggerDenominatorBigger"],
    build() {
      const labels = new Set();
      let guard = 0;
      while (labels.size < 4 && guard++ < 60) {
        const den = pick([3, 4, 5, 6, 8, 10, 12]);
        const num = randInt(1, den - 1);
        labels.add(fracLabel(num, den));
      }
      const options = shuffleArray([...labels]);
      const bigger = (label) => {
        const [n, d] = label.split("/").map(Number);
        return 2 * n > d;
      };
      const answer = options.filter(bigger);
      if (!answer.length || answer.length === options.length) {
        // Guarantee a mixed option set: swap in one known member of each class.
        const fixed = shuffleArray(["3/5", "5/8", "1/4", "2/6"]);
        return {
          answer: fixed.filter(bigger),
          answerType: "multiSelect",
          prompt: "Select every fraction greater than 1/2.",
          display: { options: fixed, requiredCount: fixed.filter(bigger).length },
        };
      }
      return {
        answer,
        answerType: "multiSelect",
        prompt: "Select every fraction greater than 1/2.",
        display: { options, requiredCount: answer.length },
      };
    },
  },

  {
    id: "fractionErrorAnalysis",
    subskill: "compareFractions",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "verbalContext",
    misconceptions: ["wholeNumberBias", "denominatorAdd"],
    build() {
      const who = pick(NAMES);
      const den = pick([4, 5, 6, 8]);
      const a = randInt(1, den - 2);
      const b = randInt(1, den - 1 - a);
      const rightIsRight = Math.random() < 0.5;
      const prompt = rightIsRight
        ? `${who} says ${fracLabel(a, den)} + ${fracLabel(b, den)} = ${fracLabel(
            a + b,
            den
          )} because the ${DEN_WORDS[den]} stay ${DEN_WORDS[den]}. Is ${who} right?`
        : `${who} says ${fracLabel(a, den)} + ${fracLabel(b, den)} = ${fracLabel(
            a + b,
            den * 2
          )} because ${a} + ${b} = ${a + b} and ${den} + ${den} = ${den * 2}. Is ${who} right?`;
      return {
        answer: rightIsRight ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        prompt,
      };
    },
  },

  // --- addition and subtraction over a common denominator ------------------
  {
    id: "addLikeDenominators",
    subskill: "addLikeDenominators",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["denominatorAdd", "wholeNumberBias"],
    build(band) {
      const den = pick(band === 1 ? [3, 4] : denPool(band).filter((d) => d >= 4));
      const a = randInt(1, den - 2);
      const b = randInt(1, den - 1 - a);
      return {
        answer: fracLabel(a + b, den),
        answerType: "choice",
        choices: optionSet(fracLabel(a + b, den), [
          fracLabel(a + b, den + den), // denominatorAdd
          `${a + b}`, // whole-number bias
          fracLabel(a * b, den), // multiplied the tops
        ]),
        prompt: `${fracLabel(a, den)} + ${fracLabel(b, den)} = ?`,
      };
    },
  },

  {
    id: "subtractLikeDenominators",
    subskill: "addLikeDenominators",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["denominatorAdd", "wholeNumberBias"],
    build(band) {
      const den = pick(denPool(band).filter((d) => d >= 4));
      const a = randInt(2, den - 1);
      const b = randInt(1, a - 1);
      return {
        answer: fracLabel(a - b, den),
        answerType: "choice",
        choices: optionSet(fracLabel(a - b, den), [
          fracLabel(a + b, den), // added instead
          `${a - b}`, // whole-number bias
          fracLabel(a - b, den + den), // denominatorAdd's subtraction twin
        ]),
        prompt: `${fracLabel(a, den)} - ${fracLabel(b, den)} = ?`,
      };
    },
  },

  {
    id: "addLikeTrueFalse",
    subskill: "addLikeDenominators",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["denominatorAdd", "wholeNumberBias"],
    build() {
      const den = pick([4, 5, 6, 8, 10]);
      const a = randInt(1, den - 2);
      const b = randInt(1, den - 1 - a);
      const truthy = Math.random() < 0.5;
      // The false version is exactly the `denominatorAdd` error, so a child who
      // holds the misconception answers "Yes" and we learn something.
      const shown = truthy ? fracLabel(a + b, den) : fracLabel(a + b, den * 2);
      return {
        answer: truthy ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        prompt: `${fracLabel(a, den)} + ${fracLabel(b, den)} = ${shown}. Is this right?`,
      };
    },
  },

  // --- fraction of a set, both directions ---------------------------------
  {
    id: "fractionOfSetForward",
    subskill: "fractionOfSet",
    bands: [1, 2, 3],
    family: APPLICATION,
    demand: "DOK2",
    representation: "manipulative",
    misconceptions: ["fractionUnitMiscount"],
    build(band) {
      const den = pick(band === 1 ? [2, 3, 4] : [2, 3, 4, 5, 6]);
      const num = randInt(1, den - 1);
      const groups = randInt(2, band === 1 ? 3 : 5);
      const total = den * groups;
      const who = pick(NAMES);
      const [thing, kind] = pick([
        ["apples", "green"],
        ["trucks", "red"],
        ["beads", "yellow"],
        ["cards", "shiny"],
      ]);
      return {
        answer: groups * num,
        answerType: "fractionSet",
        prompt: `${who} has ${total} ${thing}. ${fracLabel(num, den)} of them are ${kind}. How many are ${kind}?`,
        display: { set: { total, num, den } },
      };
    },
  },

  {
    id: "fractionOfSetInverse",
    subskill: "fractionOfSet",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "verbalContext",
    misconceptions: ["fractionUnitMiscount"],
    build() {
      const den = pick([2, 3, 4, 5, 6]);
      const num = randInt(1, den - 1);
      const groups = randInt(2, 6);
      const total = den * groups;
      const part = groups * num;
      const who = pick(NAMES);
      const [thing, kind] = pick([
        ["trucks", "red"],
        ["marbles", "blue"],
        ["books", "read"],
      ]);
      return {
        answer: total,
        answerType: "choice",
        choices: optionSet(total, [
          part * den, // used the denominator on the part directly
          part * num,
          part + den,
          total + groups,
          total - groups,
        ]),
        prompt: `${fracLabel(num, den)} of ${who}'s ${thing} are ${kind}. ${part} ${thing} are ${kind}. How many ${thing} does ${who} have?`,
      };
    },
  },
];

/** Varieties this level may draw, honouring subskill and family requests. */
function selectVariety(level, context) {
  const band = bandFor(level);
  const inBand = FRACTION_VARIETIES.filter((v) => v.bands.includes(band));
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
  id: "fractions",
  label: "Fractions Feather",
  shortLabel: "Fractions",
  description: "Halves & thirds",
  icon: "PieChart",
  glyph: "½",
  op: "frac",
  subskills: SUBSKILLS,
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varietyIds: FRACTION_VARIETIES.map((v) => v.id),

  generate(level, context = {}) {
    const band = bandFor(level);
    const variety = selectVariety(level, context);
    const built = variety.build(band, level);

    const question = {
      op: "frac",
      answer: built.answer,
      level,
      display: {
        promptText: built.prompt,
        representation: variety.representation,
        ...(built.display || {}),
      },
    };
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "fractions",
      level,
      domain: "NF",
      cluster: "Build fractions; equivalence and comparison",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: variety.demand,
      representation: variety.representation,
      mathPractices: ["MP2", "MP3", "MP7"],
      standardRefs: ["3.NF", "4.NF"],
      misconceptionTags: variety.misconceptions,
      blueprintId: `fractions-${variety.family}-${variety.id}`,
    });
    return question;
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices) && question.choices.length >= 2) {
      return question.choices;
    }
    return buildDistractors({
      answer,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 1,
    });
  },
};
