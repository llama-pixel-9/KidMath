import { describe, expect, it } from "vitest";
import { BUNDLED_ITEMS } from "../itemBank/bundle.js";
import {
  REVIEW_STATUS,
  ITEM_FAMILIES,
  LEVEL_BANDS,
  levelRangeToBands,
  validateBank,
} from "../itemBank/index.js";
import { MODE_BLUEPRINTS } from "../modes/blueprints.js";

// Cell-coverage spec for the curated item bank.
//
// Semantics:
//   Cell = (modeId, subskill, itemFamily, levelBand)
//   Phase 1 floor:    3 approved items per cell
//   Phase 2 healthy:  8 approved items per cell
//
// Behavior of this spec:
//   - Bank validity (schema, uniqueness, numeric consistency) is always
//     asserted; this is CI-blocking.
//   - Per-cell floor assertions are opt-in via env flags so we don't block
//     foundation merges while 176 cells are still empty. As Phase 1 rolls
//     through the modes, flip KIDMATH_ENFORCE_CELL_COVERAGE=1 to turn the
//     floor into a hard gate.
//
// Env flags (default behavior in parens):
//   KIDMATH_ENFORCE_CELL_COVERAGE=1  (off)  enforce per-cell floor
//   KIDMATH_CELL_FLOOR=<n>           (3)    per-cell minimum
//   KIDMATH_COVERAGE_MODE=<modeId>   (all)  restrict enforcement to one mode
//                                           (useful for mode-by-mode rollout)
//   KIDMATH_COVERAGE_FAMILY=<family> (all)  restrict enforcement to one family

const ENFORCE = process.env.KIDMATH_ENFORCE_CELL_COVERAGE === "1";
const FLOOR = Number(process.env.KIDMATH_CELL_FLOOR ?? 3);
const ONLY_MODE = process.env.KIDMATH_COVERAGE_MODE || null;
const ONLY_FAMILY = process.env.KIDMATH_COVERAGE_FAMILY || null;

function computeCellCounts(items) {
  const counts = new Map();
  for (const item of items) {
    if (item.reviewStatus !== REVIEW_STATUS.APPROVED) continue;
    for (const band of levelRangeToBands(item.levelRange)) {
      const key = `${item.modeId}::${item.subskill}::${item.itemFamily}::${band}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

function computeAllExpectedCells() {
  const cells = [];
  for (const [modeId, cfg] of Object.entries(MODE_BLUEPRINTS)) {
    if (ONLY_MODE && modeId !== ONLY_MODE) continue;
    for (const subskill of cfg.subskills) {
      for (const family of Object.values(ITEM_FAMILIES)) {
        if (ONLY_FAMILY && family !== ONLY_FAMILY) continue;
        for (const band of LEVEL_BANDS) {
          cells.push({ modeId, subskill, family, band });
        }
      }
    }
  }
  return cells;
}

describe("item bank validity", () => {
  it("every bundled item passes schema validation", () => {
    const result = validateBank(BUNDLED_ITEMS);
    if (!result.valid) {
      console.error(JSON.stringify(result.issues, null, 2));
    }
    expect(result.valid).toBe(true);
  });

  it("every approved item's numeric payload is consistent with its answer", () => {
    const mismatched = [];
    for (const item of BUNDLED_ITEMS) {
      if (item.reviewStatus !== REVIEW_STATUS.APPROVED) continue;
      const q = item.question || {};
      if (typeof q.a === "number" && typeof q.b === "number" && typeof q.answer === "number") {
        if (q.op === "+" && q.a + q.b !== q.answer) mismatched.push(item.itemId);
        if ((q.op === "-" || q.op === "\u2212") && q.a - q.b !== q.answer)
          mismatched.push(item.itemId);
        if ((q.op === "*" || q.op === "\u00d7") && q.a * q.b !== q.answer)
          mismatched.push(item.itemId);
        if ((q.op === "/" || q.op === "\u00f7") && q.b !== 0 && q.a / q.b !== q.answer)
          mismatched.push(item.itemId);
      }
    }
    expect(mismatched).toEqual([]);
  });
});

describe("cell coverage matrix", () => {
  const expectedCells = computeAllExpectedCells();
  const counts = computeCellCounts(BUNDLED_ITEMS);

  it("every mode in the blueprint has at least one approved item at the 4-5 band (application)", () => {
    // Baseline sanity: Phase-0 ships with application-only coverage at 4-5
    // across all 8 modes. This test is always hard-enforced so regressions
    // are caught immediately.
    const missing = [];
    for (const modeId of Object.keys(MODE_BLUEPRINTS)) {
      const items = BUNDLED_ITEMS.filter(
        (it) =>
          it.modeId === modeId &&
          it.reviewStatus === REVIEW_STATUS.APPROVED &&
          it.itemFamily === ITEM_FAMILIES.APPLICATION &&
          levelRangeToBands(it.levelRange).includes("4-5")
      );
      if (items.length === 0) missing.push(modeId);
    }
    expect(missing).toEqual([]);
  });

  it(
    `meets per-cell floor of ${FLOOR} approved items (opt-in via KIDMATH_ENFORCE_CELL_COVERAGE)`,
    () => {
      if (!ENFORCE) {
        // When not enforced, this assertion succeeds but the console shows
        // the empty/thin cells so contributors can still see the gap.
        const belowFloor = [];
        for (const { modeId, subskill, family, band } of expectedCells) {
          const key = `${modeId}::${subskill}::${family}::${band}`;
          const count = counts.get(key) || 0;
          if (count < FLOOR) belowFloor.push({ key, count });
        }
        if (belowFloor.length > 0) {
          console.warn(
            `[coverage] ${belowFloor.length}/${expectedCells.length} cells below floor ${FLOOR} ` +
              "(soft warning; set KIDMATH_ENFORCE_CELL_COVERAGE=1 to fail CI)"
          );
        }
        expect(true).toBe(true);
        return;
      }
      const below = [];
      for (const { modeId, subskill, family, band } of expectedCells) {
        const key = `${modeId}::${subskill}::${family}::${band}`;
        const count = counts.get(key) || 0;
        if (count < FLOOR) below.push(`${key} (has ${count})`);
      }
      if (below.length > 0) {
        console.error(`Cells below floor ${FLOOR}:\n` + below.join("\n"));
      }
      expect(below).toEqual([]);
    }
  );

  // Modes whose structureType catalog (see docs/word-problem-authoring-guide.md)
  // only defines a single type. We still assert they have at least one
  // approved item of that type below, but we don't require 2+ distinct types.
  const SINGLE_STRUCTURE_MODES = new Set(["comparing", "counting", "skipCounting", "placeValue"]);

  it("each multi-structure mode uses at least 2 distinct structureTypes", () => {
    const modes = new Set(
      BUNDLED_ITEMS.filter((i) => i.reviewStatus === REVIEW_STATUS.APPROVED).map((i) => i.modeId)
    );
    for (const modeId of modes) {
      const structures = new Set(
        BUNDLED_ITEMS.filter(
          (i) => i.modeId === modeId && i.reviewStatus === REVIEW_STATUS.APPROVED
        ).map((i) => i.structureType)
      );
      const required = SINGLE_STRUCTURE_MODES.has(modeId) ? 1 : 2;
      expect(
        structures.size,
        `mode ${modeId} has fewer than ${required} distinct structureTypes: ${[...structures].join(", ")}`
      ).toBeGreaterThanOrEqual(required);
    }
  });
});
