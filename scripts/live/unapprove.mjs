#!/usr/bin/env node
/**
 * Rollback of a live-step run (plan C.5.9): the SQL that moves the run's
 * approved rows back to draft, keyed on source->>'run'. Prints it (or
 * writes --out); never runs it, never deletes. The preview query returns
 * how many rows the update would touch, to compare with the expected count
 * printed beside it before anyone runs the update.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/live/unapprove.mjs <topic> --run <run> [--manifest <manifest.js>] [--out <file.sql>]
 *
 * With --manifest the expected count is the manifest's rows of that run.
 */
import { pathToFileURL } from "node:url";
import { liveRunWhere, runRowCount, writeOrPrint } from "./lib/rollback.mjs";
import { parseArgs } from "./lib/common.mjs";

export function unapproveSql(topic, run, { expected = null } = {}) {
  const where = `${liveRunWhere(topic, run)} and review_status = 'approved'`;
  return `-- Unapprove live-step run ${run} (${topic}): its approved v2 rows go back to draft. Nothing is deleted.
-- 1. Preview (read-only). Expected: ${expected ?? "the run's approved rows"}.
select count(*) as would_unapprove from public.item_bank where ${where};

-- 2. The update, once the preview matches.
with u as (
  update public.item_bank set review_status = 'draft'
   where ${where}
  returning 1
)
select count(*) as unapproved from u;
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { flags: ["help"], options: ["run", "manifest", "out"] });
  const topic = args.positional[0];
  if (args.flags.has("help") || !topic || !args.options.run) {
    process.stdout.write("unapprove.mjs <topic> --run <run> [--manifest <manifest.js>] [--out <file.sql>]\n");
    return args.flags.has("help") ? 0 : 2;
  }
  const expected = args.options.manifest ? await runRowCount(args.options.manifest, args.options.run) : null;
  writeOrPrint(unapproveSql(topic, args.options.run, { expected }), args.options.out);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`unapprove: ${err.message}\n`);
      process.exit(2);
    });
}
