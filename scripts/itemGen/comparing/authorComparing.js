#!/usr/bin/env node
/**
 * Build the comparing bank — same recipe as authorCounting.js.
 * Gates: schema → runChecks (incl. compareMath) → extra asserts → global
 * promptText uniqueness (bundle + cloud comparing rows, own tag excluded) →
 * signature caps (batch-contributing buckets only) → ≥50/cell floor.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorComparing.js            # dry run
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorComparing.js --write --tag b0821
 */

import { buildDeterministicItems } from "./comparingTemplates.js";
import { buildStoryItems } from "./comparingStories.js";
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

const SUBSKILLS = ["symbolSelection", "benchmarkCompare", "distanceCompare"];
const FAMILIES = ["procedural", "conceptual", "application"];
const BANDS = ["K-1", "2-3", "4-5"];

const FAM3 = { procedural: "proc", conceptual: "conc", application: "app" };
const counters = { proc: 0, conc: 0, app: 0 };

const raw = [...buildDeterministicItems(), ...buildStoryItems()];
const items = raw.map((r) => {
  const fam = FAM3[r.itemFamily];
  counters[fam] += 1;
  return {
    ...r,
    itemId: `comparing-${fam}-${batchTag}-${String(counters[fam]).padStart(4, "0")}`,
    reviewStatus: "draft",
  };
});

/* ----- extra asserts ----------------------------------------------- */

const sym = (x, y) => (x > y ? ">" : x < y ? "<" : "=");
const evalSide = (s) => {
  if (typeof s === "number") return s;
  const m = String(s).match(/^(\d+) \+ (\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]);
  const u = String(s).match(/^(\d+) tens? (\d+) ones?$/);
  if (u) return Number(u[1]) * 10 + Number(u[2]);
  return null;
};

