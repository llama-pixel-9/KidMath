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

import { newlyEarnedBadges } from "./badges.js";

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

export const DAILY_GOAL = 10;

// §10: a legendary egg needs this much warmth — stars EARNED after the
// purchase — before it can hatch. (~3–4 days at a good flight a day.)
export const EGG_WARMTH_TARGET = 40;

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function yesterdayKey(dayKey) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d - 1));
}

export function emptyEngagement() {
  return {
    earnedStars: 0,
    spentStars: 0,
    streakDays: 0,
    bestStreak: 0,
    lastPlayDay: null,
    todayStars: 0,
    todayDay: null,
    // First finished flight ever, "YYYY-MM-DD" — the Flight Report ledger is
    // expanded by default for the first week and collapsed after (§02).
    firstFlightDay: null,
    stickers: [],
    // Badge inputs (see badges.js) and the earned list [{ id, day }].
    sessionsCount: 0,
    perfectSessions: 0,
    comebacks: 0,
    trapWins: 0,
    maxLevel: 1,
    badges: [],
    // §03 fledging: pending nominations { [mode]: { attempts, weakSubskills, day } }
    // and consecutive rough-flight counts { [mode]: n } (see fledging.js).
    nominations: {},
    roughFlights: {},
    // §04–§13 the Meadow (see flock.js): owned birds
    // [{ speciesId, presetName, customName?, perchId, arrivalDay, hatched?, bob: { period, delay } }],
    // the one incubating egg { speciesId, warmthStars, boughtDay } | null,
    // zones whose opening ceremony has played, and the zone last viewed.
    birds: [],
    egg: null,
    zonesOpened: ["meadow"],
    lastViewedZone: "meadow",
    // §11–§12: which departures/returns have played (keyed by season, e.g.
    // "2026-autumn"), the day a departure was deferred with "Later today",
    // and the last season the Meadow was opened in (drives the 1.5s turn).
    departuresSeen: {},
    returnsSeen: {},
    departureDeferredDay: null,
    seasonLastSeen: null,
    // §14 tier 3: stars not yet seen arcing into the Nest — set at flight end,
    // cleared when the Meadow plays the landing (or shows the still frame).
    pendingNestDrop: 0,
  };
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

export function starBalance(state) {
  return Math.max(0, (state.earnedStars ?? 0) - (state.spentStars ?? 0));
}

/** Today's stars, treating a stale todayDay as an empty day. */
export function starsToday(state, dayKey = todayKey()) {
  return state.todayDay === dayKey ? state.todayStars : 0;
}

/**
 * True during the kid's first seven days of flying (or before any flight).
 * The Flight Report ledger defaults open while this holds (§02 state 3).
 */
export function isFirstWeek(state, dayKey = todayKey()) {
  if (!state.firstFlightDay) return true;
  const [y1, m1, d1] = state.firstFlightDay.split("-").map(Number);
  const [y2, m2, d2] = dayKey.split("-").map(Number);
  const elapsedDays = (new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000;
  return elapsedDays < 7;
}

/** The streak as of `dayKey` — yesterday's streak survives until today is missed. */
export function currentStreak(state, dayKey = todayKey()) {
  if (!state.lastPlayDay) return 0;
  if (state.lastPlayDay === dayKey || state.lastPlayDay === yesterdayKey(dayKey)) {
    return state.streakDays;
  }
  return 0;
}

/**
 * Pure session-end transition. Returns the next state plus the events the UI
 * celebrates: did this session extend the streak, did it just complete the
 * daily goal (exactly the crossing, so the toast fires once per day), and
 * which badges were newly earned.
 *
 * `facts` carries what the session itself measured: { perfect, comebacks,
 * trapWins, levelReached }.
 */
export function applySessionEnd(state, starsEarned, dayKey, facts = {}) {
  const before = starsToday(state, dayKey);
  const next = { ...state };

  next.earnedStars = (state.earnedStars ?? 0) + starsEarned;
  next.todayDay = dayKey;
  next.todayStars = before + starsEarned;
  next.firstFlightDay = state.firstFlightDay ?? dayKey;

  // §14: the next Meadow visit shows these stars arc into the Nest.
  next.pendingNestDrop = (state.pendingNestDrop ?? 0) + Math.max(0, starsEarned);

  // §10: the egg warms as the kid flies — earned stars after purchase, spent
  // stars irrelevant, no decay ever. It stops at full warmth and waits.
  if (state.egg && typeof state.egg === "object") {
    const warmth = Math.min(
      EGG_WARMTH_TARGET,
      (state.egg.warmthStars ?? 0) + Math.max(0, starsEarned)
    );
    next.egg = { ...state.egg, warmthStars: warmth };
  }

  let streakExtended = false;
  if (state.lastPlayDay !== dayKey) {
    next.streakDays = state.lastPlayDay === yesterdayKey(dayKey) ? state.streakDays + 1 : 1;
    next.lastPlayDay = dayKey;
    streakExtended = true;
  }
  next.bestStreak = Math.max(state.bestStreak ?? 0, next.streakDays);

  next.sessionsCount = (state.sessionsCount ?? 0) + 1;
  if (facts.perfect) next.perfectSessions = (state.perfectSessions ?? 0) + 1;
  next.comebacks = (state.comebacks ?? 0) + (facts.comebacks ?? 0);
  next.trapWins = (state.trapWins ?? 0) + (facts.trapWins ?? 0);
  next.maxLevel = Math.max(state.maxLevel ?? 1, facts.levelReached ?? 1);

  const newBadges = newlyEarnedBadges(next);
  if (newBadges.length) {
    next.badges = [...(state.badges ?? []), ...newBadges.map((b) => ({ id: b.id, day: dayKey }))];
  }

  const goalJustMet = before < DAILY_GOAL && next.todayStars >= DAILY_GOAL;
  return { state: next, events: { streakExtended, goalJustMet, newBadges } };
}

/** Record a finished session; persists and returns { state, events }. */
export function recordSessionEnd(starsEarned, facts = {}, dayKey = todayKey()) {
  const result = applySessionEnd(loadEngagement(), starsEarned, dayKey, facts);
  persist(result.state);
  return result;
}

/**
 * Pure spend transition. Returns the next state, or null when the sticker is
 * already owned or the balance is short — the UI disables those paths, and the
 * store refuses them anyway.
 */
export function applySpend(state, sticker) {
  if (!sticker || state.stickers.includes(sticker.id)) return null;
  if (starBalance(state) < sticker.cost) return null;
  return {
    ...state,
    spentStars: (state.spentStars ?? 0) + sticker.cost,
    stickers: [...state.stickers, sticker.id],
  };
}

/** Buy a sticker; persists and returns the new state, or null if refused. */
export function buySticker(sticker) {
  const next = applySpend(loadEngagement(), sticker);
  return next ? persist(next) : null;
}
