import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The admin write paths for item bank v2: item model review decisions and
 * the per-skill version switch. Both talk to Supabase through the same
 * swappable client the versionSwitch spec uses (null models an unconfigured
 * deploy), and both stamp the signed-in user on the row. A getter keeps the
 * import binding live so each test can install its own client.
 */

const state = { client: null };

vi.mock("../supabaseClient.js", () => ({
  get supabase() {
    return state.client;
  },
}));

// The switch write re-hydrates the bank; that loader has its own spec.
const refreshBankFromCloud = vi.fn();
vi.mock("../itemBank/cloudLoader.js", () => ({
  refreshBankFromCloud: (...args) => refreshBankFromCloud(...args),
}));

import { listItemModels, setModelReview, saveModelSpec, MODEL_REVIEW_STATUSES } from "../admin/itemModelsApi.js";
import { listApprovedV2Rows, listVersionSwitch, readTopicReadiness, setLiveVersion, LIVE_VERSIONS } from "../admin/versionSwitchApi.js";
import { isBankSkill, topicReadiness, withBundle } from "../itemBank/v2/topicReadiness.js";
import { factBankItems } from "../facts/factItems.js";
import { calcBankItems } from "../multiDigit/calcItems.js";
import { playSkillById } from "../skills/play.js";

const UID = "11111111-2222-3333-4444-555555555555";

/**
 * A query-builder stand-in: every method returns the chain, and the two
 * terminal calls (`range` for a page, `single` for one row) resolve to what
 * the test queued. Calls are recorded so a test can assert the filter,
 * the patch and the conflict target.
 */
