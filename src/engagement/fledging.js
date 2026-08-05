/**
 * Fledging (gamification spec §03): levels are not bought and not automatic.
 * A flight flown well NOMINATES the kid (engine sets `session.nominated`);
 * the nomination is announced on the Flight Report, carried on the mode's
 * Home card, and offered as a Fledging Flight at the next take-off.
 *
 * A nomination clears exactly four ways:
 *   1. consumed  — the Fledging Flight is passed (the kid fledges),
 *   2. evidence  — a rough flight (< 40% precision) clears it silently,
 *   3. attempts  — three failed Fledging Flights clear it (re-earn),
 *   4. any level change in the mode (gliding down).
 * Time away never clears it — kind by default.
 *
 * Gliding down replaces mid-session demotion: two CONSECUTIVE rough flights
 * at a level move the kid down one, framed as "smoother skies for a bit".
 *
 * Pure appliers over the engagement blob + thin persisted wrappers, same
 * pattern as engagementStore.
 */

import { loadEngagement, persistEngagement, todayKey } from "./engagementStore.js";

export const ROUGH_PRECISION = 0.4;
export const ROUGH_FLIGHTS_TO_GLIDE = 2;
export const MAX_FLEDGING_ATTEMPTS = 3;
export const FLEDGING_QUESTIONS = 6;
export const FLEDGING_PASS = 5;

export function getNomination(state, mode) {
  return state.nominations?.[mode] ?? null;
}

/**
 * Pure end-of-normal-flight transition. `facts`:
 *   precisionRatio — firstTryCorrect / questionsAnswered of the finished flight
 *   nominated      — the engine's in-flight signal (session.nominated)
 *   weakSubskills  — session.nominationWeakSubskills
 * Returns { state, nomination, roughFlight, glideDown }; the caller applies
 * glideDown to the persisted level (level − 1) and shows the kind copy.
 */
export function applyFlightEnd(state, mode, { precisionRatio, nominated, weakSubskills = [], dayKey = todayKey() }) {
  const nominations = { ...(state.nominations || {}) };
  const roughFlights = { ...(state.roughFlights || {}) };
  const roughFlight = precisionRatio < ROUGH_PRECISION;
  let glideDown = false;

  if (roughFlight) {
    // Withdrawn by evidence — silently; the readiness signal is stale.
    delete nominations[mode];
    const count = (roughFlights[mode] ?? 0) + 1;
    if (count >= ROUGH_FLIGHTS_TO_GLIDE) {
      glideDown = true;
      roughFlights[mode] = 0;
    } else {
      roughFlights[mode] = count;
    }
  } else {
    roughFlights[mode] = 0;
    if (nominated && !nominations[mode]) {
      nominations[mode] = { attempts: 0, weakSubskills, day: dayKey };
    }
  }

  return {
    state: { ...state, nominations, roughFlights },
    nomination: nominations[mode] ?? null,
    roughFlight,
    glideDown,
  };
}

/**
 * Pure Fledging Flight result. Pass consumes the nomination; a third failed
 * attempt clears it and it must be re-earned ("The lark wants to see one more
 * great flight first"). One attempt per session — the caller only offers at
 * take-off.
 */
export function applyFledgingResult(state, mode, passed) {
  const nominations = { ...(state.nominations || {}) };
  const nomination = nominations[mode];
  if (!nomination) return { state, cleared: false, reearn: false };

  if (passed) {
    delete nominations[mode];
    return { state: { ...state, nominations }, cleared: true, reearn: false };
  }

  const attempts = (nomination.attempts ?? 0) + 1;
  if (attempts >= MAX_FLEDGING_ATTEMPTS) {
    delete nominations[mode];
    return { state: { ...state, nominations }, cleared: true, reearn: true };
  }
  nominations[mode] = { ...nomination, attempts };
  return { state: { ...state, nominations }, cleared: false, reearn: false };
}

/** Invalidated by any level change in the mode (clear path 4). */
export function applyClearNomination(state, mode) {
  if (!state.nominations?.[mode]) return state;
  const nominations = { ...state.nominations };
  delete nominations[mode];
  return { ...state, nominations };
}

// --- persisted wrappers ---

export function recordFlightEnd(mode, facts) {
  const result = applyFlightEnd(loadEngagement(), mode, facts);
  persistEngagement(result.state);
  return result;
}

export function recordFledgingResult(mode, passed) {
  const result = applyFledgingResult(loadEngagement(), mode, passed);
  persistEngagement(result.state);
  return result;
}

export function nominationFor(mode) {
  return getNomination(loadEngagement(), mode);
}
