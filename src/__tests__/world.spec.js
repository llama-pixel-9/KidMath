// Open-world Phase 0: the flag gate, atlas density pick, and the contract
// between the zone layout and the committed atlases. Deliberately Phaser-free
// — the engine only ever loads in the browser behind the /world route.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { worldEnabled } from "../world/worldFlags";
import { atlasScaleForDPR } from "../world/atlasScale";
import { ISLANDS, CLOUDS, BOAT, WORLD_BOUNDS } from "../world/zones/archipelagoLayout";

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
    expect(atlasScaleForDPR(0)).toBe(1);
    expect(atlasScaleForDPR(1)).toBe(1);
    expect(atlasScaleForDPR(1.5)).toBe(2);
    expect(atlasScaleForDPR(2)).toBe(2);
    expect(atlasScaleForDPR(3)).toBe(3);
    expect(atlasScaleForDPR(4)).toBe(3);
  });
});

describe("archipelago layout ↔ atlas contract", () => {
  const atlasDir = path.resolve(__dirname, "../../public/world/atlases");
  const layoutFrames = [
    ...ISLANDS.map((i) => i.frame),
    ...CLOUDS.map((c) => c.frame),
    BOAT.frame,
  ];

  it("every frame the layout references exists in every committed atlas density", () => {
    for (const scale of [1, 2, 3]) {
      const jsonPath = path.join(atlasDir, `archipelago@${scale}x.json`);
      // The atlases are build artifacts but committed (Vercel previews need
      // them); a missing file means `npm run world:atlases` wasn't rerun.
      expect(existsSync(jsonPath), `${jsonPath} missing — run npm run world:atlases`).toBe(true);
      const atlas = JSON.parse(readFileSync(jsonPath, "utf8"));
      const frames = new Set(atlas.textures.flatMap((t) => t.frames.map((f) => f.filename)));
      for (const frame of layoutFrames) {
        expect(frames.has(frame), `frame "${frame}" not in archipelago@${scale}x`).toBe(true);
      }
    }
  });

  it("layout positions sit inside the world bounds", () => {
    for (const p of [...ISLANDS, ...CLOUDS, BOAT]) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.y).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(WORLD_BOUNDS.width);
      expect(p.y).toBeLessThan(WORLD_BOUNDS.height);
    }
  });
});
