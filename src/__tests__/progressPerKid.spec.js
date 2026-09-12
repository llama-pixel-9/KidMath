import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * Math progress is per kid. The local blob is scoped by the active kid
 * pointer with the same one-time inherit rule engagement uses: the first kid
 * on a device takes over the anonymous progress, later kids start at Level 1,
 * and siblings never see each other's levels.
 */

vi.mock("../supabaseClient", () => ({ supabase: null }));

const { loadProgressSync, saveProgress, loadProgressSummary, activeKidIdSync } = await import("../progressStore.js");

function stubLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  return store;
}

const flight = (level, stars) => ({ level, mistakeBank: [], firstTryCorrect: stars, starsEarned: stars, bankItemStats: {}, recentBankItemIds: [] });

describe("per-kid progress scoping", () => {
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it("anonymous play uses the bare key", async () => {
    const store = stubLocalStorage();
    await saveProgress("addition", flight(3, 5));
    expect(activeKidIdSync()).toBeNull();
    expect(store.has("kidmath-progress")).toBe(true);
    expect(loadProgressSync("addition").level).toBe(3);
  });

  it("first kid inherits the device blob once; later kids start fresh; siblings stay independent", async () => {
    const store = stubLocalStorage();
    await saveProgress("addition", flight(4, 7));

    localStorage.setItem("kidmath-active-kid", "kid-a");
    expect(loadProgressSync("addition")).toMatchObject({ level: 4, lifetimeStars: 7, totalSessions: 1 });
    expect(store.get("kidmath-progress-migrated")).toBe("kid-a");
    expect(store.has("kidmath-progress:kid-a")).toBe(true);
    // Copy, never rename: the device blob is untouched.
    expect(store.has("kidmath-progress")).toBe(true);

    localStorage.setItem("kidmath-active-kid", "kid-b");
    expect(loadProgressSync("addition").level).toBe(1);
    await saveProgress("addition", flight(2, 3));
    expect(loadProgressSync("addition")).toMatchObject({ level: 2, lifetimeStars: 3 });

    localStorage.setItem("kidmath-active-kid", "kid-a");
    expect(loadProgressSync("addition")).toMatchObject({ level: 4, lifetimeStars: 7 });
    // Explicit kid argument bypasses the pointer (the report's kid tabs).
    expect(loadProgressSync("addition", "kid-b").level).toBe(2);
  });

  it("a fresh device with a kid already active stamps the inherit and starts at Level 1", () => {
    const store = stubLocalStorage();
    localStorage.setItem("kidmath-active-kid", "kid-z");
    expect(loadProgressSync("subtraction").level).toBe(1);
    expect(store.get("kidmath-progress-migrated")).toBe("kid-z");
  });

  it("loadProgressSummary is scoped to the requested kid", async () => {
    stubLocalStorage();
    localStorage.setItem("kidmath-active-kid", "kid-a");
    await saveProgress("addition", flight(5, 9));
    localStorage.setItem("kidmath-active-kid", "kid-b");
    await saveProgress("time", flight(2, 1));

    expect(Object.keys((await loadProgressSummary()).byMode)).toEqual(["time"]);
    expect(Object.keys((await loadProgressSummary({ kidId: "kid-a" })).byMode)).toEqual(["addition"]);
  });
});
