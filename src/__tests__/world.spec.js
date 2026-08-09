// Open-world: the flag gate, atlas density pick, mastery engine v1, and the
// contracts between islands, mode groups, and committed art. Deliberately
// Phaser-free — the engine only ever loads in the browser behind /world.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { worldEnabled } from "../world/worldFlags";
import { atlasScaleForDPR } from "../world/atlasScale";
import { ISLANDS, WORLD_BOUNDS, HOME_ISLAND_ID } from "../world/islands";
import { ZONE_BACKDROPS, GUIDE_BIRD, BLOOM_PROPS } from "../world/worldArt";
import {
  modePlayed,
  modeMastery,
  groupMastery,
  bloomStage,
  discoveredIslandIds,
  worldSnapshot,
} from "../world/mastery/masteryModel";
import { MODE_GROUPS } from "../modes/index.js";
import { MEADOW_ZONE, STEP_TYPES } from "../world/zones/meadowZone";
import { ZONES, zoneForIsland } from "../world/zones/index";
import {
  emptyWorldState,
  applyQuestComplete,
  questDone,
  fixtureOn,
  availableQuests,
  applyReceiveEgg,
  eggWarmth,
  petStage,
  PET_HATCH_WARMTH,
  applyCollectFeather,
  applyBuyDecoration,
  applyPlantSeed,
  seedStage,
  applyHarvestFlower,
} from "../world/worldStore";

const publicDir = path.resolve(__dirname, "../../public");

describe("world flag", () => {
  it("is off unless VITE_WORLD_ENABLED is exactly 'true'", () => {
    expect(worldEnabled({})).toBe(false);
    expect(worldEnabled(undefined)).toBe(false);
    expect(worldEnabled({ VITE_WORLD_ENABLED: "1" })).toBe(false);
    expect(worldEnabled({ VITE_WORLD_ENABLED: "false" })).toBe(false);
    expect(worldEnabled({ VITE_WORLD_ENABLED: "true" })).toBe(true);
  });
});

describe("atlas density", () => {
  it("clamps devicePixelRatio to the 1x/2x/3x variants the pipeline emits", () => {
    expect(atlasScaleForDPR(undefined)).toBe(1);
    expect(atlasScaleForDPR(1)).toBe(1);
    expect(atlasScaleForDPR(1.5)).toBe(2);
    expect(atlasScaleForDPR(2)).toBe(2);
    expect(atlasScaleForDPR(4)).toBe(3);
  });
});

describe("mastery engine v1", () => {
  it("treats level>1, sessions, or stars as played", () => {
    expect(modePlayed(undefined)).toBe(false);
    expect(modePlayed({ level: 1, totalSessions: 0, lifetimeStars: 0 })).toBe(false);
    expect(modePlayed({ level: 2 })).toBe(true);
    expect(modePlayed({ level: 1, totalSessions: 1 })).toBe(true);
    expect(modePlayed({ level: 1, lifetimeStars: 3 })).toBe(true);
  });

  it("maps levels 1..10 onto 0..1", () => {
    expect(modeMastery(undefined)).toBe(0);
    expect(modeMastery({ level: 1 })).toBe(0);
    expect(modeMastery({ level: 10 })).toBe(1);
    expect(modeMastery({ level: 99 })).toBe(1);
    expect(modeMastery({ level: 5.5 })).toBeCloseTo(0.5);
  });

  it("averages over ALL modes in a group, unplayed counting as zero", () => {
    const byMode = { a: { level: 10 } };
    expect(groupMastery(byMode, ["a", "b"])).toBeCloseTo(0.5);
    expect(groupMastery({}, [])).toBe(0);
  });

  it("bloom stages grow with mastery and never before first play", () => {
    expect(bloomStage(0.9, false)).toBe(0);
    expect(bloomStage(0.1, true)).toBe(1);
    expect(bloomStage(0.3, true)).toBe(2);
    expect(bloomStage(0.6, true)).toBe(3);
  });

  it("keeps the discovery horizon one island ahead of real progress", () => {
    const islands = [
      { id: "i0", modeIds: ["m0"] },
      { id: "i1", modeIds: ["m1"] },
      { id: "i2", modeIds: ["m2"] },
      { id: "i3", modeIds: ["m3"] },
    ];
    // Fresh kid: the first two islands are open — autonomy needs a real choice.
    expect(discoveredIslandIds({}, islands)).toEqual(["i0", "i1"]);
    // Progress on island 1 opens island 2; island 3 stays fogged.
    expect(discoveredIslandIds({ m1: { level: 2 } }, islands)).toEqual(["i0", "i1", "i2"]);
    // A deep-linked kid with progress only on island 3: it self-discovers.
    expect(discoveredIslandIds({ m3: { level: 2 } }, islands)).toEqual(["i0", "i1", "i3"]);
  });

  it("snapshots every island with discovery, bloom, and progress flags", () => {
    const snap = worldSnapshot({}, ISLANDS);
    expect(snap.islands).toHaveLength(ISLANDS.length);
    expect(snap.anyProgress).toBe(false);
    expect(snap.islands[0]).toMatchObject({ id: ISLANDS[0].id, discovered: true, bloom: 0 });
  });
});

