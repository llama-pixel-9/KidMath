import { describe, expect, it } from "vitest";
import {
  emptyEngagement,
  applySessionEnd,
  EGG_WARMTH_TARGET,
  starBalance,
} from "../engagement/engagementStore.js";
import {
  applyBuyEgg,
  applyHatch,
  eggReady,
  eggWarmthPercent,
} from "../engagement/flock.js";
import {
  isNight,
  seasonKeyForDate,
  leavingSoon,
  migrationEvents,
  isAway,
  awayChip,
  SEASONS,
  SEASON_TINTS,
} from "../engagement/seasons.js";
import { SPECIES, SPECIES_BY_ID, isSeasonal } from "../engagement/roster.js";

const rand = () => 0.42;

// §10: eggs and the hatching.
describe("the egg (§10)", () => {
  const richState = () => ({ ...emptyEngagement(), earnedStars: 500 });

  it("a legendary arrives as an egg, one at a time, spending its price", () => {
    const bought = applyBuyEgg(richState(), "whoopingCrane");
    expect(bought.egg).toMatchObject({ speciesId: "whoopingCrane", warmthStars: 0 });
    expect(starBalance(bought)).toBe(500 - SPECIES_BY_ID.whoopingCrane.eggPrice);
    // The next egg cannot be earned until this chick has landed.
    expect(applyBuyEgg(bought, "condor")).toBeNull();
    // And ordinary species never come as eggs.
    expect(applyBuyEgg(richState(), "robin")).toBeNull();
  });

  it("warms by earned stars after purchase, stops at full warmth, never decays", () => {
    let state = applyBuyEgg(richState(), "whoopingCrane");
    state = applySessionEnd(state, 15, "2026-08-04").state;
    expect(state.egg.warmthStars).toBe(15);
    expect(eggWarmthPercent(state)).toBe(38);
    state = applySessionEnd(state, 15, "2026-08-05").state;
    state = applySessionEnd(state, 15, "2026-08-06").state;
    expect(state.egg.warmthStars).toBe(EGG_WARMTH_TARGET); // capped — it waits
    expect(eggReady(state)).toBe(true);
    // Waiting costs nothing; another flight changes nothing about the egg.
    const later = applySessionEnd(state, 10, "2026-08-09").state;
    expect(later.egg.warmthStars).toBe(EGG_WARMTH_TARGET);
  });

  it("hatches only when ready, only at the end of the ceremony", () => {
    let state = applyBuyEgg(richState(), "whoopingCrane");
    expect(applyHatch(state, "Hope", { rand })).toBeNull(); // not warm yet — resumable by construction
    for (let d = 4; d < 8; d++) state = applySessionEnd(state, 15, `2026-08-0${d}`).state;
    const hatched = applyHatch(state, "Hope", { rand });
    expect(hatched.state.egg).toBeNull();
    const bird = hatched.state.birds.find((b) => b.speciesId === "whoopingCrane");
    expect(bird).toMatchObject({ hatched: true, customName: "Hope" });
    expect(bird.perchId).toBeTruthy();
  });

  it("accepts anything the kid types, falling back to a curated name", () => {
    let state = applyBuyEgg(richState(), "condor");
    state = { ...state, egg: { ...state.egg, warmthStars: EGG_WARMTH_TARGET } };
    const hatched = applyHatch(state, "   ", { rand });
    expect(SPECIES_BY_ID.condor.presetNames).toContain(
      hatched.state.birds.find((b) => b.speciesId === "condor").presetName
    );
  });
});

