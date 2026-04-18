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

import {
  APPLICATION_ITEM_BANK,
  REVIEW_STATUS,
  validateBank,
} from "../src/itemBank.js";

const COVERAGE_MIN = 3;

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
  const total = APPLICATION_ITEM_BANK.length;
  const approved = APPLICATION_ITEM_BANK.filter(
    (i) => i.reviewStatus === REVIEW_STATUS.APPROVED
  );

  header("KidMath Application Item Bank Report");
  process.stdout.write(`Total items:       ${total}\n`);
  process.stdout.write(`Approved items:    ${approved.length}\n`);

  // Status breakdown
  const byStatus = tally(APPLICATION_ITEM_BANK, (i) => i.reviewStatus || "unset");
  printTally("Status Breakdown", byStatus);

  // Validation
  header("Validation");
  const result = validateBank(APPLICATION_ITEM_BANK);
  if (result.valid) {
    process.stdout.write("  All items pass validation.\n");
  } else {
    process.stdout.write(`  ${result.issues.length} issue(s):\n`);
    for (const issue of result.issues) {
      process.stdout.write(`  - ${issue.itemId}: ${issue.errors.join("; ")}\n`);
    }
  }

  // Mode coverage
  const byMode = tally(approved, (i) => i.modeId);
  printTally("Approved Items by Mode", byMode, { threshold: COVERAGE_MIN });

  // Mode + subskill coverage with threshold
  const byModeSubskill = tally(approved, (i) => `${i.modeId} :: ${i.subskill}`);
  printTally("Approved Items by (Mode, Subskill)", byModeSubskill, {
    threshold: COVERAGE_MIN,
  });

  // Structure type per mode
  const byModeStructure = tally(
    approved,
    (i) => `${i.modeId} :: ${i.structureType || "unset"}`
  );
  printTally("Approved Items by (Mode, StructureType)", byModeStructure);

  // Level distribution
  const byLevel = tally(approved, (i) => {
    const [min, max] = i.levelRange || [0, 0];
    return `${i.modeId} :: levels ${min}-${max}`;
  });
  printTally("Approved Items by (Mode, LevelRange)", byLevel);

  // Exit non-zero if validation failed or any (mode, subskill) below threshold.
  const belowThreshold = [...byModeSubskill.entries()].filter(([, n]) => n < COVERAGE_MIN);
  const ok = result.valid && belowThreshold.length === 0;

  header("Result");
  if (!ok) {
    if (!result.valid) process.stdout.write("  FAIL: validation issues found.\n");
    if (belowThreshold.length > 0) {
      process.stdout.write(
        `  FAIL: ${belowThreshold.length} (mode, subskill) pair(s) below ${COVERAGE_MIN}.\n`
      );
    }
    process.exit(1);
  }
  process.stdout.write("  PASS: bank is valid and meets coverage thresholds.\n");
}

main();
