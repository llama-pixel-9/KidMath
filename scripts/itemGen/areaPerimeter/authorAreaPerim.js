#!/usr/bin/env node
/**
 * Build the areaPerimeter bank via the shared assembler. Every item carries
 * a display.ap claim this file re-derives (rectangle arithmetic, composite
 * joins/cuts, missing sides). Judged items must agree with display.truth.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorAreaPerim.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorAreaPerim.js --write --tag b0821
 */

import { areaProcedural, areaConceptual, perimeterProcedural, perimeterConceptual } from "./areaPerimTemplates.js";
import { compositeProcedural, compositeConceptual, measureProcedural, measureConceptual } from "./areaPerimTemplates2.js";
import { areaPerimStories } from "./areaPerimStories.js";
import { runAssembler } from "../bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

function expectedFromAp(c) {
  switch (c.kind) {
    case "areaOf":
      return c.w * c.h;
    case "perimOf":
      return 2 * (c.w + c.h);
    case "missSidePerim":
      return c.p / 2 - c.w > 0 && Number.isInteger(c.p / 2) ? c.p / 2 - c.w : undefined;
    case "joinAreas":
      return c.a * c.b + c.c * c.d;
    case "cutArea":
      return c.w < c.W && c.h < c.H ? c.W * c.H - c.w * c.h : undefined;
    case "missingPart":
      return c.T - c.a * c.b > 0 ? c.T - c.a * c.b : undefined;
    case "areaSaid":
      return c.w * c.h === c.said ? "Yes" : "No";
    case "perimSaid":
      return 2 * (c.w + c.h) === c.said ? "Yes" : "No";
    case "joinSaid":
      return c.a * c.b + c.c * c.d === c.said ? "Yes" : "No";
    case "samePerimSaid":
      return 2 * (c.w + c.h) === 4 * c.s && c.w * c.h !== c.s * c.s ? "Yes" : "No";
    case "trapNo":
      return "No";
    case "authoredYes":
      return "Yes";
    case "authored":
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
    if (q.choices.length < 2) problems.push("fewer than 2 choices");
  }

  const c = d.ap;
  if (!c) problems.push("missing display.ap claim");
  else {
    const expected = expectedFromAp(c);
    if (expected === undefined) problems.push(`bad ap claim "${c.kind}"`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`ap claim "${c.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  }

  return problems;
}

await runAssembler({
  modeId: "areaPerimeter",
  subskills: ["area", "perimeter", "compositeFigures", "measureReasoning"],
  rawItems: [
    ...areaProcedural(),
    ...areaConceptual(),
    ...perimeterProcedural(),
    ...perimeterConceptual(),
    ...compositeProcedural(),
    ...compositeConceptual(),
    ...measureProcedural(),
    ...measureConceptual(),
    ...areaPerimStories(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
