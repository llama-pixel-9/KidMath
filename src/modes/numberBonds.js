import { randInt, shuffleArray } from "./helpers";
import { buildDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { maybeApplyFormat } from "./formats";

/**
 * numberBonds — Number Bonds! (spec-part-c1-number-sense.md §numberBonds)
 *
 * Research §3.3 states the design principle directly: **which node is blank
 * should be a first-class generator parameter**. Before M4 exactly one node was
 * ever blank (a part), and the three subskills produced identical items.
 *
 * The three declared subskills are kept — renaming them would strand any bank
 * item keyed to them — but they now carry real information:
 *   partWhole    whole unknown, three-part and place-value bonds
 *   missingPart  a part unknown, including non-canonical and story forms
 *   decompose    open/multi-answer bonds, fact families, judged claims
 */

const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava"];
const SUBSKILLS = ["partWhole", "missingPart", "decompose"];

// Adjective pairs + noun for the part-part-whole stories; the noun is restated
// in the question, which the QC layer requires of every "How many" item.
const STORY_SETS = [
  ["red", "blue", "cups"],
  ["big", "small", "shells"],
  ["green", "yellow", "beads"],
  ["long", "short", "ribbons"],
];

// `wholeUnknown` is the one variety carrying a true `a + b = answer`, which is
// what makes the equality formats legitimate here.
const SUPPORTED_FORMATS = [
  "reflexive",
  "trueFalse",
  "equationReversed",
  "commutative",
  "missingOperator",
  "oddOneOut",
  "twoCorrect",
  "balanceOpen",
];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);

function wholeFor(level) {
  const band = bandOf(level);
  if (band === 1) return randInt(4, 10);
  if (band === 2) return randInt(8, 20);
  return randInt(20, 100);
}

