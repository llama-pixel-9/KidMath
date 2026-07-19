import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Metric measurement conversion (Grade 3-4, 4.MD.A). Convert from a larger unit
// to a smaller one (whole-number answers). Numeric answers.

const SUBSKILLS = ["lengthConvert", "massVolumeConvert"];

const LENGTH = [
  { from: "m", to: "cm", factor: 100 },
  { from: "km", to: "m", factor: 1000 },
  { from: "cm", to: "mm", factor: 10 },
];
const MASS_VOL = [
  { from: "kg", to: "g", factor: 1000 },
  { from: "L", to: "mL", factor: 1000 },
];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.4) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.72 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "measurement",
  label: "Measure Up!",
  shortLabel: "Measurement",
  description: "Convert metric units.",
  icon: "Scale",
  op: "convert",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    const table = subskill === "massVolumeConvert" ? MASS_VOL : LENGTH;
    const unit = table[randInt(0, table.length - 1)];
    const amount = randInt(2, level <= 6 ? 9 : 20);
    const answer = amount * unit.factor;

    const symbolic = `${amount} ${unit.from} = ? ${unit.to}`;
    const contextual = `A rope is ${amount} ${unit.from} long. How many ${unit.to} is that?`;

    const question = {
      op: "convert",
      answer,
      answerType: "numberPad",
      level,
      display: { promptText: itemFamily === ITEM_FAMILIES.APPLICATION ? contextual : symbolic },
    };

    question.metadata = createQuestionMetadata({
      modeId: "measurement",
      level,
      domain: "MD",
      cluster: "Convert measurements within the metric system",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK2",
      representation: "symbolic",
      mathPractices: ["MP2", "MP6"],
      standardRefs: ["4.MD"],
      misconceptionTags: ["wrongFactor", "unitDirection", "placeValueSlip"],
      blueprintId: `measurement-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
