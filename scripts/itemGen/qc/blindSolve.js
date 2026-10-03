#!/usr/bin/env node
/**
 * Blind solve — a second model answers each item from ONLY what the kid sees.
 *
 * The deterministic checks recompute the key from the payload's numbers. They
 * cannot tell when the prose asks one thing and the key answers another
 * ("How many more?" keyed to the total), or when a careful child could read
 * the question two ways. A solver that gets the prompt, the choices and a
 * plain description of the picture — and nothing else, not the key, not the
 * operation, not the structure type — catches exactly that: if it lands on a
 * different answer, or says the item is ambiguous, the item goes back.
 *
 * The comparison uses the app's own scorer (checkAnswer in mathEngine.js) on
 * the served question, so "agreed" means what the session would have marked.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/blindSolve.js <items.json>
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/blindSolve.js --from-bank money --limit 40
 *
 * Exit 1 when any item disagrees (or when a batch failed, which counts as a
 * disagreement for every item in it). Exit 0 when claude is not on PATH: the
 * run is skipped loudly and the report says so.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { checkAnswer, questionAnswerType } from "../../../src/mathEngine.js";
import { kidView, loadItems } from "./kidView.js";
import { askInBatches, BATCH_SIZE, claudeAvailable, DEFAULT_MODEL, parseArgs } from "./qcCli.js";

const HELP = `Blind solve: a model answers items from only what the kid sees; disagreements with the key fail.

Usage:
  node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/blindSolve.js <items.json> [options]
  node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/blindSolve.js --from-bank <modeId> [options]

Input:
  <items.json>          array (or { items: [] }) of bank items or raw item_bank rows
  --from-bank <modeId>  the bundled bank for one mode (src/itemBank/fullBank.js)

Options:
  --item <id[,id]>      only these item ids
  --limit <n>           at most n items
  --out <path>          report JSON (default qa-out/blind-solve.json; "-" for stdout)
  --model <name>        claude model (default: KIDMATH_QC_MODEL or Claude Code's pick)
  --fail-on-ambiguous   also exit 1 when the model calls an item ambiguous
  --dry-run             print the first batch's prompt and exit; no model call
  --help

Report: { source, model, total, disagreed, ambiguous, skipped, items: [{ itemId, agreed, modelAnswer, ambiguous, reason, expected, prompt }] }
Exit code 1 when any item disagrees. Needs \`claude\` (Claude Code) on PATH; skips loudly otherwise.`;

// Exported (with itemBlock, buildPrompt and judge) for the live step's QC
// panels (scripts/live/qcPanels.mjs), which ask the same judge the same way.
export const SYSTEM = `You are a careful student solving math practice items exactly as a US K-5 kid sees them on screen. For each item you get only what the kid gets: the question text, a plain description of any picture, the answer choices if there are any, and the answer format.

Solve each item on its own. Do not assume there is an answer key, do not look for a trick, and do not use one item to answer another. Read the question literally, the way a child would.

Then say whether the item is AMBIGUOUS: a careful kid could read it a second way and reach a different, defensible answer; the question asks two things; the picture and the words disagree; or the choices hold more than one correct option, or none.

Reply with JSON only: an array with one object per item, in the order given:
  {"itemId": string, "answer": string | string[], "ambiguous": boolean, "reason": string}
- answer: for choices, copy the choice text exactly; for a typed number, digits only (a decimal point where needed, no units, no $ or ¢ — give the number in the unit the question asks for); for a fraction, a/b; for select-all, a list of the option texts; for a symbol, <, > or =.
- reason: one sentence saying why the item is ambiguous, or "" when it is not.
Include EVERY item you were given.`;

export function itemBlock(view) {
  const lines = [`itemId: ${view.itemId}`, `grade: ${view.grade}`, `question: ${view.prompt}`];
  if (view.subPrompt) lines.push(`below the question: ${view.subPrompt}`);
  if (view.figure) lines.push(`picture: ${view.figure}`);
  if (view.choices) lines.push(`choices: ${view.choices.map(String).join(" | ")}`);
  lines.push(`answer format: ${view.answerFormat}`);
  return lines.join("\n");
}

export const buildPrompt = (views) => views.map(itemBlock).join("\n\n");

// --- Comparing the reply with the key -------------------------------------

const norm = (v) => String(v).trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!]$/, "");

// "16 shells", "$0.91", "91¢", "1,200", "40 degrees" -> the number the kid
// would type. Anything left that is not a number scores wrong, as it should.
function bareNumber(s) {
  return String(s)
    .trim()
    .replace(/,/g, "")
    .replace(/^\$\s*/, "")
    .replace(/\s*(?:¢|°|%|cents?|c|[a-z]+(?:\s+[a-z]+)*)\.?$/i, "")
    .trim();
}

// The choice the model named, with the choice's own type (a number stays a
// number: the choice scorer is strict equality).
function matchChoice(pool, raw) {
  const key = norm(raw);
  for (const c of pool) if (norm(c) === key) return c;
  const n = Number(bareNumber(raw));
  if (Number.isFinite(n)) for (const c of pool) if (typeof c === "number" && c === n) return c;
  return undefined;
}

