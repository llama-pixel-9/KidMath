import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * Data & graphs (spec part C3 — `dataGraphs`).
 *
 * Before M4: one 4-bar graph, two prompt strings, and `compareBars` hard-coded
 * to bars 0 and 1 so two of the four categories were never the subject of a
 * comparison. No total, no "how many fewer", no pictograph, no key, no tally,
 * no line plot.
 *
 * The structural jump in this domain is the SCALE, not the size of the bars:
 *   band 1 (L1-3)  read one value, spot the extreme, a key of 1, tallies
 *   band 2 (L4-6)  compare any two, "how many fewer", totals, a key of 2
 *   band 3 (L7-10) total the whole survey, keys of 4/5 with half symbols,
 *                  compare through a key, multi-statement reasoning
 *
 * Every variety draws a real figure. Bar graphs, pictographs, tallies and line
 * plots each ship a `display.figure` payload that the figure registry renders;
 * the prompt asks the question and nothing else. Data spelled out in the prompt
 * ("Each ● stands for 2. Cats: ●●●●.") turns a chart-reading item into a
 * sentence-parsing item, which is a different and easier skill.
 */

const { CONCEPTUAL, PROCEDURAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = ["readBar", "compareBars", "pictograph", "dataAnalysis"];

const CATEGORY_SETS = [
  ["Cats", "Dogs", "Birds", "Fish"],
  ["Red", "Blue", "Green", "Yellow"],
  ["Apples", "Pears", "Plums", "Grapes"],
  ["Bikes", "Cars", "Buses", "Vans"],
];

const CONTEXTS = [
  "Nia surveyed her class and made this graph.",
  "Theo counted what the school garden club brought in.",
  "Ava recorded this at the library table.",
  "Luca graphed what the after-school group chose.",
];

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function bandOf(level) {
  return level <= 3 ? 1 : level <= 6 ? 2 : 3;
}

/**
 * Four bars with DISTINCT values, so "most", "least" and every difference are
 * unambiguous and never zero.
 */
function makeBars(level) {
  const labels = pick(CATEGORY_SETS);
  const hi = level <= 3 ? 9 : level <= 6 ? 14 : 20;
  const values = new Set();
  while (values.size < labels.length) values.add(randInt(1, hi));
  const shuffled = shuffleArray([...values]);
  return labels.map((label, i) => ({ label, value: shuffled[i] }));
}

/** Two distinct bar indices. */
function twoBars(bars) {
  const i = randInt(0, bars.length - 1);
  let j = randInt(0, bars.length - 2);
  if (j >= i) j += 1;
  return [bars[i], bars[j]];
}

const VARIETIES = [
  // ---- band 1 --------------------------------------------------------------
  {
    id: "readBarSingle",
    bands: [1, 2],
    family: PROCEDURAL,
    subskills: ["readBar"],
    build(level) {
      const bars = makeBars(level);
      const target = pick(bars);
      return {
        answer: target.value,
        answerType: "barGraph",
        display: { type: "barGraph", figure: "barGraph", bars },
        promptText: `How many ${target.label}?`,
        representation: "barGraph",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["offByOne", "axisMisread"],
      };
    },
  },
  {
    id: "mostLeastIdentify",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["readBar"],
    build(level) {
      const bars = makeBars(level);
      const wantMost = Math.random() < 0.5;
      const target = bars.reduce((best, b) =>
        wantMost ? (b.value > best.value ? b : best) : b.value < best.value ? b : best
      );
      return {
        answer: target.label,
        answerType: "choice",
        choices: shuffleArray(bars.map((b) => b.label)),
        display: { type: "barGraph", figure: "barGraph", bars },
        promptText: `Which one was chosen the ${wantMost ? "most" : "fewest"}?`,
        representation: "barGraph",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["compareDirection"],
      };
    },
  },
  {
    id: "tallyRead",
    bands: [1, 2],
    family: PROCEDURAL,
    subskills: ["dataAnalysis"],
    build(level) {
      const labels = pick(CATEGORY_SETS);
      const counts = labels.slice(0, 2).map(() => randInt(3, level <= 3 ? 13 : 24));
      const idx = randInt(0, 1);
      return {
        answer: counts[idx],
        answerType: "numberPad",
        display: {
          figure: "tallyChart",
          rows: labels.slice(0, 2).map((label, i) => ({ label, count: counts[i] })),
        },
        promptText: `How many chose ${labels[idx]}?`,
        representation: "tallyChart",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["tallyFifthMiscount", "offByOne"],
      };
    },
  },
  {
    id: "pictographKey1",
    bands: [1],
    family: PROCEDURAL,
    subskills: ["pictograph"],
    build() {
      const labels = pick(CATEGORY_SETS);
      const counts = [randInt(2, 7), randInt(2, 7)];
      const idx = randInt(0, 1);
      return {
        answer: counts[idx],
        answerType: "numberPad",
        display: {
          figure: "pictograph",
          keyValue: 1,
          rows: labels.slice(0, 2).map((label, i) => ({ label, symbols: counts[i] })),
        },
        promptText: `How many ${labels[idx]}?`,
        representation: "pictograph",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["keyIgnored", "offByOne"],
      };
    },
  },

  // ---- band 2 --------------------------------------------------------------
  {
    id: "compareBarsAny",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["compareBars"],
    build(level) {
      const bars = makeBars(level);
      const [x, y] = twoBars(bars);
      const more = x.value >= y.value ? x : y;
      const less = x.value >= y.value ? y : x;
      return {
        answer: more.value - less.value,
        answerType: "barGraph",
        display: { type: "barGraph", figure: "barGraph", bars },
        promptText: `How many more ${more.label} than ${less.label}?`,
        representation: "barGraph",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["compareDirection", "offByOne"],
        distractorContext: { a: more.value, b: less.value },
      };
    },
  },
  {
    id: "compareFewer",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["compareBars"],
    build(level) {
      const bars = makeBars(level);
      const [x, y] = twoBars(bars);
      const more = x.value >= y.value ? x : y;
      const less = x.value >= y.value ? y : x;
      // Same arithmetic, opposite language — which is exactly where the
      // compare-direction error shows up.
      return {
        answer: more.value - less.value,
        answerType: "barGraph",
        display: { type: "barGraph", figure: "barGraph", bars },
        promptText: `How many fewer ${less.label} than ${more.label}?`,
        representation: "barGraph",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["compareDirection", "keywordTrap"],
        distractorContext: { a: more.value, b: less.value },
      };
    },
  },
  {
    id: "totalAcrossBars",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["dataAnalysis"],
    build(level) {
      const bars = makeBars(level);
      const [x, y] = twoBars(bars);
      return {
        answer: x.value + y.value,
        answerType: "barGraph",
        display: { type: "barGraph", figure: "barGraph", bars },
        promptText: `How many chose ${x.label} or ${y.label} altogether?`,
        representation: "barGraph",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["comparedInsteadOfTotalled", "operationSwap"],
        distractorContext: { a: x.value, b: y.value },
      };
    },
  },
  {
    id: "pictographKey2",
    bands: [2],
    family: CONCEPTUAL,
    subskills: ["pictograph"],
    build() {
      const labels = pick(CATEGORY_SETS);
      const symbols = [randInt(2, 6), randInt(2, 6)];
      const key = 2;
      const idx = randInt(0, 1);
      return {
        answer: symbols[idx] * key,
        answerType: "numberPad",
        display: {
          figure: "pictograph",
          keyValue: key,
          rows: labels.slice(0, 2).map((label, i) => ({ label, symbols: symbols[i] })),
        },
        promptText: `How many ${labels[idx]}?`,
        representation: "pictograph",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["keyIgnored", "wrongFactor"],
        distractorContext: { a: symbols[idx], b: key },
      };
    },
  },
  {
    id: "linePlotRead",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["dataAnalysis"],
    build() {
      const base = randInt(3, 6);
      const heights = [base, base + 1, base + 2, base + 3];
      const counts = heights.map(() => randInt(1, 5));
      const idx = randInt(0, heights.length - 1);
      return {
        answer: counts[idx],
        answerType: "numberPad",
        display: {
          figure: "linePlot",
          axisLabel: "Plant height (cm)",
          points: heights.map((value, i) => ({ value, count: counts[i] })),
        },
        promptText: `How many plants were ${heights[idx]} cm tall?`,
        representation: "linePlot",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["offByOne", "axisMisread"],
      };
    },
  },

  // ---- band 3 --------------------------------------------------------------
  {
    id: "totalSurveyed",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["dataAnalysis"],
    build(level) {
      const bars = makeBars(level);
      return {
        answer: bars.reduce((s, b) => s + b.value, 0),
        answerType: "barGraph",
        display: { type: "barGraph", figure: "barGraph", bars },
        promptText: "How many were counted in all?",
        representation: "barGraph",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["comparedInsteadOfTotalled", "offByOne"],
      };
    },
  },
  {
    id: "pictographKeyHalf",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["pictograph"],
    build() {
      const labels = pick(CATEGORY_SETS);
      // Even keys only, so a half symbol is still a whole number of votes.
      const key = pick([4, 6]);
      const whole = randInt(2, 5);
      const half = Math.random() < 0.7;
      return {
        answer: whole * key + (half ? key / 2 : 0),
        answerType: "numberPad",
        display: {
          figure: "pictograph",
          keyValue: key,
          rows: [{ label: labels[0], symbols: whole, half }],
        },
        promptText: `How many ${labels[0]}?`,
        representation: "pictograph",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["halfSymbolWhole", "keyIgnored", "wrongFactor"],
        distractorContext: { a: whole, b: key },
      };
    },
  },
  {
    id: "pictographCompare",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["pictograph"],
    build() {
      const labels = pick(CATEGORY_SETS);
      const key = pick([3, 4, 5]);
      const s1 = randInt(3, 7);
      let s2 = randInt(1, 6);
      if (s2 === s1) s2 = s1 - 1 || 1;
      const more = Math.max(s1, s2);
      const less = Math.min(s1, s2);
      const moreLabel = s1 >= s2 ? labels[0] : labels[1];
      const lessLabel = s1 >= s2 ? labels[1] : labels[0];
      return {
        answer: (more - less) * key,
        answerType: "numberPad",
        display: {
          figure: "pictograph",
          keyValue: key,
          rows: [
            { label: labels[0], symbols: s1 },
            { label: labels[1], symbols: s2 },
          ],
        },
        promptText: `How many more ${moreLabel} than ${lessLabel}?`,
        representation: "pictograph",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["keyIgnored", "compareDirection"],
        distractorContext: { a: more - less, b: key },
      };
    },
  },
  {
    id: "whichStatementTrue",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["dataAnalysis"],
    build(level) {
      const bars = makeBars(level);
      const [p, q] = twoBars(bars);
      const least = bars.reduce((b, c) => (c.value < b.value ? c : b));
      const most = bars.reduce((b, c) => (c.value > b.value ? c : b));
      const rest = bars.filter((b) => b !== p && b !== q);
      const claims = [
        { text: `More chose ${p.label} than ${q.label}`, truth: p.value > q.value },
        { text: `${least.label} was chosen the fewest`, truth: true },
        { text: `${most.label} was chosen the most`, truth: true },
        {
          text: `${rest[0].label} and ${rest[1].label} together are more than ${most.label}`,
          truth: rest[0].value + rest[1].value > most.value,
        },
        { text: `${q.label} and ${p.label} have the same count`, truth: p.value === q.value },
      ];
      const shown = shuffleArray(claims).slice(0, 4);
      // Never emit an unscoreable empty set (the two extreme claims are always
      // true), and never a set where selecting everything is correct — the
      // same-count claim is always false, because the bars are distinct.
      if (!shown.some((c) => c.truth)) shown[0] = claims[1];
      if (shown.every((c) => c.truth)) shown[shown.length - 1] = claims[4];
      const answer = shown.filter((c) => c.truth).map((c) => c.text);
      return {
        answer,
        answerType: "multiSelect",
        display: {
          type: "barGraph",
          figure: "barGraph",
          bars,
          options: shown.map((c) => c.text),
        },
        promptText: "Select every true statement.",
        representation: "barGraph",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["compareDirection", "comparedInsteadOfTotalled"],
      };
    },
  },
  {
    id: "linePlotSpread",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["dataAnalysis"],
    build() {
      const base = randInt(3, 6);
      const heights = [base, base + 1, base + 2, base + 3];
      // At least the two ends must be present or the range is not what the
      // labels suggest.
      const counts = heights.map((h, i) => (i === 0 || i === heights.length - 1 ? randInt(1, 4) : randInt(0, 4)));
      const present = heights.filter((h, i) => counts[i] > 0);
      return {
        answer: Math.max(...present) - Math.min(...present),
        answerType: "numberPad",
        display: {
          figure: "linePlot",
          axisLabel: "Plant height (cm)",
          points: heights.map((value, i) => ({ value, count: counts[i] })),
        },
        promptText: "What is the difference between the tallest and the shortest plant?",
        representation: "linePlot",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["compareDirection", "offByOne"],
        distractorContext: { a: Math.max(...present), b: Math.min(...present) },
      };
    },
  },
  {
    id: "errorAnalysisKey",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["pictograph"],
    build() {
      const labels = pick(CATEGORY_SETS);
      const key = pick([2, 5]);
      const symbols = randInt(3, 6);
      const actor = pick(["Mina", "Sam", "Theo", "Ava"]);
      return {
        answer: symbols * key,
        answerType: "numberPad",
        display: {
          figure: "pictograph",
          keyValue: key,
          rows: [{ label: labels[0], symbols }],
        },
        promptText: `${actor} says there are ${symbols}, one for each symbol. How many ${labels[0]} are there really?`,
        representation: "pictograph",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["keyIgnored", "wrongFactor"],
        distractorContext: { a: symbols, b: key },
      };
    },
  },
  {
    id: "surveyStory",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["dataAnalysis"],
    build(level) {
      const bars = makeBars(level);
      const [x, y] = twoBars(bars);
      const lead = pick(CONTEXTS);
      return {
        answer: x.value + y.value,
        answerType: "barGraph",
        display: { type: "barGraph", figure: "barGraph", bars },
        promptText: `${lead} How many chose ${x.label} or ${y.label} in all?`,
        representation: "barGraph",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["comparedInsteadOfTotalled", "operationSwap"],
        distractorContext: { a: x.value, b: y.value },
      };
    },
  },
];

export const DATA_GRAPH_VARIETIES = VARIETIES.map((v) => v.id);

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
  id: "dataGraphs",
  label: "Graph Reader!",
  shortLabel: "Graphs",
  description: "Read bar graphs, pictographs, tallies and line plots.",
  icon: "ChartColumn",
  op: "graph",
  subskills: SUBSKILLS,
  // A graph read carries no `a op b = answer` relation to re-present.
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varieties: DATA_GRAPH_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: "graph",
      answer: built.answer,
      answerType: built.answerType,
      level,
      display: { ...(built.display || {}), promptText: built.promptText },
    };
    if (built.choices) question.choices = built.choices;
    if (built.distractorContext) question.distractorContext = built.distractorContext;

    question.metadata = createQuestionMetadata({
      modeId: "dataGraphs",
      level,
      domain: "MD",
      cluster: "Represent and interpret data",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP4", "MP6"],
      standardRefs: ["2.MD", "3.MD"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `dataGraphs-${itemFamily}-${variety.id}`,
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
      ...(question?.distractorContext || {}),
    });
  },
};
