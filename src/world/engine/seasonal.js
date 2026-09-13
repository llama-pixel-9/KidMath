import Phaser from "phaser";
import { REGIONS, HORIZON_Y, WORLD_H, WORLD_W, SEA_LEFT_W } from "../regions";
import { DEPTH } from "./juice";

/**
 * The island changes with the calendar (Animal Crossing's clock): blossom
 * petals in spring, extra butterflies and long light in summer, orange
 * canopies and leaves everywhere in autumn, snow and a cool hush in winter.
 * Nothing is ever lost by missing a day; there is only something new to see.
 * `?world=winter` etc. forces a season for testing.
 */
export const SEASON_TOKENS = ["spring", "summer", "autumn", "winter"];

export function applySeason(scene, terrain, season) {
  const h = { season, emitters: [], overlay: null };
  const last = REGIONS[REGIONS.length - 1];
  const islandX = { min: SEA_LEFT_W, max: last.x1 };

  if (season === "spring") {
    const petals = scene.add.particles(0, 0, "puff", {
      x: { min: islandX.min, max: islandX.max },
      y: { min: 300, max: 700 },
      speedY: { min: 14, max: 32 },
      speedX: { min: -18, max: 22 },
      scale: { start: 0.2, end: 0.12 },
      alpha: { start: 0, end: 0.95, ease: "Sine.easeOut" },
      lifespan: 9000,
      frequency: 110,
      quantity: 1,
      tint: [0xffb7c5, 0xff9fb4, 0xfbc7a8],
    });
    petals.setDepth(DEPTH.ground - 3);
    h.emitters.push(petals);
    // Trees blush pink; hedges too.
    for (const p of terrain.seams) {
      const k = p?.texture?.key;
      if (k === "prop-tree") p.setTint(0xffc3d0);
      if (k === "prop-hedgeL" || k === "prop-hedgeR") p.setTint(0xffd6de);
    }
  } else if (season === "autumn") {
    for (const p of terrain.seams) if (p?.texture?.key === "prop-tree") p.setTint(0xff9a4a);
    for (const p of terrain.seams) if (p?.texture?.key === "prop-hedgeL" || p?.texture?.key === "prop-hedgeR") p.setTint(0xf0b24a);
    for (const b of terrain.grass) b.setTint(0xd9b25a);
    const leaves = scene.add.particles(0, 0, "leaf", {
      x: { min: islandX.min, max: islandX.max },
      y: { min: 400, max: 700 },
      speedY: { min: 18, max: 40 },
      speedX: { min: -25, max: 25 },
      rotate: { start: 0, end: 360 },
      scale: { start: 0.9, end: 0.7 },
      alpha: { start: 0, end: 1, ease: "Quad.easeOut" },
      lifespan: 9000,
      frequency: 140,
      quantity: 1,
      tint: [0xd98b3a, 0xe6b04a, 0xb86a2f, 0xc94f2b],
    });
    leaves.setDepth(DEPTH.ground - 3);
    h.emitters.push(leaves);
  } else if (season === "winter") {
    // Snow everywhere, a cool wash, white caps on the rocks and hedges.
    const snow = scene.add.particles(0, 0, "dot", {
      x: { min: 0, max: WORLD_W },
      y: { min: -20, max: 400 },
      speedY: { min: 30, max: 60 },
      speedX: { min: -12, max: 12 },
      scale: { start: 0.25, end: 0.18 },
      alpha: { start: 0.9, end: 0.6 },
      lifespan: 16000,
      frequency: 24,
      quantity: 1,
      tint: 0xffffff,
    });
    snow.setDepth(DEPTH.foreground + 1);
    h.emitters.push(snow);
    const wash = scene.add.graphics().setDepth(DEPTH.ground - 5);
    wash.fillStyle(0xeef6f8, 0.55);
    wash.fillRect(islandX.min - 200, HORIZON_Y - 40, islandX.max - islandX.min + 400, WORLD_H - HORIZON_Y + 40);
    wash.fillStyle(0xf4f9fb, 0.45);
    wash.fillRect(0, 0, WORLD_W, HORIZON_Y);
    // Snow caps: a soft white crest on the ground band's horizon line.
    wash.fillStyle(0xffffff, 0.8);
    for (let x = islandX.min; x < islandX.max; x += 260) wash.fillEllipse(x + 130, HORIZON_Y + 6, 300, 30);
    h.overlay = wash;
    for (const p of terrain.seams) {
      const k = p?.texture?.key;
      if (k === "prop-tree" || k === "prop-hedgeL" || k === "prop-hedgeR") p.setTint(0xdfe9ea);
      if (k === "prop-rocks") p.setTint(0xeef4f6);
    }
    for (const b of terrain.grass) b.setTint(0xcfe0d6);
  } else {
    // Summer: long light — a warmer sun and a few more butterflies handled
    // by ambient; here just the glow.
    if (terrain.sun) terrain.sun.setAlpha(0.9).setScale(2.6);
  }
  return h;
}

export function destroySeasonal(h) {
  h?.emitters.forEach((e) => e.destroy());
  h?.overlay?.destroy();
}

export { Phaser };
