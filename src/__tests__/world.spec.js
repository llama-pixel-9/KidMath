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
