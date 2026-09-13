import { depthScaleAt } from "../../regions";
import { birdSize } from "../../worldArt";
import { sfx } from "../../worldAudio";
import { countPop, sparkle, hearts, pulseRing } from "../juice";
import { toWorld, standProp, hitZone } from "./common";

/**
 * The scatter hunt: chicks peeking out from behind tufts and rocks around
 * the region. Counting them is tapping each one; found chicks pop up with a
 * heart. Once the quest is done they gather by their parent for good.
 */
export function buildChicks(scene, zone, region, { found = false } = {}) {
  const o = zone.objects.chicks;
  const key = `bird-${o.bird}`;
  const { h } = birdSize(o.bird);
  const home = zone.npcs.find((n) => n.id === o.homeNpcId);
  const homeW = home ? toWorld(region, home) : null;

  const chicks = o.spots.map((s, i) => {
    const p = toWorld(region, s);
    const ds = depthScaleAt(p.y);
    const scale = (o.size / h) * ds;
    const sprite = scene.add.image(p.x, p.y, key).setOrigin(0.5, 1).setScale(scale).setDepth(p.y).setFlipX(i % 2 === 1);
    // A hiding spot in front: reeds or a small rock, alternating.
    const cover = standProp(scene, i % 3 === 2 ? "rocks" : "reeds", p.x + (i % 2 ? 26 : -26), p.y + 4, i % 3 === 2 ? 70 : 90, { depth: p.y + 1 });
    // Peek: bob up and down behind the cover.
    const peek = scene.tweens.add({
      targets: sprite,
      y: p.y + 10,
      duration: 900 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 1200,
      ease: "Sine.easeInOut",
    });
    return { sprite, cover, peek, x: p.x, y: p.y, scale, tapped: false };
  });

  const gather = (instant) => {
    if (!homeW) return;
    chicks.forEach((c, i) => {
      c.peek.stop();
      const gx = homeW.x + (i - (chicks.length - 1) / 2) * 34 - 40;
      const gy = homeW.y + 8 + (i % 2) * 10;
      const ds = depthScaleAt(gy);
      if (instant) {
        c.sprite.setPosition(gx, gy).setScale((o.size / h) * ds).setDepth(gy).setFlipX(false);
        return;
      }
      const sx = c.sprite.x;
      const sy = c.sprite.y;
      const p = { t: 0 };
      scene.tweens.add({
        targets: p,
        t: 1,
        duration: 1200 + Math.hypot(gx - sx, gy - sy) * 0.8,
        delay: i * 140,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          c.sprite.x = sx + (gx - sx) * p.t;
          const feet = sy + (gy - sy) * p.t;
          c.sprite.y = feet - Math.abs(Math.sin(p.t * Math.PI * 4)) * 14;
          c.sprite.setDepth(feet).setScale((o.size / h) * depthScaleAt(feet)).setFlipX(gx < sx);
        },
        onComplete: () => {
          c.sprite.y = gy;
          hearts(scene, gx, gy - 40, 1);
        },
      });
    });
  };
  if (found) gather(true);

  const handle = {
    anchor: homeW ? { x: homeW.x - 60, y: homeW.y + 40 } : { x: chicks[0].x, y: chicks[0].y },
    fixture: o.fixture,
    label: o.label,
    zones: [],
    rings: [],
    clear() {
      this.zones.forEach((z) => z.destroy());
      this.rings.forEach((r) => r.destroy());
      this.zones = [];
      this.rings = [];
    },
    armCounting(onCount, onDone) {
      this.clear();
      let n = 0;
      for (const c of chicks) {
        c.tapped = false;
        const ring = pulseRing(scene, c.x, c.y - 30, 40, 0xfffbeb);
        this.rings.push(ring);
        const z = hitZone(scene, c.x, c.y - 30, 90, 90, () => {
          if (c.tapped) return;
          c.tapped = true;
          n += 1;
          ring.destroy();
          c.peek.pause();
          scene.tweens.add({ targets: c.sprite, y: c.y - 26, duration: 160, yoyo: true, ease: "Quad.easeOut", onComplete: () => c.peek.resume() });
          sfx.pop(n);
          sfx.chirp(n);
          countPop(scene, c.x, c.y - 90, n);
          hearts(scene, c.x, c.y - 60, 1);
          sparkle(scene, c.x, c.y - 30, { count: 6, tint: 0xfff3d6, radius: 22 });
          onCount?.(n);
          if (n === chicks.length) scene.time.delayedCall(400, () => onDone?.());
        });
        this.zones.push(z);
      }
    },
    complete(instant = false) {
      this.clear();
      gather(instant);
    },
  };
  return handle;
}
