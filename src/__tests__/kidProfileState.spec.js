import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A kid's state (item bank v2 groundwork): the two-letter code that picks
 * test wording — "strip diagram" in Texas — with null meaning Common Core.
 * It rides next to the grade in localStorage so a session can read it
 * synchronously, and every write validates the code client-side so a typo
 * never reaches the DB check constraint.
 */

// Swappable per test: null models an unconfigured deploy, a fake models the
// kid_profiles table. A getter keeps the import binding live.
const state = { client: null };
vi.mock("../supabaseClient", () => ({
  get supabase() {
    return state.client;
  },
}));

import {
  activeKidGrade,
  activeKidId,
  activeKidState,
  addKid,
  fetchKids,
  normalizeKidState,
  setActiveKid,
  updateKid,
  KID_STATE_MESSAGE,
} from "../kidProfiles.js";
import { US_STATES, isUsStateCode, usStateName } from "../usStates.js";

/** A minimal Storage stand-in: vitest runs in Node, which has none. */
function fakeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

const ROW = { id: "kid-1", first_name: "Maya", age: "7", grade: "2nd", state: "TX", created_at: "2026-09-01" };

/**
 * A fake supabase-js client for kid_profiles: records the update / insert
 * payload and the selected columns, and answers reads from `rows`. When
 * `hasStateColumn` is false a select of `state` fails with 42703 and a write
 * body naming it with PGRST204, the two ways PostgREST rejects the column
 * before the migration lands.
 */
function fakeClient({ rows = [ROW], hasStateColumn = true, consent = true } = {}) {
  const calls = { updates: [], inserts: [], selects: [], updateSelects: [] };
  const missing = { code: "42703", message: "column kid_profiles.state does not exist" };
  const unknownInBody = {
    code: "PGRST204",
    message: "Could not find the 'state' column of 'kid_profiles' in the schema cache",
  };
  const answer = (columns, data) =>
    Promise.resolve(
      !hasStateColumn && /\bstate\b/.test(columns) ? { data: null, error: missing } : { data, error: null },
    );
  const from = (table) => {
    if (table === "consent_events") {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: consent ? [{ kind: "coppa_vpc" }] : [], error: null }),
      };
      return chain;
    }
    return {
      select(columns) {
        calls.selects.push(columns);
        const chain = { eq: () => chain, order: () => chain, limit: () => answer(columns, rows) };
        return chain;
      },
      update(patch) {
        calls.updates.push(patch);
        return {
          eq: () => ({
            select: (columns) => {
              calls.updateSelects.push(columns);
              const single = () =>
                !hasStateColumn && "state" in patch
                  ? Promise.resolve({ data: null, error: unknownInBody })
                  : answer(columns, { ...rows[0], ...patch });
              return { single };
            },
          }),
        };
      },
      insert(row) {
        calls.inserts.push(row);
        return { select: (columns) => ({ single: () => answer(columns, { id: "kid-new", ...row }) }) };
      },
    };
  };
  return { client: { from, functions: { invoke: vi.fn() } }, calls };
}

