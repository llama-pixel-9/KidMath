#!/usr/bin/env node
/**
 * Build the dataGraphs bank via the shared assembler (bankAssembler.js).
 * Every answer must agree with the drawn data: THIS file re-derives each
 * display.data claim from display.bars / rows / keyValue, so a graph can
 * never disagree with its question.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorDataGraphs.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorDataGraphs.js --write --tag b0821
 */

import { readBarProcedural, readBarConceptual, compareBarsProcedural, compareBarsConceptual, pictographProcedural, pictographConceptual, dataAnalysisProcedural, dataAnalysisConceptual } from "./dataGraphsTemplates.js";
import { buildStoryItems } from "./dataGraphsStories.js";
import { runAssembler } from "./bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const val = (bars, label) => bars.find((b) => b.label === label)?.value;

function expectedFromData(data, d) {
  const bars = d.bars || [];
  const values = bars.map((b) => b.value);
  switch (data.kind) {
    case "barRead":
      return val(bars, data.label);
    case "barMaxValue":
      return Math.max(...values);
    case "barMinValue":
      return Math.min(...values);
    case "barMax":
      return bars.reduce((b, x) => (x.value > b.value ? x : b)).label;
    case "barMin":
      return bars.reduce((b, x) => (x.value < b.value ? x : b)).label;
    case "barSecondMax":
      return [...bars].sort((x, y) => y.value - x.value)[1].label;
    case "barReadSaid":
      return data.said === val(bars, data.label) ? "Yes" : "No";
    case "barDiff":
      return val(bars, data.a) - val(bars, data.b);
    case "barSum":
      return val(bars, data.a) + val(bars, data.b);
    case "barCmpSaid":
      return val(bars, data.a) > val(bars, data.b) ? "Yes" : "No";
    case "barCmpPick":
      return val(bars, data.a) > val(bars, data.b) ? data.a : data.b;
    case "barDiffSaid":
      return data.said === val(bars, data.a) - val(bars, data.b) ? "Yes" : "No";
    case "pairBeats":
      return val(bars, data.a) + val(bars, data.b) > val(bars, data.c) ? "Yes" : "No";
    case "barTotal":
      return values.reduce((s, v) => s + v, 0);
    case "barTotalSkip":
      return values.reduce((s, v) => s + v, 0) - val(bars, data.skip);
    case "barTotalSaid":
      return data.said === values.reduce((s, v) => s + v, 0) ? "Yes" : "No";
    case "barRange":
      return Math.max(...values) - Math.min(...values);
    case "barGoalGap":
      return data.goal - val(bars, data.label);
    case "truePickMax":
      return `${bars.reduce((b, x) => (x.value > b.value ? x : b)).label} got the most`;
    case "claimMax":
      return bars.reduce((b, x) => (x.value > b.value ? x : b)).label === data.label ? "Yes" : null;
    case "claimMin":
      return bars.reduce((b, x) => (x.value < b.value ? x : b)).label === data.label ? "Yes" : null;
    case "claimMaxFalse":
      return bars.reduce((b, x) => (x.value > b.value ? x : b)).label !== data.label ? "No" : null;
    case "claimMinFalse":
      return bars.reduce((b, x) => (x.value < b.value ? x : b)).label !== data.label ? "No" : null;
    case "truePickMin":
      return `${bars.reduce((b, x) => (x.value < b.value ? x : b)).label} got the fewest`;
    case "tallyDiff":
      return d.rows.find((r) => r.label === data.a).count - d.rows.find((r) => r.label === data.b).count;
    case "tallyRead":
      return d.rows.find((r) => r.label === data.label)?.count;
    case "tallyTotal":
      return d.rows.reduce((s, r) => s + r.count, 0);
    case "pictoRead":
      return (d.rows.find((r) => r.label === data.label)?.symbols ?? NaN) * d.keyValue;
    case "pictoRead2":
      return data.sym * data.key;
    case "pictoSymbols":
      return data.n % data.key === 0 ? data.n / data.key : undefined;
    case "pictoBothRows":
      return d.rows[0].symbols + d.rows[1].symbols;
    case "pictoTotal2":
      return (data.s1 + data.s2) * data.key;
    case "pictoSaid":
      return data.said === data.sym * data.key ? "Yes" : "No";
    case "pictoRowMore":
      return d.rows[0].symbols === d.rows[1].symbols ? undefined : d.rows.reduce((b, r) => (r.symbols > b.symbols ? r : b)).label;
    case "keyIgnored":
      return "No";
    case "halfSymbol":
      return data.key % 2 === 0 ? "Yes" : undefined;
    case "whichKey":
      return data.total % data.sym === 0 ? data.total / data.sym : undefined;
    default:
      return undefined;
  }
}

function extraProblems(item) {
  const q = item.question;
  const d = q.display || {};
  const problems = [];

  if (Array.isArray(q.choices) && (q.answer === "Yes" || q.answer === "No")) {
    if (typeof d.truth !== "boolean") problems.push("judged item missing display.truth");
    else if ((q.answer === "Yes") !== d.truth) problems.push("judged answer disagrees with truth");
  }
  if (Array.isArray(q.choices)) {
    if (!q.choices.map(String).includes(String(q.answer))) problems.push("answer missing from choices");
    if (new Set(q.choices.map(String)).size !== q.choices.length) problems.push("duplicate choices");
  }
  if (Array.isArray(d.bars)) {
    if (d.bars.length !== 4) problems.push("bar graph must draw 4 bars");
    if (new Set(d.bars.map((b) => b.value)).size !== d.bars.length) problems.push("bar values must be distinct");
    if (d.bars.some((b) => !(Number.isInteger(b.value) && b.value >= 1))) problems.push("bar values must be positive integers");
  }

  const data = d.data;
  if (data) {
    const expected = expectedFromData(data, d);
    if (expected === undefined) problems.push(`bad data claim "${data.kind}"`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`data claim "${data.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  } else if (Array.isArray(d.bars) || d.figure) {
    problems.push("graph item missing display.data claim");
  }

  return problems;
}

await runAssembler({
  modeId: "dataGraphs",
  subskills: ["readBar", "compareBars", "pictograph", "dataAnalysis"],
  rawItems: [
    ...readBarProcedural(),
    ...readBarConceptual(),
    ...compareBarsProcedural(),
    ...compareBarsConceptual(),
    ...pictographProcedural(),
    ...pictographConceptual(),
    ...dataAnalysisProcedural(),
    ...dataAnalysisConceptual(),
    ...buildStoryItems(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
