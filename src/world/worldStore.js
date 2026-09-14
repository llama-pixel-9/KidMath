/**
 * World state v1: quest completion, permanent fixtures, and the in-world
 * star tally. localStorage behind a tiny API, exactly like engagementStore —
 * swappable for the server-authoritative path (quest_progress +
 * world-award) once that function is deployed; the shapes already match.
 *
 * Pure transition functions + thin load/persist wrappers so the logic is
 * unit-testable without a DOM.
 */

const KEY = "larkit-world-v1";
const ACTIVE_KID_KEY = "kidmath-active-kid"; // owned by kidProfiles.js

/**
 * The island is per kid, like progress and the engagement blob: siblings
 * sharing a device each get their own. The plain (pre-profile) key is
 * inherited by the first kid who opens the island, then left alone.
 */
export function storageKey(kidId = activeKidId()) {
  return kidId ? `${KEY}:${kidId}` : KEY;
}

function activeKidId() {
  try {
    return localStorage.getItem(ACTIVE_KID_KEY) || null;
  } catch {
    return null;
  }
}

export function emptyWorldState() {
  return {
    version: 1,
    stars: 0,
    quests: {},
    fixtures: {},
    // Ownership layer (plan Phase 3):
    feathers: [], // collected feather ids
    decorations: [], // owned home decoration ids
    egg: null, // { warmth: 0 } once received; warmth grows with earned stars
    seed: null, // { plantedDay: "YYYY-MM-DD" } — the come-back-tomorrow hook
    discovered: [], // region ids the mist has rolled back from (gates opened)
    lastRegion: null, // where the skylark was last seen; spawn there next time
    tutorialDone: false, // the wordless first minute has been played
    secrets: [], // hidden things found (secrets.js ids)
    visitorDay: null, // the last calendar day the visitor was helped
    migrationDone: false, // the Big Migration finale has been played
    chores: { day: null, done: [] }, // today's chores finished
  };
}

export function loadWorldState() {
  try {
    const key = storageKey();
    let stored = localStorage.getItem(key);
    if (stored == null && key !== KEY) {
      // First kid on this device inherits the pre-profile island.
      stored = localStorage.getItem(KEY);
      if (stored != null) {
        localStorage.setItem(key, stored);
        localStorage.removeItem(KEY);
      }
    }
    const raw = JSON.parse(stored);
    if (!raw || raw.version !== 1) return emptyWorldState();
    return {
      ...emptyWorldState(),
      stars: Number.isFinite(raw.stars) ? Math.max(0, raw.stars) : 0,
      quests: raw.quests && typeof raw.quests === "object" ? raw.quests : {},
      fixtures: raw.fixtures && typeof raw.fixtures === "object" ? raw.fixtures : {},
      feathers: Array.isArray(raw.feathers) ? raw.feathers : [],
      decorations: Array.isArray(raw.decorations) ? raw.decorations : [],
      egg:
        raw.egg && typeof raw.egg === "object"
          ? {
              warmth: Math.max(0, raw.egg.warmth ?? 0),
              practiceBaseline: Math.max(0, raw.egg.practiceBaseline ?? 0),
            }
          : null,
      seed: raw.seed && typeof raw.seed.plantedDay === "string" ? { plantedDay: raw.seed.plantedDay } : null,
      discovered: Array.isArray(raw.discovered) ? raw.discovered.filter((d) => typeof d === "string") : [],
      lastRegion: typeof raw.lastRegion === "string" ? raw.lastRegion : null,
      tutorialDone: Boolean(raw.tutorialDone),
      secrets: Array.isArray(raw.secrets) ? raw.secrets.filter((d) => typeof d === "string") : [],
      visitorDay: typeof raw.visitorDay === "string" ? raw.visitorDay : null,
      migrationDone: Boolean(raw.migrationDone),
      chores: raw.chores && typeof raw.chores.day === "string" && Array.isArray(raw.chores.done) ? { day: raw.chores.day, done: raw.chores.done } : { day: null, done: [] },
    };
  } catch {
    return emptyWorldState();
  }
}

/** Local calendar day — growth framing runs on days, not 24h timers. */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function persistWorldState(state) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
  } catch {
    /* private mode — the session still works, it just won't stick */
  }
}

/**
 * Quest finished: award stars once, flip its fixture permanently. Earned
 * stars also warm the egg — the pet grows because the kid practiced
 * (competence made visible, plan principle 2).
 */
export function applyQuestComplete(state, questId, stars = 0, fixture = null) {
  if (state.quests[questId]?.done) return state; // replay never double-pays
  const earned = Math.max(0, stars);
  return {
    ...state,
    stars: state.stars + earned,
    quests: { ...state.quests, [questId]: { done: true, stars } },
    fixtures: fixture ? { ...state.fixtures, [fixture]: true } : state.fixtures,
    egg: state.egg ? { ...state.egg, warmth: state.egg.warmth + earned } : state.egg,
  };
}

// ------------------------------------------------------------- pet (the egg)

/** Warmth thresholds for egg art stages 0-3; at HATCH the chick arrives. */
export const PET_STAGE_WARMTH = [0, 5, 12, 20];
export const PET_HATCH_WARMTH = 30;

