#!/usr/bin/env node
/**
 * Build the patterns bank via the shared assembler (bankAssembler.js).
 * Additive numeric payloads ride display.counting claims (countMath gate);
 * everything else carries a display.pattern claim that THIS file re-derives:
 * repeating shapes (repeat / repeatPos / after / countIn / core), geometric
 * sequences (geo / geoDiv / geoApply / geoRule / addOrMult), rule application
 * (applyRule), broken terms (slip), gap fills (fill), parity (parity),
 * judged continuations (arith), growth comparisons (faster).
 *
 * The shown run is `display.sequence` only on a next-term question (the app
 * draws it as a "What comes next?" card and hides the prompt; the gate's
 * sequenceCardMismatch check holds that). Every other run is `display.terms`,
 * with "__" for a blank. The geo and slip checks below read whichever is set.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorPatterns.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorPatterns.js --write --tag b0821
 */

import {
  repeatingProcedural,
  repeatingConceptual,
  arithmeticProcedural,
  arithmeticConceptual,
  geometricProcedural,
  geometricConceptual,
} from "./patternsTemplates.js";
import {
  missingTermProcedural,
  missingTermConceptual,
  patternRuleProcedural,
  patternRuleConceptual,
} from "./patternsTemplates2.js";
import { buildStoryItems } from "./patternsStories.js";
import { runAssembler } from "../bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const cyc = (core, len) => Array.from({ length: len }, (_, i) => core[i % core.length]);

function expectedFromPattern(p, q) {
  switch (p.kind) {
    case "repeat": {
      const right = p.core[p.len % p.core.length];
      if (p.said !== undefined) return p.said === right ? "Yes" : "No";
      return right;
    }
    case "repeatPos": {
      const actual = p.core[(p.pos - 1) % p.core.length];
      if (p.target !== undefined) return p.target === actual ? "Yes" : "No";
      return actual;
    }
    case "after": {
      const idx = p.core.indexOf(p.of);
      return idx === -1 ? null : p.core[(idx + 1) % p.core.length];
    }
    case "countIn":
      return cyc(p.core, p.upTo).filter((s) => s === p.target).length;
    case "core":
      return p.core.join(", ");
    case "geo":
      return null; // verified from the prompt sequence below
    case "geoRule":
      return `multiply by ${p.factor}`;
    case "geoDiv":
      return p.start / p.factor ** (p.terms ?? 2);
    case "geoApply":
      return p.start * p.factor ** p.times;
    case "applyRule":
      return p.start + (p.term - 1) * p.step;
    case "slip":
      return p.start + p.badIdx * p.step + (q.answer - (p.start + p.badIdx * p.step) > 0 ? 1 : -1);
    case "fill": {
      const right = p.start + p.g * p.step;
      return p.said === right ? "Yes" : "No";
    }
    case "parity":
      return (p.start + (p.term - 1) * p.step) % 2 === 0 ? "Yes" : "No";
    case "arith": {
      const right = p.start + 3 * p.step;
      return p.said === right ? "Yes" : "No";
    }
    case "doubleSaid":
      return p.said === p.s * 2 ? "Yes" : "No";
    case "addOrMult":
      return p.additive ? "Yes" : "No";
    case "faster":
      return p.d1 > p.d2 ? "Pattern A" : "Pattern B";
    case "rule":
      return `add ${p.step}`;
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

  // The run: `sequence` (next-term card) or `terms` (prompt shown), never both;
  // a blank is "__", and a blank never sits on a sequence card.
  if (Array.isArray(d.sequence) && Array.isArray(d.terms)) problems.push("display carries both sequence and terms");
  if ((d.terms || []).some((t) => t === "?")) problems.push('display.terms blank is "?" (use "__")');
  if ((d.sequence || []).some((t) => t === "?" || t === "__")) problems.push("display.sequence has a blank: a gap/first-term run belongs in display.terms");
  const run = d.sequence || d.terms || [];

  const p = d.pattern;
  if (p) {
    if (p.kind === "geo") {
      // Geometric extends: last shown term x factor, ratio constant.
      const seq = run;
      if (seq.length >= 2) {
        for (let i = 1; i < seq.length; i += 1) {
          if (seq[i] !== seq[i - 1] * p.factor) problems.push(`geo sequence breaks at index ${i}`);
        }
        if (q.answer !== seq[seq.length - 1] * p.factor) problems.push(`geo answer ${q.answer} != last x ${p.factor}`);
      } else problems.push("geo item missing sequence");
    } else if (p.kind === "slip") {
      const truth = Array.from({ length: 5 }, (_, k) => p.start + p.step * k);
      const nums = run.filter((v) => typeof v === "number");
      if (nums.length >= 4) {
        for (let k = 0; k < nums.length; k += 1) {
          if (k === p.badIdx) {
            if (nums[k] !== q.answer) problems.push("slip answer is not the shown bad value");
            if (nums[k] === truth[k]) problems.push("slip bad value accidentally correct");
          } else if (nums[k] !== truth[k]) problems.push(`slip run wrong at index ${k}`);
        }
      } else problems.push("slip item missing sequence");
    } else {
      const expected = expectedFromPattern(p, q);
      if (expected === undefined) problems.push(`unknown pattern claim kind "${p.kind}"`);
      else if (expected !== null && String(expected) !== String(q.answer)) {
        problems.push(`pattern claim "${p.kind}" gives ${expected} but answer is ${q.answer}`);
      }
    }
  }

  return problems;
}

await runAssembler({
  modeId: "patterns",
  subskills: ["repeatingPattern", "arithmeticNext", "geometricNext", "missingTerm", "patternRule"],
  rawItems: [
    ...repeatingProcedural(),
    ...repeatingConceptual(),
    ...arithmeticProcedural(),
    ...arithmeticConceptual(),
    ...geometricProcedural(),
    ...geometricConceptual(),
    ...missingTermProcedural(),
    ...missingTermConceptual(),
    ...patternRuleProcedural(),
    ...patternRuleConceptual(),
    ...buildStoryItems(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