const VARIETIES = [
  // 1 — K.OA.3 both parts given, find the whole.
  {
    id: "wholeUnknown",
    bands: [1, 2, 3],
    subskill: "partWhole",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = wholeFor(level);
      const p1 = randInt(1, whole - 1);
      const p2 = whole - p1;
      return {
        // Single-digit only for the arithmetic fields: above that the renderer
        // switches to the vertical algorithm layout, which is wrong for a bond.
        ...(p1 < 10 && p2 < 10 ? { a: p1, b: p2, op: "+" } : {}),
        answer: whole,
        answerType: "numberPad",
        display: { promptText: `The two parts are ${p1} and ${p2}. What is the whole?`, whole, part: p1 },
        representation: "decomposition",
        cognitiveDemand: "DOK2",
        misconceptions: ["partEchoed", "countAllError"],
      };
    },
  },

  // 2 — 1.OA.4 subtraction as an unknown addend. The bond diagram itself.
  {
    id: "partUnknown",
    bands: [1, 2, 3],
    subskill: "missingPart",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = wholeFor(level);
      const part = randInt(1, whole - 1);
      return {
        answer: whole - part,
        answerType: "numberBond",
        display: { whole, part, promptText: `Whole is ${whole}. One part is ${part}. What is the other part?` },
        representation: "numberBond",
        cognitiveDemand: "DOK2",
        misconceptions: ["partWholeSwap", "wholeAsPart", "partEchoed"],
      };
    },
  },

  // 2b — the bond as a sentence with the FIRST slot blank. Same relation as
  // `partUnknown`, but the unknown sits in a non-final position and there is
  // no diagram to lean on.
  {
    id: "bondSentence",
    bands: [1, 2],
    subskill: "missingPart",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = bandOf(level) === 1 ? randInt(4, 10) : randInt(8, 20);
      const part = randInt(1, whole - 1);
      return {
        answer: whole - part,
        answerType: "numberPad",
        display: {
          promptText: `___ and ${part} make ${whole}. What is the missing number?`,
          whole,
          part,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["partWholeSwap", "partEchoed"],
      };
    },
  },

  // 2c — make ten on a ten frame: the filled cells are the known part, the
  // empty cells are the unknown part, and ten-ness is visible instead of told.
  {
    id: "makeTenFrameBond",
    bands: [1, 2],
    subskill: "missingPart",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const part = randInt(3, 9);
      return {
        answer: 10 - part,
        answerType: "tenFrame",
        display: {
          filled: part,
          frames: 1,
          frameMode: "count",
          promptText: "The frame shows one part of 10. How many more counters make 10?",
          whole: 10,
          part,
        },
        representation: "tenFrame",
        cognitiveDemand: "DOK2",
        misconceptions: ["partEchoed", "countAllError"],
      };
    },
  },

  // 2d — doubles: the one bond family K children retrieve rather than count,
  // which makes it the anchor for near-doubles later.
  {
    id: "doublesBond",
    bands: [1],
    subskill: "partWhole",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: () => {
      const n = randInt(1, 5);
      return {
        a: n,
        b: n,
        op: "+",
        answer: n + n,
        answerType: "numberPad",
        display: { promptText: `What number do ${n} and ${n} make together?`, whole: n + n, part: n },
        representation: "decomposition",
        cognitiveDemand: "DOK1",
        misconceptions: ["countAllError", "partEchoed"],
      };
    },
  },

  // 2e — part-part-whole story with the WHOLE unknown; `bondFromStory` keeps
  // the part-unknown telling, so between them both story directions exist.
  {
    id: "storyWholeUnknown",
    bands: [1, 2],
    subskill: "partWhole",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const top = bandOf(level) === 1 ? 5 : 9;
      const p1 = randInt(2, top);
      const p2 = randInt(2, top);
      const actor = pick(NAMES);
      const [adj1, adj2, noun] = pick(STORY_SETS);
      return {
        answer: p1 + p2,
        answerType: "numberPad",
        display: {
          promptText: `${actor} has ${p1} ${adj1} ${noun} and ${p2} ${adj2} ${noun}. How many ${noun} does ${actor} have in all?`,
          whole: p1 + p2,
          part: p1,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["countAllError", "partEchoed"],
      };
    },
  },

  // 2f — recognise a bond among near-misses: the recognition-side counterpart
  // of `oddOneOutBond` (which asks for the pair that does NOT bond).
  {
    id: "whichPairMakesWhole",
    bands: [1, 2],
    subskill: "decompose",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = bandOf(level) === 1 ? randInt(5, 10) : randInt(8, 16);
      const p = randInt(1, whole - 1);
      const correct = `${p} and ${whole - p}`;
      const wrong = new Set();
      while (wrong.size < 3) {
        const x = randInt(1, whole);
        const y = randInt(1, whole);
        if (x + y === whole) continue; // a second correct pair would be unjudgeable
        wrong.add(`${x} and ${y}`);
      }
      return {
        answer: correct,
        choices: shuffleArray([correct, ...wrong]),
        display: { promptText: `Which pair of numbers makes ${whole}?`, whole, part: p },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["countAllError"],
      };
    },
  },

  // 3 — K.OA.3 decompose in more than one way. Multi-answer, which is exactly
  // what `multiSelect` was built for.
  {
    id: "openDecomposition",
    bands: [2, 3],
    subskill: "decompose",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = bandOf(level) === 2 ? randInt(6, 14) : randInt(12, 30);
      const rightA = randInt(1, whole - 1);
      let rightB = randInt(1, whole - 1);
      while (rightB === rightA || rightB === whole - rightA) rightB = randInt(1, whole - 1);
      const correct = [`${rightA} and ${whole - rightA}`, `${rightB} and ${whole - rightB}`];
      const wrong = [`${rightA} and ${whole - rightA + 1}`, `${rightB} and ${whole - rightB + 2}`];
      return {
        answer: correct,
        answerType: "multiSelect",
        display: {
          promptText: `Choose BOTH pairs that make ${whole}.`,
          options: shuffleArray([...correct, ...wrong]),
          requiredCount: 2,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["countAllError"],
      };
    },
  },

  // 4 — one bond, four number sentences.
  {
    id: "factFamily",
    bands: [2, 3],
    subskill: "decompose",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = bandOf(level) === 2 ? randInt(6, 20) : randInt(20, 60);
      let p1 = randInt(1, whole - 1);
      // Equal parts would make the two "correct" sentences identical and would
      // also make one of the distractors accidentally true.
      if (p1 * 2 === whole) p1 -= 1;
      const p2 = whole - p1;
      const correct = [`${whole} - ${p1} = ${p2}`, `${whole} - ${p2} = ${p1}`];
      const wrong = [`${whole} - ${p1} = ${p1}`, `${p1} - ${p2} = ${whole}`];
      return {
        answer: correct,
        answerType: "multiSelect",
        display: {
          promptText: `Choose BOTH subtraction sentences this bond makes: whole ${whole}, parts ${p1} and ${p2}.`,
          options: shuffleArray([...new Set([...correct, ...wrong])]),
          requiredCount: 2,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptions: ["partWholeSwap"],
      };
    },
  },

  // 5 — 1.OA.2 three addends: the whole splits three ways.
  {
    id: "threePartBond",
    bands: [2, 3],
    subskill: "partWhole",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = bandOf(level) === 2 ? randInt(8, 20) : randInt(20, 60);
      const p1 = randInt(1, whole - 2);
      const p2 = randInt(1, whole - p1 - 1);
      return {
        answer: whole - p1 - p2,
        answerType: "numberPad",
        display: {
          promptText: `The whole is ${whole}. Two parts are ${p1} and ${p2}. What is the third part?`,
          whole,
          part: p1,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK3",
        misconceptions: ["partWholeSwap", "countAllError"],
      };
    },
  },

  // 6 — make ten: split one addend to bridge.
  {
    id: "makeTenBond",
    bands: [2, 3],
    subskill: "decompose",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const a = randInt(6, 9);
      const b = randInt(11 - a, 9); // guarantees a + b > 10 so a bridge is needed
      const toTen = 10 - a;
      return {
        answer: b - toTen,
        answerType: "numberPad",
        display: {
          promptText: `To add ${a} + ${b}, split the ${b} into ${toTen} and ___ so you can make 10 first.`,
          whole: b,
          part: toTen,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK3",
        misconceptions: ["bridgeOvershoot", "countAllError"],
      };
    },
  },

  // 7 — decompose a number by place.
  {
    id: "placeValueBond",
    bands: [3],
    subskill: "partWhole",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const h = randInt(1, 9);
      const t = randInt(1, 9);
      const o = randInt(1, 9);
      const number = h * 100 + t * 10 + o;
      return {
        answer: t * 10,
        answerType: "numberPad",
        display: {
          promptText: `Split ${number} into hundreds, tens and ones: ${h * 100}, ___, ${o}.`,
          whole: number,
          part: h * 100,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK2",
        misconceptions: ["placeDigitBond", "placeValueSlip"],
      };
    },
  },

  // 8 — bonds to 100 and 1000.
  {
    id: "largeMagnitudeBond",
    bands: [3],
    subskill: "missingPart",
    family: ITEM_FAMILIES.PROCEDURAL,
    build: () => {
      const whole = pick([100, 100, 1000]);
      const part = whole === 100 ? randInt(1, 19) * 5 : randInt(1, 19) * 50;
      return {
        answer: whole - part,
        answerType: "numberBond",
        display: { whole, part, promptText: `Whole is ${whole}. One part is ${part}. What is the other part?` },
        representation: "numberBond",
        cognitiveDemand: "DOK1",
        misconceptions: ["partWholeSwap", "placeValueSlip"],
      };
    },
  },

  // 9 — place-value bond with an over-filled part.
  {
    id: "nonCanonicalPlaceBond",
    bands: [3],
    subskill: "missingPart",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: () => {
      const tens = randInt(3, 9);
      const ones = randInt(0, 9);
      const number = tens * 10 + ones;
      const shownPart = (tens - randInt(1, 2)) * 10;
      return {
        answer: number - shownPart,
        answerType: "numberPad",
        display: {
          promptText: `Split ${number} into ${shownPart} and ___.`,
          whole: number,
          part: shownPart,
        },
        representation: "decomposition",
        cognitiveDemand: "DOK3",
        misconceptions: ["placeDigitBond", "countAllError"],
      };
    },
  },

  // 10 — judge a claimed bond.
  {
    id: "trueFalseBond",
    bands: [1, 2, 3],
    subskill: "decompose",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const band = bandOf(level);
      const whole = band === 1 ? randInt(5, 10) : band === 2 ? randInt(8, 20) : randInt(20, 60);
      const p1 = randInt(1, whole - 1);
      const truthy = Math.random() < 0.5;
      const p2 = truthy ? whole - p1 : whole - p1 + randInt(1, 3);
      return {
        answer: p1 + p2 === whole ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: {
          promptText: `Can a whole of ${whole} split into parts ${p1} and ${p2}?`,
        },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["partWholeSwap"],
      };
    },
  },

  // 11 — a fictional child treats the whole as a part.
  {
    id: "errorAnalysisPartWholeSwap",
    bands: [2, 3],
    subskill: "missingPart",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = bandOf(level) === 2 ? randInt(8, 20) : randInt(20, 60);
      const part = randInt(1, whole - 1);
      const actor = pick(NAMES);
      return {
        answer: whole - part,
        answerType: "numberPad",
        display: {
          promptText: `${actor} saw a bond with whole ${whole} and part ${part}, and answered ${whole + part}. What is the correct other part?`,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptions: ["partWholeSwap", "wholeAsPart"],
      };
    },
  },

  // 12 — story to bond.
  {
    id: "bondFromStory",
    bands: [1, 2, 3],
    subskill: "missingPart",
    family: ITEM_FAMILIES.APPLICATION,
    build: (level) => {
      const whole = wholeFor(level);
      const part = randInt(1, whole - 1);
      const actor = pick(NAMES);
      return {
        answer: whole - part,
        answerType: "numberBond",
        display: {
          promptText: `${actor} picked ${whole} plums. ${part} were purple and the rest were green. How many were green?`,
          whole,
          part,
        },
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptions: ["partWholeSwap", "countAllError"],
      };
    },
  },

  // 13 — which pair does NOT bond to the whole?
  {
    id: "oddOneOutBond",
    bands: [2, 3],
    subskill: "decompose",
    family: ITEM_FAMILIES.CONCEPTUAL,
    build: (level) => {
      const whole = bandOf(level) === 2 ? randInt(8, 16) : randInt(16, 40);
      const parts = new Set();
      while (parts.size < 3) parts.add(randInt(1, whole - 1));
      const good = [...parts].map((p) => `${p} and ${whole - p}`);
      const oddP = randInt(1, whole - 1);
      const odd = `${oddP} and ${whole - oddP + 1}`;
      return {
        answer: odd,
        choices: shuffleArray([...new Set([...good, odd])]),
        display: { promptText: `Which pair does NOT make ${whole}?` },
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptions: ["countAllError"],
      };
    },
  },
];

