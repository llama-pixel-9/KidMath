import { beforeEach, describe, expect, it, vi } from "vitest";

// nativeEntry imports the consent notice as text (esbuild's .md loader in
// scripts/buildEngineBundle.js); Vite cannot transform a bare .md import, and
// nothing here reads the notice.
vi.mock("../legal/parental-consent-notice.md", () => ({ default: "" }));

import "../engine/nativeEntry.js";
import { SEED_ITEMS } from "../itemBank/bundle.js";
import { selectApprovedBankItem } from "../itemBank/index.js";
import { normalizeBankRow } from "../itemBank/normalize.js";
import { isServable, switchMapFromRows, topicVisible } from "../itemBank/versionRules.js";
import { V2_ONLY_MODE_IDS } from "../modes/index.js";

/**
 * The iOS engine applies the item bank version switch exactly as the web
 * loaders do. Drives the same KidMath global Swift calls through
 * JavaScriptCore: setVersionSwitch + addBankRows / setBankItems /
 * resetBankToBundle, then reads what the engine would serve.
 */
const K = globalThis.KidMath;

/** A raw PostgREST item_bank row, the shape SupabaseService hands the engine. */
function additionRow(id, { version, status = "approved", a = 7, b = 5 } = {}) {
  const row = {
    item_id: id,
    mode_id: "addition",
    item_family: "procedural",
    subskill: "composeDecompose",
    structure_type: "add-result-unknown",
    level_min: 1,
    level_max: 3,
    review_status: status,
    payload: { a, b, op: "+", answer: a + b, display: { promptText: `${a} + ${b} = ? (${id})` } },
    representation_type: "symbolic",
    source: "test",
    level_band: "G2",
  };
  // `undefined` leaves the column out (a select without `version`).
  if (version !== undefined) row.version = version;
  return row;
}

/** A Math Facts row built from a bundled seed item (the topic has no v1 rows). */
const FACT_SEED = SEED_ITEMS.find((item) => item.modeId === "mathFacts");
function factRow(id, { version = 2, status = "approved" } = {}) {
  return {
    item_id: id,
    mode_id: "mathFacts",
    item_family: FACT_SEED.itemFamily,
    subskill: FACT_SEED.subskill,
    structure_type: FACT_SEED.structureType,
    level_min: FACT_SEED.levelRange[0],
    level_max: FACT_SEED.levelRange[1],
    review_status: status,
    payload: FACT_SEED.question,
    representation_type: null,
    source: "test",
    level_band: null,
    version,
  };
}

// Every row kind a topic can hold: v1, v1 without a version column, version
// null, v2, and unapproved rows of both versions.
const ADDITION_ROWS = [
  additionRow("add-v1-a", { version: 1 }),
  additionRow("add-v1-b", { version: 1, a: 3 }),
  additionRow("add-nover", { a: 4 }),
  additionRow("add-null", { version: null, a: 6 }),
  additionRow("add-v2-a", { version: 2, a: 8 }),
  additionRow("add-v2-b", { version: 2, a: 9 }),
  additionRow("add-v1-draft", { version: 1, status: "draft", a: 2 }),
  additionRow("add-v2-reviewed", { version: 2, status: "reviewed", a: 1 }),
  additionRow("add-v2-retired", { version: 2, status: "retired", a: 5, b: 4 }),
];
const V1_IDS = ["add-v1-a", "add-v1-b", "add-nover", "add-null"];
const V2_IDS = ["add-v2-a", "add-v2-b"];

const idsOf = (modeId) =>
  K.getBankItems()
    .filter((item) => item.modeId === modeId)
    .map((item) => item.itemId)
    .sort();
const seedIdsOf = (modeId) =>
  SEED_ITEMS.filter((item) => item.modeId === modeId)
    .map((item) => item.itemId)
    .sort();
const sw = (modeId, live) => [{ mode_id: modeId, live_version: live }];

beforeEach(() => {
  K.setVersionSwitch([], {});
  K.resetBankToBundle();
});

