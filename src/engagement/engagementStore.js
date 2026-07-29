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

const STORE_KEY = "kidmath-engagement";

export const DAILY_GOAL = 10;

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
    stickers: [],
    // Badge inputs (see badges.js) and the earned list [{ id, day }].
    sessionsCount: 0,
    perfectSessions: 0,
    comebacks: 0,
    trapWins: 0,
    maxLevel: 1,
    badges: [],
  };
}

export function loadEngagement() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyEngagement();
    const parsed = JSON.parse(raw);
    return { ...emptyEngagement(), ...parsed };
  } catch {
    return emptyEngagement();
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Quota/access failure loses nothing critical — engagement is cosmetic.
  }
  return state;
}

export function starBalance(state) {
  return Math.max(0, (state.earnedStars ?? 0) - (state.spentStars ?? 0));
}

/** Today's stars, treating a stale todayDay as an empty day. */
export function starsToday(state, dayKey = todayKey()) {
  return state.todayDay === dayKey ? state.todayStars : 0;
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
