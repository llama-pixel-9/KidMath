import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The word-problems setting (Sai, 2026-10-02: on by default). Local copy in
 * localStorage, the signed-in user's row in user_preferences. A failed cloud
 * read must never write over the row: with the default now on, that would
 * turn a saved "off" back on.
 */

// Swappable per test: null models an unconfigured deploy, a fake models the
// user_preferences table. A getter keeps the import binding live.
const state = { client: null };
vi.mock("../supabaseClient", () => ({
  get supabase() {
    return state.client;
  },
}));

import {
  DEFAULT_ALLOW_WORD_PROBLEMS,
  loadAllowWordProblems,
  loadAllowWordProblemsSync,
  saveAllowWordProblems,
} from "../userPreferences.js";

const KEY = "kidmath-allow-word-problems";

/** A minimal Storage stand-in: vitest runs in Node, which has none. */
function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

/**
 * A fake supabase-js client for user_preferences. `read` is what the select
 * answers: `{ data, error }`, or "throw" for a client that rejects.
 */
function fakeClient(read) {
  const upserts = [];
  const client = {
    from(table) {
      expect(table).toBe("user_preferences");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => (read === "throw" ? Promise.reject(new Error("network down")) : Promise.resolve(read)),
          }),
        }),
        upsert: (row, opts) => {
          upserts.push({ row, opts });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client, upserts };
}

beforeEach(() => {
  state.client = null;
  vi.stubGlobal("localStorage", fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("word problems default", () => {
  it("is on", () => {
    expect(DEFAULT_ALLOW_WORD_PROBLEMS).toBe(true);
  });

  it("a browser with no saved choice gets stories", async () => {
    expect(loadAllowWordProblemsSync()).toBe(true);
    expect(await loadAllowWordProblems(null)).toBe(true);
  });

  it("a saved choice wins, both ways", () => {
    vi.stubGlobal("localStorage", fakeStorage({ [KEY]: "false" }));
    expect(loadAllowWordProblemsSync()).toBe(false);
    vi.stubGlobal("localStorage", fakeStorage({ [KEY]: "true" }));
    expect(loadAllowWordProblemsSync()).toBe(true);
  });

  it("storage that throws (private mode) reads the default", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    });
    expect(loadAllowWordProblemsSync()).toBe(true);
  });
});

describe("signed in", () => {
  it("a new user (no row yet) gets a row seeded from this device: on by default", async () => {
    const fake = fakeClient({ data: null, error: null });
    state.client = fake.client;
    expect(await loadAllowWordProblems("user-1")).toBe(true);
    expect(fake.upserts).toHaveLength(1);
    expect(fake.upserts[0].row).toMatchObject({ user_id: "user-1", allow_word_problems: true });
    expect(fake.upserts[0].opts).toEqual({ onConflict: "user_id" });
  });

  it("a toggle made before the first sign-in carries into the new row", async () => {
    vi.stubGlobal("localStorage", fakeStorage({ [KEY]: "false" }));
    const fake = fakeClient({ data: null, error: null });
    state.client = fake.client;
    expect(await loadAllowWordProblems("user-1")).toBe(false);
    expect(fake.upserts[0].row.allow_word_problems).toBe(false);
  });

  it("the saved row wins and is copied to this device, with no write back", async () => {
    const fake = fakeClient({ data: { allow_word_problems: false }, error: null });
    state.client = fake.client;
    expect(await loadAllowWordProblems("user-1")).toBe(false);
    expect(localStorage.getItem(KEY)).toBe("false");
    expect(loadAllowWordProblemsSync()).toBe(false);
    expect(fake.upserts).toHaveLength(0);
  });

  it("a failed read plays on this device's value and never writes over the saved row", async () => {
    const fake = fakeClient({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    state.client = fake.client;
    // No local copy: the default (on) is played, but a saved "off" in the
    // cloud is left alone.
    expect(await loadAllowWordProblems("user-1")).toBe(true);
    expect(fake.upserts).toHaveLength(0);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("a read that throws is a failed read too", async () => {
    vi.stubGlobal("localStorage", fakeStorage({ [KEY]: "false" }));
    const fake = fakeClient("throw");
    state.client = fake.client;
    expect(await loadAllowWordProblems("user-1")).toBe(false);
    expect(fake.upserts).toHaveLength(0);
  });
});

describe("the gear toggle", () => {
  it("persists off and back on, locally and to the user's row", async () => {
    const fake = fakeClient({ data: null, error: null });
    state.client = fake.client;
    await saveAllowWordProblems("user-1", false);
    expect(loadAllowWordProblemsSync()).toBe(false);
    await saveAllowWordProblems("user-1", true);
    expect(loadAllowWordProblemsSync()).toBe(true);
    expect(fake.upserts.map((u) => u.row.allow_word_problems)).toEqual([false, true]);
  });

  it("signed out, it is remembered on this device only", async () => {
    await saveAllowWordProblems(null, false);
    expect(localStorage.getItem(KEY)).toBe("false");
    expect(await loadAllowWordProblems(null)).toBe(false);
  });
});

describe("printed worksheets", () => {
  it("start from their own remembered sheet type, not the play setting", () => {
    // Turning stories on in play must not turn printed sheets into mixed ones.
    const source = readFileSync(join(import.meta.dirname, "..", "PrintableWorksheet.jsx"), "utf8");
    expect(source).not.toMatch(/AllowWordProblems|userPreferences/);
    expect(source).toMatch(/PROBLEM_TYPES\.includes\(last\) \? last : "practice"/);
  });
});
