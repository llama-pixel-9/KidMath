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
  { aMin: 5, aMax: 12, bMin: 5, bMax: 12 },
  { aMin: 7, aMax: 12, bMin: 7, bMax: 12 },
];

const SUBSKILLS = ["equalGroups", "arrayReasoning", "factFluency"];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  let family;
  if (roll < 0.34) family = ITEM_FAMILIES.CONCEPTUAL;
  else if (roll < 0.72) family = ITEM_FAMILIES.PROCEDURAL;
  else family = ITEM_FAMILIES.APPLICATION;
  if (context?.allowWordProblems === false && family === ITEM_FAMILIES.APPLICATION) {
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
  description: "Conquer times tables up to 12 × 12!",
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
