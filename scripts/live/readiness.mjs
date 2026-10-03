#!/usr/bin/env node
/**
 * Is a topic's live step what its manifest says? Read-only: it reads an
 * export folder (exportSql.mjs <topic> --grade <g> --for readiness prints
 * the SELECTs: live.json, rows.json, retired.json, switch.json) and the
 * committed manifest, and reports
 *   - the bank's checksum of the topic's live v2 rows against the
 *     manifest's md5 (and, when they differ, which rows: missing, extra,
 *     different);
 *   - the switch value for the topic;
 *   - what each catalog skill would serve, and the serving gaps (a skill
 *     with no rows; the switch panel keeps v2 off while there is one).
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/live/readiness.mjs <manifest.js> --export <dir>
 *   ... --rewrite [--out <manifest.js>]
 *     drop the rows the owner retired during play (retired.json) from the
 *     manifest and write it again (default: in place), so the bundle and
 *     the bank keep agreeing; commit it and CI checks it again.
 *
 * Exit 0 when the bank matches the manifest and no skill has a serving
 * gap, else 1.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { refillManifest } from "../../src/itemBank/v2/modelRows.js";
import { checksumOf, rowMd5s, toDbRow } from "../../src/itemModels/live/liveRows.js";
import { skillServing } from "../../src/itemModels/live/liveCoverage.js";
import { modelIdOfItem } from "../../src/itemModels/live/liveRules.js";
import { loadManifest, manifestModule, parseArgs, writeText } from "./lib/common.mjs";

function readJson(dir, name) {
  const path = join(dir, name);
  if (!existsSync(path)) throw new Error(`export ${dir}: no ${name} (scripts/live/exportSql.mjs --for readiness)`);
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rows) ? parsed.rows : [parsed];
}

/** The manifest's rows as the database holds them. */
export function manifestRows(manifest) {
  const { items, problems } = refillManifest(manifest);
  if (problems.length) throw new Error(`the manifest cannot be refilled: ${problems.join("; ")}`);
  return { items, rows: items.map((i) => toDbRow(i, { status: manifest.status })) };
}

/** Rows that differ between the bank (rows.json) and the manifest. */
export function diffRows(bank, expected) {
  const have = new Map(bank.map((r) => [r.item_id, r.md5]));
  const want = new Map(Object.entries(expected));
  return {
    missing: [...want.keys()].filter((id) => !have.has(id)),
    extra: [...have.keys()].filter((id) => !want.has(id)),
    different: [...want].filter(([id, md5]) => have.has(id) && have.get(id) !== md5).map(([id]) => id),
  };
}

/**
 * The manifest without `retiredIds`: their seeds and script ids removed,
 * rows and md5 recomputed. Returns { manifest, removed }.
 */
export function withoutRetired(manifest, retiredIds) {
  const gone = new Set(retiredIds);
  const removed = [];
  const models = {};
  for (const [id, entry] of Object.entries(manifest.models || {})) {
    const seeds = entry.seeds.filter((seed) => {
      const itemId = `${id}-s${seed}-v2`;
      if (gone.has(itemId)) removed.push(itemId);
      return !gone.has(itemId);
    });
    if (seeds.length) models[id] = { ...entry, seeds };
  }
  const next = { ...manifest, models };
  if (manifest.scriptRows) {
    const ids = manifest.scriptRows.ids.filter((id) => {
      if (gone.has(id)) removed.push(id);
      return !gone.has(id);
    });
    next.scriptRows = { ...manifest.scriptRows, ids };
  }
  const { rows } = manifestRows(next);
  next.rows = rows.length;
  next.md5 = checksumOf(rows);
  return { manifest: next, removed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { flags: ["help", "rewrite"], options: ["export", "out"] });
  const path = args.positional[0];
  if (args.flags.has("help") || !path || !args.options.export) {
    process.stdout.write("readiness.mjs <manifest.js> --export <dir> [--rewrite [--out <manifest.js>]]\n");
    return args.flags.has("help") ? 0 : 2;
  }
  const dir = args.options.export;
  let manifest = await loadManifest(path);
  const say = (s) => process.stdout.write(`${s}\n`);

  // The manifest must still rebuild to its own md5 (the repo has not drifted).
  let { items, rows } = manifestRows(manifest);
  const refilled = checksumOf(rows);
  if (refilled !== manifest.md5) {
    say(`RED  the repo no longer rebuilds the manifest: md5 ${refilled}, manifest says ${manifest.md5}`);
    return 1;
  }

  if (args.flags.has("rewrite")) {
    const retired = readJson(dir, "retired.json").map((r) => r.item_id);
    const { manifest: next, removed } = withoutRetired(manifest, retired);
    if (!removed.length) say("rewrite: no retired row is in the manifest; nothing to change");
    else {
      const out = args.options.out || path;
      writeText(out, manifestModule(next));
      say(`rewrite: removed ${removed.length} retired rows (${removed.slice(0, 5).join(", ")}${removed.length > 5 ? " ..." : ""}); ${next.rows} rows, md5 ${next.md5} -> ${out}`);
      manifest = next;
      ({ items, rows } = manifestRows(manifest));
    }
  }

  let ok = true;
  const [live] = readJson(dir, "live.json");
  const bankRows = Number(live?.rows ?? 0);
  if (live?.checksum === manifest.md5 && bankRows === manifest.rows) say(`ok   bank ${bankRows} live rows, checksum ${live.checksum} = manifest`);
  else {
    ok = false;
    say(`RED  bank ${bankRows} live rows, checksum ${live?.checksum}; manifest ${manifest.rows} rows, ${manifest.md5}`);
    if (existsSync(join(dir, "rows.json"))) {
      const d = diffRows(readJson(dir, "rows.json"), rowMd5s(rows));
      for (const [k, list] of Object.entries(d)) if (list.length) say(`     ${k} ${list.length}: ${list.slice(0, 8).join(", ")}${list.length > 8 ? " ..." : ""}`);
    }
  }

  const sw = readJson(dir, "switch.json").find((r) => r.mode_id === manifest.topic);
  say(`     switch: ${manifest.topic} ${sw ? `${sw.live_version} (since ${sw.changed_at})` : "no row (the code's default applies)"}`);

  const serving = skillServing({ topic: manifest.topic, grade: manifest.grade, items });
  for (const s of serving) {
    if (s.gap) ok = false;
    say(`${s.gap ? "GAP " : "     "} ${s.skillId}: ${s.count} items, ${s.rows} rows${s.holes.length ? `; no ${s.holes.join(", ")} rows` : ""}`);
  }
  const perModel = new Map();
  for (const i of items) {
    const k = modelIdOfItem(i.itemId) || `script ${i.blueprintId}`;
    perModel.set(k, (perModel.get(k) || 0) + 1);
  }
  say(`     ${items.length} rows from ${perModel.size} models and script rows`);
  return ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`readiness: ${err.message}\n`);
      process.exit(2);
    });
}
