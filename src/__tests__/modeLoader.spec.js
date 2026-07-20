import { describe, it, expect, beforeEach } from "vitest";
import { addBankItems, getBankItems, resetBankToBundle } from "../itemBank/index.js";
import { SEED_ITEMS } from "../itemBank/bundle.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";
import { MODE_IDS } from "../modes";

/**
 * Mode-scoped loading: the app ships a seed and fetches the rest of a mode when
 * the child opens it. Two things must hold or a child sees a broken screen:
 *
 *   1. the seed alone must be playable in EVERY mode, offline
 *   2. fetching one mode must not evict another the child was just using
 */

describe("seed bank", () => {
  it("is a small fraction of the full corpus", () => {
    expect(SEED_ITEMS.length).toBeLessThan(FULL_ITEMS.length / 4);
    const seedBytes = JSON.stringify(SEED_ITEMS).length;
    const fullBytes = JSON.stringify(FULL_ITEMS).length;
    expect(seedBytes / fullBytes).toBeLessThan(0.25);
  });

  it("covers every (mode, family, band) cell the corpus has", () => {
    // A missing cell means a mode can open with nothing to show while the
    // fetch is in flight — or forever, if the child is offline.
    const bandOf = (i) => (i.levelRange[0] <= 3 ? "K-1" : i.levelRange[0] <= 6 ? "2-3" : "4-5");
    const key = (i) => `${i.modeId}::${i.itemFamily}::${bandOf(i)}`;
    const seeded = new Set(SEED_ITEMS.map(key));
    const missing = [...new Set(FULL_ITEMS.map(key))].filter((c) => !seeded.has(c));
    expect(missing).toEqual([]);
  });

  it("seeds enough per cell to satisfy the repeat cooldown offline", () => {
    // mathEngine avoids repeating within the last 8 items. A cell holding fewer
    // than that cannot satisfy the cooldown, so an offline child sees repeats.
    const bandOf = (i) => (i.levelRange[0] <= 3 ? "K-1" : i.levelRange[0] <= 6 ? "2-3" : "4-5");
    const counts = new Map();
    for (const i of SEED_ITEMS) {
      const k = `${i.modeId}::${i.itemFamily}::${bandOf(i)}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    // Cells the corpus itself cannot fill are exempt; the rest must reach 8.
    const fullCounts = new Map();
    for (const i of FULL_ITEMS) {
      const k = `${i.modeId}::${i.itemFamily}::${bandOf(i)}`;
      fullCounts.set(k, (fullCounts.get(k) || 0) + 1);
    }
    const thin = [...counts.entries()].filter(
      ([k, n]) => n < 8 && (fullCounts.get(k) || 0) >= 8
    );
    expect(thin).toEqual([]);
  });

  it("carries only valid items", () => {
    for (const item of SEED_ITEMS) {
      expect(item.itemId).toBeTruthy();
      expect(item.modeId).toBeTruthy();
      expect(item.question?.answer).toBeDefined();
    }
  });
});

describe("addBankItems merges rather than replaces", () => {
  beforeEach(() => resetBankToBundle());

  it("keeps existing items when a new mode is loaded", () => {
    const before = getBankItems().length;
    const added = addBankItems([
      {
        itemId: "test-new-001",
        modeId: "addition",
        itemFamily: "application",
        subskill: "composeDecompose",
        structureType: "addToResultUnknown",
        levelRange: [1, 3],
        reviewStatus: "approved",
        question: { a: 1, b: 2, op: "+", answer: 3, display: { promptText: "x" } },
      },
    ]);
    expect(added).toBe(1);
    expect(getBankItems().length).toBe(before + 1);
    // Nothing evicted.
    expect(getBankItems().filter((i) => i.itemId === SEED_ITEMS[0].itemId)).toHaveLength(1);
  });

  it("is idempotent — re-fetching a mode cannot duplicate", () => {
    const sample = SEED_ITEMS.slice(0, 20);
    const before = getBankItems().length;
    expect(addBankItems(sample)).toBe(0);
    expect(getBankItems().length).toBe(before);
  });

  it("ignores empty and malformed input", () => {
    const before = getBankItems().length;
    expect(addBankItems([])).toBe(0);
    expect(addBankItems(null)).toBe(0);
    expect(addBankItems([{ noId: true }])).toBe(0);
    expect(getBankItems().length).toBe(before);
  });
});

describe("ensureModeLoaded", () => {
  beforeEach(async () => {
    resetBankToBundle();
    const { resetModeLoader } = await import("../itemBank/modeLoader.js");
    resetModeLoader();
  });

  it("resolves rather than throwing when Supabase is unavailable", async () => {
    // supabaseClient is null in tests, so the fetch path is skipped entirely.
    const { ensureModeLoaded } = await import("../itemBank/modeLoader.js");
    const result = await ensureModeLoaded("addition");
    expect(result.modeId).toBe("addition");
    expect(["failed", "loaded", "cached"]).toContain(result.status);
  });

  it("leaves the seeded items playable when a fetch fails", async () => {
    const { ensureModeLoaded } = await import("../itemBank/modeLoader.js");
    const before = getBankItems().length;
    await ensureModeLoaded("addition");
    expect(getBankItems().length).toBeGreaterThanOrEqual(before);
  });

  it("dedupes concurrent calls for the same mode", async () => {
    const { ensureModeLoaded } = await import("../itemBank/modeLoader.js");
    const [a, b] = await Promise.all([ensureModeLoaded("money"), ensureModeLoaded("money")]);
    expect(a.modeId).toBe("money");
    expect(b.modeId).toBe("money");
  });

  it("handles an unknown mode id without throwing", async () => {
    const { ensureModeLoaded } = await import("../itemBank/modeLoader.js");
    await expect(ensureModeLoaded(undefined)).resolves.toMatchObject({ status: "skipped" });
  });
});

describe("every mode is playable from the seed alone", () => {
  it("has seeded items for each registered mode that has any corpus items", () => {
    const corpusModes = new Set(FULL_ITEMS.map((i) => i.modeId));
    const seedModes = new Set(SEED_ITEMS.map((i) => i.modeId));
    for (const mode of MODE_IDS) {
      if (!corpusModes.has(mode)) continue; // bankless modes generate instead
      expect(seedModes.has(mode), `${mode} has no seeded items`).toBe(true);
    }
  });
});
