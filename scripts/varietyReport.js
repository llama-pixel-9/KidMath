#!/usr/bin/env node
/* Variety instrumentation for the generator layer (plan §Phase 0, M0.3).
 *
 * Converts "variety feels low" into a tracked number. For every mode and
 * every level 1-10 it calls `config.generate(level)` N times and measures how
 * concentrated the output is:
 *
 *   - distinct prompt signatures (via the bank's own `promptSignature()`,
 *     which normalizes digits to `#` so "3 + 4" and "12 + 5" collapse)
 *   - maxShare: the fraction of samples held by the single most common
 *     signature. 1.00 means every generated item is the same prompt shape.
 *   - distinct structureType / subskill / itemFamily values emitted
 *   - distinct answers
 *
 * Usage:
 *   npm run bank:variety
 *   npm run bank:variety -- --samples 200
 *   npm run bank:variety -- --mode addition
 *   npm run bank:variety -- --json > variety.json
 *
 * The acceptance criterion the whole variety project is measured against:
 * no mode/level cell may exceed 25% of items sharing one prompt signature.
 */

import { promptSignature } from "../src/itemBank/index.js";
import { modeRegistry, MODE_IDS } from "../src/modes/index.js";

export const DEFAULT_SAMPLES = 500;
export const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Target from the plan: no single signature may hold more than this share. */
export const MAX_SIGNATURE_SHARE_TARGET = 0.25;

/**
 * Derive the text we signature for a generated question.
 *
 * Most generators set `display.promptText`. Some (counting, skipCounting)
 * render purely from structured payload, so we synthesize a stable symbolic
 * prompt from the question shape instead — otherwise those modes would report
 * zero signatures and look artificially fine.
 */
export function promptTextOf(question) {
  const display = question?.display || {};
  if (typeof display.promptText === "string" && display.promptText.trim()) {
    return display.promptText;
  }
  const parts = [];
  if (display.type) parts.push(String(display.type));
  if (Array.isArray(display.sequence)) parts.push(display.sequence.join(" "));
  if (display.count != null) parts.push(`count ${display.count}`);
  if (display.step != null) parts.push(`step ${display.step}`);
  if (display.emoji) parts.push("emoji");
  if (!parts.length && question?.op) {
    parts.push(`${question.a ?? "?"} ${question.op} ${question.b ?? "?"} = ?`);
  }
  return parts.join(" ");
}

function answerKey(answer) {
  if (answer == null) return "";
  if (typeof answer === "object") return JSON.stringify(answer);
  return String(answer);
}

/**
 * Compute the variety statistics for one cell's worth of generated questions.
 *
 * Exported (and tested) independently of generation so the share maths can be
 * verified against a hand-built fixture.
 */
export function computeCellStats(questions, { errors = 0, errorSamples = [] } = {}) {
  const signatures = new Map();
  const structureTypes = new Set();
  const subskills = new Set();
  const itemFamilies = new Set();
  const answers = new Set();

  for (const q of questions) {
    const sig = promptSignature(promptTextOf(q));
    if (sig) signatures.set(sig, (signatures.get(sig) || 0) + 1);
    const meta = q?.metadata || {};
    if (meta.structureType) structureTypes.add(meta.structureType);
    if (meta.subskill) subskills.add(meta.subskill);
    if (meta.itemFamily) itemFamilies.add(meta.itemFamily);
    answers.add(answerKey(q?.answer));
  }

  const signed = [...signatures.values()].reduce((a, b) => a + b, 0);
  let topSignature = null;
  let topCount = 0;
  for (const [sig, count] of signatures) {
    if (count > topCount) {
      topCount = count;
      topSignature = sig;
    }
  }

  return {
    samples: questions.length,
    errors,
    errorSamples,
    signedSamples: signed,
    distinctSignatures: signatures.size,
    topSignature,
    topSignatureCount: topCount,
    // Share is over the samples that produced a signature, so a mode that
    // sometimes emits an unsignaturable payload is not flattered by it.
    maxSignatureShare: signed ? topCount / signed : 0,
    structureTypes: [...structureTypes].sort(),
    subskills: [...subskills].sort(),
    itemFamilies: [...itemFamilies].sort(),
    distinctAnswers: answers.size,
  };
}

/**
 * Generate `samples` questions for one mode/level, tolerating generators that
 * throw (e.g. ones that require a `context` we do not supply). Errors are
 * counted and surfaced, never fatal.
 */
