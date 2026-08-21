#!/usr/bin/env node
/**
 * Build the counting bank: deterministic drill/visual items plus story items,
 * gate every one, and write them to Supabase as drafts.
 *
 * Same recipe as authorNumberBonds.js — no LLM in the loop; the K.CC fact
 * spaces (sets to 20, sequences within 120, ten frames) are finite and
 * enumerable (docs/counting-bank-design.md).
 *
 * Gates, in order:
 *   1. validateBankItem       — schema shape
 *   2. runChecks (QC gate)    — includes the countMath claim check
 *   3. extra asserts          — claim givens appear in the prose / picture;
 *                               judged + choice forms verified by hand
 *   4. global promptText uniqueness (new set + bundled bank + cloud counting rows)
 *   5. signature caps (findPromptOveruse: application 3, conceptual 5)
 *   6. per-cell coverage >= 50 for every subskill x family x band cell
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorCounting.js            # dry run + report
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorCounting.js --write --tag b0821
 */

import { buildDeterministicItems, glyphCount } from "./countingTemplates.js";
import { buildStoryItems } from "./countingStories.js";
import { runChecks } from "../../src/itemBank/qc/checks.js";
import { validateBankItem, findPromptOveruse, levelRangeToBands } from "../../src/itemBank/index.js";
import { BUNDLED_ITEMS } from "../../src/itemBank/bundle.js";
import { writeDrafts } from "./writeDrafts.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);