beforeEach(() => {
  state.client = null;
  vi.stubGlobal("localStorage", fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("US_STATES", () => {
  it("lists the 50 states plus DC by name, with unique upper-case codes", () => {
    expect(US_STATES).toHaveLength(51);
    expect(new Set(US_STATES.map((s) => s.code)).size).toBe(51);
    expect(US_STATES.every((s) => /^[A-Z]{2}$/.test(s.code) && s.name.length > 0)).toBe(true);
    expect(US_STATES.map((s) => s.name)).toEqual([...US_STATES].map((s) => s.name).sort());
    expect(usStateName("DC")).toBe("District of Columbia");
    expect(usStateName("TX")).toBe("Texas");
    expect(isUsStateCode("TX")).toBe(true);
    expect(isUsStateCode("tx")).toBe(false);
    expect(isUsStateCode("PR")).toBe(false);
  });
});

describe("activeKidState", () => {
  it("round-trips through setActiveKid, beside the grade", () => {
    setActiveKid("kid-1", "2nd", "TX");
    expect(activeKidId()).toBe("kid-1");
    expect(activeKidGrade()).toBe("2nd");
    expect(activeKidState()).toBe("TX");
    expect(localStorage.getItem("kidmath-active-kid-state")).toBe("TX");
  });

  it("returns null when unset, cleared, or the pointer is dropped", () => {
    expect(activeKidState()).toBeNull();
    setActiveKid("kid-1", "2nd");
    expect(activeKidState()).toBeNull();
    setActiveKid("kid-1", "2nd", "TX");
    setActiveKid("kid-1", "2nd", null);
    expect(activeKidState()).toBeNull();
    setActiveKid("kid-1", "2nd", "TX");
    setActiveKid(null);
    expect(activeKidId()).toBeNull();
    expect(activeKidState()).toBeNull();
  });

  it("stores a normalized code and treats a bad one as unset rather than throwing", () => {
    setActiveKid("kid-1", "2nd", " tx ");
    expect(activeKidState()).toBe("TX");
    expect(() => setActiveKid("kid-1", "2nd", "Texas")).not.toThrow();
    expect(activeKidState()).toBeNull();
  });

  it("is null without storage (private mode)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => setActiveKid("kid-1", "2nd", "TX")).not.toThrow();
    expect(activeKidState()).toBeNull();
  });
});

describe("normalizeKidState", () => {
  it("maps empty to null, upper-cases a code, and rejects anything off the list", () => {
    expect(normalizeKidState(undefined)).toBeNull();
    expect(normalizeKidState(null)).toBeNull();
    expect(normalizeKidState("")).toBeNull();
    expect(normalizeKidState("  ")).toBeNull();
    expect(normalizeKidState("ny")).toBe("NY");
    expect(() => normalizeKidState("Texas")).toThrow(KID_STATE_MESSAGE);
    expect(() => normalizeKidState("ZZ")).toThrow(KID_STATE_MESSAGE);
    expect(() => normalizeKidState("PR")).toThrow(KID_STATE_MESSAGE);
  });
});

describe("updateKid", () => {
  it("sends the state with the other fields", async () => {
    const { client, calls } = fakeClient();
    state.client = client;
    const saved = await updateKid("kid-1", { firstName: " Maya ", age: "7", grade: "2nd", state: "tx" });
    expect(calls.updates).toEqual([{ first_name: "Maya", age: "7", grade: "2nd", state: "TX" }]);
    expect(saved.state).toBe("TX");
  });

  it("clears the state on an empty pick and leaves it alone when not passed", async () => {
    const { client, calls } = fakeClient();
    state.client = client;
    await updateKid("kid-1", { firstName: "Maya", age: "7", grade: "2nd", state: "" });
    await updateKid("kid-1", { firstName: "Maya", age: "7", grade: "2nd" });
    expect(calls.updates[0].state).toBeNull();
    expect("state" in calls.updates[1]).toBe(false);
  });

  it("rejects an invalid code client-side, before any write", async () => {
    const { client, calls } = fakeClient();
    state.client = client;
    await expect(
      updateKid("kid-1", { firstName: "Maya", age: "7", grade: "2nd", state: "Texas" }),
    ).rejects.toThrow(KID_STATE_MESSAGE);
    expect(calls.updates).toEqual([]);
  });

  it("saves the other fields until the migration lands, retrying without the state", async () => {
    // The edit form always sends a state, so a plain grade change must survive
    // a table that has no such column yet.
    const { client, calls } = fakeClient({ rows: [{ ...ROW, state: undefined }], hasStateColumn: false });
    state.client = client;
    const saved = await updateKid("kid-1", { firstName: "Maya", age: "8", grade: "3rd", state: "tx" });
    expect(calls.updates).toEqual([
      { first_name: "Maya", age: "8", grade: "3rd", state: "TX" },
      { first_name: "Maya", age: "8", grade: "3rd" },
    ]);
    expect(calls.updateSelects).toEqual([
      "id, first_name, age, grade, state, created_at",
      "id, first_name, age, grade, created_at",
    ]);
    expect(saved).toMatchObject({ id: "kid-1", grade: "3rd", state: null });
  });

  it("surfaces any other write error unchanged", async () => {
    const { client } = fakeClient();
    client.from = () => ({
      update: () => ({
        eq: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "network down" } }) }),
        }),
      }),
    });
    state.client = client;
    await expect(updateKid("kid-1", { firstName: "Maya", age: "7", grade: "2nd", state: "" })).rejects.toThrow(
      "network down",
    );
  });
});

describe("fetchKids", () => {
  it("returns the state on each kid", async () => {
    state.client = fakeClient().client;
    const kids = await fetchKids("user-1");
    expect(kids).toEqual([ROW]);
  });

  it("falls back to the pre-state columns until the migration lands, with state null", async () => {
    const { client, calls } = fakeClient({ rows: [{ ...ROW, state: undefined }], hasStateColumn: false });
    state.client = client;
    const kids = await fetchKids("user-1");
    expect(calls.selects).toEqual([
      "id, first_name, age, grade, state, created_at",
      "id, first_name, age, grade, created_at",
    ]);
    expect(kids).toHaveLength(1);
    expect(kids[0].state).toBeNull();
  });

  it("is empty when Supabase is unconfigured", async () => {
    expect(await fetchKids("user-1")).toEqual([]);
  });
});

describe("addKid", () => {
  it("stores the state with consent on file, and skips the column when none is given", async () => {
    const { client, calls } = fakeClient();
    state.client = client;
    const withState = await addKid("user-1", { firstName: "Ravi", age: "9", grade: "4th", state: "ny" });
    expect(calls.inserts[0]).toMatchObject({ user_id: "user-1", first_name: "Ravi", state: "NY" });
    expect(withState.state).toBe("NY");

    const without = await addKid("user-1", { firstName: "Zoe", age: "6", grade: "1st" });
    expect("state" in calls.inserts[1]).toBe(false);
    expect(without.state).toBeNull();
  });

  it("carries the state into the consent request when no consent is on file", async () => {
    const { client } = fakeClient({ consent: false });
    client.functions.invoke.mockResolvedValue({ data: { requested: true, requestId: "req-1" }, error: null });
    state.client = client;
    const pending = await addKid("user-1", { firstName: "Maya", age: "7", grade: "2nd", state: "fl" });
    expect(pending).toMatchObject({ pendingConsent: true, state: "FL" });
    expect(client.functions.invoke.mock.calls[0][1].body).toMatchObject({ firstName: "Maya", state: "FL" });
  });

  it("rejects an invalid code before touching consent or the table", async () => {
    const { client, calls } = fakeClient();
    state.client = client;
    await expect(addKid("user-1", { firstName: "Maya", age: "7", grade: "2nd", state: "Florida" })).rejects.toThrow(
      KID_STATE_MESSAGE,
    );
    expect(calls.inserts).toEqual([]);
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });
});
