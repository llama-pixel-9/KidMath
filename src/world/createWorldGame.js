import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import WorldMapScene from "./scenes/WorldMapScene";

/**
 * One Phaser.Game per mount, sized to its host element and resizing with it.
 * Target hardware is a low-end school iPad and a cheap Chromebook, so: WebGL
 * with canvas fallback (AUTO), no physics engine, antialias for the painted
 * art, RESIZE scale mode so rotation/split-view just work.
 *
 * `worldData` is the derived world state (mastery snapshot, first-run flag)
 * computed React-side from existing progress. preBoot is the safe moment to
 * seed the registry — it runs before any scene's init/preload.
 */
export function createWorldGame(parent, worldData = {}) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#8ed1e8",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    render: { antialias: true, roundPixels: false },
    callbacks: {
      preBoot: (game) => game.registry.set("worldData", worldData),
    },
    scene: [BootScene, WorldMapScene],
  });
  // Debug/e2e handle (the robot-kid suite reads pixels, but a state handle
  // makes world assertions cheap). Harmless in production.
  window.__larkitWorld = game;
  return game;
}
