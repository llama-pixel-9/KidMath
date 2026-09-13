import { MODE_GROUPS } from "../modes/index.js";

/**
 * Skylark Island — one continuous, walkable island instead of a map of
 * circles. The four painted zone backdrops (all 2048×1176, same sky, same
 * horizon) are stitched side by side into a single panorama: the kid's
 * skylark hops and flies from the meadow into the pond, the woods, and up
 * to the cliffs. Each region is one math strand (a MODE_GROUPS entry);
 * regions the kid hasn't reached yet sit under mist — "not yet discovered",
 * never a padlock (plan principle 5).
 *
 * All coordinates are world pixels at the art's native 1x scale. Zone
 * content (zones/*.js) is authored in region-local coordinates and offset
 * by `region.x0` at build time, so a zone file never knows where it sits.
 */
export const REGION_W = 2048;
export const REGION_H = 1176;
/** Open sea on the left, where the first-flight arrival begins. */
export const SEA_LEFT_W = 1100;
/** Sea on the right, past the cliffs — the horizon the world ends on. */
export const SEA_RIGHT_W = 700;

/** Painted horizon line in the backdrops (sky meets distant hills). */
export const HORIZON_Y = 745;
/** The walkable ground band: y maps to depth (further up = further away). */
export const GROUND_TOP = 810;
export const GROUND_BOTTOM = 1130;
/** Sky sampled from the backdrops' top edge — the sea/sky strips match it. */
export const SKY_TOP = 0xc1e6d5;
export const SKY_HORIZON = 0xbfe5d1;

const REGION_DEFS = [
  {
    id: "meadow",
    title: "The Meadow",
    groupId: "numbers",
    backdrop: "meadow",
    ambient: "meadow", // butterflies, dandelion seeds
    seam: "hedge", // what covers the join to the NEXT region
    waterColor: 0x9fd6e8,
    waterDeep: 0x7cc0da,
    // The practice signpost: the strand's minigames live here (plan Part 2:
    // "the existing minigames slot in as practice spots").
    signpost: { x: 900, y: 1112, groups: ["numbers"] },
  },
  {
    id: "pond",
    title: "The Pond",
    groupId: "addSubtract",
    backdrop: "pond",
    ambient: "pond", // dragonflies, water sparkle
    seam: "trees",
    waterColor: 0xa6d4e4,
    waterDeep: 0x86bfd6,
    signpost: { x: 1150, y: 1118, groups: ["addSubtract", "measureMoneyTime"] },
  },
  {
    id: "woods",
    title: "The Woods",
    groupId: "multiplyDivide",
    backdrop: "woods",
    ambient: "woods", // falling leaves, fireflies at dusk
    seam: "rocks",
    waterColor: 0x9ccfe0,
    waterDeep: 0x7ab9d2,
    signpost: { x: 1180, y: 1112, groups: ["multiplyDivide"] },
  },
  {
    id: "cliffs",
    title: "The Cliffs",
    groupId: "fractionsDecimals",
    backdrop: "cliffs",
    ambient: "cliffs", // wind, swallows, a kestrel hover
    seam: null,
    waterColor: 0xa9d5e3,
    waterDeep: 0x88bfd4,
    signpost: { x: 1180, y: 1116, groups: ["fractionsDecimals", "shapesData"] },
  },
];

export const REGIONS = REGION_DEFS.map((def, i) => {
  const group = MODE_GROUPS.find((g) => g.id === def.groupId);
  return {
    ...def,
    index: i,
    x0: SEA_LEFT_W + i * REGION_W,
    x1: SEA_LEFT_W + (i + 1) * REGION_W,
    modeIds: group ? group.modeIds : [],
    groupTitle: group ? group.title : def.title,
  };
});

export const WORLD_W = SEA_LEFT_W + REGIONS.length * REGION_W + SEA_RIGHT_W;
export const WORLD_H = REGION_H;

export function regionById(id) {
  return REGIONS.find((r) => r.id === id) ?? null;
}

/** Which region a world x falls in (null over the sea). */
export function regionAtX(x) {
  return REGIONS.find((r) => x >= r.x0 && x < r.x1) ?? null;
}

/** Perspective: sprites lower on the ground band read closer, so larger. */
export function depthScaleAt(y) {
  const t = Math.max(0, Math.min(1, (y - GROUND_TOP) / (GROUND_BOTTOM - GROUND_TOP)));
  return 0.78 + t * 0.34;
}

export function clampToGround(y) {
  return Math.max(GROUND_TOP, Math.min(GROUND_BOTTOM, y));
}
