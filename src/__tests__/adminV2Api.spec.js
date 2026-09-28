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

import { listItemModels, setModelReview, MODEL_REVIEW_STATUSES } from "../admin/itemModelsApi.js";
import { listVersionSwitch, setLiveVersion, LIVE_VERSIONS } from "../admin/versionSwitchApi.js";

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
