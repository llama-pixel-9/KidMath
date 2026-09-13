/**
 * Generated Meadow art (the nano-banana kit, processed 2026-08).
 *
 * Assets live in public/meadow/ as alpha-keyed WebP; artManifest.json carries
 * each file's intrinsic pixel size so components can scale by aspect. Every
 * helper returns null when an asset is missing — callers keep the code-drawn
 * placeholder as the fallback, so a partial kit (or tests, or offline) never
 * breaks the scene. Layout contracts are unchanged: birds still fit the
 * SPRITE_SIZES footprint with feet at (0,0); furniture is placed at the named
 * perch coordinates from perches.js.
 */
import manifest from "./artManifest.json";

const BASE = (import.meta.env?.BASE_URL ?? "/") + "meadow/";

function entry(group, id, folder) {
  const m = manifest[group]?.[id];
  return m ? { url: `${BASE}${folder}/${id}.webp`, w: m.w, h: m.h } : null;
}

/** Sprite art for a species (or a variant like "downyWoodpecker-cling"). */
export function birdArt(speciesId, variant = null) {
  if (variant) {
    const v = entry("birds", `${speciesId}-${variant}`, "birds");
    if (v) return v;
  }
  return entry("birds", speciesId, "birds");
}

export function propArt(id) {
  return entry("props", id, "props");
}

/** Feather badge art, keyed by badge id (badges.js). */
export function featherArt(badgeId) {
  return entry("feathers", badgeId, "feathers");
}

export function zoneArt(zoneId) {
  return entry("zones", zoneId, "zones");
}

/** Egg art by warmth percent: pristine → three crack stages. */
export function eggArt(pct) {
  const stage = pct >= 75 ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0;
  const m = manifest.egg?.[stage];
  return m ? { url: `${BASE}egg/stage${stage}.webp`, w: m.w, h: m.h, stage } : null;
}

/**
 * Furniture per zone: prop id, base-center (x, y) in zone coordinates, and
 * target height in zone px. Positions serve the perch inventory — the tree
 * carries the branch/hollow perches, the fence rail the fencePost perches,
 * etc. Validated against the composed previews before wiring.
 */
export const SCENERY = {
  meadow: [
    { prop: "tree", x: 330, y: 442, h: 330, sway: true },
    { prop: "nestbox", x: 178, y: 440, h: 140 },
    { prop: "feeder", x: 940, y: 442, h: 120 },
    { prop: "fence", x: 920, y: 452, h: 58 },
    { prop: "log", x: 566, y: 500, h: 46 },
    { prop: "reeds", x: 700, y: 478, h: 75 },
    { prop: "reeds", x: 792, y: 492, h: 62 },
  ],
  pond: [
    { prop: "tree", x: 356, y: 448, h: 330, sway: true },
    { prop: "nestbox", x: 204, y: 446, h: 140 },
    { prop: "feeder", x: 966, y: 448, h: 120 },
    { prop: "fence", x: 944, y: 460, h: 58 },
    { prop: "log", x: 592, y: 506, h: 46 },
    { prop: "reeds", x: 920, y: 470, h: 70 },
  ],
  woods: [
    { prop: "tree", x: 80, y: 430, h: 210 },
    { prop: "tree", x: 760, y: 436, h: 260 },
    { prop: "tree", x: 312, y: 442, h: 330, sway: true },
    { prop: "nestbox", x: 160, y: 442, h: 140 },
    { prop: "feeder", x: 922, y: 446, h: 120 },
    { prop: "fence", x: 902, y: 456, h: 58 },
    { prop: "log", x: 548, y: 502, h: 46 },
    { prop: "reeds", x: 682, y: 474, h: 72 },
  ],
  cliffs: [
    { prop: "tree", x: 342, y: 436, h: 330, sway: true },
    { prop: "rocks", x: 140, y: 500, h: 150 },
    { prop: "nestbox", x: 190, y: 436, h: 140 },
    { prop: "feeder", x: 952, y: 436, h: 120 },
    { prop: "fence", x: 932, y: 448, h: 58 },
    { prop: "log", x: 578, y: 494, h: 46 },
    { prop: "reeds", x: 712, y: 468, h: 70 },
  ],
};
