import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Angles (Grade 4, 4.MD.C). Measure an angle shown on a figure, or add angle
// measures. Numeric answers in degrees.

const SUBSKILLS = ["measureAngle", "angleSum"];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.5) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.82 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "angles",
  label: "Angle Ace!",
  shortLabel: "Angles",
  description: "Measure and add angles.",
  icon: "Triangle",
  op: "angle",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    if (subskill === "angleSum") {
      const a = randInt(2, 12) * 5;
      const b = randInt(2, Math.max(2, (180 - a) / 5)) * 5;
      const question = {
        op: "angle",
        answer: a + b,
        answerType: "numberPad",
        level,
        display: {
          promptText:
            itemFamily === ITEM_FAMILIES.APPLICATION
              ? `A ramp turns ${a}° then another ${b}°. What is the total turn?`
              : `Two angles measure ${a}° and ${b}°. What is their sum (degrees)?`,
        },
      };
      question.metadata = angleMeta(level, subskill, itemFamily, "symbolic");
      return question;
    }

    // measureAngle: show a "nice" angle, ask its degree measure.
    const degrees = randInt(1, 11) * 15; // 15..165
    const question = {
      op: "angle",
      answer: degrees,
      answerType: "angle",
      level,
      display: { type: "angle", degrees, promptText: "How many degrees is this angle?" },
    };
    question.metadata = angleMeta(level, subskill, itemFamily, "angle");
    return question;
  },
};

function angleMeta(level, subskill, itemFamily, representation) {
  return createQuestionMetadata({
    modeId: "angles",
    level,
    domain: "MD",
    cluster: "Geometric measurement: angles",
    subskill,
    itemFamily,
    cognitiveDemand: "DOK2",
    representation: itemFamily === ITEM_FAMILIES.APPLICATION ? "verbalContext" : representation,
    mathPractices: ["MP5", "MP6"],
    standardRefs: ["4.MD"],
    misconceptionTags: ["protractorMisread", "reflexConfusion", "offBy10"],
    blueprintId: `angles-${itemFamily}-${subskill}`,
  });
}
