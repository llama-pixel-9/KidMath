#!/usr/bin/env node
/**
 * Build the decimals bank via the shared assembler (bankAssembler.js).
 * Typed answers are decimal numbers (answerType "decimal"); every item
 * carries a display.dec claim this file re-derives with exact 2-place
 * rounding. Judged items must agree with display.truth.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorDecimals.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorDecimals.js --write --tag b0821
 */

import { tenthsProcedural, tenthsConceptual, fracToDecProcedural, fracToDecConceptual } from "./decimalsTemplates.js";
import { compareProcedural, compareConceptual, asNumberProcedural, asNumberConceptual } from "./decimalsTemplates2.js";
import { decimalsStories } from "./decimalsStories.js";
import { runAssembler } from "./bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const D2 = (x) => Number(x.toFixed(2));
const near = (a, b) => Math.abs(a - b) < 1e-9;

function expectedFromDec(c) {
  switch (c.kind) {
    case "tenths":
      return D2(c.n / 10);
    case "hundredths":
      return D2(c.t / 10 + c.h / 100);
    case "compose":
      return D2(c.w + c.t / 10 + c.h / 100);
    case "gridShade":
      return D2(c.h / 100);
    case "jumpsDec":
      return c.n;
    case "asHundredths":
      return c.t * 10 + c.h;
    case "asHundredthsAll":
      return c.w * 100 + c.t * 10 + c.h;
    case "fromFraction":
      return D2(c.n / c.d);
    case "toFraction":
      return `${c.n}/${c.d}`;
    case "cmpDec":
      return c.a > c.b ? ">" : c.a < c.b ? "<" : "=";
    case "cmpPickDec": {
      if (c.a === c.b) return undefined;
      const winner = c.a > c.b ? c.a : c.b;
      const label = (c.labels || []).find((l) => near(Number(l), winner));
      return label === undefined ? undefined : label;
    }
    case "minPickDec": {
      const vals = (c.labels || []).map(Number);
      const min = Math.min(...vals);
      return c.labels[vals.findIndex((v) => near(v, min))];
    }
    case "cmpSaidDec": {
      const want = c.a > c.b ? ">" : c.a < c.b ? "<" : "=";
      return want === c.rel ? "Yes" : "No";
    }
    case "countOnDec":
      return D2(c.start + c.step * c.k);
    case "tickDec":
      return D2(c.k / c.den);
    case "addDec":
      return D2(c.a + c.b);
    case "closerDec":
      return near(c.v, 0.5) ? undefined : c.v < 0.5 ? "0" : "1";
    case "betweenSaid":
      return c.v > 0 && c.v < 1 ? "Yes" : "No";
    case "beyondSaidDec":
      return c.v > 1 ? "Yes" : "No";
    case "shadeSaid":
      return near(Number(c.said), D2(c.n / c.den)) ? "Yes" : "No";
    case "fracSaid":
      return near(Number(c.said), D2(c.n / c.d)) ? "Yes" : "No";
    case "halfSaid":
      return near(c.v, 0.5) ? "Yes" : "No";
    case "trapNo":
      return "No";
    case "authored":
      return null;
    default:
      return undefined;
  }
}

// digitOf: band1 stores [0, n] (tenths only); band2 stores [t, h].
function digitExpected(c) {
  if (c.kind === "digitOf") {
    if (c.place === "tenths") return c.digits[0] === 0 ? c.digits[1] : c.digits[0];
    if (c.place === "hundredths") return c.digits[1];
    return undefined;
  }
  if (c.kind === "digitOf3") {
    const [w, t, h] = c.digits;
    return c.place === "ones" ? w : c.place === "tenths" ? t : c.place === "hundredths" ? h : undefined;
  }
  return undefined;
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

  const c = d.dec;
  if (!c) problems.push("missing display.dec claim");
  else {
    const expected = c.kind === "digitOf" || c.kind === "digitOf3" ? digitExpected(c) : expectedFromDec(c);
    if (expected === undefined) problems.push(`bad dec claim "${c.kind}"`);
    else if (expected !== null) {
      const match =
        typeof expected === "number" && typeof q.answer === "number"
          ? Math.abs(expected - q.answer) < 1e-9
          : String(expected) === String(q.answer);
      if (!match) problems.push(`dec claim "${c.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  }

  return problems;
}

await runAssembler({
  modeId: "decimals",
  subskills: ["tenthsHundredths", "compareDecimals", "fractionToDecimal", "decimalAsNumber"],
  rawItems: [
    ...tenthsProcedural(),
    ...tenthsConceptual(),
    ...fracToDecProcedural(),
    ...fracToDecConceptual(),
    ...compareProcedural(),
    ...compareConceptual(),
    ...asNumberProcedural(),
    ...asNumberConceptual(),
    ...decimalsStories(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
