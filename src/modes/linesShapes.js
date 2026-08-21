import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * Lines & shapes (spec part C3 — `linesShapes`).
 *
 * This was the worst mode in the app: two 5-row tables, ten questions in total,
 * `level` ignored entirely, and a geometry mode that mostly never drew a shape.
 * M2 landed the ShapeFigure widget; M4 spends it.
 *
 *   band 1 (L1-3)  sides, vertices, naming a drawn figure (in non-prototypical
 *                  orientations), and non-examples ("which is NOT a triangle").
 *   band 2 (L4-6)  symmetry, sorting by an attribute, properties, line
 *                  relationships, decomposition.
 *   band 3 (L7-10) the quadrilateral hierarchy, riddles, guess-my-rule and
 *                  always/sometimes/never.
 *
 * Property questions are answered from a table keyed by the SAME shape ids the
 * renderer draws, so a drawn figure and its stated properties cannot drift.
 */

const { CONCEPTUAL, PROCEDURAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = [
  "shapeSides",
  "symmetryLines",
  "shapeProperties",
  "shapeClassification",
  "lineFigures",
];

/**
 * The shape property table. `sides`/`symmetry` mirror SHAPE_META (asserted in
 * the M4 spec); the rest is what the property varieties read.
 */
const SHAPES = [
  { key: "triangleEquilateral", name: "triangle", sides: 3, vertices: 3, symmetry: 3, parallelPairs: 0, rightAngles: 0, tier: 1 },
  // The kit draws the right triangle with two equal legs, so the FIGURE has one
  // line of symmetry even though a general right triangle has none. Figure
  // items must answer for what is drawn.
  { key: "triangleRight", name: "right triangle", sides: 3, vertices: 3, symmetry: 1, parallelPairs: 0, rightAngles: 1, tier: 2 },
  { key: "triangleScalene", name: "scalene triangle", sides: 3, vertices: 3, symmetry: 0, parallelPairs: 0, rightAngles: 0, tier: 3 },
  { key: "square", name: "square", sides: 4, vertices: 4, symmetry: 4, parallelPairs: 2, rightAngles: 4, tier: 1 },
  { key: "rectangle", name: "rectangle", sides: 4, vertices: 4, symmetry: 2, parallelPairs: 2, rightAngles: 4, tier: 1 },
  // Drawn with equal diagonals, so the FIGURE reads as a square on its point:
  // never ask its lines of symmetry off the picture.
  { key: "rhombus", name: "rhombus", sides: 4, vertices: 4, symmetry: 2, parallelPairs: 2, rightAngles: 0, tier: 2, askSymmetry: false },
  { key: "parallelogram", name: "parallelogram", sides: 4, vertices: 4, symmetry: 0, parallelPairs: 2, rightAngles: 0, tier: 2 },
  { key: "trapezoid", name: "trapezoid", sides: 4, vertices: 4, symmetry: 1, parallelPairs: 1, rightAngles: 0, tier: 2 },
  { key: "pentagon", name: "pentagon", sides: 5, vertices: 5, symmetry: 5, parallelPairs: 0, rightAngles: 0, tier: 1 },
  { key: "hexagon", name: "hexagon", sides: 6, vertices: 6, symmetry: 6, parallelPairs: 3, rightAngles: 0, tier: 2 },
  // The kit draws a cut-corner octagon (4 lines of symmetry), not a regular
  // one, so symmetry is asked in words for this shape and not off the figure.
  { key: "octagon", name: "octagon", sides: 8, vertices: 8, symmetry: 8, parallelPairs: 4, rightAngles: 0, tier: 3, askSymmetry: false },
];

// Named shapes the kit cannot draw. They still make honest vocabulary items,
// asked in words rather than pretending to show a picture.
const NAMED_ONLY = [
  { name: "heptagon", sides: 7, vertices: 7, symmetry: 7, tier: 2 },
  { name: "nonagon", sides: 9, vertices: 9, symmetry: 9, tier: 3 },
  { name: "decagon", sides: 10, vertices: 10, symmetry: 10, tier: 3 },
  { name: "dodecagon", sides: 12, vertices: 12, symmetry: 12, tier: 3 },
];

const ACTORS = ["Ava", "Theo", "Nia", "Luca", "Mina", "Sam"];

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function bandOf(level) {
  return level <= 3 ? 1 : level <= 6 ? 2 : 3;
}

/** Shapes unlocked at a level: everyday first, irregular and large later. */
function shapePool(level, table = SHAPES) {
  const cap = bandOf(level);
  const pool = table.filter((s) => s.tier <= cap);
  return pool.length ? pool : table;
}

/** A rotation, so a child learns the property and not the picture. */
function tilt(level) {
  return bandOf(level) === 1 ? pick([0, 0, 15]) : pick([0, 15, 30, 45, 60]);
}

/** Four figure options for a `select` item; the answer is the option index. */
function selectOptions(correctShape, wrongShapes, level) {
  const opts = shuffleArray([
    { shape: correctShape, correct: true },
    ...wrongShapes.slice(0, 3).map((s) => ({ shape: s, correct: false })),
  ]).map((o, i) => ({ ...o, rotate: tilt(level), value: i }));
  return { options: opts.map(({ shape, rotate, value }) => ({ shape, rotate, value })),
    answer: opts.findIndex((o) => o.correct) };
}

const VARIETIES = [
  // ---- band 1 --------------------------------------------------------------
  {
    id: "countSides",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["shapeSides"],
    build(level) {
      const shape = pick(shapePool(level));
      return {
        answer: shape.sides,
        answerType: "shapeFigure",
        display: { shape: shape.key, shapeMode: "count", rotate: tilt(level) },
        promptText: "How many sides does this shape have?",
        representation: "visual",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["sideVertexSwap", "offByOne", "sidesCountedByCorners"],
      };
    },
  },
  {
    id: "countVertices",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["shapeSides"],
    build(level) {
      const shape = pick(shapePool(level));
      return {
        answer: shape.vertices,
        answerType: "shapeFigure",
        display: { shape: shape.key, shapeMode: "count", rotate: tilt(level) },
        promptText: "How many vertices (corners) does this shape have?",
        representation: "visual",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["sideVertexSwap", "offByOne"],
      };
    },
  },
  {
    id: "namedShapeSides",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    subskills: ["shapeSides"],
    build(level) {
      const shape = pick(shapePool(level, [...SHAPES, ...NAMED_ONLY]));
      return {
        answer: shape.sides,
        answerType: "numberPad",
        promptText: `How many sides does a ${shape.name} have?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["sideVertexSwap", "offByOne"],
      };
    },
  },
  {
    id: "nameFromFigure",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["shapeClassification"],
    build(level) {
      // Only prototypes whose name cannot also be true of another drawn
      // figure: "which one is a rhombus?" would have two right answers when a
      // square is on screen, because a square IS a rhombus.
      const safe = shapePool(level).filter((s) =>
        ["triangle", "square", "pentagon", "hexagon", "octagon"].includes(s.name)
      );
      const target = pick(safe.length ? safe : [SHAPES[0]]);
      const wrong = shuffleArray(SHAPES.filter((s) => s.sides !== target.sides)).map((s) => s.key);
      const { options, answer } = selectOptions(target.key, wrong, level);
      return {
        answer,
        answerType: "shapeFigure",
        display: { shapeMode: "select", options },
        promptText: `Which one is a ${target.name}?`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["prototypeOnly", "sideVertexSwap"],
      };
    },
  },
  {
    id: "nonExample",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["shapeClassification"],
    build(level) {
      // Three shapes with N sides plus one that has a different number: the
      // odd one out can only be found by USING the definition.
      const sideCount = pick([3, 4]);
      const family = SHAPES.filter((s) => s.sides === sideCount);
      const others = shuffleArray(SHAPES.filter((s) => s.sides !== sideCount));
      const odd = others[0];
      const same = shuffleArray(family).slice(0, 3).map((s) => s.key);
      const { options, answer } = selectOptions(odd.key, same, level);
      const label = sideCount === 3 ? "triangle" : "four-sided shape";
      return {
        answer,
        answerType: "shapeFigure",
        display: { shapeMode: "select", options },
        promptText: `Which one is NOT a ${label}?`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["prototypeOnly", "sidesCountedByCorners"],
      };
    },
  },
  {
    id: "composeShapes",
    bands: [1, 2],
    family: APPLICATION,
    subskills: ["shapeProperties"],
    build() {
      const item = pick([
        { text: "puts two identical equilateral triangles together along a full side", answer: "rhombus" },
        { text: "puts two identical squares together along a full side", answer: "rectangle" },
        { text: "cuts a square in half from corner to corner", answer: "triangle" },
        { text: "puts two identical right triangles together along their longest sides", answer: "rectangle" },
      ]);
      const actor = pick(ACTORS);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray(["rhombus", "rectangle", "triangle", "pentagon"]),
        promptText: `${actor} ${item.text}. What shape can that make?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["prototypeOnly"],
      };
    },
  },

  // ---- band 2 --------------------------------------------------------------
  {
    id: "symmetryCount",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["symmetryLines"],
    build(level) {
      const pool = shapePool(level).filter((s) => s.askSymmetry !== false);
      const shape = pick(pool);
      return {
        answer: shape.symmetry,
        answerType: "shapeFigure",
        display: { shape: shape.key, shapeMode: "count", rotate: tilt(level), showSymmetry: false },
        promptText: "How many lines of symmetry does this shape have?",
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["symmetryMiscount", "diagonalIsSymmetry", "offByOne"],
      };
    },
  },
  {
    id: "symmetryIdentify",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["symmetryLines"],
    build() {
      // A rectangle's diagonal is the classic false line of symmetry.
      const item = pick([
        { label: "rectangle", line: "corner to corner", answer: "No" },
        { label: "rectangle", line: "straight across the middle", answer: "Yes" },
        { label: "square", line: "corner to corner", answer: "Yes" },
        { label: "parallelogram", line: "corner to corner", answer: "No" },
        { label: "equilateral triangle", line: "from a corner to the middle of the opposite side", answer: "Yes" },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: `A ${item.label} is folded along a line drawn ${item.line}. Do the two halves match exactly?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["diagonalIsSymmetry", "symmetryMiscount"],
      };
    },
  },
  {
    id: "sortByAttribute",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["shapeProperties"],
    build() {
      const rule = pick([
        { text: "has exactly 4 sides", test: (s) => s.sides === 4 },
        { text: "has at least one right angle", test: (s) => s.rightAngles > 0 },
        { text: "has at least one pair of parallel sides", test: (s) => s.parallelPairs > 0 },
        { text: "has more than 4 sides", test: (s) => s.sides > 4 },
        { text: "has no lines of symmetry", test: (s) => s.symmetry === 0 },
      ]);
      let shown = shuffleArray([...SHAPES]).slice(0, 5);
      // multiSelect cannot score an empty set, so guarantee at least one hit
      // without ever showing the same shape twice.
      if (!shown.some(rule.test)) {
        const hit = SHAPES.find(rule.test);
        shown = [hit, ...shown.filter((s) => s.key !== hit.key).slice(0, 4)];
      }
      // ...and at least one that does not, or "select everything" is correct.
      if (shown.every(rule.test)) {
        const miss = SHAPES.find((s) => !rule.test(s));
        shown = [miss, ...shown.filter((s) => s.key !== miss.key).slice(0, 4)];
      }
      return {
        answer: shown.filter(rule.test).map((s) => s.name),
        answerType: "multiSelect",
        display: { options: shown.map((s) => s.name) },
        promptText: `Select every shape that ${rule.text}.`,
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["prototypeOnly", "sideVertexSwap"],
      };
    },
  },
  {
    id: "nameFromProperties",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["shapeClassification"],
    build() {
      const item = pick([
        { clues: "4 equal sides and 4 right angles", answer: "square" },
        { clues: "4 right angles but not 4 equal sides", answer: "rectangle" },
        { clues: "4 equal sides but no right angles", answer: "rhombus" },
        { clues: "exactly one pair of parallel sides", answer: "trapezoid" },
        { clues: "3 sides and 3 equal angles", answer: "triangle" },
        { clues: "6 sides and 6 lines of symmetry", answer: "hexagon" },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray(
          [item.answer, ...shuffleArray(["square", "rectangle", "rhombus", "trapezoid", "triangle", "hexagon", "pentagon"])
            .filter((n) => n !== item.answer)
            .slice(0, 3)]
        ),
        promptText: `A shape has ${item.clues}. What is it?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["hierarchyExclusive", "prototypeOnly"],
      };
    },
  },
  {
    id: "lineRelationships",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["lineFigures"],
    build() {
      const item = pick([
        { text: "Two lines meet and make a square corner", answer: "perpendicular" },
        { text: "Two lines stay the same distance apart and never meet", answer: "parallel" },
        { text: "Two lines cross but do not make a square corner", answer: "intersecting" },
        { text: "The two long sides of a rectangle", answer: "parallel" },
        { text: "The two sides of a rectangle that meet at a corner", answer: "perpendicular" },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray(["parallel", "perpendicular", "intersecting"]),
        promptText: `${item.text}. What are these lines?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["prototypeOnly"],
      };
    },
  },
  {
    id: "pointLineRaySegment",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["lineFigures"],
    build() {
      const item = pick([
        { text: "a straight path with an arrow on one end only", answer: "ray" },
        { text: "a straight path with arrows on both ends", answer: "line" },
        { text: "a straight path with two end points and no arrows", answer: "line segment" },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray(["line", "ray", "line segment"]),
        promptText: `A figure shows ${item.text}. Is it a line, a ray, or a line segment?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["prototypeOnly"],
      };
    },
  },
  {
    id: "decomposeShapes",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["shapeProperties"],
    build(level) {
      // Joining the centre of a regular polygon to every vertex makes exactly
      // one triangle per side.
      const big = shapePool(level).filter((s) => s.sides >= 5);
      const shape = pick(big.length ? big : [SHAPES.find((s) => s.key === "pentagon")]);
      return {
        answer: shape.sides,
        answerType: "shapeFigure",
        display: { shape: shape.key, shapeMode: "count", rotate: 0 },
        promptText: "Lines are drawn from the centre of this shape to every corner. How many triangles is it divided into?",
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["sideVertexSwap", "offByOne"],
      };
    },
  },

  // ---- band 3 --------------------------------------------------------------
  {
    id: "quadHierarchy",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["shapeClassification"],
    build() {
      // Asked in both directions: only "Yes" then "No" shows a real class
      // concept, which is what `hierarchyExclusive` is looking for.
      const item = pick([
        { text: "Is every square also a rectangle?", answer: "Yes" },
        { text: "Is every rectangle also a square?", answer: "No" },
        { text: "Is every square also a rhombus?", answer: "Yes" },
        { text: "Is every rhombus also a square?", answer: "No" },
        { text: "Is every rectangle also a parallelogram?", answer: "Yes" },
        { text: "Is every parallelogram also a rectangle?", answer: "No" },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: item.text,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["hierarchyExclusive"],
      };
    },
  },
  {
    id: "shapeRiddle",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["shapeClassification"],
    build() {
      const item = pick([
        { clues: "I have exactly 4 sides. Exactly one pair of my sides is parallel.", answer: "trapezoid" },
        { clues: "I have 4 equal sides. None of my angles is a right angle.", answer: "rhombus" },
        { clues: "I have 3 sides and one right angle.", answer: "right triangle" },
        { clues: "I have 6 sides, all the same length.", answer: "hexagon" },
        { clues: "I have 8 sides, all the same length.", answer: "octagon" },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray(
          [item.answer, ...["trapezoid", "rhombus", "right triangle", "hexagon", "octagon", "pentagon"]
            .filter((n) => n !== item.answer)
            .slice(0, 3)]
        ),
        promptText: `${item.clues} What am I?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["hierarchyExclusive", "prototypeOnly"],
      };
    },
  },
  {
    id: "guessMyRule",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["shapeProperties"],
    build() {
      const item = pick([
        {
          inGroup: "square, rectangle, rhombus",
          outGroup: "triangle, pentagon, hexagon",
          answer: "they have 4 sides",
        },
        {
          inGroup: "square, rectangle",
          outGroup: "rhombus, trapezoid",
          answer: "they have 4 right angles",
        },
        {
          inGroup: "square, hexagon, pentagon",
          outGroup: "parallelogram, scalene triangle",
          answer: "they have lines of symmetry",
        },
      ]);
      const wrong = [
        "they have 4 sides",
        "they have 4 right angles",
        "they have lines of symmetry",
        "they have more than 5 sides",
      ].filter((w) => w !== item.answer);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray([item.answer, ...wrong.slice(0, 3)]),
        promptText: `In the group: ${item.inGroup}. Out of the group: ${item.outGroup}. What is the rule?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["hierarchyExclusive", "prototypeOnly"],
      };
    },
  },
  {
    id: "alwaysSometimesNeverShape",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["shapeProperties"],
    build() {
      const item = pick([
        { text: "If you put two squares together you get a rectangle.", answer: "Sometimes" },
        { text: "When you cut a square in half you get a triangle.", answer: "Sometimes" },
        { text: "Four sided shapes are called squares.", answer: "Sometimes" },
        { text: "Three sided shapes are called triangles.", answer: "Always" },
        { text: "A rectangle has 4 lines of symmetry.", answer: "Sometimes" },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray(["Always", "Sometimes", "Never"]),
        promptText: `${item.text} Always, sometimes, or never true?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["hierarchyExclusive", "prototypeOnly"],
      };
    },
  },
];

export const LINES_SHAPES_VARIETIES = VARIETIES.map((v) => v.id);
export const SHAPE_TABLE = SHAPES;

function selectVariety(level, context) {
  const b = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(b));
  if (context.allowWordProblems === false) {
    const dry = pool.filter((v) => v.family !== APPLICATION);
    if (dry.length) pool = dry;
  }
  if (context.itemFamily) {
    // Family never wins over the band (the numberBonds level-leak class):
    // a family miss inside the band serves a sibling family instead.
    const byFamily = pool.filter((v) => v.family === context.itemFamily);
    if (byFamily.length) pool = byFamily;
  }
  if (context.targetSubskill) {
    const bySubskill = pool.filter((v) => v.subskills.includes(context.targetSubskill));
    const inBandAnyFamily = VARIETIES.filter(
      (v) => v.bands.includes(b) && v.subskills.includes(context.targetSubskill)
    );
    if (bySubskill.length) pool = bySubskill;
    else if (inBandAnyFamily.length) pool = inBandAnyFamily;
  }
  return pick(pool);
}

export default {
  id: "linesShapes",
  label: "Shapes Shell",
  shortLabel: "Shapes",
  description: "2D shapes",
  icon: "Shapes",
  glyph: "▲",
  op: "shape",
  subskills: SUBSKILLS,
  // Geometry items carry no `a op b = answer` relation for a format to rewrite.
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varieties: LINES_SHAPES_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: "shape",
      answer: built.answer,
      answerType: built.answerType,
      level,
      display: { ...(built.display || {}), promptText: built.promptText },
    };
    if (built.choices) question.choices = built.choices;

    question.metadata = createQuestionMetadata({
      modeId: "linesShapes",
      level,
      domain: "G",
      cluster: "Classify two-dimensional figures; lines and symmetry",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP3", "MP6", "MP7"],
      standardRefs: ["2.G", "3.G", "4.G"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `linesShapes-${itemFamily}-${variety.id}`,
      structureType: variety.id,
    });
    return question;
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices)) return question.choices;
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
