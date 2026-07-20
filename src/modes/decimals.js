import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * Grade 4 decimals (4.NF.C) — variety catalog from
 * docs/spec-part-c2-fractions-patterns.md §decimals.
 *
 * The three old shapes were all "convert this notation". The catalog below
 * separates the concepts that a child can hold independently: reading a decimal
 * off a model, saying it, writing it from words, converting either direction
 * against a fraction, placing it as a NUMBER on a line, comparing two of them,
 * and judging someone else's comparison.
 *
 * Difficulty is structural: band 1 (levels 1-3) stays in tenths off a model,
 * band 2 (4-6) adds words/fraction conversion and the number line, band 3
 * (7-10) adds hundredths, equivalence (0.4 = 0.40), ordering and error analysis
 * — the place where `longerIsLarger` actually shows up.
 *
 * The format layer is not wired: its transforms all need an integer
 * `a op b = answer` relation, which decimal items do not have. The
 * format-shaped rows (true/false, multi-select, error analysis) are native.
 */

const SUBSKILLS = ["tenthsHundredths", "compareDecimals", "fractionToDecimal", "decimalAsNumber"];

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava", "Priya", "Owen", "Jonas", "Kaia"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandFor = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);

/** Round away float noise; every decimal in this mode has <= 2 places. */
const dec2 = (x) => Number(x.toFixed(2));
/** The tick value the NumberLine widget submits. */
const tick = (x) => Number(x.toFixed(4));

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

