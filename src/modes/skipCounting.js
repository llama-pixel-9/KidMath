import { randInt, shuffleArray } from "./helpers";
import { buildSequenceDistractors, buildDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { maybeApplyFormat } from "./formats";

/**
 * skipCounting — Skip Count! (spec-part-c1-number-sense.md §skipCounting)
 *
 * Before M4: one shape (show three terms, ask the fourth) and a word-problem
 * template that stated the rule the item was meant to test ("A pattern grows by
 * 5. What comes next?"). The spec says delete that prompt rather than extend it,
 * and it is gone.
 *
 * The structural ladder the spec calls for is `nextTermForward` →
 * `missingMiddleTerm` → `missingStartTerm` → `offMultipleStart`. None of those
 * change how big the numbers are; all of them change where the unknown sits.
 */

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava"];

// Step and magnitude still grow with level, but they are now the SECOND dial:
// structure comes from the variety, which is chosen by band.
const LEVELS = [
  { steps: [2], startMax: 6 },
  { steps: [2, 5], startMax: 14 },
  { steps: [5, 10], startMax: 20 },
  { steps: [2, 5, 10], startMax: 40 },
  { steps: [3, 5, 10], startMax: 50 },
  { steps: [3, 4, 10], startMax: 60 },
  { steps: [3, 4, 5], startMax: 60 },
  { steps: [3, 4, 6], startMax: 80 },
  { steps: [4, 6, 25], startMax: 100 },
  { steps: [4, 6, 25, 50], startMax: 120 },
];

const SUBSKILLS = ["patternRule", "stepInference", "groupsToProduct"];

// Only the multiplicative variety carries a relation the equality formats can
// read (`groups x size = total`); `reflexive` needs nothing but a number.
const SUPPORTED_FORMATS = [
  "reflexive",
  "trueFalse",
  "commutative",
  "missingOperator",
  "estimation",
  "factFamily",
];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);

function config(level) {
  return LEVELS[Math.min(Math.max(level, 1), LEVELS.length) - 1];
}

/** A step and an on-multiple start for this level. */
function run(level, terms) {
  const cfg = config(level);
  const step = pick(cfg.steps);
  const start = randInt(0, Math.max(1, Math.floor(cfg.startMax / step))) * step;
  const sequence = Array.from({ length: terms }, (_, i) => start + step * i);
  return { step, start, sequence };
}