const write = has("write");
const now = new Date();
const batchTag = flag(
  "tag",
  `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
);

const SUBSKILLS = ["subitizing", "countOn", "cardinality"];
const FAMILIES = ["procedural", "conceptual", "application"];
const BANDS = ["K-1", "2-3", "4-5"];

/* ----- assemble ---------------------------------------------------- */

const FAM3 = { procedural: "proc", conceptual: "conc", application: "app" };
const counters = { proc: 0, conc: 0, app: 0 };

const raw = [...buildDeterministicItems(), ...buildStoryItems()];
const items = raw.map((r) => {
  const fam = FAM3[r.itemFamily];
  counters[fam] += 1;
  return {
    ...r,
    itemId: `counting-${fam}-${batchTag}-${String(counters[fam]).padStart(4, "0")}`,
    reviewStatus: "draft",
  };
});

/* ----- extra asserts ----------------------------------------------- */

const numbersIn = (text) => (String(text).match(/\d+/g) || []).map(Number);

/**
 * The countMath gate trusts display.counting; this closes the loop by
 * requiring every given in the claim to be visible to the child — either as
 * a numeral in the prompt or as a picture (an emoji run of that length, a
 * display.count figure, or a ten frame with that many counters).
 */
function givensVisible(item) {
  const q = item.question;
  const d = q.display || {};
  const c = d.counting;
  if (!c) return [];
  const text = d.promptText || "";
  const nums = new Set(numbersIn(text));
  const pictured = new Set();
  if (typeof d.count === "number") pictured.add(d.count);
  if (typeof d.filled === "number") pictured.add(d.filled + (typeof d.filledB === "number" ? d.filledB : 0));
  if (typeof d.filled === "number") {
    const frames = typeof d.frames === "number" ? d.frames : 1;
    pictured.add(frames * 10 - d.filled); // the empty cells
    pictured.add(frames * 10); // the frame itself pictures its capacity
  }
  for (const run of text.match(/(?:\p{Extended_Pictographic}[️‍]*)+(?:[ |]+(?:\p{Extended_Pictographic}[️‍]*)+)*/gu) || []) {
    pictured.add(glyphCount(run));
    for (const part of run.split(/[ |]+/)) pictured.add(glyphCount(part));
    // Mixed-kind runs: each glyph KIND's own count is pictured too ("count
    // only the apples").
    const byKind = new Map();
    for (const ch of Array.from(run)) {
      if (/\p{Extended_Pictographic}/u.test(ch)) byKind.set(ch, (byKind.get(ch) || 0) + 1);
    }
    for (const v of byKind.values()) pictured.add(v);
  }
  const problems = [];
  const givens = [];
  for (const [k, v] of Object.entries(c)) {
    if (k === "kind") continue;
    if (Array.isArray(v)) givens.push(...v);
    else if (typeof v === "number" && k !== "step" && k !== "delta") givens.push(v);
  }
  for (const g of givens) {
    if (!nums.has(g) && !pictured.has(g)) problems.push(`given ${g} is neither stated nor pictured`);
  }
  return problems;
}

function extraProblems(item) {
  const q = item.question;
  const d = q.display || {};
  const text = d.promptText || "";
  const problems = [...givensVisible(item)];

  // Judged forms: Yes/No with an "Is this right?" sub-prompt, and the build
  // records what the truth is in display.counting.truth for the assert.
  if (Array.isArray(q.choices) && (q.answer === "Yes" || q.answer === "No")) {
    if (typeof d.truth !== "boolean") problems.push("judged item has no display.truth to verify against");
    else if ((q.answer === "Yes") !== d.truth) problems.push(`judged answer ${q.answer} disagrees with truth ${d.truth}`);
  }

  // Choice forms with a numeric answer: the answer must be among the choices
  // (distractorSanity covers this) AND the claim must agree when present.
  if (Array.isArray(q.choices) && typeof q.answer === "string" && !/^(Yes|No)$/.test(q.answer)) {
    if (!q.choices.includes(q.answer)) problems.push("string answer not among choices");
  }

  // Ten frames draw only through the tenFrame widget.
  if ((d.filled != null || d.frameMode) && q.answerType !== "tenFrame") {
    problems.push("frame payload without answerType tenFrame renders caption-only");
  }
  // Figures: display.count must match the pictured run when both exist.
  if (typeof d.count === "number" && typeof d.emoji === "string") {
    const run = text.match(/(?:\p{Extended_Pictographic}[️‍]*)+/gu);
    if (run && glyphCount(run.join("")) !== d.count) problems.push(`display.count ${d.count} != pictured run`);
  }
  // Sequence displays need a numeric step and the claim to match.
  if (Array.isArray(d.sequence) && d.counting?.kind === "next") {
    if (JSON.stringify(d.sequence) !== JSON.stringify(d.counting.sequence)) problems.push("display.sequence != claim sequence");
    if (d.step !== d.counting.step) problems.push("display.step != claim step");
  }
  return problems;
}

/* ----- gate -------------------------------------------------------- */

let hardFailures = 0;
let warnCount = 0;
const failDetails = [];
const warnTally = new Map();

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
  for (const w of warns) warnTally.set(w.id, (warnTally.get(w.id) || 0) + 1);
  if (fails.length) {
    hardFailures += 1;
    failDetails.push(`${item.itemId}: ${fails.map((f) => `${f.id}: ${f.message}`).join("; ")} :: "${item.question.display?.promptText}"`);
  }
  const extra = extraProblems(item);
  if (extra.length) {
    hardFailures += 1;
    failDetails.push(`${item.itemId}: ${extra.join("; ")} :: "${item.question.display?.promptText}"`);
  }
}

// Global promptText uniqueness (new set + shipped bundle + cloud counting
// rows, which include reviewed drafts not yet in the bundle).
// A re-run after export finds ITSELF in the bundle — same itemId is the
// same item, not a duplicate.
const newIds = new Set(items.map((i) => i.itemId));
const bundledOther = BUNDLED_ITEMS.filter((b) => !newIds.has(b.itemId));
const seen = new Map();
for (const b of bundledOther) {
  const t = b.question?.display?.promptText;
  if (t) seen.set(t, b.itemId);
}
for (const [t, id] of await cloudCountingPrompts()) if (!seen.has(t)) seen.set(t, id);
for (const item of items) {
  const t = item.question.display?.promptText;
  if (seen.has(t)) {
    hardFailures += 1;
    failDetails.push(`${item.itemId}: duplicate promptText with ${seen.get(t)} :: "${t}"`);
  } else {
    seen.set(t, item.itemId);
  }
}

async function cloudCountingPrompts() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out = [];
  if (!url || !key) return out;
  // Paginate — supabase caps at 1,000 rows per request (hard rule).
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${url}/rest/v1/item_bank?mode_id=eq.counting&review_status=neq.retired&select=item_id,payload&order=item_id&offset=${from}&limit=1000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error(`cloud read failed: ${JSON.stringify(rows).slice(0, 200)}`);
    for (const r of rows) {
      const t = r.payload?.display?.promptText;
      // Skip this batch's own ids so a rerun with the same tag is idempotent.
      if (t && !String(r.item_id).includes(`-${batchTag}-`)) out.push([t, r.item_id]);
    }
    if (rows.length < 1000) break;
  }
  return out;
}

// Signature caps as they will apply once approved: pretend approved.
const pretendApproved = items.map((i) => ({ ...i, reviewStatus: "approved" }));
const overuse = findPromptOveruse([...bundledOther, ...pretendApproved]);
for (const o of overuse.filter((o) => o.cell.startsWith("counting::"))) {
  // Legacy approved counting items breach some caps entirely on their own;
  // only fail when this batch contributes to the bucket.
  if (!o.itemIds.some((id) => String(id).includes(`-${batchTag}-`))) continue;
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
for (const subskill of SUBSKILLS) {
  for (const family of FAMILIES) {
    for (const band of BANDS) {
      const key = `${subskill}::${family}::${band}`;
      const n = cellCounts.get(key) || 0;
      if (n < FLOOR) shortCells.push(`${key} = ${n}`);
    }
  }
}

/* ----- report ------------------------------------------------------ */

console.log(`counting authoring — tag ${batchTag}`);
console.log(`items assembled: ${items.length} (proc ${counters.proc}, conc ${counters.conc}, app ${counters.app})`);
console.log(`QC warnings (non-blocking): ${warnCount} ${[...warnTally].map(([k, v]) => `${k}×${v}`).join(", ")}`);
console.log("\nPer-cell coverage:");
for (const subskill of SUBSKILLS) {
  for (const family of FAMILIES) {
    const row = BANDS.map((band) => `${band}: ${String(cellCounts.get(`${subskill}::${family}::${band}`) || 0).padStart(3)}`).join("   ");
    console.log(`  ${subskill.padEnd(12)} ${family.padEnd(12)} ${row}`);
  }
}
if (has("structures")) {
  const st = new Map();
  for (const i of items) st.set(i.structureType, (st.get(i.structureType) || 0) + 1);
  console.log("\nPer-structure:", Object.fromEntries([...st].sort()));
}

if (shortCells.length) {
  console.error(`\n✗ cells below the ${FLOOR}-item floor:\n  ${shortCells.join("\n  ")}`);
}
if (hardFailures) {
  console.error(`\n✗ ${hardFailures} gate failure(s):`);
  const max = Number(flag("show", 40));
  for (const d of failDetails.slice(0, max)) console.error(`  ${d}`);
  if (failDetails.length > max) console.error(`  … and ${failDetails.length - max} more`);
}
if (shortCells.length || hardFailures) process.exit(1);

console.log("\n✓ all items gate-clean, unique, signature-safe, cells at floor");

if (!write) {
  console.log("(dry run — pass --write to upsert as drafts)");
  process.exit(0);
}

const result = await writeDrafts(items);
console.log(`wrote ${result.wrote} drafts${result.failures?.length ? ` (${result.failures.length} chunk failures)` : ""}`);
