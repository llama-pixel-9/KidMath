import { randInt, shuffleArray } from "./helpers";
import { buildDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { maybeApplyFormat } from "./formats";

/**
 * placeValue — Place Value! (spec-part-c1-number-sense.md §placeValue)
 *
 * Before M4: four shapes (tens_in, ones_in, build, expanded), all symbolic, with
 * the subskill derived from the shape so it carried no extra information.
 *
 * The single highest-value addition here is `nonCanonicalRename` (84 = 7 tens
 * and 14 ones). Renaming is what makes borrowing comprehensible, it was absent,
 * and it raises difficulty without raising magnitude — the plan's thesis in one
 * variety.
 */

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava"];

const ONES_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS_WORDS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Number name for 1..999, e.g. 315 -> "three hundred fifteen". */
function numberToWords(n) {
  if (n < 20) return ONES_WORDS[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? TENS_WORDS[t] : `${TENS_WORDS[t]}-${ONES_WORDS[o]}`;
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return rest === 0 ? `${ONES_WORDS[h]} hundred` : `${ONES_WORDS[h]} hundred ${numberToWords(rest)}`;
}

/** Ceiling per level. Magnitude is the secondary dial; structure leads. */
const MAX_BY_LEVEL = [19, 39, 99, 99, 199, 499, 999, 999, 999, 999];

const SUBSKILLS = ["tensOnes", "expandedForm", "regroupingSense"];

// Legacy `context.questionType` values still route to a variety so older
// callers (and the bank fixtures) keep working.
const LEGACY_TYPES = {
  tens_in: "digitsInPlace",
  ones_in: "digitsInPlace",
  build: "buildFromUnits",
  expanded: "expandedToStandard",
};

// Place value has no `a op b = answer` relation, so only the formats that need
// nothing but a value apply.
const SUPPORTED_FORMATS = ["reflexive"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);
const maxFor = (level) => MAX_BY_LEVEL[Math.min(Math.max(level, 1), MAX_BY_LEVEL.length) - 1];

function numberFor(level, { min = 10 } = {}) {
  return randInt(min, maxFor(level));
}

const digitsOf = (n) => ({
  hundreds: Math.floor(n / 100),
  tens: Math.floor(n / 10) % 10,
  ones: n % 10,
});

/** "300 + 6" — zero places are dropped, which is the conventional form. */
function expandedForm(n) {
  const { hundreds, tens, ones } = digitsOf(n);
  const parts = [];
  if (hundreds) parts.push(hundreds * 100);
  if (tens) parts.push(tens * 10);
  if (ones) parts.push(ones);
  return parts.length ? parts.join(" + ") : "0";
}

const VARIETIES = [
  // 1 — 1.NBT.2 how many tens / hundreds.
  {
    id: "digitsInPlace",
    bands: [1, 2, 3],
    subskill: "tensOnes",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const number = numberFor(level);
      const { hundreds, tens, ones } = digitsOf(number);
      const places = number >= 100 ? ["tens", "ones", "hundreds"] : ["tens", "ones"];
      const place = pick(places);
      const answer = place === "hundreds" ? hundreds : place === "tens" ? tens : ones;
      return {
        a: number,
        answer,
        answerType: bandOf(level) === 1 ? undefined : "numberPad",
        display: {
          type: "digitsInPlace",
          promptText: `How many ${place} in ${number}?`,
          number,
          tens,
          ones,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK1",
        misconceptions: ["onesAsTens", "digitReversal"],
      };
    },
  },

  // 2 — 2.NBT.1 what a digit is WORTH, not which digit it is.
  {
    id: "valueOfDigit",
    bands: [2, 3],
    subskill: "tensOnes",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      // "What is the value of the 7?" is only well posed when that digit
      // appears once, so the number is BUILT from distinct digits rather than
      // drawn at random and hoped over.
      const useHundreds = maxFor(level) >= 100;
      const digits = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, useHundreds ? 3 : 2);
      const [hundreds, tens, ones] = useHundreds ? digits : [0, digits[0], digits[1]];
      const number = hundreds * 100 + tens * 10 + ones;
      const candidates = [
        { digit: ones, value: ones },
        { digit: tens, value: tens * 10 },
        ...(hundreds ? [{ digit: hundreds, value: hundreds * 100 }] : []),
      ];
      const chosen = pick(candidates);
      const options = new Set([chosen.value, chosen.digit, chosen.digit * 10, chosen.digit * 100]);
      return {
        a: number,
        answer: chosen.value,
        choices: shuffleArray([...options].slice(0, 4)),
        display: {
          type: "valueOfDigit",
          promptText: `In ${number}, what is the value of the ${chosen.digit}?`,
          number,
          tens,
          ones,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK2",
        misconceptions: ["digitNotValue", "placeValueSlip"],
      };
    },
  },

  // 3 — 1.NBT.2 assemble from a stated decomposition.
  {
    id: "buildFromUnits",
    bands: [1, 2, 3],
    subskill: "regroupingSense",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const number = numberFor(level);
      const { hundreds, tens, ones } = digitsOf(number);
      const promptText = hundreds
        ? `${hundreds} hundreds, ${tens} tens and ${ones} ones = ?`
        : `${tens} tens and ${ones} ones = ?`;
      return {
        a: number,
        answer: number,
        answerType: bandOf(level) === 1 ? undefined : "numberPad",
        display: { type: "buildFromUnits", promptText, number, tens, ones },
        representation: "decomposition",
        cognitiveDemand: "DOK1",
        misconceptions: ["digitReversal", "concatenation"],
      };
    },
  },

  // 4 — 2.NBT.3 standard -> expanded. A `choice` because a free-text expanded
  // form is not worth the parser (spec reviewer note).
  {
    id: "standardToExpanded",
    bands: [2, 3],
    subskill: "expandedForm",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const number = numberFor(level, { min: 100 > maxFor(level) ? 10 : 100 });
      const { hundreds, tens, ones } = digitsOf(number);
      const correct = expandedForm(number);
      const candidates = new Set();
      if (hundreds) candidates.add(`${hundreds} + ${tens * 10} + ${ones}`);
      candidates.add(`${hundreds * 100 || tens * 10} + ${tens} + ${ones}`);
      candidates.add(expandedForm(number + 10));
      candidates.add(expandedForm(number + 1));
      candidates.add(expandedForm(number + 100));
      // A distractor that happens to sum to the number is a SECOND correct
      // answer ("200 + 0 + 8" for 208), so every candidate is evaluated.
      const sumOf = (text) => text.split(" + ").reduce((t, part) => t + Number(part), 0);
      const wrong = [...candidates].filter((w) => w !== correct && sumOf(w) !== number);
      const options = [correct, ...wrong].slice(0, 4);
      return {
        a: number,
        answer: correct,
        choices: shuffleArray([...new Set(options)]),
        display: {
          type: "standardToExpanded",
          promptText: `Which one shows ${number} in expanded form?`,
          number,
          tens,
          ones,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK2",
        misconceptions: ["digitNotValue", "zeroDropped"],
      };
    },
  },

  // 5 — 2.NBT.3 expanded -> standard.
  {
    id: "expandedToStandard",
    bands: [2, 3],
    subskill: "expandedForm",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const number = numberFor(level);
      const { tens, ones } = digitsOf(number);
      return {
        a: number,
        answer: number,
        answerType: "numberPad",
        display: {
          type: "expandedToStandard",
          promptText: `${expandedForm(number)} = ?`,
          number,
          tens,
          ones,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK1",
        misconceptions: ["zeroDropped", "concatenation"],
      };
    },
  },

  // 6 — 2.NBT.3 number name -> numeral.
  {
    id: "wordFormToStandard",
    bands: [2, 3],
    subskill: "expandedForm",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const number = numberFor(level);
      const { tens, ones } = digitsOf(number);
      return {
        a: number,
        answer: number,
        answerType: "numberPad",
        display: {
          type: "wordFormToStandard",
          promptText: `Write the number: ${numberToWords(number)}.`,
          number,
          tens,
          ones,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptions: ["zeroDropped", "digitReversal"],
      };
    },
  },

  // 7 — non-canonical renaming: the regrouping precursor.
  {
    id: "nonCanonicalRename",
    bands: [3],
    subskill: "regroupingSense",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const number = randInt(21, Math.min(99, maxFor(level)));
      const { tens, ones } = digitsOf(number);
      const borrowed = randInt(1, Math.min(2, tens - 1));
      return {
        a: number,
        answer: ones + borrowed * 10,
        answerType: "numberPad",
        display: {
          type: "nonCanonicalRename",
          promptText: `${number} is ${tens} tens and ${ones} ones. It is also ${tens - borrowed} tens and ___ ones.`,
          number,
          tens,
          ones,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK3",
        misconceptions: ["canonicalOnly", "concatenation"],
      };
    },
  },

  // 8 — 1.NBT.5 ten more / ten less, mentally.
  {
    id: "tenMoreTenLess",
    bands: [2, 3],
    subskill: "tensOnes",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const number = randInt(15, Math.min(989, maxFor(level)));
      const { tens, ones } = digitsOf(number);
      const more = Math.random() < 0.5;
      return {
        a: number,
        answer: more ? number + 10 : number - 10,
        answerType: "numberPad",
        display: {
          type: "tenMoreTenLess",
          promptText: `What is 10 ${more ? "more than" : "less than"} ${number}?`,
          number,
          tens,
          ones,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK1",
        misconceptions: ["placeValueSlip", "onesAsTens"],
      };
    },
  },

  // 9 — 10 more where the hundreds digit has to roll over.
  {
    id: "crossingBoundary",
    bands: [3],
    subskill: "tensOnes",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: () => {
      const hundreds = randInt(1, 8);
      const ones = randInt(0, 9);
      const number = hundreds * 100 + 90 + ones; // tens digit is 9: +10 rolls over
      return {
        a: number,
        answer: number + 10,
        answerType: "numberPad",
        display: {
          type: "crossingBoundary",
          promptText: `What is 10 more than ${number}?`,
          number,
          tens: 9,
          ones,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK2",
        misconceptions: ["placeValueSlip", "digitReversal"],
      };
    },
  },

  // 10 — judge a decomposition without computing.
  {
    id: "trueFalseDecomposition",
    bands: [3],
    subskill: "regroupingSense",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const tens = randInt(2, 8);
      const extraOnes = randInt(10, 19);
      const claimed = tens * 10 + extraOnes;
      const truthy = Math.random() < 0.5;
      const shown = truthy ? claimed : claimed + randInt(1, 9);
      return {
        a: shown,
        answer: truthy ? "True" : "False",
        choices: ["True", "False"],
        display: {
          type: "trueFalseDecomposition",
          promptText: `True or false: ${tens} tens and ${extraOnes} ones is the same as ${shown}.`,
          number: claimed,
          tens,
          ones: extraOnes,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK3",
        misconceptions: ["canonicalOnly", "concatenation"],
      };
    },
  },

  // 11 — three forms of one number plus an impostor.
  {
    id: "oddOneOutSameValue",
    bands: [3],
    subskill: "expandedForm",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const hundreds = randInt(1, 8);
      const tens = randInt(1, 9);
      const number = hundreds * 100 + tens * 10;
      const same = [
        `${hundreds * 100} + ${tens * 10}`,
        `${hundreds} hundreds ${tens} tens`,
        `${hundreds * 10 + tens} tens`,
      ];
      const impostor = `${hundreds} hundreds ${tens} ones`;
      return {
        a: number,
        answer: impostor,
        choices: shuffleArray([...same, impostor]),
        display: {
          type: "oddOneOutSameValue",
          promptText: `Which one is NOT ${number}?`,
          number,
          tens,
          ones: 0,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK3",
        misconceptions: ["digitNotValue", "placeValueSlip"],
      };
    },
  },

  // 12 — diagnose a place-value slip in someone else's writing.
  {
    id: "errorAnalysisDigitReversal",
    bands: [2, 3],
    subskill: "tensOnes",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const tens = randInt(2, 9);
      let ones = randInt(1, 9);
      while (ones === tens) ones = randInt(1, 9);
      const number = tens * 10 + ones;
      const reversed = ones * 10 + tens;
      const actor = pick(NAMES);
      return {
        a: number,
        answer: number,
        answerType: "numberPad",
        display: {
          type: "errorAnalysisDigitReversal",
          promptText: `${actor} wrote "${numberToWords(number)}" as ${reversed}. What is the correct number?`,
          number,
          tens,
          ones,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["digitReversal", "onesAsTens"],
      };
    },
  },

  // 13 — Open Middle construction. `digitTiles` is unbuilt, so the child types
  // the number they can build; the objective keeps the answer unique.
  {
    id: "openMiddleBuildNumber",
    bands: [3],
    subskill: "expandedForm",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const digits = shuffleArray([...new Set([randInt(1, 9), randInt(1, 9), randInt(1, 9)])]);
      while (digits.length < 3) {
        const d = randInt(1, 9);
        if (!digits.includes(d)) digits.push(d);
      }
      const largest = Math.random() < 0.5;
      const sorted = [...digits].sort((a, b) => (largest ? b - a : a - b));
      return {
        a: Number(sorted.join("")),
        answer: Number(sorted.join("")),
        answerType: "numberPad",
        display: {
          type: "openMiddleBuildNumber",
          promptText: `Using the digits ${digits.join(", ")} once each, make the ${largest ? "largest" : "smallest"} possible three-digit number.`,
          number: Number(sorted.join("")),
          tens: sorted[1],
          ones: sorted[2],
        },
        representation: "decomposition",
        cognitiveDemand: "DOK3",
        misconceptions: ["digitReversal", "placeValueSlip"],
      };
    },
  },

  // 14 — decomposition inside a story.
  {
    id: "placeValueInContext",
    bands: [1, 2, 3],
    subskill: "regroupingSense",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const number = randInt(21, Math.min(99, Math.max(30, maxFor(level))));
      const { tens, ones } = digitsOf(number);
      const actor = pick(NAMES);
      return {
        a: number,
        answer: tens,
        answerType: "numberPad",
        display: {
          type: "placeValueInContext",
          promptText: `${actor} packs pencils in boxes of 10. ${actor} has ${number} pencils. How many full boxes can ${actor} pack?`,
          number,
          tens,
          ones,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["onesAsTens", "digitReversal"],
      };
    },
  },

  // 15 — locate a number on a number line. The widget had no caller before M4
  // and place value is where "which ten is it near" lives.
  {
    id: "numberLineLocate",
    bands: [2, 3],
    subskill: "tensOnes",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const tensStep = bandOf(level) === 2 ? 10 : 100;
      const digit = randInt(1, 9);
      const number = digit * tensStep;
      return {
        a: number,
        answer: number,
        answerType: "numberLine",
        display: {
          type: "numberLineLocate",
          promptText: `Tap the number that is ${digit} ${tensStep === 10 ? "tens" : "hundreds"}.`,
          number,
          tens: tensStep === 10 ? digit : 0,
          ones: 0,
          min: 0,
          max: tensStep * 10,
          step: tensStep,
          labelEvery: 1,
          lineMode: "locate",
        },
        representation: "numberLine",
        cognitiveDemand: "DOK2",
        misconceptions: ["digitNotValue", "placeValueSlip"],
      };
    },
  },
];

