import Phaser from "phaser";
import { buildLoadList } from "../worldArt";
import { ZONE_LIST } from "../zones/index";
import { makeTextures } from "../engine/textures";

/**
 * Loads every painted asset the island uses (straight from public/meadow/),
 * generates the small procedural textures, reports progress to the DOM
 * loading curtain, and hands off to the world.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    for (const [key, url] of buildLoadList(ZONE_LIST)) this.load.image(key, url);
    this.load.on("progress", (v) => this.game.events.emit("boot-progress", v));
    this.load.on("loaderror", (file) => console.warn(`world: failed to load ${file?.key}`));
  }

  create() {
    makeTextures(this);
    this.scene.start("world", this.game.registry.get("worldData") ?? {});
  }
}