describe("island definitions", () => {
  it("mirror MODE_GROUPS exactly — one island per group, same modes", () => {
    expect(ISLANDS.map((i) => i.id)).toEqual(MODE_GROUPS.map((g) => g.id));
    for (const [idx, island] of ISLANDS.entries()) {
      expect(island.modeIds).toEqual(MODE_GROUPS[idx].modeIds);
    }
    expect(HOME_ISLAND_ID).toBe(ISLANDS[0].id);
  });

  it("sit inside the world bounds with sane radii and real art", () => {
    for (const island of ISLANDS) {
      expect(island.x).toBeGreaterThan(island.r);
      expect(island.y).toBeGreaterThan(island.r);
      expect(island.x).toBeLessThan(WORLD_BOUNDS.width - island.r);
      expect(island.y).toBeLessThan(WORLD_BOUNDS.height - island.r);
      expect(ZONE_BACKDROPS[island.backdrop], `${island.id} backdrop`).toBeDefined();
      expect(BLOOM_PROPS[island.prop], `${island.id} prop`).toBeDefined();
    }
  });
});

describe("world store", () => {
  it("awards stars and flips fixtures exactly once per quest", () => {
    let s = emptyWorldState();
    s = applyQuestComplete(s, "bridge", 3, "bridgeFixed");
    expect(s.stars).toBe(3);
    expect(questDone(s, "bridge")).toBe(true);
    expect(fixtureOn(s, "bridgeFixed")).toBe(true);
    // Replaying a done quest never double-pays.
    const again = applyQuestComplete(s, "bridge", 3, "bridgeFixed");
    expect(again.stars).toBe(3);
  });

  it("gates quests on their required fixture", () => {
    const fresh = emptyWorldState();
    const openNow = availableQuests(fresh, MEADOW_ZONE).map((q) => q.id);
    expect(openNow).toContain("bridge");
    expect(openNow).not.toContain("chicks"); // needs bridgeFixed
    const after = applyQuestComplete(fresh, "bridge", 3, "bridgeFixed");
    expect(availableQuests(after, MEADOW_ZONE).map((q) => q.id)).toContain("chicks");
    // Done quests drop out of the available list.
    expect(availableQuests(after, MEADOW_ZONE).map((q) => q.id)).not.toContain("bridge");
  });
});

