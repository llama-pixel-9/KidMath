import { randInt } from "./helpers";
import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

const RANGES = [
  { aMin: 1, aMax: 3, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 9, bMin: 10, bMax: 15 },
  { aMin: 5, aMax: 15, bMin: 5, bMax: 15 },
  { aMin: 10, aMax: 20, bMin: 10, bMax: 20 },
  { aMin: 10, aMax: 30, bMin: 1, bMax: 20 },
  { aMin: 10, aMax: 30, bMin: 10, bMax: 30 },
  { aMin: 10, aMax: 40, bMin: 10, bMax: 30 },
  { aMin: 10, aMax: 50, bMin: 10, bMax: 50 },
];

const SUBSKILLS = ["makeTen", "composeDecompose", "unknownAddend"];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  let family;
  if (roll < 0.33) family = ITEM_FAMILIES.CONCEPTUAL;
  else if (roll < 0.7) family = ITEM_FAMILIES.PROCEDURAL;
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
  id: "addition",
  label: "Addition Fun!",
  shortLabel: "Addition",
  description: "Master adding numbers from 1 all the way to 50!",
  icon: "Plus",
  op: "+",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const r = RANGES[level - 1];
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill || SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    const a = randInt(r.aMin, r.aMax);
    const b = randInt(r.bMin, r.bMax);
    const answer = a + b;

    let question = { a, b, op: "+", answer, level };
    if (itemFamily === ITEM_FAMILIES.CONCEPTUAL && subskill === "unknownAddend") {
      const total = answer;
      question = {
        a,
        b: null,
        op: "+",
        answer: b,
        level,
        display: { promptText: `${a} + ? = ${total}` },
      };
    } else if (itemFamily === ITEM_FAMILIES.APPLICATION) {
      question = {
        a,
        b,
        op: "+",
        answer,
        level,
        display: { promptText: `${a} birds joined ${b} birds. How many birds in all?` },
      };
    }

    question.metadata = createQuestionMetadata({
      modeId: "addition",
      level,
      domain: "OA",
      cluster: "Add and subtract within 20 and beyond",
      subskill,
      itemFamily,
      cognitiveDemand: itemFamily === ITEM_FAMILIES.PROCEDURAL ? "DOK1" : "DOK2",
      representation: question.display?.promptText ? "verbalContext" : "symbolic",
      mathPractices: ["MP1", "MP2", "MP7"],
      standardRefs: ["K.OA", "1.OA", "2.OA"],
      misconceptionTags: ["operationSwap", "offByOne", "placeValueSlip"],
      blueprintId: `addition-${itemFamily}-${subskill}`,
    });
    return question;
  },

  generateChoices(answer, question) {
    return buildArithmeticDistractors({
      answer,
      a: question.a ?? 0,
      b: question.b ?? answer,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
