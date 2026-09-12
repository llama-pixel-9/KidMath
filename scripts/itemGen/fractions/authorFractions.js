#!/usr/bin/env node
/**
 * Build the fractions bank via the shared assembler (bankAssembler.js).
 * Every item carries a display.frac claim that THIS file re-derives —
 * fraction answers are strings ("3/4"), typed answers are integers, and
 * judged items must agree with display.truth.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorFractions.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorFractions.js --write --tag b0821
 */

import {
  partWholeProcedural, partWholeConceptual,
  fractionAsNumberProcedural, fractionAsNumberConceptual,
  equivalenceProcedural, equivalenceConceptual,
} from "./fractionsTemplates.js";
import {
  compareProcedural, compareConceptual,
  addLikeProcedural, addLikeConceptual,
  ofSetProcedural, ofSetConceptual,
} from "./fractionsTemplates2.js";
import {
  partWholeExtraProcedural, fractionAsNumberExtraProcedural,
  equivalenceExtraProcedural, compareExtraProcedural,
  addLikeExtraProcedural, ofSetExtraProcedural,
} from "./fractionsTemplates3.js";
import { fractionsStories } from "./fractionsStories.js";
import { runAssembler } from "../bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const F = (n, d) => `${n}/${d}`;
const intDiv = (a, b) => (b !== 0 && a % b === 0 ? a / b : undefined);

function expectedFromFrac(c) {
  switch (c.kind) {
    case "name":
      return F(c.n, c.d);
    case "complement":
      return c.n < c.d ? F(c.d - c.n, c.d) : undefined;
    case "unitCount":
      return c.d;
    case "jumps":
      return c.n;
    case "numOf":
      return c.n;
    case "denOf":
      return c.d;
    case "equivNum":
      return intDiv(c.a * c.d2, c.b);
    case "equivDen":
      return intDiv(c.c * c.b, c.a);
    case "equivFracPick": {
      const num = intDiv(c.a * c.d2, c.b);
      return num === undefined ? undefined : F(num, c.d2);
    }
    case "simplifyDen":
      return intDiv(c.b, c.a);
    case "cmp": {
      const l = c.a * c.d;
      const r = c.c * c.b;
      return l > r ? ">" : l < r ? "<" : "=";
    }
    case "halfCmp": {
      const t = c.a * 2 - c.b;
      return t < 0 ? "less than 1/2" : t === 0 ? "equal to 1/2" : "greater than 1/2";
    }
    case "cmpPick": {
      const l = c.a * c.d;
      const r = c.c * c.b;
      return l === r ? undefined : l > r ? F(c.a, c.b) : F(c.c, c.d);
    }
    case "minPick":
      return F(Math.min(...c.ns), c.d);
    case "addLike":
      return F(c.a + c.b, c.d);
    case "addLike3":
      return F(c.a + c.b + c.c, c.d);
    case "subLike":
      return c.a > c.b ? F(c.a - c.b, c.d) : undefined;
    case "missingAddend":
      return c.s > c.a ? c.s - c.a : undefined;
    case "sumSaid":
      return c.a + c.b === c.saidN ? "Yes" : "No";
    case "ofSet":
      return intDiv(c.w, c.d) === undefined ? undefined : (c.w / c.d) * c.n;
    case "ofSetSaid":
      return intDiv(c.w, c.d) === undefined ? undefined : (c.said === (c.w / c.d) * c.n ? "Yes" : "No");
    case "keepRest":
      return intDiv(c.w, c.d) === undefined ? undefined : c.w - c.w / c.d;
    case "wholeFromUnit":
      return c.d * c.part;
    case "nameSaid":
      return c.said === F(c.n, c.d) ? "Yes" : "No";
    case "wholeSaid":
      return c.n === c.d ? "Yes" : "No";
    case "beyondSaid":
      return c.n > c.d ? "Yes" : "No";
    case "equivSaid":
      return c.a * c.d === c.c * c.b ? "Yes" : "No";
    case "equivPick":
      return c.a * c.d === c.c * c.b ? F(c.c, c.d) : undefined;
    case "closerEnd":
      return c.n * 2 === c.d ? undefined : c.n * 2 < c.d ? "0" : "1";
    case "trapNo":
      return "No";
    case "authored":
    case "biggerShare":
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
  if (!Array.isArray(q.choices) && typeof q.answer === "number" && !Number.isInteger(q.answer)) {
    problems.push(`non-integer typed answer ${q.answer}`);
  }

  const c = d.frac;
  if (!c) problems.push("missing display.frac claim");
  else {
    const expected = expectedFromFrac(c);
    if (expected === undefined) problems.push(`bad frac claim "${c.kind}"`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`frac claim "${c.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  }

  return problems;
}

await runAssembler({
  modeId: "fractions",
  subskills: ["partWhole", "fractionAsNumber", "equivalence", "compareFractions", "addLikeDenominators", "fractionOfSet"],
  rawItems: [
    ...partWholeProcedural(),
    ...partWholeExtraProcedural(),
    ...partWholeConceptual(),
    ...fractionAsNumberProcedural(),
    ...fractionAsNumberExtraProcedural(),
    ...fractionAsNumberConceptual(),
    ...equivalenceProcedural(),
    ...equivalenceExtraProcedural(),
    ...equivalenceConceptual(),
    ...compareProcedural(),
    ...compareExtraProcedural(),
    ...compareConceptual(),
    ...addLikeProcedural(),
    ...addLikeExtraProcedural(),
    ...addLikeConceptual(),
    ...ofSetProcedural(),
    ...ofSetExtraProcedural(),
    ...ofSetConceptual(),
    ...fractionsStories(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
