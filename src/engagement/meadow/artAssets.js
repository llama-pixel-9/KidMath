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

import { SCENERY } from "./scenery.js";

// Furniture per zone lives in scenery.js (pure; shared with iOS).
export { SCENERY };
