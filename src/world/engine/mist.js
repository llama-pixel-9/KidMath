import { REGION_H } from "../regions";
import { sfx } from "../worldAudio";
import { sparkle, DEPTH } from "./juice";

/**
 * Regions the kid hasn't reached sit under mist: a pale wash plus slow,
 * soft clouds. "Not yet discovered" — never a padlock, never a price. When
 * the gate before it opens (or progress in the app unlocks it), the mist
 * rolls back and the camera takes a moment to show the new place.
 */
export function buildMist(scene, region) {
  const wash = scene.add.graphics().setDepth(DEPTH.mist);
  wash.fillStyle(0xdbeee9, 0.62);
  wash.fillRect(region.x0 - 60, 0, region.x1 - region.x0 + 120, REGION_H);
  wash.fillStyle(0xf3fbf8, 0.3);
  wash.fillRect(region.x0 - 60, 0, region.x1 - region.x0 + 120, REGION_H);

  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const x = region.x0 + 40 + Math.random() * (region.x1 - region.x0 - 80);
    const y = 300 + Math.random() * 800;
    const c = scene.add
      .image(x, y, "cloud")
      .setScale(2.6 + Math.random() * 2.4, 2.2 + Math.random() * 1.6)
      .setAlpha(0.75 + Math.random() * 0.2)
      .setTint(0xe9f5f1)
      .setDepth(DEPTH.mist + 1);
    scene.tweens.add({
      targets: c,
      x: c.x + 40 + Math.random() * 60,
      y: c.y + (Math.random() - 0.5) * 30,
      duration: 6000 + Math.random() * 6000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    clouds.push(c);
  }
  // A thicker bank at the near edge so the boundary reads as a wall of mist.
  for (let i = 0; i < 6; i++) {
    const c = scene.add
      .image(region.x0 - 20 + Math.random() * 80, 700 + i * 90, "cloud")
      .setScale(3.2, 2.8)
      .setAlpha(0.9)
      .setTint(0xeef8f4)
      .setDepth(DEPTH.mist + 2);
    clouds.push(c);
  }

  return {
    region,
    wash,
    clouds,
    alive: true,
    /** Roll back with a flourish; resolves when the region is clear. */
    reveal(onDone) {
      if (!this.alive) return onDone?.();
      this.alive = false;
      sfx.reveal();
      scene.tweens.add({ targets: wash, alpha: 0, duration: 1500, ease: "Sine.easeInOut" });
      clouds.forEach((c, i) => {
        scene.tweens.killTweensOf(c);
        scene.tweens.add({
          targets: c,
          x: c.x + (c.x < (region.x0 + region.x1) / 2 ? -1 : 1) * (400 + Math.random() * 400),
          y: c.y - 200 - Math.random() * 200,
          alpha: 0,
          scaleX: c.scaleX * 1.6,
          scaleY: c.scaleY * 1.3,
          duration: 1400 + Math.random() * 600,
          delay: i * 25,
          ease: "Sine.easeIn",
          onComplete: () => c.destroy(),
        });
      });
      for (let i = 0; i < 5; i++) {
        scene.time.delayedCall(300 + i * 220, () =>
          sparkle(scene, region.x0 + 200 + Math.random() * 1600, 600 + Math.random() * 450, { count: 14, tint: 0xfff3d6, radius: 70 }),
        );
      }
      scene.time.delayedCall(1700, () => {
        wash.destroy();
        onDone?.();
      });
    },
    destroy() {
      wash.destroy();
      clouds.forEach((c) => c.destroy());
    },
  };
}
