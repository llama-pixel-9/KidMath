#!/usr/bin/env node
/**
 * Build the linesShapes bank via the shared assembler (bankAssembler.js).
 * Table-checkable claims (sides/vertices/symmetry/right angles/parallel
 * pairs/diagonals/endpoints) are re-derived from SHAPE_TABLE; select items
 * verify the option set against the predicate; authored claims still get
 * judged-consistency and choice-sanity checks.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorLinesShapes.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorLinesShapes.js --write --tag b0821
 */

import { shapeSidesProcedural, shapeSidesConceptual, symmetryProcedural, symmetryConceptual, shapePropertiesProcedural, shapePropertiesConceptual, SHAPE_TABLE, byKey, byName } from "./linesShapesTemplates.js";
import { classificationProcedural, classificationConceptual, lineFiguresProcedural, lineFiguresConceptual } from "./linesShapesTemplates2.js";
import { buildStoryItems } from "./linesShapesStories.js";
import { runAssembler } from "./bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const ENDPOINTS = { "line segment": 2, ray: 1, line: 0 };
const DIAG = (n) => (n * (n - 3)) / 2;

function expectedFromShapeC(c, q, d) {
  switch (c.kind) {
    case "sides":
      return byKey(c.key).sides;
    case "vertices":
      return byKey(c.key).vertices;
    case "symmetry": {
      const s = byKey(c.key);
      return s.askSymmetry === false ? undefined : s.symmetry;
    }
    case "sidesByName":
      return byName(c.name)?.sides;
    case "verticesByName":
      return byName(c.name)?.vertices;
    case "symmetryByName": {
      const s = byName(c.name);
      if (!s) return c.name === "circle" ? null : undefined;
      return s.symmetry;
    }
    case "rightAnglesByName":
      return byName(c.name)?.rightAngles;
    case "parallelPairsByName":
      return byName(c.name)?.parallelPairs;
    case "diagonals":
      return byName(c.name) ? DIAG(byName(c.name).sides) : undefined;
    case "propSaid": {
      const s = byName(c.name);
      if (!s) return undefined;
      return c.said === (c.prop === "sides" ? s.sides : s.vertices) ? "Yes" : "No";
    }
    case "sideVertexEq": {
      const s = byName(c.name);
      return s && s.sides === s.vertices ? "Yes" : undefined;
    }
    case "moreSides": {
      const a = byName(c.a);
      const b = byName(c.b);
      return a.sides === b.sides ? undefined : `the ${a.sides > b.sides ? c.a : c.b}`;
    }
    case "symSaid": {
      const s = byName(c.name);
      return s ? (c.said === s.symmetry ? "Yes" : "No") : undefined;
    }
    case "moreSym": {
      const a = byName(c.a);
      const b = byName(c.b);
      return a.symmetry === b.symmetry ? undefined : `the ${a.symmetry > b.symmetry ? c.a : c.b}`;
    }
    case "rightSaid":
      return c.said === byName(c.name).rightAngles ? "Yes" : "No";
    case "parallelSaid":
      return c.said === byName(c.name).parallelPairs ? "Yes" : "No";
    case "diagSaid": {
      const s = byName(c.name);
      return c.said === (s.sides * (s.sides - 3)) / 2 ? "Yes" : "No";
    }
    case "fewestSym": {
      const trio = c.names.map((n) => [n, byName(n).symmetry]);
      const min = Math.min(...trio.map((t) => t[1]));
      return trio.filter((t) => t[1] === min).length === 1 ? `the ${trio.find((t) => t[1] === min)[0]}` : undefined;
    }
    case "endpoints":
      return ENDPOINTS[c.figure];
    case "endpointsSaid":
      return c.said === ENDPOINTS[c.figure] ? "Yes" : "No";
    case "select": {
      // Exactly one option satisfies the predicate, at the declared index.
      const matches = c.optionKeys.map((k) => {
        const s = byKey(k);
        if (c.predicate.type === "isName") {
          if (c.predicate.name === "triangle") return s.sides === 3;
          return s.name === c.predicate.name;
        }
        // notSides: the odd one out is the option NOT matching the side count.
        return s.sides !== c.predicate.sides;
      });
      const hits = matches.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
      return hits.length === 1 ? hits[0] : undefined;
    }
    case "authored":
    case "authoredChoice":
    case "authoredCount":
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
  if (d.shapeMode === "select") {
    if (!Array.isArray(d.options) || d.options.length !== 4) problems.push("select needs exactly 4 options");
    else if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3)) problems.push("select answer must be an option index");
  }
  if (d.shapeMode === "count" && !byKey(d.shape)) problems.push(`unknown drawn shape "${d.shape}"`);

  const c = d.shapeC;
  if (c) {
    const expected = expectedFromShapeC(c, q, d);
    if (expected === undefined) problems.push(`bad shape claim "${c.kind}" (${JSON.stringify(c).slice(0, 60)})`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`shape claim "${c.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  } else if (!d.counting) {
    problems.push("linesShapes item missing display.shapeC or counting claim");
  }

  return problems;
}

await runAssembler({
  modeId: "linesShapes",
  subskills: ["shapeSides", "symmetryLines", "shapeProperties", "shapeClassification", "lineFigures"],
  rawItems: [
    ...shapeSidesProcedural(),
    ...shapeSidesConceptual(),
    ...symmetryProcedural(),
    ...symmetryConceptual(),
    ...shapePropertiesProcedural(),
    ...shapePropertiesConceptual(),
    ...classificationProcedural(),
    ...classificationConceptual(),
    ...lineFiguresProcedural(),
    ...lineFiguresConceptual(),
    ...buildStoryItems(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
