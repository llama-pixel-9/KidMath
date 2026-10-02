import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  DEFAULT_LIVE_VERSION,
  isServable,
  liveVersionFor,
  loadVersionSwitch,
  previewEnabled,
  readVersionSwitch,
  setPreviewEnabled,
  switchMapFromRows,
  topicVisible,
} from "../itemBank/versionSwitch.js";
import * as rules from "../itemBank/versionRules.js";
import { SEED_ITEMS } from "../itemBank/bundle.js";
import { V2_ONLY_MODE_IDS } from "../modes/index.js";

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

  it("serves the bundled Math Facts rows (v2 only) with no switch row, and holds them back at v1", () => {
    const v2 = SEED_ITEMS.filter((item) => item.version != null);
    expect(v2.length).toBeGreaterThan(0);
    expect(v2.every((item) => item.modeId === "mathFacts" && Number(item.version) === 2)).toBe(true);
    expect(v2.every((item) => isServable(item, new Map()))).toBe(true);
    expect(v2.every((item) => isServable(item, null))).toBe(true);
    expect(v2.some((item) => isServable(item, new Map([["mathFacts", "v1"]])))).toBe(false);
    expect(v2.some((item) => isServable(item, new Map([["mathFacts", "preview"]])))).toBe(false);
    expect(v2.every((item) => isServable(item, new Map([["mathFacts", "v2"]])))).toBe(true);
    expect(v2.every((item) => isServable(item, new Map([["mathFacts", "preview"]]), { preview: true }))).toBe(true);
  });

  it("defaults every v2-only topic to v2 or preview (never v1, never missing); every other topic with no row is v1", () => {
    expect(Object.keys(DEFAULT_LIVE_VERSION).sort()).toEqual([...V2_ONLY_MODE_IDS].sort());
    for (const id of V2_ONLY_MODE_IDS) expect(["v2", "preview"], id).toContain(DEFAULT_LIVE_VERSION[id]);
    expect(isServable({ modeId: "money", reviewStatus: "approved", version: 2 }, new Map())).toBe(false);
  });

  it("holds Word Problems rows (v2 only, default preview) for preview viewers until Sai flips it", () => {
    const row = approved("wordProblems", 2);
    expect(isServable(row, new Map())).toBe(false);
    expect(isServable(row, null)).toBe(false);
    expect(isServable(row, new Map(), { preview: true })).toBe(true);
    expect(isServable(row, new Map([["wordProblems", "v2"]]))).toBe(true);
    expect(isServable(row, new Map([["wordProblems", "v1"]]), { preview: true })).toBe(false);
  });
});

describe("topicVisible", () => {
  it("always shows a topic with v1 rows", () => {
    expect(topicVisible("money", new Map())).toBe(true);
    expect(topicVisible("money", new Map([["money", "v2"]]))).toBe(true);
  });

  it("shows Math Facts with no row or at v2, to preview browsers at preview, never at v1", () => {
    const v2Only = { v2Only: true };
    expect(topicVisible("mathFacts", new Map(), v2Only)).toBe(true);
    expect(topicVisible("mathFacts", null, v2Only)).toBe(true);
    expect(topicVisible("mathFacts", new Map([["mathFacts", "v1"]]), v2Only)).toBe(false);
    expect(topicVisible("mathFacts", new Map([["mathFacts", "preview"]]), v2Only)).toBe(false);
    expect(topicVisible("mathFacts", new Map([["mathFacts", "preview"]]), { ...v2Only, preview: true })).toBe(true);
    expect(topicVisible("mathFacts", new Map([["mathFacts", "v2"]]), v2Only)).toBe(true);
  });

  it("hides Word Problems with no row (or an empty, offline switch) from all but preview viewers", () => {
    const v2Only = { v2Only: true };
    const preview = { v2Only: true, preview: true };
    expect(topicVisible("wordProblems", new Map(), v2Only)).toBe(false);
    expect(topicVisible("wordProblems", null, v2Only)).toBe(false);
    expect(topicVisible("wordProblems", new Map(), preview)).toBe(true);
    expect(topicVisible("wordProblems", null, preview)).toBe(true);
    expect(topicVisible("wordProblems", new Map([["wordProblems", "v1"]]), preview)).toBe(false);
    expect(topicVisible("wordProblems", new Map([["wordProblems", "preview"]]), v2Only)).toBe(false);
    expect(topicVisible("wordProblems", new Map([["wordProblems", "v2"]]), v2Only)).toBe(true);
  });
});

