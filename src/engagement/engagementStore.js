/**
 * Engagement state: the loop that makes stars mean something.
 *
 *  - star wallet   earned (mirrors lifetime stars as they're won) minus spent
 *  - day streak    consecutive local days with at least one finished session
 *  - daily goal    stars earned today vs a small fixed target
 *  - stickers      cosmetic unlocks bought with stars (see stickers.js)
 *
 * v1 is deliberately localStorage-only: it works identically for anonymous and
 * signed-in play and needs no schema change. The API is shaped so a cloud
 * backend can be added behind `loadEngagement`/`persist` later without
 * touching callers (same pattern progressStore started with).
 *
 * All day logic uses the device's LOCAL calendar day — a streak is "I played
 * today", as a child understands it, not a UTC bucket.
 */

import {
  DAILY_GOAL,
  EGG_WARMTH_TARGET,
  todayKey,
  emptyEngagement,
  starBalance,
  starsToday,
  isFirstWeek,
  currentStreak,
  applySessionEnd,
  applySpend,
} from "./engagementRules.js";

// The rules are pure and shared with the native engine bundle
// (engagementRules.js); this module owns the per-kid persistence.
export {
  DAILY_GOAL,
  EGG_WARMTH_TARGET,
  todayKey,
  emptyEngagement,
  starBalance,
  starsToday,
  isFirstWeek,
  currentStreak,
  applySessionEnd,
  applySpend,
};

// One engagement state PER KID (bird-world prerequisite): siblings must never
// share a flock, wallet, Meadow, or egg. The blob is scoped by the active kid
// profile pointer (owned by kidProfiles.js — read directly here to keep this
// module free of the supabase import chain). An anonymous device uses the bare
// key; the first kid profile INHERITS that state once (copy, never rename —
// renaming wipes progress); later kids start fresh.
const STORE_KEY = "kidmath-engagement";
const ACTIVE_KID_KEY = "kidmath-active-kid"; // kidProfiles.js owns this key
const MIGRATED_KEY = "kidmath-engagement-migrated"; // which kid inherited the device blob

function storeKey() {
  try {
    const kid = localStorage.getItem(ACTIVE_KID_KEY);
    return kid ? `${STORE_KEY}:${kid}` : STORE_KEY;
  } catch {
    return STORE_KEY;
  }
}

export function loadEngagement() {
  try {
    const key = storeKey();
    let raw = localStorage.getItem(key);
    if (!raw && key !== STORE_KEY) {
      // First open under a kid profile. Exactly one kid — the first — inherits
      // the anonymous device state; everyone after starts fresh.
      const migratedTo = localStorage.getItem(MIGRATED_KEY);
      if (!migratedTo) {
        raw = localStorage.getItem(STORE_KEY);
        localStorage.setItem(MIGRATED_KEY, key.slice(STORE_KEY.length + 1));
        if (raw) localStorage.setItem(key, raw);
      }
    }
    if (!raw) return emptyEngagement();
    const parsed = JSON.parse(raw);
    return { ...emptyEngagement(), ...parsed };
  } catch {
    return emptyEngagement();
  }
}

function persist(state) {
  try {
    localStorage.setItem(storeKey(), JSON.stringify(state));
  } catch {
    // Quota/access failure loses nothing critical — engagement is cosmetic.
  }
  return state;
}

/**
 * For sibling modules (fledging.js, the Meadow) that follow the same
 * pure-applier + thin-persisted-wrapper pattern. App code should prefer those
 * wrappers over calling this directly.
 */
export function persistEngagement(state) {
  return persist(state);
}

export function recordSessionEnd(starsEarned, facts = {}, dayKey = todayKey()) {
  const result = applySessionEnd(loadEngagement(), starsEarned, dayKey, facts);
  persist(result.state);
  return result;
}

export function buySticker(sticker) {
  const next = applySpend(loadEngagement(), sticker);
  return next ? persist(next) : null;
}
