#!/usr/bin/env node
/* Render every bank row through the real question card at phone width and
 * report anything that spills past the card / answer pane.
 *
 *   set -a && source .env.local && set +a
 *   node scripts/layoutSweep.mjs                 pending rows (review_status != approved)
 *   node scripts/layoutSweep.mjs --approved      approved rows
 *   node scripts/layoutSweep.mjs --mode counting restrict to one mode
 *
 * Starts its own vite on :5203, writes public/__sweep.json (gitignored,
 * removed on exit), drives /__sweep (DEV-only route) with Playwright across
 * 8 pages, and prints offenders grouped by mode/structure + screenshots of
 * the worst into /tmp/sweep-<itemId>.png.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";

const args = process.argv.slice(2);
const approved = args.includes("--approved");
const mode = args.includes("--mode") ? args[args.indexOf("--mode") + 1] : null;
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }

const rows = [];
for (let from = 0; ; from += 1000) {
  const params = new URLSearchParams({ select: "item_id,mode_id,item_family,subskill,structure_type,level_min,level_max,review_status,payload", order: "item_id.asc" });
  params.set("review_status", approved ? "eq.approved" : "neq.approved");
  if (mode) params.set("mode_id", `eq.${mode}`);
  const resp = await fetch(`${URL}/rest/v1/item_bank?${params}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` } });
  const page = await resp.json(); rows.push(...page); if (page.length < 1000) break;
}
const items = rows.map((x) => ({ itemId: x.item_id, modeId: x.mode_id, itemFamily: x.item_family, subskill: x.subskill, structureType: x.structure_type, levelMin: x.level_min, levelMax: x.level_max, reviewStatus: x.review_status, payload: x.payload }));
fs.writeFileSync("public/__sweep.json", JSON.stringify(items));
console.log(`${items.length} rows to sweep`);

const vite = spawn("npx", ["vite", "--port", "5203", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 4000));
const cleanup = () => { vite.kill(); try { fs.unlinkSync("public/__sweep.json"); } catch { /* gone */ } };
process.on("exit", cleanup);

const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 460, height: 1200 } });
const CH = Math.ceil(items.length / 8);
const runChunk = async (from) => {
  const p = await ctx.newPage();
  await p.goto(`http://localhost:5203/__sweep?from=${from}&to=${from + CH}`);
  for (let t = 0; t < 1200; t++) { await p.waitForTimeout(1000); if (await p.evaluate(() => window.__sweep?.done)) break; }
  const r = await p.evaluate(() => window.__sweep.results); await p.close(); return r;
};
const chunks = []; for (let f = 0; f < items.length; f += CH) chunks.push(f);
const all = (await Promise.all(chunks.map(runChunk))).flat();
const bad = all.filter((r) => r.spill > 2 || r.err);
console.log(`swept ${all.length}; offenders ${bad.length}; build errors ${all.filter((r) => r.err).length}`);
const groups = new Map();
for (const r of bad) { const k = `${r.modeId} / ${r.structureType} / ${r.answerType}`; groups.set(k, (groups.get(k) || 0) + 1); }
for (const [k, n] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
const worst = bad.sort((a, b) => (b.spill || 0) - (a.spill || 0)).slice(0, 24);
const p = await ctx.newPage();
for (const w of worst) { const idx = items.findIndex((x) => x.itemId === w.itemId); await p.goto(`http://localhost:5203/__sweep?from=${idx}&to=${idx + 1}`); await p.waitForTimeout(900); await p.locator("#sweep-root").screenshot({ path: `/tmp/sweep-${w.itemId}.png` }).catch(() => {}); console.log(`  ${w.spill}px  ${w.itemId}  ${w.err || JSON.stringify(w.widest)}`); }
await b.close(); cleanup();
