#!/usr/bin/env node
/**
 * The read-only SELECTs whose results the live-step scripts read, one file
 * per result. Run each with the Supabase SQL editor or the MCP execute_sql
 * tool (read-only), and save each result as a JSON array of rows under the
 * name printed above it, in one export folder.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/live/exportSql.mjs <topic> --grade 2
 *     the count(*) cross-check (counts.json) first
 *   node --import ./scripts/lib/registerResolve.js scripts/live/exportSql.mjs <topic> --grade 2 --counts <dir>/counts.json
 *     then every table, item_bank paged by --page rows (default 1000):
 *     item_models.json, blueprint_rows.json, switch.json, identities-001.json ...
 *   ... exportSql.mjs <topic> --grade 2 --for readiness
 *     what readiness.mjs reads: live.json (the checksum), rows.json, retired.json, switch.json
 *
 * Options: --with-spec adds each model's spec to item_models.json (to look
 * at a drifted model; the drift check itself needs only spec_md5).
 *
 * item_bank reads page: an unpaginated read of the bank is a wrong read
 * (CLAUDE.md). prepare.mjs checks every table against counts.json and
 * refuses a short or doubled export.
 */
import { readFileSync } from "node:fs";
import { parseArgs, sqlString } from "./lib/common.mjs";
import { checksumSql, rowMd5Sql } from "../../src/itemModels/live/liveRows.js";
import { liveWhere } from "./lib/sql.mjs";

const HELP = `exportSql.mjs <topic> --grade <g> [--counts <counts.json>] [--page 1000] [--with-spec] [--for prepare|readiness]`;

/**
 * The display fields promptIdentity keys on (src/itemBank/index.js), read
 * back with the prompt so an exported row has the identity the bank item
 * has (liveStep.spec checks the round trip). Add a field here when
 * promptIdentity starts reading one.
 */
export const IDENTITY_DISPLAY_FIELDS = Object.freeze(["coins", "discMat", "mode", "cols", "filled", "filledB", "takeAway", "array", "layout", "lineMode", "from", "to"]);

const IDENTITY_PARTS = `(select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
          from jsonb_each(jsonb_build_object(
            ${IDENTITY_DISPLAY_FIELDS.map((f) => `'${f}', d->'${f}'`).join(", ")},
            'answerType', payload->'answerType',
            'choices', case when structure_type = 'chooseTrueEquation' then payload->'choices' end)) as e(k, v)
         where v is not null and v <> 'null'::jsonb)`;

export function exportQueries(topic, grade, { page = 1000, identities = null, withSpec = false } = {}) {
  const t = sqlString(topic);
  const g = sqlString(String(grade));
  const counts = `select (select count(*) from public.item_models where mode_id = ${t} and grade = ${g}) as item_models,
       (select count(*) from public.blueprint_rows where mode_id = ${t} and grade = ${g}) as blueprint_rows,
       (select count(*) from public.item_version_switch) as switch,
       (select count(*) from public.item_bank) as identities;
`;
  const out = [{ file: "counts.json", sql: counts }];
  if (identities == null) return out;
  out.push({
    file: "item_models.json",
    sql: `select id, mode_id, grade, difficulty, blueprint_id, review_status, reviewed_by, reviewed_at, updated_at,
       md5((spec - 'checks')::text) as spec_md5${withSpec ? ", spec - 'checks' as spec" : ""}
  from public.item_models
 where mode_id = ${t} and grade = ${g}
 order by id collate "C";
`,
  });
  out.push({
    file: "blueprint_rows.json",
    sql: `select id, mode_id, grade, difficulty, status, reviewed_by, reviewed_at
  from public.blueprint_rows
 where mode_id = ${t} and grade = ${g}
 order by id collate "C";
`,
  });
  out.push({ file: "switch.json", sql: `select mode_id, live_version, changed_at from public.item_version_switch order by mode_id collate "C";\n` });
  const pages = Math.max(1, Math.ceil(Number(identities) / page));
  for (let i = 0; i < pages; i += 1) {
    out.push({
      file: `identities-${String(i + 1).padStart(3, "0")}.json`,
      sql: `select item_id, mode_id, structure_type, review_status, version, source->>'run' as run, tags->>'grade' as grade,
       payload->'display'->>'promptText' as prompt,
       ${IDENTITY_PARTS} as parts
  from public.item_bank, lateral (select payload->'display' as d) x
 order by item_id collate "C"
 limit ${page} offset ${i * page};
`,
    });
  }
  return out;
}

export function readinessQueries(topic, grade) {
  const where = liveWhere(topic, grade);
  return [
    { file: "live.json", sql: checksumSql(where) },
    { file: "rows.json", sql: rowMd5Sql(where) },
    {
      file: "retired.json",
      sql: `select item_id, updated_at
  from public.item_bank
 where mode_id = ${sqlString(topic)} and version = 2 and review_status = 'retired' and tags->>'grade' = ${sqlString(String(grade))}
 order by item_id collate "C";
`,
    },
    { file: "switch.json", sql: `select mode_id, live_version, changed_at from public.item_version_switch order by mode_id collate "C";\n` },
  ];
}

function main() {
  const args = parseArgs(process.argv.slice(2), { flags: ["help", "with-spec"], options: ["grade", "counts", "page", "for"] });
  if (args.flags.has("help") || !args.positional[0] || !args.options.grade) {
    process.stdout.write(`${HELP}\n`);
    return args.flags.has("help") ? 0 : 2;
  }
  const topic = args.positional[0];
  const grade = args.options.grade;
  const purpose = args.options.for || "prepare";
  let queries;
  if (purpose === "readiness") {
    queries = readinessQueries(topic, grade);
  } else if (purpose === "prepare") {
    let identities = null;
    if (args.options.counts) {
      const parsed = JSON.parse(readFileSync(args.options.counts, "utf8"));
      identities = (Array.isArray(parsed) ? parsed[0] : parsed)?.identities;
      if (identities == null) throw new Error(`${args.options.counts}: no identities count`);
    }
    queries = exportQueries(topic, grade, { page: Number(args.options.page || 1000), identities, withSpec: args.flags.has("with-spec") });
    if (identities == null) {
      process.stdout.write("-- Save the result as counts.json, then rerun with --counts <dir>/counts.json for the tables.\n\n");
    }
  } else {
    throw new Error(`--for prepare or readiness, not ${purpose}`);
  }
  for (const q of queries) process.stdout.write(`-- ==> ${q.file}\n${q.sql}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
  try {
    process.exit(main());
  } catch (err) {
    process.stderr.write(`exportSql: ${err.message}\n`);
    process.exit(2);
  }
}
