#!/usr/bin/env node
/**
 * Build the numberBonds bank: deterministic drill/visual items plus authored
 * story items, gate every one, and write them to Supabase as drafts.
 *
 * Unlike authorStructures.js there is no LLM in the loop — the fact spaces
 * are finite and enumerable (docs/numberbonds-bank-design.md), so the items
 * are generated deterministically and the whole set is reproducible.
 *
 * Gates, in order:
 *   1. validateBankItem       — schema shape
 *   2. runChecks (QC gate)    — includes the bondMath consistency check
 *   3. extra math asserts     — judged/choice forms bondMath cannot see
 *   4. global promptText uniqueness (new set + bundled bank)
 *   5. signature caps (findPromptOveruse: application 3, conceptual 5)
 *   6. per-cell coverage >= 50 for every subskill x family x band cell
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorNumberBonds.js            # dry run + report
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorNumberBonds.js --write --tag b0820
 */

import { buildDeterministicItems } from "./numberBondTemplates.js";
import { buildStoryItems } from "./numberBondStories.js";
import { runChecks } from "../../../src/itemBank/qc/checks.js";
import { validateBankItem, findPromptOveruse, levelRangeToBands } from "../../../src/itemBank/index.js";
import { BUNDLED_ITEMS } from "../../../src/itemBank/bundle.js";
import { writeDrafts } from "../writeDrafts.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);

const write = has("write");
const now = new Date();
const batchTag = flag(
  "tag",
  `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
);

/* ----- assemble ---------------------------------------------------- */

const FAM3 = { procedural: "proc", conceptual: "conc", application: "app" };
const counters = { proc: 0, conc: 0, app: 0 };

const raw = [...buildDeterministicItems(), ...buildStoryItems()];
const items = raw.map((r) => {
  const fam = FAM3[r.itemFamily];
  counters[fam] += 1;
  return {
    ...r,
    itemId: `numberBonds-${fam}-${batchTag}-${String(counters[fam]).padStart(3, "0")}`,
    reviewStatus: "draft",
  };
});

/* ----- math asserts for judged/choice forms ------------------------ */

function pairSum(text) {
  const m = String(text).match(/^(\d+) and (\d+)$/);
  return m ? Number(m[1]) + Number(m[2]) : null;
}

function extraMathProblems(item) {
  const q = item.question;
  const text = q.display?.promptText || "";
  const problems = [];

  if (Array.isArray(q.choices) && q.subPrompt === "Is this right?" && (q.answer === "Yes" || q.answer === "No")) {
    const claim = text.match(/^(\d+) \+ (\d+)(?: \+ (\d+))? = (\d+)$/);
    if (!claim) problems.push("unparseable judged claim");
    else {
      const sum = Number(claim[1]) + Number(claim[2]) + (claim[3] ? Number(claim[3]) : 0);
      const truthy = sum === Number(claim[4]);
      if ((q.answer === "Yes") !== truthy) problems.push(`claim is ${truthy} but answer is ${q.answer}`);
    }
  }

  // "x and y" pair choices: exactly one option carries the target sum for
  // single-answer items; multiSelect answers must all be valid and no
  // non-answer option may be.
  if (typeof q.answer === "string" && /^\d+ and \d+$/.test(q.answer) && Array.isArray(q.choices)) {
    const answerSum = pairSum(q.answer);
    const sums = q.choices.map(pairSum);
    if (sums.some((s) => s == null)) problems.push("unparseable pair choice");
    else if (/NOT|odd one out/i.test(text)) {
      const others = q.choices.filter((c) => c !== q.answer).map(pairSum);
      const whole = others[0];
      if (!others.every((s) => s === whole)) problems.push("odd-one-out distractor pairs disagree on the whole");
      if (answerSum === whole) problems.push("odd-one-out answer actually matches the whole");
    } else if (/split/i.test(text)) {
      // Strategy-split items: every option is a genuine split of the addend
      // (all sums equal); the correct option is the one whose FIRST number
      // completes the ten. Verify with the anchor stated in the prompt.
      const sumExpr = text.match(/(\d+) \+ (\d+)/);
      const anchor = Number(sumExpr?.[1]);
      const addend = Number(sumExpr?.[2]);
      const need = 10 - (anchor % 10);
      if (!sums.every((s) => s === addend)) problems.push("a split option does not sum to the addend");
      const leads = q.choices.map((c) => Number(c.match(/^(\d+)/)[1]));
      if (leads.filter((l) => l === need).length !== 1) problems.push("split options do not single out the make-ten lead");
      if (Number(q.answer.match(/^(\d+)/)[1]) !== need) problems.push(`split answer does not lead with ${need}`);
    } else {
      const matches = q.choices.filter((c) => pairSum(c) === answerSum);
      if (matches.length !== 1) problems.push(`${matches.length} choices share the answer's sum — ambiguous`);
    }
  }

  if (Array.isArray(q.answer) && q.answerType === "multiSelect") {
    const options = q.display?.options || [];
    if (!q.answer.every((a) => options.includes(a))) problems.push("multiSelect answer not among options");
    const answerSet = new Set(q.answer);
    const sums = options.map(pairSum);
    if (sums.every((s) => s != null)) {
      // pair-style options: every correct option must share one whole; no
      // distractor may match it.
      const whole = pairSum(q.answer[0]);
      for (const opt of options) {
        const isCorrect = answerSet.has(opt);
        if (isCorrect && pairSum(opt) !== whole) problems.push(`correct option ${opt} misses whole ${whole}`);
        if (!isCorrect && pairSum(opt) === whole) problems.push(`distractor ${opt} accidentally makes ${whole}`);
      }
    }
    if (q.display?.requiredCount !== q.answer.length) problems.push("requiredCount != answer length");
  }

  // Subtraction-sentence multiSelect ("13 − 4 = 9"): verify each side.
  if (Array.isArray(q.answer) && q.answerType === "multiSelect") {
    const options = q.display?.options || [];
    const subs = options.filter((o) => /−/.test(o));
    for (const o of subs) {
      const m = o.match(/^(\d+) − (\d+) = (\d+)$/);
      if (!m) continue;
      const truthy = Number(m[1]) - Number(m[2]) === Number(m[3]);
      const isCorrect = q.answer.includes(o);
      if (isCorrect !== truthy) problems.push(`subtraction option "${o}" truth=${truthy} marked=${isCorrect}`);
    }
  }

  return problems;
}

