#!/usr/bin/env node
/* Orchestrates the exemplar -> LLM -> validate -> Supabase(draft) pipeline
 * for one or more cells. See scripts/itemGen/README.md for usage.
 */

import { loadExemplars, listCellsWithExemplars } from "./loadExemplars.js";
import { validateDrafts } from "./validateDrafts.js";
import { writeDrafts } from "./writeDrafts.js";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

async function loadProvider(name) {
  const mod = await import(`./providers/${name}.js`);
  if (typeof mod.generate !== "function") {
    throw new Error(`Provider ${name} must export a generate({exemplars, n}) function`);
  }
  return mod.generate;
}

async function runCell(cell, { limit, providerName, dryRun }) {
  const exemplars = loadExemplars(cell);
  if (exemplars.length === 0) {
    process.stdout.write(
      `[skip] no exemplars for ${cell.modeId}/${cell.subskill}/${cell.itemFamily}/${cell.levelBand}\n`
    );
    return { cell, wrote: 0, rejected: 0 };
  }
  const generate = await loadProvider(providerName);
  const rawCandidates = await generate({ exemplars, n: limit });
  const candidates = rawCandidates.map((c) => ({ ...c, provider: providerName }));

  const exemplarsById = new Map(exemplars.map((e) => [e.exemplarId, e]));
  const { accepted, rejected } = validateDrafts(candidates, { cell, exemplarsById });

  process.stdout.write(
    `[gen] ${cell.modeId}/${cell.subskill}/${cell.itemFamily}/${cell.levelBand}: ` +
      `${candidates.length} candidates -> ${accepted.length} accepted, ${rejected.length} rejected\n`
  );
  for (const rej of rejected) {
    process.stdout.write(`  reject ${rej.itemId}: ${rej.errors.join("; ")}\n`);
  }

  const { wrote } = await writeDrafts(accepted, { dryRun });
  process.stdout.write(`  wrote ${wrote} draft row(s)\n`);
  return { cell, wrote, rejected: rejected.length };
}

async function main() {
  const args = parseArgs(process.argv);
  const providerName = args.provider || process.env.KIDMATH_ITEMGEN_PROVIDER || "echo";
  const limit = Number(args.limit || 6);
  const dryRun = Boolean(args.dryRun);

  let cells;
  if (args.all) {
    cells = listCellsWithExemplars();
  } else if (args.mode && args.subskill && args.family && args.band) {
    cells = [
      {
        modeId: args.mode,
        subskill: args.subskill,
        itemFamily: args.family,
        levelBand: args.band,
      },
    ];
  } else {
    process.stderr.write(
      "Usage: generateDrafts.js --mode <m> --subskill <s> --family <f> --band <K-1|2-3|4-5>\n" +
        "   or: generateDrafts.js --all\n" +
        "   flags: --limit <n> --provider <name> --dryRun\n"
    );
    process.exit(2);
  }

  let totalWrote = 0;
  let totalRejected = 0;
  for (const cell of cells) {
    const { wrote, rejected } = await runCell(cell, { limit, providerName, dryRun });
    totalWrote += wrote;
    totalRejected += rejected;
  }
  process.stdout.write(`\nDone: ${totalWrote} written, ${totalRejected} rejected.\n`);
}

main().catch((err) => {
  process.stderr.write(`FAILED: ${err.stack || err.message}\n`);
  process.exit(1);
});
