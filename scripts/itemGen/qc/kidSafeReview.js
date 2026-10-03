#!/usr/bin/env node
/**
 * Kid-safe review — would a US public elementary school print this?
 *
 * Two passes, in this order:
 *
 *   1. LIST (deterministic) — every word the kid can read (prompt, choices,
 *      the figure's labels, the hint) against the kid-safe list. A hit fails
 *      the item outright and it is not sent on: no model call is spent on
 *      an item already known to be out.
 *
 *   2. SCHOOL-PRINTABLE (a model) — for the rest, the question a school
 *      asks: would it print this on a worksheet for this grade? The list
 *      cannot see a scene that is unsafe without a listed word ("Mia climbs
 *      out the window to fetch the ball"), or a stereotype built from plain
 *      words. The model must answer printable true or false with a reason.
 *
 * Takes bank items, raw item_bank rows, or item model specs (every string in
 * the spec is reviewed — template, samples, hints).
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/kidSafeReview.js <items.json>
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/kidSafeReview.js --from-bank money --limit 40
 *
 * Exit 1 when any item is not printable. When claude is not on PATH the
 * model pass is skipped loudly and only the list pass decides.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { findKidSafeHits } from "../../../src/content/kidSafeList.js";
import { kidFacingText, kidView, loadItems } from "./kidView.js";
import { askInBatches, BATCH_SIZE, claudeAvailable, DEFAULT_MODEL, parseArgs } from "./qcCli.js";

const HELP = `Kid-safe review: the kid-safe list, then a model asked whether a US public elementary school would print the item.

Usage:
  node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/kidSafeReview.js <items.json> [options]
  node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/kidSafeReview.js --from-bank <modeId> [options]

Input:
  <items.json>          array (or { items: [] }) of bank items, raw item_bank rows, or item model specs ({ id, grade, spec })
  --from-bank <modeId>  the bundled bank for one mode (src/itemBank/fullBank.js)

Options:
  --item <id[,id]>      only these item (or model) ids
  --limit <n>           at most n items
  --out <path>          report JSON (default qa-out/kid-safe-review.json; "-" for stdout)
  --model <name>        claude model (default: KIDMATH_QC_MODEL or Claude Code's pick)
  --list-only           run the kid-safe list and skip the model pass
  --dry-run             print the list hits and the first batch's prompt, then exit; no model call
  --help

Report: { source, model, total, notPrintable, listHits, skipped, items: [{ itemId, printable, reason, hits: [{ term, category }] }] }
Exit code 1 when any item is not printable. Needs \`claude\` (Claude Code) on PATH for the model pass; skips it loudly otherwise.`;

// Exported (with itemBlock and buildPrompt) for the live step's QC panels
// (scripts/live/qcPanels.mjs), which ask the same judge the same way.
export const SYSTEM = `You review math practice items for a US public elementary school (grades K to 5). For each item, decide whether the school would print it on a math worksheet for that grade and send it home.

Read everything the kid would read: the question, the picture description, the answer choices and the hint text. Judge the content, not the math — arithmetic, grammar and difficulty are checked elsewhere.

Say NOT printable when the item involves any of: weapons; violence, injury or death; alcohol, tobacco or drugs; gambling; dieting or people's body weight; romance; content specific to one religion; politics; scary or disturbing content; an activity unsafe for a kid on their own (cooking on a stove, crossing a highway, swimming unsupervised, using tools or fire); personal data (phone numbers, addresses, real people); brand names; gender, race or family stereotypes; put-downs or teasing.

Ordinary childhood life is printable: pets, sports and games, food and snacks, school, family, chores, birthdays, weather, nature, shopping with a grown-up, a game die, a target score, a toy. Do not fail an item for being plain or dull.

Reply with JSON only: an array with one object per item, in the order given:
  {"itemId": string, "printable": boolean, "reason": string}
reason is one sentence: what makes it unprintable, or why it is fine.
Include EVERY item you were given.`;

export function itemBlock(view) {
  if (view.kind === "model") {
    return [`itemId: ${view.itemId} (an item model: template, samples and hints)`, `grade: ${view.grade}`, "content:", ...view.text.map((t) => `  ${t}`)].join("\n");
  }
  const lines = [`itemId: ${view.itemId}`, `grade: ${view.grade}`, `question: ${view.prompt}`];
  if (view.subPrompt) lines.push(`below the question: ${view.subPrompt}`);
  if (view.figure) lines.push(`picture: ${view.figure}`);
  if (view.choices) lines.push(`choices: ${view.choices.map(String).join(" | ")}`);
  if (view.hint.length) lines.push(`hint text: ${view.hint.join(" / ")}`);
  return lines.join("\n");
}

export const buildPrompt = (views) => views.map(itemBlock).join("\n\n");

const hitList = (hits) => hits.map((h) => `"${h.term}" (${h.category})`).join(", ");

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    flags: ["help", "dry-run", "list-only"],
    options: ["from-bank", "item", "limit", "out", "model"],
  });
  if (args.flags.has("help")) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  const file = args.positional[0];
  if (args.positional.length > 1) throw new Error(`one input file, got ${args.positional.length}`);
  if (!file && !args.options["from-bank"]) throw new Error("give an items JSON file or --from-bank <modeId> (see --help)");
  if (file && args.options["from-bank"]) throw new Error("give a file or --from-bank, not both");

  const { entries, source } = await loadItems({
    file,
    fromBank: args.options["from-bank"],
    only: args.options.item ? args.options.item.split(",").map((s) => s.trim()).filter(Boolean) : [],
    limit: Number(args.options.limit || 0),
  });
  const views = entries.map(kidView);
  const model = args.options.model || DEFAULT_MODEL;
  const outPath = args.options.out || "qa-out/kid-safe-review.json";

  // Pass 1 — the list.
  const listSource = "src/content/kidSafeList.js";
  const hitsById = new Map(views.map((v) => [v.itemId, findKidSafeHits(kidFacingText(v))]));
  const clean = views.filter((v) => !hitsById.get(v.itemId).length);

  if (args.flags.has("dry-run")) {
    const flagged = views.filter((v) => hitsById.get(v.itemId).length);
    process.stdout.write(`--- list pass (${listSource}): ${flagged.length} of ${views.length} items hit ---\n`);
    for (const v of flagged) process.stdout.write(`${v.itemId}: ${hitList(hitsById.get(v.itemId))}\n`);
    process.stdout.write(`\n--- system prompt ---\n${SYSTEM}\n\n--- batch 1 of ${Math.ceil(clean.length / BATCH_SIZE)} (${Math.min(BATCH_SIZE, clean.length)} of ${clean.length} clean items) ---\n`);
    process.stdout.write(`${buildPrompt(clean.slice(0, BATCH_SIZE))}\n`);
    return 0;
  }

  const report = { source, list: listSource, model: model || "claude default", total: views.length, notPrintable: 0, listHits: 0, skipped: false, items: [] };

  // Pass 2 — the school, only for items the list let through.
  let replies = new Map();
  let failures = new Map();
  if (args.flags.has("list-only")) {
    report.skipped = true;
  } else if (!(await claudeAvailable())) {
    process.stderr.write("School-printable review SKIPPED: `claude` (Claude Code) is not on PATH. " + `Only the kid-safe list ran, on ${views.length} items.\n`);
    report.skipped = true;
  } else {
    ({ replies, failures } = await askInBatches(clean, { system: SYSTEM, buildPrompt, model, log: (m) => process.stderr.write(`kid-safe review ${m}\n`) }));
  }

  for (const view of views) {
    const hits = hitsById.get(view.itemId);
    let verdict;
    if (hits.length) {
      verdict = { printable: false, reason: `kid-safe list: ${hitList(hits)}` };
    } else if (report.skipped) {
      verdict = { printable: true, reason: "kid-safe list clean; school-printable review skipped" };
    } else if (failures.has(view.itemId)) {
      verdict = { printable: false, reason: `school-printable review failed: ${failures.get(view.itemId)}` };
    } else if (!replies.has(view.itemId)) {
      verdict = { printable: false, reason: "model returned no verdict for this item" };
    } else {
      const reply = replies.get(view.itemId);
      verdict = { printable: reply.printable === true, reason: typeof reply.reason === "string" ? reply.reason.trim() : "" };
    }
    report.items.push({ itemId: view.itemId, ...verdict, hits });
  }
  report.notPrintable = report.items.filter((r) => !r.printable).length;
  report.listHits = report.items.filter((r) => r.hits.length).length;

  writeReport(outPath, report);
  const say = outPath === "-" ? (s) => process.stderr.write(s) : (s) => process.stdout.write(s);
  say(`\nKID-SAFE REVIEW — ${report.total} items (${source})${report.skipped ? " — model pass skipped" : ""}\n`);
  say(`  printable ${report.total - report.notPrintable}   not printable ${report.notPrintable}   list hits ${report.listHits}\n`);
  for (const r of report.items.filter((r) => !r.printable).slice(0, 40)) {
    const view = views.find((v) => v.itemId === r.itemId);
    say(`\n  ${r.itemId}\n    "${view.kind === "model" ? view.text[0] : view.prompt}"\n    ${r.reason}\n`);
  }
  if (outPath !== "-") say(`\nreport: ${outPath}\n`);
  say("\n");
  return report.notPrintable ? 1 : 0;
}

function writeReport(outPath, report) {
  const json = JSON.stringify(report, null, 2) + "\n";
  if (outPath === "-") return process.stdout.write(json);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json);
}

// Run only as a script: an import (scripts/live/qcPanels.mjs) takes the
// prompt without starting a run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`kidSafeReview: ${err.message}\n`);
      process.exit(2);
    });
}
