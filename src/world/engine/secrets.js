import Phaser from "phaser";
import { REGIONS, SEA_LEFT_W, depthScaleAt } from "../regions";
import { birdSize } from "../worldArt";
import { sfx } from "../worldAudio";
import { sparkle, starBurst, hearts, DEPTH } from "./juice";
import { hitZone } from "./fixtures/common";

/**
 * Secrets in plain sight (Zelda's reward loop is noticing). A few spots per
 * region do something only if you keep at them: the hollow in the shore
 * tree, one lily pad, a knot in a woods trunk, a crack in the cliff rocks,
 * and all five meadow flowers tapped in a row. Each tap nudges back so the
 * kid knows something is there; the third opens it. Found once, it pays
 * stars; after that it just replays for fun.
 */
const SECRETS = [
  { id: "hollowOwl", region: "meadow", x: SEA_LEFT_W + 50 - 10, y: 818, w: 70, h: 80, taps: 3, reveal: "owl", absolute: true },
  { id: "flowerRing", region: "meadow", taps: 5, reveal: "swarm", trigger: "flowers" },
  { id: "lilyFlip", region: "pond", x: 1180, y: 1005, w: 120, h: 50, taps: 3, reveal: "frogs" },
  { id: "knockKnock", region: "woods", x: 1978, y: 760, w: 70, h: 130, taps: 3, reveal: "acorn" },
  { id: "cliffCrack", region: "cliffs", x: 150, y: 990, w: 70, h: 90, taps: 3, reveal: "kestrel" },
];

export const SECRET_COUNT = SECRETS.length;

export function buildSecrets(scene, foundIds, onFound) {
  const state = new Map();
  const handles = [];

  const nudge = (x, y, n, total) => {
    sfx.pop(4 + n);
    sparkle(scene, x, y, { count: 4 + n * 2, tint: 0xfff3d6, radius: 14 + n * 6 });
    if (n >= total - 1) return;
    // A little "keep going" ring that grows with each tap.
    const g = scene.add.graphics().setDepth(DEPTH.fx);
    const r = { v: 10, a: 0.9 };
    scene.tweens.add({
      targets: r,
      v: 30 + n * 10,
      a: 0,
      duration: 500,
      onUpdate: () => {
        g.clear();
        g.lineStyle(3, 0xfffbeb, r.a);
        g.strokeCircle(x, y, r.v);
      },
      onComplete: () => g.destroy(),
    });
  };

  const complete = (secret, x, y) => {
    const first = !foundIds.includes(secret.id);
    REVEALS[secret.reveal]?.(scene, x, y, secret);
    if (first) {
      foundIds.push(secret.id);
      scene.time.delayedCall(900, () => {
        starBurst(scene, x, y - 40, 2);
        sfx.stars(2);
      });
      onFound?.(secret.id);
    }
  };

  for (const secret of SECRETS) {
    const region = REGIONS.find((r) => r.id === secret.region);
    if (!region) continue;
    if (secret.trigger === "flowers") {
      // Counted from the reactive layer: five distinct flowers within 25s.
      const seen = new Set();
      let since = 0;
      const onFlower = ({ regionId, key }) => {
        if (regionId !== secret.region) return;
        const now = scene.time.now;
        if (now - since > 25000) seen.clear();
        since = now;
        seen.add(key);
        if (seen.size >= secret.taps) {
          seen.clear();
          complete(secret, scene.avatar?.x ?? region.x0 + 1000, (scene.avatar?.y ?? 1000) - 60);
        }
      };
      scene.events.on("flower-tap", onFlower);
      handles.push({ destroy: () => scene.events.off("flower-tap", onFlower) });
      continue;
    }
    const x = secret.absolute ? secret.x : region.x0 + secret.x;
    const y = secret.y;
    state.set(secret.id, 0);
    const z = hitZone(scene, x, y, secret.w, secret.h, () => {
      const n = state.get(secret.id) + 1;
      if (n < secret.taps) {
        state.set(secret.id, n);
        nudge(x, y, n, secret.taps);
        return;
      }
      state.set(secret.id, 0);
      complete(secret, x, y);
    });
    handles.push(z);
  }

  return {
    destroy() {
      handles.forEach((h) => h.destroy());
    },
  };
}

// ------------------------------------------------------------------ reveals

