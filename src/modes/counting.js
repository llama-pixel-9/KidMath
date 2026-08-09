import { randInt, shuffleArray } from "./helpers";
import { buildDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { maybeApplyFormat } from "./formats";

/**
 * counting — Counting Chicks (spec-part-c1-number-sense.md §counting)
 *
 * Before M4 this mode had ONE question shape: render N emoji, pick the numeral.
 * The three declared subskills produced byte-identical output. The catalog below
 * implements the spec's 14 varieties (bar the two that need widgets we have not
 * built — `rangeInput` and `imageChoice`, both folded into `choice` per the
 * spec's own fallback note).
 *
 * Difficulty moves by STRUCTURE, not magnitude:
 *   band 1 (L1-3)  read a set, count on, compare two sets
 *   band 2 (L4-6)  unknown in a non-final position, hidden counts, estimation
 *   band 3 (L7-10) extraneous information, error analysis, larger scatters
 */

const OBJECTS = ["🍎", "⭐", "🐟", "🌸", "🟢", "🔵", "🍪", "🐢", "🎈", "🐤", "🦋", "🍓", "⚽", "🚗"];
// Spec note: `❤️` reads as decoration rather than a countable object, so it is
// no longer in the pool.

// Orange, not black: `⚫` sat outside the brand palette on every theme.
const DOTS = "🟠";
const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava"];

const RANGES = [
  { min: 3, max: 6 },
  { min: 3, max: 9 },
  { min: 4, max: 12 },
  { min: 6, max: 15 },
  { min: 8, max: 18 },
  { min: 10, max: 20 },
  { min: 10, max: 25 },
  { min: 12, max: 30 },
  { min: 15, max: 40 },
  { min: 20, max: 50 },
];

const SUBSKILLS = ["subitizing", "countOn", "cardinality"];

// Only `reflexive` fits a bare count (`8 = 8`); the equality formats need a
// relation that actually holds, which is true on the count-on varieties alone
// (they carry a real `a + b = answer`).
const SUPPORTED_FORMATS = ["reflexive", "trueFalse", "missingOperator", "estimation", "oddOneOut"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);
const countFor = (level) => {
  const r = RANGES[Math.min(Math.max(level, 1), RANGES.length) - 1];
  return randInt(r.min, r.max);
};
const nearestTen = (n) => Math.round(n / 10) * 10;

/**
 * The variety catalog. Each entry builds one complete item; `build` owns its own
 * correctness. Metadata that varies per variety (representation, demand,
 * misconception tags) is returned alongside the payload so nothing is guessed
 * centrally — a symbolic item never gets tagged `verbalContext`.
 */
const VARIETIES = [
  // 1 — K.CC.5 count an unordered set.
  {
    id: "countScatteredSet",
    bands: [1, 2, 3],
    subskill: "cardinality",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const n = countFor(level);
      return {
        answer: n,
        display: { emoji: pick(OBJECTS), count: n },
        representation: "objectSet",
        cognitiveDemand: "DOK1",
        misconceptions: ["doubleCount", "skipObject"],
      };
    },
  },

  // 2 — K.CC.3 write the numeral for a set.
  {
    id: "writeNumeralForSet",
    bands: [1, 2],
    subskill: "cardinality",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const n = countFor(level);
      return {
        answer: n,
        answerType: "numberPad",
        display: { emoji: pick(OBJECTS), count: n },
        representation: "objectSet",
        cognitiveDemand: "DOK1",
        misconceptions: ["doubleCount", "skipObject"],
      };
    },
  },

  // 3 — small arranged set, no counting needed. No timed reveal (see the
  // spec's reviewer note): a small dot pattern carries the same demand.
  {
    id: "subitizeSmallSet",
    bands: [1, 2],
    subskill: "subitizing",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const n = randInt(2, 6);
      // A mix of plain dots and real objects: all-dots every time read as
      // monotonous (#32), and subitizing works the same on any small set.
      return {
        answer: n,
        display: { emoji: Math.random() < 0.3 ? DOTS : pick(OBJECTS), count: n },
        representation: "objectSet",
        cognitiveDemand: "DOK1",
        misconceptions: ["doubleCount", "skipObject"],
      };
    },
  },

  // 4 — K.CC.4b-c conservation: same count, two arrangements.
  {
    id: "arrangementInvariance",
    bands: [1, 2],
    subskill: "subitizing",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const n = randInt(4, 9);
      const same = Math.random() < 0.5;
      const other = same ? n : n + (Math.random() < 0.5 ? 1 : -1);
      const emoji = pick(OBJECTS);
      return {
        answer: same ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: {
          promptText: `Group A: ${emoji.repeat(n)} Group B: ${emoji.repeat(other)} Do both groups have the same number?`,
        },
        representation: "objectSet",
        cognitiveDemand: "DOK2",
        misconceptions: [],
      };
    },
  },

  // 5 — K.CC.2 count on from a given number.
  {
    id: "countOnFromGiven",
    bands: [1, 2, 3],
    subskill: "countOn",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const start = bandOf(level) === 1 ? randInt(3, 9) : randInt(11, 40);
      const jump = randInt(2, 5);
      return {
        // `a + b = answer` genuinely holds here, so the equality formats can
        // fire — but only while both operands stay single-digit, because the
        // renderer switches to the vertical algorithm layout above that.
        ...(start < 10 && jump < 10 ? { a: start, b: jump, op: "+" } : {}),
        answer: start + jump,
        answerType: "numberPad",
        display: {
          promptText: `Start at ${start} and count on ${jump} more. What number do you land on?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptions: ["offByOne", "countAllNotOn"],
      };
    },
  },

  // 6 — count backward. Direction is the structural dial, not size.
  {
    id: "countBackFrom",
    bands: [1, 2, 3],
    subskill: "countOn",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const start = bandOf(level) === 1 ? randInt(6, 12) : randInt(14, 40);
      const sequence = [start, start - 1, start - 2];
      return {
        answer: start - 3,
        answerType: bandOf(level) === 1 ? undefined : "fillBlank",
        display: { sequence, step: -1 },
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptions: ["offByOne", "directionIgnored"],
      };
    },
  },

  // 7 — unknown in a NON-final position. Same numbers, harder structure.
  {
    id: "missingInCountSequence",
    bands: [2, 3],
    subskill: "countOn",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const start = bandOf(level) === 2 ? randInt(11, 60) : randInt(60, 180);
      const run = [start, start + 1, start + 2, start + 3, start + 4];
      const blank = randInt(1, 3);
      const shown = run.map((n, i) => (i === blank ? "___" : n)).join(", ");
      return {
        answer: run[blank],
        answerType: "fillBlank",
        display: { promptText: `Fill the blank: ${shown}` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["offByOne"],
      };
    },
  },

  // 8 — K.CC.6 compare two sets.
  {
    id: "compareTwoSets",
    bands: [1, 2],
    subskill: "cardinality",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const a = randInt(3, 9);
      let b = randInt(3, 9);
      while (b === a) b = randInt(3, 9);
      const emoji = pick(OBJECTS);
      return {
        answer: a > b ? "Group A" : "Group B",
        choices: ["Group A", "Group B"],
        display: {
          promptText: `Group A: ${emoji.repeat(a)} Group B: ${emoji.repeat(b)} Which group has more?`,
        },
        representation: "objectSet",
        cognitiveDemand: "DOK2",
        misconceptions: [],
      };
    },
  },

  // 9 — how many more to reach a target (Table 1 Compare, told as a story).
  {
    id: "countToTargetGap",
    bands: [1, 2, 3],
    subskill: "countOn",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const seats = bandOf(level) === 1 ? randInt(3, 8) : randInt(8, 24);
      const extra = randInt(1, 5);
      const kids = seats + extra;
      return {
        answer: extra,
        answerType: "numberPad",
        display: {
          promptText: `There are ${seats} seats on the bus and ${kids} children. How many children have no seat?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["operationSwap", "offByOne"],
      };
    },
  },

  // 10 — Splat: total known, part covered.
  {
    id: "hiddenCountSplat",
    bands: [2, 3],
    subskill: "countOn",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const total = bandOf(level) === 2 ? randInt(8, 20) : randInt(20, 50);
      const visible = randInt(1, total - 1);
      return {
        answer: total - visible,
        answerType: "numberPad",
        display: {
          promptText: `There are ${total} marbles in all. You can see ${visible}. The rest are under the cup. How many are hidden?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["operationSwap", "offByOne"],
      };
    },
  },

  // 11 — estimation. `rangeInput` is unbuilt, so this is the spec's own
  // fallback: a 3-way "about how many" choice.
  {
    id: "estimateThenCount",
    bands: [2, 3],
    subskill: "subitizing",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      let n = bandOf(level) === 2 ? randInt(12, 24) : randInt(22, 34);
      // A count ending in 5 has two equally near tens; nudge it so the answer
      // is unambiguous.
      if (n % 10 === 5) n += 1;
      const target = nearestTen(n);
      const candidates = [target, target + 10, target + 20, target + 30, target - 10, target * 3];
      const unique = [...new Set(candidates.filter((v) => v > 0))];
      return {
        answer: target,
        choices: shuffleArray(unique.slice(0, 4)),
        display: {
          promptText: `A jar holds these beads: ${DOTS.repeat(n)} About how many beads is that?`,
        },
        representation: "objectSet",
        cognitiveDemand: "DOK2",
        misconceptions: [],
      };
    },
  },

  // 12 — odd one out across representations of the same quantity.
  {
    id: "oddOneOutCount",
    bands: [2, 3],
    subskill: "subitizing",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const t = randInt(4, 9);
      const [e1, e2, e3] = shuffleArray([...OBJECTS]).slice(0, 3);
      const odd = e3.repeat(t + 1);
      const options = shuffleArray([e1.repeat(t), e2.repeat(t), String(t), odd]);
      return {
        answer: odd,
        choices: options,
        display: { promptText: `Three of these show ${t}. Which one does NOT?` },
        representation: "objectSet",
        cognitiveDemand: "DOK2",
        misconceptions: [],
      };
    },
  },

  // 13 — error analysis: a fictional child double-counts.
  {
    id: "errorAnalysisDoubleCount",
    bands: [2, 3],
    subskill: "cardinality",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const real = bandOf(level) === 2 ? randInt(6, 16) : randInt(15, 35);
      const actor = pick(NAMES);
      return {
        answer: real,
        answerType: "numberPad",
        display: {
          promptText: `${actor} counted ${real + 1} stickers but there are only ${real}. ${actor} pointed at one sticker twice. What is the real number?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["doubleCount", "offByOne"],
      };
    },
  },

  // 15 — ten frame: read how many. THE canonical K representation (MiF,
  // EngageNY); five-ness and ten-ness are visible instead of counted.
  {
    id: "tenFrameCount",
    bands: [1, 2],
    subskill: "subitizing",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const n = randInt(1, 10);
      return {
        answer: n,
        answerType: "tenFrame",
        display: { filled: n, frames: 1, frameMode: "count", promptText: "How many counters are in the ten frame?" },
        representation: "tenFrame",
        cognitiveDemand: "DOK1",
        misconceptions: ["doubleCount"],
      };
    },
  },

  // 16 — ten frame: how many EMPTY cells. The complement relation ("how many
  // more to fill it") seen structurally, before make-ten is ever symbolic.
  {
    id: "tenFrameEmpty",
    bands: [1, 2],
    subskill: "cardinality",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const n = randInt(2, 9);
      return {
        answer: 10 - n,
        answerType: "tenFrame",
        display: { filled: n, frames: 1, frameMode: "count", promptText: "How many empty cells does the frame have?" },
        representation: "tenFrame",
        cognitiveDemand: "DOK2",
        misconceptions: ["countAllNotOn"],
      };
    },
  },

  // 17 — ten frame: BUILD a number. Tap-to-place is 1:1 correspondence made
  // playable; the child's own counters are the answer.
  {
    id: "tenFrameBuild",
    bands: [1],
    subskill: "cardinality",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: () => {
      const n = randInt(2, 9);
      return {
        answer: n,
        answerType: "tenFrame",
        display: { filled: 0, frames: 1, frameMode: "build", promptText: `Put ${n} counters in the ten frame, then press Go.` },
        representation: "tenFrame",
        cognitiveDemand: "DOK1",
        misconceptions: ["doubleCount"],
      };
    },
  },

  // 18 — ten frame: make ten by DOING it. The frame starts partly filled; the
  // child adds counters until it is full and submits how many they added.
  {
    id: "tenFrameMakeTen",
    bands: [1, 2],
    subskill: "countOn",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const have = randInt(3, 9);
      return {
        answer: 10 - have,
        answerType: "tenFrame",
        display: { filled: have, frames: 1, frameMode: "build", promptText: "Fill the frame to make 10! How many did you add?" },
        representation: "tenFrame",
        cognitiveDemand: "DOK2",
        misconceptions: ["countAllNotOn", "offByOne"],
      };
    },
  },

  // 19 — teen numbers as a full ten and some more (K.NBT.1) on two frames.
  {
    id: "teenFrameCount",
    bands: [1, 2],
    subskill: "cardinality",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const more = randInt(1, 9);
      return {
        answer: 10 + more,
        answerType: "tenFrame",
        display: { filled: 10 + more, frames: 2, frameMode: "count", promptText: "A full ten frame and some more! How many in all?" },
        representation: "tenFrame",
        cognitiveDemand: "DOK2",
        misconceptions: ["offByOne"],
      };
    },
  },

  // 14 — a story carrying a quantity that must NOT be used.
  {
    id: "countGroupsExtraneous",
    bands: [3],
    subskill: "cardinality",
    family: ITEM_FAMILIES.APPLICATION,
    build: () => {
      const actor = pick(NAMES);
      const pens = randInt(3, 9);
      const pencils = randInt(3, 9);
      const erasers = randInt(2, 8);
      return {
        answer: pens + pencils,
        answerType: "numberPad",
        display: {
          promptText: `${actor} has ${pens} red pens, ${erasers} blue erasers, and ${pencils} red pencils. How many red things does ${actor} have?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["operationSwap"],
      };
    },
  },
];

export const COUNTING_VARIETY_IDS = VARIETIES.map((v) => v.id);

function chooseVariety(level, context = {}) {
  if (context.varietyId) {
    const forced = VARIETIES.find((v) => v.id === context.varietyId);
    if (forced) return forced;
  }
  const band = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(band));

  if (context.itemFamily) {
    // An explicitly requested family wins over the band filter: the engine asks
    // for one when it wants a bank item of that family behind it.
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
  id: "counting",
  label: "Counting Chicks",
  shortLabel: "Counting",
  description: "Count to 100",
  icon: "Hash",
  glyph: "12",
  op: "count",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varieties: COUNTING_VARIETY_IDS,

  generate(level, context = {}) {
    const variety = chooseVariety(level, context);
    const built = variety.build(level);

    const question = {
      a: built.a ?? null,
      b: built.b ?? null,
      op: built.op || "count",
      answer: built.answer,
      level,
      display: built.display,
    };
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "counting",
      level,
      domain: "CC",
      cluster: "Count to tell the number of objects",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP6"],
      standardRefs: ["K.CC"],
      misconceptionTags: built.misconceptions,
      blueprintId: `counting-${variety.family}-${variety.id}`,
      structureType: variety.id,
    });

    return maybeApplyFormat(question, level, { actor: pick(NAMES), ...context }, SUPPORTED_FORMATS);
  },

  generateChoices(answer, question) {
    // Items with an authored option set (yes/no, odd-one-out, estimation) carry
    // `choices` and never reach here; the engine returns those directly.
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      a: question.display?.count ?? answer,
      b: 1,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
