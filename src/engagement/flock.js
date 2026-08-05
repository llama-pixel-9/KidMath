/**
 * The flock (gamification spec §04–§06, §13): owned birds, zone unlocks, and
 * placement. Pure appliers over the engagement blob + thin persisted wrappers,
 * same pattern as engagementStore/fledging.
 *
 * A bird instance is { speciesId, presetName, customName?, perchId,
 * arrivalDay, hatched?, bob: { period, delay } } — tier, price, seasonality
 * and facts live on the species (roster.js). Every owned bird is present every
 * day; the idle-bob period and delay are randomised once at placement and
 * SAVED so the flock never pulses together (§14).
 */

import { loadEngagement, persistEngagement, todayKey, starBalance, EGG_WARMTH_TARGET } from "./engagementStore.js";
import { SPECIES_BY_ID } from "./roster.js";
import { ZONES, choosePerch } from "./perches.js";

export function flockCount(state) {
  // Birds away on migration still count toward zone unlocks (§11).
  return (state.birds || []).length;
}

export function earnedZones(state) {
  const count = flockCount(state);
  return ZONES.filter((z) => count >= z.unlockAt);
}

/** The next zone still behind the hedge, or null when all four are open. */
export function frontierZone(state) {
  const count = flockCount(state);
  return ZONES.find((z) => count < z.unlockAt) ?? null;
}

/** Zones earned but whose opening ceremony has not played yet (§05: once, ever). */
export function zonesAwaitingOpen(state) {
  const opened = state.zonesOpened || [];
  return earnedZones(state).filter((z) => !opened.includes(z.id));
}

export function ownsSpecies(state, speciesId) {
  return (state.birds || []).some((b) => b.speciesId === speciesId);
}

export function birdName(bird) {
  return bird.customName || bird.presetName;
}

/**
 * Pure arrival. One bird per species; the preset name is drawn at random from
 * the species' six curated names (§07) unless a chosen name is passed
 * (hatched rarities only). Returns { state, bird } — bird null if refused.
 */
export function applyAddBird(state, speciesId, { hatched = false, name, dayKey = todayKey(), rand = Math.random } = {}) {
  const species = SPECIES_BY_ID[speciesId];
  if (!species || ownsSpecies(state, speciesId)) return { state, bird: null };
  const earnedIds = earnedZones(state).map((z) => z.id);
  const viewed = earnedIds.includes(state.lastViewedZone) ? state.lastViewedZone : "meadow";
  const perchId = choosePerch(state.birds || [], species, viewed, earnedIds);
  const bird = {
    speciesId,
    presetName: name ?? species.presetNames[Math.floor(rand() * species.presetNames.length)],
    ...(name && hatched ? { customName: name } : {}),
    perchId,
    arrivalDay: dayKey,
    ...(hatched ? { hatched: true } : {}),
    bob: {
      period: Math.round((4 + rand() * 2) * 100) / 100,
      delay: Math.round(rand() * 400) / 100,
    },
  };
  return { state: { ...state, birds: [...(state.birds || []), bird] }, bird };
}

/**
 * Pure purchase (§08): spend the stars, then the arrival. Returns null when
 * the balance is short, the species is already home, or it is egg-only —
 * the UI disables those paths and the store refuses them anyway.
 */
export function applyGiveHome(state, speciesId, opts = {}) {
  const species = SPECIES_BY_ID[speciesId];
  if (!species || species.starter || species.egg) return null;
  if (ownsSpecies(state, speciesId)) return null;
  if (starBalance(state) < species.price) return null;
  const spent = { ...state, spentStars: (state.spentStars ?? 0) + species.price };
  const result = applyAddBird(spent, speciesId, opts);
  return result.bird ? result : null;
}

/** The Skylark is not bought — she is there on day one (§13). Idempotent. */
export function applyEnsureStarter(state, opts = {}) {
  if (ownsSpecies(state, "skylark")) return { state, bird: null };
  return applyAddBird(state, "skylark", opts);
}

export function applyRename(state, speciesId, newName) {
  const birds = (state.birds || []).map((b) =>
    b.speciesId === speciesId && b.hatched ? { ...b, customName: newName } : b
  );
  return { ...state, birds };
}

// --- eggs and the hatching (§10) ---

/**
 * Pure egg purchase. Legendary birds are never bought — an egg arrives.
 * One egg incubates at a time, and the next cannot be earned until this
 * chick has landed. Returns null when refused.
 */
