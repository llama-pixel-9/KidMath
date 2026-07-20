import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";
import { maybeApplyFormat } from "./formats";

/**
 * Measurement (spec part C3 — `measurement`).
 *
 * Before M4 this mode had ONE question shape: `amount x factor` metric
 * conversion, wrapped in one of two prompt strings. Level 1 already asked
 * metric conversion, which is a Grade 3-4 skill being served to a six-year-old,
 * and estimation — the reason measurement is worth teaching at all — had zero
 * items.
 *
 * The ladder here is structural, not numeric:
 *   band 1 (L1-3)  benchmarks, reasonable units, non-standard iteration. No
 *                  conversion at all.
 *   band 2 (L4-6)  one conversion, larger -> smaller, plus reading instruments
 *                  and comparing across units.
 *   band 3 (L7-10) the reverse direction, unknown-on-the-left, mixed units,
 *                  selection tasks and two-step problems.
 */

const { CONCEPTUAL, PROCEDURAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = [
  "lengthConvert",
  "massVolumeConvert",
  "benchmarkEstimate",
  "compareOrder",
  "multiStepMeasure",
];

// Only the two formats whose transform stays mathematically honest for a
// conversion: both re-present `amount x factor` itself. The estimation and
// benchmark work this mode needs is done natively below (`estimateBand`,
// `benchmarkPick`, `unitReasonable`) rather than through a format transform,
// because estimating a length is not the same act as rounding a product.
const SUPPORTED_FORMATS = ["trueFalse", "errorAnalysis"];

const LENGTH = [
  { from: "m", to: "cm", factor: 100 },
  { from: "km", to: "m", factor: 1000 },
  { from: "cm", to: "mm", factor: 10 },
];
const MASS_VOL = [
  { from: "kg", to: "g", factor: 1000 },
  { from: "L", to: "mL", factor: 1000 },
];

const LENGTH_UNITS = ["mm", "cm", "m", "km"];
const MASS_VOL_UNITS = ["mL", "L", "g", "kg"];

// Body-scale references. `about` is the phrase the prompt asks for, so every
// option in a benchmark item must carry a DIFFERENT `about`.
const BENCHMARKS = [
  { obj: "a paperclip", about: "3 cm" },
  { obj: "a fingernail", about: "1 cm" },
  { obj: "a pencil tip", about: "1 mm" },
  { obj: "a door's width", about: "1 m" },
  { obj: "a doorway's height", about: "2 m" },
  { obj: "a school bus", about: "10 m" },
  { obj: "a walk to the shops", about: "1 km" },
  { obj: "a running track lap", about: "400 m" },
];

// Right unit for a real object. The distractors are the metric steps either
// side — `benchmarkScaleError` is the child who says a door is about 2 cm.
const UNIT_SENSE = [
  { obj: "A classroom door", value: 2, unit: "m", pool: LENGTH_UNITS },
  { obj: "A crayon", value: 9, unit: "cm", pool: LENGTH_UNITS },
  { obj: "A ladybird", value: 6, unit: "mm", pool: LENGTH_UNITS },
  { obj: "The road to the next town", value: 4, unit: "km", pool: LENGTH_UNITS },
  { obj: "A bag of flour", value: 1, unit: "kg", pool: MASS_VOL_UNITS },
  { obj: "A grape", value: 5, unit: "g", pool: MASS_VOL_UNITS },
  { obj: "A carton of juice", value: 1, unit: "L", pool: MASS_VOL_UNITS },
  { obj: "A spoonful of medicine", value: 5, unit: "mL", pool: MASS_VOL_UNITS },
];

const ESTIMATES = [
  { obj: "a kitchen table", value: 80, unit: "cm" },
  { obj: "a new pencil", value: 18, unit: "cm" },
  { obj: "a classroom", value: 9, unit: "m" },
  { obj: "a cat", value: 4, unit: "kg" },
  { obj: "a drinking glass", value: 250, unit: "mL" },
  { obj: "a school corridor", value: 30, unit: "m" },
];

const ACTORS = ["Nia", "Theo", "Ava", "Luca", "Mina", "Sam"];

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function bandOf(level) {
  return level <= 3 ? 1 : level <= 6 ? 2 : 3;
}

function unitTable(subskill) {
  return subskill === "massVolumeConvert" ? MASS_VOL : LENGTH;
}

/** Conversion varieties work in either measure system; pick one honestly. */
function convertSubskill(target) {
  if (target === "lengthConvert" || target === "massVolumeConvert") return target;
  return Math.random() < 0.6 ? "lengthConvert" : "massVolumeConvert";
}

/** Distinct options built around a correct value. */
function optionsAround(correct, others, count = 4) {
  const out = [correct];
  for (const o of shuffleArray([...others])) {
    if (out.length >= count) break;
    if (!out.includes(o)) out.push(o);
  }
  return shuffleArray(out);
}

// --- the variety catalog ---------------------------------------------------
// Each entry declares the levels it belongs to, the family it genuinely is,
// and which subskills it can serve. `build` returns everything that varies.

const VARIETIES = [
  // ---- band 1: no conversion at all ---------------------------------------
  {
    id: "benchmarkPick",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["benchmarkEstimate"],
    build() {
      const target = pick(BENCHMARKS);
      const others = BENCHMARKS.filter((b) => b.about !== target.about).map((b) => b.obj);
      return {
        answer: target.obj,
        answerType: "choice",
        choices: optionsAround(target.obj, others),
        promptText: `Which one is about ${target.about}?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["benchmarkScaleError"],
      };
    },
  },
  {
    id: "unitReasonable",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["benchmarkEstimate"],
    build() {
      const item = pick(UNIT_SENSE);
      return {
        answer: item.unit,
        answerType: "choice",
        choices: optionsAround(item.unit, item.pool.filter((u) => u !== item.unit)),
        promptText: `${item.obj} is about ${item.value} ___ . Which unit belongs?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["benchmarkScaleError", "wrongFactor"],
      };
    },
  },
  {
    id: "estimateBand",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["benchmarkEstimate"],
    build() {
      const item = pick(ESTIMATES);
      const label = (v) => `${v} ${item.unit}`;
      const small = item.value % 10 === 0 ? item.value / 10 : item.value * 1000;
      return {
        answer: label(item.value),
        answerType: "choice",
        choices: shuffleArray([
          label(item.value),
          label(item.value * 10),
          label(item.value * 100),
          label(small),
        ]),
        promptText: `About how big is ${item.obj}?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["benchmarkScaleError", "placeValueSlip"],
      };
    },
  },
  {
    id: "iterateNonstandard",
    bands: [1],
    family: APPLICATION,
    subskills: ["multiStepMeasure"],
    build() {
      const actor = pick(ACTORS);
      const clips = randInt(3, 9);
      const each = pick([2, 3, 4, 5]);
      return {
        a: clips,
        b: each,
        op: "x",
        answer: clips * each,
        answerType: "numberPad",
        promptText: `${actor} lines up ${clips} paperclips end to end along a ribbon with no gaps. Each clip is ${each} cm long. How long is the ribbon in cm?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["offByOne", "operationSwap"],
        distractorContext: { a: clips, b: each },
      };
    },
  },

  // ---- band 2: one conversion, and reading instruments --------------------
  {
    id: "convertDown",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["lengthConvert", "massVolumeConvert"],
    build(level, target) {
      const subskill = convertSubskill(target);
      const unit = pick(unitTable(subskill));
      const amount = randInt(2, level <= 6 ? 9 : 20);
      // A third are asked as multiple choice, which is the only way the
      // wrongFactor / conversionInverted distractors ever reach a child.
      const asChoice = Math.random() < 0.35;
      return {
        subskill,
        a: amount,
        b: unit.factor,
        op: "x",
        answer: amount * unit.factor,
        answerType: asChoice ? "choice" : "numberPad",
        promptText: `${amount} ${unit.from} = ? ${unit.to}`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["wrongFactor", "conversionInverted", "placeValueSlip"],
        distractorContext: { factor: unit.factor, a: amount, b: unit.factor },
      };
    },
  },
  {
    id: "convertMissingUnit",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["lengthConvert", "massVolumeConvert"],
    build(level, target) {
      const subskill = convertSubskill(target);
      const unit = pick(unitTable(subskill));
      const amount = randInt(2, 9);
      const pool = subskill === "massVolumeConvert" ? MASS_VOL_UNITS : LENGTH_UNITS;
      return {
        subskill,
        answer: unit.to,
        answerType: "choice",
        choices: optionsAround(unit.to, pool.filter((u) => u !== unit.to)),
        promptText: `${amount} ${unit.from} = ${amount * unit.factor} ___ . Which unit belongs?`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["wrongFactor", "unitDirection"],
      };
    },
  },
  {
    id: "compareMeasures",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["compareOrder"],
    build(level, target) {
      const subskill = convertSubskill(target);
      const unit = pick(unitTable(subskill));
      const big = randInt(1, 9);
      // Both sides are held in the SMALL unit so the comparison is exact.
      const leftSmall = big * unit.factor;
      const rightSmall = pick([
        leftSmall,
        leftSmall - unit.factor / 2,
        leftSmall + unit.factor / 2,
        leftSmall - unit.factor,
        leftSmall + unit.factor,
      ]);
      return {
        answer: leftSmall > rightSmall ? ">" : leftSmall < rightSmall ? "<" : "=",
        answerType: "symbolSelect",
        promptText: `${big} ${unit.from} ? ${rightSmall} ${unit.to}`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["unitLabelIgnored", "symbolFlip"],
      };
    },
  },
  {
    id: "rulerRead",
    bands: [2],
    family: CONCEPTUAL,
    subskills: ["benchmarkEstimate"],
    build() {
      // The object does NOT start at zero, which is the whole point: a child
      // who reads the end mark alone answers `end`, not `end - start`.
      const start = randInt(1, 6);
      const length = randInt(3, 9);
      const object = pick(["crayon", "eraser", "leaf", "key", "ribbon"]);
      return {
        answer: length,
        answerType: "numberPad",
        promptText: `A ${object} lies along a ruler. It starts at the ${start} cm mark and ends at the ${start + length} cm mark. How long is it in cm?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["offByOne", "startAsResult"],
        distractorContext: { a: start, b: start + length },
      };
    },
  },
  {
    id: "wouldYouRatherLength",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["multiStepMeasure"],
    build() {
      const n1 = randInt(2, 6);
      const e1 = randInt(4, 12);
      const n2 = randInt(2, 6);
      let e2 = randInt(4, 12);
      // Equal totals would make both options correct, so nudge one up.
      if (n1 * e1 === n2 * e2) e2 += 1;
      const optA = `${n1} ribbons of ${e1} cm`;
      const optB = `${n2} ribbons of ${e2} cm`;
      return {
        answer: n1 * e1 > n2 * e2 ? optA : optB,
        answerType: "choice",
        choices: shuffleArray([optA, optB]),
        promptText: `Would you rather have ${optA}, or ${optB}? Pick the one with more ribbon in all.`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["compareAsAdditive"],
      };
    },
  },

  // ---- band 3: reverse direction, unknown on the left, multi-step ---------
  {
    id: "convertUp",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["lengthConvert", "massVolumeConvert"],
    build(level, target) {
      const subskill = convertSubskill(target);
      const unit = pick(unitTable(subskill));
      const answer = randInt(2, 12);
      return {
        subskill,
        answer,
        answerType: "numberPad",
        promptText: `${answer * unit.factor} ${unit.to} = ? ${unit.from}`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["unitDirection", "conversionInverted", "wrongFactor"],
        distractorContext: { factor: unit.factor },
      };
    },
  },
  {
    id: "convertMissingAmount",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["lengthConvert", "massVolumeConvert"],
    build(level, target) {
      const subskill = convertSubskill(target);
      const unit = pick(unitTable(subskill));
      const answer = randInt(2, 12);
      return {
        subskill,
        answer,
        answerType: "numberPad",
        promptText: `? ${unit.from} = ${answer * unit.factor} ${unit.to}`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["unitDirection", "conversionInverted", "startAsResult"],
        distractorContext: { factor: unit.factor },
      };
    },
  },
  {
    id: "selectLongerThan",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["compareOrder"],
    build() {
      // Mixed units against one threshold. Values are held in mm so the
      // comparison never depends on the rendered string.
      const pool = shuffleArray([
        { label: "90 cm", mm: 900 },
        { label: "1 m", mm: 1000 },
        { label: "850 mm", mm: 850 },
        { label: "1200 mm", mm: 1200 },
        { label: "2 m", mm: 2000 },
        { label: "45 cm", mm: 450 },
        { label: "3 m", mm: 3000 },
      ]).slice(0, 5);
      // multiSelect needs at least one right option (an empty answer cannot be
      // scored) and at least one wrong one (or "select all" is correct).
      if (!pool.some((o) => o.mm > 1000)) pool[0] = { label: "3 m", mm: 3000 };
      if (!pool.some((o) => o.mm <= 1000)) pool[pool.length - 1] = { label: "45 cm", mm: 450 };
      return {
        answer: pool.filter((o) => o.mm > 1000).map((o) => o.label),
        answerType: "multiSelect",
        display: { options: pool.map((o) => o.label) },
        promptText: "Select every measure that is longer than 1 metre.",
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["unitLabelIgnored", "wrongFactor"],
      };
    },
  },
  {
    id: "addMixedUnits",
    bands: [3],
    family: APPLICATION,
    subskills: ["multiStepMeasure"],
    build() {
      const actor = pick(ACTORS);
      const metres = randInt(2, 5);
      const centimetres = randInt(1, 9) * 10;
      const total = metres * 100 + centimetres;
      const cut = randInt(2, 9) * 25;
      return {
        answer: total - cut,
        answerType: "numberPad",
        promptText: `${actor}'s rope is ${metres} m ${centimetres} cm long. ${actor} cuts off ${cut} cm. How many cm are left?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["wrongFactor", "operationSwap"],
        distractorContext: { a: total, b: cut },
      };
    },
  },
  {
    id: "twoStepConvert",
    bands: [3],
    family: APPLICATION,
    subskills: ["multiStepMeasure"],
    build() {
      const actor = pick(ACTORS);
      const litres = randInt(2, 5);
      const pourMl = pick([100, 150, 200, 250, 300]);
      const times = randInt(2, 3);
      return {
        answer: litres * 1000 - pourMl * times,
        answerType: "numberPad",
        promptText: `A tank holds ${litres} L. ${actor} pours out ${pourMl} mL ${times} times. How many mL are left?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["wrongFactor", "conversionInverted"],
        distractorContext: { factor: 1000 },
      };
    },
  },
  {
    id: "errorAnalysisConvert",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["lengthConvert", "massVolumeConvert"],
    build(level, target) {
      const subskill = convertSubskill(target);
      const unit = pick(unitTable(subskill));
      const amount = randInt(2, 9);
      const actor = pick(ACTORS);
      // The named child's answer is the wrongFactor mistake, one metric step
      // off — never accidentally the right answer.
      const wrong = amount * (unit.factor === 10 ? 100 : unit.factor / 10);
      return {
        subskill,
        answer: amount * unit.factor,
        answerType: "numberPad",
        promptText: `${actor} says ${amount} ${unit.from} = ${wrong} ${unit.to}. That is not right. What is ${amount} ${unit.from} in ${unit.to}?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["wrongFactor", "placeValueSlip"],
        distractorContext: { factor: unit.factor },
      };
    },
  },
];

export const MEASUREMENT_VARIETIES = VARIETIES.map((v) => v.id);

/**
 * Varieties allowed at this level, narrowed by any family/subskill the caller
 * asked for. Each narrowing falls back rather than returning nothing: the
 * session engine may legitimately ask for a family this band has no variety of.
 */
function selectVariety(level, context) {
  const b = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(b));
  if (context.allowWordProblems === false) {
    const dry = pool.filter((v) => v.family !== APPLICATION);
    if (dry.length) pool = dry;
  }
  if (context.itemFamily) {
    const byFamily = pool.filter((v) => v.family === context.itemFamily);
    const anyBand = VARIETIES.filter(
      (v) => v.family === context.itemFamily && !(context.allowWordProblems === false && v.family === APPLICATION)
    );
    pool = byFamily.length ? byFamily : anyBand.length ? anyBand : pool;
  }
  if (context.targetSubskill) {
    const bySubskill = pool.filter((v) => v.subskills.includes(context.targetSubskill));
    if (bySubskill.length) pool = bySubskill;
  }
  return pick(pool);
}

export default {
  id: "measurement",
  label: "Measure Up!",
  shortLabel: "Measurement",
  description: "Estimate, compare and convert measures.",
  icon: "Scale",
  op: "convert",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varieties: MEASUREMENT_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const subskill = built.subskill || variety.subskills[0];
    const itemFamily = variety.family;

    const question = {
      op: built.op || "convert",
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
      modeId: "measurement",
      level,
      domain: "MD",
      cluster: "Measure, estimate and convert measurements",
      subskill,
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP5", "MP6"],
      standardRefs: ["2.MD", "3.MD", "4.MD"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `measurement-${itemFamily}-${variety.id}`,
      structureType: variety.id,
    });

    // Formats only fire on the symbolic conversion rows, the only ones
    // carrying a true `a op b = answer` relation.
    return maybeApplyFormat(question, level, context, SUPPORTED_FORMATS, 0.2);
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices)) return question.choices;
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 0,
      ...(question?.distractorContext || {}),
    });
  },
};