/**
 * The egg arrives with a baseline of the kid's lifetime practice stars, so
 * only practice AFTER the gift warms it — a long-practiced kid still gets
 * the full hatching journey.
 */
export function applyReceiveEgg(state, practiceStarsNow = 0) {
  if (state.egg) return state;
  return { ...state, egg: { warmth: 0, practiceBaseline: Math.max(0, practiceStarsNow) } };
}

/** Warmth = world stars earned since the gift + practice stars since it. */
export function eggWarmth(state, practiceStarsNow = 0) {
  if (!state.egg) return 0;
  return state.egg.warmth + Math.max(0, practiceStarsNow - state.egg.practiceBaseline);
}

/** null = no egg yet; 0..3 = egg art stage; "hatched" = the chick is here. */
export function petStage(state, practiceStarsNow = 0) {
  if (!state.egg) return null;
  const warmth = eggWarmth(state, practiceStarsNow);
  if (warmth >= PET_HATCH_WARMTH) return "hatched";
  let stage = 0;
  for (let i = 0; i < PET_STAGE_WARMTH.length; i++) {
    if (warmth >= PET_STAGE_WARMTH[i]) stage = i;
  }
  return stage;
}

// ------------------------------------------------------------- collectibles

export function applyCollectFeather(state, featherId) {
  if (state.feathers.includes(featherId)) return state;
  return { ...state, feathers: [...state.feathers, featherId] };
}

// -------------------------------------------------------- home decorations

/** Buy once, spend stars; refuses politely if the balance is short. */
export function applyBuyDecoration(state, itemId, cost) {
  if (state.decorations.includes(itemId) || state.stars < cost || cost < 0) return state;
  return {
    ...state,
    stars: state.stars - cost,
    decorations: [...state.decorations, itemId],
  };
}

// ------------------------------------- the seed (come back tomorrow hook)

export function applyPlantSeed(state, dayKey) {
  if (state.seed) return state;
  return { ...state, seed: { plantedDay: dayKey } };
}

/**
 * null = nothing planted; 0 = planted today (a mound); 1 = a sprout
 * (tomorrow's payoff); 2 = in bloom, ready to pick. Calendar days, so
 * "come back tomorrow" means tomorrow — growth framing, never loss framing.
 */
export function seedStage(state, dayKey) {
  if (!state.seed) return null;
  const days = calendarDaysBetween(state.seed.plantedDay, dayKey);
  if (days <= 0) return 0;
  if (days === 1) return 1;
  return 2;
}

/** Picking the bloom pays two stars and frees the plot for the next seed. */
export function applyHarvestFlower(state, dayKey) {
  if (seedStage(state, dayKey) !== 2) return state;
  const earned = 2;
  return {
    ...state,
    stars: state.stars + earned,
    seed: null,
    egg: state.egg ? { ...state.egg, warmth: state.egg.warmth + earned } : state.egg,
  };
}

function calendarDaysBetween(fromKey, toKey) {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  return Math.round((to - from) / 86_400_000);
}

export function questDone(state, questId) {
  return Boolean(state.quests[questId]?.done);
}

export function fixtureOn(state, fixture) {
  return Boolean(state.fixtures[fixture]);
}

/** Which of a zone's quests can start right now. */
export function availableQuests(state, zone) {
  return zone.quests.filter(
    (q) =>
      !questDone(state, q.id) &&
      (!q.requiresFixture || fixtureOn(state, q.requiresFixture)),
  );
}

// ------------------------------------------------------------- discovery

/** The mist has rolled back from a region: remembered forever. */
export function applyDiscover(state, regionId) {
  if (state.discovered.includes(regionId)) return state;
  return { ...state, discovered: [...state.discovered, regionId] };
}

export function applyLastRegion(state, regionId) {
  if (state.lastRegion === regionId) return state;
  return { ...state, lastRegion: regionId };
}

export function applyTutorialDone(state) {
  if (state.tutorialDone) return state;
  return { ...state, tutorialDone: true };
}

/** A secret found: two stars the first time, remembered forever. */
export function applySecretFound(state, secretId, stars = 2) {
  if (state.secrets.includes(secretId)) return state;
  return {
    ...state,
    stars: state.stars + stars,
    secrets: [...state.secrets, secretId],
    egg: state.egg ? { ...state.egg, warmth: state.egg.warmth + stars } : state.egg,
  };
}

export function applyVisitorHelped(state, dayKey) {
  if (state.visitorDay === dayKey) return state;
  return { ...state, visitorDay: dayKey };
}

export function applyMigrationDone(state) {
  if (state.migrationDone) return state;
  return { ...state, migrationDone: true };
}

/** A chore finished: two stars, remembered for the day (yesterday's list is dropped). */
export function applyChoreDone(state, choreId, dayKey, stars = 2) {
  const done = state.chores.day === dayKey ? state.chores.done : [];
  if (done.includes(choreId)) return state;
  return {
    ...state,
    stars: state.stars + stars,
    chores: { day: dayKey, done: [...done, choreId] },
    egg: state.egg ? { ...state.egg, warmth: state.egg.warmth + stars } : state.egg,
  };
}

export function choreDone(state, choreId, dayKey) {
  return state.chores.day === dayKey && state.chores.done.includes(choreId);
}
