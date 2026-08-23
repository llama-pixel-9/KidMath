/* Shared bank-authoring gate — the assembler recipe factored out after the
 * numberBonds/counting/comparing builds repeated it verbatim.
 *
 * runAssembler({ modeId, subskills, items, extraProblems, batchTag, write,
 * showMax }) gates the items (schema → runChecks → per-mode extra asserts →
 * global promptText uniqueness vs bundle AND cloud rows of this mode,
 * excluding this batch's own ids → signature caps for buckets this batch
 * contributes to → ≥50 per subskill×family×band cell) and either reports
 * (dry run) or writes drafts.
 */

import { runChecks } from "../../src/itemBank/qc/checks.js";
import { validateBankItem, findPromptOveruse, levelRangeToBands } from "../../src/itemBank/index.js";
// FULL_ITEMS, not the first-paint seed: prompt uniqueness is bank-wide, and
// deduping against the 1,600-item seed let cross-mode duplicates through
// (decimals b0821 vs decimalOps b0824).
import { FULL_ITEMS as BUNDLED_ITEMS } from "../../src/itemBank/fullBank.js";
import { writeDrafts } from "./writeDrafts.js";

const FAMILIES = ["procedural", "conceptual", "application"];
const BANDS = ["K-1", "2-3", "4-5"];
const FAM3 = { procedural: "proc", conceptual: "conc", application: "app" };

export async function runAssembler({ modeId, subskills, rawItems, extraProblems, batchTag, write, showMax = 40, floor = 50 }) {
  const counters = { proc: 0, conc: 0, app: 0 };
  const items = rawItems.map((r) => {
    const fam = FAM3[r.itemFamily];
    counters[fam] += 1;
    return {
      ...r,
      itemId: `${modeId}-${fam}-${batchTag}-${String(counters[fam]).padStart(4, "0")}`,
      reviewStatus: "draft",
    };
  });

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
    const extra = extraProblems ? extraProblems(item) : [];
    if (extra.length) {
      hardFailures += 1;
      failDetails.push(`${item.itemId}: ${extra.join("; ")} :: "${item.question.display?.promptText}"`);
    }
  }

  const newIds = new Set(items.map((i) => i.itemId));
  // Exclude the batch's own prior rows entirely (not just same-id): a rerun
  // reshuffles content across ids, and the whole batch is being replaced.
  const bundledOther = BUNDLED_ITEMS.filter((b) => !newIds.has(b.itemId) && !b.itemId.includes(`-${batchTag}-`));
  const seen = new Map();
  for (const b of bundledOther) {
    const t = b.question?.display?.promptText;
    if (t) seen.set(t, b.itemId);
  }
  for (const [t, id] of await cloudPrompts(modeId, batchTag)) if (!seen.has(t)) seen.set(t, id);
  for (const item of items) {
    const t = item.question.display?.promptText;
    if (seen.has(t)) {
      hardFailures += 1;
      failDetails.push(`${item.itemId}: duplicate promptText with ${seen.get(t)} :: "${t}"`);
    } else {
      seen.set(t, item.itemId);
    }
  }

  const pretendApproved = items.map((i) => ({ ...i, reviewStatus: "approved" }));
  const overuse = findPromptOveruse([...bundledOther, ...pretendApproved]);
  for (const o of overuse.filter((o) => o.cell.startsWith(`${modeId}::`))) {
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
  // The floor applies to the cells THIS batch contributes to. A full-mode
  // build touches every cell and is checked exactly as before; a delta batch
  // (e.g. the grade-4 remainders/rounding cells) is not required to re-author
  // the rest of the mode.
  const shortCells = [];
  for (const [key, n] of cellCounts) {
    if (n < floor) shortCells.push(`${key} = ${n}`);
  }

  console.log(`${modeId} authoring — tag ${batchTag}`);
  console.log(`items assembled: ${items.length} (proc ${counters.proc}, conc ${counters.conc}, app ${counters.app})`);
  console.log(`QC warnings (non-blocking): ${warnCount} ${[...warnTally].map(([k, v]) => `${k}×${v}`).join(", ")}`);
  console.log("\nPer-cell coverage:");
  for (const subskill of subskills) {
    for (const family of FAMILIES) {
      const row = BANDS.map((band) => `${band}: ${String(cellCounts.get(`${subskill}::${family}::${band}`) || 0).padStart(3)}`).join("   ");
      console.log(`  ${subskill.padEnd(16)} ${family.padEnd(12)} ${row}`);
    }
  }

  if (shortCells.length) console.error(`\n✗ cells below the ${floor}-item floor:\n  ${shortCells.join("\n  ")}`);
  if (hardFailures) {
    console.error(`\n✗ ${hardFailures} gate failure(s):`);
    for (const d of failDetails.slice(0, showMax)) console.error(`  ${d}`);
    if (failDetails.length > showMax) console.error(`  … and ${failDetails.length - showMax} more`);
  }
  if (shortCells.length || hardFailures) process.exit(1);

  console.log("\n✓ all items gate-clean, unique, signature-safe, cells at floor");

  if (!write) {
    console.log("(dry run — pass --write to upsert as drafts)");
    return { items, wrote: 0 };
  }
  const result = await writeDrafts(items);
  console.log(`wrote ${result.wrote} drafts${result.failures?.length ? ` (${result.failures.length} chunk failures)` : ""}`);
  return { items, wrote: result.wrote };
}

async function cloudPrompts(modeId, batchTag) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out = [];
  if (!url || !key) return out;
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${url}/rest/v1/item_bank?mode_id=eq.${modeId}&review_status=neq.retired&select=item_id,payload&order=item_id&offset=${from}&limit=1000`,
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
