import { describe, expect, it } from "vitest";
import { SPECIES, SPECIES_BY_ID, isSeasonal } from "../engagement/roster.js";
import { PERCHES } from "../engagement/perches.js";
import {
  SIGNATURE_RIGS,
  rigFor,
  answersWithSignature,
  hourBucket,
  setPieceToday,
  nextSignatureDelay,
  SIGNATURE_MIN_GAP_MS,
} from "../engagement/meadow/birdBehaviors.js";

// §13: the roster — all 22 birds, prices as design targets; §09: the tier
// ladder is behaviour, which is the honest reason the prices differ.

const PRICE_TABLE = {
  skylark: null, // starter — never bought
  houseFinch: 15,
  mourningDove: 16,
  chickadee: 18,
  houseWren: 18,
  robin: 20,
  junco: 20,
  cardinal: 22,
  downyWoodpecker: 40,
  goldfinch: 42,
  blueJay: 45,
  hummingbird: 46,
  kingfisher: 48,
  barnSwallow: 50,
  barnOwl: 55,
  puffin: 95,
  sandhillCrane: 100,
  paintedBunting: 110,
  kestrel: 120,
  snowyOwl: 125,
  whoopingCrane: null, // egg
  condor: null, // egg
};

describe("the roster (§13)", () => {
  it("has all 22 species at the spec's exact prices", () => {
    expect(SPECIES.length).toBe(22);
    for (const [id, price] of Object.entries(PRICE_TABLE)) {
      expect(SPECIES_BY_ID[id], `species ${id} exists`).toBeTruthy();
      expect(SPECIES_BY_ID[id].price, `price of ${id}`).toBe(price);
    }
  });

  it("splits 8 common / 7 uncommon / 5 rare / 2 legendary, 6 seasonal", () => {
    const byTier = (t) => SPECIES.filter((s) => s.tier === t).length;
    expect(byTier("common")).toBe(8);
    expect(byTier("uncommon")).toBe(7);
    expect(byTier("rare")).toBe(5);
    expect(byTier("legendary")).toBe(2);
    expect(SPECIES.filter(isSeasonal).length).toBe(6);
  });

  it("the Skylark is the starter and the legendaries are egg-only", () => {
    expect(SPECIES_BY_ID.skylark.starter).toBe(true);
    expect(SPECIES_BY_ID.whoopingCrane.egg).toBe(true);
    expect(SPECIES_BY_ID.condor.egg).toBe(true);
  });

  it("every entry carries the full contract: six names, four true-fact rows, wow, Latin, call", () => {
    for (const s of SPECIES) {
      expect(s.presetNames.length, s.id).toBe(6);
      expect(s.latin, s.id).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
      expect(s.wow, s.id).toBeTruthy();
      expect(s.callCaption, s.id).toMatch(/♪/);
      for (const key of ["howBig", "eats", "lives", "doing"]) {
        expect(s.facts[key], `${s.id}.${key}`).toBeTruthy();
      }
    }
  });

  it("every species suits at least one real perch type in every zone", () => {
    const typesByZone = {};
    for (const p of PERCHES) (typesByZone[p.zone] ??= new Set()).add(p.type);
    for (const s of SPECIES) {
      for (const [zone, types] of Object.entries(typesByZone)) {
        expect(
          s.perchTypes.some((t) => types.has(t)),
          `${s.id} has a perch in ${zone}`
        ).toBe(true);
      }
    }
  });
});

describe("rarity is what a bird does (§09)", () => {
  it("uncommon and rarer birds have a signature move with a rig; commons do not", () => {
    for (const s of SPECIES) {
      if (s.tier === "common") {
        expect(s.signature, s.id).toBeNull();
      } else {
        expect(s.signature?.id, s.id).toBeTruthy();
        expect(SIGNATURE_RIGS[s.signature.id], `rig for ${s.id}`).toBeTruthy();
        expect(rigFor(s.id), s.id).toBeTruthy();
      }
    }
  });

  it("rare birds add a tap response and an hour of their own; legendaries a ~10s set piece", () => {
    for (const s of SPECIES.filter((x) => x.tier === "rare" || x.tier === "legendary")) {
      expect(s.tapResponse, s.id).toBeTruthy();
      expect(["morning", "midday", "dusk"]).toContain(s.ownHour);
      expect(answersWithSignature(s.id)).toBe(true);
    }
    for (const s of SPECIES.filter((x) => x.tier === "legendary")) {
      expect(s.setPiece?.seconds, s.id).toBe(10);
      expect(SIGNATURE_RIGS[s.signature.id].duration, s.id).toBe(10);
    }
    expect(answersWithSignature("blueJay")).toBe(false);
  });

  it("signature envelopes are 2–4s and never fire closer than 90s apart", () => {
    for (const s of SPECIES.filter((x) => x.signature && !x.setPiece)) {
      const rig = SIGNATURE_RIGS[s.signature.id];
      expect(rig.duration, s.signature.id).toBeGreaterThanOrEqual(2);
      expect(rig.duration, s.signature.id).toBeLessThanOrEqual(4);
    }
    for (let i = 0; i < 20; i++) {
      expect(nextSignatureDelay()).toBeGreaterThanOrEqual(SIGNATURE_MIN_GAP_MS);
    }
  });

  it("own-hour buckets and the set-piece cadence are calm and deterministic", () => {
    expect(hourBucket(new Date(2026, 7, 4, 8))).toBe("morning");
    expect(hourBucket(new Date(2026, 7, 4, 13))).toBe("midday");
    expect(hourBucket(new Date(2026, 7, 4, 19))).toBe("dusk");
    expect(hourBucket(new Date(2026, 7, 4, 23))).toBe("night");
    const day = new Date(2026, 7, 4);
    expect(setPieceToday(SPECIES_BY_ID.whoopingCrane, day)).toBe(
      setPieceToday(SPECIES_BY_ID.whoopingCrane, day)
    );
    expect(setPieceToday(SPECIES_BY_ID.robin, day)).toBe(false);
  });
});