const REVEALS = {
  owl(scene, x, y) {
    const key = "bird-barnOwl";
    if (!scene.textures.exists(key)) return;
    const { h } = birdSize("barnOwl");
    const owl = scene.add.image(x, y + 30, key).setOrigin(0.5, 1).setScale((70 / h) * 0.2).setDepth(871);
    scene.tweens.add({ targets: owl, scale: 70 / h, duration: 380, ease: "Back.easeOut" });
    sfx.chirp(1);
    [500, 900].forEach((d) => scene.time.delayedCall(d, () => owl.setFlipX(!owl.flipX)));
    scene.time.delayedCall(1300, () => {
      sfx.chirp(1);
      hearts(scene, x, y - 30, 2);
    });
    scene.time.delayedCall(3200, () => scene.tweens.add({ targets: owl, scale: 0.01, duration: 300, ease: "Back.easeIn", onComplete: () => owl.destroy() }));
  },
  swarm(scene, x, y) {
    const colors = [0xf26b3a, 0xfbc7a8, 0x4fd1bc, 0xffd166, 0xffb088];
    for (let i = 0; i < 9; i++) {
      const c = scene.add.container(x + (Math.random() - 0.5) * 80, y + 40).setDepth(DEPTH.fx);
      const col = colors[i % colors.length];
      const l = scene.add.image(-2, 0, "wing").setOrigin(1, 0.5).setTint(col).setFlipX(true);
      const r = scene.add.image(2, 0, "wing").setOrigin(0, 0.5).setTint(col);
      c.add([l, r, scene.add.ellipse(0, 0, 4, 12, 0x14231f, 0.8)]);
      c.setScale(0.6 + Math.random() * 0.4);
      scene.tweens.add({ targets: [l, r], scaleX: 0.25, duration: 90 + Math.random() * 40, yoyo: true, repeat: -1 });
      const p = { t: 0 };
      const dir = i % 2 ? -1 : 1;
      scene.tweens.add({
        targets: p,
        t: 1,
        duration: 3200 + Math.random() * 1500,
        delay: i * 90,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          c.x = x + dir * (60 + i * 30) * p.t + Math.sin(p.t * 10 + i) * 40;
          c.y = y + 40 - (220 + i * 20) * p.t + Math.sin(p.t * 13 + i) * 20;
          c.setAlpha(1 - Math.max(0, p.t - 0.75) / 0.25);
        },
        onComplete: () => c.destroy(),
      });
    }
    sfx.bloom();
  },
  frogs(scene, x, y) {
    // The pad flips...
    const pad = scene.add.ellipse(x, y, 120, 44, 0x62b57a, 1).setDepth(y - 1);
    scene.tweens.add({ targets: pad, scaleY: -1, duration: 420, yoyo: true, ease: "Sine.easeInOut", onComplete: () => pad.destroy() });
    sfx.plop();
    // ...and three frogs leap out one after another.
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(300 + i * 260, () => {
        const c = scene.add.container(x, y - 6).setDepth(y + 1);
        c.add([scene.add.ellipse(0, 0, 26, 16, 0x4f9f68, 1), scene.add.ellipse(-7, -8, 8, 8, 0xfffbeb, 1), scene.add.ellipse(6, -8, 8, 8, 0xfffbeb, 1), scene.add.ellipse(-6, -8, 3, 3, 0x14231f, 1), scene.add.ellipse(7, -8, 3, 3, 0x14231f, 1)]);
        c.setScale(depthScaleAt(y) * 0.9);
        const dir = i === 1 ? 0 : i === 0 ? -1 : 1;
        const p = { t: 0 };
        scene.tweens.add({
          targets: p,
          t: 1,
          duration: 700,
          ease: "Sine.easeIn",
          onUpdate: () => {
            c.x = x + dir * 110 * p.t;
            c.y = y - 6 - Math.sin(p.t * Math.PI) * (90 + i * 20);
            c.setAngle(dir * 30 * p.t);
          },
          onComplete: () => {
            sparkle(scene, c.x, y, { count: 8, tint: 0xe8f7ff, radius: 26 });
            sfx.plop();
            c.destroy();
          },
        });
        sfx.chirp(4 + i);
      });
    }
  },
  acorn(scene, x, y) {
    sfx.peck(7);
    const a = scene.add.image(x, y - 40, "acorn").setScale(0.3).setDepth(DEPTH.fx).setAlpha(0);
    scene.tweens.add({ targets: a, alpha: 1, scale: 2.4, duration: 260, delay: 500, ease: "Back.easeOut" });
    scene.tweens.add({
      targets: a,
      y: 1040,
      duration: 700,
      delay: 780,
      ease: "Bounce.easeOut",
      onComplete: () => {
        sfx.thunk();
        sparkle(scene, a.x, 1040, { count: 10, tint: 0xfff3d6, radius: 30 });
        scene.time.delayedCall(2000, () => scene.tweens.add({ targets: a, alpha: 0, duration: 400, onComplete: () => a.destroy() }));
      },
    });
  },
  kestrel(scene, x, y) {
    const key = "bird-kestrel";
    if (!scene.textures.exists(key)) return;
    const e = scene.add.particles(x, y, "stone", { speed: { min: 40, max: 140 }, angle: { min: 220, max: 320 }, scale: { start: 0.35, end: 0.1 }, gravityY: 500, lifespan: 900, emitting: false });
    e.setDepth(DEPTH.fx);
    e.explode(8);
    scene.time.delayedCall(1000, () => e.destroy());
    sfx.thunk();
    const { h } = birdSize("kestrel");
    const k = scene.add.image(x - 700, y - 700, key).setScale(90 / h).setDepth(DEPTH.sky);
    const p = { t: 0 };
    scene.tweens.add({
      targets: p,
      t: 1,
      duration: 2200,
      delay: 300,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        k.x = x - 700 + 1500 * p.t;
        k.y = y - 700 + Math.sin(p.t * Math.PI) * 620;
        k.setAngle(Math.cos(p.t * Math.PI) * -25);
      },
      onComplete: () => k.destroy(),
    });
    scene.tweens.add({ targets: k, scaleY: k.scaleY * 0.7, duration: 110, yoyo: true, repeat: 12, delay: 300 });
    scene.time.delayedCall(1100, () => sfx.chirp(2));
  },
};

export { Phaser };
