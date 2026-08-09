import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import WorldMapScene from "./scenes/WorldMapScene";

/**
 * One Phaser.Game per mount, sized to its host element and resizing with it.
 * Phase 0 target hardware is a low-end school iPad and a cheap Chromebook,
 * so: WebGL with canvas fallback (AUTO), no physics engine, antialias on for
 * the vector-art look, and RESIZE scale mode so rotation/split-view just work.
 */
export function createWorldGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#8ed1e8",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    render: { antialias: true, roundPixels: false },
    scene: [BootScene, WorldMapScene],
  });
}
