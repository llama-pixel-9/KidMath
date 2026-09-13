import { depthScaleAt } from "../../regions";
import { sfx } from "../../worldAudio";
import { countPop, sparkle, pulseRing } from "../juice";
import { toWorld, standProp, hitZone, wobble } from "./common";

/**
 * Grouped containers: N nests, each holding `eggsPer` eggs. Placing means
 * tapping a nest with room; a full nest wobbles politely instead.
 */
export function buildNests(scene, zone, region) {
  const o = zone.objects.nests;
  const spots = o.spots.map((s) => toWorld(region, s));
  const nests = spots.map((s) => {
    const prop = standProp(scene, o.prop, s.x, s.y, o.size);
    return { ...s, prop, eggs: [] };
  });
  const eggH = 26;

  const eggSpot = (nest, k) => {
    const ds = depthScaleAt(nest.y);
    const w = o.size * ds * 0.55;
    const n = o.eggsPer;
    const x = nest.x - w / 2 + (w / Math.max(1, n - 1)) * k + (n === 1 ? w / 2 : 0);
    const y = nest.y - o.size * ds * 0.36 + (k % 2) * 3;
    return { x, y, scale: (eggH / 512) * ds * 1.05 };
  };

  const addEgg = (nest, animate) => {
    const k = nest.eggs.length;
    const { x, y, scale } = eggSpot(nest, k);
    const egg = scene.add.image(x, y, "egg-0").setOrigin(0.5, 1).setScale(scale).setDepth(nest.y + 0.5);
    nest.eggs.push(egg);
    if (!animate) return;
    egg.y = y - 120;
    scene.tweens.add({
      targets: egg,
      y,
      duration: 380,
      ease: "Bounce.easeOut",
      onComplete: () => scene.tweens.add({ targets: egg, angle: 8, duration: 90, yoyo: true, repeat: 2 }),
    });
  };

  let total = 0;
  const hintPop = (spots) => {
    spots.forEach(({ x, y }, n) => {
      scene.time.delayedCall(n * 420, () => {
        sparkle(scene, x, y, { count: 6, tint: 0xfff3d6, radius: 16 });
        sfx.pop(n + 1);
        countPop(scene, x, y - 34, n + 1, { size: 32 });
      });
    });
    return spots.length;
  };
  const handle = {
    anchor: { x: nests[0].x, y: nests[0].y + 70 },
    fixture: o.fixture,
    zones: [],
    rings: [],
    /** Show, don't tell: count every egg, the eggs in one nest, or the nests. */
    hint(mode = "eggs") {
      if (mode === "nests") return hintPop(nests.map((n) => ({ x: n.x, y: n.y - o.size * depthScaleAt(n.y) * 0.4 })));
      if (mode === "perNest") {
        const n = nests[0];
        return hintPop(Array.from({ length: o.eggsPer }, (_, k) => eggSpot(n, k)));
      }
      return hintPop(nests.flatMap((n) => n.eggs.map((e) => ({ x: e.x, y: e.y - 10 }))));
    },
    clear() {
      this.zones.forEach((z) => z.destroy());
      this.rings.forEach((r) => r.destroy());
      this.zones = [];
      this.rings = [];
    },
    armPlacing(onPlaced, onDone, count) {
      this.clear();
      let placed = 0;
      for (const nest of nests) {
        const ds = depthScaleAt(nest.y);
        const ring = pulseRing(scene, nest.x, nest.y - o.size * ds * 0.35, 48);
        this.rings.push(ring);
        const z = hitZone(scene, nest.x, nest.y - o.size * ds * 0.35, o.size * ds * 1.2, o.size * ds * 0.9, () => {
          if (placed >= count) return;
          if (nest.eggs.length >= o.eggsPer) {
            wobble(scene, nest.prop);
            sfx.wobble();
            return;
          }
          placed += 1;
          total += 1;
          addEgg(nest, true);
          sfx.pop(total);
          countPop(scene, nest.x, nest.y - o.size * ds * 0.8, total);
          if (nest.eggs.length >= o.eggsPer) ring.destroy();
          onPlaced?.(placed);
          if (placed >= count) {
            sparkle(scene, nest.x, nest.y - 30, { count: 12, tint: 0xfff3d6, radius: 40 });
            scene.time.delayedCall(600, () => onDone?.());
          }
        });
        this.zones.push(z);
      }
    },
    complete() {
      for (const nest of nests) while (nest.eggs.length < o.eggsPer) addEgg(nest, false);
      this.clear();
    },
  };
  return handle;
}