function coerceAnswer(question, raw) {
  if (raw === null || raw === undefined) return raw;
  const type = questionAnswerType(question);
  if (type === "multiSelect") {
    const given = Array.isArray(raw) ? raw : String(raw).split(/\s*[,;|\n]\s*/).filter(Boolean);
    const options = question.display?.options || [];
    return given.map((v) => matchChoice(options, v) ?? v);
  }
  if (Array.isArray(raw)) raw = raw.join(", ");
  if (type === "choice" || type === "symbolSelect") {
    const pool = type === "symbolSelect" ? ["<", ">", "="] : question.choices || [];
    return matchChoice(pool, raw) ?? (typeof raw === "string" ? raw.trim() : raw);
  }
  if (type === "fraction") return typeof raw === "string" ? raw.replace(/\s+/g, "") : raw;
  return typeof raw === "string" ? bareNumber(raw) : raw;
}

export function judge(view, reply) {
  const submitted = coerceAnswer(view.served, reply.answer);
  const agreed = checkAnswer(view.served, submitted);
  const ambiguous = Boolean(reply.ambiguous);
  let reason = typeof reply.reason === "string" ? reply.reason.trim() : "";
  if (!agreed && !reason) reason = `model answered ${JSON.stringify(reply.answer)}; the key is ${JSON.stringify(view.served.answer)}`;
  return { agreed, modelAnswer: reply.answer ?? null, ambiguous, reason };
}

// --- Main -------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    flags: ["help", "dry-run", "fail-on-ambiguous"],
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
  const models = entries.filter((e) => e.kind === "model");
  if (models.length) throw new Error(`blind solve takes items, not item model specs (${models.length} found; generate items first)`);
  const views = entries.map(kidView);
  const model = args.options.model || DEFAULT_MODEL;
  const outPath = args.options.out || "qa-out/blind-solve.json";

  if (args.flags.has("dry-run")) {
    process.stdout.write(`--- system prompt ---\n${SYSTEM}\n\n--- batch 1 of ${Math.ceil(views.length / BATCH_SIZE)} (${Math.min(BATCH_SIZE, views.length)} of ${views.length} items) ---\n`);
    process.stdout.write(`${buildPrompt(views.slice(0, BATCH_SIZE))}\n`);
    return 0;
  }

  const report = { source, model: model || "claude default", total: views.length, disagreed: 0, ambiguous: 0, skipped: false, items: [] };

  if (!(await claudeAvailable())) {
    process.stderr.write("Blind solve SKIPPED: `claude` (Claude Code) is not on PATH. 0 of " + `${views.length} items were solved.\n`);
    report.skipped = true;
  } else {
    const { replies, failures } = await askInBatches(views, { system: SYSTEM, buildPrompt, model, log: (m) => process.stderr.write(`blind solve ${m}\n`) });
    for (const view of views) {
      const base = { itemId: view.itemId, expected: view.served.answer, prompt: view.prompt };
      const reply = replies.get(view.itemId);
      let verdict;
      if (failures.has(view.itemId)) {
        verdict = { agreed: false, modelAnswer: null, ambiguous: false, reason: `blind solve failed: ${failures.get(view.itemId)}` };
      } else if (!reply) {
        verdict = { agreed: false, modelAnswer: null, ambiguous: false, reason: "model returned no answer for this item" };
      } else {
        verdict = judge(view, reply);
      }
      report.items.push({ ...base, ...verdict });
    }
    report.disagreed = report.items.filter((r) => !r.agreed).length;
    report.ambiguous = report.items.filter((r) => r.ambiguous).length;
  }

  writeReport(outPath, report);
  const say = outPath === "-" ? (s) => process.stderr.write(s) : (s) => process.stdout.write(s);
  say(`\nBLIND SOLVE — ${report.total} items (${source})${report.skipped ? " — SKIPPED" : ""}\n`);
  say(`  agreed ${report.total - report.disagreed}   disagreed ${report.disagreed}   ambiguous ${report.ambiguous}\n`);
  for (const r of report.items.filter((r) => !r.agreed || r.ambiguous).slice(0, 40)) {
    say(`\n  ${r.itemId}  ${r.agreed ? "AMBIGUOUS" : "DISAGREED"}\n    "${r.prompt}"\n    key ${JSON.stringify(r.expected)}   model ${JSON.stringify(r.modelAnswer)}\n`);
    if (r.reason) say(`    ${r.reason}\n`);
  }
  if (outPath !== "-") say(`\nreport: ${outPath}\n`);
  say("\n");
  const failing = report.disagreed + (args.flags.has("fail-on-ambiguous") ? report.ambiguous : 0);
  return failing ? 1 : 0;
}

function writeReport(outPath, report) {
  const json = JSON.stringify(report, null, 2) + "\n";
  if (outPath === "-") return process.stdout.write(json);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json);
}

// Run only as a script: an import (scripts/live/qcPanels.mjs) takes the
// prompt and the judging without starting a run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`blindSolve: ${err.message}\n`);
      process.exit(2);
    });
}