function extraProblems(item) {
  const q = item.question;
  const d = q.display || {};
  const text = d.promptText || "";
  const problems = [];

  // Symbol answers: both sides must evaluate and relate as claimed.
  if (typeof q.answer === "string" && /^[<>=]$/.test(q.answer)) {
    let av = evalSide(q.a);
    let bv = evalSide(q.b);
    if (av == null && d.compare?.kind === "counts") {
      av = d.compare.a;
      bv = d.compare.b;
      // Sides may span multiple ten-rows; sum glyphs per labeled side.
      const parts = text.split(/Row B:|Bottom:/);
      const glyphsOf = (s) => (s.match(/\p{Extended_Pictographic}/gu) || []).length;
      if (parts.length !== 2 || glyphsOf(parts[0]) !== av || glyphsOf(parts[1]) !== bv) {
        problems.push("pictured counts do not match the claim");
      }
    }
    if (av == null || bv == null) problems.push("symbol item with unevaluatable sides");
    else if (sym(av, bv) !== q.answer) problems.push(`symbol ${q.answer} wrong for ${av} vs ${bv}`);
  }

  // Judged items: display.truth required and consistent.
  if (Array.isArray(q.choices) && (q.answer === "Yes" || q.answer === "No")) {
    if (typeof d.truth !== "boolean") problems.push("judged item missing display.truth");
    else if ((q.answer === "Yes") !== d.truth) problems.push("judged answer disagrees with truth");
  }

  // Order items: answer must be the ascending sort of its own numbers.
  if (typeof q.answer === "string" && /^\d+, \d+, \d+$/.test(q.answer)) {
    const nums = q.answer.split(", ").map(Number);
    const sorted = [...nums].sort((x, y) => x - y);
    if (JSON.stringify(nums) !== JSON.stringify(sorted)) problems.push("order answer is not ascending");
  }

  // Pick-extreme: answer must be min or max of the choices per the prompt.
  if (/smallest|largest/.test(text) && Array.isArray(q.choices) && typeof q.answer === "number" && q.choices.every((c) => typeof c === "number")) {
    const want = /smallest/.test(text) ? Math.min(...q.choices) : Math.max(...q.choices);
    if (q.answer !== want) problems.push(`extreme answer ${q.answer} != ${want}`);
  }

  // multiSelect: every marked statement true, every distractor false.
  if (Array.isArray(q.answer) && q.answerType === "multiSelect") {
    const options = d.options || [];
    if (!q.answer.every((a) => options.includes(a))) problems.push("multiSelect answer not among options");
    for (const o of options) {
      const m = String(o).match(/^(\d+) ([<>]) (\d+)$/);
      if (!m) { problems.push(`unparseable statement "${o}"`); continue; }
      const truth = m[2] === "<" ? Number(m[1]) < Number(m[3]) : Number(m[1]) > Number(m[3]);
      const marked = q.answer.includes(o);
      if (truth !== marked) problems.push(`statement "${o}" truth=${truth} marked=${marked}`);
    }
    if (d.requiredCount !== q.answer.length) problems.push("requiredCount != answer length");
  }

  // numberLine midpoints: answer must sit mid-range on the widget.
  if (q.answerType === "numberLine") {
    if (d.min == null || d.max == null) problems.push("numberLine item missing min/max");
    else if (q.answer !== (d.min + d.max) / 2) problems.push("numberLine answer is not the midpoint");
  }

  // Frame payloads render only through the tenFrame widget.
  if ((d.filled != null || d.frameMode) && q.answerType !== "tenFrame") {
    problems.push("frame payload without answerType tenFrame renders caption-only");
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

const newIds = new Set(items.map((i) => i.itemId));
const bundledOther = BUNDLED_ITEMS.filter((b) => !newIds.has(b.itemId));
const seen = new Map();
for (const b of bundledOther) {
  const t = b.question?.display?.promptText;
  if (t) seen.set(t, b.itemId);
}
for (const [t, id] of await cloudPrompts()) if (!seen.has(t)) seen.set(t, id);
for (const item of items) {
  const t = item.question.display?.promptText;
  if (seen.has(t)) {
    hardFailures += 1;
    failDetails.push(`${item.itemId}: duplicate promptText with ${seen.get(t)} :: "${t}"`);
  } else {
    seen.set(t, item.itemId);
  }
}

async function cloudPrompts() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out = [];
  if (!url || !key) return out;
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${url}/rest/v1/item_bank?mode_id=eq.comparing&review_status=neq.retired&select=item_id,payload&order=item_id&offset=${from}&limit=1000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error(`cloud read failed: ${JSON.stringify(rows).slice(0, 200)}`);
    for (const r of rows) {
      const t = r.payload?.display?.promptText;
      if (t && !String(r.item_id).includes(`-${batchTag}-`)) out.push([t, r.item_id]);
    }
    if (rows.length < 1000) break;
  }
  return out;
}

const pretendApproved = items.map((i) => ({ ...i, reviewStatus: "approved" }));
const overuse = findPromptOveruse([...bundledOther, ...pretendApproved]);
for (const o of overuse.filter((o) => o.cell.startsWith("comparing::"))) {
  if (!o.itemIds.some((id) => String(id).includes(`-${batchTag}-`))) continue;
  hardFailures += 1;
  failDetails.push(`signature overuse in ${o.cell}: "${o.signature}" x${o.count} (${o.itemIds.slice(0, 4).join(", ")}…)`);
}

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

console.log(`comparing authoring — tag ${batchTag}`);
console.log(`items assembled: ${items.length} (proc ${counters.proc}, conc ${counters.conc}, app ${counters.app})`);
console.log(`QC warnings (non-blocking): ${warnCount} ${[...warnTally].map(([k, v]) => `${k}×${v}`).join(", ")}`);
console.log("\nPer-cell coverage:");
for (const subskill of SUBSKILLS) {
  for (const family of FAMILIES) {
    const row = BANDS.map((band) => `${band}: ${String(cellCounts.get(`${subskill}::${family}::${band}`) || 0).padStart(3)}`).join("   ");
    console.log(`  ${subskill.padEnd(16)} ${family.padEnd(12)} ${row}`);
  }
}

if (shortCells.length) console.error(`\n✗ cells below the ${FLOOR}-item floor:\n  ${shortCells.join("\n  ")}`);
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
