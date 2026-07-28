import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * Angles (spec part C3 — `angles`).
 *
 * Like `time`, this mode ignored `level` entirely: every learner got the same
 * "measure this angle" figure or the same two-addend sum. No angle was ever
 * classified, compared or estimated.
 *
 *   band 1 (L1-3)  classify and estimate only — NO degree measures asked. A
 *                  six-year-old should be deciding "bigger than a square
 *                  corner?", not reading a protractor.
 *   band 2 (L4-6)  measure, count right angles in a figure, add adjacent
 *                  angles, turn language.
 *   band 3 (L7-10) missing angle to 90/180/360, clock hands, error analysis,
 *                  and generalisation.
 */

const { CONCEPTUAL, PROCEDURAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = ["measureAngle", "angleSum", "classifyAngle", "missingAngle"];

const ACTORS = ["Nia", "Theo", "Ava", "Luca", "Mina", "Sam"];

const CLASSES = ["acute", "right", "obtuse", "straight"];

// Figures the shape kit can draw, with their right-angle counts. Rotation is
// applied at render so `rightAngleOnlyUpright` — the child who only recognises
// a right angle in the standard orientation — is actually probed.
const RIGHT_ANGLES = [
  { shape: "square", count: 4 },
  { shape: "rectangle", count: 4 },
  { shape: "triangleRight", count: 1 },
  { shape: "triangleEquilateral", count: 0 },
  { shape: "rhombus", count: 0 },
  { shape: "pentagon", count: 0 },
  { shape: "hexagon", count: 0 },
  { shape: "trapezoid", count: 0 },
];

const TURNS = [
  { words: "a quarter turn", degrees: 90 },
  { words: "a half turn", degrees: 180 },
  { words: "three quarters of a turn", degrees: 270 },
  { words: "a full turn", degrees: 360 },
];

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function bandOf(level) {
  return level <= 3 ? 1 : level <= 6 ? 2 : 3;
}

function classify(degrees) {
  if (degrees === 180) return "straight";
  if (degrees === 90) return "right";
  return degrees < 90 ? "acute" : "obtuse";
}

const VARIETIES = [
  // ---- band 1: classify and estimate, no degrees --------------------------
  {
    id: "classifyByTurn",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      const kind = pick([
        { text: "opens less than a square corner", answer: "acute" },
        { text: "opens exactly like a square corner", answer: "right" },
        { text: "opens more than a square corner but less than a straight line", answer: "obtuse" },
        { text: "opens into a straight line", answer: "straight" },
      ]);
      return {
        answer: kind.answer,
        answerType: "choice",
        choices: shuffleArray([...CLASSES]),
        promptText: `An angle ${kind.text}. What kind of angle is it?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["rightAngleOnlyUpright"],
      };
    },
  },
  {
    id: "estimateAngle",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      // Benchmarks are 60 apart, and the figure is drawn within 15 of one, so
      // the nearest benchmark is never ambiguous.
      const benchmark = pick([30, 90, 150]);
      const degrees = benchmark + randInt(-15, 15);
      return {
        answer: benchmark,
        answerType: "angle",
        display: { type: "angle", degrees },
        promptText: "About how many degrees is this angle? Answer 30, 90 or 150.",
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["rayLengthIsSize", "offBy10"],
        distractorContext: { a: degrees },
      };
    },
  },
  {
    id: "rightAngleInWorld",
    bands: [1, 2],
    family: APPLICATION,
    subskills: ["classifyAngle"],
    build() {
      const item = pick([
        { answer: "the corner of a book", others: ["a ball", "a slice of pizza", "a rainbow"] },
        { answer: "the corner of a window", others: ["a wheel", "a party hat", "a smile"] },
        { answer: "the corner of a door", others: ["an egg", "a paper fan", "a coin"] },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray([item.answer, ...item.others]),
        promptText: pick([
          "Which one has a square corner (a right angle)?",
          "A right angle looks like a square corner. Which of these shows one?",
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["rightAngleOnlyUpright"],
      };
    },
  },
  {
    id: "countSquareCorners",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      const figure = pick(RIGHT_ANGLES);
      return {
        answer: figure.count,
        answerType: "shapeFigure",
        // Band 1 keeps the figure upright; the tilted version lives in band 2
        // as `identifyRightAngles`, where the rotation probes the misconception.
        display: { shape: figure.shape, shapeMode: "count", rotate: 0 },
        promptText: "Look at this shape. Count its square corners. How many square corners does the shape have?",
        representation: "visual",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["rightAngleOnlyUpright", "sideVertexSwap"],
      };
    },
  },
  {
    id: "pickShapeByAngle",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      // Any triangle has an acute angle; squares/rectangles have only right
      // angles; regular pentagons and hexagons and the kit's rhombus have none
      // of either kind asked for, so each distractor set is safe.
      const wantAcute = Math.random() < 0.5;
      const correct = wantAcute
        ? pick(["triangleEquilateral", "triangleRight"])
        : pick(["square", "rectangle"]);
      const wrong = shuffleArray(
        wantAcute ? ["square", "rectangle", "pentagon", "hexagon"] : ["triangleEquilateral", "pentagon", "hexagon", "rhombus"]
      ).slice(0, 3);
      const opts = shuffleArray([
        { shape: correct, correct: true },
        ...wrong.map((s) => ({ shape: s, correct: false })),
      ]).map((o, i) => ({ ...o, value: i }));
      return {
        answer: opts.findIndex((o) => o.correct),
        answerType: "shapeFigure",
        display: {
          shapeMode: "select",
          options: opts.map(({ shape, value }) => ({ shape, rotate: 0, value })),
        },
        promptText: wantAcute
          ? "One of these shapes has a corner smaller than a square corner. Tap that shape."
          : "One of these shapes has four square corners. Tap that shape.",
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["rightAngleOnlyUpright", "rayLengthIsSize"],
      };
    },
  },
  {
    id: "turnAngleKind",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      const actor = pick(ACTORS);
      const turn = pick([
        { words: "a quarter turn", kind: "right" },
        { words: "a half turn", kind: "straight" },
        { words: "less than a quarter turn", kind: "acute" },
        { words: "more than a quarter turn but less than a half turn", kind: "obtuse" },
      ]);
      return {
        answer: turn.kind,
        answerType: "choice",
        choices: shuffleArray([...CLASSES]),
        promptText: `${actor} turns ${turn.words}. What kind of angle does the turn make?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["wrongFactor", "rightAngleOnlyUpright"],
      };
    },
  },
  {
    id: "orderAngleKinds",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      const smallest = Math.random() < 0.5;
      return {
        answer: smallest ? "acute" : "obtuse",
        answerType: "choice",
        choices: shuffleArray(["acute", "right", "obtuse"]),
        promptText: smallest
          ? "Picture an acute angle, a right angle and an obtuse angle. Which kind of angle opens the least?"
          : "Picture an acute angle, a right angle and an obtuse angle. Which kind of angle opens the most?",
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["rayLengthIsSize"],
      };
    },
  },
  {
    id: "addTurns",
    bands: [1],
    family: APPLICATION,
    subskills: ["angleSum"],
    build() {
      const actor = pick(ACTORS);
      const combo = pick([
        { text: "a quarter turn and then another quarter turn", answer: "a half turn" },
        { text: "a half turn and then another half turn", answer: "a full turn" },
        { text: "a quarter turn and then a half turn", answer: "three quarters of a turn" },
      ]);
      return {
        answer: combo.answer,
        answerType: "choice",
        choices: shuffleArray(TURNS.map((t) => t.words)),
        promptText: `${actor} makes ${combo.text}. Which turn is that in all?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["sumIsAlways180", "wrongFactor"],
      };
    },
  },
  {
    id: "biggerThanRightYesNo",
    bands: [1],
    family: APPLICATION,
    subskills: ["classifyAngle"],
    build() {
      const item = pick([
        { text: "A slice of pie comes to a thin point. Is the angle at the point smaller than a right angle?", answer: "Yes" },
        { text: "A sheet of paper has a square corner. Is that corner bigger than a right angle?", answer: "No" },
        { text: "A book lies open flat, so its covers make a straight line. Is that angle bigger than a right angle?", answer: "Yes" },
        { text: "A door stands open just a crack. Is the angle at the hinge bigger than a right angle?", answer: "No" },
      ]);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: item.text,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["rightAngleOnlyUpright", "rayLengthIsSize"],
      };
    },
  },
  {
    id: "clockAngleKind",
    bands: [1, 2],
    family: APPLICATION,
    subskills: ["classifyAngle"],
    build() {
      const face = pick([
        { hour: 1, kind: "acute" },
        { hour: 2, kind: "acute" },
        { hour: 3, kind: "right" },
        { hour: 4, kind: "obtuse" },
        { hour: 5, kind: "obtuse" },
        { hour: 6, kind: "straight" },
        { hour: 9, kind: "right" },
      ]);
      return {
        answer: face.kind,
        answerType: "choice",
        choices: shuffleArray([...CLASSES]),
        promptText: `A clock shows ${face.hour} o'clock. What kind of angle do the two hands make?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["rightAngleOnlyUpright", "reflexConfusion"],
      };
    },
  },
  {
    id: "compareTurns",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      const a = pick(TURNS);
      const b = pick(TURNS.filter((t) => t.degrees !== a.degrees));
      const bigger = a.degrees > b.degrees ? a : b;
      return {
        answer: bigger.words,
        answerType: "choice",
        choices: shuffleArray([a.words, b.words]),
        promptText: `Which turn is bigger, ${a.words} or ${b.words}?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["rayLengthIsSize"],
      };
    },
  },

  // ---- band 2: measure, count, add ----------------------------------------
  {
    id: "measureAngleProtractor",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["measureAngle"],
    build() {
      const degrees = randInt(1, 35) * 5;
      return {
        answer: degrees,
        answerType: "angle",
        display: { type: "angle", degrees },
        promptText: "How many degrees is this angle?",
        representation: "visual",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["protractorMisread", "reflexConfusion", "offBy10"],
        distractorContext: {},
      };
    },
  },
  {
    id: "classifyFromMeasure",
    bands: [2],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      const degrees = pick([25, 40, 65, 85, 90, 110, 130, 155, 180]);
      return {
        answer: classify(degrees),
        answerType: "choice",
        choices: shuffleArray([...CLASSES]),
        promptText: `An angle measures ${degrees} degrees. Is it acute, right, obtuse or straight?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["protractorMisread"],
      };
    },
  },
  {
    id: "identifyRightAngles",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      const figure = pick(RIGHT_ANGLES);
      return {
        answer: figure.count,
        answerType: "shapeFigure",
        display: {
          shape: figure.shape,
          shapeMode: "count",
          // A tilted square still has four right angles.
          rotate: pick([0, 15, 30, 45]),
        },
        promptText: "How many right angles does this shape have?",
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["rightAngleOnlyUpright", "sideVertexSwap"],
      };
    },
  },
  {
    id: "angleSumAdjacent",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["angleSum"],
    build() {
      const a = randInt(2, 12) * 5;
      const b = randInt(2, Math.max(2, (175 - a) / 5)) * 5;
      return {
        a,
        b,
        op: "+",
        answer: a + b,
        answerType: Math.random() < 0.35 ? "choice" : "numberPad",
        promptText: `Two angles that share a side measure ${a} degrees and ${b} degrees. What is the measure of the whole angle?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["sumIsAlways180", "operationSwap", "offBy10"],
        distractorContext: { a, b },
      };
    },
  },
  {
    id: "turnsAsFractions",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["angleSum"],
    build() {
      const turn = pick(TURNS);
      const actor = pick(ACTORS);
      return {
        answer: turn.degrees,
        answerType: "numberPad",
        promptText: `${actor} turns ${turn.words} to the right. How many degrees did ${actor} turn?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["wrongFactor", "offBy10"],
      };
    },
  },

  // ---- band 3: missing angles and reasoning -------------------------------
  {
    id: "complementMissing",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["missingAngle"],
    build() {
      const known = randInt(1, 17) * 5;
      return {
        answer: 90 - known,
        answerType: "angle",
        display: { type: "angle", degrees: known },
        promptText: `This angle and one more angle together make a right angle. How many degrees is the other angle?`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["sumIsAlways180", "offBy10"],
        distractorContext: { a: 90, b: known },
      };
    },
  },
  {
    id: "supplementMissing",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["missingAngle"],
    build() {
      const known = randInt(1, 35) * 5;
      return {
        answer: 180 - known,
        answerType: "angle",
        display: { type: "angle", degrees: known },
        promptText: `This angle and one more angle together make a straight line. How many degrees is the other angle?`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["protractorMisread", "offBy10"],
        distractorContext: { a: 180, b: known },
      };
    },
  },
  {
    id: "fullTurnMissing",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["missingAngle"],
    build() {
      const a = randInt(4, 28) * 5;
      const b = randInt(4, Math.max(4, (350 - a) / 5)) * 5;
      return {
        answer: 360 - a - b,
        answerType: "numberPad",
        promptText: `Three angles meet at a point. Two of them measure ${a} degrees and ${b} degrees. How many degrees is the third?`,
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["reflexConfusion", "sumIsAlways180"],
        distractorContext: { a: 360, b: a + b },
      };
    },
  },
  {
    id: "clockHandsAngle",
    bands: [3],
    family: APPLICATION,
    subskills: ["measureAngle"],
    build() {
      const hour = randInt(1, 11);
      const gap = Math.min(hour, 12 - hour); // hours between the hands
      return {
        answer: gap * 30,
        answerType: "numberPad",
        promptText: `What is the angle between the hands of a clock at ${hour} o'clock?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["reflexConfusion", "wrongFactor"],
        distractorContext: { a: hour, b: 30 },
      };
    },
  },
  {
    id: "errorAnalysisProtractor",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["measureAngle"],
    build() {
      // The double-scale misread: the child reads 180 - true instead of true.
      const answer = randInt(19, 35) * 5; // 95..175, so it is visibly obtuse
      const actor = pick(ACTORS);
      return {
        answer,
        answerType: Math.random() < 0.5 ? "choice" : "numberPad",
        promptText: `${actor} measured an angle and read ${180 - answer} degrees off the protractor, but the angle is obtuse. What is the real measure?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["protractorMisread", "reflexConfusion", "offBy10"],
        distractorContext: {},
      };
    },
  },
  {
    id: "alwaysSometimesNeverAngle",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["classifyAngle"],
    build() {
      const statement = pick([
        { text: "A triangle can have two right angles.", answer: "Never" },
        { text: "A four-sided shape has four right angles.", answer: "Sometimes" },
        { text: "Two acute angles together make an obtuse angle.", answer: "Sometimes" },
        { text: "A straight angle measures 180 degrees.", answer: "Always" },
        { text: "An angle drawn with longer arms is a bigger angle.", answer: "Never" },
      ]);
      return {
        answer: statement.answer,
        answerType: "choice",
        choices: shuffleArray(["Always", "Sometimes", "Never"]),
        promptText: `${statement.text} Always, sometimes, or never true?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["rayLengthIsSize", "sumIsAlways180"],
      };
    },
  },
];

export const ANGLE_VARIETIES = VARIETIES.map((v) => v.id);

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
  id: "angles",
  label: "Angle Ace!",
  shortLabel: "Angles",
  description: "Classify, measure and add angles.",
  icon: "Triangle",
  op: "angle",
  subskills: SUBSKILLS,
  // Angle items are figures or degree reasoning; the equality formats have no
  // honest reading here (a true/false on "35 + 50 = 85" is an addition item).
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varieties: ANGLE_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: "angle",
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
      modeId: "angles",
      level,
      domain: "MD",
      cluster: "Geometric measurement: angles",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP5", "MP6", "MP7"],
      standardRefs: ["4.MD", "4.G"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `angles-${itemFamily}-${variety.id}`,
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
      min: 5,
      ...(question?.distractorContext || {}),
    });
  },
};
