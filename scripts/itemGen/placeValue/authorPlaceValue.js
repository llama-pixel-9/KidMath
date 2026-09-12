#!/usr/bin/env node
/**
 * Build the placeValue bank via the shared assembler. Payloads ride op
 * "count" + display.counting claims (countMath gate, incl. the place-value
 * kinds units/digit/placeValueOf).
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorPlaceValue.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorPlaceValue.js --write --tag b0821
 */

import { buildDeterministicItems } from "./placeValueTemplates.js";
import { buildStoryItems } from "./placeValueStories.js";
import { runAssembler } from "../bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const WORD_VALUES = { eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };

function extraProblems(item) {
  const q = item.question;
  const d = q.display || {};
  const text = d.promptText || "";
  const problems = [];

  if (Array.isArray(q.choices) && (q.answer === "Yes" || q.answer === "No")) {
    if (typeof d.truth !== "boolean") problems.push("judged item missing display.truth");
    else if ((q.answer === "Yes") !== d.truth) problems.push("judged answer disagrees with truth");
  }

  // Word-form items: the word in the prompt must equal the numeric answer.
  if (item.structureType.startsWith("wordToNumeral") || item.structureType === "storyWordForm") {
    const word = Object.keys(WORD_VALUES).find((w) => text.includes(w));
    if (!word) problems.push("word-form item has no known number word");
    else if (WORD_VALUES[word] !== q.answer) problems.push(`word ${word} != answer ${q.answer}`);
  }
  if (item.structureType === "numeralToWordTeen") {
    const n = Number(text.match(/names (\d+)/)?.[1]);
    if (WORD_VALUES[q.answer] !== n) problems.push(`word answer ${q.answer} != ${n}`);
  }

  // Expansion picks: the answer expression must evaluate to the stated n.
  if (item.structureType.startsWith("pickExpansion") || item.structureType.startsWith("storyPickExpansion")) {
    const n = Number((text.match(/\d+/g) || [])[0]);
    const val = String(q.answer)
      .split(" + ")
      .map(Number)
      .reduce((s, x) => s + x, 0);
    if (val !== n) problems.push(`expansion ${q.answer} != ${n}`);
    for (const c of q.choices || []) {
      if (c === q.answer) continue;
      const cv = String(c).split(" + ").map(Number);
      if (cv.every((x) => !Number.isNaN(x)) && cv.reduce((s, x) => s + x, 0) === n) {
        problems.push(`distractor "${c}" also equals ${n}`);
      }
    }
  }

  // Frame payloads render only through the tenFrame widget.
  if ((d.filled != null || d.frameMode) && q.answerType !== "tenFrame") {
    problems.push("frame payload without answerType tenFrame renders caption-only");
  }
  // numberLine locate: answer within [min, max].
  if (q.answerType === "numberLine") {
    if (d.min == null || d.max == null || q.answer < d.min || q.answer > d.max) problems.push("numberLine answer outside range");
  }

  return problems;
}

await runAssembler({
  modeId: "placeValue",
  subskills: ["tensOnes", "expandedForm", "regroupingSense"],
  rawItems: [...buildDeterministicItems(), ...buildStoryItems()],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
