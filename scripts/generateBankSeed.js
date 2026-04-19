#!/usr/bin/env node
/* Generates a seed SQL file for the item_bank table from the bundled
 * application items. Use this to keep migrations and the bundled snapshot
 * in sync.
 *
 * Usage:
 *   node scripts/generateBankSeed.js > supabase/migrations/0004_seed_item_bank.sql
 *   npm run bank:seed
 */

import { APPLICATION_ITEM_BANK } from "../src/itemBank/applicationItems.js";

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
  ].join(", ")})`;
}

function main() {
  const header =
    "-- Migration: 0004_seed_item_bank\n" +
    "-- Auto-generated from src/itemBank/applicationItems.js by\n" +
    "-- scripts/generateBankSeed.js. Re-run to refresh after bundle changes.\n\n";

  const rows = APPLICATION_ITEM_BANK.map(rowSql).join(",\n  ");
  const insert =
    "insert into public.item_bank (\n" +
    "  item_id, mode_id, item_family, subskill, structure_type,\n" +
    "  level_min, level_max, review_status, payload\n" +
    ") values\n  " +
    rows +
    "\non conflict (item_id) do update set\n" +
    "  mode_id        = excluded.mode_id,\n" +
    "  item_family    = excluded.item_family,\n" +
    "  subskill       = excluded.subskill,\n" +
    "  structure_type = excluded.structure_type,\n" +
    "  level_min      = excluded.level_min,\n" +
    "  level_max      = excluded.level_max,\n" +
    "  review_status  = excluded.review_status,\n" +
    "  payload        = excluded.payload,\n" +
    "  updated_at     = now();\n";

  process.stdout.write(header + insert);
}

main();
