#!/usr/bin/env node
/**
 * Retire bank rows, as SQL for a human-approved run (never run here, never
 * a delete: an empty cell falls back to the generator, and a retired row
 * keeps its history).
 *
 *   v2, by live-step run (keyed on source->>'run'), all of it or some ids:
 *     retire.mjs <topic> --run <run> [--ids a,b,...] [--manifest <manifest.js>] [--out <file.sql>]
 *   v1, by item id, stamping a batch tag into the row's tags list:
 *     retire.mjs <topic> --v1 --ids a,b,... --tag <batch> [--out <file.sql>]
 *
 * A v1 retire filters coalesce(version, 1) = 1 and touches only rows whose
 * tags are a list (or null): v2 rows keep an object in `tags`, and
 * appending to it would corrupt it. Each file starts with a read-only
 * preview whose count must match the expected count before the update
 * runs. After a v2 retire, readiness.mjs --rewrite drops the rows from the
 * manifest.
 */
import { pathToFileURL } from "node:url";
import { liveRunWhere, runRowCount, writeOrPrint } from "./lib/rollback.mjs";
import { parseArgs, sqlString } from "./lib/common.mjs";

const idList = (ids) => ids.map(sqlString).join(", ");

export function retireRunSql(topic, run, { ids = null, expected = null } = {}) {
  const where = `${liveRunWhere(topic, run)} and review_status <> 'retired'${ids?.length ? ` and item_id in (${idList(ids)})` : ""}`;
  return `-- Retire ${ids?.length ? `${ids.length} rows of ` : ""}live-step run ${run} (${topic}). Nothing is deleted.
-- 1. Preview (read-only). Expected: ${expected ?? (ids?.length ? ids.length : "the run's rows")}.
select count(*) as would_retire from public.item_bank where ${where};

-- 2. The update, once the preview matches.
with u as (
  update public.item_bank set review_status = 'retired'
   where ${where}
  returning 1
)
select count(*) as retired from u;
`;
}

export function retireV1Sql(topic, ids, { tag }) {
  if (!ids?.length) throw new Error("a v1 retire names its rows: --ids");
  if (!tag || !/^[\w.:-]+$/.test(tag)) throw new Error("a v1 retire stamps a batch tag: --tag <letters, digits, . : - _>");
  const where = `mode_id = ${sqlString(topic)} and coalesce(version, 1) = 1 and review_status <> 'retired'
     and (tags is null or jsonb_typeof(tags) = 'array')
     and item_id in (${idList(ids)})`;
  return `-- Retire ${ids.length} version-1 ${topic} rows, tagged ${tag}. Nothing is deleted.
-- 1. Preview (read-only). Expected: ${ids.length}.
select count(*) as would_retire from public.item_bank
 where ${where};

-- 2. The update, once the preview matches.
with u as (
  update public.item_bank
     set review_status = 'retired', tags = coalesce(tags, '[]'::jsonb) || jsonb_build_array(${sqlString(tag)})
   where ${where}
  returning 1
)
select count(*) as retired from u;
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { flags: ["help", "v1"], options: ["run", "ids", "tag", "manifest", "out"] });
  const topic = args.positional[0];
  const ids = args.options.ids ? args.options.ids.split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (args.flags.has("help") || !topic || (!args.flags.has("v1") && !args.options.run)) {
    process.stdout.write("retire.mjs <topic> --run <run> [--ids a,b] [--manifest <m.js>] [--out <f.sql>]\nretire.mjs <topic> --v1 --ids a,b --tag <batch> [--out <f.sql>]\n");
    return args.flags.has("help") ? 0 : 2;
  }
  if (args.flags.has("v1")) {
    writeOrPrint(retireV1Sql(topic, ids, { tag: args.options.tag }), args.options.out);
    return 0;
  }
  const expected = ids?.length ? ids.length : args.options.manifest ? await runRowCount(args.options.manifest, args.options.run) : null;
  writeOrPrint(retireRunSql(topic, args.options.run, { ids, expected }), args.options.out);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`retire: ${err.message}\n`);
      process.exit(2);
    });
}
