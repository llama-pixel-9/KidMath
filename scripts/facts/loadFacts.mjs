#!/usr/bin/env node
/**
 * Load the Math Facts rows into item_bank (fact fluency plan, B3 step 1).
 *
 * The rows are the ones the app bundles (src/facts/factItems.js →
 * factBankItems), written as version 2 with the plan row they serve
 * (`blueprint_id`). Nothing is typed by hand: this script writes the SQL and
 * the checksum the database must reproduce afterwards.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/facts/loadFacts.mjs --sql <dir> [--status draft|approved]
 *     writes one self-contained statement per operation (add.sql, sub.sql,
 *     mul.sql, div.sql) and checksum.sql
 *   node --import ./scripts/lib/registerResolve.js scripts/facts/loadFacts.mjs --try <id,id,...> [--status ...]
 *     prints a read-only statement that builds just those rows and returns
 *     their checksum, and the checksum it must return: proof the SQL builds
 *     what the app bundles, before anything is written
 *   node --import ./scripts/lib/registerResolve.js scripts/facts/loadFacts.mjs [--status ...]
 *     prints the md5 that checksum.sql must return once every row is in
 *
 * Run each statement with the Supabase SQL editor or the MCP execute_sql
 * tool. 1,886 rows of JSON are too much to paste, so a statement carries
 * each row as a short tuple (`add-8-5-plain`, its hint lines by number) plus
 * one list of the distinct hint lines, and builds the payload in SQL the
 * way factQuestion does. The checksum is what proves the SQL and the JS
 * agree, row for row.
 *
 * Rerunnable: a row that exists is updated in place, unless it is not a
 * Math Facts v2 row, someone retired it in the review queue, or this is a
 * draft load and the row was already reviewed (a draft load never undoes an
 * approval).
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { factBankItems } from "../../src/facts/factItems.js";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const status = flag("--status") || "draft";
if (!["draft", "approved"].includes(status)) throw new Error(`--status must be draft or approved, not ${status}`);

const items = factBankItems().map((item) => ({ ...item, reviewStatus: status }));

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
  ].join("|");

const byteOrder = (x, y) => Buffer.compare(Buffer.from(x.itemId), Buffer.from(y.itemId));
const checksumOf = (list) => createHash("md5").update([...list].sort(byteOrder).map(rowLine).join("\n")).digest("hex");
const expected = checksumOf(items);

const CHECKSUM_OF = (from) => `select count(*) as rows,
       md5(string_agg(
         item_id || '|' || payload::text || '|' || hint::text || '|' || blueprint_id || '|' ||
         level_min || '-' || level_max || '|' || item_family || '|' || subskill || '|' ||
         structure_type || '|' || version || '|' || review_status,
         E'\\n' order by item_id collate "C")) as checksum
  ${from}`;
const CHECKSUM_SQL = `${CHECKSUM_OF("from public.item_bank\n where mode_id = 'mathFacts'")};\n`;

// ── One statement per operation ──────────────────────────────────────────

function statementFor(rows, { write = true } = {}) {
  const op = rows[0].structureType.split("-")[0];
  const lines = new Map();
  const pictures = new Map();
  const blueprints = new Map();
  const index = (map, key) => {
    if (!map.has(key)) map.set(key, map.size);
    return map.get(key);
  };
  const tuples = rows.map((i) => {
    const id = i.itemId.replace(/^mathFacts-v2-/, "");
    const shown = i.structureType.endsWith("-trueFalse") ? Number(i.question.display.promptText.split("=")[1]) : null;
    return [
      id,
      index(blueprints, i.blueprintId),
      index(lines, i.hint.nudge),
      i.hint.steps.map((s) => index(lines, s)),
      i.hint.picture ? index(pictures, JSON.stringify(i.hint.picture)) : -1,
      shown,
    ];
  });
  const bp = [...blueprints.keys()].map((id) => [id, ...rows.find((i) => i.blueprintId === id).levelRange]);
  const dollar = (tag, text) => {
    if (text.includes(`$${tag}$`)) throw new Error(`text contains the quote tag ${tag}`);
    return `$${tag}$${text}$${tag}$`;
  };
  const head = `-- Math Facts rows, ${op}: ${rows.length} rows. Generated by scripts/facts/loadFacts.mjs.
with
lines as (
  select (n - 1)::int as i, t
    from jsonb_array_elements_text(${dollar("l", JSON.stringify([...lines.keys()]))}::jsonb) with ordinality as x(t, n)
),
pics as (
  select (n - 1)::int as i, p
    from jsonb_array_elements(${dollar("p", JSON.stringify([...pictures.keys()].map((p) => JSON.parse(p))))}::jsonb) with ordinality as x(p, n)
),
bps as (
  select (n - 1)::int as i, b->>0 as id, (b->>1)::int as lo, (b->>2)::int as hi
    from jsonb_array_elements(${dollar("b", JSON.stringify(bp))}::jsonb) with ordinality as x(b, n)
),
tuples as (
  select t->>0 as id, (t->>1)::int as bp, (t->>2)::int as nudge, t->3 as steps, (t->>4)::int as pic,
         (t->>5)::int as shown
    from jsonb_array_elements(${dollar("t", JSON.stringify(tuples))}::jsonb) as x(t)
),
facts as (
  select t.*,
         split_part(t.id, '-', 1) as op,
         split_part(t.id, '-', 2)::int as a,
         split_part(t.id, '-', 3)::int as b,
         split_part(t.id, '-', 4) as fmt
    from tuples t
),
signed as (
  select f.*,
         case f.op when 'add' then '+' when 'sub' then '−' when 'mul' then '×' else '÷' end as sign,
         case f.op when 'add' then f.a + f.b when 'sub' then f.a - f.b when 'mul' then f.a * f.b else f.a / f.b end as answer,
         case when f.a <= 10 then 10 else 20 end as line_max
    from facts f
),
built as (
  select s.*,
         s.a || ' ' || s.sign || ' ' || s.b || ' = ?' as plain,
         jsonb_build_object('a', s.a, 'b', s.b, 'op', s.sign, 'answer', s.answer, 'answerType', 'numberPad') as base
    from signed s
),
payloads as (
  select b.id, b.bp, b.nudge, b.steps, b.pic, b.op, b.fmt,
         case b.fmt
           when 'plain' then b.base || jsonb_build_object('display', jsonb_build_object('promptText', b.plain, 'layout', 'horizontal'))
           when 'stacked' then b.base || jsonb_build_object('display', jsonb_build_object('promptText', b.plain, 'layout', 'vertical'))
           when 'missing' then b.base || jsonb_build_object('b', null, 'answer', b.b,
             'display', jsonb_build_object('promptText', b.a || ' ' || b.sign || ' ? = ' || b.answer))
           when 'trueFalse' then jsonb_build_object('a', b.a, 'b', b.b, 'op', b.sign,
             'answer', case when b.shown = b.answer then 'Yes' else 'No' end,
             'answerType', 'choice', 'choices', '["Yes", "No"]'::jsonb,
             'display', jsonb_build_object('promptText', b.a || ' ' || b.sign || ' ' || b.b || ' = ' || b.shown, 'subPrompt', 'Is this right?'))
           when 'tenFrame' then b.base || jsonb_build_object('answerType', 'tenFrame',
             'display', jsonb_build_object('promptText', 'How many counters in all?', 'filled', b.a, 'filledB', b.b, 'frames', 1, 'frameMode', 'count'))
           when 'takeAway' then b.base || jsonb_build_object('answerType', 'tenFrame',
             'display', jsonb_build_object('promptText', 'How many counters are left?', 'filled', b.a, 'takeAway', b.b, 'frames', 1, 'frameMode', 'count'))
           when 'hop' then b.base || jsonb_build_object('answerType', 'numberLine',
             'display', jsonb_build_object('promptText', b.plain, 'min', 0, 'max', b.line_max, 'step', 1,
               'labelEvery', case when b.line_max > 10 then 2 else 1 end, 'from', b.b, 'to', b.a, 'lineMode', 'jump'))
           when 'array' then b.base || jsonb_build_object('display', jsonb_build_object('promptText', b.plain, 'figure', 'array',
             'array', jsonb_build_object('rows', b.a, 'cols', b.b)))
         end as payload
    from built b
),
fact_rows as (
  select 'mathFacts-v2-' || p.id as item_id,
         case when p.fmt in ('missing', 'trueFalse') then 'conceptual' else 'procedural' end as item_family,
         p.op || 'Facts' as subskill,
         p.op || '-' || p.fmt as structure_type,
         bps.lo as level_min, bps.hi as level_max, bps.id as blueprint_id,
         p.payload,
         jsonb_build_object('nudge', (select t from lines where i = p.nudge),
                            'steps', (select jsonb_agg(l.t order by s.n) from jsonb_array_elements_text(p.steps) with ordinality as s(v, n)
                                        join lines l on l.i = s.v::int))
           || coalesce((select jsonb_build_object('picture', pics.p) from pics where pics.i = p.pic), '{}'::jsonb) as hint
    from payloads p
    join bps on bps.i = p.bp
)
`;
  if (!write) return `${head}${CHECKSUM_OF(`from (select *, 2 as version, '${status}' as review_status from fact_rows) r`)};\n`;
  return `${head}insert into public.item_bank
  (item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, review_status, payload, version, hint, blueprint_id)
select item_id, 'mathFacts', item_family, subskill, structure_type, level_min, level_max, '${status}', payload, 2, hint, blueprint_id
  from fact_rows
on conflict (item_id) do update
   set item_family = excluded.item_family, subskill = excluded.subskill, structure_type = excluded.structure_type,
       level_min = excluded.level_min, level_max = excluded.level_max, review_status = excluded.review_status,
       payload = excluded.payload, version = excluded.version, hint = excluded.hint, blueprint_id = excluded.blueprint_id
 where item_bank.mode_id = 'mathFacts' and item_bank.version = 2 and item_bank.review_status <> 'retired'
   and (excluded.review_status <> 'draft' or item_bank.review_status = 'draft');
`;
}

if (args.includes("--sql")) {
  const dir = flag("--sql");
  mkdirSync(dir, { recursive: true });
  for (const op of ["add", "sub", "mul", "div"]) {
    const sql = statementFor(items.filter((i) => i.structureType.startsWith(`${op}-`)));
    writeFileSync(join(dir, `${op}.sql`), sql);
    process.stdout.write(`${op}.sql  ${(sql.length / 1024).toFixed(1)} KB\n`);
  }
  writeFileSync(join(dir, "checksum.sql"), CHECKSUM_SQL);
}
if (args.includes("--try")) {
  const ids = new Set(flag("--try").split(",").map((id) => `mathFacts-v2-${id}`));
  const picked = items.filter((i) => ids.has(i.itemId));
  if (picked.length !== ids.size) throw new Error("--try: unknown id");
  const ops = new Set(picked.map((i) => i.structureType.split("-")[0]));
  if (ops.size !== 1) throw new Error("--try: one operation at a time");
  process.stdout.write(statementFor(picked, { write: false }));
  process.stdout.write(`-- expected: rows ${picked.length}, checksum ${checksumOf(picked)}\n`);
} else {
  process.stdout.write(`rows ${items.length}, status ${status}, expected checksum ${expected}\n`);
}
