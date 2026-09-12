#!/usr/bin/env node
/**
 * Build the placeValueDiscs bank via the shared assembler (bankAssembler.js).
 * Payloads ride op "count" + display.counting claims (countMath gate); this
 * file adds disc-specific asserts: visual mats must equal their answer, the
 * letter-free caption guarantee for band-1 mat reads, judged truth
 * consistency, and choice sanity.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorPlaceValueDiscs.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorPlaceValueDiscs.js --write --tag b0821
 */

import { buildDeterministicItems } from "./placeValueDiscsTemplates.js";
import { buildStoryItems } from "./placeValueDiscsStories.js";
import { runAssembler } from "../bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

function extraProblems(item) {
  const q = item.question;
  const d = q.display || {};
  const text = d.promptText || "";
  const problems = [];

  // Visual mats: the drawn columns must equal the answer, and every column
  // must be a real disc place.
  if (d.type === "discs") {
    if (!Array.isArray(d.cols) || d.cols.length === 0) problems.push("disc item missing display.cols");
    else {
      const value = d.cols.reduce((s, c) => s + c.place * c.count, 0);
      if (value !== q.answer) problems.push(`mat value ${value} != answer ${q.answer}`);
      for (const c of d.cols) {
        if (![1, 10, 100, 1000].includes(c.place)) problems.push(`bad disc place ${c.place}`);
        if (!(Number.isInteger(c.count) && c.count >= 0)) problems.push(`bad disc count ${c.count}`);
      }
    }
    if (q.answerType !== "placeValueDiscs") problems.push("disc mat without placeValueDiscs answerType");
    // The no-words guarantee: mat captions stay under the verbal-prompt
    // threshold so these serve at the numbers-only early levels.
    const letters = (text.match(/[a-zA-Z]/g) || []).length;
    if (letters >= 6) problems.push(`mat caption is verbal (${letters} letters): ${text}`);
  }

  // Judged items need display.truth consistent with the answer.
  if (Array.isArray(q.choices) && (q.answer === "Yes" || q.answer === "No")) {
    if (typeof d.truth !== "boolean") problems.push("judged item missing display.truth");
    else if ((q.answer === "Yes") !== d.truth) problems.push("judged answer disagrees with truth");
  }

  // Choice items: answer present, no duplicate options.
  if (Array.isArray(q.choices)) {
    if (!q.choices.includes(q.answer)) problems.push("answer missing from choices");
    if (new Set(q.choices.map(String)).size !== q.choices.length) problems.push("duplicate choices");
  }

  return problems;
}

await runAssembler({
  modeId: "placeValueDiscs",
  subskills: ["readNumber", "tradeRegroup", "discOperations"],
  rawItems: [...buildDeterministicItems(), ...buildStoryItems()],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
