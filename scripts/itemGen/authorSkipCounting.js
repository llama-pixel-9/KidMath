#!/usr/bin/env node
/**
 * Build the skipCounting bank via the shared assembler (bankAssembler.js).
 * Payloads ride op "count" + display.counting claims (countMath gate);
 * this file adds skip-count-specific asserts for choice/judged forms.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorSkipCounting.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorSkipCounting.js --write --tag b0821
 */

import { buildDeterministicItems } from "./skipCountingTemplates.js";
import { buildStoryItems } from "./skipCountingStories.js";
import { runAssembler } from "./bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const numsIn = (t) => (String(t).match(/\d+/g) || []).map(Number);

function extraProblems(item) {
  const q = item.question;
  const d = q.display || {};
  const text = d.promptText || "";
  const problems = [];

  // Judged items need display.truth consistent with the answer.
  if (Array.isArray(q.choices) && (q.answer === "Yes" || q.answer === "No")) {
    if (typeof d.truth !== "boolean") problems.push("judged item missing display.truth");
    else if ((q.answer === "Yes") !== d.truth) problems.push("judged answer disagrees with truth");
  }

  // Rule-identification: the answer must be the common difference of the
  // sequence printed in the prompt.
  if (item.structureType.startsWith("identifyRule")) {
    const nums = numsIn(text);
    const seq = nums.slice(0, 4);
    const diffs = seq.slice(1).map((n, i) => n - seq[i]);
    if (!diffs.every((x) => x === diffs[0])) problems.push("rule item sequence is not arithmetic");
    else if (q.answer !== diffs[0]) problems.push(`rule answer ${q.answer} != step ${diffs[0]}`);
  }

  // Skip-slip: verify against the pattern claim — the shown run must equal
  // the true run except at badIdx, where it shows the answer.
  if (item.structureType.startsWith("errorSkipSlip")) {
    const p = d.pattern;
    if (!p) problems.push("slip item missing display.pattern claim");
    else {
      const truth = Array.from({ length: 4 }, (_, k) => p.start + p.step * k);
      const shown = numsIn(text).slice(-4);
      for (let k = 0; k < 4; k += 1) {
        if (k === p.badIdx) {
          if (shown[k] !== q.answer) problems.push("slip answer is not the shown bad value");
          if (shown[k] === truth[k]) problems.push("slip bad value accidentally correct");
        } else if (shown[k] !== truth[k]) problems.push(`slip run wrong at index ${k}`);
      }
    }
  }

  // Odd-one-out over multiples: answer indivisible, all other choices divisible.
  if (item.structureType.startsWith("oddOneOut") && Array.isArray(q.choices)) {
    const s = Number(text.match(/(?:by|the) (\d+)s\b/)?.[1]);
    if (!s) problems.push("odd-one-out prompt does not state the step");
    else {
      if (q.answer % s === 0) problems.push("odd-one-out answer IS a multiple");
      for (const c of q.choices) if (c !== q.answer && c % s !== 0) problems.push(`choice ${c} is not a multiple of ${s}`);
    }
  }

  // predict/last-count choices: answer among choices handled by
  // distractorSanity; assert answer = groups x step parsed from the prompt.
  if (item.structureType.startsWith("predictLastCount")) {
    const [g, s] = numsIn(text);
    if (q.answer !== g * s) problems.push(`last-count answer ${q.answer} != ${g}x${s}`);
  }

  return problems;
}

await runAssembler({
  modeId: "skipCounting",
  subskills: ["patternRule", "stepInference", "groupsToProduct"],
  rawItems: [...buildDeterministicItems(), ...buildStoryItems()],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
