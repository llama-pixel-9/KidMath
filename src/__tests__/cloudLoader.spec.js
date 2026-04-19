import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase before importing the loader so the module picks up the mock.
const mockChain = {
  select: vi.fn(),
  eq: vi.fn(),
};

vi.mock("../supabaseClient.js", () => ({
  supabase: {
    from: vi.fn(() => mockChain),
  },
}));

import {
  fetchApprovedBank,
  hydrateBankFromCloud,
  normalizeBankRow,
} from "../itemBank/cloudLoader.js";
import {
  getBankItems,
  getBankSource,
  resetBankToBundle,
  subscribeBankChanges,
} from "../itemBank/index.js";

function setSelectResult({ data, error = null }) {
  mockChain.select.mockReturnValue(mockChain);
  mockChain.eq.mockResolvedValue({ data, error });
}

beforeEach(() => {
  resetBankToBundle();
  mockChain.select.mockReset();
  mockChain.eq.mockReset();
});

afterEach(() => {
  resetBankToBundle();
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
});
