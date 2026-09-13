import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import WorldScene from "./scenes/WorldScene";

/**
 * One Phaser.Game per mount, sized to its host and resizing with it. WebGL
 * with canvas fallback, antialiased for the painted art, no physics engine.
 * `worldData` (progress snapshot, first-flight flag, overrides) is computed
 * React-side and seeded into the registry before any scene runs.
 */
export function createWorldGame(parent, worldData = {}) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#c1e6d5",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    render: { antialias: true, roundPixels: false, powerPreference: "high-performance" },
    // The DOM layer (dialog, map, panels) sits over the canvas: presses on
    // it must never reach the world, so no window-level pointer events.
    input: { activePointers: 2, windowEvents: false },
    callbacks: {
      preBoot: (g) => g.registry.set("worldData", worldData),
    },
    scene: [BootScene, WorldScene],
  });
  // Debug/e2e handle. Harmless in production.
  window.__larkitWorld = game;
  return game;
}
