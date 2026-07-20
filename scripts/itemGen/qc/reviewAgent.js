#!/usr/bin/env node
/**
 * Automated QC for bank items.
 *
 * Two passes, deliberately in this order:
 *
 *   1. DETERMINISTIC (checks.js) — arithmetic recomputed in code, structure
 *      matched against rules, grammar and band appropriateness. Anything code
 *      can decide, code decides.
 *
 *   2. JUDGMENT (a model) — only what code cannot: does this read naturally to
 *      a 7-year-old, is the situation coherent and free of cultural
 *      assumptions, could a child misread it.
 *
 * The order matters. An LLM reviewing another LLM shares its blind spots — if
 * the author misread "3 times as much" as additive, a reviewer may accept it
 * for the same reason. Deciding everything decidable in code first is what
 * makes this more than a second opinion. Items failing pass 1 never reach
 * pass 2, so no model call is spent on an item already known to be broken.
 *
 * Usage:
 *   npm run bank:qc                       QC every approved bank item
 *   npm run bank:qc -- --mode addition    one mode
 *   npm run bank:qc -- --status draft     QC drafts awaiting review
 *   npm run bank:qc -- --json             machine-readable
 *   npm run bank:qc -- --deterministic    skip the model pass entirely
 *   npm run bank:qc -- --limit 200        cap how many items go to the model
 */

// The full authored corpus, not the shipped seed — QC audits everything that
// exists, not just what is bundled.
import { FULL_ITEMS } from "../../../src/itemBank/fullBank.js";
import { runChecks, CHECK_IDS } from "../../../src/itemBank/qc/checks.js";
import { judgeItems } from "./judge.js";

const args = process.argv.slice(2);
const flag = (name, fallback = null) =>
  args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const has = (name) => args.includes(`--${name}`);

const modeFilter = flag("mode");
const asJson = has("json");
const deterministicOnly = has("deterministic");
const limit = Number(flag("limit", "0")) || 0;

async function main() {
  let items = FULL_ITEMS;
  if (modeFilter) items = items.filter((i) => i.modeId === modeFilter);
  if (!items.length) {
    process.stderr.write(`No items found${modeFilter ? ` for mode ${modeFilter}` : ""}.\n`);
    process.exit(1);
  }

  // Pass 1 — deterministic.
  const results = items.map((item) => ({ item, ...runChecks(item) }));
  const failed = results.filter((r) => !r.pass);
  const warned = results.filter((r) => r.pass && r.findings.length);
  const clean = results.filter((r) => r.pass && !r.findings.length);

  // Pass 2 — judgment, only on items that survived pass 1.
  let judgments = [];
  if (!deterministicOnly) {
    const candidates = limit ? clean.slice(0, limit).concat(warned.slice(0, limit)) : [...clean, ...warned];
    judgments = await judgeItems(candidates.map((r) => r.item));
  }

  const report = {
    total: items.length,
    deterministic: {
      failed: failed.length,
      warned: warned.length,
      clean: clean.length,
      byCheck: CHECK_IDS.reduce((acc, id) => {
        acc[id] = results.filter((r) => r.findings.some((f) => f.id === id)).length;
        return acc;
      }, {}),
    },
    judgment: {
      reviewed: judgments.length,
      flagged: judgments.filter((j) => !j.acceptable).length,
    },
    failures: failed.map((r) => ({
      itemId: r.itemId,
      modeId: r.item.modeId,
      structureType: r.item.structureType,
      prompt: r.item.question?.display?.promptText,
      findings: r.findings,
    })),
    flagged: judgments.filter((j) => !j.acceptable),
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exit(report.deterministic.failed ? 1 : 0);
  }

  const pad = (s, n) => String(s).padEnd(n);
  process.stdout.write(`\nBANK QC — ${report.total} items${modeFilter ? ` (${modeFilter})` : ""}\n\n`);
  process.stdout.write(`Pass 1, deterministic\n`);
  process.stdout.write(`  failed ${report.deterministic.failed}   warned ${report.deterministic.warned}   clean ${report.deterministic.clean}\n\n`);
  for (const [id, count] of Object.entries(report.deterministic.byCheck)) {
    if (count) process.stdout.write(`  ${pad(id, 28)}${count}\n`);
  }

  if (report.failures.length) {
    process.stdout.write(`\nFAILURES (must not reach a child)\n`);
    for (const f of report.failures.slice(0, 40)) {
      process.stdout.write(`\n  ${f.itemId}  [${f.modeId}/${f.structureType}]\n`);
      process.stdout.write(`    "${f.prompt}"\n`);
      for (const finding of f.findings) {
        process.stdout.write(`    ${finding.severity.toUpperCase()} ${finding.id}: ${finding.message}\n`);
      }
    }
    if (report.failures.length > 40) {
      process.stdout.write(`\n  ...and ${report.failures.length - 40} more\n`);
    }
  }

  if (!deterministicOnly) {
    process.stdout.write(`\nPass 2, judgment\n`);
    process.stdout.write(`  reviewed ${report.judgment.reviewed}   flagged ${report.judgment.flagged}\n`);
    for (const j of report.flagged.slice(0, 25)) {
      process.stdout.write(`\n  ${j.itemId}\n    "${j.prompt}"\n    ${j.reason}\n`);
    }
  }

  process.stdout.write(`\n`);
  process.exit(report.deterministic.failed ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});
