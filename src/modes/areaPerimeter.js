import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Area & perimeter of rectangles (Grade 3-4, 3.MD / 4.MD). Central Math in Focus
// measurement topic. Numeric answers.

const SUBSKILLS = ["area", "perimeter"];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.4) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.72 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "areaPerimeter",
  label: "Area & Perimeter!",
  shortLabel: "Area/Perimeter",
  description: "Area and perimeter of rectangles.",
  icon: "Ruler",
  op: "measure",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    const hi = level <= 3 ? 6 : level <= 6 ? 12 : 20;
    const w = randInt(2, hi);
    const h = randInt(2, hi);

    const isArea = subskill === "area";
    const answer = isArea ? w * h : 2 * (w + h);
    const symbolic = isArea
      ? `A rectangle is ${w} by ${h}. What is the area?`
      : `A rectangle is ${w} by ${h}. What is the perimeter?`;
    const contextual = isArea
      ? `A garden is ${w} m by ${h} m. How many square meters is it?`
      : `A garden is ${w} m by ${h} m. How many meters of fence go around it?`;

    const question = {
      op: "measure",
      answer,
      answerType: "numberPad",
      level,
      display: {
        promptText: itemFamily === ITEM_FAMILIES.APPLICATION ? contextual : symbolic,
        width: w,
        height: h,
      },
    };

    question.metadata = createQuestionMetadata({
      modeId: "areaPerimeter",
      level,
      domain: "MD",
      cluster: "Area and perimeter of rectangles",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK2",
      representation: "symbolic",
      mathPractices: ["MP2", "MP4", "MP6"],
      standardRefs: ["3.MD", "4.MD"],
      misconceptionTags: ["areaPerimeterSwap", "addInsteadOfMultiply", "offByOne"],
      blueprintId: `areaPerimeter-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
