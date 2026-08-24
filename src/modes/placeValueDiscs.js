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
  // Band 1 (levels 1-3) stays within tens+ones — hundreds mats at level 1
  // were the reported leak ("998 discs" for a K-1 kid). Hundreds join at
  // band 2, thousands at band 3.
  if (level <= 3) return 10;
  if (level <= 6) return 100;
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

/** "3 tens discs" / "1 ones disc" — the disc noun agrees with the count. */
const discPhrase = (count, placeName) => `${count} ${placeName} ${count === 1 ? "disc" : "discs"}`;

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
      // Judged single mat: the shown mat is right, place-swapped, or off by
      // one disc — the mat is SHOWN, never described in choice text.
      const kind = randInt(0, 2);
      const cols =
        kind === 0
          ? [{ place: 100, count: h }, { place: 10, count: t }, { place: 1, count: o }]
          : kind === 1
            ? [{ place: 100, count: h }, { place: 10, count: o }, { place: 1, count: t }]
            : [{ place: 100, count: h }, { place: 10, count: t }, { place: 1, count: (o + 1) % 10 }];
      const ok = kind === 0 || (kind === 1 && t === o);
      return {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: {
          figure: "discMat",
          discMat: { cols },
          promptText: `Does this mat show ${number}?`,
        },
        representation: "visual",
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

  // 13 — a tens-only mat: reading it IS counting by 10s.
  {
    id: "countTensDiscs",
    bands: [1, 2],
    subskill: "readNumber",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const tens = randInt(1, bandOf(level) === 1 ? 6 : 9);
      const cols = [
        { place: 10, count: tens },
        { place: 1, count: 0 },
      ];
      return {
        answer: tens * 10,
        answerType: "placeValueDiscs",
        display: {
          type: "discs",
          cols,
          promptText: "Count the tens discs by 10s. What number do the discs show?",
        },
        representation: "placeValueBlocks",
        cognitiveDemand: "DOK1",
        misconceptions: ["placeValueSlip", "discCountAsDigit"],
      };
    },
  },

  // 14 — a described mat, chosen from numbers: the classic disc-reading slip
  // (digit swap, disc-count-as-digit) sits right in the options.
  {
    id: "whichNumberShown",
    bands: [1, 2],
    subskill: "readNumber",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const tens = randInt(1, 5);
      let ones = randInt(1, 9);
      while (ones === tens) ones = randInt(1, 9);
      const number = tens * 10 + ones;
      const options = [...new Set([number, ones * 10 + tens, tens + ones, number + 10])];
      return {
        answer: number,
        choices: shuffleArray(options),
        // The mat is SHOWN — never describe the disc layout in words.
        display: {
          figure: "discMat",
          discMat: { cols: [{ place: 10, count: tens }, { place: 1, count: ones }] },
          promptText: pick([
            "Which number do the discs on this mat make?",
            "Read this mat. Which number do the discs show?",
            "Look at the mat. Which number is shown?",
          ]),
        },
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptions: ["placeValueSlip", "discCountAsDigit"],
      };
    },
  },

  // 15 — build the number the other way round: discs are named, the child
  // types the value they make.
  {
    id: "makeNumberFromDiscs",
    bands: [1, 2],
    subskill: "readNumber",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const tens = randInt(1, bandOf(level) === 1 ? 5 : 9);
      const ones = randInt(1, 9);
      const actor = pick(NAMES);
      return {
        answer: tens * 10 + ones,
        answerType: "numberPad",
        display: {
          figure: "discMat",
          discMat: { cols: [{ place: 10, count: tens }, { place: 1, count: ones }] },
          promptText: pick([
            `${actor} puts these discs on a mat. What number does ${actor} make?`,
            `Here are the discs ${actor} laid out. What number do they make?`,
            `${actor} builds a number with these discs. What number is it?`,
          ]),
        },
        representation: "visual",
        cognitiveDemand: "DOK1",
        misconceptions: ["placeValueSlip", "discCountAsDigit"],
      };
    },
  },

  // 16 — one more disc: adding a single disc moves the number by its place.
  // Counts stay at 8 or below so no trade is ever triggered.
  {
    id: "oneMoreDisc",
    bands: [1, 2],
    subskill: "discOperations",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: () => {
      const tens = randInt(1, 8);
      const ones = randInt(1, 8);
      const number = tens * 10 + ones;
      const addTen = Math.random() < 0.5;
      return {
        answer: number + (addTen ? 10 : 1),
        answerType: "numberPad",
        display: {
          figure: "discMat",
          discMat: { cols: [{ place: 10, count: tens }, { place: 1, count: ones }] },
          promptText: `You add 1 more ${addTen ? "tens" : "ones"} disc to this mat. What number do the discs show now?`,
        },
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptions: ["placeValueSlip", "discCountAsDigit"],
      };
    },
  },

  // 17 — one less disc: the mirror move, still trade-free.
  {
    id: "oneLessDisc",
    bands: [1, 2],
    subskill: "discOperations",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: () => {
      const tens = randInt(2, 9);
      const ones = randInt(1, 9);
      const takeTen = Math.random() < 0.5;
      return {
        answer: tens * 10 + ones - (takeTen ? 10 : 1),
        answerType: "numberPad",
        display: {
          figure: "discMat",
          discMat: { cols: [{ place: 10, count: tens }, { place: 1, count: ones }] },
          promptText: `Take away 1 ${takeTen ? "tens" : "ones"} disc from this mat. What number is left?`,
        },
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptions: ["placeValueSlip", "discCountAsDigit"],
      };
    },
  },

  // 18 — the ten-for-ones trade told verbally, entry sized: whole handfuls of
  // ones become tens and nothing is left over.
  {
    id: "tradeTenOnesForTens",
    bands: [1, 2],
    subskill: "tradeRegroup",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const groups = randInt(1, 3);
      const actor = pick(NAMES);
      return {
        answer: groups,
        answerType: "numberPad",
        display: {
          promptText: `${actor} has ${groups * 10} ones discs. ${actor} trades every 10 ones for 1 tens disc. How many tens discs does ${actor} get?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["tradeWrongDirection", "regroupMiss"],
      };
    },
  },

  // 19 — compare two described mats; tens must beat a big pile of ones.
  {
    id: "compareTwoMats",
    bands: [1, 2],
    subskill: "readNumber",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const t1 = randInt(1, 5);
      const o1 = randInt(0, 9);
      let t2 = randInt(1, 5);
      let o2 = randInt(0, 9);
      while (t2 * 10 + o2 === t1 * 10 + o1) {
        t2 = randInt(1, 5);
        o2 = randInt(0, 9);
      }
      return {
        answer: t1 * 10 + o1 > t2 * 10 + o2 ? "Mat A" : "Mat B",
        choices: ["Mat A", "Mat B"],
        display: {
          figure: "discMat",
          discMat: {
            mats: [
              { label: "Mat A", cols: [{ place: 10, count: t1 }, { place: 1, count: o1 }] },
              { label: "Mat B", cols: [{ place: 10, count: t2 }, { place: 1, count: o2 }] },
            ],
          },
          promptText: pick([
            "Which mat shows the bigger number?",
            "Compare the two mats. Which one shows more?",
            "Read both mats. Which mat makes the bigger number?",
          ]),
        },
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptions: ["placeValueSlip"],
      };
    },
  },

  // 20 — dropping tens discs one at a time is the disc form of counting by 10s.
  {
    id: "nextDiscCount",
    bands: [1, 2],
    subskill: "discOperations",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const k = randInt(1, 6);
      const actor = pick(NAMES);
      const said = [k * 10, k * 10 + 10, k * 10 + 20];
      return {
        answer: k * 10 + 30,
        answerType: "numberPad",
        display: {
          promptText: `${actor} drops tens discs onto the mat one at a time and counts: ${said.join(", ")}. What number does ${actor} say for the next disc?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptions: ["placeValueSlip", "discCountAsDigit"],
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
    // A targeted subskill wins over the family filter, but NOT over the band
    // filter — leaving the band served out-of-band magnitudes to little kids
    // (the numberBonds level-leak bug class). Fallback: family+subskill in
    // band -> any-family subskill in band -> subskill anywhere (last resort).
    const bySubskill = (arr) => arr.filter((v) => v.subskill === context.targetSubskill);
    const noStories = (arr) =>
      context.allowWordProblems === false
        ? arr.filter((v) => v.family !== ITEM_FAMILIES.APPLICATION)
        : arr;
    const inPool = bySubskill(pool);
    const inBandAnyFamily = noStories(
      bySubskill(VARIETIES.filter((v) => v.bands.includes(band)))
    );
    const anywhere = noStories(bySubskill(VARIETIES));
    if (inPool.length) pool = inPool;
    else if (inBandAnyFamily.length) pool = inBandAnyFamily;
    else if (anywhere.length) pool = anywhere;
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
