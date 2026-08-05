/**
 * Zones, perches and play spots (gamification spec §05–§06).
 *
 * Four fixed 1024×588 scenes on one shared horizon. Fourteen NAMED perches per
 * zone for a display cap of seven birds, so the meadow never looks like
 * assigned seating. A bird's saved slot is a perch id, not a coordinate —
 * that is why it is always in the same place tomorrow.
 *
 * Placement rules (§06): chosen once when the bird moves in, then saved
 * forever; species pick perch kinds that suit them; minimum 96px between
 * neighbours; depth by band (sky 0.7 → canopy 0.85 → mid 1.0 → foreground
 * 1.15); the Nest, the egg and the guide handle are reserved rectangles and
 * never picked.
 */

export const ZONE_W = 1024;
export const ZONE_H = 588;
export const HORIZON_Y = 400;
export const MIN_PERCH_DISTANCE = 96;
export const ZONE_BIRD_CAP = 7;

export const ZONES = [
  { id: "meadow", name: "Meadow", unlockAt: 0 },
  { id: "pond", name: "The Pond", unlockAt: 5 },
  { id: "woods", name: "The Woods", unlockAt: 10 },
  { id: "cliffs", name: "The Cliffs", unlockAt: 15 },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));

export function zoneIndex(zoneId) {
  return ZONES.findIndex((z) => z.id === zoneId);
}

export const DEPTHS = { sky: 0.7, canopy: 0.85, mid: 1.0, foreground: 1.15 };

// One perch inventory per zone — the same fourteen NAMES everywhere, with
// zone-specific positions so each scene composes differently. Coordinates are
// zone-local (0–1024 × 0–588) and drawn to sit on that zone's furniture.
const PERCH_TEMPLATE = [
  { name: "highBranch1", type: "highBranch", x: 265, y: 205, depth: "canopy" },
  { name: "highBranch2", type: "highBranch", x: 395, y: 245, depth: "canopy" },
  { name: "lowBranch1", type: "lowBranch", x: 252, y: 342, depth: "mid" },
  { name: "lowBranch2", type: "lowBranch", x: 430, y: 352, depth: "mid" },
  { name: "trunkHollow", type: "trunkHollow", x: 338, y: 385, depth: "mid" },
  { name: "reeds1", type: "reeds", x: 700, y: 462, depth: "foreground" },
  { name: "reeds2", type: "reeds", x: 790, y: 480, depth: "foreground" },
  { name: "fencePost1", type: "fencePost", x: 892, y: 420, depth: "mid" },
  { name: "fencePost2", type: "fencePost", x: 968, y: 448, depth: "mid" },
  { name: "nestBox", type: "nestBox", x: 178, y: 336, depth: "mid" },
  { name: "log", type: "log", x: 566, y: 488, depth: "foreground" },
  { name: "ground1", type: "ground", x: 486, y: 452, depth: "mid" },
  { name: "ground2", type: "ground", x: 648, y: 430, depth: "mid" },
  { name: "pondEdge", type: "pondEdge", x: 130, y: 482, depth: "foreground" },
];

// Small deterministic per-zone shifts keep four scenes from reading as copies.
const ZONE_JITTER = {
  meadow: { dx: 0, dy: 0 },
  pond: { dx: 26, dy: 8 },
  woods: { dx: -18, dy: 4 },
  cliffs: { dx: 12, dy: -6 },
};

export const PERCHES = ZONES.flatMap((zone) => {
  const { dx, dy } = ZONE_JITTER[zone.id];
  return PERCH_TEMPLATE.map((p) => ({
    id: `${zone.id}:${p.name}`,
    zone: zone.id,
    type: p.type,
    x: Math.max(24, Math.min(ZONE_W - 24, p.x + dx)),
    y: Math.max(140, Math.min(ZONE_H - 60, p.y + dy)),
    depth: p.depth,
  }));
});

export const PERCH_BY_ID = Object.fromEntries(PERCHES.map((p) => [p.id, p]));