export const DECIMAL_VARIETIES = [
  // --- reading a decimal off a model --------------------------------------
  {
    id: "tenthsFromModel",
    subskill: "tenthsHundredths",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK1",
    representation: "visual",
    misconceptions: ["decimalPointDrift", "decimalAsWholeNumber"],
    build() {
      const shaded = randInt(1, 9);
      return {
        answer: dec2(shaded / 10),
        answerType: "decimal",
        prompt: `A strip is split into 10 equal parts and ${shaded} are shaded. Write that as a decimal.`,
      };
    },
  },

  {
    id: "hundredthsFromGrid",
    subskill: "tenthsHundredths",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "visual",
    misconceptions: ["placeValueSlip", "zeroIgnored"],
    build() {
      const shaded = randInt(1, 99);
      return {
        answer: dec2(shaded / 100),
        answerType: "decimal",
        prompt: `A 10-by-10 grid has ${shaded} of its 100 squares shaded. Write that as a decimal.`,
      };
    },
  },

  // --- words <-> digits ----------------------------------------------------
  {
    id: "decimalFromWords",
    subskill: "tenthsHundredths",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["placeValueSlip", "zeroIgnored"],
    build(band) {
      if (band === 2) {
        const tenths = randInt(1, 9);
        return {
          answer: dec2(tenths / 10),
          answerType: "decimal",
          prompt: `Write as a decimal: ${tenths} tenths.`,
        };
      }
      const tenths = randInt(0, 9);
      const hundredths = randInt(1, 9);
      return {
        answer: dec2(tenths / 10 + hundredths / 100),
        answerType: "decimal",
        prompt: `Write as a decimal: ${tenths} tenths and ${hundredths} hundredths.`,
      };
    },
  },

  {
    id: "decimalToWords",
    subskill: "tenthsHundredths",
    bands: [2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["zeroIgnored", "decimalAsWholeNumber"],
    build(band) {
      const useHundredths = band === 3 && Math.random() < 0.6;
      const digit = randInt(1, 9);
      const value = useHundredths ? dec2(digit / 100) : dec2(digit / 10);
      const answer = useHundredths ? `${digit} hundredths` : `${digit} tenths`;
      return {
        answer,
        answerType: "choice",
        choices: optionSet(answer, [
          useHundredths ? `${digit} tenths` : `${digit} hundredths`,
          `${digit} ones`,
          `${digit * 10} hundredths`,
          `${digit} tens`,
        ]),
        prompt: `How do you say ${value}?`,
      };
    },
  },

  // --- fraction <-> decimal ------------------------------------------------
  {
    id: "fractionToDecimal",
    subskill: "fractionToDecimal",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    demand: "DOK1",
    representation: "symbolic",
    misconceptions: ["decimalPointDrift"],
    build(band) {
      const den = band === 3 && Math.random() < 0.5 ? 100 : 10;
      const num = randInt(1, den - 1);
      return {
        answer: dec2(num / den),
        answerType: "decimal",
        prompt: `Write ${num}/${den} as a decimal.`,
      };
    },
  },

  {
    id: "decimalToFraction",
    subskill: "fractionToDecimal",
    bands: [2, 3],
    family: PROCEDURAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["decimalPointDrift", "zeroIgnored"],
    build(band) {
      const den = band === 3 && Math.random() < 0.5 ? 100 : 10;
      const num = randInt(1, den - 1);
      return {
        answer: { num, den },
        answerType: "fraction",
        prompt: `Write ${dec2(num / den)} as a fraction with denominator ${den}.`,
      };
    },
  },

  // --- decimal as a number -------------------------------------------------
  {
    id: "decimalOnNumberLine",
    subskill: "decimalAsNumber",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "visual",
    misconceptions: ["decimalAsWholeNumber"],
    build(band) {
      if (band === 3) {
        const whole = randInt(0, 1);
        const tenths = randInt(1, 9);
        const value = tick(whole + tenths / 10);
        return {
          answer: value,
          answerType: "numberLine",
          prompt: `Place ${value} on the number line. It runs from 0 to 2 in tenths.`,
          display: { min: 0, max: 2, step: 0.1, labelEvery: 10, lineMode: "locate" },
        };
      }
      const tenths = randInt(1, 9);
      return {
        answer: tick(tenths / 10),
        answerType: "numberLine",
        prompt: `Place ${dec2(tenths / 10)} on the number line. It runs from 0 to 1 in tenths.`,
        display: { min: 0, max: 1, step: 0.1, labelEvery: 5, lineMode: "locate" },
      };
    },
  },

  {
    id: "decimalNumberLineRead",
    subskill: "decimalAsNumber",
    bands: [2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "visual",
    misconceptions: ["decimalAsWholeNumber", "placeValueSlip"],
    build() {
      const lower = randInt(1, 8);
      const midpoint = dec2(lower / 10 + 0.05);
      const point = pick(["A", "B", "P"]);
      return {
        answer: midpoint,
        answerType: "choice",
        choices: optionSet(midpoint, [
          dec2((lower + 1) / 10 + lower / 100), // digits read in the wrong order
          dec2(lower / 10),
          dec2((lower + 1) / 10),
          dec2(lower + 0.5),
        ]),
        prompt: `A number line runs from 0 to 1 in tenths. Point ${point} sits exactly halfway between ${dec2(
          lower / 10
        )} and ${dec2((lower + 1) / 10)}. Which number is ${point}?`,
      };
    },
  },

  // --- comparison ----------------------------------------------------------
  {
    id: "compareDecimals",
    subskill: "compareDecimals",
    bands: [1, 2, 3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["longerIsLarger", "symbolFlip"],
    build(band) {
      // Band 3 deliberately mixes a tenth against a hundredth (0.7 vs 0.65) —
      // that mismatch is the whole point of `longerIsLarger`.
      const a = band === 3 ? dec2(randInt(1, 9) / 10) : dec2(randInt(1, 9) / 10);
      const b =
        Math.random() < 0.2
          ? a
          : band === 3
            ? dec2(randInt(10, 99) / 100)
            : dec2(randInt(1, 9) / 10);
      return {
        answer: a > b ? ">" : a < b ? "<" : "=",
        answerType: "symbolSelect",
        prompt: `Compare: ${a} ? ${b}. Use <, >, or =.`,
      };
    },
  },

  {
    id: "tenthsHundredthsEquiv",
    subskill: "compareDecimals",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK2",
    representation: "symbolic",
    misconceptions: ["zeroIgnored", "longerIsLarger"],
    build() {
      const digit = randInt(1, 9);
      const trueVersion = Math.random() < 0.5;
      const left = dec2(digit / 10);
      // "0.40" cannot survive a Number round-trip, so the pair is rendered as
      // text and the child judges the statement, not a computed value.
      const right = trueVersion ? `0.${digit}0` : `0.0${digit}`;
      return {
        answer: trueVersion ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        prompt: `Is ${left} equal to ${right}?`,
      };
    },
  },

  {
    id: "greaterThanHalfDecimals",
    subskill: "compareDecimals",
    bands: [3],
    family: CONCEPTUAL,
    demand: "DOK3",
    representation: "symbolic",
    misconceptions: ["longerIsLarger", "decimalAsWholeNumber"],
    build() {
      const values = new Set();
      let guard = 0;
      while (values.size < 4 && guard++ < 60) {
        values.add(Math.random() < 0.5 ? dec2(randInt(1, 9) / 10) : dec2(randInt(1, 99) / 100));
      }
      const options = shuffleArray([...values]);
      const answer = options.filter((v) => v > 0.5);
      if (!answer.length || answer.length === options.length) {
        const fixed = shuffleArray([0.7, 0.65, 0.3, 0.09]);
        return {
          answer: fixed.filter((v) => v > 0.5),
          answerType: "multiSelect",
          prompt: "Select every decimal greater than 0.5.",
          display: { options: fixed, requiredCount: fixed.filter((v) => v > 0.5).length },
        };
      }
      return {
        answer,
        answerType: "multiSelect",
        prompt: "Select every decimal greater than 0.5.",
        display: { options, requiredCount: answer.length },
      };
    },
  },

  // --- decimals in context -------------------------------------------------
  {
    id: "moneyAsDecimal",
    subskill: "tenthsHundredths",
    bands: [2, 3],
    family: APPLICATION,
    demand: "DOK2",
    representation: "verbalContext",
    misconceptions: ["placeValueSlip", "zeroIgnored"],
    build() {
      const who = pick(NAMES);
      const dimes = randInt(1, 9);
      const pennies = randInt(1, 9);
      return {
        answer: dec2(dimes / 10 + pennies / 100),
        answerType: "decimal",
        prompt: `${who} has ${dimes} dimes and ${pennies} pennies. Write the amount as a decimal part of a dollar.`,
      };
    },
  },

  {
    id: "measurementDecimal",
    subskill: "compareDecimals",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "verbalContext",
    misconceptions: ["longerIsLarger"],
    build() {
      const who = pick(NAMES);
      const first = dec2(randInt(1, 9) / 10);
      let second = dec2(randInt(10, 99) / 100);
      let guard = 0;
      while (second === first && guard++ < 20) second = dec2(randInt(10, 99) / 100);
      return {
        answer: first > second ? "the first week" : "the second week",
        answerType: "choice",
        choices: ["the first week", "the second week"],
        prompt: `${who}'s plant grew ${first} cm one week and ${second} cm the next week. Which week did it grow more?`,
      };
    },
  },

  {
    id: "decimalErrorAnalysis",
    subskill: "compareDecimals",
    bands: [3],
    family: APPLICATION,
    demand: "DOK3",
    representation: "verbalContext",
    misconceptions: ["longerIsLarger", "decimalAsWholeNumber"],
    build() {
      const who = pick(NAMES);
      const tenth = dec2(randInt(2, 9) / 10);
      // A hundredth that is genuinely smaller but has more digits: exactly the
      // pair that makes `decimalAsWholeNumber` look right to a child.
      const hundredth = dec2(randInt(10, Math.round(tenth * 100) - 1) / 100);
      const claimIsTrue = Math.random() < 0.5;
      const prompt = claimIsTrue
        ? `${who} says ${tenth} is bigger than ${hundredth}. Is ${who} right?`
        : `${who} says ${hundredth} is bigger than ${tenth} because ${Math.round(
            hundredth * 100
          )} is bigger than ${Math.round(tenth * 10)}. Is ${who} right?`;
      return {
        answer: claimIsTrue ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        prompt,
      };
    },
  },
];

function selectVariety(level, context) {
  const band = bandFor(level);
  const inBand = DECIMAL_VARIETIES.filter((v) => v.bands.includes(band));
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
  id: "decimals",
  label: "Decimal Dash!",
  shortLabel: "Decimals",
  description: "Tenths, hundredths, the number line, and comparing decimals.",
  icon: "Percent",
  op: "dec",
  subskills: SUBSKILLS,
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varietyIds: DECIMAL_VARIETIES.map((v) => v.id),

  generate(level, context = {}) {
    const band = bandFor(level);
    const variety = selectVariety(level, context);
    const built = variety.build(band, level);

    const question = {
      op: "dec",
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
      modeId: "decimals",
      level,
      domain: "NF",
      cluster: "Decimal notation for fractions; compare decimals",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: variety.demand,
      representation: variety.representation,
      mathPractices: ["MP2", "MP3", "MP6"],
      standardRefs: ["4.NF"],
      misconceptionTags: variety.misconceptions,
      blueprintId: `decimals-${variety.family}-${variety.id}`,
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
      min: 0,
    });
  },
};
