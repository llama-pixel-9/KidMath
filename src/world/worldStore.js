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
  return { version: 1, stars: 0, quests: {}, fixtures: {} };
}

export function loadWorldState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || raw.version !== 1) return emptyWorldState();
    return {
      version: 1,
      stars: Number.isFinite(raw.stars) ? Math.max(0, raw.stars) : 0,
      quests: raw.quests && typeof raw.quests === "object" ? raw.quests : {},
      fixtures: raw.fixtures && typeof raw.fixtures === "object" ? raw.fixtures : {},
    };
  } catch {
    return emptyWorldState();
  }
}

export function persistWorldState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode — the session still works, it just won't stick */
  }
}

/** Quest finished: award stars once, flip its fixture permanently. */
export function applyQuestComplete(state, questId, stars = 0, fixture = null) {
  if (state.quests[questId]?.done) return state; // replay never double-pays
  return {
    ...state,
    stars: state.stars + Math.max(0, stars),
    quests: { ...state.quests, [questId]: { done: true, stars } },
    fixtures: fixture ? { ...state.fixtures, [fixture]: true } : state.fixtures,
  };
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
