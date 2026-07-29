import { describe, it, expect } from "vitest";
import {
  batchKeyOf,
  groupIntoBatches,
  sampleSize,
  sampleOf,
  batchApprovalEntries,
} from "../admin/reviewBatches.js";

/**
 * Batch-trust review approves hundreds of items on the strength of a sample,
 * so its invariants carry real weight: QC-failing items must never ride along,
 * optioned items must carry their chosen (or top-ranked) wording, and the
 * sample must be a faithful subset.
 */

const generated = (id, mode, generator = "authorStructures") => ({
  itemId: id,
  modeId: mode,
  reviewStatus: "reviewed",
  source: { generator },
  payload: { answer: 5, display: { promptText: `q-${id}` } },
});

const reworded = (id, mode) => ({
  itemId: id,
  modeId: mode,
  reviewStatus: "approved",
  source: null,
  payload: {
    answer: 5,
    display: { promptText: `orig-${id}`, promptOptions: [`best-${id}`, `alt-${id}`] },
  },
});

describe("batch grouping", () => {
  it("groups by origin × mode, wording rewrites separate from generated items", () => {
    const items = [
      generated("a1", "addition"),
      generated("a2", "addition"),
      generated("c1", "counting", "scripts/itemGen"),
      reworded("r1", "addition"),
    ];
    const keys = items.map(batchKeyOf);
    expect(keys[0]).toBe("authorStructures::addition");
    expect(keys[2]).toBe("scripts/itemGen::counting");
    expect(keys[3]).toBe("rewording::addition");

    const batches = groupIntoBatches(items);
    expect(batches).toHaveLength(3);
    // Largest first.
    expect(batches[0].items).toHaveLength(2);
  });
});

describe("sampling", () => {
  it("shows everything for tiny batches and ~10% clamped to 12..30 otherwise", () => {
    expect(sampleSize(8)).toBe(8);
    expect(sampleSize(50)).toBe(12);
    expect(sampleSize(200)).toBe(20);
    expect(sampleSize(1000)).toBe(30);
  });

  it("samples without duplicates, from the batch itself", () => {
    const items = Array.from({ length: 40 }, (_, i) => generated(`i${i}`, "counting"));
    const sample = sampleOf(items);
    expect(sample).toHaveLength(sampleSize(40));
    expect(new Set(sample.map((s) => s.itemId)).size).toBe(sample.length);
    for (const s of sample) expect(items).toContain(s);
  });
});

describe("batch approval entries", () => {
  const qcOf = (pairs) => new Map(pairs);

  it("excludes QC-failing items and reports them", () => {
    const items = [generated("ok1", "addition"), generated("bad", "addition")];
    const qc = qcOf([
      ["ok1", { pass: true }],
      ["bad", { pass: false }],
    ]);
    const { entries, skipped } = batchApprovalEntries(items, qc);
    expect(entries.map((e) => e.itemId)).toEqual(["ok1"]);
    expect(skipped).toEqual(["bad"]);
  });

  it("applies the top-ranked wording to optioned items and strips the options", () => {
    const items = [reworded("r1", "addition")];
    const { entries } = batchApprovalEntries(items, qcOf([["r1", { pass: true }]]));
    expect(entries[0].payload.display.promptText).toBe("best-r1");
    expect(entries[0].payload.display.promptOptions).toBeUndefined();
  });

  it("honors an explicit reviewer choice over the default", () => {
    const items = [reworded("r1", "addition")];
    const choices = new Map([["r1", "alt-r1"]]);
    const { entries } = batchApprovalEntries(items, qcOf([["r1", { pass: true }]]), choices);
    expect(entries[0].payload.display.promptText).toBe("alt-r1");
  });

  it("plain items approve by id only — no payload rewrite", () => {
    const { entries } = batchApprovalEntries([generated("g1", "counting")], qcOf([["g1", { pass: true }]]));
    expect(entries[0]).toEqual({ itemId: "g1" });
  });
});
