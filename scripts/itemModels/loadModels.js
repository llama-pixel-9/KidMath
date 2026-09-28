/**
 * Load item models (the v2 templates, src/itemModels/schema.js) into the
 * `item_models` table as review_status=draft rows.
 *
 *   set -a && source .env.local && set +a
 *   node --import ./scripts/lib/registerResolve.js scripts/itemModels/loadModels.js src/itemModels/pilot/grade2Money.json [--dryRun] [--force]
 *
 * Every model is validated (validateModel) and filled once through the QC
 * gate before anything is written, so a broken model never reaches the
 * review screen. Rows upsert on id; an existing row that is no longer a
 * draft (approved, rejected, flagged) is left alone unless --force is given,
 * so a reload never undoes a review decision by accident.
 */
import fs from "node:fs";
import { validateModel } from "../../src/itemModels/validate.js";
import { fill } from "../../src/itemModels/fill.js";
import { runChecks } from "../../src/itemBank/qc/checks.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dryRun");
const force = args.includes("--force");
if (!file) {
  console.error("usage: loadModels.js <models.json> [--dryRun] [--force]");
  process.exit(2);
}

let models = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(models)) models = models.models || Object.values(models);

const bad = [];
for (const model of models) {
  const v = validateModel(model);
  if (!v.ok) {
    bad.push(`${model?.id}: ${v.errors.join("; ")}`);
    continue;
  }
  try {
    const item = fill(model, { seed: 1 });
    const fails = runChecks(item).findings.filter((f) => f.severity === "fail");
    if (fails.length) bad.push(`${model.id}: ${fails.map((f) => f.id).join(", ")}`);
  } catch (err) {
    bad.push(`${model.id}: fill threw: ${err.message}`);
  }
}
if (bad.length) {
  console.error(`${bad.length} model(s) fail validation; nothing written:\n  ${bad.join("\n  ")}`);
  process.exit(1);
}

const rows = models.map((m) => ({
  id: m.id,
  mode_id: m.modeId,
  subskill: m.subskill ?? null,
  grade: m.grade == null ? null : String(m.grade),
  difficulty: m.difficulty ?? null,
  spec: m,
  review_status: "draft",
}));

if (dryRun) {
  for (const r of rows) process.stdout.write(`[dryRun] would upsert ${r.id} (${r.subskill}/${r.difficulty})\n`);
  console.log(`${rows.length} model(s) valid.`);
  process.exit(0);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required unless --dryRun is set.");
  process.exit(2);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

// Which of these ids already carry a review decision?
const ids = rows.map((r) => r.id);
const existing = await fetch(`${url}/rest/v1/item_models?select=id,review_status&id=in.(${ids.map((i) => `"${i}"`).join(",")})`, { headers }).then(async (r) => {
  if (!r.ok) throw new Error(`read failed (${r.status}): ${await r.text()}`);
  return r.json();
});
const decided = new Set(existing.filter((r) => r.review_status !== "draft").map((r) => r.id));
const toWrite = force ? rows : rows.filter((r) => !decided.has(r.id));
if (decided.size && !force) {
  console.log(`${decided.size} model(s) already reviewed, left alone (use --force to overwrite): ${[...decided].join(", ")}`);
}

const CHUNK = 50;
let wrote = 0;
for (let i = 0; i < toWrite.length; i += CHUNK) {
  const chunk = toWrite.slice(i, i + CHUNK);
  const resp = await fetch(`${url}/rest/v1/item_models?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(chunk),
  });
  if (!resp.ok) {
    console.error(`upsert failed (${resp.status}): ${await resp.text()}`);
    process.exit(1);
  }
  wrote += chunk.length;
}
console.log(`${wrote} model(s) upserted as drafts (${existing.length} existed before).`);
