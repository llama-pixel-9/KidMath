import Phaser from "phaser";
import { REGIONS, HORIZON_Y, WORLD_W, WORLD_H, SEA_LEFT_W, GROUND_TOP } from "../regions";
import { birdSize } from "../worldArt";
import { DEPTH } from "./juice";

/**
 * The living layer: butterflies in the meadow, dragonflies and water
 * sparkle at the pond, drifting leaves in the woods, swallows crossing the
 * sky everywhere, dandelion seeds on the breeze, and the time of day —
 * a dusk glow or night with stars and fireflies. Cheap by design: a few
 * dozen sprites, no per-frame allocation.
 */
export function buildAmbient(scene, { mode = "day" } = {}) {
  const h = { critters: [], swallows: [], emitters: [], overlay: null, stars: [], fireflies: null, mode };

  const region = (id) => REGIONS.find((r) => r.id === id);

  // ---------------------------------------------------------- butterflies
  const meadow = region("meadow");
  const colors = [0xf26b3a, 0xfbc7a8, 0x4fd1bc, 0xffd166];
  for (let i = 0; i < 5; i++) {
    h.critters.push(makeButterfly(scene, meadow.x0 + 200 + Math.random() * 1600, 860 + Math.random() * 200, colors[i % colors.length]));
  }
  // ---------------------------------------------------------- dragonflies
  const pond = region("pond");
  for (let i = 0; i < 3; i++) {
    h.critters.push(makeDragonfly(scene, pond.x0 + 300 + Math.random() * 1400, 830 + Math.random() * 180));
  }
  // Water sparkle on the pond.
  const sparkle = scene.add.particles(0, 0, "sparkle", {
    x: { min: pond.x0 + 40, max: pond.x1 - 40 },
    y: { min: 830, max: 1070 },
    scale: { start: 0, end: 0.45 },
    alpha: { start: 0, end: 0.85 },
    lifespan: 1400,
    frequency: 140,
    quantity: 1,
    blendMode: Phaser.BlendModes.ADD,
  });
  sparkle.setDepth(DEPTH.ground - 2);
  h.emitters.push(sparkle);

  // ----------------------------------------------------------- leaves
  const woods = region("woods");
  const leaves = scene.add.particles(0, 0, "leaf", {
    x: { min: woods.x0, max: woods.x1 },
    y: { min: 500, max: 700 },
    speedY: { min: 18, max: 40 },
    speedX: { min: -25, max: 25 },
    rotate: { start: 0, end: 360 },
    scale: { start: 0.9, end: 0.7 },
    alpha: { start: 0, end: 1, ease: "Quad.easeOut" },
    lifespan: 9000,
    frequency: 700,
    quantity: 1,
    tint: [0xd98b3a, 0xe6b04a, 0xb86a2f],
  });
  leaves.setDepth(DEPTH.ground - 3);
  h.emitters.push(leaves);

  // ----------------------------------------------------- dandelion seeds
  const seeds = scene.add.particles(0, 0, "puff", {
    x: { min: meadow.x0, max: meadow.x1 },
    y: { min: 900, max: 1120 },
    speedY: { min: -22, max: -8 },
    speedX: { min: 6, max: 26 },
    scale: { start: 0.14, end: 0.05 },
    alpha: { start: 0, end: 0.8, ease: "Sine.easeOut" },
    lifespan: 7000,
    frequency: 900,
    quantity: 1,
  });
  seeds.setDepth(DEPTH.ground - 3);
  h.emitters.push(seeds);

  // ------------------------------------------------------------ swallows
  const swallowTimer = scene.time.addEvent({
    delay: 9000,
    loop: true,
    callback: () => {
      if (Math.random() < 0.7) launchSwallow(scene, h);
    },
  });
  h.swallowTimer = swallowTimer;
  scene.time.delayedCall(2500, () => launchSwallow(scene, h));

  // ------------------------------------------------------- time of day
  applyTimeOfDay(scene, h, mode);

  return h;
}