describe("ownership layer (Phase 3)", () => {
  it("the egg only counts practice earned after the gift", () => {
    let s = applyReceiveEgg(emptyWorldState(), 500); // veteran kid, 500 stars
    expect(eggWarmth(s, 500)).toBe(0); // history doesn't hatch it
    expect(petStage(s, 500)).toBe(0);
    expect(eggWarmth(s, 512)).toBe(12); // 12 new practice stars warm it
    expect(petStage(s, 500 + PET_HATCH_WARMTH)).toBe("hatched");
    // Quest stars warm it too.
    s = applyQuestComplete(s, "bridge", 3, "bridgeFixed");
    expect(eggWarmth(s, 500)).toBe(3);
    // Receiving twice is a no-op.
    expect(applyReceiveEgg(s, 999)).toBe(s);
  });

  it("feathers collect once; decorations cost stars and refuse overdrafts", () => {
    let s = { ...emptyWorldState(), stars: 10 };
    s = applyCollectFeather(s, "sunFeather");
    expect(applyCollectFeather(s, "sunFeather").feathers).toHaveLength(1);
    s = applyBuyDecoration(s, "nestbox", 5);
    expect(s.stars).toBe(5);
    expect(s.decorations).toContain("nestbox");
    expect(applyBuyDecoration(s, "nestbox", 5)).toBe(s); // owned: no double-buy
    expect(applyBuyDecoration(s, "grandTree", 15)).toBe(s); // can't afford: no-op
  });

  it("the seed runs on calendar days: mound → sprout → bloom → harvest", () => {
    let s = applyPlantSeed(emptyWorldState(), "2026-08-09");
    expect(seedStage(s, "2026-08-09")).toBe(0);
    expect(seedStage(s, "2026-08-10")).toBe(1);
    expect(seedStage(s, "2026-08-11")).toBe(2);
    expect(seedStage(s, "2026-08-20")).toBe(2); // late is fine — no guilt
    expect(applyHarvestFlower(s, "2026-08-10")).toBe(s); // can't rush the bloom
    const picked = applyHarvestFlower(s, "2026-08-11");
    expect(picked.stars).toBe(2);
    expect(picked.seed).toBeNull(); // plot free for the next seed
    expect(applyPlantSeed(s, "2026-08-09")).toBe(s); // one seed at a time
  });

  it("premium islands stay fogged (not padlocked) for free families", () => {
    const islands = [
      { id: "a", modeIds: ["m"] },
      { id: "b", modeIds: ["n"], premium: true },
    ];
    const free = worldSnapshot({}, islands, { isPremium: false });
    expect(free.islands[1].discovered).toBe(false);
    const paid = worldSnapshot({}, islands, { isPremium: true });
    expect(paid.islands[1].discovered).toBe(true);
    // No island in the shipping set is premium today.
    expect(ISLANDS.some((i) => i.premium)).toBe(false);
  });

  it("home shop, feathers, and seed plot reference real art inside bounds", () => {
    const { width, height } = MEADOW_ZONE.bounds;
    const inBounds = (p) => p.x > 0 && p.x < width && p.y > 0 && p.y < height;
    expect(existsSync(path.join(publicDir, MEADOW_ZONE.home.nestArt))).toBe(true);
    for (const art of MEADOW_ZONE.home.eggArts) {
      expect(existsSync(path.join(publicDir, art)), art).toBe(true);
    }
    expect(existsSync(path.join(publicDir, MEADOW_ZONE.home.chickArt))).toBe(true);
    for (const item of MEADOW_ZONE.home.shop) {
      expect(existsSync(path.join(publicDir, item.art)), item.art).toBe(true);
      expect(inBounds(item), `${item.id} out of bounds`).toBe(true);
      expect(item.cost).toBeGreaterThan(0);
    }
    for (const feather of MEADOW_ZONE.feathers) {
      expect(existsSync(path.join(publicDir, feather.art)), feather.art).toBe(true);
      expect(inBounds(feather), `${feather.id} out of bounds`).toBe(true);
    }
    expect(inBounds(MEADOW_ZONE.seedPlot)).toBe(true);
    expect(inBounds(MEADOW_ZONE.home)).toBe(true);
  });
});

