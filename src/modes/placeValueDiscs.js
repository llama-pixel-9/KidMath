import { randInt, shuffleArray } from "./helpers";
import { buildDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

/**
 * placeValueDiscs — Place Value Discs! (spec-part-c1-number-sense.md §placeValueDiscs)
 *
 * Before M4: one shape (read the discs, type the number) plus a `regroupSense`
 * variant that over-filled the ones column and still asked the same question —
 * and two subskills against the project's documented ≥3 minimum.
 *
 * The disc widget is still READ-ONLY, so the three spec varieties that require
 * dragging discs (2, 5, 7) are expressed as "what would the chart show" items
 * with a typed answer. That is called out in the report rather than hidden: the
 * manipulation upgrade is a widget build, not wiring.
 *
 * `standardRefs` is narrowed from the previous ["1.NBT","2.NBT","4.NBT"] claim,
 * which the spec says is broader than anything we can defend.
 */

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava"];
const PLACES = [1000, 100, 10, 1];

// readNumber (1-4), tradeRegroup (5-9), discOperations (10-12) — the spec's
// proposed cut, which is the first time this mode's subskills mean anything.
const SUBSKILLS = ["readNumber", "tradeRegroup", "discOperations"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);

function topPlace(level) {
  if (level <= 3) return 100;
  return 1000;
}

/** Canonical disc columns for this level: one digit per place, leading non-zero. */
function canonicalCols(level) {
  const places = PLACES.filter((p) => p <= topPlace(level));
  const counts = {};
  for (const p of places) counts[p] = randInt(0, 9);
  counts[places[0]] = randInt(1, 9);
  return places.map((place) => ({ place, count: counts[place] }));
}

const valueOf = (cols) => cols.reduce((sum, c) => sum + c.place * c.count, 0);

const PLACE_NAMES = { 1000: "thousands", 100: "hundreds", 10: "tens", 1: "ones" };

const VARIETIES = [
  // 1 — read the chart.
  {
    id: "readDiscs",
    bands: [1, 2, 3],
    subskill: "readNumber",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const cols = canonicalCols(level);
      return {
        answer: valueOf(cols),
        answerType: "placeValueDiscs",
        display: { type: "discs", cols, promptText: "What number do these discs show?" },
        representation: "placeValueBlocks",
        cognitiveDemand: "DOK1",
        misconceptions: ["placeValueSlip", "zeroColumnSkipped"],
      };
    },
  },

  // 2 — build a stated number. Read-only widget, so the child reports the count
  // one column needs rather than dragging discs onto the mat.
  {
    id: "buildWithDiscs",
    bands: [1, 2, 3],
    subskill: "readNumber",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const cols = canonicalCols(level);
      const number = valueOf(cols);
      const target = pick(cols);
      return {
        answer: target.count,
        answerType: "numberPad",
        display: {
          promptText: `You are making ${number} with discs. How many ${PLACE_NAMES[target.place]} discs do you need?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptions: ["placeValueSlip", "zeroColumnSkipped"],
      };
    },
  },

  // 3 — four charts, pick the matching one. `imageChoice` is unbuilt, so the
  // charts are described rather than drawn.
  {
    id: "whichChartShows",
    bands: [2, 3],
    subskill: "readNumber",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const h = randInt(1, 9);
      const t = randInt(0, 9);
      const o = randInt(0, 9);
      const number = h * 100 + t * 10 + o;
      const correct = `${h} hundreds, ${t} tens, ${o} ones`;
      const wrong = new Set([
        `${h} hundreds, ${o} tens, ${t} ones`,
        `${t} hundreds, ${h} tens, ${o} ones`,
        `${h} hundreds, ${t} tens, ${(o + 1) % 10} ones`,
        `${(h % 9) + 1} hundreds, ${t} tens, ${o} ones`,
      ]);
      wrong.delete(correct);
      return {
        answer: correct,
        choices: shuffleArray([correct, ...[...wrong].slice(0, 3)]),
        display: { promptText: `Which chart shows ${number}?` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["placeValueSlip", "zeroColumnSkipped"],
      };
    },
  },

  // 4 — one column's count is hidden.
  {
    id: "missingDiscCount",
    bands: [2, 3],
    subskill: "readNumber",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const cols = canonicalCols(level);
      const number = valueOf(cols);
      const hiddenIndex = randInt(0, cols.length - 1);
      const shown = cols
        .map((c, i) => (i === hiddenIndex ? `___ ${PLACE_NAMES[c.place]}` : `${c.count} ${PLACE_NAMES[c.place]}`))
        .join(", ");
      return {
        answer: cols[hiddenIndex].count,
        answerType: "numberPad",
        display: {
          promptText: `The chart shows ${shown}. The number is ${number}. How many ${PLACE_NAMES[cols[hiddenIndex].place]}?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["placeValueSlip", "discCountAsDigit"],
      };
    },
  },

  // 5 — over-filled ones column: perform the trade. The chart IS drawn, so the
  // child reads an uncanonical mat and reports its (unchanged) value.
  {
    id: "regroupOnesToTens",
    bands: [2, 3],
    subskill: "tradeRegroup",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const cols = canonicalCols(level);
      cols[cols.length - 1] = { place: 1, count: randInt(10, 18) };
      return {
        answer: valueOf(cols),
        answerType: "placeValueDiscs",
        display: {
          type: "discs",
          cols,
          promptText: "Trade 10 ones for 1 ten. What number do these discs show?",
        },
        representation: "placeValueBlocks",
        cognitiveDemand: "DOK2",
        misconceptions: ["regroupMiss", "discCountAsDigit", "tradeWrongDirection"],
      };
    },
  },

  // 6 — rename to a non-standard split.
  {
    id: "renameNonCanonical",
    bands: [3],
    subskill: "tradeRegroup",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const tens = randInt(3, 9);
      const ones = randInt(0, 9);
      const number = tens * 10 + ones;
      const keep = tens - randInt(1, 2);
      return {
        answer: number - keep * 10,
        answerType: "numberPad",
        display: {
          promptText: `Show ${number} as ${keep} tens and some ones. How many ones?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["regroupMiss", "tradeWrongDirection"],
      };
    },
  },

  // 7 — break a larger disc so a subtraction becomes possible.
  {
    id: "tradeDownForSubtraction",
    bands: [3],
    subskill: "tradeRegroup",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const tens = randInt(2, 9);
      const ones = randInt(0, 6);
      return {
        answer: ones + 10,
        answerType: "numberPad",
        display: {
          promptText: `The chart shows ${tens} tens and ${ones} ones. You trade 1 ten for 10 ones. How many ones will the chart show?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["tradeWrongDirection", "regroupMiss"],
      };
    },
  },

  // 8 — decide WHETHER a trade is needed, before computing.
  {
    id: "predictRegroupNeeded",
    bands: [2, 3],
    subskill: "tradeRegroup",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const a = randInt(11, 89);
      const b = randInt(11, 89);
      const needs = (a % 10) + (b % 10) >= 10;
      return {
        answer: needs ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: {
          promptText: `For ${a} + ${b}, will you need to trade ones for a ten?`,
          subPrompt: "Yes or no — do not add.",
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["regroupMiss"],
      };
    },
  },

  // 9 — a chart mid-calculation; name the next action.
  {
    id: "midComputationNext",
    bands: [3],
    subskill: "tradeRegroup",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const onesCount = randInt(11, 18);
      const correct = "Trade 10 ones for 1 ten";
      const options = [
        correct,
        "Trade 1 one for 1 ten",
        "Trade 10 tens for 1 one",
        "Nothing — the chart is finished",
      ];
      return {
        answer: correct,
        choices: shuffleArray(options),
        display: {
          promptText: `A chart in the middle of an addition shows ${onesCount} discs in the ones column. What must you do next?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["tradeWrongDirection", "regroupMiss"],
      };
    },
  },

  // 10 — a worked disc solution that skipped a trade.
  {
    id: "errorAnalysisNoTrade",
    bands: [3],
    subskill: "discOperations",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      // Force a genuine ones-column overflow so the described mistake is real.
      const a = randInt(12, 48) | 1; // odd => ones digit is never 0
      const b = randInt(12, 48);
      const aOnes = a % 10;
      const bFixed = Math.floor(b / 10) * 10 + randInt(10 - aOnes, 9);
      const total = a + bFixed;
      const tens = Math.floor(a / 10) + Math.floor(bFixed / 10);
      const ones = (a % 10) + (bFixed % 10);
      const actor = pick(NAMES);
      return {
        answer: total,
        answerType: "numberPad",
        display: {
          promptText: `${actor} added ${a} + ${bFixed} with discs and wrote ${tens} tens and ${ones} ones side by side. What is the real answer?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["regroupMiss", "discCountAsDigit"],
      };
    },
  },

  // 11 — repeat a disc set, then trade.
  {
    id: "discsForEqualGroups",
    bands: [3],
    subskill: "discOperations",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: () => {
      const tens = randInt(1, 4);
      const ones = randInt(1, 6);
      const times = randInt(2, 4);
      return {
        answer: (tens * 10 + ones) * times,
        answerType: "numberPad",
        display: {
          promptText: `Lay out ${tens} tens and ${ones} ones ${times} times. Trade the ones. What number is it?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["regroupMiss", "discCountAsDigit"],
      };
    },
  },

  // 12 — deal discs into equal boxes, trading down when needed.
  {
    id: "dealDiscsDivision",
    bands: [3],
    subskill: "discOperations",
    family: ITEM_FAMILIES.APPLICATION,
    build: () => {
      const boxes = randInt(2, 4);
      const perBox = randInt(11, 40);
      const total = boxes * perBox;
      const tens = Math.floor(total / 10);
      const ones = total % 10;
      return {
        answer: perBox,
        answerType: "numberPad",
        display: {
          promptText: `Deal ${tens} tens and ${ones} ones into ${boxes} equal boxes, trading when needed. How many in each box?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["divisionReversed", "regroupMiss"],
      };
    },
  },
];

export const PLACE_VALUE_DISCS_VARIETY_IDS = VARIETIES.map((v) => v.id);

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
  id: "placeValueDiscs",
  label: "Place Value Discs!",
  shortLabel: "PV Discs",
  description: "Read the discs, trade ten for one, and rename numbers.",
  icon: "CircleDot",
  op: "pvdiscs",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),
  varieties: PLACE_VALUE_DISCS_VARIETY_IDS,

  generate(level, context = {}) {
    const variety = chooseVariety(level, context);
    const built = variety.build(level);

    const question = {
      op: "pvdiscs",
      answer: built.answer,
      level,
      display: built.display,
    };
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "placeValueDiscs",
      level,
      domain: "NBT",
      cluster: "Understand place value with base-ten discs",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP7"],
      standardRefs: ["1.NBT", "2.NBT"],
      misconceptionTags: built.misconceptions,
      blueprintId: `placeValueDiscs-${variety.family}-${variety.id}`,
      structureType: variety.id,
    });

    return question;
  },

  generateChoices(answer, question) {
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
