import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Bar models / "model drawing" (the signature Math in Focus tool). Part-whole
// and comparison bars for +/- word problems; the answer is numeric, entered on
// the interactive bar diagram.

const SUBSKILLS = ["partWhole", "comparison"];

function scaleFor(level) {
  if (level <= 3) return 20;
  if (level <= 6) return 100;
  return 1000;
}

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  let family;
  if (roll < 0.34) family = ITEM_FAMILIES.CONCEPTUAL;
  else if (roll < 0.68) family = ITEM_FAMILIES.PROCEDURAL;
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
  id: "barModels",
  label: "Bar Models!",
  shortLabel: "Bar Models",
  description: "Draw the bar, find the missing amount.",
  icon: "BarChart3",
  op: "bar",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill =
      context?.targetSubskill === "comparison" || context?.targetSubskill === "partWhole"
        ? context.targetSubskill
        : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    const max = scaleFor(level);

    let display;
    let answer;
    let symbolic;
    let contextual;

    if (subskill === "comparison") {
      const a = randInt(2, max);
      const diff = randInt(1, Math.max(2, Math.floor(max / 2)));
      answer = a + diff;
      display = { type: "barCompare", a, diff };
      symbolic = `A = ${a}. B is ${diff} more than A. What is B?`;
      contextual = `Ravi scored ${a} points. Mia scored ${diff} more than Ravi. How many did Mia score?`;
    } else {
      const whole = randInt(4, max);
      const part = randInt(1, whole - 1);
      answer = whole - part;
      display = { type: "barPartWhole", whole, part };
      symbolic = `Whole is ${whole}. One part is ${part}. Find the other part.`;
      contextual = `A box holds ${whole} crayons. ${part} are red, the rest are blue. How many are blue?`;
    }

    const question = {
      op: "bar",
      answer,
      answerType: "barModel",
      level,
      display: {
        ...display,
        promptText: itemFamily === ITEM_FAMILIES.APPLICATION ? contextual : symbolic,
      },
    };

    question.metadata = createQuestionMetadata({
      modeId: "barModels",
      level,
      domain: "OA",
      cluster: "Represent and solve +/- problems with bar models",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK2",
      representation: itemFamily === ITEM_FAMILIES.APPLICATION ? "verbalContext" : "barModel",
      mathPractices: ["MP1", "MP2", "MP4"],
      standardRefs: ["2.OA", "3.OA"],
      misconceptionTags: ["compareDirection", "partWholeSwap", "offByOne"],
      blueprintId: `barModels-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
