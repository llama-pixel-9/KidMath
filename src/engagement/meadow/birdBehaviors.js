/**
 * Rarity is what a bird does (§09) — the ladder maps to animation budget:
 *   Common    "good company"   shared idle + play-spot loops
 *   Uncommon  "has a trick"    one bespoke signature move, 3–4×/session, ≥90s apart
 *   Rare      "puts on a show" signature + a tap response + an hour that is hers
 *   Legendary "one of a kind"  all of that plus a ~10s set piece the meadow watches
 *
 * Rare behaviour never demands attention: no badge, no notification, no
 * "you missed it" — the kestrel hovers whether or not anyone is watching.
 *
 * This module is the pure scheduling layer; the placeholder motion rigs live
 * in SIGNATURE_RIGS below, keyed by the roster's signature ids so commissioned
 * rigs replace entries without touching the scheduler.
 */

import { SPECIES_BY_ID } from "../roster.js";

export const SIGNATURE_MIN_GAP_MS = 90_000;
export const SIGNATURE_MAX_GAP_MS = 240_000;
export const SIGNATURES_PER_SESSION = 4;
export const PLAY_VISIT_MIN_GAP_MS = 120_000;
export const PLAY_VISIT_MAX_GAP_MS = 300_000;

export function nextSignatureDelay(rand = Math.random, boosted = false) {
  const gap = SIGNATURE_MIN_GAP_MS + rand() * (SIGNATURE_MAX_GAP_MS - SIGNATURE_MIN_GAP_MS);
  return boosted ? gap / 2 : gap;
}

export function nextPlayVisitDelay(rand = Math.random) {
  return PLAY_VISIT_MIN_GAP_MS + rand() * (PLAY_VISIT_MAX_GAP_MS - PLAY_VISIT_MIN_GAP_MS);
}

/** morning | midday | dusk | night — the coarse buckets "own hour" uses. */
export function hourBucket(date = new Date()) {
  const h = date.getHours();
  if (h < 6) return "night";
  if (h < 11) return "morning";
  if (h < 17) return "midday";
  if (h < 21) return "dusk";
  return "night";
}

/** A rare bird is busier in the hour that is hers (§09). */
export function inOwnHour(species, date = new Date()) {
  return Boolean(species.ownHour) && species.ownHour === hourBucket(date);
}

export function hasSignature(speciesId) {
  return Boolean(SPECIES_BY_ID[speciesId]?.signature);
}

/** Rare and legendary birds answer a tap with their move, not a hop (§14). */
export function answersWithSignature(speciesId) {
  const tier = SPECIES_BY_ID[speciesId]?.tier;
  return tier === "rare" || tier === "legendary";
}

/** Which play-spot kinds suit a species (from its play loops / habitat). */
export function playSpotKindsFor(species) {
  const kinds = [];
  if (species.perchTypes.includes("pondEdge") || species.perchTypes.includes("reeds")) kinds.push("shallows");
  if (species.perchTypes.includes("highBranch") || species.perchTypes.includes("lowBranch")) kinds.push("feeder");
  kinds.push("birdBath");
  if (species.perchTypes.includes("ground") || species.perchTypes.includes("log")) kinds.push("dustPatch");
  return kinds;
}

/**
 * Placeholder motion rigs, keyed by roster signature id. Each is a framer
 * keyframe set over the bird's <g> (x/y in scene px relative to its perch),
 * with the spec's 2–4s envelope; the legendary set pieces run ~10s. Real
 * commissioned rigs replace values here — the slots and durations stay.
 */
export const SIGNATURE_RIGS = {
  drum: { keyframes: { rotate: [0, -8, 8, -8, 8, -6, 6, 0] }, duration: 2.2 },
  bounceFlight: {
    keyframes: { x: [0, 70, 150, 220, 150, 70, 0], y: [0, -60, -20, -70, -20, -60, 0] },
    duration: 3.6,
  },
  hawkScream: { keyframes: { scale: [1, 1.18, 1.18, 1], rotate: [0, -4, 4, 0] }, duration: 2.0 },
  hoverVanish: { keyframes: { y: [0, -46, -46, -46, 0], opacity: [1, 1, 0, 0, 1] }, duration: 3.0 },
  dive: { keyframes: { y: [0, -40, 96, 0], x: [0, -30, -90, 0], rotate: [0, -20, 48, 0] }, duration: 2.8 },
  zoneLoop: {
    keyframes: { x: [0, 260, 520, 260, 0], y: [0, -110, -60, -130, 0] },
    duration: 4.0,
  },
  silentCircuit: {
    keyframes: { x: [0, 180, 360, 180, 0], y: [0, -70, -120, -70, 0], opacity: [1, 0.85, 0.85, 0.85, 1] },
    duration: 4.0,
  },
  waterRocket: { keyframes: { x: [0, 10, -160, -60, 0], y: [0, 6, -110, -30, 0] }, duration: 3.2 },
  bugle: { keyframes: { rotate: [0, -14, -14, 0], y: [0, -8, -8, 0] }, duration: 2.4 },
  preenShow: { keyframes: { rotate: [0, 16, -14, 12, 0] }, duration: 3.0 },
  hoverStoop: { keyframes: { y: [0, -90, -90, -90, 26, 0], x: [0, 0, 0, 0, 40, 0] }, duration: 3.4 },
  snowWatch: { keyframes: { scale: [1, 1.04, 1], rotate: [0, 0, 0] }, duration: 2.6 },
  craneDance: {
    keyframes: {
      y: [0, -40, 0, -55, 0, -40, 0, -60, 0],
      rotate: [0, -10, 8, -12, 10, -8, 6, -10, 0],
    },
    duration: 10,
  },
  thermalRide: {
    keyframes: {
      x: [0, 220, 480, 700, 480, 220, 0],
      y: [0, -160, -300, -380, -300, -160, 0],
      opacity: [1, 1, 0.9, 0.7, 0.9, 1, 1],
    },
    duration: 10,
  },
};

export function rigFor(speciesId) {
  const species = SPECIES_BY_ID[speciesId];
  const id = species?.signature?.id;
  return (id && SIGNATURE_RIGS[id]) || null;
}

/** ~10s set piece "a few times a week" (legendary): a calm daily coin flip
 * seeded by date+species, so it never demands attention and never nags. */
export function setPieceToday(species, date = new Date()) {
  if (!species.setPiece) return false;
  const key = `${species.id}:${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 7 < 3; // ~3 days out of 7
}
