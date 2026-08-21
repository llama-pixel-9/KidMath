#!/usr/bin/env node
/**
 * Build the factorsMultiples bank via the shared assembler. Every item
 * carries a display.fm claim this file re-derives (divisibility, primality,
 * gcd/lcm). Pick claims verify the answer AND that no other choice
 * satisfies the property. Judged items must agree with display.truth.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorFactors.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorFactors.js --write --tag b0821
 */

import { factorCountProcedural, factorCountConceptual, nthMultipleProcedural, nthMultipleConceptual, factorsOf, isPrime } from "./factorsTemplates.js";
import { factorPairsProcedural, factorPairsConceptual, primesProcedural, primesConceptual } from "./factorsTemplates2.js";
import { factorsStories } from "./factorsStories.js";
import { runAssembler } from "./bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function expectedFromFm(c, q) {
  switch (c.kind) {
    case "factorCount":
      return factorsOf(c.n).length;
    case "pairFor":
      return c.n % c.a === 0 ? c.n / c.a : undefined;
    case "pairCount":
      return factorsOf(c.n).filter((f) => f * f <= c.n).length;
    case "nthMult":
      return c.b * c.k;
    case "nextMult":
      return c.m % c.b === 0 ? c.m + c.b : undefined;
    case "lcmOf":
      return (c.a * c.b) / gcd(c.a, c.b);
    case "gcfOf":
      return gcd(c.a, c.b);
    case "isFactor":
      return c.n % c.k === 0 ? "Yes" : "No";
    case "isMultiple":
      return c.k % c.b === 0 ? "Yes" : "No";
    case "nthSaid":
      return c.b * c.k === c.said ? "Yes" : "No";
    case "pairSaid":
      return c.a * c.b === c.n ? "Yes" : "No";
    case "primeSaid":
      return isPrime(c.n) ? "Yes" : "No";
    case "classify":
      return isPrime(c.n) ? "prime" : "composite";
    case "pickFactor": {
      const good = Number(q.answer);
      if (c.n % good !== 0) return undefined;
      const others = q.choices.map(Number).filter((x) => x !== good);
      return others.every((x) => c.n % x !== 0) ? good : undefined;
    }
    case "pickNonFactor": {
      const good = Number(q.answer);
      if (c.n % good === 0) return undefined;
      const others = q.choices.map(Number).filter((x) => x !== good);
      return others.every((x) => c.n % x === 0) ? good : undefined;
    }
    case "pickMultiple": {
      const good = Number(q.answer);
      if (good % c.b !== 0) return undefined;
      const others = q.choices.map(Number).filter((x) => x !== good);
      return others.every((x) => x % c.b !== 0) ? good : undefined;
    }
    case "pairPick": {
      const parse = (s) => String(s).split(" x ").map(Number);
      const [ga, gb] = parse(q.answer);
      if (ga * gb !== c.n) return undefined;
      const others = q.choices.filter((s) => s !== q.answer).map(parse);
      return others.every(([x, y]) => x * y !== c.n) ? q.answer : undefined;
    }
    case "primePick": {
      const good = Number(q.answer);
      if (!isPrime(good)) return undefined;
      const others = q.choices.map(Number).filter((x) => x !== good);
      return others.every((x) => !isPrime(x)) ? good : undefined;
    }
    case "trapNo":
      return "No";
    case "authoredYes":
      return "Yes";
    case "authored":
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

  const c = d.fm;
  if (!c) problems.push("missing display.fm claim");
  else {
    const expected = expectedFromFm(c, q);
    if (expected === undefined) problems.push(`bad fm claim "${c.kind}"`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`fm claim "${c.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  }

  return problems;
}

await runAssembler({
  modeId: "factorsMultiples",
  subskills: ["factorCount", "nthMultiple", "factorPairs", "primesAndCommon"],
  rawItems: [
    ...factorCountProcedural(),
    ...factorCountConceptual(),
    ...nthMultipleProcedural(),
    ...nthMultipleConceptual(),
    ...factorPairsProcedural(),
    ...factorPairsConceptual(),
    ...primesProcedural(),
    ...primesConceptual(),
    ...factorsStories(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
