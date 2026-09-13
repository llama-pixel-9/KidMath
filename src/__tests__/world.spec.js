// Skylark Island: the flag gate, the region layout, the mastery engine, the
// world store, and the content contracts every zone must keep (real art,
// positions on the ground band, honest quests). Deliberately Phaser-free —
// the engine only ever loads in the browser behind /world.
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { worldEnabled } from "../world/worldFlags";
import {
  REGIONS,
  REGION_W,
  SEA_LEFT_W,
  WORLD_W,
  GROUND_TOP,
  GROUND_BOTTOM,
  regionAtX,
  depthScaleAt,
  clampToGround,
} from "../world/regions";
import { modePlayed, modeMastery, groupMastery, bloomStage, discoveredIslandIds, worldSnapshot } from "../world/mastery/masteryModel";
import { MODE_GROUPS } from "../modes/index.js";
import { ZONES, ZONE_LIST, STEP_TYPES, zoneForRegion } from "../world/zones/index";
import { MEADOW_ZONE } from "../world/zones/meadowZone";
import { buildLoadList, birdUrl, propUrl, zoneUrl } from "../world/worldArt";
import { timeOfDay } from "../world/worldTime";
import { zoomFor } from "../world/engine/cameraRig";
import { VISITORS, visitorForDate, visitorQuest } from "../world/engine/visitor";
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
  applyDiscover,
  applyLastRegion,
  applySecretFound,
} from "../world/worldStore";

const publicDir = path.resolve(__dirname, "../../public");
const exists = (url) => existsSync(path.join(publicDir, url));

describe("world flag", () => {
  it("is off unless VITE_WORLD_ENABLED is exactly 'true'", () => {
    expect(worldEnabled({})).toBe(false);
    expect(worldEnabled({ VITE_WORLD_ENABLED: "1" })).toBe(false);
    expect(worldEnabled({ VITE_WORLD_ENABLED: "false" })).toBe(false);
    expect(worldEnabled({ VITE_WORLD_ENABLED: "true" })).toBe(true);
  });
});

describe("the island layout", () => {
  it("is one contiguous panorama: sea, four regions side by side, sea", () => {
    expect(REGIONS).toHaveLength(4);
    REGIONS.forEach((r, i) => {
      expect(r.x0).toBe(SEA_LEFT_W + i * REGION_W);
      expect(r.x1).toBe(r.x0 + REGION_W);
      expect(r.index).toBe(i);
      expect(exists(zoneUrl(r.backdrop)), r.backdrop).toBe(true);
    });
    expect(WORLD_W).toBeGreaterThan(REGIONS.at(-1).x1);
    expect(regionAtX(SEA_LEFT_W + 10).id).toBe("meadow");
    expect(regionAtX(10)).toBeNull();
  });

  it("maps every region to a real mode group and every mode group to a signpost", () => {
    const groupIds = new Set(MODE_GROUPS.map((g) => g.id));
    const covered = new Set();
    for (const r of REGIONS) {
      expect(groupIds.has(r.groupId), r.groupId).toBe(true);
      expect(r.modeIds.length).toBeGreaterThan(0);
      for (const g of r.signpost.groups) {
        expect(groupIds.has(g), g).toBe(true);
        covered.add(g);
      }
    }
    // Every strand in the app is reachable from some signpost on the island.
    for (const g of MODE_GROUPS) expect(covered.has(g.id), `${g.id} has no practice spot`).toBe(true);
  });

  it("scales sprites by depth and clamps to the ground band", () => {
    expect(depthScaleAt(GROUND_TOP)).toBeLessThan(depthScaleAt(GROUND_BOTTOM));
    expect(clampToGround(0)).toBe(GROUND_TOP);
    expect(clampToGround(5000)).toBe(GROUND_BOTTOM);
  });

  it("picks a camera zoom that keeps the ground band on screen", () => {
    expect(zoomFor(1024, 700)).toBeGreaterThan(0.6);
    expect(zoomFor(1024, 700)).toBeLessThan(1);
    expect(zoomFor(390, 700)).toBeGreaterThanOrEqual(0.45);
    // A very tall viewport still covers the whole world height: no empty
    // strip under the island.
    expect(zoomFor(3000, 3000)).toBeGreaterThanOrEqual(3000 / 1176);
    expect(zoomFor(2000, 1000)).toBeLessThanOrEqual(1.35);
  });

  it("knows day, dusk and night, with a test override", () => {
    expect(timeOfDay(new Date(2026, 0, 1, 12))).toBe("day");
    expect(timeOfDay(new Date(2026, 0, 1, 18))).toBe("dusk");
    expect(timeOfDay(new Date(2026, 0, 1, 23))).toBe("night");
    expect(timeOfDay(new Date(2026, 0, 1, 3))).toBe("night");
    expect(timeOfDay(new Date(2026, 0, 1, 12), "night")).toBe("night");
    expect(timeOfDay(new Date(2026, 0, 1, 23), "all")).toBe("night");
  });
});