describe("zone definitions (every registered zone)", () => {
  const allZones = Object.values(ZONES);

  it("each zone is wired to a real island and registered under its own id", () => {
    for (const zone of allZones) {
      expect(ISLANDS.some((i) => i.id === zone.islandId), zone.id).toBe(true);
      expect(zoneForIsland(zone.islandId)).toBe(zone);
      expect(ZONES[zone.id]).toBe(zone);
    }
    expect(zoneForIsland(MEADOW_ZONE.islandId)).toBe(MEADOW_ZONE);
  });

  it("quest ids and fixture names are globally unique — zones share one store", () => {
    const questIds = allZones.flatMap((z) => z.quests.map((q) => q.id));
    expect(new Set(questIds).size).toBe(questIds.length);
    const fixtures = allZones.flatMap((z) =>
      z.quests.map((q) => q.steps.at(-1).fixture).concat(
        (z.feathers ?? []).map((f) => f.id),
      ),
    );
    expect(new Set(fixtures).size).toBe(fixtures.length);
  });

  it("every quest is well-formed: known steps, honest options, real NPCs", () => {
    for (const zone of allZones) {
      expect(zone.quests.length).toBeGreaterThanOrEqual(5);
      for (const quest of zone.quests) {
        expect(quest.steps.length).toBeGreaterThanOrEqual(3);
        for (const step of quest.steps) {
          expect(STEP_TYPES, `${quest.id}: unknown step ${step.type}`).toContain(step.type);
          expect(typeof step.line).toBe("string");
        }
        // Every quest ends in a celebration that pays stars and changes the
        // world permanently.
        const last = quest.steps.at(-1);
        expect(last.type).toBe("celebrate");
        expect(last.stars).toBeGreaterThan(0);
        expect(typeof last.fixture).toBe("string");
        // The right answer must be among the offered options (the
        // un-failable rule is meaningless otherwise).
        for (const step of quest.steps.filter((s) => s.type === "pickNumber")) {
          expect(step.options).toContain(step.answer);
        }
        // placeItems counts must match what the object has room for.
        for (const step of quest.steps.filter((s) => s.type === "placeItems")) {
          const o = zone.objects[step.target];
          expect(o, `${quest.id}: unknown target ${step.target}`).toBeDefined();
          if (step.target === "bridge") expect(step.count).toBe(o.slots - o.present);
          if (step.target === "feeder") expect(step.count).toBe(o.capacity - o.present);
          if (step.target === "nests") expect(step.count).toBe(o.spots.length * o.eggsPer);
          if (step.target === "gate") expect(step.count).toBe(10 - o.tenFrameFilled);
        }
        if (quest.npcId) {
          expect(zone.npcs.some((n) => n.id === quest.npcId), `${quest.id}`).toBe(true);
        }
        // A gated quest's requirement must be earnable in the same zone.
        if (quest.requiresFixture) {
          expect(
            zone.quests.some((q) => q.steps.at(-1).fixture === quest.requiresFixture),
            `${quest.id} requires unreachable fixture`,
          ).toBe(true);
        }
      }
      // The gate object must point at a quest that exists.
      expect(zone.quests.some((q) => q.id === zone.objects.gate.questId)).toBe(true);
      // The scatter hunt's home NPC must exist.
      expect(zone.npcs.some((n) => n.id === zone.objects.chicks.homeNpcId)).toBe(true);
      // NPCs need their remember-you line.
      for (const npc of zone.npcs) expect(typeof npc.thanks, npc.id).toBe("string");
    }
  });

  it("references only art that exists, with everything inside the zone bounds", () => {
    for (const zone of allZones) {
      const { width, height } = zone.bounds;
      const inBounds = (p) => p.x > 0 && p.x < width && p.y > 0 && p.y < height;
      for (const npc of zone.npcs) {
        expect(existsSync(path.join(publicDir, npc.art)), npc.art).toBe(true);
        expect(inBounds(npc), `${zone.id}/${npc.id} out of bounds`).toBe(true);
      }
      const o = zone.objects;
      for (const art of [o.feeder.art, o.nests.art, o.nests.eggArt, o.gate.art, o.chicks.art]) {
        expect(existsSync(path.join(publicDir, art)), art).toBe(true);
      }
      for (const p of [o.bridge, o.feeder, o.gate, ...o.nests.spots, ...o.chicks.spots, zone.spawn]) {
        expect(inBounds(p), zone.id).toBe(true);
      }
      for (const feather of zone.feathers ?? []) {
        expect(existsSync(path.join(publicDir, feather.art)), feather.art).toBe(true);
        expect(inBounds(feather), `${zone.id}/${feather.id}`).toBe(true);
      }
    }
  });
});

describe("committed art contracts", () => {
  it("every meadow file the world references exists", () => {
    const urls = [
      ...Object.values(ZONE_BACKDROPS).map((a) => a.url),
      GUIDE_BIRD.url,
      ...Object.values(BLOOM_PROPS).map((a) => a.url),
    ];
    for (const url of urls) {
      expect(existsSync(path.join(publicDir, url)), `${url} missing from public/`).toBe(true);
    }
  });

  it("the atlas frames the scene uses exist at every density", () => {
    for (const scale of [1, 2, 3]) {
      const jsonPath = path.join(publicDir, "world", "atlases", `archipelago@${scale}x.json`);
      expect(existsSync(jsonPath), `${jsonPath} missing — run npm run world:atlases`).toBe(true);
      const atlas = JSON.parse(readFileSync(jsonPath, "utf8"));
      // JsonHash format: {frames: {name: {...}}, meta}.
      const frames = new Set(Object.keys(atlas.frames));
      for (const frame of ["cloud-puff", "cloud-long", "boat"]) {
        expect(frames.has(frame), `frame "${frame}" not in archipelago@${scale}x`).toBe(true);
      }
    }
  });
});
