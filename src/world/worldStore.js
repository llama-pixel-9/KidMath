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
  };
}

export function loadWorldState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
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
    localStorage.setItem(KEY, JSON.stringify(state));
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
