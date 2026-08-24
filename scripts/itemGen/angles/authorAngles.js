#!/usr/bin/env node
/**
 * Build the angles bank via the shared assembler. Every item carries a
 * display.ang claim this file re-derives — degree-free band-1 items still
 * carry their degree math in the claim (divTurn, sumUnits, missDeg).
 * Judged items must agree with display.truth.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorAngles.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorAngles.js --write --tag b0821
 */

import { classifyProcedural, classifyConceptual, measureProcedural, measureConceptual, classOf } from "./anglesTemplates.js";
import { angleSumProcedural, angleSumConceptual, missingProcedural, missingConceptual } from "./anglesTemplates2.js";
import { anglesStories } from "./anglesStories.js";
import { runAssembler } from "../bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const REL_CLASS = { less: "acute", equal: "right", more: "obtuse", straight: "straight" };

function expectedFromAng(c) {
  switch (c.kind) {
    case "classify":
      return classOf(c.deg);
    case "classifyRel":
      return REL_CLASS[c.rel];
    case "relSaid":
      return REL_CLASS[c.rel] === c.said ? "Yes" : "No";
    case "classSaid":
      return classOf(c.deg) === c.said ? "Yes" : "No";
    case "rangePick":
      return null; // verified via choices below
    case "cmpRight":
      return c.deg === 90 ? undefined : c.deg < 90 ? "smaller" : "bigger";
    case "divTurn":
      return c.whole % c.unit === 0 ? c.whole / c.unit : undefined;
    case "benchDeg":
      return c.d;
    case "halfDeg":
      return c.of % 2 === 0 ? c.of / 2 : undefined;
    case "sumDeg":
      return c.a + c.b;
    case "sumDeg3":
      return c.a + c.b + c.c;
    case "sumUnits":
      return c.a + c.b;
    case "missDeg":
      // Handled in extraProblems (unit-count vs degree answers); unreachable here.
      return null;
    case "missDeg3":
      return c.total - c.a - c.b > 0 ? c.total - c.a - c.b : undefined;
    case "sumSaid":
      return c.a + c.b === c.said ? "Yes" : "No";
    case "sumUnitsSaid":
      return c.a + c.b === c.said ? "Yes" : "No";
    case "missSaid":
      return c.total - c.a === c.said ? "Yes" : "No";
    case "missUnitsSaid":
      return c.whole - c.have === c.said ? "Yes" : "No";
    case "pairSaid":
      return c.a + c.b === c.total ? "Yes" : "No";
    case "partFits":
      return c.a > 0 && c.a < c.total ? "Yes" : "No";
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

  const c = d.ang;
  if (!c) problems.push("missing display.ang claim");
  else if (c.kind === "rangePick") {
    const good = Number(q.answer);
    if (classOf(good) !== c.want) problems.push(`rangePick answer ${good} is not ${c.want}`);
    const others = q.choices.map(Number).filter((x) => x !== good);
    if (!others.every((x) => classOf(x) !== c.want)) problems.push("rangePick has a second valid choice");
  } else if (c.kind === "missDeg") {
    // Unit-count answers (band 1) divide the degree gap by the unit; degree
    // answers use the gap directly.
    const gap = c.total - c.a;
    if (gap <= 0) problems.push("missDeg gap not positive");
    else {
      const expected = c.unit ? gap / c.unit : gap;
      const alt = gap / 90;
      const match =
        String(expected) === String(q.answer) ||
        (c.total === 360 && c.a % 90 === 0 && String(alt) === String(q.answer)) ||
        (c.total === 180 && c.a === 90 && String(1) === String(q.answer)) ||
        (c.total === 360 && c.a === 180 && String(1) === String(q.answer));
      if (!match) problems.push(`missDeg gives ${expected} but answer is ${q.answer}`);
    }
  } else {
    const expected = expectedFromAng(c);
    if (expected === undefined) problems.push(`bad ang claim "${c.kind}"`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`ang claim "${c.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  }

  return problems;
}

await runAssembler({
  modeId: "angles",
  subskills: ["measureAngle", "angleSum", "classifyAngle", "missingAngle"],
  rawItems: [
    ...classifyProcedural(),
    ...classifyConceptual(),
    ...measureProcedural(),
    ...measureConceptual(),
    ...angleSumProcedural(),
    ...angleSumConceptual(),
    ...missingProcedural(),
    ...missingConceptual(),
    ...anglesStories(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