const VARIETIES = [
  // 1 — 2.NBT.2 next term of a skip-count run.
  {
    id: "nextTermForward",
    bands: [1, 2, 3],
    subskill: "patternRule",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const { step, sequence } = run(level, 3);
      return {
        answer: sequence[2] + step,
        // Grade 2+ types the next term; K-1 keeps tap-friendly bubbles.
        answerType: bandOf(level) === 1 ? undefined : "fillBlank",
        display: { sequence, step },
        representation: "sequence",
        cognitiveDemand: "DOK1",
        misconceptions: ["wrongStep", "patternReset"],
        step,
      };
    },
  },

  // 2 — same step, opposite direction.
  {
    id: "nextTermBackward",
    bands: [2, 3],
    subskill: "patternRule",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const cfg = config(level);
      const step = pick(cfg.steps);
      // Start high enough that four descending terms all stay at or above zero.
      const top = randInt(4, Math.max(5, Math.floor(cfg.startMax / step))) * step;
      const sequence = [top, top - step, top - 2 * step];
      return {
        answer: top - 3 * step,
        answerType: "fillBlank",
        display: { sequence, step: -step },
        representation: "sequence",
        cognitiveDemand: "DOK2",
        misconceptions: ["directionIgnored", "wrongStep"],
        step,
      };
    },
  },

  // 3 — unknown in a non-final position.
  {
    id: "missingMiddleTerm",
    bands: [2, 3],
    subskill: "stepInference",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const { step, sequence } = run(level, 4);
      const blank = randInt(1, 2);
      const shown = sequence.map((n, i) => (i === blank ? "___" : n)).join(", ");
      return {
        answer: sequence[blank],
        answerType: "fillBlank",
        display: { promptText: `${shown}` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["wrongStep", "countsTermsNotValues"],
        step,
      };
    },
  },

  // 4 — Start Unknown: the hardest position, by analogy to Table 1.
  {
    id: "missingStartTerm",
    bands: [3],
    subskill: "stepInference",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const { step, sequence } = run(level, 4);
      // Keep the hidden first term positive so "___" has a sensible answer.
      const lifted = sequence[0] === 0 ? sequence.map((n) => n + step) : sequence;
      return {
        answer: lifted[0],
        answerType: "fillBlank",
        display: { promptText: `___, ${lifted[1]}, ${lifted[2]}, ${lifted[3]}` },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["wrongStep", "countsTermsNotValues"],
        step,
      };
    },
  },

  // 5 — same step, run does not start on a multiple.
  {
    id: "offMultipleStart",
    bands: [3],
    subskill: "stepInference",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const cfg = config(level);
      const step = pick(cfg.steps.filter((s) => s > 2)) ?? 3;
      const start = randInt(1, step - 1) + randInt(0, 5) * step;
      const sequence = [start, start + step, start + 2 * step];
      return {
        answer: start + 3 * step,
        answerType: "fillBlank",
        display: { promptText: `${sequence.join(", ")}, ___` },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["offMultipleReset", "wrongStep"],
        step,
      };
    },
  },

  // 6 — name the rule instead of extending it.
  {
    id: "identifyRule",
    bands: [2, 3],
    subskill: "stepInference",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const { step, sequence } = run(level, 4);
      const wrong = [step + 1, step - 1, step * 2].filter((s) => s > 0 && s !== step);
      const options = [`add ${step}`, ...[...new Set(wrong)].slice(0, 3).map((s) => `add ${s}`)];
      return {
        answer: `add ${step}`,
        choices: shuffleArray([...new Set(options)]),
        display: { promptText: `What is the rule? ${sequence.join(", ")}` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["wrongStep"],
        step,
      };
    },
  },

  // 7 — decidable without extending the count.
  {
    id: "membershipTrueFalse",
    bands: [2, 3],
    subskill: "patternRule",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const step = pick(config(level).steps);
      const multiple = step * randInt(3, 12);
      const isMember = Math.random() < 0.5;
      const target = isMember ? multiple : multiple + randInt(1, step - 1 || 1);
      return {
        answer: target % step === 0 ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: {
          promptText: `If you count by ${step}s from 0, will you say ${target}?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["wrongStep"],
        step,
      };
    },
  },

  // 8 — equal groups counted by the group size (story form).
  {
    id: "groupsToTotal",
    bands: [1, 2, 3],
    subskill: "groupsToProduct",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const step = pick(config(level).steps.filter((s) => s <= 10)) ?? 5;
      const groups = randInt(3, 6);
      const actor = pick(NAMES);
      return {
        answer: step * groups,
        answerType: "numberPad",
        display: {
          promptText: `Each box holds ${step} crayons. ${actor} counts the crayons in ${groups} boxes. What number does ${actor} say last?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["operationSwap", "wrongStep"],
        step,
      };
    },
  },

  // 8b — the same mathematics, symbolically. This is the one variety that
  // carries a real `a x b = answer`, which is what lets the equality formats
  // apply to this mode at all.
  {
    id: "groupsToTotalSymbolic",
    bands: [2, 3],
    subskill: "groupsToProduct",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const step = pick(config(level).steps.filter((s) => s <= 10)) ?? 5;
      const groups = randInt(2, 9);
      return {
        a: groups,
        b: step,
        op: "x",
        answer: groups * step,
        answerType: "numberPad",
        display: { promptText: `${groups} groups of ${step} = ?` },
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptions: ["wrongStep", "factNeighbor"],
        step,
      };
    },
  },

  // 9 — predict the final term before counting.
  {
    id: "predictLastCount",
    bands: [3],
    subskill: "groupsToProduct",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const step = pick(config(level).steps.filter((s) => s <= 10)) ?? 4;
      const children = randInt(6, 12);
      return {
        answer: step * children,
        answerType: "numberPad",
        display: {
          promptText: `A class of ${children} children counts by ${step}s, one number each, starting at ${step}. What number does the last child say?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["wrongStep", "operationSwap"],
        step,
      };
    },
  },

  // 10 — which number is not in the count?
  {
    id: "oddOneOutNotMultiple",
    bands: [2, 3],
    subskill: "patternRule",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const step = pick(config(level).steps.filter((s) => s >= 3)) ?? 3;
      const multiples = new Set();
      while (multiples.size < 3) multiples.add(step * randInt(2, 12));
      let odd = step * randInt(2, 12) + randInt(1, step - 1 || 1);
      while (odd % step === 0 || multiples.has(odd)) odd += 1;
      return {
        answer: odd,
        choices: shuffleArray([...multiples, odd]),
        display: { promptText: `Which number would you NOT say counting by ${step}s?` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["wrongStep"],
        step,
      };
    },
  },

  // 11 — find the break in someone else's count.
  {
    id: "errorAnalysisSkipSlip",
    bands: [2, 3],
    subskill: "stepInference",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const { step, sequence } = run(level, 5);
      const slipIndex = randInt(2, 4);
      const slip = sequence[slipIndex] + (Math.random() < 0.5 ? 1 : -1);
      const shown = sequence.map((n, i) => (i === slipIndex ? slip : n));
      const actor = pick(NAMES);
      return {
        answer: slip,
        choices: shuffleArray(shown.slice(1)),
        display: {
          promptText: `${actor} counted by ${step}s: ${shown.join(", ")}. Which number is wrong?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["wrongStep"],
        step,
      };
    },
  },

  // 12 — choral count laid out in a grid; read DOWN a column.
  {
    id: "choralCountColumn",
    bands: [3],
    subskill: "stepInference",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const step = pick(config(level).steps.filter((s) => s <= 10)) ?? 3;
      const cols = 5;
      const rows = [0, 1, 2].map((r) =>
        Array.from({ length: cols }, (_, c) => step * (r * cols + c + 1))
      );
      const r = randInt(0, 1);
      const c = randInt(0, cols - 1);
      const target = rows[r][c];
      return {
        answer: rows[r + 1][c],
        answerType: "numberPad",
        display: {
          promptText: `Counting by ${step}s: ${rows.map((row) => row.join(" ")).join(" / ")}. What number is directly below ${target}?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["wrongStep"],
        step,
      };
    },
  },

  // 13 — equal jumps on a number line (the widget the plan called a real gap).
  // Band 1 keeps the same hop game with fewer jumps and the level's small steps.
  {
    id: "numberLineJumps",
    bands: [1, 2, 3],
    subskill: "patternRule",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const step = pick(config(level).steps.filter((s) => s <= 10)) ?? 5;
      const jumps = randInt(2, bandOf(level) === 1 ? 4 : 5);
      const max = step * 10;
      return {
        answer: step * jumps,
        answerType: "numberLine",
        display: {
          promptText: `Start at 0 and make ${jumps} jumps of ${step}. Tap where you land.`,
          min: 0,
          max,
          step,
          labelEvery: 1,
          lineMode: "locate",
        },
        representation: "numberLine",
        cognitiveDemand: "DOK2",
        misconceptions: ["wrongStep", "countsTermsNotValues"],
        step,
      };
    },
  },

  // 14 — K-1 entry: things that come in twos, drawn in pairs. The visual
  // "count by 2s" every K-2 curriculum opens with.
  {
    id: "pairsOfObjects",
    bands: [1, 2],
    subskill: "groupsToProduct",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const pairs = randInt(2, bandOf(level) === 1 ? 5 : 8);
      const [emoji, noun] = pick([
        ["🧦", "socks"],
        ["🧤", "mittens"],
        ["👟", "shoes"],
      ]);
      const groups = Array.from({ length: pairs }, () => emoji.repeat(2)).join("  ");
      return {
        answer: pairs * 2,
        display: {
          promptText: `Count the ${noun} by 2s: ${groups} How many ${noun} are there in all?`,
        },
        representation: "objectSet",
        cognitiveDemand: "DOK1",
        misconceptions: ["wrongStep", "countsTermsNotValues"],
        step: 2,
      };
    },
  },

  // 15 — fives live on hands: count fingers hand by hand.
  {
    id: "fingersByFives",
    bands: [1, 2],
    subskill: "groupsToProduct",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const hands = randInt(2, bandOf(level) === 1 ? 4 : 6);
      return {
        answer: hands * 5,
        display: {
          promptText: `Every hand shows 5 fingers: ${"✋".repeat(hands)} Count by 5s. How many fingers do the hands show?`,
        },
        representation: "objectSet",
        cognitiveDemand: "DOK1",
        misconceptions: ["wrongStep"],
        step: 5,
      };
    },
  },

  // 16 — tens live on dimes: count coins by 10s.
  {
    id: "dimesToCents",
    bands: [1, 2],
    subskill: "groupsToProduct",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const dimes = randInt(2, bandOf(level) === 1 ? 5 : 9);
      return {
        answer: dimes * 10,
        display: {
          promptText: `Each dime is worth 10 cents: ${"🪙".repeat(dimes)} Count by 10s. How many cents are the dimes worth?`,
        },
        representation: "objectSet",
        cognitiveDemand: "DOK2",
        misconceptions: ["wrongStep"],
        step: 10,
      };
    },
  },

  // 17 — the counting song: continue the chant one more number.
  {
    id: "countSongNext",
    bands: [1],
    subskill: "patternRule",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const step = pick(config(level).steps);
      const seq = [step, step * 2, step * 3];
      return {
        answer: step * 4,
        display: {
          promptText: `Sing the ${step}s counting song: ${seq.join(", ")}... What number comes next in the song?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptions: ["wrongStep", "patternReset"],
        step,
      };
    },
  },

  // 18 — count back by 10s from a decade, the entry-level backward run.
  {
    id: "decadeCountBack",
    bands: [1, 2],
    subskill: "patternRule",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: (level) => {
      const top = randInt(4, bandOf(level) === 1 ? 6 : 9) * 10;
      return {
        answer: top - 30,
        display: {
          promptText: `Count back by 10s: ${top}, ${top - 10}, ${top - 20}. What number do you say next?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["directionIgnored", "wrongStep"],
        step: 10,
      };
    },
  },

  // 19 — entry odd-one-out over small multiples of the level's steps.
  {
    id: "whichNotInCount",
    bands: [1],
    subskill: "patternRule",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const step = pick(config(level).steps);
      const multiples = new Set();
      while (multiples.size < 3) multiples.add(step * randInt(1, 6));
      // A non-zero remainder keeps the odd number off the count for certain.
      const odd = step * randInt(1, 5) + randInt(1, step - 1);
      return {
        answer: odd,
        choices: shuffleArray([...multiples, odd]),
        display: {
          promptText: `Three of these numbers belong in the count by ${step}s. Which number does NOT belong?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["wrongStep"],
        step,
      };
    },
  },

  // 20 — pairs told as a story (K-1 sized equal groups of 2).
  {
    id: "pairsStory",
    bands: [1, 2],
    subskill: "groupsToProduct",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const actor = pick(NAMES);
      const pairs = randInt(2, bandOf(level) === 1 ? 5 : 9);
      return {
        answer: pairs * 2,
        answerType: "numberPad",
        display: {
          promptText: `${actor} has ${pairs} pairs of socks. Each pair has 2 socks. How many socks does ${actor} have in all?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["operationSwap", "wrongStep"],
        step: 2,
      };
    },
  },

  // 21 — twos inside a ten frame: the counters pair up column by column.
  {
    id: "tenFrameTwos",
    bands: [1, 2],
    subskill: "groupsToProduct",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const n = 2 * randInt(1, 5);
      return {
        answer: n,
        answerType: "tenFrame",
        display: {
          filled: n,
          frames: 1,
          frameMode: "count",
          promptText: "The counters in the frame make twos. Count by 2s. How many counters are in the frame?",
        },
        representation: "tenFrame",
        cognitiveDemand: "DOK1",
        misconceptions: ["wrongStep"],
        step: 2,
      };
    },
  },
];

export const SKIP_COUNTING_VARIETY_IDS = VARIETIES.map((v) => v.id);

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
  id: "skipCounting",
  label: "Skip Count!",
  shortLabel: "Skip Counting",
  description: "Count by 2s, 5s, 10s and more — forwards, backwards and in between.",
  icon: "FastForward",
  op: "skip",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varieties: SKIP_COUNTING_VARIETY_IDS,

  generate(level, context = {}) {
    const variety = chooseVariety(level, context);
    const built = variety.build(level);

    const question = {
      a: built.a ?? null,
      b: built.b ?? null,
      op: built.op || "skip",
      answer: built.answer,
      level,
      display: built.display,
    };
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;
    question.step = built.step;

    question.metadata = createQuestionMetadata({
      modeId: "skipCounting",
      level,
      domain: "OA",
      cluster: "Gain foundations for multiplication",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP1", "MP7", "MP8"],
      standardRefs: ["2.NBT", "2.OA", "3.OA"],
      misconceptionTags: built.misconceptions,
      blueprintId: `skipCounting-${variety.family}-${variety.id}`,
      structureType: variety.id,
    });

    return maybeApplyFormat(question, level, { actor: pick(NAMES), ...context }, SUPPORTED_FORMATS);
  },

  generateChoices(answer, question) {
    if (typeof answer !== "number") return null;
    const step = question.display?.step ?? question.step;
    if (Number.isFinite(step) && step !== 0) {
      return buildSequenceDistractors({
        answer,
        step: Math.abs(step),
        misconceptions: question.metadata?.misconceptionTags || [],
      });
    }
    return buildDistractors({
      answer,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