/* ----- gate -------------------------------------------------------- */

let hardFailures = 0;
let warnCount = 0;
const failDetails = [];

for (const item of items) {
  const { valid, errors } = validateBankItem(item);
  if (!valid) {
    hardFailures += 1;
    failDetails.push(`${item.itemId}: schema — ${errors.join("; ")}`);
    continue;
  }
  const qc = runChecks(item);
  const fails = qc.findings.filter((f) => f.severity === "fail");
  const warns = qc.findings.filter((f) => f.severity === "warn");
  warnCount += warns.length;
  if (fails.length) {
    hardFailures += 1;
    failDetails.push(`${item.itemId}: ${fails.map((f) => `${f.id}: ${f.message}`).join("; ")} :: "${item.question.display?.promptText}"`);
  }
  const extra = extraMathProblems(item);
  if (extra.length) {
    hardFailures += 1;
    failDetails.push(`${item.itemId}: ${extra.join("; ")} :: "${item.question.display?.promptText}"`);
  }
}

// Global promptText uniqueness (new set + shipped bundle). A re-run after
// this batch has been exported finds ITSELF in the bundle — same itemId is
// the same item, not a duplicate.
const newIds = new Set(items.map((i) => i.itemId));
const bundledOther = BUNDLED_ITEMS.filter((b) => !newIds.has(b.itemId));
const seen = new Map();
for (const b of bundledOther) {
  const t = b.question?.display?.promptText;
  if (t) seen.set(t, b.itemId);
}
for (const item of items) {
  const t = item.question.display?.promptText;
  if (seen.has(t)) {
    hardFailures += 1;
    failDetails.push(`${item.itemId}: duplicate promptText with ${seen.get(t)} :: "${t}"`);
  } else {
    seen.set(t, item.itemId);
  }
}

// Signature caps as they will apply once approved: pretend approved.
const pretendApproved = items.map((i) => ({ ...i, reviewStatus: "approved" }));
const overuse = findPromptOveruse([...bundledOther, ...pretendApproved]);
const bondOveruse = overuse.filter((o) => o.cell.startsWith("numberBonds::"));
for (const o of bondOveruse) {
  hardFailures += 1;
  failDetails.push(`signature overuse in ${o.cell}: "${o.signature}" x${o.count} (${o.itemIds.slice(0, 4).join(", ")}…)`);
}

// Per-cell coverage.
const cellCounts = new Map();
for (const item of items) {
  for (const band of levelRangeToBands(item.levelRange)) {
    const key = `${item.subskill}::${item.itemFamily}::${band}`;
    cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
  }
}
const FLOOR = 50;
const shortCells = [];
for (const subskill of ["partWhole", "missingPart", "decompose"]) {
  for (const family of ["procedural", "conceptual", "application"]) {
    for (const band of ["K-1", "2-3", "4-5"]) {
      const key = `${subskill}::${family}::${band}`;
      const n = cellCounts.get(key) || 0;
      if (n < FLOOR) shortCells.push(`${key} = ${n}`);
    }
  }
}

/* ----- report ------------------------------------------------------ */

console.log(`numberBonds authoring — tag ${batchTag}`);
console.log(`items assembled: ${items.length} (proc ${counters.proc}, conc ${counters.conc}, app ${counters.app})`);
console.log(`QC warnings (non-blocking): ${warnCount}`);
console.log("\nPer-cell coverage:");
for (const subskill of ["partWhole", "missingPart", "decompose"]) {
  for (const family of ["procedural", "conceptual", "application"]) {
    const row = ["K-1", "2-3", "4-5"]
      .map((band) => `${band}: ${cellCounts.get(`${subskill}::${family}::${band}`) || 0}`)
      .join("   ");
    console.log(`  ${subskill.padEnd(12)} ${family.padEnd(12)} ${row}`);
  }
}

if (shortCells.length) {
  console.error(`\n✗ cells below the ${FLOOR}-item floor:\n  ${shortCells.join("\n  ")}`);
}
if (hardFailures) {
  console.error(`\n✗ ${hardFailures} gate failure(s):`);
  for (const d of failDetails.slice(0, 40)) console.error(`  ${d}`);
  if (failDetails.length > 40) console.error(`  … and ${failDetails.length - 40} more`);
}
if (shortCells.length || hardFailures) process.exit(1);

console.log("\n✓ all items gate-clean, unique, signature-safe, cells at floor");

if (!write) {
  console.log("(dry run — pass --write to upsert as drafts)");
  process.exit(0);
}

const result = await writeDrafts(items);
console.log(`wrote ${result.wrote} drafts${result.failures?.length ? ` (${result.failures.length} chunk failures)` : ""}`);