export function sampleCell(mode, level, samples = DEFAULT_SAMPLES) {
  const questions = [];
  const errorSamples = [];
  let errors = 0;
  for (let i = 0; i < samples; i += 1) {
    try {
      const q = mode.generate(level);
      if (q == null) {
        errors += 1;
        if (errorSamples.length < 3) errorSamples.push("generate() returned null");
        continue;
      }
      questions.push(q);
    } catch (err) {
      errors += 1;
      const msg = err?.message || String(err);
      if (!errorSamples.includes(msg) && errorSamples.length < 3) errorSamples.push(msg);
    }
  }
  return computeCellStats(questions, { errors, errorSamples });
}

function aggregateModes(cells) {
  const byMode = new Map();
  for (const cell of cells) {
    const entry =
      byMode.get(cell.modeId) ||
      {
        modeId: cell.modeId,
        cells: [],
        structureTypes: new Set(),
        subskills: new Set(),
        itemFamilies: new Set(),
        signatures: new Set(),
        errors: 0,
      };
    entry.cells.push(cell);
    cell.structureTypes.forEach((s) => entry.structureTypes.add(s));
    cell.subskills.forEach((s) => entry.subskills.add(s));
    cell.itemFamilies.forEach((s) => entry.itemFamilies.add(s));
    if (cell.topSignature) entry.signatures.add(cell.topSignature);
    entry.errors += cell.errors;
    byMode.set(cell.modeId, entry);
  }
  return [...byMode.values()]
    .map((entry) => {
      const shares = entry.cells.map((c) => c.maxSignatureShare);
      const worst = Math.max(...shares);
      const worstCell = entry.cells.find((c) => c.maxSignatureShare === worst);
      return {
        modeId: entry.modeId,
        levels: entry.cells.length,
        worstShare: worst,
        worstLevel: worstCell?.level ?? null,
        meanShare: shares.reduce((a, b) => a + b, 0) / (shares.length || 1),
        minDistinctSignatures: Math.min(...entry.cells.map((c) => c.distinctSignatures)),
        maxDistinctSignatures: Math.max(...entry.cells.map((c) => c.distinctSignatures)),
        // Signature share alone can flatter a mode that phrases a tiny item
        // pool many ways (linesShapes), so track the answer pool too.
        minDistinctAnswers: Math.min(...entry.cells.map((c) => c.distinctAnswers)),
        maxDistinctAnswers: Math.max(...entry.cells.map((c) => c.distinctAnswers)),
        structureTypes: [...entry.structureTypes].sort(),
        subskills: [...entry.subskills].sort(),
        itemFamilies: [...entry.itemFamilies].sort(),
        errors: entry.errors,
        failingCells: entry.cells.filter((c) => c.maxSignatureShare > MAX_SIGNATURE_SHARE_TARGET)
          .length,
      };
    })
    .sort(
      (a, b) =>
        b.worstShare - a.worstShare ||
        b.meanShare - a.meanShare ||
        a.modeId.localeCompare(b.modeId),
    );
}

/** Run the full sweep and return a machine-readable report object. */
export function buildReport({
  modeIds = MODE_IDS,
  levels = LEVELS,
  samples = DEFAULT_SAMPLES,
  registry = modeRegistry,
} = {}) {
  const cells = [];
  for (const modeId of modeIds) {
    const mode = registry[modeId];
    if (!mode || typeof mode.generate !== "function") continue;
    for (const level of levels) {
      cells.push({ modeId, level, ...sampleCell(mode, level, samples) });
    }
  }
  const modes = aggregateModes(cells);
  const totalCells = cells.length;
  const failing = cells.filter((c) => c.maxSignatureShare > MAX_SIGNATURE_SHARE_TARGET).length;
  return {
    generatedAt: new Date().toISOString(),
    samplesPerCell: samples,
    target: MAX_SIGNATURE_SHARE_TARGET,
    cells,
    modes,
    summary: {
      modes: modes.length,
      cells: totalCells,
      failingCells: failing,
      passingCells: totalCells - failing,
      passRate: totalCells ? (totalCells - failing) / totalCells : 0,
      meanMaxShare: totalCells
        ? cells.reduce((a, c) => a + c.maxSignatureShare, 0) / totalCells
        : 0,
      totalErrors: cells.reduce((a, c) => a + c.errors, 0),
      totalStructureTypes: new Set(cells.flatMap((c) => c.structureTypes)).size,
      totalSubskills: new Set(cells.flatMap((c) => c.subskills)).size,
    },
  };
}

