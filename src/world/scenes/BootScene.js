import Phaser from "phaser";
import { atlasScaleForDPR } from "../atlasScale";
import { ZONE_BACKDROPS, GUIDE_BIRD, BLOOM_PROPS } from "../worldArt";

/**
 * Loads everything the living map needs:
 *  - the vector-derived atlas (clouds, boat) at the density matching the
 *    screen — built by `npm run world:atlases`, committed under
 *    public/world/atlases/
 *  - the existing painted meadow art (zone backdrops, the skylark guide,
 *    bloom props) straight from public/meadow/ — Phaser reads webp natively,
 *    so raster art skips the atlas pipeline entirely.
 *
 * Missing files degrade to placeholders in the map scene rather than a black
 * screen — the world never hard-fails on art.
 */
export const ATLAS_KEY = "archipelago";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const scale = atlasScaleForDPR(window.devicePixelRatio);
    // Plain single-texture atlas (JsonHash) with explicit URLs — the
    // multiatlas loader can stall boot when its JSON finishes last (child
    // PNG never flushed), so the pipeline exports JsonHash instead.
    this.load.atlas(
      ATLAS_KEY,
      `/world/atlases/${ATLAS_KEY}@${scale}x.png`,
      `/world/atlases/${ATLAS_KEY}@${scale}x.json`,
    );

    for (const [name, art] of Object.entries(ZONE_BACKDROPS)) {
      this.load.image(`zone-${name}`, art.url);
    }
    this.load.image(GUIDE_BIRD.key, GUIDE_BIRD.url);
    this.load.image(GUIDE_BIRD.perchKey, GUIDE_BIRD.perchUrl);
    for (const [name, art] of Object.entries(BLOOM_PROPS)) {
      this.load.image(`prop-${name}`, art.url);
    }

    this.load.on("loaderror", (file) => {
      console.warn(`world: failed to load ${file?.key}`);
    });
  }

  create() {
    this.scene.start("worldMap", this.game.registry.get("worldData") ?? {});
  }
}
