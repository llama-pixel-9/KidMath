import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// 2-D shapes: sides and lines of symmetry (Grade 3-4, 4.G). Numeric answers on
// named shapes (no ambiguous free-drawing).

const SUBSKILLS = ["shapeSides", "symmetryLines"];

// `tier` scales difficulty with level: 1 = the everyday shapes a K-1 child
// names on sight, 2 = quadrilateral family and mid-size polygons, 3 = large or
// irregular polygons where the child must reason rather than recall.
const SIDES = [
  { name: "triangle", sides: 3, tier: 1 },
  { name: "square", sides: 4, tier: 1 },
  { name: "rectangle", sides: 4, tier: 1 },
  { name: "pentagon", sides: 5, tier: 1 },
  { name: "hexagon", sides: 6, tier: 1 },
  { name: "rhombus", sides: 4, tier: 2 },
  { name: "trapezoid", sides: 4, tier: 2 },
  { name: "parallelogram", sides: 4, tier: 2 },
  { name: "heptagon", sides: 7, tier: 2 },
  { name: "octagon", sides: 8, tier: 2 },
  { name: "nonagon", sides: 9, tier: 3 },
  { name: "decagon", sides: 10, tier: 3 },
  { name: "dodecagon", sides: 12, tier: 3 },
];

const SYMMETRY = [
  { name: "square", lines: 4, tier: 1 },
  { name: "rectangle", lines: 2, tier: 1 },
  { name: "equilateral triangle", lines: 3, tier: 1 },
  { name: "regular pentagon", lines: 5, tier: 2 },
  { name: "regular hexagon", lines: 6, tier: 2 },
  { name: "rhombus", lines: 2, tier: 2 },
  { name: "isosceles triangle", lines: 1, tier: 2 },
  { name: "regular heptagon", lines: 7, tier: 3 },
  { name: "regular octagon", lines: 8, tier: 3 },
  { name: "regular decagon", lines: 10, tier: 3 },
  { name: "isosceles trapezoid", lines: 1, tier: 3 },
  { name: "parallelogram", lines: 0, tier: 3 },
  { name: "scalene triangle", lines: 0, tier: 3 },
];

// Highest tier unlocked at a given level: K-1 stays on tier 1, Grade 2-3 opens
// the quadrilateral family, Grade 4+ sees every shape in the table.
function maxTier(level) {
  if (level <= 3) return 1;
  if (level <= 6) return 2;
  return 3;
}

function pickShape(table, level) {
  const cap = maxTier(level);
  const pool = table.filter((s) => s.tier <= cap);
  return pool[randInt(0, pool.length - 1)];
}

// Application contexts: a named actor noticing a shape in a concrete place.
const SIDE_CONTEXTS = [
  (name) => `Ava traces a ${name} tile on the kitchen floor. How many sides does she trace?`,
  (name) => `Theo cuts a ${name} from craft paper for the class poster. How many sides does it have?`,
  (name) => `Nia draws a ${name} sign for the garden gate. How many sides must she draw?`,
  (name) => `Luca builds a ${name} with straws. How many straws does one shape need?`,
];

const SYMMETRY_CONTEXTS = [
  (name) => `Mina folds a paper ${name} so the halves match exactly. How many fold lines work?`,
  (name) => `Sam checks a ${name} window pane for fold lines that match. How many are there?`,
  (name) => `Nia holds a mirror across a ${name} card to split it evenly. How many lines of symmetry does it have?`,
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

    const isApplication = itemFamily === ITEM_FAMILIES.APPLICATION;

    let answer;
    let promptText;
    if (subskill === "symmetryLines") {
      const s = pickShape(SYMMETRY, level);
      answer = s.lines;
      promptText = isApplication
        ? SYMMETRY_CONTEXTS[randInt(0, SYMMETRY_CONTEXTS.length - 1)](s.name)
        : `How many lines of symmetry does a ${s.name} have?`;
    } else {
      const s = pickShape(SIDES, level);
      answer = s.sides;
      promptText = isApplication
        ? SIDE_CONTEXTS[randInt(0, SIDE_CONTEXTS.length - 1)](s.name)
        : `How many sides does a ${s.name} have?`;
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
      cognitiveDemand: isApplication ? "DOK2" : "DOK1",
      representation: isApplication ? "verbalContext" : "symbolic",
      mathPractices: ["MP6", "MP7"],
      standardRefs: ["4.G"],
      misconceptionTags: ["sideVertexSwap", "symmetryMiscount", "offByOne"],
      blueprintId: `linesShapes-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