export const PLACE_VALUE_VARIETY_IDS = VARIETIES.map((v) => v.id);

function chooseVariety(level, context = {}) {
  const forcedId = context.varietyId || LEGACY_TYPES[context.questionType];
  if (forcedId && !context.itemFamily) {
    const forced = VARIETIES.find((v) => v.id === forcedId);
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
  id: "placeValue",
  label: "Place Value!",
  shortLabel: "Place Value",
  description: "Tens, ones, expanded form — and how one number can be named two ways.",
  icon: "Layers",
  op: "place",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varieties: PLACE_VALUE_VARIETY_IDS,

  generate(level, context = {}) {
    const variety = chooseVariety(level, context);
    const built = variety.build(level);

    const question = {
      a: built.a ?? null,
      b: null,
      op: "place",
      answer: built.answer,
      level,
      display: built.display,
    };
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "placeValue",
      level,
      domain: "NBT",
      cluster: "Understand place value",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP6", "MP7"],
      standardRefs: ["1.NBT", "2.NBT"],
      misconceptionTags: built.misconceptions,
      blueprintId: `placeValue-${variety.family}-${variety.id}`,
      structureType: variety.id,
    });

    return maybeApplyFormat(question, level, { actor: pick(NAMES), ...context }, SUPPORTED_FORMATS);
  },

  generateChoices(answer, question) {
    if (typeof answer !== "number") return null;
    const { number, tens, ones } = question.display || {};
    const misconceptions = question.metadata?.misconceptionTags || [];
    const extra = [];
    // Place-value-specific wrong answers the generic strategies cannot know:
    // the other place's digit, and the digit-reversed value.
    if (misconceptions.includes("onesAsTens")) {
      if (Number.isFinite(tens) && tens !== answer) extra.push(tens);
      if (Number.isFinite(ones) && ones !== answer) extra.push(ones);
    }
    if (misconceptions.includes("digitReversal") && Number.isFinite(number) && number < 100) {
      extra.push((number % 10) * 10 + Math.floor(number / 10));
    }
    const choices = buildDistractors({ answer, misconceptions, min: 0 });
    if (!choices) return null;
    // Splice the diagnostic options in ahead of the generic near-misses.
    const merged = new Set([answer, ...extra.filter((v) => v >= 0 && v !== answer), ...choices]);
    return shuffleArray([...merged].slice(0, 4));
  },
};