describe("native engine: version switch on cloud rows", () => {
  it("serves v1 rows (with or without a version) by default and replaces the topic's seed", () => {
    expect(K.addBankRows(ADDITION_ROWS)).toBe(ADDITION_ROWS.length);
    expect(idsOf("addition")).toEqual([...V1_IDS].sort());
    expect(K.getBankSource()).toBe("native-cloud");
    // Other topics keep their seed.
    expect(idsOf("subtraction")).toEqual(seedIdsOf("subtraction"));
  });

  it.each([
    // switch rows                         preview  served
    [[], false, V1_IDS],
    [sw("addition", "v1"), false, V1_IDS],
    [sw("addition", "v1"), true, V1_IDS],
    [sw("addition", "preview"), false, V1_IDS],
    [sw("addition", "preview"), true, V2_IDS],
    [sw("addition", "v2"), false, V2_IDS],
    [sw("addition", "v2"), true, V2_IDS],
    [sw("addition", "v3"), true, V1_IDS],
    [sw("money", "v2"), false, V1_IDS],
  ])("switch %j preview=%s flips the served rows without a re-fetch", (rows, preview, served) => {
    K.addBankRows(ADDITION_ROWS);
    K.setVersionSwitch(rows, { preview });
    expect(idsOf("addition")).toEqual([...served].sort());
  });

  it("takes the switch before or after the rows alike", () => {
    K.setVersionSwitch(sw("addition", "v2"), {});
    K.addBankRows(ADDITION_ROWS);
    expect(idsOf("addition")).toEqual([...V2_IDS].sort());
    K.setVersionSwitch([], {});
    expect(idsOf("addition")).toEqual([...V1_IDS].sort());
  });

  it("serves nothing from the bank for a topic at v2 with no approved v2 rows (generator fallback, as on the web)", () => {
    K.addBankRows(ADDITION_ROWS.filter((row) => row.version !== 2));
    K.setVersionSwitch(sw("addition", "v2"), {});
    expect(idsOf("addition")).toEqual([]);
  });

  it("question selection draws only servable rows", () => {
    K.addBankRows(ADDITION_ROWS);
    const draws = (n) => {
      const picked = new Set();
      for (let k = 0; k < n; k += 1) {
        const item = selectApprovedBankItem({ modeId: "addition", level: 2, family: "procedural", rng: () => k / n });
        picked.add(item?.itemId);
      }
      return [...picked].sort();
    };
    expect(draws(40)).toEqual([...V1_IDS].sort());
    K.setVersionSwitch(sw("addition", "v2"), {});
    expect(draws(40)).toEqual([...V2_IDS].sort());
  });

  it("matches the web's mode load (normalize, then isServable) for every switch state and viewer", () => {
    K.addBankRows(ADDITION_ROWS);
    for (const live of [null, "v1", "preview", "v2", "bogus"]) {
      for (const preview of [false, true]) {
        const rows = live ? sw("addition", live) : [];
        K.setVersionSwitch(rows, { preview });
        const web = ADDITION_ROWS.map(normalizeBankRow)
          .filter((item) => isServable(item, switchMapFromRows(rows), { preview }))
          .map((item) => item.itemId)
          .sort();
        expect(idsOf("addition"), `live=${live} preview=${preview}`).toEqual(web);
      }
    }
  });

  it("keeps the newest copy of a re-sent row and counts only new ids", () => {
    expect(K.addBankRows([additionRow("add-v1-a", { version: 1 })])).toBe(1);
    expect(K.addBankRows([additionRow("add-v1-a", { version: 1 })])).toBe(0);
    // The same id re-sent as version 2 now follows the v2 rule.
    expect(K.addBankRows([additionRow("add-v1-a", { version: 2 })])).toBe(0);
    expect(idsOf("addition")).toEqual([]);
    K.setVersionSwitch(sw("addition", "v2"), {});
    expect(idsOf("addition")).toEqual(["add-v1-a"]);
  });

  it("a fetch with no rows for its topic still replaces that topic's seed (the web's signed-in refresh)", () => {
    const seeded = K.bankCount();
    const seededAddition = seedIdsOf("addition").length;
    expect(seededAddition).toBeGreaterThan(0);
    expect(K.addBankRows([], "addition")).toBe(0);
    expect(idsOf("addition")).toEqual([]);
    expect(K.bankCount()).toBe(seeded - seededAddition);
    expect(K.getBankSource()).toBe("native-cloud");
    expect(idsOf("subtraction")).toEqual(seedIdsOf("subtraction"));
    // Rows arriving later for the same topic are served as usual.
    K.addBankRows(ADDITION_ROWS, "addition");
    expect(idsOf("addition")).toEqual([...V1_IDS].sort());
  });

  it("Math Facts with only unapproved cloud rows serves no seed items (the prod state on 2026-10-02)", () => {
    expect(seedIdsOf("mathFacts").length).toBeGreaterThan(0);
    K.addBankRows([factRow("facts-draft-only", { status: "draft" })], "mathFacts");
    expect(idsOf("mathFacts")).toEqual([]);
  });

  it("an unchanged switch does not rebuild the bank", () => {
    K.addBankRows(ADDITION_ROWS);
    K.setVersionSwitch(sw("addition", "v2"), { preview: false });
    const before = K.getBankItems();
    K.setVersionSwitch([{ mode_id: "addition", live_version: "v2" }], { preview: false });
    expect(K.getBankItems()).toBe(before);
    K.setVersionSwitch(sw("addition", "v2"), { preview: true });
    expect(K.getBankItems()).not.toBe(before);
  });

  it("drops invalid rows without touching the bank", () => {
    const before = K.bankCount();
    const bad = additionRow("add-bad", { version: 1 });
    bad.payload = { ...bad.payload, answer: 99 };
    expect(K.addBankRows([bad, {}, null])).toBe(0);
    expect(K.bankCount()).toBe(before);
    expect(K.getBankSource()).toBe("bundle");
  });
});

