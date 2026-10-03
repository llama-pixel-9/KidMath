/**
 * Shared plumbing for the live-step scripts (scripts/live/): argument
 * parsing, the export folder the database reads land in, hashing, git
 * facts and the run folder.
 *
 * No script here connects to the database. Every read arrives as a JSON
 * file in an export folder (the SELECTs come from exportSql.mjs, run by a
 * person or an agent with read-only access), and every write leaves as a
 * SQL file for a human-approved run.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "../../itemGen/qc/qcCli.js";

export { parseArgs };

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** sha256 of a file's bytes, or null when it does not exist. */
export function fileSha(path) {
  return existsSync(path) ? sha256(readFileSync(path)) : null;
}

export function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return path;
}

export const writeJson = (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

/** HEAD and whether the tree has changes (a layout verdict is only as good as the code that drew it). */
export function gitFacts(cwd = process.cwd()) {
  const run = (args) => {
    try {
      return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return null;
    }
  };
  const status = run(["status", "--porcelain"]);
  return { head: run(["rev-parse", "HEAD"]), dirty: status == null ? null : status.length > 0 };
}

/** The last commit that touched a file. */
export function lastCommitOf(path, cwd = process.cwd()) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%H", "--", path], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/** "2026-10-03T12:34:56.789Z" -> "20261003T123456Z". */
export const stamp = (date = new Date()) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

/**
 * The export files a script reads, by name: `name.json`, or pages
 * `name-001.json`, `name-002.json`, ... concatenated in name order. Each
 * holds a JSON array of rows (what the SELECT returned), or { rows: [...] }.
 */
export function readExportTable(dir, name, { required = true } = {}) {
  const files = readdirSync(dir)
    .filter((f) => f === `${name}.json` || new RegExp(`^${name}-\\d+\\.json$`).test(f))
    .sort();
  if (!files.length) {
    if (required) throw new Error(`export ${dir}: no ${name}.json (or ${name}-001.json pages); see scripts/live/exportSql.mjs`);
    return null;
  }
  const rows = [];
  for (const f of files) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(dir, f), "utf8"));
    } catch (err) {
      throw new Error(`export ${dir}/${f}: ${err.message}`);
    }
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rows) ? parsed.rows : null;
    if (!list) throw new Error(`export ${dir}/${f}: expected a JSON array of rows`);
    rows.push(...list);
  }
  return { rows, files };
}

/**
 * Check each table against counts.json (the count(*) the same WHERE
 * returns), and that no key repeats: a short page or a page read twice is
 * a wrong read, not a slow one. Returns a list of problems.
 */
export function checkExportCounts(tables, counts, keys) {
  const problems = [];
  for (const [name, table] of Object.entries(tables)) {
    if (!table) continue;
    const want = counts?.[name];
    if (want == null) problems.push(`counts.json has no count for ${name}`);
    else if (Number(want) !== table.rows.length) problems.push(`${name}: ${table.rows.length} rows exported, count(*) says ${want}`);
    const key = keys[name];
    if (key) {
      const seen = new Set();
      for (const r of table.rows) {
        if (seen.has(r[key])) {
          problems.push(`${name}: ${key} ${r[key]} appears twice (a page read twice?)`);
          break;
        }
        seen.add(r[key]);
      }
    }
  }
  return problems;
}

/** counts.json: one row ({ item_models: n, ... }) or a list holding it. */
export function readCounts(dir) {
  const path = join(dir, "counts.json");
  if (!existsSync(path)) throw new Error(`export ${dir}: no counts.json (the count(*) cross-check; see scripts/live/exportSql.mjs)`);
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const row = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!row || typeof row !== "object") throw new Error(`${path}: expected one row of counts`);
  return row;
}

/** Load a manifest module (src/itemBank/v2/manifests/*.js or a run's manifest.js). */
export async function loadManifest(path) {
  const { pathToFileURL } = await import("node:url");
  const { resolve } = await import("node:path");
  const mod = await import(`${pathToFileURL(resolve(path)).href}?t=${Date.now()}`);
  const manifest = mod.default;
  if (!manifest || typeof manifest !== "object" || !manifest.topic) throw new Error(`${path}: not a live-step manifest (default export with topic, grade, models)`);
  return manifest;
}

/** A manifest as the committed module's text. */
export function manifestModule(manifest) {
  return `/**
 * Live-step manifest: ${manifest.topic}, grade ${manifest.grade}. Written by
 * scripts/live/prepare.mjs (kept current by scripts/live/readiness.mjs); do
 * not edit by hand. Each model's rows are refilled from src/itemModels at
 * the listed seeds (src/itemBank/v2/modelRows.js), and liveStep.spec checks
 * the refill against md5, the checksum the database must reproduce.
 */
export default ${JSON.stringify(manifest, null, 2).replace(/\[\n\s*(-?\d+(?:,\n\s*-?\d+)*)\n\s*\]/g, (_, nums) => `[${nums.split(/,\s*/).join(", ")}]`)};
`;
}

export const sqlString = (text) => `'${String(text).replace(/'/g, "''")}'`;

/** Dollar-quote JSON for a statement, refusing text that holds the tag. */
export function dollar(tag, text) {
  if (text.includes(`$${tag}$`)) throw new Error(`text contains the quote tag $${tag}$`);
  return `$${tag}$${text}$${tag}$`;
}
