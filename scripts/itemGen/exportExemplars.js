#!/usr/bin/env node
/**
 * Export approved bank items as exemplar files for the drafts pipeline.
 *
 * The exemplar pipeline (generateDrafts.js) can only author cells that have
 * exemplars under data/exemplars/. The thin modes have none — but they DO have
 * a reviewed, approved seed in the bank, which is the best possible exemplar
 * source: our own items, already through QC and human review.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/exportExemplars.js --modes comparing,counting,division,placeValue,skipCounting [--per 8]
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { runChecks } from "../../src/itemBank/qc/checks.js";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");

const args = process.argv.slice(2);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const modes = (flag("modes") || "").split(",").filter(Boolean);
const perCell = Number(flag("per", "8"));
if (!modes.length) {
  console.error("Pass --modes m1,m2,...");
  process.exit(2);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function fetchMode(modeId) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/item_bank?mode_id=eq.${modeId}&review_status=eq.approved&select=item_id,subskill,item_family,level_band,structure_type,payload&order=item_id.asc`,
      { headers: { ...H, Range: `${from}-${from + 999}` } }
    );
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const today = new Date().toISOString().slice(0, 10);
let files = 0;
for (const modeId of modes) {
  const rows = (await fetchMode(modeId)).filter((r) => {
    if (!r.subskill || !r.item_family || !r.level_band) return false;
    if (typeof r.payload?.display?.promptText !== "string") return false;
    // An exemplar that fails today's QC gate teaches the model the disease —
    // the self-answering counting batch came from exactly this. Approved
    // legacy items are NOT automatically gate-clean.
    return runChecks({
      itemId: r.item_id,
      modeId,
      structureType: r.structure_type,
      levelRange: [1, 10],
      question: r.payload,
    }).pass;
  });
  const cells = new Map();
  for (const r of rows) {
    const key = `${r.subskill}::${r.item_family}::${r.level_band}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(r);
  }
  for (const [key, items] of cells) {
    const [subskill, family, band] = key.split("::");
    // Spread the picks across the cell rather than taking the first N siblings.
    const step = Math.max(1, Math.floor(items.length / perCell));
    const picks = [];
    for (let i = 0; i < items.length && picks.length < perCell; i += step) picks.push(items[i]);

    const exemplars = picks.map((r, i) => ({
      exemplarId: `${modeId}-${subskill}-${family}-${band.replace("-", "_")}-x${String(i + 1).padStart(3, "0")}`,
      modeId,
      subskill,
      itemFamily: family,
      levelBand: band,
      structureType: r.structure_type || null,
      source: {
        name: "KidMath item bank (own reviewed content)",
        url: `item:${r.item_id}`,
        license: "CC0",
        fetchedAt: today,
      },
      paraphrase: r.payload.display.promptText.slice(0, 120),
      payload: r.payload,
      notes: "Exported from the approved bank as an in-register exemplar.",
    }));

    const dir = path.join(ROOT, "data", "exemplars", modeId, subskill, family);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${band}.json`), JSON.stringify(exemplars, null, 2) + "\n");
    files += 1;
    console.log(`${modeId}/${subskill}/${family}/${band}: ${exemplars.length} exemplars (of ${items.length})`);
  }
}
console.log(`\n${files} exemplar file(s) written.`);
