/**
 * Which atlas density to load for a screen. Pure and Phaser-free so the
 * vitest suite can cover it without pulling the engine into node.
 * 1x/2x/3x — matches the raster scales scripts/world/buildAtlases.mjs emits.
 */
export function atlasScaleForDPR(dpr) {
  return Math.min(3, Math.max(1, Math.round(dpr || 1)));
}
