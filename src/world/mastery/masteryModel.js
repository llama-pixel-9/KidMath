/**
 * Mastery engine v1 (plan Phase 1): derives per-island mastery, bloom stage,
 * and fog-of-war discovery from the progress the app ALREADY tracks
 * (progressStore's per-mode {level, totalSessions, lifetimeStars}) — so the
 * living map works for anonymous kids on day one, with zero new writes to
 * launch code. The server-side skill_mastery table becomes an additional
 * input when quests land (Phase 2); this module's shape is the contract.
 *
 * Pure functions only — unit-tested in world.spec.js, no storage access.
 */

const MAX_LEVEL = 10;

/** Has this mode ever been meaningfully touched? */
export function modePlayed(entry) {
  if (!entry) return false;
  return (entry.level ?? 1) > 1 || (entry.totalSessions ?? 0) > 0 || (entry.lifetimeStars ?? 0) > 0;
}

/** 0..1 for one mode: level 1 (start) → 0, level 10 → 1. */
export function modeMastery(entry) {
  if (!entry) return 0;
  const level = Math.max(1, Math.min(MAX_LEVEL, entry.level ?? 1));
  return (level - 1) / (MAX_LEVEL - 1);
}

/**
 * 0..1 for an island: the mean over ALL of its modes, unplayed counting as 0.
 * Deliberately not "mean of played modes" — an island only fully blooms when
 * its whole strand is worked, which is the map-as-progress-bar promise.
 */
export function groupMastery(byMode, modeIds) {
  if (!modeIds.length) return 0;
  const total = modeIds.reduce((sum, id) => sum + modeMastery(byMode?.[id]), 0);
  return total / modeIds.length;
}

export function groupPlayed(byMode, modeIds) {
  return modeIds.some((id) => modePlayed(byMode?.[id]));
}

/**
 * Visual bloom stage for a DISCOVERED island:
 *   0 sketchy   — discovered but untouched (washed out, inviting)
 *   1 waking    — first real progress
 *   2 growing   — solid mastery across the strand
 *   3 blooming  — strand largely mastered; props appear
 * Stages only ever describe growth — there is no regression on the map
 * (wrong answers cost time, never progress; plan principle 3).
 */
export function bloomStage(mastery, played) {
  if (!played) return 0;
  if (mastery >= 0.6) return 3;
  if (mastery >= 0.25) return 2;
  return 1;
}

/**
 * Fog-of-war: which islands (ordered array of {id, modeIds}) are discovered.
 *
 * The first two are always open — autonomy needs 2–3 real choices from the
 * first minute (plan principle 2). After that the horizon stays one island
 * ahead of wherever the kid has actually played: island i opens once island
 * i-1 (or i itself, e.g. via a /play deep link) has any progress. Fogged
 * islands render as "not yet discovered" — never a padlock (principle 5).
 */
export function discoveredIslandIds(byMode, islands) {
  const played = islands.map((island) => groupPlayed(byMode, island.modeIds));
  return islands
    .filter((island, i) => i < 2 || played[i] || played[i - 1])
    .map((island) => island.id);
}

/** Everything the map scene needs, in one derived blob. */
export function worldSnapshot(byMode, islands) {
  const discovered = new Set(discoveredIslandIds(byMode, islands));
  return {
    islands: islands.map((island) => {
      const mastery = groupMastery(byMode, island.modeIds);
      const played = groupPlayed(byMode, island.modeIds);
      return {
        id: island.id,
        discovered: discovered.has(island.id),
        mastery,
        played,
        bloom: bloomStage(mastery, played),
      };
    }),
    anyProgress: islands.some((island) => groupPlayed(byMode, island.modeIds)),
  };
}
