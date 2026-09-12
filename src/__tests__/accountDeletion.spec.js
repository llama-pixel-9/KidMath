import { describe, it, expect } from "vitest";
import {
  KID_DATA_TABLES,
  USER_DATA_TABLES,
  purgeAccountData,
  purgeKidData,
} from "../../supabase/functions/_shared/accountPurge.ts";
import {
  signRevocationToken,
  verifyRevocationToken,
} from "../../supabase/functions/_shared/revocationToken.ts";

// The deletion proof (E4). A district — or the FTC — asks "show me that
// deleting an account actually removes every row". This spec seeds a family
// (two kids, progress, stats, preferences, entitlement, diagnostics, consent
// records), runs the same purge sequence the delete-account Edge Function
// runs, and asserts zero remaining rows in every table — while a second
// family's rows survive untouched.

/** Minimal stand-in for the supabase-js query builder: from(t).delete().eq()…
 *  Filters AND together; awaiting the chain executes the delete. */
function fakeDb(tables) {
  return {
    tables,
    from(name) {
      return {
        delete() {
          const filters = [];
          const runner = {
            eq(column, value) {
              filters.push([column, value]);
              return runner;
            },
            then(resolve, reject) {
              tables[name] = (tables[name] ?? []).filter(
                (row) => !filters.every(([column, value]) => row[column] === value),
              );
              return Promise.resolve({ error: null }).then(resolve, reject);
            },
          };
          return runner;
        },
      };
    },
  };
}

const PARENT = "user-aaa";
const OTHER_PARENT = "user-bbb";

function seededTables() {
  return {
    kid_profiles: [
      { id: "kid-1", user_id: PARENT, first_name: "Maya", age: "7", grade: "2nd" },
      { id: "kid-2", user_id: PARENT, first_name: "Ravi", age: "9", grade: "4th" },
      { id: "kid-3", user_id: OTHER_PARENT, first_name: "Zoe", age: "6", grade: "1st" },
    ],
    progress: [
      { user_id: PARENT, kid_id: "kid-1", mode: "addition", level: 4, total_sessions: 12, lifetime_stars: 40 },
      { user_id: PARENT, kid_id: "kid-2", mode: "fractions", level: 2, total_sessions: 3, lifetime_stars: 9 },
      { user_id: PARENT, kid_id: null, mode: "counting", level: 2, total_sessions: 1, lifetime_stars: 3 },
      { user_id: OTHER_PARENT, kid_id: "kid-3", mode: "addition", level: 1, total_sessions: 1, lifetime_stars: 2 },
    ],
    progress_item_stats: [
      { user_id: PARENT, kid_id: "kid-1", mode: "addition", item_id: "a1" },
      { user_id: PARENT, kid_id: "kid-2", mode: "fractions", item_id: "f1" },
      { user_id: OTHER_PARENT, kid_id: "kid-3", mode: "addition", item_id: "a2" },
    ],
    practice_sessions: [
      { id: "ps-1", user_id: PARENT, kid_id: "kid-1", mode: "addition" },
      { id: "ps-2", user_id: PARENT, kid_id: "kid-2", mode: "fractions" },
      { id: "ps-3", user_id: OTHER_PARENT, kid_id: "kid-3", mode: "addition" },
    ],
    user_preferences: [{ user_id: PARENT, theme: "meadow" }],
    entitlements: [{ user_id: PARENT, status: "active" }],
    session_diagnostics: [{ user_id: PARENT, session_id: "s1" }],
    consent_events: [
      { user_id: PARENT, kind: "account" },
      { user_id: PARENT, kind: "coppa_vpc" },
    ],
    profiles: [{ user_id: PARENT }, { user_id: OTHER_PARENT }],
  };
}