// §11: the leaving, and the coming back.
describe("migration (§11)", () => {
  const august = new Date(2026, 7, 4, 10);
  const december = new Date(2026, 11, 4, 10);

  function stateOwning(...ids) {
    return {
      ...emptyEngagement(),
      birds: ids.map((id) => ({ speciesId: id, presetName: "X", perchId: "meadow:ground1", arrivalDay: "2026-06-01" })),
    };
  }

  it("an away migrant keeps her perch, her entry, and her kind chip", () => {
    expect(isAway(SPECIES_BY_ID.junco, august)).toBe(true);
    expect(isAway(SPECIES_BY_ID.robin, august)).toBe(false);
    expect(awayChip(SPECIES_BY_ID.junco)).toBe("Away · back in winter");
  });

  it("derives departures and returns once per season, marked when seen", () => {
    // September: the Barn Swallow (spring–summer) has just gone.
    const sept = new Date(2026, 8, 2, 10);
    const state = stateOwning("barnSwallow", "robin");
    const owned = [SPECIES_BY_ID.barnSwallow, SPECIES_BY_ID.robin];
    const events = migrationEvents(state, owned, sept);
    expect(events.departures.map((s) => s.id)).toEqual(["barnSwallow"]);
    expect(events.returns).toEqual([]);
    const seen = { ...state, departuresSeen: { barnSwallow: seasonKeyForDate(sept) } };
    expect(migrationEvents(seen, owned, sept).departures).toEqual([]);
    // December: an owned junco returns.
    const winterState = stateOwning("junco");
    const winterEvents = migrationEvents(winterState, [SPECIES_BY_ID.junco], december);
    expect(winterEvents.returns.map((s) => s.id)).toEqual(["junco"]);
  });

  it("never more than two migrants change at any season turn", () => {
    for (let i = 0; i < 4; i++) {
      const from = SEASONS[i];
      const to = SEASONS[(i + 1) % 4];
      const leaving = SPECIES.filter(
        (s) => isSeasonal(s) && s.seasons.includes(from) && !s.seasons.includes(to)
      );
      const arrivingBirds = SPECIES.filter(
        (s) => isSeasonal(s) && !s.seasons.includes(from) && s.seasons.includes(to)
      );
      expect(leaving.length, `${from}→${to} leavings`).toBeLessThanOrEqual(2);
      expect(arrivingBirds.length, `${from}→${to} arrivals`).toBeLessThanOrEqual(2);
    }
  });

  it("restlessness starts a week before the season turns", () => {
    // Barn Swallow (spring–summer) is restless in late August, not early August.
    expect(leavingSoon(SPECIES_BY_ID.barnSwallow, new Date(2026, 7, 27))).toBe(true);
    expect(leavingSoon(SPECIES_BY_ID.barnSwallow, new Date(2026, 7, 4))).toBe(false);
    // The hummingbird stays through autumn — not restless in August.
    expect(leavingSoon(SPECIES_BY_ID.hummingbird, new Date(2026, 7, 27))).toBe(false);
    // Residents are never restless.
    expect(leavingSoon(SPECIES_BY_ID.robin, new Date(2026, 7, 27))).toBe(false);
  });
});

// §12: four seasons, and night.
describe("seasons (§12)", () => {
  it("night falls at 7pm — 9pm in summer — and lifts at 6am", () => {
    expect(isNight(new Date(2026, 0, 10, 19, 30))).toBe(true); // winter 7:30pm
    expect(isNight(new Date(2026, 6, 10, 19, 30))).toBe(false); // summer 7:30pm
    expect(isNight(new Date(2026, 6, 10, 21, 5))).toBe(true); // summer 9:05pm
    expect(isNight(new Date(2026, 6, 10, 5, 0))).toBe(true);
    expect(isNight(new Date(2026, 6, 10, 8, 0))).toBe(false);
  });

  it("each season carries exactly a tint pair and one particle", () => {
    for (const s of SEASONS) {
      expect(SEASON_TINTS[s].canopy).toMatch(/^#/);
      expect(SEASON_TINTS[s].ground).toMatch(/^#/);
      expect(SEASON_TINTS[s].particle).toBeTruthy();
    }
    expect(SEASON_TINTS.autumn.canopy).toBe("#F26B3A");
    expect(SEASON_TINTS.spring.canopy).toBe("#8FD9C8");
  });
});
