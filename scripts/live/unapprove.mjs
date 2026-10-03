#!/usr/bin/env node
/**
 * Rollback of a live-step run (plan C.5.9): the SQL that moves the run's
 * approved rows back to draft, keyed on source->>'run'. Prints it (or
 * writes --out); never runs it, never deletes. The file starts with a
 * read-only preview, and its update fires only when exactly the expected
 * count matches (lib/sql.mjs guardedUpdateSql), so running the file whole
 * changes nothing on a wrong count.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/live/unapprove.mjs <topic> --run <run> (--manifest <manifest.js> | --expected <n>) [--out <file.sql>]
 *
 * The expected count is the manifest's rows of that run, or --expected.
 * prepare.mjs writes the same file for each run (rollback/unapprove-rows.sql).
 */
import { pathToFileURL } from "node:url";
import { liveRunWhere, runRowCount, writeOrPrint } from "./lib/rollback.mjs";
import { parseArgs } from "./lib/common.mjs";
import { guardedUpdateSql } from "./lib/sql.mjs";

export function unapproveSql(topic, run, { expected } = {}) {
  const where = `${liveRunWhere(topic, run)} and review_status = 'approved'`;
  return `-- Unapprove live-step run ${run} (${topic}): its approved v2 rows go back to draft. Nothing is deleted.
${guardedUpdateSql({ table: "public.item_bank", where, set: "review_status = 'draft'", expected, previewAs: "would_unapprove", updatedAs: "unapproved" })}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { flags: ["help"], options: ["run", "manifest", "expected", "out"] });
  const topic = args.positional[0];
  if (args.flags.has("help") || !topic || !args.options.run || (!args.options.manifest && args.options.expected == null)) {
    process.stdout.write("unapprove.mjs <topic> --run <run> (--manifest <manifest.js> | --expected <n>) [--out <file.sql>]\n");
    return args.flags.has("help") ? 0 : 2;
  }
  const expected = args.options.manifest ? await runRowCount(args.options.manifest, args.options.run) : Number(args.options.expected);
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
