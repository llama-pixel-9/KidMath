import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * volumeCoordinates — Grade 5 geometric measurement and the coordinate plane
 * (5.MD.C + 5.G.A). Two figures carry the mode: `cubeGrid` (a prism of unit
 * cubes, oblique projection) and `coordGrid` (quadrant I).
 *
 *   band 1 (L1-3)  count unit cubes in drawn prisms; read a labeled point
 *   band 2 (L4-6)  V = l × w × h from dimensions; plot/read coordinates
 *   band 3 (L7-10) composite volume, missing dimension, distance along a
 *                  gridline, coordinate patterns
 *
 * Coordinate answers stay single numbers (an x or a y) or a choice among
 * labeled points, so the existing widgets cover everything.
 */

const { PROCEDURAL, CONCEPTUAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = ["countUnitCubes", "volumeFormula", "plotAndRead", "compositeAndDistance"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);

const NAMES = ["Maya", "Leo", "Priya", "Omar", "Zoe", "Kai", "Nora", "Diego", "Rosa", "Finn", "Ida", "Luca", "Amara", "Theo", "Nia", "Ben", "June"];

function smallPrism(band) {
  // Band 1 stays within the K-band magnitude gate (every stated count ≤ 20).
  if (band === 1) return { l: randInt(2, 3), w: randInt(1, 2), h: randInt(1, 3) };
  if (band === 2) return { l: randInt(2, 5), w: randInt(2, 4), h: randInt(2, 4) };
  return { l: randInt(3, 6), w: randInt(2, 5), h: randInt(2, 5) };
}

function distinctPoints(count, max) {
  const pts = [];
  const labels = ["A", "B", "C", "D"];
  while (pts.length < count) {
    const p = { x: randInt(1, max - 1), y: randInt(1, max - 1) };
    if (pts.some((q) => q.x === p.x && q.y === p.y)) continue;
    pts.push(p);
  }
  return pts.map((p, i) => ({ ...p, label: labels[i] }));
}

const VARIETIES = [
  // ---- band 1: cubes are counted, points are read -------------------------
  {
    id: "countCubes",
    bands: [1, 2],
    family: PROCEDURAL,
    subskills: ["countUnitCubes"],
    build(level) {
      const { l, w, h } = smallPrism(bandOf(level));
      return {
        answer: l * w * h,
        answerType: "numberPad",
        display: { figure: "cubeGrid", cube: { l, w, h } },
        promptText: pick([
          "How many unit cubes make this box?",
          "Count the unit cubes in the box. How many cubes are there?",
        ]),
        representation: "visual",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["countsVisibleFacesOnly"],
        distractorContext: { a: l * w, b: h },
      };
    },
  },
  {
    id: "readPointCoordinate",
    bands: [1, 2, 3],
    family: PROCEDURAL,
    subskills: ["plotAndRead"],
    build(level) {
      const max = bandOf(level) === 1 ? 6 : 10;
      const pts = distinctPoints(1, max);
      const axis = Math.random() < 0.5 ? "x" : "y";
      return {
        answer: pts[0][axis],
        answerType: "numberPad",
        display: { figure: "coordGrid", coord: { max, points: pts } },
        promptText: pick([
          `Point A is on the grid. What is its ${axis}-coordinate?`,
          `Find point A. What number is its ${axis}-coordinate?`,
        ]),
        representation: "visual",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["swapsXandY"],
      };
    },
  },
  {
    id: "layersJudged",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["countUnitCubes"],
    build(level) {
      const { l, w, h } = smallPrism(bandOf(level));
      const wrong = Math.random() < 0.5;
      // The wrong claim stays inside the band's magnitude gate (K ≤ 20).
      const bump = bandOf(level) === 1 && l * w * (h + 1) > 20 && h > 1 ? -1 : 1;
      const claim = wrong ? l * w * (h + bump) : l * w * h;
      return {
        answer: wrong ? "No" : "Yes",
        answerType: "choice",
        choices: ["Yes", "No"],
        display: { figure: "cubeGrid", cube: { l, w, h } },
        promptText: `${pick(NAMES)} says this box holds ${claim} unit cubes. Is that right?`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["countsVisibleFacesOnly"],
      };
    },
  },
  {
    id: "whichPointAt",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["plotAndRead"],
    build(level) {
      const max = bandOf(level) === 1 ? 6 : 10;
      const pts = distinctPoints(3, max);
      const target = pick(pts);
      return {
        answer: target.label,
        answerType: "choice",
        choices: shuffleArray(pts.map((p) => p.label)),
        display: { figure: "coordGrid", coord: { max, points: pts } },
        promptText: pick([
          `Which point sits at (${target.x}, ${target.y})?`,
          `One of the labeled points is at (${target.x}, ${target.y}). Which one?`,
        ]),
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["swapsXandY"],
      };
    },
  },

  // ---- band 2: the formula (5.MD.C.5), plotting ---------------------------
  {
    id: "volumeFromDims",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["volumeFormula"],
    build(level) {
      const { l, w, h } = smallPrism(bandOf(level));
      return {
        answer: l * w * h,
        answerType: "numberPad",
        promptText: pick([
          `A box is ${l} units long, ${w} units wide and ${h} units tall. What is its volume in cubic units?`,
          `Find the volume: a ${l} by ${w} by ${h} box. How many cubic units is that?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["addsDimensions"],
        distractorContext: { a: l * w, b: h },
      };
    },
  },
  {
    id: "baseTimesHeight",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["volumeFormula"],
    build(level) {
      const { l, w, h } = smallPrism(bandOf(level));
      return {
        answer: l * w * h,
        answerType: "numberPad",
        display: { figure: "cubeGrid", cube: { l, w, h } },
        promptText: pick([
          `The bottom layer holds ${l * w} cubes and there are ${h} layers. What is the volume in cubic units?`,
          `Each layer has ${l * w} cubes, stacked ${h} high. How many cubes in all?`,
          `One layer is ${l * w} cubes. With ${h} layers, how many cubes make the box?`,
          `${h} layers of ${l * w} cubes each — what is the total number of cubes?`,
          `The box fills up in layers of ${l * w} cubes, ${h} layers tall. How many cubes fill it?`,
          `A floor of ${l * w} cubes is copied ${h} times going up. How many cubes is the whole stack?`,
          `Think layers: ${l * w} cubes per layer, ${h} layers. What is the cube count?`,
          `Multiply the layer of ${l * w} cubes by ${h} floors. How many cubes in the box?`,
          `${l * w} cubes sit in each of the ${h} levels. How many cubes altogether?`,
          `The bottom slab uses ${l * w} cubes and the box is ${h} slabs high. Total cubes?`,
          `From a ${l * w}-cube base, the box rises ${h} layers. How many unit cubes is that?`,
        ]),
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDimensions"],
        distractorContext: { a: l * w, b: h },
      };
    },
  },
  {
    id: "cubeGiftStory",
    bands: [1, 2],
    family: APPLICATION,
    subskills: ["countUnitCubes"],
    build(level) {
      const { l, w, h } = smallPrism(bandOf(level));
      const name = pick(NAMES);
      return {
        answer: l * w * h,
        answerType: "numberPad",
        display: { figure: "cubeGrid", cube: { l, w, h } },
        promptText: pick([
          `${name} glues unit cubes into this shape for a gift. How many cubes does ${name} glue?`,
          `${name} builds this block shape for the class fair. How many unit cubes does ${name} use?`,
          `For a game piece, ${name} stacks unit cubes like this. How many cubes are in the piece?`,
          `${name} packs sugar cubes into this shape. How many cubes did ${name} pack?`,
          `This is ${name}'s cube sculpture. How many unit cubes make the sculpture?`,
          `${name} snaps together the cubes shown here. How many cubes did ${name} snap together?`,
          `Count ${name}'s stack of unit cubes. How many cubes tall, wide and deep in total — how many cubes altogether?`,
        ]),
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["countsVisibleFacesOnly"],
        distractorContext: { a: l * w, b: h },
      };
    },
  },
  {
    id: "aquariumStory",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["volumeFormula"],
    build(level) {
      const { l, w, h } = smallPrism(bandOf(level));
      const name = pick(NAMES);
      const thing = pick(["aquarium", "toy chest", "planter box", "storage bin"]);
      return {
        answer: l * w * h,
        answerType: "numberPad",
        promptText: pick([
          `${name} builds a ${thing} ${l} units long, ${w} units wide and ${h} units tall. How many unit cubes of space does the ${thing} hold?`,
          `A ${thing} measures ${l} by ${w} by ${h} units. How many cubic units of space is that?`,
          `${name}'s ${thing} is ${l} across, ${w} deep and ${h} high, in units. What is its volume in cubic units?`,
          `The class ${thing} is ${l} by ${w} by ${h} units. How many unit cubes would fill it?`,
          `${name} packs a ${thing} that is ${l} × ${w} × ${h} units. How many unit cubes fit inside?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDimensions"],
        distractorContext: { a: l * w, b: h },
      };
    },
  },
  {
    id: "treasureMapStory",
    bands: [1, 2, 3],
    family: APPLICATION,
    subskills: ["plotAndRead"],
    build(level) {
      const max = bandOf(level) === 1 ? 6 : 10;
      const pts = distinctPoints(2, max);
      const [a] = pts;
      const name = pick(NAMES);
      return {
        answer: a.x,
        answerType: "numberPad",
        display: { figure: "coordGrid", coord: { max, points: pts } },
        promptText: pick([
          `On ${name}'s map, the treasure is at point A. How many steps right of 0 is it (the x-coordinate)?`,
          `${name} marks the camp at point A. What is the camp's x-coordinate?`,
          `${name} pins the fox den at point A on the class map. What is the den's x-coordinate?`,
          `The flag on ${name}'s course sits at point A. How far right of 0 is the flag (its x-coordinate)?`,
          `${name} plots the library at point A. Which x-coordinate does the library have?`,
          `Point A on ${name}'s garden plan is the bench. What is the bench's x-coordinate?`,
          `${name} hides a prize at point A on the map. What is the prize's x-coordinate?`,
          `The slide on ${name}'s playground map is at point A. What is the slide's x-coordinate?`,
          `${name} draws the school at point A. How many units right of 0 is the school (its x-coordinate)?`,
          `On ${name}'s zoo map, the otter pool is point A. What is the pool's x-coordinate?`,
          `${name} labels the water fountain as point A. Which x-coordinate matches the fountain?`,
          `The nest ${name} spotted is marked as point A. What is the nest's x-coordinate?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["swapsXandY"],
      };
    },
  },

  // ---- band 3: composite volume, missing dimension, grid distance ---------
  {
    id: "missingDimension",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["volumeFormula"],
    build() {
      const l = randInt(2, 6);
      const w = randInt(2, 5);
      let h = randInt(2, 6);
      // The gate rejects prompts whose stated numbers include the answer.
      while (h === l || h === w) h = (h % 6) + 2 > 6 ? 2 : (h % 6) + 1;
      if (h === l || h === w) h = [2, 3, 4, 5, 6].find((v) => v !== l && v !== w);
      return {
        answer: h,
        answerType: "numberPad",
        promptText: pick([
          `A box has volume ${l * w * h} cubic units. Its base is ${l} by ${w}. How tall is it?`,
          `Volume ${l * w * h}, length ${l}, width ${w}. What is the height in units?`,
          `A ${l} by ${w} base holds a volume of ${l * w * h} cubic units. How many units tall is the box?`,
          `The box's volume is ${l * w * h}. Two sides are ${l} and ${w}. What is the third side?`,
          `${l * w * h} unit cubes fill a box with a ${l} by ${w} bottom. How many layers of cubes are there?`,
          `Height check: volume ${l * w * h}, base ${l} × ${w}. How tall in units?`,
          `${l} × ${w} × ? = ${l * w * h}. What is the missing side in units?`,
          `A prism of ${l * w * h} cubic units stands on a ${l} × ${w} footprint. How many units high is it?`,
          `To reach ${l * w * h} cubic units from a ${l} by ${w} base, how many layers are needed?`,
          `The volume is ${l * w * h} and two edges are ${l} and ${w}. What is the third edge in units?`,
          `Divide ${l * w * h} by the ${l} × ${w} base. How many units tall is the box?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDimensions"],
        distractorContext: { a: l * w, b: h },
      };
    },
  },
  {
    id: "compositeVolume",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["compositeAndDistance"],
    build() {
      const l1 = randInt(2, 4);
      const w1 = randInt(2, 4);
      const h1 = randInt(2, 4);
      const l2 = randInt(2, 4);
      const w2 = randInt(2, 3);
      const h2 = randInt(1, 3);
      return {
        answer: l1 * w1 * h1 + l2 * w2 * h2,
        answerType: "numberPad",
        promptText: pick([
          `A shape is two boxes joined together: one ${l1} × ${w1} × ${h1} and one ${l2} × ${w2} × ${h2}. What is the total volume in cubic units?`,
          `Two blocks, ${l1} × ${w1} × ${h1} and ${l2} × ${w2} × ${h2}, are glued into one shape. Find its volume in cubic units.`,
          `A step-shaped figure is a ${l1} × ${w1} × ${h1} box on a ${l2} × ${w2} × ${h2} box. How many cubic units is the whole figure?`,
          `Add the volumes: a ${l1} × ${w1} × ${h1} block plus a ${l2} × ${w2} × ${h2} block. What is the total in cubic units?`,
          `An L-shaped solid is built from a ${l1} × ${w1} × ${h1} part and a ${l2} × ${w2} × ${h2} part. What is its volume in cubic units?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["addsDimensions"],
      };
    },
  },
  {
    id: "gridDistance",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["compositeAndDistance"],
    build() {
      const max = 10;
      const y = randInt(1, max - 1);
      const x1 = randInt(0, max - 3);
      const x2 = x1 + randInt(2, max - x1 - 1);
      const pts = [
        { x: x1, y, label: "A" },
        { x: x2, y, label: "B" },
      ];
      return {
        answer: x2 - x1,
        answerType: "numberPad",
        display: { figure: "coordGrid", coord: { max, points: pts } },
        promptText: pick([
          "Points A and B sit on the same gridline. How many units apart are they?",
          "How far is it from point A to point B along the grid?",
        ]),
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["countsEndpointsAsSteps"],
      };
    },
  },
  {
    id: "compositePlanJudged",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["compositeAndDistance"],
    build() {
      const l1 = randInt(2, 4);
      const w1 = randInt(2, 3);
      const h1 = randInt(2, 4);
      const l2 = randInt(1, 3);
      const w2 = randInt(1, 2);
      const h2 = randInt(1, 3);
      const v1 = l1 * w1 * h1;
      const v2 = l2 * w2 * h2;
      const wrong = Math.random() < 0.5;
      const claim = wrong ? v1 + v2 + pick([-2, -1, 1, 2]) : v1 + v2;
      return {
        answer: claim === v1 + v2 ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          (nm) => `${nm} splits an L-shape into a ${l1} × ${w1} × ${h1} box and a ${l2} × ${w2} × ${h2} box, then says the volume is ${claim}. Is that right?`,
          (nm) => `${nm} adds ${v1} and ${v2} for the two parts of a shape and writes ${claim} cubic units. Is ${nm} right?`,
          (nm) => `Splitting the figure, ${nm} gets ${l1} × ${w1} × ${h1} plus ${l2} × ${w2} × ${h2} and claims ${claim} in all. Do you agree?`,
        ])(pick(NAMES)),
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["addsDimensions"],
      };
    },
  },
  {
    id: "walkDistanceStory",
    bands: [3],
    family: APPLICATION,
    subskills: ["compositeAndDistance"],
    build() {
      const max = 10;
      const y = randInt(1, max - 1);
      const x1 = randInt(0, max - 3);
      const x2 = x1 + randInt(2, max - x1 - 1);
      const pts = [
        { x: x1, y, label: "A" },
        { x: x2, y, label: "B" },
      ];
      const name = pick(NAMES);
      const places = pick([["swings", "slide"], ["tent", "campfire"], ["gate", "fountain"], ["desk", "door"]]);
      return {
        answer: x2 - x1,
        answerType: "numberPad",
        display: { figure: "coordGrid", coord: { max, points: pts } },
        promptText: pick([
          `On ${name}'s park map, the ${places[0]} are at A and the ${places[1]} is at B. How many units does ${name} walk from A to B along the path?`,
          `${name} goes straight from the ${places[0]} (point A) to the ${places[1]} (point B). How many units is the walk?`,
          `The ${places[0]} sit at point A and the ${places[1]} at point B on ${name}'s map. How many units apart are they?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["countsEndpointsAsSteps"],
      };
    },
  },
  {
    id: "coordinatePattern",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["plotAndRead"],
    build() {
      const startX = randInt(0, 2);
      const startY = randInt(0, 3);
      const dx = randInt(1, 2);
      const dy = randInt(1, 3);
      const k = 3;
      const nx = startX + dx * k;
      const ny = startY + dy * k;
      return {
        answer: ny,
        answerType: "numberPad",
        promptText: pick([
          `A pattern of points starts at (${startX}, ${startY}) and each next point adds ${dx} to x and ${dy} to y. The 4th point is (${nx}, ?). What is its y-coordinate?`,
          `Points follow the rule +${dx} on x, +${dy} on y from (${startX}, ${startY}). What is the y-coordinate of the 4th point, at x = ${nx}?`,
          `Start at (${startX}, ${startY}). Each step adds ${dx} across and ${dy} up. After 3 steps, what is the y-coordinate?`,
          `A dot hops from (${startX}, ${startY}) by (+${dx}, +${dy}) each time. Where is y after the 3rd hop?`,
          `The rule is: right ${dx}, up ${dy}, starting from (${startX}, ${startY}). What y-value goes with x = ${nx}?`,
          `From (${startX}, ${startY}), each new point is ${dx} right and ${dy} up. What is the y-coordinate of the 4th point?`,
          `A path starts at (${startX}, ${startY}) and repeats +${dx} on x, +${dy} on y. At x = ${nx}, what is y?`,
          `Third jump of (+${dx}, +${dy}) from (${startX}, ${startY}) — what is the y-value there?`,
          `Following (+${dx}, +${dy}) three times from (${startX}, ${startY}), the point is (${nx}, ?). Find the y.`,
          `The pattern adds ${dx} across and ${dy} up each step from (${startX}, ${startY}). What y pairs with x = ${nx}?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["swapsXandY"],
      };
    },
  },
];

export const VOLUME_COORD_VARIETIES = VARIETIES.map((v) => v.id);

function selectVariety(level, context) {
  // QA / bank authoring: force one variety (same contract as ?qaVariety).
  if (context.varietyId || context.structureType) {
    const forced = VARIETIES.find((v) => v.id === (context.varietyId || context.structureType));
    if (forced) return forced;
  }
  const b = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(b));
  if (context.allowWordProblems === false) {
    const dry = pool.filter((v) => v.family !== APPLICATION);
    if (dry.length) pool = dry;
  }
  if (context.itemFamily) {
    const byFamily = pool.filter((v) => v.family === context.itemFamily);
    if (byFamily.length) pool = byFamily;
  }
  if (context.targetSubskill) {
    const bySubskill = pool.filter((v) => v.subskills.includes(context.targetSubskill));
    if (bySubskill.length) pool = bySubskill;
  }
  return pick(pool);
}

export default {
  id: "volumeCoordinates",
  label: "Cube & Compass",
  shortLabel: "Volume & Grids",
  description: "Volume from unit cubes; points on the coordinate grid.",
  icon: "Shapes",
  op: "volume",
  subskills: SUBSKILLS,
  // Band-scoped subskills — coverage gates and targeting respect these ranges.
  subskillLevels: { countUnitCubes: [1, 6], volumeFormula: [4, 10], compositeAndDistance: [7, 10] },
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varieties: VOLUME_COORD_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: "volume",
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
      modeId: "volumeCoordinates",
      level,
      domain: "MD",
      cluster: "Geometric measurement: volume; graph points on the coordinate plane",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP4", "MP7"],
      standardRefs: ["5.MD", "5.G"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `volumeCoordinates-${itemFamily}-${variety.id}`,
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
      min: 1,
      ...(question?.distractorContext || {}),
    });
  },
};
