import Phaser from "phaser";
import { REGIONS, HORIZON_Y, WORLD_H, depthScaleAt } from "../regions";
import { sfx } from "../worldAudio";
import { sparkle, DEPTH } from "./juice";
import { SUN, APRICOT, PEACH, MINT } from "./textures";
import { hitZone } from "./fixtures/common";

/**
 * Every tap answers back. Nothing here advances a quest; it exists because
 * kids tap everything, and a world that reacts feels alive:
 *   trees   — leaves fall, the canopy sways, sometimes a bird flies out
 *   water   — ripples spread and a frog plops in
 *   flowers — petals wobble and a butterfly lifts off
 *   rocks   — pebbles tumble
 */
const FLOWER_SPOTS = {
  meadow: [
    { x: 560, y: 1118 },
    { x: 1010, y: 1120 },
    { x: 1250, y: 1122 },
    { x: 1620, y: 1116 },
    { x: 330, y: 860 },
  ],
  pond: [
    { x: 560, y: 1122 },
    { x: 980, y: 1124 },
    { x: 1680, y: 1122 },
  ],
  woods: [
    { x: 260, y: 1118 },
    { x: 760, y: 1122 },
    { x: 1420, y: 1120 },
    { x: 1620, y: 1122 },
  ],
  cliffs: [
    { x: 320, y: 1122 },
    { x: 880, y: 1120 },
    { x: 1440, y: 1122 },
  ],
};
const FLOWER_COLORS = [SUN, APRICOT, PEACH, MINT, 0xffd166];

export function buildReactive(scene, terrain) {
  const handles = { flowers: [], zones: [] };

  // ------------------------------------------------------------- trees
  for (const prop of terrain.seams) {
    if (!prop || prop.texture?.key !== "prop-tree") continue;
    const w = prop.displayWidth;
    const h = prop.displayHeight;
    const cx = prop.x;
    const cy = prop.y - h * 0.68;
    const z = hitZone(scene, cx, cy, w * 0.8, h * 0.55, () => {
      scene.tweens.killTweensOf(prop);
      scene.tweens.add({ targets: prop, angle: 2.5, duration: 90, yoyo: true, repeat: 5, ease: "Sine.easeInOut", onComplete: () => prop.setAngle(0) });
      const region = REGIONS.find((r) => cx >= r.x0 - 200 && cx < r.x1 + 200);
      const autumn = region?.id === "woods";
      const e = scene.add.particles(cx, cy, "leaf", {
        x: { min: -w * 0.35, max: w * 0.35 },
        y: { min: -h * 0.2, max: h * 0.2 },
        speedY: { min: 30, max: 70 },
        speedX: { min: -30, max: 30 },
        rotate: { start: 0, end: 300 },
        scale: { start: 0.9, end: 0.6 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 1400, max: 2200 },
        tint: autumn ? [0xd98b3a, 0xe6b04a, 0xb86a2f] : [0x62b57a, 0x4f9f68, 0x8fd577],
        emitting: false,
      });
      e.setDepth(prop.depth + 1);
      e.explode(14);
      scene.time.delayedCall(2400, () => e.destroy());
      sfx.rustle();
      if (Math.random() < 0.35) flyOut(scene, cx, cy);
    });
    handles.zones.push(z);
  }

  // ------------------------------------------------------------ flowers
  for (const region of REGIONS) {
    for (const spot of FLOWER_SPOTS[region.id] ?? []) {
      handles.flowers.push(makeFlower(scene, region.x0 + spot.x, spot.y, FLOWER_COLORS[(spot.x + spot.y) % FLOWER_COLORS.length]));
    }
  }

  // -------------------------------------------------------------- rocks
  for (const prop of terrain.seams) {
    if (!prop || prop.texture?.key !== "prop-rocks") continue;
    const w = prop.displayWidth;
    const h = prop.displayHeight;
    const z = hitZone(scene, prop.x, prop.y - h * 0.45, w * 0.8, h * 0.8, () => {
      scene.tweens.add({ targets: prop, y: prop.y - 4, duration: 60, yoyo: true, repeat: 2 });
      const e = scene.add.particles(prop.x, prop.y - h * 0.5, "stone", {
        speed: { min: 40, max: 120 },
        angle: { min: 220, max: 320 },
        scale: { start: 0.3, end: 0.15 },
        alpha: { start: 1, end: 0 },
        gravityY: 500,
        lifespan: 900,
        emitting: false,
      });
      e.setDepth(prop.depth + 1);
      e.explode(6);
      scene.time.delayedCall(1000, () => e.destroy());
      sfx.thunk();
    });
    handles.zones.push(z);
  }

  return {
    handles,
    /** A tap on water: ripples and a frog. Called by the scene. */
    water(x, y) {
      ripple(scene, x, y);
      if (Math.random() < 0.6) frog(scene, x, y);
      sfx.plop();
    },
    destroy() {
      handles.zones.forEach((z) => z.destroy());
      handles.flowers.forEach((f) => f.destroy());
    },
  };
}

