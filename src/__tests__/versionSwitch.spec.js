import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The client is swappable per test: null models an unconfigured deploy, a
// chain models a table read. A getter keeps the import binding live.
const state = { client: null };
const switchChain = { select: vi.fn() };

vi.mock("../supabaseClient.js", () => ({
  get supabase() {
    return state.client;
  },
}));

import {
  isServable,
  loadVersionSwitch,
  previewEnabled,
  setPreviewEnabled,
} from "../itemBank/versionSwitch.js";
import { SEED_ITEMS } from "../itemBank/bundle.js";

/** A minimal Storage stand-in: vitest runs in Node, which has none. */
function fakeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

beforeEach(() => {
  state.client = null;
  switchChain.select.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const approved = (modeId, version) => ({ modeId, reviewStatus: "approved", version });

describe("isServable", () => {
  // Every live_version x row version x viewer combination. A skill absent
  // from the map is v1; a row without a version is version 1.
  it.each([
    // live      version  preview  served
    ["absent", null, false, true],
    ["absent", null, true, true],
    ["absent", 1, false, true],
    ["absent", 1, true, true],
    ["absent", 2, false, false],
    ["absent", 2, true, false],
    ["v1", null, false, true],
    ["v1", null, true, true],
    ["v1", 1, false, true],
    ["v1", 1, true, true],
    ["v1", 2, false, false],
    ["v1", 2, true, false],
    ["preview", null, false, true],
    ["preview", null, true, false],
    ["preview", 1, false, true],
    ["preview", 1, true, false],
    ["preview", 2, false, false],
    ["preview", 2, true, true],
    ["v2", null, false, false],
    ["v2", null, true, false],
    ["v2", 1, false, false],
    ["v2", 1, true, false],
    ["v2", 2, false, true],
    ["v2", 2, true, true],
  ])("live=%s version=%s preview=%s -> %s", (live, version, preview, served) => {
    const map = new Map(live === "absent" ? [] : [["money", live]]);
    expect(isServable(approved("money", version), map, { preview })).toBe(served);
  });

  it("serves only approved rows whatever the switch says", () => {
    const map = new Map([["money", "v2"]]);
    for (const status of ["draft", "reviewed", "retired", undefined]) {
      expect(isServable({ modeId: "money", reviewStatus: status, version: 2 }, map)).toBe(false);
    }
    expect(isServable(null, map)).toBe(false);
  });

  it("treats a missing map and an unknown live value as v1", () => {
    expect(isServable(approved("money", 1), undefined)).toBe(true);
    expect(isServable(approved("money", 2), null)).toBe(false);
    expect(isServable(approved("money", 1), new Map([["money", "v3"]]))).toBe(true);
  });

  it("scopes the switch to the item's own skill", () => {
    const map = new Map([["money", "v2"]]);
    expect(isServable(approved("money", 2), map)).toBe(true);
    expect(isServable(approved("time", 2), map)).toBe(false);
    expect(isServable(approved("time", 1), map)).toBe(true);
  });

  it("serves every bundled seed item, which predates the version field", () => {
    const empty = new Map();
    const v1 = SEED_ITEMS.filter((item) => item.version == null);
    expect(v1.length).toBeGreaterThan(0);
    expect(v1.every((item) => isServable(item, empty))).toBe(true);
    expect(v1.every((item) => isServable(item, empty, { preview: true }))).toBe(true);
  });

  it("holds back the bundled Math Facts rows (v2 only) until their switch moves", () => {
    const v2 = SEED_ITEMS.filter((item) => item.version != null);
    expect(v2.length).toBeGreaterThan(0);
    expect(v2.every((item) => item.modeId === "mathFacts" && Number(item.version) === 2)).toBe(true);
    expect(v2.some((item) => isServable(item, new Map()))).toBe(false);
    expect(v2.every((item) => isServable(item, new Map([["mathFacts", "v2"]])))).toBe(true);
    expect(v2.every((item) => isServable(item, new Map([["mathFacts", "preview"]]), { preview: true }))).toBe(true);
  });
});

describe("loadVersionSwitch", () => {
  it("is empty when Supabase is unconfigured", async () => {
    state.client = null;
    const map = await loadVersionSwitch();
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });

  it("is empty when the table is missing (migration not applied)", async () => {
    state.client = { from: vi.fn(() => switchChain) };
    switchChain.select.mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "Could not find the table 'public.item_version_switch'" },
    });
    const map = await loadVersionSwitch();
    expect(map.size).toBe(0);
    expect(state.client.from).toHaveBeenCalledWith("item_version_switch");
  });

  it("is empty when the read throws", async () => {
    state.client = { from: vi.fn(() => ({ select: () => Promise.reject(new Error("offline")) })) };
    await expect(loadVersionSwitch()).resolves.toEqual(new Map());
  });

  it("maps each skill to its live version and ignores malformed rows", async () => {
    state.client = { from: vi.fn(() => switchChain) };
    switchChain.select.mockResolvedValue({
      data: [
        { mode_id: "money", live_version: "v2" },
        { mode_id: "time", live_version: "preview" },
        { mode_id: "addition", live_version: "v1" },
        { mode_id: "angles", live_version: "beta" },
        { live_version: "v2" },
      ],
      error: null,
    });
    const map = await loadVersionSwitch();
    expect([...map.entries()]).toEqual([
      ["money", "v2"],
      ["time", "preview"],
      ["addition", "v1"],
    ]);
  });
});

describe("preview marker", () => {
  it("is off when there is no storage at all", () => {
    expect(previewEnabled()).toBe(false);
    expect(() => setPreviewEnabled(true)).not.toThrow();
  });

  it("round-trips through localStorage", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    expect(previewEnabled()).toBe(false);
    setPreviewEnabled(true);
    expect(previewEnabled()).toBe(true);
    expect(localStorage.getItem("kidmath:previewV2")).toBe("1");
    setPreviewEnabled(false);
    expect(previewEnabled()).toBe(false);
  });

  it("is set by ?preview=v2 and cleared by ?preview=v1", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    vi.stubGlobal("window", { location: { search: "?preview=v2" } });
    expect(previewEnabled()).toBe(true);
    // The marker outlives the query string, like the invite link.
    vi.stubGlobal("window", { location: { search: "" } });
    expect(previewEnabled()).toBe(true);
    vi.stubGlobal("window", { location: { search: "?preview=v1" } });
    expect(previewEnabled()).toBe(false);
  });

  it("ignores other preview values", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    vi.stubGlobal("window", { location: { search: "?preview=yes" } });
    expect(previewEnabled()).toBe(false);
  });
});
