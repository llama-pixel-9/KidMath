import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase before importing the loader so the module picks up the mock.
const mockChain = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
};

// The version switch is a second table with a single, unpaginated select.
const switchChain = { select: vi.fn() };

vi.mock("../supabaseClient.js", () => ({
  supabase: {
    from: vi.fn((table) => (table === "item_version_switch" ? switchChain : mockChain)),
  },
}));

import {
  fetchApprovedBank,
  hydrateBankFromCloud,
  normalizeBankRow,
  noteMissingV2Columns,
  resetCloudLoader,
} from "../itemBank/cloudLoader.js";
import {
  getBankItems,
  getBankSource,
  resetBankToBundle,
  subscribeBankChanges,
} from "../itemBank/index.js";

function setSelectResult({ data, error = null }) {
  // The loader now pages: select().eq().order().range() resolves each page.
  // One page under the 1,000-row cap ends the loop.
  mockChain.select.mockReturnValue(mockChain);
  mockChain.eq.mockReturnValue(mockChain);
  mockChain.order.mockReturnValue(mockChain);
  mockChain.range.mockResolvedValue({ data, error });
}

function setSwitchResult({ data, error = null }) {
  switchChain.select.mockResolvedValue({ data, error });
}

/** An approved application row; `extra` layers the v2 columns on. */
function approvedRow(itemId, modeId, extra = {}) {
  return {
    item_id: itemId,
    mode_id: modeId,
    item_family: "application",
    subskill: "makeTen",
    structure_type: "joinResultUnknown",
    level_min: 7,
    level_max: 10,
    review_status: "approved",
    payload: {
      a: 5,
      b: 5,
      op: "+",
      answer: 10,
      display: { promptText: `Row ${itemId}: 5 red and 5 blue balloons. How many balloons in all?` },
    },
    ...extra,
  };
}

beforeEach(() => {
  resetBankToBundle();
  resetCloudLoader();
  mockChain.select.mockReset();
  mockChain.eq.mockReset();
  mockChain.order.mockReset();
  mockChain.range.mockReset();
  switchChain.select.mockReset();
  // Default: the switch table exists and every skill is on v1.
  setSwitchResult({ data: [] });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  resetBankToBundle();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeBankRow", () => {
  it("converts a valid cloud row into the in-memory bank shape", () => {
    const row = {
      item_id: "addition-app-test-1",
      mode_id: "addition",
      item_family: "application",
      subskill: "makeTen",
      structure_type: "joinResultUnknown",
      level_min: 7,
      level_max: 10,
      review_status: "approved",
      payload: {
        a: 9,
        b: 7,
        op: "+",
        answer: 16,
        display: { promptText: "Mina has 9 shells and finds 7 more. How many shells now?" },
      },
    };
    const item = normalizeBankRow(row);
    expect(item).toMatchObject({
      itemId: "addition-app-test-1",
      modeId: "addition",
      subskill: "makeTen",
      structureType: "joinResultUnknown",
      levelRange: [7, 10],
      reviewStatus: "approved",
    });
    expect(item.question.answer).toBe(16);
  });

  it("defaults the v2 fields when a row lacks them (v1 rows, pre-migration selects)", () => {
    const item = normalizeBankRow(approvedRow("addition-app-plain", "addition"));
    expect(item).toMatchObject({ version: 1, itemModelId: null, difficulty: null, hint: null, tags: null });
  });

  it("carries version, item model, difficulty, hint and tags from a v2 row", () => {
    const hint = { nudge: "Start with what she paid.", steps: ["Count up from 9."], picture: null };
    const item = normalizeBankRow(
      approvedRow("addition-app-v2", "addition", {
        version: 2,
        item_model_id: "addition-join-easy-01",
        difficulty: "easy",
        hint,
        tags: { standard: "1.OA.1" },
      })
    );
    expect(item).toMatchObject({
      version: 2,
      itemModelId: "addition-join-easy-01",
      difficulty: "easy",
      hint,
      tags: { standard: "1.OA.1" },
    });
  });

  it("treats a null or malformed version as 1 and a non-object hint as absent", () => {
    expect(normalizeBankRow(approvedRow("a", "addition", { version: null })).version).toBe(1);
    expect(normalizeBankRow(approvedRow("b", "addition", { version: "2" })).version).toBe(2);
    expect(normalizeBankRow(approvedRow("c", "addition", { version: "later" })).version).toBe(1);
    expect(normalizeBankRow(approvedRow("d", "addition", { hint: "not a hint" })).hint).toBeNull();
  });

  it("rejects rows that fail validation", () => {
    const row = {
      item_id: "bad",
      mode_id: "addition",
      item_family: "application",
      subskill: "makeTen",
      structure_type: "joinResultUnknown",
      level_min: 7,
      level_max: 10,
      review_status: "approved",
      payload: { answer: 1 }, // missing display.promptText
    };
    expect(normalizeBankRow(row)).toBeNull();
  });
});

