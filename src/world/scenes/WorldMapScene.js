import Phaser from "phaser";
import { ATLAS_KEY } from "./BootScene";
import { WORLD_BOUNDS, ISLANDS, CLOUDS, BOAT } from "../zones/archipelagoLayout";

/**
 * The Phase-0 exit test: a scene of our vector assets that pans smoothly on
 * a real iPad. Sea, five islands, drifting clouds, a boat — and one-finger
 * drag to pan (tap-to-move and quests come in Phases 1–2; virtual joysticks
 * never, per the plan's cut list).
 */
export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super("worldMap");
  }

  init(data) {
    this.atlasScale = data?.atlasScale || 1;
    this.atlasMissing = Boolean(data?.atlasMissing);
  }

  create() {
    const { width: worldW, height: worldH } = WORLD_BOUNDS;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor("#8ed1e8");

    this.drawSea(worldW, worldH);

    // Atlas frames are rasterized at atlasScale× — draw them back at 1/scale
    // so world coordinates stay in 1x pixels on every screen density.
    const spriteScale = 1 / this.atlasScale;

    for (const cloud of CLOUDS) {
      const s = this.addWorldSprite(cloud.frame, cloud.x, cloud.y, spriteScale, 0xffffff);
      s.setAlpha(0.9);
      this.tweens.add({
        targets: s,
        x: cloud.x + cloud.drift,
        duration: Phaser.Math.Between(9000, 14000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    for (const island of ISLANDS) {
      const s = this.addWorldSprite(island.frame, island.x, island.y, spriteScale, 0x7ac074);
      this.tweens.add({
        targets: s,
        y: island.y - island.bob,
        duration: Phaser.Math.Between(2600, 3600),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    const boat = this.addWorldSprite(BOAT.frame, BOAT.x, BOAT.y, spriteScale, 0xd97742);
    this.tweens.add({
      targets: boat,
      y: BOAT.y - BOAT.bob,
      angle: 2,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.cameras.main.centerOn(BOAT.x, BOAT.y);
    this.enableDragPan();
  }

  /** Atlas sprite, or a soft-rectangle stand-in when the atlas isn't built. */
  addWorldSprite(frame, x, y, scale, placeholderColor) {
    if (!this.atlasMissing && this.textures.exists(ATLAS_KEY)) {
      return this.add.image(x, y, ATLAS_KEY, frame).setScale(scale);
    }
    const key = `ph-${frame}`;
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(placeholderColor, 1);
      g.fillRoundedRect(0, 0, 220, 140, 40);
      g.generateTexture(key, 220, 140);
      g.destroy();
    }
    return this.add.image(x, y, key);
  }

  drawSea(worldW, worldH) {
    // Two-tone sea: flat fill plus a sparse grid of sparkle dashes, jittered
    // so it doesn't read as a grid. Cheap enough for a low-end iPad — static
    // geometry, no per-frame work.
    const g = this.add.graphics();
    g.fillStyle(0x8ed1e8, 1);
    g.fillRect(0, 0, worldW, worldH);
    g.fillStyle(0xaadff0, 1);
    const rng = new Phaser.Math.RandomDataGenerator(["larkit-sea"]);
    for (let x = 60; x < worldW; x += 160) {
      for (let y = 60; y < worldH; y += 140) {
        const jx = x + rng.between(-40, 40);
        const jy = y + rng.between(-30, 30);
        g.fillRoundedRect(jx, jy, rng.between(16, 34), 5, 2.5);
      }
    }
  }

  enableDragPan() {
    const cam = this.cameras.main;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    this.input.on("pointerdown", (pointer) => {
      dragging = true;
      lastX = pointer.x;
      lastY = pointer.y;
    });
    this.input.on("pointermove", (pointer) => {
      if (!dragging || !pointer.isDown) return;
      cam.scrollX -= (pointer.x - lastX) / cam.zoom;
      cam.scrollY -= (pointer.y - lastY) / cam.zoom;
      lastX = pointer.x;
      lastY = pointer.y;
    });
    const stop = () => {
      dragging = false;
    };
    this.input.on("pointerup", stop);
    this.input.on("pointerupoutside", stop);
  }
}
