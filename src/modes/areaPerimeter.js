import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";
import { maybeApplyFormat } from "./formats";

/**
 * Area & perimeter (spec part C3 — `areaPerimeter`).
 *
 * Before M4 this was `w x h` or `2(w+h)` on a random rectangle, with difficulty
 * expressed only as a bigger `hi`. There was no grid, no composite figure, no
 * missing side, and — the real gap — no item where the child had to decide
 * WHICH measure a situation calls for.
 *
 *   band 1 (L1-3)  count unit squares and unit lengths. Area comes from
 *                  covering; without this, `w x h` is a ritual.
 *   band 2 (L4-6)  the formulas, choosing between the two measures, and units.
 *   band 3 (L7-10) the unknown moves into the figure (missing side), composite
 *                  L-shapes, same-area/different-perimeter reasoning.
 */

const { CONCEPTUAL, PROCEDURAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = ["area", "perimeter", "compositeFigures", "measureReasoning"];

const SUPPORTED_FORMATS = ["trueFalse", "errorAnalysis", "estimation"];

const ACTORS = ["Ava", "Theo", "Nia", "Luca", "Mina", "Sam"];

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function bandOf(level) {
  return level <= 3 ? 1 : level <= 6 ? 2 : 3;
}

/** Rectangle sizes grow with the band, but only as a secondary dial. */
function dims(level) {
  const hi = level <= 3 ? 6 : level <= 6 ? 12 : 20;
  return [randInt(2, hi), randInt(2, hi)];
}

function factorPairs(area) {
  const pairs = [];
  for (let w = 1; w * w <= area; w += 1) {
    if (area % w === 0) pairs.push([w, area / w]);
  }
  return pairs;
}

const VARIETIES = [
  // ---- band 1: covering and going around ----------------------------------
  {
    id: "areaFromGrid",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["area"],
    build() {
      const w = randInt(2, 6);
      const h = randInt(2, 6);
      return {
        subskill: "area",
        answer: w * h,
        answerType: "numberPad",
        display: { width: w, height: h },
        promptText: `A rectangle is covered by unit squares: ${h} rows with ${w} squares in each row. How many unit squares cover it?`,
        representation: "visual",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["areaPerimeterSwap", "addInsteadOfMultiply", "offByOne"],
        distractorContext: { width: w, height: h, a: w, b: h },
      };
    },
  },
  {
    id: "perimeterFromGrid",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["perimeter"],
    build() {
      const w = randInt(2, 6);
      const h = randInt(2, 6);
      return {
        subskill: "perimeter",
        answer: 2 * (w + h),
        answerType: "numberPad",
        display: { width: w, height: h },
        promptText: `A rectangle of unit squares is ${w} units across and ${h} units down. How many units is the distance all the way around it?`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["areaPerimeterSwap", "perimeterHalfCount", "offByOne"],
        distractorContext: { width: w, height: h, a: w, b: h },
      };
    },
  },
  {
    id: "whichCoversMore",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["measureReasoning"],
    build() {
      const w1 = randInt(2, 6);
      const h1 = randInt(2, 6);
      let w2 = randInt(2, 6);
      const h2 = randInt(2, 6);
      if (w1 * h1 === w2 * h2) w2 += 1;
      const a = `${w1} by ${h1}`;
      const b = `${w2} by ${h2}`;
      return {
        subskill: "measureReasoning",
        answer: w1 * h1 > w2 * h2 ? a : b,
        answerType: "choice",
        choices: shuffleArray([a, b]),
        promptText: `Which rectangle covers more unit squares, ${a} or ${b}?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addInsteadOfMultiply", "areaPerimeterSwap"],
      };
    },
  },

  // ---- band 2: the formulas, and choosing between them --------------------
  {
    id: "areaFromDims",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["area"],
    build(level) {
      const [w, h] = dims(level);
      return {
        subskill: "area",
        a: w,
        b: h,
        op: "x",
        answer: w * h,
        // A third as multiple choice: areaPerimeterSwap only diagnoses when
        // 2(w+h) is actually on the screen next to w x h.
        answerType: Math.random() < 0.35 ? "choice" : "numberPad",
        display: { width: w, height: h },
        promptText: `A rectangle is ${w} cm by ${h} cm. What is its area in square cm?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["areaPerimeterSwap", "addInsteadOfMultiply"],
        distractorContext: { width: w, height: h, a: w, b: h },
      };
    },
  },
  {
    id: "perimeterFromDims",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["perimeter"],
    build(level) {
      const [w, h] = dims(level);
      return {
        subskill: "perimeter",
        answer: 2 * (w + h),
        answerType: Math.random() < 0.35 ? "choice" : "numberPad",
        display: { width: w, height: h },
        promptText: `A rectangle is ${w} cm by ${h} cm. What is its perimeter in cm?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["areaPerimeterSwap", "perimeterHalfCount"],
        distractorContext: { width: w, height: h, a: w, b: h },
      };
    },
  },
  {
    id: "whichMeasureNeeded",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["measureReasoning"],
    build(level) {
      const [w, h] = dims(level);
      const actor = pick(ACTORS);
      const situation = pick([
        { text: `wants to put a fence around a ${w} m by ${h} m garden`, answer: "perimeter" },
        { text: `wants to cover a ${w} m by ${h} m floor with tiles`, answer: "area" },
        { text: `is sewing a ribbon around the edge of a ${w} cm by ${h} cm cloth`, answer: "perimeter" },
        { text: `is painting a ${w} m by ${h} m wall`, answer: "area" },
      ]);
      return {
        subskill: "measureReasoning",
        answer: situation.answer,
        answerType: "choice",
        choices: shuffleArray(["area", "perimeter"]),
        promptText: `${actor} ${situation.text}. Is the area or the perimeter needed?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["areaPerimeterSwap"],
      };
    },
  },
  {
    id: "unitLabelSelect",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["measureReasoning"],
    build(level) {
      const [w, h] = dims(level);
      const isArea = Math.random() < 0.5;
      const value = isArea ? w * h : 2 * (w + h);
      const answer = isArea ? "sq m" : "m";
      return {
        subskill: "measureReasoning",
        answer,
        answerType: "choice",
        choices: shuffleArray(["m", "sq m", "cm", "sq cm"]),
        promptText: isArea
          ? `The area of a ${w} m by ${h} m rug is ${value} ___ . Which unit belongs?`
          : `The distance around a ${w} m by ${h} m rug is ${value} ___ . Which unit belongs?`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["unitSquareVsLinear", "areaPerimeterSwap"],
      };
    },
  },
  {
    id: "errorAnalysisSwap",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["perimeter"],
    build(level) {
      const [w, h] = dims(level);
      const actor = pick(ACTORS);
      return {
        subskill: "perimeter",
        answer: 2 * (w + h),
        answerType: "numberPad",
        display: { width: w, height: h },
        promptText: `${actor} says the perimeter of a ${w} cm by ${h} cm rectangle is ${w * h} cm, by multiplying the sides. What is the perimeter really?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["areaPerimeterSwap", "perimeterHalfCount"],
        distractorContext: { width: w, height: h },
      };
    },
  },

  // ---- band 3: the unknown moves into the figure --------------------------
  {
    id: "missingSideFromArea",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["area"],
    build() {
      const known = randInt(2, 9);
      const answer = randInt(2, 12);
      return {
        subskill: "area",
        answer,
        answerType: "numberPad",
        display: { width: known, height: answer },
        promptText: `A rectangle has an area of ${known * answer} sq cm. One side is ${known} cm. How long is the other side in cm?`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["areaPerimeterSwap", "divisionReversed"],
        distractorContext: { a: known * answer, b: known },
      };
    },
  },
  {
    id: "missingSideFromPerimeter",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["perimeter"],
    build() {
      const known = randInt(2, 9);
      const answer = randInt(2, 12);
      return {
        subskill: "perimeter",
        answer,
        answerType: "numberPad",
        display: { width: known, height: answer },
        // Harder than the area version: the child must halve before subtracting.
        promptText: `A rectangle has a perimeter of ${2 * (known + answer)} cm. One side is ${known} cm. How long is the other side in cm?`,
        representation: "visual",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["perimeterHalfCount", "areaPerimeterSwap"],
        distractorContext: { a: 2 * (known + answer), b: known },
      };
    },
  },
  {
    id: "compositeArea",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["compositeFigures"],
    build() {
      const W = randInt(6, 12);
      const H = randInt(5, 10);
      const w = randInt(2, W - 3);
      const h = randInt(2, H - 3);
      return {
        subskill: "compositeFigures",
        answer: W * H - w * h,
        answerType: "numberPad",
        promptText: `An L-shape is a ${W} by ${H} rectangle with a ${w} by ${h} corner cut out. What is its area in square units?`,
        representation: "visual",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["areaPerimeterSwap", "compositeHiddenSides"],
        distractorContext: { width: W, height: H, a: W * H, b: w * h },
      };
    },
  },
  {
    id: "compositePerimeter",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["compositeFigures"],
    build() {
      const W = randInt(6, 12);
      const H = randInt(5, 10);
      const w = randInt(2, W - 3);
      const h = randInt(2, H - 3);
      // Cutting a rectangle out of a CORNER leaves the perimeter unchanged:
      // the two new edges are exactly as long as the two they replaced. That
      // surprise is the item, and `compositeHiddenSides` is the child who
      // counts only the outer edges they can see.
      return {
        subskill: "compositeFigures",
        answer: 2 * (W + H),
        answerType: "numberPad",
        promptText: `An L-shape is a ${W} by ${H} rectangle with a ${w} by ${h} corner cut out. What is the distance all the way around it?`,
        representation: "visual",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["compositeHiddenSides", "areaPerimeterSwap"],
        distractorContext: { width: W, height: H },
      };
    },
  },
  {
    id: "distributiveArea",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["area"],
    build() {
      const side = randInt(3, 9);
      const tens = 10;
      const ones = randInt(2, 9);
      return {
        subskill: "area",
        a: side,
        b: tens + ones,
        op: "x",
        answer: side * (tens + ones),
        answerType: "numberPad",
        display: { width: side, height: tens + ones },
        promptText: `A ${side} by ${tens + ones} rectangle is split into a ${side} by ${tens} part and a ${side} by ${ones} part. What is the total area?`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addInsteadOfMultiply", "areaPerimeterSwap"],
        distractorContext: { width: side, height: tens + ones, a: side, b: tens + ones },
      };
    },
  },
  {
    id: "compareTwoRectangles",
    bands: [3],
    family: APPLICATION,
    subskills: ["measureReasoning"],
    build() {
      const w1 = randInt(3, 9);
      const h1 = randInt(3, 9);
      let w2 = randInt(3, 9);
      const h2 = randInt(3, 9);
      if (w1 * h1 === w2 * h2) w2 += 1;
      return {
        subskill: "measureReasoning",
        answer: Math.abs(w1 * h1 - w2 * h2),
        answerType: "numberPad",
        promptText: `Rug A is ${w1} m by ${h1} m. Rug B is ${w2} m by ${h2} m. How many more square metres does the larger rug cover?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["areaPerimeterSwap", "operationSwap"],
        distractorContext: { a: w1 * h1, b: w2 * h2 },
      };
    },
  },
  {
    id: "sameAreaSelect",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["measureReasoning"],
    build() {
      const area = pick([12, 16, 18, 24, 36]);
      const correct = factorPairs(area).map(([a, b]) => `${a} by ${b}`);
      const wrong = [];
      while (wrong.length < 3) {
        const a = randInt(2, 9);
        const b = randInt(2, 9);
        const label = `${a} by ${b}`;
        if (a * b !== area && !wrong.includes(label) && !correct.includes(label)) wrong.push(label);
      }
      const shown = shuffleArray([...correct, ...wrong]);
      return {
        subskill: "measureReasoning",
        answer: shown.filter((s) => correct.includes(s)),
        answerType: "multiSelect",
        display: { options: shown },
        promptText: `Select every rectangle with an area of ${area} square cm.`,
        representation: "visual",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["areaPerimeterSwap", "addInsteadOfMultiply"],
      };
    },
  },
  {
    id: "alwaysSometimesNever",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["measureReasoning"],
    build() {
      const statement = pick([
        { text: "Two rectangles with the same perimeter have the same area.", answer: "Sometimes" },
        { text: "A bigger perimeter means a bigger area.", answer: "Sometimes" },
        { text: "A square's area is one of its sides multiplied by itself.", answer: "Always" },
        { text: "A rectangle with whole-number sides has an even perimeter.", answer: "Always" },
        { text: "Area is measured in square units.", answer: "Always" },
        { text: "A rectangle's area is smaller than its perimeter.", answer: "Sometimes" },
      ]);
      return {
        subskill: "measureReasoning",
        answer: statement.answer,
        answerType: "choice",
        choices: shuffleArray(["Always", "Sometimes", "Never"]),
        promptText: `${statement.text} Always, sometimes, or never true?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["areaPerimeterSwap"],
      };
    },
  },
];

export const AREA_PERIMETER_VARIETIES = VARIETIES.map((v) => v.id);

function selectVariety(level, context) {
  const b = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(b));
  if (context.allowWordProblems === false) {
    const dry = pool.filter((v) => v.family !== APPLICATION);
    if (dry.length) pool = dry;
  }
  if (context.itemFamily) {
    const byFamily = pool.filter((v) => v.family === context.itemFamily);
    const anyBand = VARIETIES.filter((v) => v.family === context.itemFamily);
    pool = byFamily.length ? byFamily : anyBand.length ? anyBand : pool;
  }
  if (context.targetSubskill) {
    const bySubskill = pool.filter((v) => v.subskills.includes(context.targetSubskill));
    if (bySubskill.length) pool = bySubskill;
  }
  return pick(pool);
}

export default {
  id: "areaPerimeter",
  label: "Area & Perimeter!",
  shortLabel: "Area/Perimeter",
  description: "Cover, measure and reason about rectangles.",
  icon: "Ruler",
  op: "measure",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varieties: AREA_PERIMETER_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: built.op || "measure",
      answer: built.answer,
      answerType: built.answerType,
      level,
      display: { ...(built.display || {}), promptText: built.promptText },
    };
    if (built.a != null) question.a = built.a;
    if (built.b != null) question.b = built.b;
    if (built.choices) question.choices = built.choices;
    if (built.distractorContext) question.distractorContext = built.distractorContext;

    question.metadata = createQuestionMetadata({
      modeId: "areaPerimeter",
      level,
      domain: "MD",
      cluster: "Geometric measurement: area and perimeter",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP4", "MP6", "MP7"],
      standardRefs: ["3.MD", "4.MD"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `areaPerimeter-${itemFamily}-${variety.id}`,
      structureType: variety.id,
    });

    return maybeApplyFormat(question, level, context, SUPPORTED_FORMATS, 0.15);
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices)) return question.choices;
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 1,
      ...(question?.distractorContext || {}),
    });
  },
};
