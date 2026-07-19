#!/usr/bin/env node
/* Bulk item-draft generation across many cells via the Anthropic Batch API
 * (50% cheaper than per-request calls). One batch request per cell; results are
 * validated (numeric/duplicate gate) and written as draft rows, exactly like
 * the per-cell generateDrafts.js path.
 *
 * This is the Phase 4 accelerator: it turns filling the Grade 1-4 cell matrix
 * from an author-each-item grind into review-only work. Every item lands as
 * reviewStatus=draft and must clear the admin review queue first.
 *
 * Needs @anthropic-ai/sdk (npm i -D @anthropic-ai/sdk) + credentials, plus
 * SUPABASE_SERVICE_ROLE_KEY for the write step (omit for --dryRun).
 *
 * Usage:
 *   node scripts/itemGen/generateBatch.js --all --limit 13
 *   node scripts/itemGen/generateBatch.js --mode division --subskill partitioning \
 *        --family application --band 4-5 --limit 13
 *   flags: --limit <n> --model <id> --dryRun (build + print, do not submit)
 */

import { loadExemplars, listCellsWithExemplars } from "./loadExemplars.js";
import { validateDrafts } from "./validateDrafts.js";
import { writeDrafts } from "./writeDrafts.js";
import { buildCellPrompt, parseCandidates } from "./prompt.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function resolveCells(args) {
  if (args.all) return listCellsWithExemplars();
  if (args.mode && args.subskill && args.family && args.band) {
    return [
      { modeId: args.mode, subskill: args.subskill, itemFamily: args.family, levelBand: args.band },
    ];
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const limit = Number(args.limit || 13);
  const dryRun = Boolean(args.dryRun);
  const model = args.model || process.env.KIDMATH_ITEMGEN_MODEL || "claude-sonnet-5";

  const cells = resolveCells(args);
  if (!cells) {
    process.stderr.write(
      "Usage: generateBatch.js --all [--limit n]\n" +
        "   or: generateBatch.js --mode <m> --subskill <s> --family <f> --band <band>\n" +
        "   flags: --limit <n> --model <id> --dryRun\n"
    );
    process.exit(2);
  }

  // Build one request per cell that has exemplars.
  const entries = [];
  cells.forEach((cell, i) => {
    const exemplars = loadExemplars(cell);
    if (exemplars.length === 0) {
      process.stdout.write(
        `[skip] no exemplars for ${cell.modeId}/${cell.subskill}/${cell.itemFamily}/${cell.levelBand}\n`
      );
      return;
    }
    entries.push({
      customId: `c${i}`,
      cell,
      exemplars,
      prompt: buildCellPrompt({ exemplars, n: limit }),
    });
  });

  if (entries.length === 0) {
    process.stdout.write("No cells with exemplars to generate.\n");
    return;
  }

  if (dryRun) {
    process.stdout.write(
      `[dryRun] would submit ${entries.length} batch request(s) (model ${model}, ${limit} items each).\n` +
        `--- first prompt (${entries[0].cell.modeId}/${entries[0].cell.subskill}) ---\n${entries[0].prompt}\n`
    );
    return;
  }

  let Anthropic;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch {
    throw new Error(
      "generateBatch requires @anthropic-ai/sdk. Install with `npm i -D @anthropic-ai/sdk` " +
        "and set ANTHROPIC_API_KEY (or run `ant auth login`)."
    );
  }
  const client = new Anthropic();

  const batch = await client.messages.batches.create({
    requests: entries.map((e) => ({
      custom_id: e.customId,
      params: {
        model,
        max_tokens: 8192,
        messages: [{ role: "user", content: e.prompt }],
      },
    })),
  });
  process.stdout.write(`Submitted batch ${batch.id} with ${entries.length} request(s). Polling...\n`);

  // Poll until the batch finishes (most complete within an hour).
  let status = batch;
  while (status.processing_status !== "ended") {
    await sleep(15000);
    status = await client.messages.batches.retrieve(batch.id);
    process.stdout.write(`  status=${status.processing_status}\n`);
  }

  const byId = new Map(entries.map((e) => [e.customId, e]));
  let totalWrote = 0;
  let totalRejected = 0;

  for await (const result of await client.messages.batches.results(batch.id)) {
    const entry = byId.get(result.custom_id);
    if (!entry) continue;
    const label = `${entry.cell.modeId}/${entry.cell.subskill}/${entry.cell.itemFamily}/${entry.cell.levelBand}`;
    if (result.result.type !== "succeeded") {
      process.stdout.write(`  [${label}] ${result.result.type} — skipped\n`);
      continue;
    }
    const text = result.result.message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    let candidates;
    try {
      candidates = parseCandidates(text, { exemplars: entry.exemplars, n: limit, model }).map((c) => ({
        ...c,
        provider: "claude-batch",
      }));
    } catch (err) {
      process.stdout.write(`  [${label}] parse failed: ${err.message}\n`);
      continue;
    }

    const exemplarsById = new Map(entry.exemplars.map((e) => [e.exemplarId, e]));
    const { accepted, rejected } = validateDrafts(candidates, { cell: entry.cell, exemplarsById });
    const { wrote } = await writeDrafts(accepted, { dryRun: false });
    totalWrote += wrote;
    totalRejected += rejected.length;
    process.stdout.write(
      `  [${label}] ${candidates.length} candidates -> ${accepted.length} accepted, ${rejected.length} rejected, ${wrote} written\n`
    );
  }

  process.stdout.write(`\nDone: ${totalWrote} written, ${totalRejected} rejected.\n`);
}

main().catch((err) => {
  process.stderr.write(`FAILED: ${err.stack || err.message}\n`);
  process.exit(1);
});