function makeChain() {
  const chain = {};
  for (const m of ["select", "order", "eq", "update", "upsert", "in"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.range = vi.fn();
  chain.single = vi.fn();
  return chain;
}

function installClient({ user = { id: UID }, getUserRejects = false } = {}) {
  const chain = makeChain();
  state.client = {
    from: vi.fn(() => chain),
    auth: {
      getUser: vi.fn(() =>
        getUserRejects ? Promise.reject(new Error("no session")) : Promise.resolve({ data: { user } })
      ),
    },
  };
  return chain;
}

const modelRow = (id, extra = {}) => ({
  id,
  mode_id: "money",
  subskill: "makeChange",
  grade: "2",
  difficulty: "moderate",
  spec: { id, template: { prompt: "{name} pays." } },
  review_status: "draft",
  review_note: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: "2026-09-28T00:00:00Z",
  updated_at: "2026-09-28T00:00:00Z",
  ...extra,
});

beforeEach(() => {
  state.client = null;
  refreshBankFromCloud.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("itemModelsApi", () => {
  it("refuses to run without a configured client", async () => {
    await expect(listItemModels()).rejects.toThrow(/not configured/);
    await expect(setModelReview("m1", "approved")).rejects.toThrow(/not configured/);
  });

  it("pages through item_models and maps rows to the admin shape", async () => {
    const chain = installClient();
    // A full first page means "there may be more"; the short second page ends it.
    const firstPage = Array.from({ length: 1000 }, (_, i) => modelRow(`m${i}`));
    chain.range.mockResolvedValueOnce({ data: firstPage, error: null });
    chain.range.mockResolvedValueOnce({ data: [modelRow("last", { review_status: "approved", reviewed_by: UID })], error: null });

    const models = await listItemModels();

    expect(state.client.from).toHaveBeenCalledWith("item_models");
    expect(chain.range).toHaveBeenCalledTimes(2);
    expect(chain.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(chain.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(models).toHaveLength(1001);
    expect(models[0]).toMatchObject({
      id: "m0",
      modeId: "money",
      subskill: "makeChange",
      grade: "2",
      difficulty: "moderate",
      reviewStatus: "draft",
      reviewNote: null,
      reviewedBy: null,
    });
    expect(models[0].spec).toEqual(firstPage[0].spec);
    expect(models[1000]).toMatchObject({ id: "last", reviewStatus: "approved", reviewedBy: UID });
  });

  it("surfaces a read error (a missing table before the migration)", async () => {
    const chain = installClient();
    chain.range.mockResolvedValueOnce({ data: null, error: { message: "relation item_models does not exist" } });
    await expect(listItemModels()).rejects.toMatchObject({ message: /does not exist/ });
  });

  it("records a decision with the reviewer, the time and the reason", async () => {
    const chain = installClient();
    chain.single.mockResolvedValueOnce({
      data: modelRow("m1", { review_status: "rejected", review_note: "unrealistic", reviewed_by: UID, reviewed_at: "2026-09-28T12:00:00.000Z" }),
      error: null,
    });

    const updated = await setModelReview("m1", "rejected", { note: "unrealistic" });

    expect(chain.update).toHaveBeenCalledWith({
      review_status: "rejected",
      review_note: "unrealistic",
      reviewed_at: "2026-09-28T12:00:00.000Z",
      reviewed_by: UID,
    });
    expect(chain.eq).toHaveBeenCalledWith("id", "m1");
    expect(updated).toMatchObject({ id: "m1", reviewStatus: "rejected", reviewNote: "unrealistic", reviewedBy: UID });
  });

  it("carries an inline spec edit in the same write as the decision", async () => {
    const chain = installClient();
    const spec = { id: "m1", template: { prompt: "{name} buys {object_a}." } };
    chain.single.mockResolvedValueOnce({ data: modelRow("m1", { review_status: "approved", spec }), error: null });

    const updated = await setModelReview("m1", "approved", { spec });

    const patch = chain.update.mock.calls[0][0];
    expect(patch.spec).toEqual(spec);
    expect(patch.review_note).toBeNull();
    expect(updated.spec).toEqual(spec);
  });

  it("saves an inline spec edit on its own, without touching the review columns", async () => {
    const chain = installClient();
    const spec = { id: "m1", template: { prompt: "{name} buys {object_a}." }, hint: { nudge: "Start with the price." } };
    chain.single.mockResolvedValueOnce({ data: modelRow("m1", { review_status: "draft", spec }), error: null });

    const updated = await saveModelSpec("m1", spec);

    expect(chain.update).toHaveBeenCalledWith({ spec });
    expect(chain.eq).toHaveBeenCalledWith("id", "m1");
    expect(updated).toMatchObject({ id: "m1", reviewStatus: "draft" });
    expect(updated.spec).toEqual(spec);
    await expect(saveModelSpec("m1", null)).rejects.toThrow(/spec object/);
  });

  it("leaves reviewed_by alone when the session cannot be read", async () => {
    const chain = installClient({ getUserRejects: true });
    chain.single.mockResolvedValueOnce({ data: modelRow("m1", { review_status: "flagged" }), error: null });

    await setModelReview("m1", "flagged");

    const patch = chain.update.mock.calls[0][0];
    expect(patch).not.toHaveProperty("reviewed_by");
    expect(patch).not.toHaveProperty("spec");
    expect(patch.review_status).toBe("flagged");
  });

  it("refuses a status the table's check would reject", async () => {
    const chain = installClient();
    await expect(setModelReview("m1", "reviewed")).rejects.toThrow(/Unknown review status/);
    expect(chain.update).not.toHaveBeenCalled();
    expect(MODEL_REVIEW_STATUSES).toEqual(["draft", "approved", "rejected", "flagged"]);
  });

  it("throws the database error on a refused write (a non-admin under RLS)", async () => {
    const chain = installClient();
    chain.single.mockResolvedValueOnce({ data: null, error: { message: "new row violates row-level security policy" } });
    await expect(setModelReview("m1", "approved")).rejects.toMatchObject({ message: /row-level security/ });
  });
});

describe("versionSwitchApi", () => {
  it("refuses to run without a configured client", async () => {
    await expect(listVersionSwitch()).rejects.toThrow(/not configured/);
    await expect(setLiveVersion("money", "v2")).rejects.toThrow(/not configured/);
    expect(refreshBankFromCloud).not.toHaveBeenCalled();
  });

  it("lists every skill's row with its audit fields", async () => {
    const chain = installClient();
    // The list is a single ordered select; the builder's `order` resolves it.
    chain.order.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { mode_id: "addition", live_version: "v1", changed_by: null, changed_at: "2026-09-28T10:00:00Z", note: null },
          { mode_id: "money", live_version: "preview", changed_by: UID, changed_at: "2026-09-28T11:00:00Z", note: "pilot" },
        ],
        error: null,
      })
    );

    const rows = await listVersionSwitch();

    expect(state.client.from).toHaveBeenCalledWith("item_version_switch");
    expect(chain.order).toHaveBeenCalledWith("mode_id", { ascending: true });
    expect(rows).toEqual([
      { modeId: "addition", liveVersion: "v1", changedBy: null, changedAt: "2026-09-28T10:00:00Z", note: null },
      { modeId: "money", liveVersion: "preview", changedBy: UID, changedAt: "2026-09-28T11:00:00Z", note: "pilot" },
    ]);
  });

  it("surfaces a read error instead of pretending every skill is v1", async () => {
    const chain = installClient();
    chain.order.mockReturnValueOnce(Promise.resolve({ data: null, error: { message: "Could not find the table" } }));
    await expect(listVersionSwitch()).rejects.toMatchObject({ message: /Could not find/ });
  });

  it("upserts the flip by mode_id, stamped with the admin and the note", async () => {
    const chain = installClient();
    chain.single.mockResolvedValueOnce({
      data: { mode_id: "money", live_version: "preview", changed_by: UID, changed_at: "2026-09-28T12:00:00.000Z", note: "Grade 2 pilot" },
      error: null,
    });

    const row = await setLiveVersion("money", "preview", "  Grade 2 pilot ");

    expect(chain.upsert).toHaveBeenCalledWith(
      {
        mode_id: "money",
        live_version: "preview",
        changed_by: UID,
        changed_at: "2026-09-28T12:00:00.000Z",
        note: "Grade 2 pilot",
      },
      { onConflict: "mode_id" }
    );
    expect(row).toEqual({ modeId: "money", liveVersion: "preview", changedBy: UID, changedAt: "2026-09-28T12:00:00.000Z", note: "Grade 2 pilot" });
    // The admin's own bank re-reads the switch so the next session matches.
    expect(refreshBankFromCloud).toHaveBeenCalledWith({ force: true });
  });

  it("stores a blank note as null and a missing session as no changed_by", async () => {
    const chain = installClient({ getUserRejects: true });
    chain.single.mockResolvedValueOnce({
      data: { mode_id: "time", live_version: "v1", changed_by: null, changed_at: "2026-09-28T12:00:00.000Z", note: null },
      error: null,
    });

    await setLiveVersion("time", "v1", "   ");

    const row = chain.upsert.mock.calls[0][0];
    expect(row.note).toBeNull();
    expect(row.changed_by).toBeNull();
  });

  it("refuses a version the table's check would reject, before any write", async () => {
    const chain = installClient();
    await expect(setLiveVersion("money", "v3")).rejects.toThrow(/Unknown live version/);
    await expect(setLiveVersion("", "v2")).rejects.toThrow(/mode id/);
    expect(chain.upsert).not.toHaveBeenCalled();
    expect(refreshBankFromCloud).not.toHaveBeenCalled();
    expect(LIVE_VERSIONS).toEqual(["v1", "preview", "v2"]);
  });

  it("throws the database error on a refused write and does not re-hydrate", async () => {
    const chain = installClient();
    chain.single.mockResolvedValueOnce({ data: null, error: { message: "new row violates row-level security policy" } });
    await expect(setLiveVersion("money", "v2")).rejects.toMatchObject({ message: /row-level security/ });
    expect(refreshBankFromCloud).not.toHaveBeenCalled();
  });
});

/** A bank item as the item_bank row the readiness read selects. */
const toRow = (item, extra = {}) => ({
  item_id: item.itemId,
  mode_id: item.modeId,
  item_family: item.itemFamily,
  subskill: item.subskill,
  structure_type: item.structureType,
  level_min: item.levelRange[0],
  level_max: item.levelRange[1],
  review_status: "approved",
  payload: item.question,
  version: 2,
  difficulty: item.difficulty ?? null,
  ...extra,
});

describe("v2 readiness (the switch panel's line)", () => {
  const facts = factBankItems();
  const calc = calcBankItems().map((i) => ({ ...i, reviewStatus: "approved", version: 2 }));

  it("calls a topic ready only when it has approved v2 rows and every bank skill serves", () => {
    const ready = topicReadiness("mathFacts", facts);
    expect(ready).toMatchObject({ modeId: "mathFacts", rows: facts.length, gaps: [], ready: true });
    expect(ready.skills.length).toBe(10);
    expect(ready.skills.every((s) => s.count > 0)).toBe(true);

    expect(topicReadiness("wordProblems", facts)).toMatchObject({ rows: 0, ready: false, reason: "no approved version-2 rows" });
    // Rows, but three skills with none of their own: those sessions would fall to the generator.
    const partial = topicReadiness("multiDigit", calc);
    expect(partial.ready).toBe(false);
    expect(partial.gaps).toEqual(["md-g2-ten-hundred", "md-g2-equal-sign", "md-g2-ten-hundred-1200"]);
    expect(partial.reason).toMatch(/^3 of 6 skills have nothing to serve/);
  });

  it("counts only approved version-2 rows, and never gaps a computation drill", () => {
    expect(topicReadiness("mathFacts", facts.map((i) => ({ ...i, version: 1 }))).rows).toBe(0);
    expect(topicReadiness("mathFacts", facts.map((i) => ({ ...i, reviewStatus: "draft" }))).rows).toBe(0);
    const drill = playSkillById("add-within-20");
    expect(drill.source.kind).toBe("computation");
    expect(isBankSkill(drill)).toBe(false);
    const addition = topicReadiness("addition", []);
    expect(addition.skills.length).toBeGreaterThan(0);
    expect(addition.skills.map((s) => s.skillId)).not.toContain("add-within-20");
  });

  it("reads a topic's approved v2 rows page by page, filtered by mode, version and status", async () => {
    const chain = installClient();
    const firstPage = Array.from({ length: 1000 }, (_, i) => toRow(facts[i]));
    const rest = facts.slice(1000).map((i) => toRow(i));
    chain.range.mockResolvedValueOnce({ data: firstPage, error: null });
    chain.range.mockResolvedValueOnce({ data: [...rest, toRow(facts[0], { item_id: "broken", payload: null })], error: null });

    const { items, fetched } = await listApprovedV2Rows("mathFacts");

    expect(state.client.from).toHaveBeenCalledWith("item_bank");
    expect(chain.eq).toHaveBeenCalledWith("mode_id", "mathFacts");
    expect(chain.eq).toHaveBeenCalledWith("version", 2);
    expect(chain.eq).toHaveBeenCalledWith("review_status", "approved");
    expect(chain.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(chain.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(fetched).toBe(facts.length + 1);
    // The app's normalizer drops a row it cannot read; the panel says so.
    expect(items).toHaveLength(facts.length);
  });

  it("gives the panel the readiness of what it read, and names unreadable rows", async () => {
    const chain = installClient();
    chain.range.mockResolvedValueOnce({ data: [...calc.map((i) => toRow(i)), toRow(calc[0], { item_id: "broken", payload: null })], error: null });
    const result = await readTopicReadiness("multiDigit");
    expect(result).toMatchObject({ rows: calc.length, ready: false, unreadable: 1 });
    expect(result.reason).toMatch(/1 rows the app cannot read$/);
  });

  it("keeps v2 off until this build's bundle serves every skill too", async () => {
    const pages = (chain) => {
      chain.range.mockResolvedValueOnce({ data: facts.slice(0, 1000).map((i) => toRow(i)), error: null });
      chain.range.mockResolvedValueOnce({ data: facts.slice(1000).map((i) => toRow(i)), error: null });
    };
    // Math Facts: rows in the database and in the shipped seed.
    let chain = installClient();
    pages(chain);
    expect(await readTopicReadiness("mathFacts")).toMatchObject({ ready: true, bundle: { ready: true, gaps: [] } });
    // The same rows in the database, a bundle without them: the manifest and seed are not deployed yet.
    chain = installClient();
    pages(chain);
    const notDeployed = await readTopicReadiness("mathFacts", { bundleItems: [] });
    expect(notDeployed).toMatchObject({ rows: facts.length, ready: false, bundle: { rows: 0, ready: false } });
    expect(notDeployed.reason).toMatch(/bundle has no approved version-2 rows/);
    // A bundle that serves some skills only names the others.
    const db = topicReadiness("mathFacts", facts);
    const oneSubskill = facts.filter((i) => i.subskill === facts[0].subskill);
    const partial = withBundle(db, oneSubskill);
    expect(partial.ready).toBe(false);
    expect(partial.bundle.gaps.length).toBeGreaterThan(0);
    expect(partial.reason).toMatch(/bundle has nothing to serve for \d+ skills/);
    // A topic not ready in the database keeps its own reason.
    expect(withBundle(topicReadiness("wordProblems", []), [])).toMatchObject({ ready: false, reason: "no approved version-2 rows" });
  });

  it("throws when a page fails, so the panel can say why and keep v2 off", async () => {
    await expect(listApprovedV2Rows("mathFacts")).rejects.toThrow(/not configured/);
    const chain = installClient();
    chain.range.mockResolvedValueOnce({ data: null, error: { message: "column item_bank.version does not exist" } });
    await expect(readTopicReadiness("mathFacts")).rejects.toMatchObject({ message: /does not exist/ });
  });
});
