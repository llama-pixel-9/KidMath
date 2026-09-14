import { depthScaleAt } from "../../regions";
import { sfx } from "../../worldAudio";
import { sparkle, DEPTH } from "../juice";
import { toWorld, hitZone } from "./common";

/**
 * Collectible feathers hidden around a region: they float, glint every few
 * seconds so a watchful kid spots them, and fly up to the pocket when
 * tapped. Already-collected feathers never reappear.
 */
export function buildFeathers(scene, zone, region, collectedIds, onCollect) {
  const handles = [];
  for (const f of zone.feathers ?? []) {
    if (collectedIds.includes(f.id)) continue;
    const key = `feather-${f.art}`;
    if (!scene.textures.exists(key)) continue;
    const p = toWorld(region, f);
    const ds = depthScaleAt(p.y);
    const img = scene.add.image(p.x, p.y - 30, key).setScale((46 / 512) * ds).setDepth(p.y + 2).setAngle(-20);
    const float = scene.tweens.add({ targets: img, y: p.y - 44, angle: -8, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const glint = scene.time.addEvent({
      delay: 2600 + Math.random() * 2000,
      loop: true,
      callback: () => sparkle(scene, img.x, img.y, { count: 5, tint: 0xfff6d6, radius: 18 }),
    });
    const zone_ = hitZone(scene, p.x, p.y - 36, 80, 90, () => {
      glint.remove();
      float.stop();
      zone_.destroy();
      sfx.collect();
      sparkle(scene, img.x, img.y, { count: 14, tint: 0xfff3d6, radius: 40 });
      const view = scene.cameras.main.worldView;
      scene.tweens.add({
        targets: img,
        x: view.right - 110,
        y: view.top + 40,
        scale: img.scaleX * 0.5,
        angle: 0,
        duration: 700,
        ease: "Cubic.easeIn",
        onComplete: () => {
          img.destroy();
          onCollect?.(f.id);
        },
      });
    });
    handles.push({ id: f.id, img, zone: zone_ });
  }
  return handles;
}

export { DEPTH };
