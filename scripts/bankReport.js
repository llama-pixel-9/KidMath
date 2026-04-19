#!/usr/bin/env node
/* Bank QA reporter for the curated application item bank.
 *
 * Usage:
 *   node scripts/bankReport.js
 *   npm run bank:report
 *
 * Outputs:
 *   - validation issues (missing fields, duplicate ids/prompts, malformed prompts)
 *   - coverage by (mode, subskill) with min-3 threshold flagged
 *   - structureType distribution per mode
 *   - level-band distribution per mode
 *   - reviewStatus breakdown
 */

// Import directly from the module graph that does NOT pull in Vite-only
// imports (`import.meta.env` in supabaseClient). This lets the report run
// under plain node without pulling the whole browser bundle.
import {
  APPLICATION_ITEM_BANK,
} from "../src/itemBank/applicationItems.js";
import { BUNDLED_ITEMS } from "../src/itemBank/bundle.js";
import {
  validateBank,
  ITEM_FAMILIES,
  LEVEL_BANDS,
  levelRangeToBands,
  REVIEW_STATUS,
} from "../src/itemBank/index.js";

const COVERAGE_MIN = 3;
const CELL_COVERAGE_MIN = Number(process.env.KIDMATH_CELL_COVERAGE_MIN ?? 0);
const ENFORCE_CELL = process.env.KIDMATH_ENFORCE_CELL_COVERAGE === "1";

function header(label) {
  const line = "=".repeat(label.length);
  process.stdout.write(`\n${label}\n${line}\n`);
}

function tally(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function printTally(label, map, options = {}) {
  header(label);
  const sorted = [...map.entries()].sort((a, b) =>
    options.byCountDesc ? b[1] - a[1] : a[0].localeCompare(b[0])
  );
  for (const [key, count] of sorted) {
    const flag = options.threshold && count < options.threshold ? " (BELOW THRESHOLD)" : "";
    process.stdout.write(`  ${key.padEnd(40)}  ${String(count).padStart(4)}${flag}\n`);
  }
}

function main() {
  const total = BUNDLED_ITEMS.length;
  const approved = BUNDLED_ITEMS.filter((i) => i.reviewStatus === REVIEW_STATUS.APPROVED);

  header("KidMath Item Bank Report (all families)");
  process.stdout.write(`Total bundled items:   ${total}\n`);
  process.stdout.write(`  application only:    ${APPLICATION_ITEM_BANK.length}\n`);
  process.stdout.write(`Approved items:        ${approved.length}\n`);

  const byFamily = tally(BUNDLED_ITEMS, (i) => i.itemFamily || "unset");
  printTally("Items by Family", byFamily);

  const byStatus = tally(BUNDLED_ITEMS, (i) => i.reviewStatus || "unset");
  printTally("Status Breakdown", byStatus);

  header("Validation");
  const result = validateBank(BUNDLED_ITEMS);
  if (result.valid) {
    process.stdout.write("  All items pass validation.\n");
  } else {
    process.stdout.write(`  ${result.issues.length} issue(s):\n`);
    for (const issue of result.issues) {
      process.stdout.write(`  - ${issue.itemId}: ${issue.errors.join("; ")}\n`);
    }
  }

  const byMode = tally(approved, (i) => i.modeId);
  printTally("Approved Items by Mode", byMode, { threshold: COVERAGE_MIN });

  const byModeSubskill = tally(approved, (i) => `${i.modeId} :: ${i.subskill}`);
  printTally("Approved Items by (Mode, Subskill)", byModeSubskill, {
    threshold: COVERAGE_MIN,
  });

  const byModeStructure = tally(
    approved,
    (i) => `${i.modeId} :: ${i.structureType || "unset"}`
  );
  printTally("Approved Items by (Mode, StructureType)", byModeStructure);

  const byLevel = tally(approved, (i) => {
    const [min, max] = i.levelRange || [0, 0];
    return `${i.modeId} :: levels ${min}-${max}`;
  });
  printTally("Approved Items by (Mode, LevelRange)", byLevel);

  // Per-cell coverage across (mode x subskill x family x level-band). Each
  // item contributes to every band its levelRange touches.
  const cellCounts = new Map();
  for (const item of approved) {
    for (const band of levelRangeToBands(item.levelRange)) {
      const key = `${item.modeId} :: ${item.subskill} :: ${item.itemFamily} :: ${band}`;
      cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
    }
  }
  printTally("Approved Items by Cell (mode x subskill x family x band)", cellCounts, {
    threshold: CELL_COVERAGE_MIN || undefined,
  });

  // Emit a sorted list of empty cells to help authoring prioritize.
  header("Empty Cells (no approved items)");
  const allCells = [];
  // Derive subskill list per mode from approved items; fall back to presence.
  const modeSubskills = new Map();
  for (const item of approved) {
    if (!modeSubskills.has(item.modeId)) modeSubskills.set(item.modeId, new Set());
    modeSubskills.get(item.modeId).add(item.subskill);
  }
  for (const [modeId, subs] of modeSubskills) {
    for (const subskill of subs) {
      for (const family of Object.values(ITEM_FAMILIES)) {
        for (const band of LEVEL_BANDS) {
          const key = `${modeId} :: ${subskill} :: ${family} :: ${band}`;
          if (!cellCounts.has(key)) allCells.push(key);
        }
      }
    }
  }
  if (allCells.length === 0) {
    process.stdout.write("  (none)\n");
  } else {
    for (const key of allCells.sort()) {
      process.stdout.write(`  ${key}\n`);
    }
    process.stdout.write(`  Total empty cells: ${allCells.length}\n`);
  }

  // Pass/fail gates: validation is always required. (mode, subskill) floor is
  // always required. Per-cell floor is opt-in via KIDMATH_ENFORCE_CELL_COVERAGE.
  const belowThreshold = [...byModeSubskill.entries()].filter(([, n]) => n < COVERAGE_MIN);
  const cellBelow = ENFORCE_CELL
    ? [...cellCounts.entries()].filter(([, n]) => n < CELL_COVERAGE_MIN)
    : [];
  const ok = result.valid && belowThreshold.length === 0 && cellBelow.length === 0;

  header("Result");
  if (!ok) {
    if (!result.valid) process.stdout.write("  FAIL: validation issues found.\n");
    if (belowThreshold.length > 0) {
      process.stdout.write(
        `  FAIL: ${belowThreshold.length} (mode, subskill) pair(s) below ${COVERAGE_MIN}.\n`
      );
    }
    if (cellBelow.length > 0) {
      process.stdout.write(
        `  FAIL: ${cellBelow.length} cell(s) below ${CELL_COVERAGE_MIN}.\n`
      );
    }
    process.exit(1);
  }
  process.stdout.write("  PASS: bank is valid and meets coverage thresholds.\n");
}

main();