describe("account deletion purge", () => {
  it("covers every user-scoped table in the schema", () => {
    expect([...USER_DATA_TABLES].sort()).toEqual([
      "consent_events",
      "entitlements",
      "kid_profiles",
      "practice_sessions",
      "profiles",
      "progress",
      "progress_item_stats",
      "session_diagnostics",
      "user_preferences",
    ]);
    // The seed exercises exactly the purge's table list — if a new table is
    // added to one side, this fails until the other side follows.
    expect(Object.keys(seededTables()).sort()).toEqual([...USER_DATA_TABLES].sort());
  });

  it("deletes the account: zero remaining rows in every table for that user", async () => {
    const tables = seededTables();
    await purgeAccountData(fakeDb(tables), PARENT);
    for (const table of USER_DATA_TABLES) {
      const leftovers = tables[table].filter((row) => row.user_id === PARENT);
      expect(leftovers, `rows left in ${table}`).toEqual([]);
    }
  });

  it("leaves the other family's rows untouched", async () => {
    const tables = seededTables();
    await purgeAccountData(fakeDb(tables), PARENT);
    expect(tables.kid_profiles).toEqual([
      { id: "kid-3", user_id: OTHER_PARENT, first_name: "Zoe", age: "6", grade: "1st" },
    ]);
    expect(tables.progress).toHaveLength(1);
    expect(tables.profiles).toEqual([{ user_id: OTHER_PARENT }]);
  });

  it("lists every kid-keyed table so a new one cannot be forgotten", () => {
    const seeded = seededTables();
    const kidKeyed = Object.keys(seeded).filter((t) => seeded[t].some((r) => "kid_id" in r));
    expect([...KID_DATA_TABLES].sort()).toEqual(kidKeyed.sort());
  });

  it("deletes a single child profile and nothing else", async () => {
    const tables = seededTables();
    await purgeKidData(fakeDb(tables), { userId: PARENT, kidId: "kid-1" });
    expect(tables.kid_profiles.map((k) => k.id)).toEqual(["kid-2", "kid-3"]);
    // Everything keyed to the child goes with the profile (§312.6); the
    // sibling's rows and the household row stay.
    expect(tables.progress.map((r) => r.kid_id)).toEqual(["kid-2", null, "kid-3"]);
    expect(tables.progress_item_stats.map((r) => r.item_id)).toEqual(["f1", "a2"]);
    expect(tables.practice_sessions.map((r) => r.id)).toEqual(["ps-2", "ps-3"]);
  });

  it("refuses to delete a kid across accounts (kidId + userId must both match)", async () => {
    const tables = seededTables();
    await purgeKidData(fakeDb(tables), { userId: PARENT, kidId: "kid-3" });
    expect(tables.kid_profiles.map((k) => k.id)).toEqual(["kid-1", "kid-2", "kid-3"]);
  });

  // Apple guideline 5.1.1(v) also requires revoking Sign in with Apple tokens
  // on account deletion (POST https://appleid.apple.com/auth/revoke). Blocked
  // on Apple Developer credentials (checklist item B2) — the TODO lives in
  // supabase/functions/delete-account/index.ts. Unskip when the revocation
  // call lands.
  it.skip("revokes Sign in with Apple tokens on account deletion (blocked on B2)", () => {});
});

describe("revocation token", () => {
  const SECRET = "test-secret";
  const NOW = 1_800_000_000_000;
  const claims = { userId: PARENT, kidId: "kid-1", expiresAt: NOW + 86_400_000 };

  it("round-trips valid claims", async () => {
    const token = await signRevocationToken(claims, SECRET);
    expect(await verifyRevocationToken(token, SECRET, NOW)).toEqual(claims);
  });

  it("rejects an expired token", async () => {
    const token = await signRevocationToken({ ...claims, expiresAt: NOW - 1 }, SECRET);
    expect(await verifyRevocationToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await signRevocationToken(claims, SECRET);
    const [payload, sig] = token.split(".");
    const forged = `${payload.slice(0, -2)}AA.${sig}`;
    expect(await verifyRevocationToken(forged, SECRET, NOW)).toBeNull();
  });

  it("rejects the wrong secret and garbage input", async () => {
    const token = await signRevocationToken(claims, SECRET);
    expect(await verifyRevocationToken(token, "other-secret", NOW)).toBeNull();
    expect(await verifyRevocationToken("not-a-token", SECRET, NOW)).toBeNull();
    expect(await verifyRevocationToken("", SECRET, NOW)).toBeNull();
  });
});
