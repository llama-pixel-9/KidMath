import { randInt } from "./helpers";
import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

const RANGES = [
  { aMin: 1, aMax: 3, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 12 },
  // Grade 4 (4.NBT.B.5): 2-digit x 1-digit, then 2-digit x 2-digit. Large
  // products are answered by typing (numberPad) rather than guessing bubbles.
  { aMin: 11, aMax: 99, bMin: 2, bMax: 9 },
  { aMin: 11, aMax: 99, bMin: 11, bMax: 99 },
];

// Products with a two-digit factor are answered via the number pad; single-digit
// table facts stay multiple-choice.
function isMultiDigitFactorPair(a, b) {
  return a >= 10 || b >= 10;
}

const SUBSKILLS = ["equalGroups", "arrayReasoning", "factFluency"];

function chooseFamily(level, context) {
  const allowWordProblems = context?.allowWordProblems !== false;
  // Multiplication's CONCEPTUAL variant is always a verbal prompt
  // ("${a} groups of ${b} makes how many total?"), so when word problems are
  // disabled we redirect both APPLICATION and CONCEPTUAL requests to
  // PROCEDURAL.
  if (context?.itemFamily) {
    if (!allowWordProblems && context.itemFamily === ITEM_FAMILIES.CONCEPTUAL) {
      return ITEM_FAMILIES.PROCEDURAL;
    }
    return context.itemFamily;
  }
  const roll = Math.random();
  let family;
  if (roll < 0.34) family = ITEM_FAMILIES.CONCEPTUAL;
  else if (roll < 0.72) family = ITEM_FAMILIES.PROCEDURAL;
  else family = ITEM_FAMILIES.APPLICATION;
  if (!allowWordProblems && (family === ITEM_FAMILIES.APPLICATION || family === ITEM_FAMILIES.CONCEPTUAL)) {
    return ITEM_FAMILIES.PROCEDURAL;
  }
  if (level < 7 && family === ITEM_FAMILIES.APPLICATION) {
    return ITEM_FAMILIES.PROCEDURAL;
  }
  return family;
}

export default {
  id: "multiplication",
  label: "Multiply Mania!",
  shortLabel: "Multiplication",
  description: "Times tables through 12 × 12, then 2-digit multiplication!",
  icon: "X",
  op: "×",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const r = RANGES[level - 1];
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill || SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    const a = randInt(r.aMin, r.aMax);
    const b = randInt(r.bMin, r.bMax);
    const answer = a * b;

    let question = { a, b, op: "×", answer, level };
    if (itemFamily === ITEM_FAMILIES.CONCEPTUAL) {
      question = {
        a,
        b,
        op: "×",
        answer,
        level,
        display: { promptText: `${a} groups of ${b} makes how many total?` },
      };
    } else if (itemFamily === ITEM_FAMILIES.APPLICATION) {
      question = {
        a,
        b,
        op: "×",
        answer,
        level,
        display: { promptText: `${a} rows with ${b} chairs each. How many chairs?` },
      };
    }

    // Typed entry for multi-digit products; single-digit facts stay bubbles.
    if (isMultiDigitFactorPair(a, b)) {
      question.answerType = "numberPad";
    }

    question.metadata = createQuestionMetadata({
      modeId: "multiplication",
      level,
      domain: "OA",
      cluster: "Multiplication and division within 100",
      subskill,
      itemFamily,
      cognitiveDemand: itemFamily === ITEM_FAMILIES.PROCEDURAL ? "DOK1" : "DOK2",
      representation: question.display?.promptText ? "verbalContext" : "symbolic",
      mathPractices: ["MP1", "MP2", "MP4"],
      standardRefs: ["3.OA", "4.OA"],
      misconceptionTags: ["factNeighbor", "operationSwap", "offByOne"],
      blueprintId: `multiplication-${itemFamily}-${subskill}`,
    });
    return question;
  },

  generateChoices(answer, question) {
    return buildArithmeticDistractors({
      answer,
      a: question.a ?? 1,
      b: question.b ?? 1,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
