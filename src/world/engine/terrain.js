import Phaser from "phaser";
import {
  REGIONS,
  REGION_W,
  REGION_H,
  SEA_LEFT_W,
  WORLD_W,
  WORLD_H,
  HORIZON_Y,
  SKY_TOP,
  SKY_HORIZON,
} from "../regions";
import { propSize } from "../worldArt";
import { DEPTH } from "./juice";

/**
 * The island itself: sky and sea strips at both ends, the four painted
 * backdrops side by side, landmark props covering each seam (a hedge with
 * a gap for the gate, a stand of trees, a tumble of rocks), a far cloud
 * layer that parallaxes behind everything, and a foreground of swaying
 * grass that parallaxes in front.
 */
export function buildTerrain(scene) {
  const handles = { seams: [], grass: [], farClouds: [], sea: [] };

  // ------------------------------------------------------------- sky/sea
  const sky = scene.add.graphics().setDepth(DEPTH.farSky);
  sky.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_HORIZON, SKY_HORIZON, 1);
  sky.fillRect(0, 0, WORLD_W, HORIZON_Y + 2);
  // Sea under the horizon on both ends (and under everything, so the
  // backdrops' bottom edge never shows a hard line).
  sky.fillGradientStyle(0xa9dcea, 0xa9dcea, 0x7fc3dc, 0x7fc3dc, 1);
  sky.fillRect(0, HORIZON_Y, WORLD_W, WORLD_H - HORIZON_Y);
  // Distant far-shore haze line.
  sky.fillStyle(0xd7ece4, 0.8);
  sky.fillRect(0, HORIZON_Y - 6, WORLD_W, 8);

  // Sun: a soft glow in the upper sky, barely parallaxing.
  const sun = scene.add.image(SEA_LEFT_W + 380, 150, "sunglow").setScale(2.2).setDepth(DEPTH.farSky + 1).setScrollFactor(0.12, 0.3);
  sun.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
  handles.sun = sun;

  // Beach wedges where the island meets the sea, drawn OVER the backdrop
  // edge so the painted grass fades into sand instead of ending in a line.
  const last = REGIONS[REGIONS.length - 1];
  const beach = scene.add.graphics().setDepth(DEPTH.backdrop + 1);
  const shore = (edgeX, dir) => {
    // dir = +1: island lies to the right of edgeX (the left shore).
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      beach.fillStyle(0xf4ebb7, 0.95 - t * 0.95);
      beach.fillEllipse(edgeX + dir * (40 + i * 22), WORLD_H - 30, 520 + i * 40, 300 + i * 10);
    }
    beach.fillStyle(0xf4ebb7, 1);
    beach.fillEllipse(edgeX - dir * 120, WORLD_H - 30, 620, 300);
    // Feather the backdrop's vertical edge above the beach with sky colour.
    for (let i = 0; i < 12; i++) {
      beach.fillStyle(SKY_HORIZON, 0.85 - i * 0.07);
      const x = dir > 0 ? edgeX + i * 12 : edgeX - (i + 1) * 12;
      beach.fillRect(x, 0, 12, HORIZON_Y + 30);
    }
    // The near hills at the edge, so the horizon doesn't stop dead.
    beach.fillStyle(0x9fd09d, 1);
    beach.fillEllipse(edgeX - dir * 60, HORIZON_Y + 4, 420, 70);
    beach.fillStyle(0xc4e588, 1);
    beach.fillEllipse(edgeX - dir * 100, HORIZON_Y + 40, 460, 70);
  };
  shore(SEA_LEFT_W, 1);
  shore(last.x1, -1);

  // Sea sparkle + slow ripples on both sea strips.
  for (const [x0, w] of [
    [0, SEA_LEFT_W],
    [last.x1, WORLD_W - last.x1],
  ]) {
    const e = scene.add.particles(0, 0, "sparkle", {
      x: { min: x0 + 20, max: x0 + w - 20 },
      y: { min: HORIZON_Y + 20, max: WORLD_H - 40 },
      scale: { start: 0, end: 0.5 },
      alpha: { start: 0, end: 0.9, ease: "Sine.easeInOut" },
      lifespan: 1600,
      frequency: 260,
      quantity: 1,
      tint: 0xffffff,
      blendMode: Phaser.BlendModes.ADD,
    });
    e.setDepth(DEPTH.backdrop - 1);
    e.cullRange = [x0, x0 + w];
    handles.sea.push(e);
    for (let i = 0; i < 9; i++) {
      const r = scene.add
        .image(x0 + 40 + Math.random() * (w - 80), HORIZON_Y + 60 + Math.random() * (WORLD_H - HORIZON_Y - 120), "ripple")
        .setScale(0.8 + Math.random() * 1.4, 1)
        .setAlpha(0.35)
        .setDepth(DEPTH.backdrop - 1);
      scene.tweens.add({
        targets: r,
        x: r.x + 30,
        alpha: 0.1,
        duration: 3000 + Math.random() * 2500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ------------------------------------------------------------ backdrops
  for (const region of REGIONS) {
    const key = `zone-${region.backdrop}`;
    if (!scene.textures.exists(key)) continue;
    scene.add.image(region.x0, 0, key).setOrigin(0, 0).setDepth(DEPTH.backdrop);
  }
  // Crossfade each join: the previous backdrop's left edge repeats over the
  // next region's first 260px and fades out, so grass melts into water or
  // woods instead of stopping at a line. (Per-vertex alpha: WebGL only; the
  // canvas fallback just shows the seam props.)
  const FADE_W = 260;
  for (let i = 0; i < REGIONS.length - 1; i++) {
    const prev = REGIONS[i];
    const key = `zone-${prev.backdrop}`;
    if (!scene.textures.exists(key)) continue;
    const strip = scene.add.image(prev.x1, 0, key).setOrigin(0, 0).setDepth(DEPTH.backdrop + 0.5);
    strip.setCrop(0, 0, FADE_W, REGION_H);
    strip.setAlpha(1, 0, 1, 0);
  }

  // ---------------------------------------------------------------- seams
  const prop = (id, x, feetY, height, depth = feetY, flip = false) => {
    const key = `prop-${id}`;
    if (!scene.textures.exists(key)) return null;
    const { h } = propSize(id);
    const img = scene.add.image(x, feetY, key).setOrigin(0.5, 1).setScale(height / h).setDepth(depth).setFlipX(flip);
    return img;
  };
  handles.seams.push(prop("tree", SEA_LEFT_W + 50, 930, 400, 870), prop("reeds", SEA_LEFT_W + 140, 1125, 120), prop("rocks", SEA_LEFT_W - 60, 1130, 120));
  handles.seams.push(prop("tree", last.x1 - 70, 920, 380, 860), prop("rocks", last.x1 + 40, 1120, 150, undefined, true));
  for (const region of REGIONS) {
    const x1 = region.x1;
    const group = [];
    // The gate (fence, ~295px wide) stands at x1-118 on the ground; seam
    // props sit BEHIND it (depth 940 < the gate's y) so the half-hedges' flat
    // edges tuck under the fence and the join reads as one hedgerow.
    if (region.seam === "hedge") {
      group.push(prop("tree", x1 - 10, 905, 430, 860));
      group.push(prop("hedgeL", x1 - 322, 1005, 330, 940));
      group.push(prop("hedgeR", x1 + 84, 1008, 330, 940));
      group.push(prop("reeds", x1 - 470, 1120, 120));
      group.push(prop("reeds", x1 + 200, 1122, 110));
    } else if (region.seam === "trees") {
      group.push(prop("tree", x1 - 300, 1000, 470, 940));
      group.push(prop("tree", x1 + 90, 990, 440, 940));
      group.push(prop("tree", x1 - 60, 880, 380, 850));
      group.push(prop("hedgeL", x1 - 322, 1005, 240, 941));
      group.push(prop("hedgeR", x1 + 84, 1008, 240, 941));
      group.push(prop("reeds", x1 - 470, 1120, 130));
      group.push(prop("reeds", x1 + 200, 1125, 110));
    } else if (region.seam === "rocks") {
      group.push(prop("rocks", x1 - 320, 1030, 290, 940));
      group.push(prop("rocks", x1 + 90, 1040, 250, 940, true));
      group.push(prop("tree", x1 - 70, 890, 400, 855));
      group.push(prop("hedgeL", x1 - 322, 1005, 220, 941));
      group.push(prop("hedgeR", x1 + 84, 1008, 220, 941));
      group.push(prop("log", x1 - 440, 1125, 60));
    }
    handles.seams.push(...group.filter(Boolean));
  }

  // ------------------------------------------------------- far cloud layer
  for (let i = 0; i < 14; i++) {
    const x = 200 + Math.random() * (WORLD_W * 0.5);
    const y = 90 + Math.random() * 260;
    const c = scene.add
      .image(x, y, "skycloud")
      .setScale(0.6 + Math.random() * 0.8)
      .setAlpha(0.55 + Math.random() * 0.3)
      .setDepth(DEPTH.farClouds)
      .setScrollFactor(0.35 + Math.random() * 0.15, 0.6);
    scene.tweens.add({
      targets: c,
      x: c.x + 60 + Math.random() * 80,
      duration: 16000 + Math.random() * 12000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    handles.farClouds.push(c);
  }

  // ----------------------------------------------------- foreground grass
  // Blades along the bottom edge, in front of the ground band, parallaxing
  // faster than the world so walking feels dimensional.
  for (let x = SEA_LEFT_W - 100; x < WORLD_W - 300; x += 70 + Math.random() * 90) {
    const inRegion = REGIONS.find((r) => x >= r.x0 - 100 && x < r.x1 + 40);
    if (!inRegion) continue;
    const blade = scene.add
      .image(x, WORLD_H + 6, "blade")
      .setOrigin(0.5, 1)
      .setScale(1.1 + Math.random() * 1.0)
      .setDepth(DEPTH.foreground)
      .setScrollFactor(1.12, 1)
      .setTint(inRegion.id === "cliffs" ? 0xa5d08c : inRegion.id === "woods" ? 0x7db87f : 0x86cc8f)
      .setAlpha(0.9);
    blade.baseAngle = (Math.random() - 0.5) * 10;
    blade.setAngle(blade.baseAngle);
    blade.swayPhase = Math.random() * Math.PI * 2;
    handles.grass.push(blade);
  }

  return handles;
}

/** Called from the scene's update: wind through the grass. */
export function updateTerrain(handles, time) {
  const t = time / 1000;
  for (const b of handles.grass) {
    b.setAngle(b.baseAngle + Math.sin(t * 1.6 + b.swayPhase) * 6);
  }
  for (const s of handles.seams) {
    if (s?.texture?.key === "prop-reeds") s.setAngle(Math.sin(t * 1.4 + s.x) * 2.2);
  }
}

/** Rect helpers for region-local water (pond) → world space. */
export function worldRects(zone, region) {
  return (zone.water ?? []).map((r) => ({ ...r, x: r.x + region.x0 }));
}

export { REGION_W, REGION_H };
