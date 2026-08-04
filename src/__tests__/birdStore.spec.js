import { describe, expect, it } from "vitest";
import { seasonForDate, seasonChip, returnLine } from "../engagement/seasons.js";
import { SPECIES_BY_ID, presentInSeason, isSeasonal, SPECIES } from "../engagement/roster.js";
import { applyGiveHome, applyEnsureStarter } from "../engagement/flock.js";
import { emptyEngagement, starBalance } from "../engagement/engagementStore.js";

// §08 Give a home + §12 seasonal availability rules.

describe("seasons follow the device calendar by quarter", () => {
  it("maps months to quarters", () => {
    expect(seasonForDate(new Date(2026, 0, 15))).toBe("winter");
    expect(seasonForDate(new Date(2026, 3, 15))).toBe("spring");
    expect(seasonForDate(new Date(2026, 6, 15))).toBe("summer");
    expect(seasonForDate(new Date(2026, 9, 15))).toBe("autumn");
    expect(seasonForDate(new Date(2026, 11, 15))).toBe("winter");
  });

  it("knows who is here when", () => {
    expect(presentInSeason(SPECIES_BY_ID.junco, "winter")).toBe(true);
    expect(presentInSeason(SPECIES_BY_ID.junco, "summer")).toBe(false);
    expect(presentInSeason(SPECIES_BY_ID.robin, "summer")).toBe(true);
    expect(presentInSeason(SPECIES_BY_ID.hummingbird, "autumn")).toBe(true);
    expect(presentInSeason(SPECIES_BY_ID.hummingbird, "winter")).toBe(false);
  });

  it("labels visitors kindly — never a countdown", () => {
    expect(seasonChip(SPECIES_BY_ID.junco)).toBe("Winter only");
    expect(seasonChip(SPECIES_BY_ID.hummingbird)).toBe("Spring–Autumn");
    expect(seasonChip(SPECIES_BY_ID.robin)).toBeNull();
    expect(returnLine(SPECIES_BY_ID.paintedBunting)).toBe("back next summer");
  });

  it("exactly six species migrate", () => {
    expect(SPECIES.filter(isSeasonal).map((s) => s.id).sort()).toEqual(
      ["barnSwallow", "hummingbird", "junco", "paintedBunting", "sandhillCrane", "snowyOwl"].sort()
    );
  });
});

describe("the one purchase (§08)", () => {
  it("balance-after maths is exact and spends nothing else", () => {
    let state = { ...emptyEngagement(), earnedStars: 60 };
    state = applyEnsureStarter(state).state;
    const before = starBalance(state);
    const result = applyGiveHome(state, "barnOwl");
    expect(before - starBalance(result.state)).toBe(SPECIES_BY_ID.barnOwl.price);
  });

  it("never sells the same bird twice", () => {
    let state = { ...emptyEngagement(), earnedStars: 200 };
    state = applyGiveHome(state, "barnOwl").state;
    expect(applyGiveHome(state, "barnOwl")).toBeNull();
  });
});