// Four play spots per zone (§06): a bird drifts to one every few minutes,
// uses it, and goes back to its perch. One bird at a time; a second waits.
const PLAY_SPOT_TEMPLATE = [
  { name: "shallows", kind: "shallows", x: 120, y: 492, seconds: 8 },
  { name: "feeder", kind: "feeder", x: 940, y: 372, seconds: 6 },
  { name: "birdBath", kind: "birdBath", x: 540, y: 448, seconds: 10 },
  { name: "dustPatch", kind: "dustPatch", x: 730, y: 486, seconds: 7 },
];

export const PLAY_SPOTS = ZONES.flatMap((zone) => {
  const { dx, dy } = ZONE_JITTER[zone.id];
  return PLAY_SPOT_TEMPLATE.map((s) => ({
    id: `${zone.id}:${s.name}`,
    zone: zone.id,
    kind: s.kind,
    x: Math.max(40, Math.min(ZONE_W - 40, s.x + dx)),
    y: Math.max(160, Math.min(ZONE_H - 40, s.y + dy)),
    seconds: s.seconds,
  }));
});

// Reserved rectangles (zone-local): the Nest and the egg spot live in the
// first zone; the guide handle claims the bottom strip of every zone. Never
// picked, never overlapped by a perch (the inventory above avoids them).
export const RESERVED_RECTS = [
  { zone: "meadow", x: 274, y: 210, w: 112, h: 160, label: "the Nest" },
  { zone: "meadow", x: 420, y: 480, w: 80, h: 58, label: "the egg" },
  ...ZONES.map((z) => ({ zone: z.id, x: 0, y: ZONE_H - 78, w: ZONE_W, h: 78, label: "guide handle" })),
];

export function globalX(perch) {
  return zoneIndex(perch.zone) * ZONE_W + perch.x;
}

export function birdsInZone(birds, zoneId) {
  return (birds || []).filter((b) => PERCH_BY_ID[b.perchId]?.zone === zoneId);
}

function insideReserved(perch) {
  return RESERVED_RECTS.some(
    (r) =>
      r.zone === perch.zone &&
      perch.x >= r.x &&
      perch.x <= r.x + r.w &&
      perch.y >= r.y &&
      perch.y <= r.y + r.h
  );
}

function farEnough(perch, occupiedPerches) {
  return occupiedPerches.every((other) => {
    if (other.zone !== perch.zone) return true;
    const dx = globalX(other) - globalX(perch);
    const dy = other.y - perch.y;
    return Math.hypot(dx, dy) >= MIN_PERCH_DISTANCE;
  });
}

function freePerchesInZone(birds, zoneId, perchTypes, { ignoreType = false } = {}) {
  if (birdsInZone(birds, zoneId).length >= ZONE_BIRD_CAP) return [];
  const occupiedIds = new Set((birds || []).map((b) => b.perchId));
  const occupiedPerches = [...occupiedIds].map((id) => PERCH_BY_ID[id]).filter(Boolean);
  return PERCHES.filter(
    (p) =>
      p.zone === zoneId &&
      !occupiedIds.has(p.id) &&
      !insideReserved(p) &&
      (ignoreType || perchTypes.includes(p.type)) &&
      farEnough(p, occupiedPerches)
  );
}

/**
 * §05/§06 placement: a new arrival takes a suitable free perch in the zone the
 * kid is viewing; if that zone is full (or has nothing suitable) it tries the
 * other earned zones in order. Deterministic for a given flock state.
 */
export function choosePerch(birds, species, viewedZoneId, earnedZoneIds) {
  const zoneOrder = [viewedZoneId, ...earnedZoneIds.filter((z) => z !== viewedZoneId)];
  const perchTypes = species.perchTypes || [];
  for (const ignoreType of [false, true]) {
    for (const zoneId of zoneOrder) {
      const free = freePerchesInZone(birds, zoneId, perchTypes, { ignoreType });
      if (free.length) {
        const pick = ((birds || []).length * 7 + perchTypes.length) % free.length;
        return free[pick].id;
      }
    }
  }
  return null;
}
