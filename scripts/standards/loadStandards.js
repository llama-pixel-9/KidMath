/**
 * Print the SQL that copies the repo's standards files and blueprint rows
 * into the database, or the query that checks the database still matches.
 *
 *   node scripts/standards/loadStandards.js            # the load, one transaction
 *   node scripts/standards/loadStandards.js --prune    # also delete codes the files dropped
 *   node scripts/standards/loadStandards.js --check    # rows back = differences; none = in sync
 *   node scripts/standards/loadStandards.js --summary  # counts only
 *
 * Run the output in the Supabase SQL editor (or through the Supabase tools).
 * It needs no service key: the SQL runs as the database owner. The load is
 * safe to repeat: codes upsert, blueprint rows that are no longer drafts are
 * left alone, and model links are re-derived from item_models.spec.
 * See docs/standards-coverage.md.
 */
import { LOADED_CROSSWALKS, LOADED_FRAMEWORKS } from "../../src/standards/index.js";
import {
  blueprintDbRows,
  blueprintStandardDbRows,
  checkSql,
  crosswalkDbRows,
  loadSql,
  standardsDbRows,
} from "../../src/standards/dbRows.js";

const args = new Set(process.argv.slice(2));

if (args.has("--summary")) {
  const standards = standardsDbRows();
  const perFramework = Object.fromEntries(
    LOADED_FRAMEWORKS.map((fw) => [fw, standards.filter((s) => s.framework === fw).length])
  );
  console.log(
    JSON.stringify(
      {
        frameworks: perFramework,
        crosswalks: LOADED_CROSSWALKS,
        crosswalkLinks: crosswalkDbRows().length,
        blueprintRows: blueprintDbRows().length,
        blueprintLinks: blueprintStandardDbRows().length,
      },
      null,
      2
    )
  );
} else if (args.has("--check")) {
  process.stdout.write(checkSql());
} else {
  process.stdout.write(loadSql({ prune: args.has("--prune") }));
}
