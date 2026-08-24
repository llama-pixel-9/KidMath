#!/usr/bin/env node
/**
 * Build the measurement bank via the shared assembler (bankAssembler.js).
 * Additive work rides countMath claims; conversions, compares, roundings,
 * and multi-step results carry display.measure claims that THIS file
 * re-derives.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorMeasurement.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorMeasurement.js --write --tag b0821
 */

import { lengthConvertProcedural, lengthConvertConceptual, massVolumeProcedural, massVolumeConceptual, FACTORS } from "./measurementTemplates.js";
import { benchmarkProcedural, benchmarkConceptual, compareOrderProcedural, compareOrderConceptual, multiStepProcedural, multiStepConceptual } from "./measurementTemplates2.js";
import { buildStoryItems } from "./measurementStories.js";
import { runAssembler } from "../bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

function expectedFromMeasure(m, q) {
  switch (m.kind) {
    case "convert":
      return FACTORS[m.pair] ? m.amount * FACTORS[m.pair] : undefined;
    case "convertUp":
      return FACTORS[m.pair] && m.total % FACTORS[m.pair] === 0 ? m.total / FACTORS[m.pair] : undefined;
    case "convertSaid":
      return m.said === m.amount * FACTORS[m.pair] ? "Yes" : "No";
    case "cmp":
      // Label answers; the winning side must be strictly larger/smaller.
      return m.a === m.b ? undefined : null;
    case "cmpSaid":
      return (m.saidLarger ? m.a > m.b : m.a < m.b) ? "Yes" : "No";
    case "eqSaid":
      return m.a === m.b ? "Yes" : "No";
    case "cmp3":
    case "cmp3mid":
    case "cmp3min": {
      const s = [...m.values].sort((x, y) => x - y);
      return new Set(m.values).size === 3 ? null : undefined; // ties would break label answers
    }
    case "growth":
      return `${m.b} - ${m.a}`;
    case "plan":
      return m.op === "+" ? `${m.a} + ${m.b}` : `${m.a} - ${m.b}`;
    case "joinSaid":
      return m.said === m.a + m.b ? "Yes" : "No";
    case "twoStepSaid":
      return m.said === m.a + m.b - m.c ? "Yes" : "No";
    case "mixedSaid":
      return m.said === m.m * 100 + m.cm ? "Yes" : "No";
    case "joinTrim":
      return m.a + m.b - m.cut;
    case "rollLeft":
      return `${m.mTotal * 100 - m.used} cm`;
    case "halfLeft":
      return m.L * 1000 - m.pour > (m.L * 1000) / 2 ? "Yes" : "No";
    case "enough":
      return m.haveSmall >= m.need ? "Yes" : "No";
    case "roundTen":
      return Math.round(m.n / 10) * 10;
    case "roundHundred":
      return Math.round(m.n / 100) * 100;
    case "roundSaid":
      return Math.round(m.n / m.place) * m.place === m.said ? "Yes" : "No";
    case "closestSum":
      return Math.round((m.a + m.b) / 100) * 100;
    case "maxSaid": {
      const max = Math.max(...m.values);
      const idx = m.values.indexOf(max);
      return m.labels[idx] === m.said ? "Yes" : "No";
    }
    case "factorPick":
      return m.factor;
    case "pickLabel":
    case "claim":
      return null; // human-authored; judged consistency still checked
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

  const m = d.measure;
  if (m) {
    const expected = expectedFromMeasure(m, q);
    if (expected === undefined) problems.push(`bad measure claim "${m.kind}"`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`measure claim "${m.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  }

  return problems;
}

await runAssembler({
  modeId: "measurement",
  subskills: ["lengthConvert", "massVolumeConvert", "benchmarkEstimate", "compareOrder", "multiStepMeasure"],
  rawItems: [
    ...lengthConvertProcedural(),
    ...lengthConvertConceptual(),
    ...massVolumeProcedural(),
    ...massVolumeConceptual(),
    ...benchmarkProcedural(),
    ...benchmarkConceptual(),
    ...compareOrderProcedural(),
    ...compareOrderConceptual(),
    ...multiStepProcedural(),
    ...multiStepConceptual(),
    ...buildStoryItems(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
