import { randInt } from "./helpers";
import { buildComparingDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

const RANGES = [
  { min: 1, max: 5 },
  { min: 1, max: 9 },
  { min: 1, max: 15 },
  { min: 1, max: 20 },
  { min: 1, max: 30 },
  { min: 5, max: 50 },
  { min: 10, max: 75 },
  { min: 10, max: 100 },
  { min: 50, max: 500 },
  { min: 100, max: 1000 },
];

const SUBSKILLS = ["symbolSelection", "benchmarkCompare", "distanceCompare"];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  let family;
  if (roll < 0.34) family = ITEM_FAMILIES.CONCEPTUAL;
  else if (roll < 0.68) family = ITEM_FAMILIES.PROCEDURAL;
  else family = ITEM_FAMILIES.APPLICATION;
  if (level < 7 && family === ITEM_FAMILIES.APPLICATION) {
    return ITEM_FAMILIES.PROCEDURAL;
  }
  return family;
}

export default {
  id: "comparing",
  label: "Compare Quest!",
  shortLabel: "Comparing",
  description: "Is it greater than, less than, or equal?",
  icon: "ArrowLeftRight",
  op: "vs",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const r = RANGES[level - 1];
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill || SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    let a = randInt(r.min, r.max);
    let b = randInt(r.min, r.max);

    // ~20% chance of equal values so kids see "=" too
    if (Math.random() < 0.2) {
      b = a;
    }

    let answer, op;
    if (a > b) { answer = ">"; op = "?"; }
    else if (a < b) { answer = "<"; op = "?"; }
    else { answer = "="; op = "?"; }

    const question = { a, b, op, answer, level };
    if (itemFamily === ITEM_FAMILIES.APPLICATION) {
      question.display = { promptText: `Choose the symbol: ${a} ? ${b}` };
    }

    question.metadata = createQuestionMetadata({
      modeId: "comparing",
      level,
      domain: "NBT",
      cluster: "Compare two numbers",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK1",
      representation: question.display?.promptText ? "verbalContext" : "symbolic",
      mathPractices: ["MP2", "MP6"],
      standardRefs: ["1.NBT", "2.NBT", "4.NBT"],
      misconceptionTags: ["symbolFlip", "equalSignMisread"],
      blueprintId: `comparing-${itemFamily}-${subskill}`,
    });
    return question;
  },

  generateChoices() {
    return buildComparingDistractors();
  },
};
