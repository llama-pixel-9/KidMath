import Phaser from "phaser";
import { SUN, INK } from "./textures";

/**
 * "Juice": the small, cheap effects that make a tap feel like something
 * happened — dust on landing, sparkles on a placed thing, a diamond burst
 * when stars are earned, a number that pops up while counting.
 */
export const DEPTH = {
  farSky: -50,
  backdrop: -20,
  farClouds: -15,
  horizonProps: 700,
  ground: 800, // ground objects use their y (810..1130) as depth
  foreground: 1400,
  fx: 2000,
  mist: 4000,
  sky: 4500, // swallows and sky birds render over the mist
  overlay: 9000,
};

export function dust(scene, x, y, { count = 10, tint = 0xfdf5dc, spread = 60 } = {}) {
  const e = scene.add.particles(x, y, "puff", {
    speed: { min: 20, max: spread },
    angle: { min: 200, max: 340 },
    scale: { start: 0.35, end: 0 },
    alpha: { start: 0.7, end: 0 },
    lifespan: { min: 300, max: 520 },
    gravityY: 60,
    tint,
    emitting: false,
  });
  e.setDepth(DEPTH.fx);
  e.explode(count);
  scene.time.delayedCall(700, () => e.destroy());
}

export function sparkle(scene, x, y, { count = 12, tint = 0xffffff, radius = 40 } = {}) {
  const e = scene.add.particles(x, y, "sparkle", {
    speed: { min: 30, max: radius * 3 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.9, end: 0 },
    alpha: { start: 1, end: 0 },
    rotate: { min: 0, max: 180 },
    lifespan: { min: 350, max: 700 },
    tint,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  e.setDepth(DEPTH.fx);
  e.explode(count);
  scene.time.delayedCall(900, () => e.destroy());
}

/** Sun diamonds burst out, hang, then stream to the top-right pocket. */
export function starBurst(scene, x, y, count = 3) {
  const cam = scene.cameras.main;
  const diamonds = [];
  for (let i = 0; i < count; i++) {
    const d = scene.add.image(x, y, "diamond").setDepth(DEPTH.fx + 5).setScale(0.2);
    diamonds.push(d);
    const ang = -90 + (i - (count - 1) / 2) * (110 / Math.max(1, count - 1) || 0);
    const rad = Phaser.Math.DegToRad(ang);
    const dist = 90 + Math.random() * 40;
    scene.tweens.add({
      targets: d,
      x: x + Math.cos(rad) * dist,
      y: y + Math.sin(rad) * dist,
      scale: 1.1,
      angle: 360,
      duration: 420,
      ease: "Back.easeOut",
      delay: i * 40,
      onComplete: () => {
        // Fly to the pocket: the top-right of the current view.
        const view = cam.worldView;
        scene.tweens.add({
          targets: d,
          x: view.right - 70,
          y: view.top + 40,
          scale: 0.35,
          duration: 520,
          ease: "Cubic.easeIn",
          delay: 380 + i * 60,
          onComplete: () => {
            d.destroy();
            scene.game.events.emit("star-pocket");
          },
        });
      },
    });
  }
  sparkle(scene, x, y, { count: 10, tint: 0xffe7c2 });
}

export function hearts(scene, x, y, count = 3) {
  for (let i = 0; i < count; i++) {
    const h = scene.add.image(x + (i - 1) * 16, y, "heart").setDepth(DEPTH.fx).setScale(0.4).setAlpha(0.95);
    scene.tweens.add({
      targets: h,
      y: y - 90 - i * 12,
      x: h.x + (Math.random() - 0.5) * 30,
      scale: 0.9,
      alpha: 0,
      duration: 1100,
      delay: i * 120,
      ease: "Sine.easeOut",
      onComplete: () => h.destroy(),
    });
  }
}

/** A count number pops up and floats away — the running tally while counting. */
export function countPop(scene, x, y, n, { color = "#14231f", size = 40 } = {}) {
  const t = scene.add
    .text(x, y, String(n), {
      fontFamily: "Fredoka, system-ui, sans-serif",
      fontSize: `${size}px`,
      fontStyle: "600",
      color,
      stroke: "#fffbeb",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.fx + 10)
    .setScale(0.3);
  scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: "Back.easeOut" });
  scene.tweens.add({
    targets: t,
    y: y - 70,
    alpha: 0,
    duration: 900,
    delay: 350,
    ease: "Sine.easeIn",
    onComplete: () => t.destroy(),
  });
  return t;
}

/** Squash-and-stretch on a sprite around its feet (origin must be bottom). */
export function squash(scene, sprite, baseScale, { amount = 0.16, duration = 110 } = {}) {
  scene.tweens.add({
    targets: sprite,
    scaleX: baseScale * (1 + amount),
    scaleY: baseScale * (1 - amount),
    duration,
    yoyo: true,
    ease: "Quad.easeOut",
  });
}

export function stretch(scene, sprite, baseScale, { amount = 0.12, duration = 100 } = {}) {
  scene.tweens.add({
    targets: sprite,
    scaleX: baseScale * (1 - amount),
    scaleY: baseScale * (1 + amount),
    duration,
    yoyo: true,
    ease: "Quad.easeOut",
  });
}

/** A ring pulse — "look here" — around a tappable target. */
export function pulseRing(scene, x, y, radius = 40, color = SUN) {
  const g = scene.add.graphics().setDepth(DEPTH.fx - 1);
  const ring = { r: radius * 0.6, a: 0.9 };
  const draw = () => {
    g.clear();
    g.lineStyle(4, color, ring.a);
    g.strokeCircle(x, y, ring.r);
  };
  draw();
  const tw = scene.tweens.add({
    targets: ring,
    r: radius * 1.4,
    a: 0,
    duration: 1100,
    repeat: -1,
    ease: "Sine.easeOut",
    onUpdate: draw,
  });
  return {
    destroy() {
      tw.stop();
      g.destroy();
    },
  };
}

/** Exclamation sign floating over an NPC with a quest to offer. */
export function questMarker(scene, x, y) {
  const c = scene.add.container(x, y).setDepth(DEPTH.fx - 2);
  const bg = scene.add.graphics();
  bg.fillStyle(0xfffbeb, 1);
  bg.lineStyle(3, INK, 1);
  bg.fillRoundedRect(-18, -22, 36, 44, 10);
  bg.strokeRoundedRect(-18, -22, 36, 44, 10);
  const mark = scene.add
    .text(0, -1, "!", { fontFamily: "Fredoka, system-ui, sans-serif", fontSize: "34px", fontStyle: "600", color: "#f26b3a" })
    .setOrigin(0.5);
  c.add([bg, mark]);
  c.setScale(0.9);
  scene.tweens.add({ targets: c, y: y - 10, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  return c;
}