export function applyBuyEgg(state, speciesId, { dayKey = todayKey() } = {}) {
  const species = SPECIES_BY_ID[speciesId];
  if (!species?.egg || state.egg || ownsSpecies(state, speciesId)) return null;
  if (starBalance(state) < species.eggPrice) return null;
  return {
    ...state,
    spentStars: (state.spentStars ?? 0) + species.eggPrice,
    egg: { speciesId, warmthStars: 0, boughtDay: dayKey },
  };
}

export function eggWarmthPercent(state) {
  if (!state.egg) return 0;
  return Math.min(100, Math.round(((state.egg.warmthStars ?? 0) / EGG_WARMTH_TARGET) * 100));
}

/** At 100% warmth the egg stops filling and WAITS — it never self-fires. */
export function eggReady(state) {
  return Boolean(state.egg) && (state.egg.warmthStars ?? 0) >= EGG_WARMTH_TARGET;
}

/**
 * Pure hatch — applied at the END of the ceremony (beat 6), so closing the
 * app mid-ceremony loses nothing: the egg is still "ready" next open.
 * The chosen name is the kid's own; anything they typed is accepted.
 */
export function applyHatch(state, name, { dayKey = todayKey(), rand = Math.random } = {}) {
  if (!eggReady(state)) return null;
  const speciesId = state.egg.speciesId;
  const result = applyAddBird({ ...state, egg: null }, speciesId, {
    hatched: true,
    name: (name || "").trim() || SPECIES_BY_ID[speciesId].presetNames[0],
    dayKey,
    rand,
  });
  return result.bird ? result : null;
}

export function applyZoneOpened(state, zoneId) {
  const opened = state.zonesOpened || [];
  if (opened.includes(zoneId)) return state;
  return { ...state, zonesOpened: [...opened, zoneId] };
}

export function applyViewedZone(state, zoneId) {
  if (state.lastViewedZone === zoneId) return state;
  return { ...state, lastViewedZone: zoneId };
}

// --- persisted wrappers ---

export function recordEnsureStarter() {
  const result = applyEnsureStarter(loadEngagement());
  if (result.bird) persistEngagement(result.state);
  return result;
}

export function recordGiveHome(speciesId) {
  const result = applyGiveHome(loadEngagement(), speciesId);
  if (result) persistEngagement(result.state);
  return result;
}

export function recordZoneOpened(zoneId) {
  return persistEngagement(applyZoneOpened(loadEngagement(), zoneId));
}

export function recordViewedZone(zoneId) {
  return persistEngagement(applyViewedZone(loadEngagement(), zoneId));
}

export function recordRename(speciesId, newName) {
  return persistEngagement(applyRename(loadEngagement(), speciesId, newName));
}

// --- §11/§12 migration + season bookkeeping (seen-marks, never countdowns) ---

export function recordDepartureSeen(speciesId, seasonKey) {
  const state = loadEngagement();
  return persistEngagement({
    ...state,
    departuresSeen: { ...(state.departuresSeen || {}), [speciesId]: seasonKey },
    departureDeferredDay: null,
  });
}

export function recordReturnSeen(speciesId, seasonKey) {
  const state = loadEngagement();
  return persistEngagement({
    ...state,
    returnsSeen: { ...(state.returnsSeen || {}), [speciesId]: seasonKey },
  });
}

/** "Later today" genuinely defers — until the kid watches or the next day comes. */
export function recordDepartureDeferred(dayKey = todayKey()) {
  return persistEngagement({ ...loadEngagement(), departureDeferredDay: dayKey });
}

export function recordSeasonSeen(seasonKey) {
  const state = loadEngagement();
  if (state.seasonLastSeen === seasonKey) return state;
  return persistEngagement({ ...state, seasonLastSeen: seasonKey });
}

/** §14: the stars have landed in the Nest (or the still frame was shown). */
export function recordNestDropPlayed() {
  return persistEngagement({ ...loadEngagement(), pendingNestDrop: 0 });
}

export function recordBuyEgg(speciesId) {
  const next = applyBuyEgg(loadEngagement(), speciesId);
  if (next) persistEngagement(next);
  return next;
}

export function recordHatch(name) {
  const result = applyHatch(loadEngagement(), name);
  if (result) persistEngagement(result.state);
  return result;
}
