import { randInt } from "./helpers";
import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

const RANGES = [
  { min: 1, max: 3 },
  { min: 1, max: 5 },
  { min: 1, max: 7 },
  { min: 1, max: 9 },
  { min: 1, max: 12 },
  { min: 1, max: 15 },
  { min: 5, max: 20 },
  { min: 5, max: 25 },
  { min: 10, max: 30 },
  { min: 10, max: 50 },
];

const OBJECTS = ["🍎", "⭐", "🐟", "🌸", "🟢", "🔵", "❤️", "🍪"];

const SUBSKILLS = ["subitizing", "countOn", "cardinality"];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  let family;
  if (roll < 0.4) family = ITEM_FAMILIES.CONCEPTUAL;
  else if (roll < 0.75) family = ITEM_FAMILIES.PROCEDURAL;
  else family = ITEM_FAMILIES.APPLICATION;
  if (level < 7 && family === ITEM_FAMILIES.APPLICATION) {
    return ITEM_FAMILIES.PROCEDURAL;
  }
  return family;
}

export default {
  id: "counting",
  label: "Count It Up!",
  shortLabel: "Counting",
  description: "Count the objects and pick the right number!",
  icon: "Hash",
  op: "count",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const r = RANGES[level - 1];
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill || SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    const answer = randInt(r.min, r.max);
    const emoji = OBJECTS[randInt(0, OBJECTS.length - 1)];

    const question = {
      a: answer,
      b: null,
      op: "count",
      answer,
      level,
      display: { emoji, count: answer },
    };

    if (itemFamily === ITEM_FAMILIES.APPLICATION) {
      question.display.promptText = `Count the ${emoji} objects to find how many there are.`;
    }

    question.metadata = createQuestionMetadata({
      modeId: "counting",
      level,
      domain: "CC",
      cluster: "Count to tell the number of objects",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK1",
      representation: "objectSet",
      mathPractices: ["MP2", "MP6"],
      standardRefs: ["K.CC"],
      misconceptionTags: ["skipObject", "doubleCount", "offByOne"],
      blueprintId: `counting-${itemFamily}-${subskill}`,
    });
    return question;
  },

  generateChoices(answer, question) {
    return buildArithmeticDistractors({
      answer,
      a: question.display?.count ?? answer,
      b: 1,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