// ---------------------------------------------------------------- rendering

const pct = (n) => `${(n * 100).toFixed(0)}%`;

function pad(value, width, align = "left") {
  const s = String(value);
  if (s.length >= width) return s;
  const fill = " ".repeat(width - s.length);
  return align === "right" ? fill + s : s + fill;
}

export function formatReport(report) {
  const out = [];
  out.push("");
  out.push(`VARIETY REPORT  ${report.generatedAt}`);
  out.push(
    `${report.samplesPerCell} samples/cell  ·  target: no signature above ${pct(report.target)}`,
  );

  for (const mode of report.modes) {
    out.push("");
    out.push(`${mode.modeId}  (worst ${pct(mode.worstShare)} @ L${mode.worstLevel})`);
    out.push(
      `  structures: ${mode.structureTypes.length || "none"}` +
        `  ·  subskills: ${mode.subskills.length || "none"}` +
        `  ·  families: ${mode.itemFamilies.length || "none"}` +
        `  ·  failing cells: ${mode.failingCells}/${mode.levels}` +
        (mode.errors ? `  ·  errors: ${mode.errors}` : ""),
    );
    out.push(
      `  ${pad("lvl", 4)}${pad("maxShare", 10, "right")}${pad("sigs", 7, "right")}` +
        `${pad("struct", 8, "right")}${pad("subsk", 7, "right")}${pad("fam", 5, "right")}` +
        `${pad("answers", 9, "right")}${pad("err", 6, "right")}`,
    );
    for (const cell of report.cells.filter((c) => c.modeId === mode.modeId)) {
      const flag = cell.maxSignatureShare > report.target ? " !" : "";
      out.push(
        `  ${pad(cell.level, 4)}${pad(pct(cell.maxSignatureShare), 10, "right")}` +
          `${pad(cell.distinctSignatures, 7, "right")}${pad(cell.structureTypes.length, 8, "right")}` +
          `${pad(cell.subskills.length, 7, "right")}${pad(cell.itemFamilies.length, 5, "right")}` +
          `${pad(cell.distinctAnswers, 9, "right")}${pad(cell.errors, 6, "right")}${flag}`,
      );
    }
    const errored = report.cells.filter((c) => c.modeId === mode.modeId && c.errorSamples.length);
    if (errored.length) {
      const seen = new Set();
      for (const cell of errored) {
        for (const msg of cell.errorSamples) {
          if (seen.has(msg)) continue;
          seen.add(msg);
          out.push(`  error: ${msg}`);
        }
      }
    }
  }

  const s = report.summary;
  out.push("");
  out.push("SUMMARY");
  out.push(
    `  ${s.modes} modes · ${s.cells} cells · ${s.cells * report.samplesPerCell} items generated`,
  );
  out.push(
    `  cells within the ${pct(report.target)} target: ${s.passingCells}/${s.cells} (${pct(s.passRate)})`,
  );
  out.push(`  mean max-signature share: ${pct(s.meanMaxShare)}`);
  out.push(
    `  distinct structureTypes app-wide: ${s.totalStructureTypes} · subskills: ${s.totalSubskills}`,
  );
  out.push(`  generator errors: ${s.totalErrors}`);
  out.push("");
  return out.join("\n");
}

// --------------------------------------------------------------------- CLI

export function parseArgs(argv) {
  const opts = { json: false, samples: DEFAULT_SAMPLES, modeIds: MODE_IDS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--samples") opts.samples = Number(argv[++i]);
    else if (arg.startsWith("--samples=")) opts.samples = Number(arg.split("=")[1]);
    else if (arg === "--mode") opts.modeIds = [argv[++i]];
    else if (arg.startsWith("--mode=")) opts.modeIds = [arg.split("=")[1]];
  }
  if (!Number.isFinite(opts.samples) || opts.samples < 1) opts.samples = DEFAULT_SAMPLES;
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const unknown = opts.modeIds.filter((id) => !modeRegistry[id]);
  if (unknown.length) {
    process.stderr.write(`Unknown mode(s): ${unknown.join(", ")}\n`);
    process.stderr.write(`Known: ${MODE_IDS.join(", ")}\n`);
    process.exitCode = 1;
    return;
  }
  const report = buildReport({ modeIds: opts.modeIds, samples: opts.samples });
  process.stdout.write(opts.json ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report));
}

const invokedDirectly =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].endsWith("varietyReport.js");

if (invokedDirectly) main();