describe("native engine: topics without cloud rows", () => {
  it("keeps the seed unfiltered, as the web does for signed-out and offline kids", () => {
    K.setVersionSwitch([...sw("addition", "v2"), ...sw("mathFacts", "v1")], { preview: true });
    expect(idsOf("addition")).toEqual(seedIdsOf("addition"));
    expect(idsOf("mathFacts")).toEqual(seedIdsOf("mathFacts"));
    expect(K.bankCount()).toBe(SEED_ITEMS.length);
  });

  it("an empty injected bank stays empty across switch changes", () => {
    K.setBankItems([]);
    expect(K.bankCount()).toBe(0);
    K.setVersionSwitch(sw("addition", "v2"), { preview: true });
    expect(K.bankCount()).toBe(0);
    K.setVersionSwitch([], {});
    expect(K.bankCount()).toBe(0);
    expect(K.getBankSource()).toBe("native");
  });

  it("resetBankToBundle drops cloud rows and restores the seed exactly", () => {
    K.addBankRows(ADDITION_ROWS);
    K.setVersionSwitch(sw("addition", "v2"), {});
    K.resetBankToBundle();
    expect(K.getBankItems().map((item) => item.itemId)).toEqual(SEED_ITEMS.map((item) => item.itemId));
    expect(K.getBankSource()).toBe("bundle");
  });
});

describe("native engine: v2-only topics (Math Facts)", () => {
  const FACT_ROWS = [factRow("facts-v2-a"), factRow("facts-v2-b"), factRow("facts-v2-draft", { status: "draft" })];

  it.each([
    // switch rows                 preview  served
    [[], false, ["facts-v2-a", "facts-v2-b"]],
    [sw("mathFacts", "v2"), false, ["facts-v2-a", "facts-v2-b"]],
    [sw("mathFacts", "v1"), true, []],
    [sw("mathFacts", "preview"), false, []],
    [sw("mathFacts", "preview"), true, ["facts-v2-a", "facts-v2-b"]],
  ])("switch %j preview=%s", (rows, preview, served) => {
    K.addBankRows(FACT_ROWS);
    K.setVersionSwitch(rows, { preview });
    expect(idsOf("mathFacts")).toEqual(served);
  });

  it("hiddenTopics agrees with topicVisible for every switch state", () => {
    expect(V2_ONLY_MODE_IDS).toContain("mathFacts");
    for (const live of [null, "v1", "preview", "v2"]) {
      for (const preview of [false, true]) {
        const rows = live ? sw("mathFacts", live) : [];
        K.setVersionSwitch(rows, { preview });
        const expected = V2_ONLY_MODE_IDS.filter(
          (id) => !topicVisible(id, switchMapFromRows(rows), { v2Only: true, preview })
        );
        expect(K.hiddenTopics(), `live=${live} preview=${preview}`).toEqual(expected);
      }
    }
    K.setVersionSwitch([], {});
    expect(K.hiddenTopics()).toEqual([]);
    K.setVersionSwitch(sw("mathFacts", "v1"), {});
    expect(K.hiddenTopics()).toEqual(["mathFacts"]);
  });
});