export const NUMBER_BOND_VARIETY_IDS = VARIETIES.map((v) => v.id);

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
  id: "numberBonds",
  label: "Number Bonds!",
  shortLabel: "Number Bonds",
  description: "Parts and wholes — and every node can be the one that is missing.",
  icon: "GitFork",
  op: "bond",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varieties: NUMBER_BOND_VARIETY_IDS,

  generate(level, context = {}) {
    const variety = chooseVariety(level, context);
    const built = variety.build(level);

    const question = {
      a: built.a ?? null,
      b: built.b ?? null,
      op: built.op || "bond",
      answer: built.answer,
      level,
      display: built.display,
    };
    if (built.answerType) question.answerType = built.answerType;
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "numberBonds",
      level,
      domain: "OA",
      cluster: "Understand addition/subtraction via part-part-whole",
      subskill: variety.subskill,
      itemFamily: variety.family,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP7"],
      standardRefs: ["K.OA", "1.OA"],
      misconceptionTags: built.misconceptions,
      blueprintId: `numberBonds-${variety.family}-${variety.id}`,
      structureType: variety.id,
    });

    return maybeApplyFormat(question, level, { actor: pick(NAMES), ...context }, SUPPORTED_FORMATS);
  },

  generateChoices(answer, question) {
    if (typeof answer !== "number") return null;
    const whole = question.display?.whole;
    const part = question.display?.part;
    return buildDistractors({
      answer,
      // `partWholeSwap` needs the two givens to produce `whole + part`, and
      // `wholeAsPart` / `partEchoed` read them straight out.
      a: Number.isFinite(whole) ? whole : answer,
      b: Number.isFinite(part) ? part : 0,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
