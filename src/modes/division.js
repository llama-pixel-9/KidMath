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

const SUBSKILLS = ["partitioning", "inverseFact", "unknownQuotient"];

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
  id: "division",
  label: "Division Derby!",
  shortLabel: "Division",
  description: "Split numbers evenly — no remainders!",
  icon: "Divide",
  op: "÷",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const r = RANGES[level - 1];
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill || SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    const divisor = randInt(r.bMin || 1, r.bMax);
    const answer = randInt(r.aMin, r.aMax);
    const dividend = divisor * answer;
    let question = { a: dividend, b: divisor, op: "÷", answer, level };
    if (itemFamily === ITEM_FAMILIES.CONCEPTUAL) {
      question = {
        a: dividend,
        b: divisor,
        op: "÷",
        answer,
        level,
        display: { promptText: `${dividend} split into ${divisor} equal groups gives how many in each group?` },
      };
    } else if (itemFamily === ITEM_FAMILIES.APPLICATION) {
      question = {
        a: dividend,
        b: divisor,
        op: "÷",
        answer,
        level,
        display: { promptText: `${dividend} cookies shared by ${divisor} friends. Cookies per friend?` },
      };
    }

    question.metadata = createQuestionMetadata({
      modeId: "division",
      level,
      domain: "OA",
      cluster: "Understand division as unknown-factor problems",
      subskill,
      itemFamily,
      cognitiveDemand: itemFamily === ITEM_FAMILIES.PROCEDURAL ? "DOK1" : "DOK2",
      representation: question.display?.promptText ? "verbalContext" : "symbolic",
      mathPractices: ["MP1", "MP2", "MP4"],
      standardRefs: ["3.OA", "4.OA"],
      misconceptionTags: ["factNeighbor", "operationSwap", "offByOne"],
      blueprintId: `division-${itemFamily}-${subskill}`,
    });
    return question;
  },

  generateChoices(answer, question) {
    return buildArithmeticDistractors({
      answer,
      a: question.a ?? answer,
      b: question.b ?? 1,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