function flyOut(scene, x, y) {
  const key = "bird-barnSwallow";
  if (!scene.textures.exists(key)) return;
  const s = scene.add.image(x, y, key).setScale(0.09).setDepth(DEPTH.sky).setAlpha(0);
  const dir = Math.random() < 0.5 ? -1 : 1;
  s.setFlipX(dir < 0);
  scene.tweens.add({ targets: s, alpha: 1, duration: 150 });
  const p = { t: 0 };
  scene.tweens.add({
    targets: p,
    t: 1,
    duration: 2600,
    ease: "Sine.easeOut",
    onUpdate: () => {
      s.x = x + dir * 900 * p.t;
      s.y = y - 420 * p.t + Math.sin(p.t * Math.PI * 4) * 24;
    },
    onComplete: () => s.destroy(),
  });
  scene.tweens.add({ targets: s, scaleY: 0.06, duration: 110, yoyo: true, repeat: 12 });
  sfx.chirp(2);
}

function ripple(scene, x, y) {
  for (let i = 0; i < 3; i++) {
    const g = scene.add.graphics().setDepth(DEPTH.ground - 1);
    const r = { v: 6 + i * 4, a: 0.8 };
    const draw = () => {
      g.clear();
      g.lineStyle(2.5, 0xffffff, r.a);
      g.strokeEllipse(x, y, r.v * 2.2, r.v * 0.9);
    };
    draw();
    scene.tweens.add({ targets: r, v: 70 + i * 18, a: 0, duration: 1100 + i * 200, delay: i * 140, ease: "Sine.easeOut", onUpdate: draw, onComplete: () => g.destroy() });
  }
}

function frog(scene, x, y) {
  const c = scene.add.container(x - 90, y - 6).setDepth(y + 1);
  const body = scene.add.ellipse(0, 0, 30, 18, 0x4f9f68, 1);
  const eye1 = scene.add.ellipse(-8, -9, 9, 9, 0xfffbeb, 1);
  const eye2 = scene.add.ellipse(6, -9, 9, 9, 0xfffbeb, 1);
  const pup1 = scene.add.ellipse(-7, -9, 4, 4, 0x14231f, 1);
  const pup2 = scene.add.ellipse(7, -9, 4, 4, 0x14231f, 1);
  c.add([body, eye1, eye2, pup1, pup2]);
  c.setScale(depthScaleAt(y) * 0.9).setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 120 });
  const p = { t: 0 };
  scene.tweens.add({
    targets: p,
    t: 1,
    duration: 620,
    delay: 120,
    ease: "Sine.easeIn",
    onUpdate: () => {
      c.x = x - 90 + 90 * p.t;
      c.y = y - 6 - Math.sin(p.t * Math.PI) * 70;
      c.setAngle(-20 + 50 * p.t);
    },
    onComplete: () => {
      sparkle(scene, x, y, { count: 10, tint: 0xe8f7ff, radius: 34 });
      ripple(scene, x, y);
      scene.tweens.add({ targets: c, alpha: 0, scaleY: 0.2, duration: 160, onComplete: () => c.destroy() });
    },
  });
}

function makeFlower(scene, x, y, color) {
  const ds = depthScaleAt(y);
  const c = scene.add.container(x, y).setDepth(y);
  const g = scene.add.graphics();
  g.lineStyle(4 * ds, 0x4f9f68, 1);
  g.lineBetween(0, 0, 0, -34 * ds);
  g.fillStyle(0x62b57a, 1);
  g.fillEllipse(-9 * ds, -16 * ds, 16 * ds, 8 * ds);
  const head = scene.add.container(0, -36 * ds);
  const petals = scene.add.graphics();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    petals.fillStyle(color, 1);
    petals.fillEllipse(Math.cos(a) * 9 * ds, Math.sin(a) * 9 * ds, 12 * ds, 8 * ds);
  }
  petals.fillStyle(0xfff1c2, 1);
  petals.fillCircle(0, 0, 5 * ds);
  head.add(petals);
  c.add([g, head]);
  // Slow sway with the grass.
  scene.tweens.add({ targets: head, angle: 8, duration: 1600 + Math.random() * 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

  const zone = hitZone(scene, x, y - 30 * ds, 60, 70, () => {
    scene.tweens.add({ targets: head, scale: 1.3, duration: 120, yoyo: true, ease: "Quad.easeOut" });
    sfx.pop(9 + Math.floor(Math.random() * 4));
    sparkle(scene, x, y - 36 * ds, { count: 6, tint: 0xfff3d6, radius: 20 });
    // A butterfly lifts off and wanders away.
    const b = scene.add.container(x, y - 40 * ds).setDepth(DEPTH.ground - 2);
    const l = scene.add.image(-2, 0, "wing").setOrigin(1, 0.5).setTint(color).setFlipX(true);
    const r = scene.add.image(2, 0, "wing").setOrigin(0, 0.5).setTint(color);
    b.add([l, r, scene.add.ellipse(0, 0, 4, 12, 0x14231f, 0.8)]);
    b.setScale(0.7);
    scene.tweens.add({ targets: [l, r], scaleX: 0.25, duration: 100, yoyo: true, repeat: -1 });
    const p = { t: 0 };
    const dir = Math.random() < 0.5 ? -1 : 1;
    scene.tweens.add({
      targets: p,
      t: 1,
      duration: 3800,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        b.x = x + dir * 260 * p.t + Math.sin(p.t * 9) * 30;
        b.y = y - 40 * ds - 260 * p.t + Math.sin(p.t * 14) * 16;
        b.setAlpha(1 - Math.max(0, p.t - 0.7) / 0.3);
      },
      onComplete: () => b.destroy(),
    });
  });
  return {
    destroy() {
      zone.destroy();
      c.destroy();
    },
  };
}

export { Phaser, HORIZON_Y, WORLD_H };