describe("fetchApprovedBank", () => {
  it("returns normalized items on success", async () => {
    setSelectResult({
      data: [
        {
          item_id: "addition-app-cloud-1",
          mode_id: "addition",
          item_family: "application",
          subskill: "makeTen",
          structure_type: "joinResultUnknown",
          level_min: 7,
          level_max: 10,
          review_status: "approved",
          payload: {
            a: 5,
            b: 5,
            op: "+",
            answer: 10,
            display: { promptText: "A class has 5 red and 5 blue balloons. How many balloons in all?" },
          },
        },
      ],
    });
    const items = await fetchApprovedBank();
    expect(items).toHaveLength(1);
    expect(items[0].itemId).toBe("addition-app-cloud-1");
  });

  it("returns null when supabase errors", async () => {
    setSelectResult({ data: null, error: { message: "boom" } });
    const items = await fetchApprovedBank();
    expect(items).toBeNull();
  });

  it("selects the v2 columns alongside the v1 ones", async () => {
    setSelectResult({ data: [] });
    await fetchApprovedBank();
    const fields = mockChain.select.mock.calls[0][0];
    for (const col of ["item_id", "payload", "level_band", "version", "item_model_id", "difficulty", "hint", "tags"]) {
      expect(fields).toContain(col);
    }
  });

  it("falls back to the v1 select, once, when the v2 columns are missing", async () => {
    // A deploy ahead of the migration: PostgREST rejects the unknown column.
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockChain.range
      .mockResolvedValueOnce({ data: null, error: { code: "42703", message: "column item_bank.hint does not exist" } })
      .mockResolvedValue({ data: [approvedRow("addition-app-old", "addition")], error: null });

    const items = await fetchApprovedBank();
    expect(items.map((i) => i.itemId)).toEqual(["addition-app-old"]);
    expect(items[0].version).toBe(1);
    expect(mockChain.select.mock.calls[0][0]).toContain("hint");
    expect(mockChain.select.mock.calls[1][0]).not.toContain("hint");
    expect(console.warn).toHaveBeenCalledTimes(1);

    // The probe sticks for the session: the next fetch goes straight to v1.
    mockChain.select.mockClear();
    await fetchApprovedBank();
    expect(mockChain.select.mock.calls[0][0]).not.toContain("hint");
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("answers a missing column for every caller that hit it, warning once", () => {
    // Two reads are in flight together on every reload; the second to see the
    // 42703 must retry too, or its load fails on today's database.
    const missing = { code: "42703", message: "column item_bank.hint does not exist" };
    expect(noteMissingV2Columns(missing)).toBe(true);
    expect(noteMissingV2Columns(missing)).toBe(true);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(noteMissingV2Columns({ code: "PGRST301", message: "JWT expired" })).toBe(false);
    expect(noteMissingV2Columns(null)).toBe(false);
  });

  it("keeps v1 rows and drops v2 rows when the switch table is missing", async () => {
    setSwitchResult({ data: null, error: { code: "PGRST205", message: "Could not find the table" } });
    setSelectResult({
      data: [
        approvedRow("money-app-1", "money"),
        approvedRow("money-app-1-v2", "money", { version: 2 }),
        approvedRow("time-app-1", "time", { version: 1 }),
      ],
    });
    const items = await fetchApprovedBank();
    expect(items.map((i) => i.itemId)).toEqual(["money-app-1", "time-app-1"]);
  });

  it("serves v2 rows for a skill flipped to v2 and v1 rows for the rest", async () => {
    setSwitchResult({ data: [{ mode_id: "money", live_version: "v2" }] });
    setSelectResult({
      data: [
        approvedRow("money-app-1", "money"),
        approvedRow("money-app-1-v2", "money", { version: 2 }),
        approvedRow("time-app-1", "time"),
        approvedRow("time-app-1-v2", "time", { version: 2 }),
      ],
    });
    const items = await fetchApprovedBank();
    expect(items.map((i) => i.itemId)).toEqual(["money-app-1-v2", "time-app-1"]);
  });

  it("shows a skill in preview as v2 only to preview browsers", async () => {
    setSwitchResult({ data: [{ mode_id: "money", live_version: "preview" }] });
    setSelectResult({
      data: [approvedRow("money-app-1", "money"), approvedRow("money-app-1-v2", "money", { version: 2 })],
    });
    expect((await fetchApprovedBank()).map((i) => i.itemId)).toEqual(["money-app-1"]);

    const store = new Map([["kidmath:previewV2", "1"]]);
    vi.stubGlobal("localStorage", {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    });
    expect((await fetchApprovedBank()).map((i) => i.itemId)).toEqual(["money-app-1-v2"]);
  });
});

describe("hydrateBankFromCloud", () => {
  it("replaces the in-memory bank and notifies subscribers on success", async () => {
    const bundleSize = getBankItems().length;
    expect(getBankSource()).toBe("bundle");

    const cb = vi.fn();
    const unsubscribe = subscribeBankChanges(cb);

    setSelectResult({
      data: [
        {
          item_id: "subtraction-app-cloud-1",
          mode_id: "subtraction",
          item_family: "application",
          subskill: "differenceAsDistance",
          structure_type: "compareDifferenceUnknown",
          level_min: 7,
          level_max: 10,
          review_status: "approved",
          payload: {
            a: 12,
            b: 5,
            op: "−",
            answer: 7,
            display: { promptText: "Sam read 12 pages and Pat read 5 pages. How many more did Sam read?" },
          },
        },
      ],
    });

    const ok = await hydrateBankFromCloud();
    expect(ok).toBe(true);
    expect(getBankSource()).toBe("cloud");
    const items = getBankItems();
    expect(items).toHaveLength(1);
    expect(items[0].itemId).toBe("subtraction-app-cloud-1");
    expect(cb).toHaveBeenCalled();
    expect(items.length).not.toBe(bundleSize);
    unsubscribe();
  });

  it("leaves the bundled cache intact when cloud fetch fails", async () => {
    setSelectResult({ data: null, error: { message: "no" } });
    const ok = await hydrateBankFromCloud();
    expect(ok).toBe(false);
    expect(getBankSource()).toBe("bundle");
    expect(getBankItems().length).toBeGreaterThan(0);
  });

  it("re-reads the switch on every full refresh so a flip needs no redeploy", async () => {
    setSelectResult({
      data: [approvedRow("money-app-1", "money"), approvedRow("money-app-1-v2", "money", { version: 2 })],
    });
    await hydrateBankFromCloud();
    expect(getBankItems().map((i) => i.itemId)).toEqual(["money-app-1"]);

    setSwitchResult({ data: [{ mode_id: "money", live_version: "v2" }] });
    await hydrateBankFromCloud();
    expect(switchChain.select).toHaveBeenCalledTimes(2);
    expect(getBankItems().map((i) => i.itemId)).toEqual(["money-app-1-v2"]);
  });
});
