#!/usr/bin/env node
/**
 * Load the Multi-Digit Math script rows into item_bank (calc list decision 3:
 * rows 1-4 and 16-22 of src/blueprints/g2AddsubCalc.json, built by
 * src/multiDigit/calcItems.js → calcBankItems).
 *
 * The rows are written as version 2, with the blueprint row they serve
 * (`blueprint_id`), their tier (`difficulty`) and their tags. Nothing is
 * typed by hand: this script writes the SQL and the checksum the database
 * must reproduce afterwards, the way scripts/facts/loadFacts.mjs does for
 * Math Facts. Every item passes checkCalcItem first; one problem and
 * nothing is written.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/multiDigit/loadCalcItems.mjs --sql <dir> [--status draft|approved]
 *     writes one self-contained statement per row (calc-g2-add-100.sql, ...)
 *     and checksum.sql
 *   node --import ./scripts/lib/registerResolve.js scripts/multiDigit/loadCalcItems.mjs --try <itemId,itemId,...> [--status ...]
 *     prints a read-only statement that builds just those rows and returns
 *     their checksum, and the checksum it must return: proof the SQL builds
 *     what the module makes, before anything is written
 *   node --import ./scripts/lib/registerResolve.js scripts/multiDigit/loadCalcItems.mjs [--status ...]
 *     prints the md5 that checksum.sql must return once every row is in
 *
 * Run each statement with the Supabase SQL editor or the MCP execute_sql
 * tool, after the blueprint rows are loaded (blueprint_id is a foreign key)
 * and with the topic's switch row at preview. 600 rows are small enough to
 * carry whole: each statement holds its rows as JSON and inserts them with
 * jsonb_to_recordset.
 *
 * Rerunnable: a row that exists is updated in place, unless it is not a
 * Multi-Digit Math v2 row, someone retired it in the review queue, or this
 * is a draft load and the row was already reviewed (a draft load never
 * undoes an approval). The default status is draft: Sai reviews a sample
 * before the rows are approved (decision 3).
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CALC_ROW_IDS, calcBankItems, checkCalcItem } from "../../src/multiDigit/calcItems.js";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const status = flag("--status") || "draft";
if (!["draft", "approved"].includes(status)) throw new Error(`--status must be draft or approved, not ${status}`);

const items = calcBankItems().map((item) => ({ ...item, reviewStatus: status }));

// The script route's gate: every item, before anything is written.
const problems = items.flatMap((item) => checkCalcItem(item).map((p) => `${item.itemId}: ${p}`));
if (problems.length) {
  process.stderr.write(`${problems.length} problems, nothing written:\n${problems.slice(0, 20).join("\n")}\n`);
  process.exit(1);
}

// ── jsonb's text form, so a checksum taken in Postgres matches one taken here.
// Keys are ordered by length, then bytewise; ", " and ": " separate.
function jsonbText(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(jsonbText).join(", ")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort((x, y) => Buffer.byteLength(x) - Buffer.byteLength(y) || Buffer.compare(Buffer.from(x), Buffer.from(y)));
    return `{${keys.map((k) => `${JSON.stringify(k)}: ${jsonbText(value[k])}`).join(", ")}}`;
  }
  return JSON.stringify(value);
}

const rowLine = (i) =>
  [
    i.itemId,
    jsonbText(i.question),
    jsonbText(i.hint),
    i.blueprintId,
    `${i.levelRange[0]}-${i.levelRange[1]}`,
    i.itemFamily,
    i.subskill,
    i.structureType,
    i.version,
    i.reviewStatus,
    i.difficulty,
    jsonbText(i.tags),
  ].join("|");

const byteOrder = (x, y) => Buffer.compare(Buffer.from(x.itemId), Buffer.from(y.itemId));
const checksumOf = (list) => createHash("md5").update([...list].sort(byteOrder).map(rowLine).join("\n")).digest("hex");
const expected = checksumOf(items);

const CHECKSUM_OF = (from) => `select count(*) as rows,
       md5(string_agg(
         item_id || '|' || payload::text || '|' || hint::text || '|' || blueprint_id || '|' ||
         level_min || '-' || level_max || '|' || item_family || '|' || subskill || '|' ||
         structure_type || '|' || version || '|' || review_status || '|' || difficulty || '|' || tags::text,
         E'\\n' order by item_id collate "C")) as checksum
  ${from}`;
const CHECKSUM_SQL = `${CHECKSUM_OF("from public.item_bank\n where mode_id = 'multiDigit' and version = 2 and blueprint_id in (" +
  CALC_ROW_IDS.map((id) => `'${id}'`).join(", ") +
  ")")};\n`;

// ── One statement per row ────────────────────────────────────────────────

function statementFor(rows, { write = true } = {}) {
  const json = JSON.stringify(
    rows.map((i) => ({
      item_id: i.itemId,
      item_family: i.itemFamily,
      subskill: i.subskill,
      structure_type: i.structureType,
      level_min: i.levelRange[0],
      level_max: i.levelRange[1],
      payload: i.question,
      hint: i.hint,
      blueprint_id: i.blueprintId,
      difficulty: i.difficulty,
      tags: i.tags,
    }))
  );
  if (json.includes("$c$")) throw new Error("rows contain the quote tag $c$");
  const head = `-- Multi-Digit Math script rows, ${rows[0].blueprintId}: ${rows.length} rows. Generated by scripts/multiDigit/loadCalcItems.mjs.
with calc_rows as (
  select * from jsonb_to_recordset($c$${json}$c$::jsonb) as r(
    item_id text, item_family text, subskill text, structure_type text, level_min int, level_max int,
    payload jsonb, hint jsonb, blueprint_id text, difficulty text, tags jsonb)
)
`;
  if (!write) return `${head}${CHECKSUM_OF(`from (select *, 2 as version, '${status}' as review_status from calc_rows) r`)};\n`;
  return `${head}insert into public.item_bank
  (item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, review_status, payload, version, hint,
   blueprint_id, difficulty, tags)
select item_id, 'multiDigit', item_family, subskill, structure_type, level_min, level_max, '${status}', payload, 2, hint,
       blueprint_id, difficulty, tags
  from calc_rows
on conflict (item_id) do update
   set item_family = excluded.item_family, subskill = excluded.subskill, structure_type = excluded.structure_type,
       level_min = excluded.level_min, level_max = excluded.level_max, review_status = excluded.review_status,
       payload = excluded.payload, version = excluded.version, hint = excluded.hint, blueprint_id = excluded.blueprint_id,
       difficulty = excluded.difficulty, tags = excluded.tags
 where item_bank.mode_id = 'multiDigit' and item_bank.version = 2 and item_bank.review_status <> 'retired'
   and (excluded.review_status <> 'draft' or item_bank.review_status = 'draft');
`;
}

if (args.includes("--sql")) {
  const dir = flag("--sql");
  mkdirSync(dir, { recursive: true });
  for (const rowId of CALC_ROW_IDS) {
    const sql = statementFor(items.filter((i) => i.blueprintId === rowId));
    writeFileSync(join(dir, `${rowId}.sql`), sql);
    process.stdout.write(`${rowId}.sql  ${(sql.length / 1024).toFixed(1)} KB\n`);
  }
  writeFileSync(join(dir, "checksum.sql"), CHECKSUM_SQL);
}
if (args.includes("--try")) {
  const ids = new Set(flag("--try").split(","));
  const picked = items.filter((i) => ids.has(i.itemId));
  if (picked.length !== ids.size) throw new Error("--try: unknown id");
  process.stdout.write(statementFor(picked, { write: false }));
  process.stdout.write(`-- expected: rows ${picked.length}, checksum ${checksumOf(picked)}\n`);
} else {
  process.stdout.write(`rows ${items.length}, status ${status}, expected checksum ${expected}\n`);
}