describe("versionRules (the rules both platforms run)", () => {
  it("is what versionSwitch.js re-exports, so the web and the native engine share one copy", () => {
    expect(isServable).toBe(rules.isServable);
    expect(topicVisible).toBe(rules.topicVisible);
    expect(liveVersionFor).toBe(rules.liveVersionFor);
    expect(switchMapFromRows).toBe(rules.switchMapFromRows);
    expect(DEFAULT_LIVE_VERSION).toBe(rules.DEFAULT_LIVE_VERSION);
  });

  it("switchMapFromRows keeps valid rows and drops the rest", () => {
    const map = switchMapFromRows([
      { mode_id: "money", live_version: "v2" },
      { mode_id: "time", live_version: "preview" },
      { mode_id: "angles", live_version: "beta" },
      { live_version: "v2" },
      null,
    ]);
    expect([...map.entries()]).toEqual([
      ["money", "v2"],
      ["time", "preview"],
    ]);
    expect(switchMapFromRows(null).size).toBe(0);
    expect(switchMapFromRows({ mode_id: "money", live_version: "v2" }).size).toBe(0);
  });

  it("liveVersionFor falls back to the topic default, then v1", () => {
    expect(liveVersionFor(new Map([["money", "v2"]]), "money")).toBe("v2");
    expect(liveVersionFor(new Map([["money", "v3"]]), "money")).toBe("v1");
    expect(liveVersionFor(new Map(), "mathFacts")).toBe("v2");
    expect(liveVersionFor(new Map(), "wordProblems")).toBe("preview");
    expect(liveVersionFor(new Map([["wordProblems", "v2"]]), "wordProblems")).toBe("v2");
    expect(liveVersionFor(null, "money")).toBe("v1");
    expect(liveVersionFor({ money: "preview" }, "money")).toBe("preview");
  });

  it("imports nothing that reaches Supabase, storage or the DOM (the iOS engine bundles it)", () => {
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../itemBank/versionRules.js"), "utf8");
    const imports = [...source.matchAll(/^import .* from "(.+)";$/gm)].map((m) => m[1]);
    expect(imports).toEqual(["./reviewStatus.js"]);
    expect(source).not.toMatch(/localStorage|\bwindow\b|\bdocument\./);
  });
});

describe("readVersionSwitch", () => {
  it("is null when the read fails, so a caller can keep its last good map", async () => {
    state.client = null;
    await expect(readVersionSwitch()).resolves.toBeNull();
    state.client = { from: vi.fn(() => switchChain) };
    switchChain.select.mockResolvedValue({ data: null, error: { code: "PGRST205", message: "no table" } });
    await expect(readVersionSwitch()).resolves.toBeNull();
    state.client = { from: vi.fn(() => ({ select: () => Promise.reject(new Error("offline")) })) };
    await expect(readVersionSwitch()).resolves.toBeNull();
  });

  it("is a map, possibly empty, when the read succeeds", async () => {
    state.client = { from: vi.fn(() => switchChain) };
    switchChain.select.mockResolvedValue({ data: [], error: null });
    await expect(readVersionSwitch()).resolves.toEqual(new Map());
    switchChain.select.mockResolvedValue({ data: [{ mode_id: "money", live_version: "v2" }], error: null });
    await expect(readVersionSwitch()).resolves.toEqual(new Map([["money", "v2"]]));
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
