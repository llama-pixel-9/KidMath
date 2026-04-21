#!/usr/bin/env node
/* Generates a seed SQL migration for the item_bank table from the bundled
 * items across every family (application + conceptual + procedural).
 *
 * Each run writes a NEW timestamped migration file under
 * supabase/migrations/, because Supabase's migration tracker keys off the
 * filename — overwriting a previously-applied file does not cause the
 * remote database to re-execute it. A fresh filename guarantees that
 * `supabase db push` applies the new seed.
 *
 * The migration body uses `insert ... on conflict (item_id) do update set`
 * so running it is idempotent: existing rows are refreshed and new rows
 * are inserted.
 *
 * Usage:
 *   node scripts/generateBankSeed.js              # writes a new timestamped migration
 *   node scripts/generateBankSeed.js --stdout     # prints to stdout instead
 *   npm run bank:seed                             # same as the default
 *
 * The older fixed-name files (0004_seed_item_bank.sql,
 * 0008_reapply_item_bank_seed.sql) are left in place as historical
 * snapshots; they remain valid migrations but are not regenerated.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

import { BUNDLED_ITEMS } from "../src/itemBank/bundle.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "..", "supabase", "migrations");

function sqlEscape(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonbLiteral(obj) {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function rowSql(item) {
  const [levelMin, levelMax] = item.levelRange;
  return `(${[
    sqlEscape(item.itemId),
    sqlEscape(item.modeId),
    sqlEscape(item.itemFamily || "application"),
    sqlEscape(item.subskill),
    sqlEscape(item.structureType),
    String(levelMin),
    String(levelMax),
    sqlEscape(item.reviewStatus || "draft"),
    jsonbLiteral(item.question),
    sqlEscape(item.representationType || item.question?.display?.representation || null),
    item.source ? jsonbLiteral(item.source) : "null",
  ].join(", ")})`;
}

function timestamp() {
  // YYYYMMDDHHMMSS — Supabase's preferred migration version format.
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    String(d.getUTCFullYear()) +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}

function buildSql(versionLabel) {
  const header =
    `-- Migration: ${versionLabel}_seed_item_bank\n` +
    "-- Auto-generated from src/itemBank/bundle.js (application +\n" +
    "-- conceptual + procedural bundled items) by\n" +
    "-- scripts/generateBankSeed.js. Each invocation writes a new\n" +
    "-- timestamped migration so `supabase db push` re-applies the\n" +
    "-- upserts on every bank change.\n\n";

  const rows = BUNDLED_ITEMS.map(rowSql).join(",\n  ");
  const insert =
    "insert into public.item_bank (\n" +
    "  item_id, mode_id, item_family, subskill, structure_type,\n" +
    "  level_min, level_max, review_status, payload,\n" +
    "  representation_type, source\n" +
    ") values\n  " +
    rows +
    "\non conflict (item_id) do update set\n" +
    "  mode_id            = excluded.mode_id,\n" +
    "  item_family        = excluded.item_family,\n" +
    "  subskill           = excluded.subskill,\n" +
    "  structure_type     = excluded.structure_type,\n" +
    "  level_min          = excluded.level_min,\n" +
    "  level_max          = excluded.level_max,\n" +
    "  review_status      = excluded.review_status,\n" +
    "  payload            = excluded.payload,\n" +
    "  representation_type= excluded.representation_type,\n" +
    "  source             = excluded.source,\n" +
    "  updated_at         = now();\n";

  return header + insert;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const toStdout = args.has("--stdout");

  const version = timestamp();
  const sql = buildSql(version);

  if (toStdout) {
    process.stdout.write(sql);
    return;
  }

  const filename = `${version}_seed_item_bank.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);
  fs.writeFileSync(filepath, sql);
  process.stderr.write(
    `Wrote ${BUNDLED_ITEMS.length} items to supabase/migrations/${filename}\n`,
  );
  process.stderr.write(
    "Run `supabase db push` to apply. The seed is idempotent via ON CONFLICT DO UPDATE.\n",
  );
}

main();