function makeButterfly(scene, x, y, color) {
  const c = scene.add.container(x, y).setDepth(DEPTH.ground - 2);
  const l = scene.add.image(-2, 0, "wing").setOrigin(1, 0.5).setTint(color).setFlipX(true);
  const r = scene.add.image(2, 0, "wing").setOrigin(0, 0.5).setTint(color);
  const body = scene.add.ellipse(0, 0, 4, 12, 0x14231f, 0.8);
  c.add([l, r, body]);
  c.setScale(0.75 + Math.random() * 0.4);
  scene.tweens.add({ targets: [l, r], scaleX: 0.25, duration: 110 + Math.random() * 60, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  return { obj: c, kind: "butterfly", ox: x, oy: y, phase: Math.random() * 10, speed: 0.4 + Math.random() * 0.3, amp: 60 + Math.random() * 80 };
}

function makeDragonfly(scene, x, y) {
  const c = scene.add.container(x, y).setDepth(DEPTH.ground - 2);
  const body = scene.add.rectangle(0, 0, 26, 4, 0x2f8fa8, 1);
  const w1 = scene.add.ellipse(-4, -4, 18, 6, 0xffffff, 0.55);
  const w2 = scene.add.ellipse(4, -4, 18, 6, 0xffffff, 0.55);
  c.add([w1, w2, body]);
  scene.tweens.add({ targets: [w1, w2], scaleY: 0.2, duration: 45, yoyo: true, repeat: -1 });
  return { obj: c, kind: "dragonfly", ox: x, oy: y, phase: Math.random() * 10, speed: 1.2 + Math.random(), amp: 120 + Math.random() * 120, dart: 0 };
}

function launchSwallow(scene, h) {
  const key = "bird-barnSwallow";
  if (!scene.textures.exists(key)) return;
  const cam = scene.cameras.main;
  const view = cam.worldView;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const startX = dir > 0 ? view.left - 200 : view.right + 200;
  const endX = dir > 0 ? view.right + 300 : view.left - 300;
  const y0 = 140 + Math.random() * 380;
  const { h: sh } = birdSize("barnSwallow");
  const s = scene.add.image(startX, y0, key).setScale((44 + Math.random() * 20) / sh).setDepth(DEPTH.sky).setFlipX(dir < 0).setScrollFactor(0.75, 0.9).setAlpha(0.9);
  const p = { t: 0 };
  const swoop = 60 + Math.random() * 90;
  scene.tweens.add({
    targets: p,
    t: 1,
    duration: 5000 + Math.random() * 2500,
    ease: "Linear",
    onUpdate: () => {
      s.x = startX + (endX - startX) * p.t;
      s.y = y0 + Math.sin(p.t * Math.PI * 2.3) * swoop;
      s.setAngle(dir * Math.cos(p.t * Math.PI * 2.3) * -14);
    },
    onComplete: () => s.destroy(),
  });
  // Wing flicker: swap the sprite's vertical scale for a flap read.
  scene.tweens.add({ targets: s, scaleY: s.scaleY * 0.65, duration: 120, yoyo: true, repeat: 30, ease: "Sine.easeInOut" });
  h.swallows.push(s);
}

function applyTimeOfDay(scene, h, mode) {
  if (mode === "day") return;
  const overlay = scene.add.graphics().setDepth(DEPTH.overlay).setScrollFactor(0);
  const w = 8000;
  const hh = 6000;
  if (mode === "dusk") {
    overlay.fillStyle(0xf26b3a, 0.13);
    overlay.fillRect(-1000, -1000, w, hh);
    overlay.fillStyle(0x10221e, 0.12);
    overlay.fillRect(-1000, -1000, w, hh);
  } else {
    overlay.fillStyle(0x0d2a34, 0.3);
    overlay.fillRect(-1000, -1000, w, hh);
  }
  h.overlay = overlay;
  if (mode === "night") {
    // A moon, low and warm, drifting slowly against the sky.
    const moon = scene.add.image(SEA_LEFT_W + 1500, 170, "puff").setScale(2.2).setTint(0xfff3d0).setAlpha(0.95).setDepth(DEPTH.overlay + 1).setScrollFactor(0.15, 0.3);
    const halo = scene.add.image(moon.x, moon.y, "sunglow").setScale(1.6).setTint(0xdde9ff).setAlpha(0.35).setDepth(DEPTH.overlay).setScrollFactor(0.15, 0.3).setBlendMode(Phaser.BlendModes.ADD);
    h.stars.push(moon, halo);
  }

  if (mode === "night") {
    // Stars in the sky band; a few twinkle.
    for (let i = 0; i < 90; i++) {
      const s = scene.add
        .image(Math.random() * WORLD_W, 30 + Math.random() * (HORIZON_Y - 120), "dot")
        .setScale(0.12 + Math.random() * 0.2)
        .setAlpha(0.5 + Math.random() * 0.5)
        .setDepth(DEPTH.overlay + 1)
        .setScrollFactor(0.5, 0.8);
      if (Math.random() < 0.4) {
        scene.tweens.add({ targets: s, alpha: 0.15, duration: 900 + Math.random() * 1500, yoyo: true, repeat: -1, delay: Math.random() * 2000 });
      }
      h.stars.push(s);
    }
    // Fireflies over the meadow and woods.
    for (const id of ["meadow", "woods"]) {
      const r = REGIONS.find((x) => x.id === id);
      const ff = scene.add.particles(0, 0, "puff", {
        x: { min: r.x0 + 50, max: r.x1 - 50 },
        y: { min: GROUND_TOP, max: WORLD_H - 60 },
        speedX: { min: -12, max: 12 },
        speedY: { min: -14, max: 6 },
        scale: { start: 0.08, end: 0.22 },
        alpha: { start: 0, end: 0.9, ease: "Sine.easeInOut" },
        lifespan: { min: 2500, max: 4500 },
        frequency: 220,
        quantity: 1,
        tint: 0xfff29a,
        blendMode: Phaser.BlendModes.ADD,
      });
      ff.setDepth(DEPTH.overlay + 2);
      h.emitters.push(ff);
    }
  }
}

/** Per-frame drift for the critters (no tweens: one sin per critter). */
export function updateAmbient(h, time) {
  const t = time / 1000;
  for (const c of h.critters) {
    if (c.kind === "butterfly") {
      c.obj.x = c.ox + Math.sin(t * c.speed + c.phase) * c.amp;
      c.obj.y = c.oy + Math.sin(t * c.speed * 2.3 + c.phase) * 22 + Math.cos(t * 0.7 + c.phase) * 14;
      c.obj.setAngle(Math.cos(t * c.speed + c.phase) * 18);
      c.obj.scaleX = Math.abs(c.obj.scaleX) * (Math.cos(t * c.speed + c.phase) >= 0 ? 1 : -1);
    } else if (c.kind === "dragonfly") {
      // Darts: mostly still, then a quick zip.
      const phase = (t * c.speed + c.phase) % 4;
      const zip = phase < 0.6 ? phase / 0.6 : 1;
      const seg = Math.floor((t * c.speed + c.phase) / 4);
      const prng = (n) => ((Math.sin(n * 12.9898 + c.phase) * 43758.5453) % 1 + 1) % 1;
      const fromX = c.ox + (prng(seg) - 0.5) * c.amp;
      const toX = c.ox + (prng(seg + 1) - 0.5) * c.amp;
      const fromY = c.oy + (prng(seg + 7) - 0.5) * 60;
      const toY = c.oy + (prng(seg + 8) - 0.5) * 60;
      const e = zip < 0.5 ? 2 * zip * zip : 1 - Math.pow(-2 * zip + 2, 2) / 2;
      c.obj.x = fromX + (toX - fromX) * e;
      c.obj.y = fromY + (toY - fromY) * e + Math.sin(t * 9) * 2;
      c.obj.scaleX = toX >= fromX ? 1 : -1;
    }
  }
}

export function destroyAmbient(h) {
  h.swallowTimer?.remove();
  for (const c of h.critters) c.obj.destroy();
  for (const e of h.emitters) e.destroy();
  for (const s of h.stars) s.destroy();
  h.overlay?.destroy();
}

export { SEA_LEFT_W };
