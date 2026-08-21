#!/usr/bin/env node
/**
 * Build the barModels bank via the shared assembler (bankAssembler.js).
 * Additive work rides countMath claims; bar-specific relations carry
 * display.bar claims ({unitOf}, {fracOf}, {timesOf}, judged saids) that
 * THIS file re-derives. barPartWhole payloads must satisfy part < whole
 * and answer = whole - part.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorBarModels.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorBarModels.js --write --tag b0821
 */

import { partWholeProcedural, partWholeConceptual, comparisonProcedural, comparisonConceptual } from "./barModelsTemplates.js";
import { multiplicativeProcedural, multiplicativeConceptual, fractionBarProcedural, fractionBarConceptual } from "./barModelsTemplates2.js";
import { buildStoryItems } from "./barModelsStories.js";
import { runAssembler } from "./bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

function expectedFromBar(c) {
  switch (c.kind) {
    case "unitOf":
      return c.w % c.k === 0 ? c.w / c.k : undefined;
    case "unitCount":
      return c.w % c.u === 0 ? c.w / c.u : undefined;
    case "fracOf":
      return c.w % c.den === 0 ? (c.w / c.den) * c.num : undefined;
    case "timesOf":
      return c.k * c.u;
    case "fewerOf":
      return c.a - c.d;
    case "wholeSaid":
      return c.a + c.b === c.w ? "Yes" : "No";
    case "threeSaid":
      return c.a + c.b + c.c === c.w ? "Yes" : "No";
    case "diffSaid":
      return c.said === c.a - c.b ? "Yes" : "No";
    case "equalSaid":
      return c.k * c.u === c.w ? "Yes" : "No";
    case "fracSaid":
      return c.said === (c.w / c.den) * c.num ? "Yes" : "No";
    case "eqPick":
      return `${c.w} - ${c.p}`;
    case "biggerPiece":
    case "authoredChoice":
      return null;
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
  if (d.type === "barPartWhole") {
    if (!(Number.isInteger(d.whole) && Number.isInteger(d.part) && d.part > 0 && d.part < d.whole)) {
      problems.push(`bad barPartWhole payload ${d.whole}/${d.part}`);
    } else if (q.answer !== d.whole - d.part) {
      problems.push(`barPartWhole answer ${q.answer} != ${d.whole} - ${d.part}`);
    }
  }

  const c = d.bar;
  if (c) {
    const expected = expectedFromBar(c);
    if (expected === undefined) problems.push(`bad bar claim "${c.kind}"`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`bar claim "${c.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  }

  return problems;
}

await runAssembler({
  modeId: "barModels",
  subskills: ["partWhole", "comparison", "multiplicative", "fractionBar"],
  rawItems: [
    ...partWholeProcedural(),
    ...partWholeConceptual(),
    ...comparisonProcedural(),
    ...comparisonConceptual(),
    ...multiplicativeProcedural(),
    ...multiplicativeConceptual(),
    ...fractionBarProcedural(),
    ...fractionBarConceptual(),
    ...buildStoryItems(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
