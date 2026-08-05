import { describe, expect, it, afterEach } from "vitest";
import {
  ZONES,
  PERCHES,
  PERCH_BY_ID,
  RESERVED_RECTS,
  MIN_PERCH_DISTANCE,
  ZONE_BIRD_CAP,
  birdsInZone,
  globalX,
} from "../engagement/perches.js";
import { SPECIES, SPECIES_BY_ID } from "../engagement/roster.js";
import {
  applyAddBird,
  applyGiveHome,
  applyEnsureStarter,
  applyRename,
  earnedZones,
  frontierZone,
} from "../engagement/flock.js";
import {
  emptyEngagement,
  loadEngagement,
  persistEngagement,
  applySessionEnd,
} from "../engagement/engagementStore.js";

// §04–§06 the Meadow: zones, perches, placement, and the per-kid prerequisite.

const rand = () => 0.42; // deterministic placement/naming in tests

function stateWithBirds(n) {
  let state = { ...emptyEngagement(), earnedStars: 10000 };
  const buyable = SPECIES.filter((s) => !s.starter && !s.egg);
  state = applyEnsureStarter(state, { rand }).state;
  for (let i = 0; i < n - 1 && i < buyable.length; i++) {
    state = applyAddBird(state, buyable[i].id, { rand }).state;
  }
  return state;
}

describe("zones unlock with the flock (§05)", () => {
  it("opens at 0 / 5 / 10 / 15 birds", () => {
    expect(earnedZones(stateWithBirds(0)).map((z) => z.id)).toEqual(["meadow"]);
    expect(earnedZones(stateWithBirds(4)).map((z) => z.id)).toEqual(["meadow"]);
    expect(earnedZones(stateWithBirds(5)).map((z) => z.id)).toEqual(["meadow", "pond"]);
    expect(earnedZones(stateWithBirds(10)).map((z) => z.id)).toEqual(["meadow", "pond", "woods"]);
    expect(earnedZones(stateWithBirds(15)).map((z) => z.id)).toEqual(["meadow", "pond", "woods", "cliffs"]);
  });

  it("names the frontier and how far it is", () => {
    const state = stateWithBirds(7);
    expect(frontierZone(state).id).toBe("woods");
    expect(frontierZone(state).unlockAt).toBe(10);
  });
});

describe("perch inventory and placement (§06)", () => {
  it("gives every zone fourteen named perches, none inside a reserved rect", () => {
    for (const zone of ZONES) {
      const perches = PERCHES.filter((p) => p.zone === zone.id);
      expect(perches.length).toBe(14);
      for (const p of perches) {
        for (const r of RESERVED_RECTS.filter((r) => r.zone === zone.id)) {
          const inside = p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
          expect(inside, `${p.id} must not sit inside ${r.label}`).toBe(false);
        }
      }
    }
  });

  it("places each bird on a perch type that suits its species", () => {
    const state = stateWithBirds(8);
    for (const bird of state.birds) {
      const perch = PERCH_BY_ID[bird.perchId];
      const species = SPECIES_BY_ID[bird.speciesId];
      expect(perch, `${bird.speciesId} has a perch`).toBeTruthy();
      expect(species.perchTypes).toContain(perch.type);
    }
  });

  it("keeps neighbours at least 96px apart and zones at most seven birds", () => {
    const state = stateWithBirds(14);
    const perches = state.birds.map((b) => PERCH_BY_ID[b.perchId]);
    for (let i = 0; i < perches.length; i++) {
      for (let j = i + 1; j < perches.length; j++) {
        if (perches[i].zone !== perches[j].zone) continue;
        const d = Math.hypot(globalX(perches[i]) - globalX(perches[j]), perches[i].y - perches[j].y);
        expect(d).toBeGreaterThanOrEqual(MIN_PERCH_DISTANCE);
      }
    }
    for (const zone of ZONES) {
      expect(birdsInZone(state.birds, zone.id).length).toBeLessThanOrEqual(ZONE_BIRD_CAP);
    }
  });

  it("saves the perch and the idle-bob rig forever (chosen once)", () => {
    const first = applyEnsureStarter({ ...emptyEngagement() }, { rand });
    expect(first.bird.perchId).toBeTruthy();
    expect(first.bird.bob.period).toBeGreaterThanOrEqual(4);
    expect(first.bird.bob.period).toBeLessThanOrEqual(6);
    const again = applyEnsureStarter(first.state, { rand });
    expect(again.bird).toBeNull(); // idempotent — nothing re-placed
  });
});

describe("flock rules (§08, §13)", () => {
  it("give-a-home spends the price and refuses a short balance", () => {
    const rich = { ...emptyEngagement(), earnedStars: 30 };
    const bought = applyGiveHome(rich, "houseFinch", { rand });
    expect(bought.state.spentStars).toBe(15);
    expect(bought.state.birds.map((b) => b.speciesId)).toContain("houseFinch");
    const poor = { ...emptyEngagement(), earnedStars: 10 };
    expect(applyGiveHome(poor, "houseFinch", { rand })).toBeNull();
  });

  it("never sells the starter or the egg-only legendaries", () => {
    const rich = { ...emptyEngagement(), earnedStars: 10000 };
    expect(applyGiveHome(rich, "skylark", { rand })).toBeNull();
    expect(applyGiveHome(rich, "whoopingCrane", { rand })).toBeNull();
  });

  it("arrivals carry a preset name from the species' curated six", () => {
    const state = { ...emptyEngagement(), earnedStars: 100 };
    const { state: next } = applyGiveHome(state, "chickadee", { rand });
    const bird = next.birds.find((b) => b.speciesId === "chickadee");
    expect(SPECIES_BY_ID.chickadee.presetNames).toContain(bird.presetName);
  });

  it("rename applies only to hatched rarities", () => {
    let state = applyEnsureStarter({ ...emptyEngagement() }, { rand }).state;
    state = applyRename(state, "skylark", "Nope");
    expect(state.birds[0].customName).toBeUndefined();
    state = { ...state, birds: [{ ...state.birds[0], hatched: true }] };
    state = applyRename(state, "skylark", "Hope");
    expect(state.birds[0].customName).toBe("Hope");
  });
});

describe("per-kid engagement scoping (bird-world prerequisite)", () => {
  afterEach(() => {
    delete globalThis.localStorage;
  });

  function stubLocalStorage() {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    return store;
  }

  it("first kid inherits the device state once; later kids start fresh", () => {
    const store = stubLocalStorage();
    // Anonymous play banks 12 stars on the device-global key.
    persistEngagement(applySessionEnd(emptyEngagement(), 12, "2026-08-04").state);
    expect(store.has("kidmath-engagement")).toBe(true);

    // Kid A signs in → migrates the anonymous blob.
    localStorage.setItem("kidmath-active-kid", "kid-a");
    expect(loadEngagement().earnedStars).toBe(12);
    expect(store.get("kidmath-engagement-migrated")).toBe("kid-a");
    persistEngagement(applySessionEnd(loadEngagement(), 5, "2026-08-04").state);

    // Kid B starts fresh — no shared wallet, no shared flock.
    localStorage.setItem("kidmath-active-kid", "kid-b");
    expect(loadEngagement().earnedStars).toBe(0);
    persistEngagement(applySessionEnd(loadEngagement(), 3, "2026-08-04").state);

    // Back to A: their stars are intact and B's are separate.
    localStorage.setItem("kidmath-active-kid", "kid-a");
    expect(loadEngagement().earnedStars).toBe(17);
    localStorage.setItem("kidmath-active-kid", "kid-b");
    expect(loadEngagement().earnedStars).toBe(3);
  });
});
