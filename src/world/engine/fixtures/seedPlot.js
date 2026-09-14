import { depthScaleAt } from "../../regions";
import { sfx } from "../../worldAudio";
import { sparkle, starBurst } from "../juice";
import { SUN, INK } from "../textures";
import { toWorld, hitZone } from "./common";

/**
 * The seed plot: plant today (a mound), sprout tomorrow, bloom the day
 * after, pick it for two stars. The "come back tomorrow" hook as growth,
 * never streak guilt. `stage` is null | 0 | 1 | 2 from worldStore.
 */
export function buildSeedPlot(scene, zone, region, stage, callbacks) {
  const o = zone.seedPlot;
  if (!o) return null;
  const { x: cx, y: cy } = toWorld(region, o);
  const ds = depthScaleAt(cy);
  const g = scene.add.graphics().setDepth(cy);
  let current = stage;
  let sway = null;

  const draw = () => {
    g.clear();
    g.setAngle(0);
    sway?.stop();
    // Soil patch.
    g.fillStyle(0x8a6a4a, 0.9);
    g.fillEllipse(cx, cy, 90 * ds, 26 * ds);
    g.fillStyle(0xa8845f, 0.9);
    g.fillEllipse(cx - 6, cy - 3, 60 * ds, 14 * ds);
    if (current == null) {
      // Empty plot: a little dashed hint.
      g.lineStyle(2, 0xfffbeb, 0.8);
      g.strokeEllipse(cx, cy - 2, 70 * ds, 18 * ds);
      return;
    }
    if (current === 0) {
      g.fillStyle(0x7a5a3d, 1);
      g.fillEllipse(cx, cy - 6, 40 * ds, 18 * ds);
      return;
    }
    // Stem + leaves.
    const h = (current === 1 ? 46 : 86) * ds;
    g.lineStyle(5 * ds, 0x4f9f68, 1);
    g.lineBetween(cx, cy - 2, cx, cy - h);
    g.fillStyle(0x62b57a, 1);
    g.fillEllipse(cx - 14 * ds, cy - h * 0.45, 26 * ds, 12 * ds);
    g.fillEllipse(cx + 14 * ds, cy - h * 0.62, 26 * ds, 12 * ds);
    if (current === 2) {
      // Bloom: Sun petals around an Ink-dark heart.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.fillStyle(SUN, 1);
        g.fillEllipse(cx + Math.cos(a) * 14 * ds, cy - h + Math.sin(a) * 14 * ds, 18 * ds, 12 * ds);
      }
      g.fillStyle(0xfbc7a8, 1);
      g.fillCircle(cx, cy - h, 9 * ds);
      g.fillStyle(INK, 0.5);
      g.fillCircle(cx, cy - h, 4 * ds);
    }
  };
  draw();

  const handle = {
    anchor: { x: cx - 60, y: cy + 10 },
    x: cx,
    y: cy,
    setStage(s) {
      current = s;
      draw();
      if (s === 2) sparkle(scene, cx, cy - 80 * ds, { count: 10, tint: 0xffe7c2, radius: 30 });
    },
  };

  hitZone(scene, cx, cy - 24, 100, 76, () => {
    if (current == null) {
      sfx.plant();
      handle.setStage(0);
      sparkle(scene, cx, cy - 10, { count: 6, tint: 0xd9b48a, radius: 20 });
      callbacks?.onPlant?.();
    } else if (current === 2) {
      sfx.bloom();
      starBurst(scene, cx, cy - 70 * ds, 2);
      handle.setStage(null);
      callbacks?.onHarvest?.();
    } else {
      // Not ready: a little rustle, and the panel says come back tomorrow.
      scene.tweens.add({ targets: g, angle: 3, duration: 80, yoyo: true, repeat: 2, onComplete: () => g.setAngle(0) });
      callbacks?.onWait?.(current);
    }
  });

  return handle;
}
