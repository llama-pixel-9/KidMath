import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// 2-D shapes: sides and lines of symmetry (Grade 3-4, 4.G). Numeric answers on
// named shapes (no ambiguous free-drawing).

const SUBSKILLS = ["shapeSides", "symmetryLines"];
const SIDES = [
  { name: "triangle", sides: 3 },
  { name: "square", sides: 4 },
  { name: "pentagon", sides: 5 },
  { name: "hexagon", sides: 6 },
  { name: "octagon", sides: 8 },
];
const SYMMETRY = [
  { name: "square", lines: 4 },
  { name: "rectangle", lines: 2 },
  { name: "equilateral triangle", lines: 3 },
  { name: "regular pentagon", lines: 5 },
  { name: "regular hexagon", lines: 6 },
];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.55) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.85 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "linesShapes",
  label: "Shape Sleuth!",
  shortLabel: "Shapes",
  description: "Sides and lines of symmetry.",
  icon: "Shapes",
  op: "shape",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    let answer;
    let promptText;
    if (subskill === "symmetryLines") {
      const s = SYMMETRY[randInt(0, SYMMETRY.length - 1)];
      answer = s.lines;
      promptText = `How many lines of symmetry does a ${s.name} have?`;
    } else {
      const s = SIDES[randInt(0, SIDES.length - 1)];
      answer = s.sides;
      promptText = `How many sides does a ${s.name} have?`;
    }

    const question = {
      op: "shape",
      answer,
      answerType: "numberPad",
      level,
      display: { promptText },
    };

    question.metadata = createQuestionMetadata({
      modeId: "linesShapes",
      level,
      domain: "G",
      cluster: "Classify 2-D figures; symmetry",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK1",
      representation: "symbolic",
      mathPractices: ["MP6", "MP7"],
      standardRefs: ["4.G"],
      misconceptionTags: ["sideVertexSwap", "symmetryMiscount", "offByOne"],
      blueprintId: `linesShapes-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
