import Phaser from "phaser";

/**
 * Loads the archipelago texture atlas at the density that matches the
 * screen, then hands off to the map. Atlases are built by
 * `npm run world:atlases` from the SVG masters in assets/world/svg/ and
 * committed under public/world/atlases/ (see scripts/world/buildAtlases.mjs).
 *
 * If the atlas is missing (fresh checkout before the pipeline has run) the
 * map falls back to flat-color placeholder textures rather than a black
 * screen — the world should never hard-fail on art.
 */
import { atlasScaleForDPR } from "../atlasScale";

export const ATLAS_KEY = "archipelago";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const scale = atlasScaleForDPR(window.devicePixelRatio);
    this.atlasScale = scale;
    // multiatlas: the free-tex-packer "Phaser3" exporter writes the
    // multi-texture JSON format ({textures: [...]}), which plain load.atlas
    // does not parse. The third argument is the directory the JSON's image
    // filenames resolve against.
    this.load.multiatlas(ATLAS_KEY, `/world/atlases/${ATLAS_KEY}@${scale}x.json`, "/world/atlases");
    this.load.on("loaderror", () => {
      this.atlasMissing = true;
    });
  }

  create() {
    this.scene.start("worldMap", {
      atlasScale: this.atlasScale,
      atlasMissing: Boolean(this.atlasMissing),
    });
  }
}
