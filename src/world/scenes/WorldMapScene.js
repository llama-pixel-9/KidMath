import Phaser from "phaser";
import { ATLAS_KEY } from "./BootScene";
import { ISLANDS, WORLD_BOUNDS, HOME_ISLAND_ID } from "../islands";
import { ZONE_BACKDROPS, GUIDE_BIRD } from "../worldArt";

// Bloom tints, stage 0→3: washed and pale while a strand is untouched,
// clearing to full painted color as mastery grows. Fog tint is bluer and
// darker — an undiscovered island reads as a shape in the mist, not a lock.
const BLOOM_TINTS = [0xcfdfe4, 0xe9f1f2, 0xffffff, 0xffffff];
const FOG_TINT = 0x7d97a5;
const TAP_SLOP_PX = 12;

/**
 * The Living Map (plan Phase 1): the archipelago as progress bar. Islands
 * are circular vignettes of the painted zone backdrops; fog-of-war and bloom
 * come from the mastery snapshot handed over by WorldPage; tapping a
 * discovered island zooms in and asks React to open its mode panel. The
 * skylark guide performs the wordless first-run flight to the home island.
 */
export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super("worldMap");
  }

  init(data) {
    this.snapshot = data?.snapshot ?? { islands: [], anyProgress: false };
    this.firstSail = Boolean(data?.firstSail);
    this.panEnabled = false;
    this.selectedId = null;
  }

  create() {
    const { width: worldW, height: worldH } = WORLD_BOUNDS;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor("#8ed1e8");

    this.drawSea(worldW, worldH);
    this.drawSkyClouds();

    const stateById = new Map(this.snapshot.islands.map((s) => [s.id, s]));
    for (const island of ISLANDS) {
      this.buildIsland(
        island,
        stateById.get(island.id) ?? { discovered: false, bloom: 0, mastery: 0, played: false },
      );
    }

    this.buildGuideBird();
    this.enableDragPan();

    const onClose = () => this.deselectIsland();
    const onEnterZone = (zoneId) => {
      this.game.events.emit("island-selected-clear");
      this.scene.start("island", {
        zoneId,
        mapData: { snapshot: this.snapshot, firstSail: false },
      });
    };
    this.game.events.on("world-close-panel", onClose);
    this.game.events.on("world-enter-zone", onEnterZone);
    this.events.once("shutdown", () => {
      this.game.events.off("world-close-panel", onClose);
      this.game.events.off("world-enter-zone", onEnterZone);
    });

    const home = ISLANDS.find((i) => i.id === HOME_ISLAND_ID);
    if (this.firstSail) {
      this.playFirstSail(home);
    } else {
      this.cameras.main.centerOn(home.x + 260, home.y);
      this.panEnabled = true;
    }
  }

  // ---------------------------------------------------------------- islands

  buildIsland(island, state) {
    const { x, y, r } = island;

    // Water shadow + sand ring under the vignette.
    this.add.ellipse(x, y + r * 0.95, r * 2.35, r * 0.6, 0x5fb8d8, 0.45);
    const ring = this.add.circle(x, y, r + 14, state.discovered ? 0xf0dfae : 0xc2d2d6);

    const art = ZONE_BACKDROPS[island.backdrop];
    const key = `zone-${island.backdrop}`;
    let img = null;
    if (this.textures.exists(key)) {
      img = this.add.image(x, y, key);
      // Cover the circle generously; backdrops are landscape so height rules.
      const cover = (2 * r * 1.25) / art.h;
      img.setScale(cover);
      img.setFlipX(Boolean(island.flip));
      const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
      maskShape.fillStyle(0xffffff);
      maskShape.fillCircle(x, y, r);
      img.setMask(maskShape.createGeometryMask());
    } else {
      img = this.add.circle(x, y, r, 0x8fce7c);
    }

    if (!state.discovered) {
      img.setTint?.(FOG_TINT);
      this.addFog(island);
      return;
    }

    img.setTint?.(BLOOM_TINTS[state.bloom]);

    // Blooming islands grow a landmark prop from the painted set.
    if (state.bloom >= 3 && this.textures.exists(`prop-${island.prop}`)) {
      const prop = this.add.image(x + r * 0.4, y - r * 0.5, `prop-${island.prop}`);
      const propScale = (r * 0.75) / prop.height;
      prop.setScale(propScale).setOrigin(0.5, 1);
    }

    // Title for readers; non-readers navigate by the art (audio comes with
    // Phase 2 dialog). Fredoka is already loaded by the app shell.
    this.add
      .text(x, y + r + 34, island.title, {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "26px",
        color: "#175a63",
      })
      .setOrigin(0.5, 0);

    // Tap target: the whole vignette. Tap-vs-drag is resolved by pointer
    // travel distance so panning across an island never opens it.
    const hit = this.add.circle(x, y, r + 14, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on("pointerup", (pointer) => {
      const travel = Phaser.Math.Distance.Between(
        pointer.downX,
        pointer.downY,
        pointer.upX,
        pointer.upY,
      );
      if (travel <= TAP_SLOP_PX && this.panEnabled && !this.selectedId) {
        this.selectIsland(island);
      }
    });

    // A gentle idle bob keeps the map alive; subtle so text stays readable.
    this.tweens.add({
      targets: [img, ring],
      y: `-=${4}`,
      duration: Phaser.Math.Between(2800, 3600),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  addFog(island) {
    const { x, y, r } = island;
    const spots = [
      { dx: -r * 0.45, dy: -r * 0.25, w: r * 1.9 },
      { dx: r * 0.4, dy: r * 0.05, w: r * 2.2 },
      { dx: -r * 0.05, dy: r * 0.45, w: r * 1.7 },
    ];
    for (const spot of spots) {
      const puff = this.textures.exists(ATLAS_KEY)
        ? this.add.image(x + spot.dx, y + spot.dy, ATLAS_KEY, "cloud-puff")
        : this.add.ellipse(x + spot.dx, y + spot.dy, 150, 70, 0xffffff);
      // Size by target width, not raw scale — atlas frames are DPR-sized.
      puff.setScale(spot.w / puff.width).setAlpha(0.92);
      puff.setTint?.(0xeff5f7);
      this.tweens.add({
        targets: puff,
        x: puff.x + Phaser.Math.Between(18, 34),
        duration: Phaser.Math.Between(5000, 8000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ------------------------------------------------------------- selection

  selectIsland(island) {
    this.selectedId = island.id;
    this.panEnabled = false;
    const cam = this.cameras.main;
    cam.pan(island.x, island.y, 450, "Sine.easeInOut");
    cam.zoomTo(1.5, 450, "Sine.easeInOut");
    this.time.delayedCall(480, () => {
      this.game.events.emit("island-selected", island.id);
    });
  }

  deselectIsland() {
    if (!this.selectedId) return;
    this.selectedId = null;
    const cam = this.cameras.main;
    cam.zoomTo(1, 400, "Sine.easeInOut");
    this.time.delayedCall(410, () => {
      this.panEnabled = true;
    });
  }

  // ------------------------------------------------------------ guide bird

  buildGuideBird() {
    const home = ISLANDS.find((i) => i.id === HOME_ISLAND_ID);
    const perch = { x: home.x + home.r * 0.9, y: home.y - home.r * 0.9 };
    const start = this.firstSail ? { x: perch.x - 750, y: perch.y + 420 } : perch;

    if (this.textures.exists(GUIDE_BIRD.key)) {
      this.guide = this.add.image(start.x, start.y, GUIDE_BIRD.key);
      this.guide.setScale(150 / GUIDE_BIRD.h);
    } else {
      this.guide = this.add.ellipse(start.x, start.y, 90, 70, 0x8a6f5c);
    }
    this.guide.setDepth(10);
    this.guidePerch = perch;

    if (!this.firstSail) this.startGuideIdle();
  }

  startGuideIdle() {
    this.tweens.add({
      targets: this.guide,
      y: this.guidePerch.y - 10,
      angle: -3,
      duration: 2100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /**
   * First-run moment (plan Phase 1): wordless and un-failable. The skylark
   * flies in over the sea to the home island while the camera follows; no
   * input needed, nothing to get wrong, then the map is yours.
   */
  playFirstSail(home) {
    const cam = this.cameras.main;
    cam.centerOn(this.guide.x, this.guide.y);
    cam.startFollow(this.guide, false, 0.08, 0.08);

    this.tweens.add({
      targets: this.guide,
      x: this.guidePerch.x,
      y: this.guidePerch.y,
      duration: 2800,
      ease: "Sine.easeInOut",
      onComplete: () => {
        cam.stopFollow();
        cam.pan(home.x + 260, home.y, 600, "Sine.easeInOut");
        this.panEnabled = true;
        this.startGuideIdle();
        this.game.events.emit("first-sail-complete");
      },
    });
    // A little wing-bob during the flight.
    this.tweens.add({
      targets: this.guide,
      angle: 4,
      duration: 380,
      yoyo: true,
      repeat: 6,
      ease: "Sine.easeInOut",
    });
  }

  // ------------------------------------------------------------------- sea

  drawSea(worldW, worldH) {
    // Flat fill plus jittered sparkle dashes — static geometry, no per-frame
    // cost on a low-end iPad.
    const g = this.add.graphics();
    g.fillStyle(0x8ed1e8, 1);
    g.fillRect(0, 0, worldW, worldH);
    g.fillStyle(0xaadff0, 1);
    const rng = new Phaser.Math.RandomDataGenerator(["larkit-sea"]);
    for (let x = 60; x < worldW; x += 160) {
      for (let y = 60; y < worldH; y += 140) {
        g.fillRoundedRect(x + rng.between(-40, 40), y + rng.between(-30, 30), rng.between(16, 34), 5, 2.5);
      }
    }
  }

  drawSkyClouds() {
    if (!this.textures.exists(ATLAS_KEY)) return;
    const spots = [
      { frame: "cloud-long", x: 320, y: 150, w: 210 },
      { frame: "cloud-puff", x: 1500, y: 110, w: 150 },
      { frame: "cloud-long", x: 2150, y: 340, w: 190 },
      { frame: "cloud-puff", x: 950, y: 1480, w: 140 },
    ];
    for (const spot of spots) {
      const cloud = this.add.image(spot.x, spot.y, ATLAS_KEY, spot.frame).setAlpha(0.85);
      cloud.setScale(spot.w / cloud.width);
      this.tweens.add({
        targets: cloud,
        x: spot.x + 50,
        duration: Phaser.Math.Between(10000, 15000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ------------------------------------------------------------------- pan

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
      if (!dragging || !pointer.isDown || !this.panEnabled) return;
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