describe("the daily visitor", () => {
  it("every visitor has real art, honest options, and a full quest", () => {
    for (const v of VISITORS) {
      expect(exists(birdUrl(v.bird)), v.bird).toBe(true);
      expect(v.options).toContain(v.answer);
      expect(new Set(v.options).size).toBe(v.options.length);
      const q = visitorQuest({ ...v, day: "2026-09-13" });
      expect(q.steps.map((s) => s.type)).toEqual(["talk", "pickNumber", "celebrate"]);
      expect(q.steps.at(-1).stars).toBe(2);
    }
  });
  it("is the same bird all day and a different one another day", () => {
    const a = visitorForDate(new Date(2026, 8, 13, 9));
    const b = visitorForDate(new Date(2026, 8, 13, 20));
    expect(a.bird).toBe(b.bird);
    expect(a.day).toBe("2026-09-13");
    const week = new Set(Array.from({ length: 7 }, (_, i) => visitorForDate(new Date(2026, 8, 13 + i)).bird));
    expect(week.size).toBeGreaterThan(3);
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

  it("maps levels 1..10 onto 0..1 and averages over ALL modes in a group", () => {
    expect(modeMastery(undefined)).toBe(0);
    expect(modeMastery({ level: 10 })).toBe(1);
    expect(groupMastery({ a: { level: 10 } }, ["a", "b"])).toBeCloseTo(0.5);
  });

  it("bloom stages grow with mastery and never before first play", () => {
    expect(bloomStage(0.9, false)).toBe(0);
    expect(bloomStage(0.1, true)).toBe(1);
    expect(bloomStage(0.6, true)).toBe(3);
  });

  it("keeps the discovery horizon one island ahead of real progress", () => {
    const islands = [
      { id: "i0", modeIds: ["m0"] },
      { id: "i1", modeIds: ["m1"] },
      { id: "i2", modeIds: ["m2"] },
    ];
    expect(discoveredIslandIds({}, islands)).toEqual(["i0", "i1"]);
    expect(discoveredIslandIds({ m1: { level: 2 } }, islands)).toEqual(["i0", "i1", "i2"]);
    const snap = worldSnapshot({}, islands);
    expect(snap.islands[0]).toMatchObject({ id: "i0", discovered: true, bloom: 0 });
  });
});

describe("world store", () => {
  it("awards stars and flips fixtures exactly once per quest", () => {
    let s = emptyWorldState();
    s = applyQuestComplete(s, "bridge", 3, "bridgeFixed");
    expect(s.stars).toBe(3);
    expect(questDone(s, "bridge")).toBe(true);
    expect(fixtureOn(s, "bridgeFixed")).toBe(true);
    expect(applyQuestComplete(s, "bridge", 3, "bridgeFixed").stars).toBe(3);
  });

  it("gates quests on their required fixture", () => {
    const fresh = emptyWorldState();
    const openNow = availableQuests(fresh, MEADOW_ZONE).map((q) => q.id);
    expect(openNow).toContain("bridge");
    expect(openNow).not.toContain("chicks");
    const after = applyQuestComplete(fresh, "bridge", 3, "bridgeFixed");
    expect(availableQuests(after, MEADOW_ZONE).map((q) => q.id)).toContain("chicks");
    expect(availableQuests(after, MEADOW_ZONE).map((q) => q.id)).not.toContain("bridge");
  });

  it("the egg only counts practice earned after the gift", () => {
    let s = applyReceiveEgg(emptyWorldState(), 500);
    expect(eggWarmth(s, 500)).toBe(0);
    expect(petStage(s, 500)).toBe(0);
    expect(petStage(s, 500 + PET_HATCH_WARMTH)).toBe("hatched");
    s = applyQuestComplete(s, "bridge", 3, "bridgeFixed");
    expect(eggWarmth(s, 500)).toBe(3);
    expect(applyReceiveEgg(s, 999)).toBe(s);
  });

  it("feathers collect once; decorations cost stars and refuse overdrafts", () => {
    let s = { ...emptyWorldState(), stars: 10 };
    s = applyCollectFeather(s, "sunFeather");
    expect(applyCollectFeather(s, "sunFeather").feathers).toHaveLength(1);
    s = applyBuyDecoration(s, "nestbox", 5);
    expect(s.stars).toBe(5);
    expect(applyBuyDecoration(s, "nestbox", 5)).toBe(s);
    expect(applyBuyDecoration(s, "grandTree", 15)).toBe(s);
  });

  it("the seed runs on calendar days: mound → sprout → bloom → harvest", () => {
    const s = applyPlantSeed(emptyWorldState(), "2026-08-09");
    expect(seedStage(s, "2026-08-09")).toBe(0);
    expect(seedStage(s, "2026-08-10")).toBe(1);
    expect(seedStage(s, "2026-08-11")).toBe(2);
    expect(applyHarvestFlower(s, "2026-08-10")).toBe(s);
    const picked = applyHarvestFlower(s, "2026-08-11");
    expect(picked.stars).toBe(2);
    expect(picked.seed).toBeNull();
  });

  it("pays a secret once and remembers it", () => {
    let s = applyReceiveEgg(emptyWorldState(), 0);
    s = applySecretFound(s, "hollowOwl");
    expect(s.stars).toBe(2);
    expect(s.secrets).toEqual(["hollowOwl"]);
    expect(s.egg.warmth).toBe(2);
    expect(applySecretFound(s, "hollowOwl")).toBe(s);
  });

  it("remembers discovered regions and the last one visited", () => {
    let s = emptyWorldState();
    expect(s.discovered).toEqual([]);
    s = applyDiscover(s, "pond");
    expect(applyDiscover(s, "pond")).toBe(s);
    expect(s.discovered).toEqual(["pond"]);
    s = applyLastRegion(s, "pond");
    expect(applyLastRegion(s, "pond")).toBe(s);
    expect(s.lastRegion).toBe("pond");
  });
});

describe("zone content (every region)", () => {
  const onBand = (p) => p.x > 0 && p.x < REGION_W && p.y >= GROUND_TOP - 30 && p.y <= GROUND_BOTTOM + 30;

  it("registers one zone per region under its own id", () => {
    expect(ZONE_LIST.map((z) => z.id)).toEqual(REGIONS.map((r) => r.id));
    for (const zone of ZONE_LIST) {
      expect(ZONES[zone.id]).toBe(zone);
      expect(zoneForRegion(zone.regionId)).toBe(zone);
      expect(REGIONS.some((r) => r.id === zone.regionId)).toBe(true);
    }
  });

  it("quest ids, fixtures, and feather ids are globally unique — zones share one store", () => {
    const questIds = ZONE_LIST.flatMap((z) => z.quests.map((q) => q.id));
    expect(new Set(questIds).size).toBe(questIds.length);
    const fixtures = ZONE_LIST.flatMap((z) => z.quests.map((q) => q.steps.at(-1).fixture).concat((z.feathers ?? []).map((f) => f.id)));
    expect(new Set(fixtures).size).toBe(fixtures.length);
    const npcIds = ZONE_LIST.flatMap((z) => z.npcs.map((n) => n.id));
    expect(new Set(npcIds).size).toBe(npcIds.length);
  });

  it("every quest is well-formed: known steps, honest options, matching counts, real NPCs", () => {
    for (const zone of ZONE_LIST) {
      expect(zone.quests.length).toBeGreaterThanOrEqual(5);
      for (const quest of zone.quests) {
        expect(quest.steps.length).toBeGreaterThanOrEqual(3);
        for (const step of quest.steps) {
          expect(STEP_TYPES, `${quest.id}: unknown step ${step.type}`).toContain(step.type);
          expect(typeof step.line).toBe("string");
          expect(step.line.length).toBeGreaterThan(8);
        }
        const last = quest.steps.at(-1);
        expect(last.type).toBe("celebrate");
        expect(last.stars).toBeGreaterThan(0);
        expect(typeof last.fixture).toBe("string");
        for (const step of quest.steps.filter((s) => s.type === "pickNumber")) {
          expect(step.options).toContain(step.answer);
          expect(new Set(step.options).size).toBe(step.options.length);
        }
        for (const step of quest.steps.filter((s) => s.type === "placeItems")) {
          const o = zone.objects[step.target];
          expect(o, `${quest.id}: unknown target ${step.target}`).toBeDefined();
          if (step.target === "bridge") expect(step.count).toBe(o.slots - o.present);
          if (step.target === "feeder") expect(step.count).toBe(o.capacity - o.present);
          if (step.target === "nests") expect(step.count).toBe(o.spots.length * o.eggsPer);
          if (step.target === "gate") expect(step.count).toBe(10 - o.tenFrameFilled);
        }
        for (const step of quest.steps.filter((s) => s.type === "countTap")) {
          expect(["bridge-slots", "chicks"]).toContain(step.targets);
        }
        if (quest.npcId) expect(zone.npcs.some((n) => n.id === quest.npcId), quest.id).toBe(true);
        if (quest.requiresFixture) {
          expect(zone.quests.some((q) => q.steps.at(-1).fixture === quest.requiresFixture), `${quest.id} requires unreachable fixture`).toBe(true);
        }
      }
      expect(zone.quests.some((q) => q.id === zone.objects.gate.questId)).toBe(true);
      expect(zone.quests.some((q) => q.steps.at(-1).fixture === zone.objects.gate.fixture)).toBe(true);
      expect(zone.npcs.some((n) => n.id === zone.objects.chicks.homeNpcId)).toBe(true);
      for (const npc of zone.npcs) expect(typeof npc.thanks, npc.id).toBe("string");
    }
  });

  it("references only art that exists, and stands everything on the ground band", () => {
    for (const zone of ZONE_LIST) {
      for (const npc of zone.npcs) {
        expect(exists(birdUrl(npc.bird)), npc.bird).toBe(true);
        expect(onBand(npc), `${zone.id}/${npc.id} off the ground band`).toBe(true);
      }
      const o = zone.objects;
      for (const id of [o.feeder.prop, o.nests.prop, o.gate.prop]) expect(exists(propUrl(id)), id).toBe(true);
      expect(exists(birdUrl(o.chicks.bird)), o.chicks.bird).toBe(true);
      for (const p of [o.bridge, o.feeder, o.gate, ...o.nests.spots, ...o.chicks.spots, zone.spawn]) {
        expect(onBand(p), `${zone.id} object off the ground band`).toBe(true);
      }
      for (const f of zone.feathers ?? []) {
        expect(exists(`/meadow/feathers/${f.art}.webp`), f.art).toBe(true);
        expect(onBand(f), `${zone.id}/${f.id}`).toBe(true);
      }
      if (zone.home) {
        expect(onBand(zone.home)).toBe(true);
        for (const item of zone.home.shop) {
          expect(exists(propUrl(item.prop)), item.prop).toBe(true);
          expect(item.cost).toBeGreaterThan(0);
        }
      }
      if (zone.seedPlot) expect(onBand(zone.seedPlot)).toBe(true);
      // The gate sits at the far end, where the seam props leave a gap.
      expect(o.gate.x).toBeGreaterThan(REGION_W - 200);
    }
  });

  it("the boot load list covers every file the island uses, and all exist", () => {
    const list = buildLoadList(ZONE_LIST);
    expect(list.size).toBeGreaterThan(55);
    for (const [key, url] of list) expect(exists(url), `${key} → ${url}`).toBe(true);
    expect(list.has("bird-skylark")).toBe(true);
    expect(list.has("bird-skylark-fly")).toBe(true);
    expect(list.has("zone-cliffs")).toBe(true);
  });
});
