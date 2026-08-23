#!/usr/bin/env node
/* Rewrite bare whole-first bond prompts to part-first in cloud item_bank rows.
 *
 * "7 = 1 + ?" reads to a young child as "compute 7 = 1"; the session shows the
 * bond diagram anyway, so the sentence should read the way the child solves it:
 * "1 + ? = 7" (Sai, 2026-08-22). Only the bare equation forms are touched:
 *   "W = P + ?"  -> "P + ? = W"
 *   "W = ? + P"  -> "? + P = W"
 * Prose forms ("5 = 1 + 4, so 5 = 2 + ?") keep the whole-first reading on
 * purpose — there the point is equivalence, not a missing addend.
 *
 * promptText is globally unique across the bank, and the flipped form often
 * collides with an addition missing-addend drill ("0 + ? = 10"). When it
 * does, the commuted slot ("? + 0 = 10") is used instead; if that collides
 * too, the row is reported and left alone.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/flipBondEquations.js            report only
 *   node scripts/flipBondEquations.js --write    apply
 * Follow with `npm run bank:export` so the bundle matches the DB.
 */

const write = process.argv.includes("--write");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const WHOLE_FIRST = /^(\d+) = (\d+|\?) \+ (\d+|\?)$/;

export function flipPrompt(text) {
  const m = text.match(WHOLE_FIRST);
  if (!m) return null;
  const [, whole, left, right] = m;
  if ((left === "?") === (right === "?")) return null; // exactly one unknown
  return {
    primary: `${left} + ${right} = ${whole}`,
    commuted: `${right} + ${left} = ${whole}`,
  };
}

async function fetchRows() {
  const PAGE = 1000; // supabase-js/PostgREST cap — MUST paginate
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const params = new URLSearchParams({
      select: "item_id,mode_id,review_status,payload",
      order: "item_id.asc",
    });
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/item_bank?${params}`, {
      headers: { ...HEADERS, Range: `${from}-${from + PAGE - 1}` },
    });
    if (!resp.ok) throw new Error(`fetch failed (${resp.status}): ${await resp.text()}`);
    const page = await resp.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

async function patchRow(itemId, payload) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/item_bank?item_id=eq.${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ payload }),
  });
  if (!resp.ok) throw new Error(`patch ${itemId} failed (${resp.status}): ${await resp.text()}`);
}

async function main() {
  const rows = await fetchRows();
  const taken = new Set(rows.map((r) => r.payload?.display?.promptText?.trim()).filter(Boolean));
  const plan = [];
  const stuck = [];
  for (const row of rows) {
    if (row.mode_id !== "numberBonds") continue;
    const text = row.payload?.display?.promptText?.trim();
    const flip = text && flipPrompt(text);
    if (!flip) continue;
    const next = [flip.primary, flip.commuted].find((t) => !taken.has(t));
    if (!next) {
      stuck.push({ itemId: row.item_id, text });
      continue;
    }
    taken.delete(text);
    taken.add(next);
    plan.push({ row, text, next, commuted: next === flip.commuted });
  }
  console.log(`${rows.length} rows scanned; ${plan.length} bond prompts to flip (${plan.filter((p) => p.commuted).length} via commuted slot); ${stuck.length} stuck.`);
  for (const s of stuck) console.log(`  STUCK ${s.itemId}: ${s.text}`);
  if (!write) {
    for (const p of plan.slice(0, 8)) console.log(`  ${p.row.item_id}: "${p.text}" -> "${p.next}"`);
    console.log("Dry run — pass --write to apply.");
    return;
  }
  let n = 0;
  for (const p of plan) {
    const payload = { ...p.row.payload, display: { ...p.row.payload.display, promptText: p.next } };
    await patchRow(p.row.item_id, payload);
    n += 1;
    if (n % 50 === 0) console.log(`  ${n}/${plan.length} written`);
  }
  console.log(`Done: ${n} rows updated.`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
