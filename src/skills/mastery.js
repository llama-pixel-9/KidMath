/* Skill mastery — pure, shared with iOS through the native engine.
 *
 * Mastery used to be session-local: per-subskill scores lived on the session
 * and were thrown away when it ended; the only thing that persisted was an
 * integer level. This is the durable replacement. ONE reducer does all the
 * work — `applySession(map, sessionRecord)` — so the persisted per-kid store
 * and a from-scratch rebuild over the practice log (`deriveMastery`) can never
 * disagree: the log is the backfill for kids who practiced before skills
 * existed, and the repair if the store is ever lost.
 *
 * The rule (MASTERY_RULE): a skill is MASTERED on at least 8 first-try
 * attempts in the last-10 window with at most 1 miss, the last 3 correct, and
 * evidence from at least 2 sessions.
 *   - Stricter than the old "solid" (≥90% over ≥4): mastery gates a grade
 *     unlock, and four questions from a pool of a hundred is not evidence.
 *   - No speed gate. The ladder's absolute speed gate parked slow-but-right
 *     kids at level 1 (ladderV2); being right is the skill.
 *   - Two sessions is cheap spaced-retrieval insurance: nothing is mastered in
 *     one sitting. The ◐ mark shows "5 of 8", so day one still moves.
 *
 * A star is never taken away — kind by default. A mastered skill that later
 * slips is flagged `needsReview`, which steers the mixed session back to it
 * and shows up in the parent report; it never re-locks a grade.
 */
import { skillForAttempt } from "./play.js";

export const MASTERY_RULE = {
  window: 10, // first-try attempts remembered per skill
  minAttempts: 8, // evidence needed inside the window
  maxMisses: 1,
  closingStreak: 3, // the last N must all be right
  minSessions: 2,
  reviewAfter: 5, // post-mastery attempts before a slip can be called
  reviewBelow: 0.6,
};

export const STATES = { NEW: "new", PRACTICING: "practicing", MASTERED: "mastered" };

const blank = () => ({
  state: STATES.NEW,
  attempts: 0,
  correct: 0,
  window: "", // "1" right, "0" wrong — newest last
  sessions: 0,
  needsReview: false,
  masteredAt: null,
  lastSessionAt: null,
  sinceMastery: "", // window of attempts after mastery, for needsReview
});

/** Does this attempt count as evidence? First try only; a hint-assisted right
 * answer is neither a hit nor a miss; a miss counts even with a hint. */
function counts(attempt) {
  if (attempt.retry) return false;
  if (attempt.hint && attempt.correct) return false;
  return true;
}

function meetsRule(entry) {
  const recent = entry.window;
  if (recent.length < MASTERY_RULE.minAttempts) return false;
  const misses = recent.split("").filter((c) => c === "0").length;
  if (misses > MASTERY_RULE.maxMisses) return false;
  if (!recent.endsWith("1".repeat(MASTERY_RULE.closingStreak))) return false;
  return entry.sessions >= MASTERY_RULE.minSessions;
}

/**
 * Fold one finished practice session into a kid's mastery map
 * `{ [skillId]: entry }`. Returns a NEW map; never mutates. Challenge
 * (fledging) sessions are a test, not practice — they are not evidence.
 */
export function applySession(map, record) {
  if (!record || record.kind === "fledging") return map || {};
  const next = { ...(map || {}) };
  const touched = new Set();
  for (const attempt of record.attempts || []) {
    if (!counts(attempt)) continue;
    const skill = skillForAttempt(record.mode, attempt);
    if (!skill) continue;
    const entry = { ...(next[skill.id] || blank()) };
    const mark = attempt.correct ? "1" : "0";
    entry.attempts += 1;
    entry.correct += attempt.correct ? 1 : 0;
    entry.window = (entry.window + mark).slice(-MASTERY_RULE.window);
    if (entry.state === STATES.MASTERED) {
      entry.sinceMastery = (entry.sinceMastery + mark).slice(-MASTERY_RULE.window);
    }
    next[skill.id] = entry;
    touched.add(skill.id);
  }
  const at = record.endedAt ?? record.startedAt ?? null;
  for (const id of touched) {
    const entry = next[id];
    entry.sessions += 1;
    entry.lastSessionAt = at;
    if (entry.state !== STATES.MASTERED) {
      entry.state = meetsRule(entry) ? STATES.MASTERED : STATES.PRACTICING;
      if (entry.state === STATES.MASTERED) entry.masteredAt = at;
    } else if (entry.sinceMastery.length >= MASTERY_RULE.reviewAfter) {
      const right = entry.sinceMastery.split("").filter((c) => c === "1").length;
      entry.needsReview = right / entry.sinceMastery.length < MASTERY_RULE.reviewBelow;
    }
  }
  return next;
}

/** Rebuild a mastery map from a practice log — sessions in any order. */
export function deriveMastery(sessions) {
  return [...(sessions || [])]
    .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0))
    .reduce(applySession, {});
}

export function stateOf(map, skillId) {
  return map?.[skillId]?.state || STATES.NEW;
}

/** "5 of 8" for the ◐ mark: evidence gathered toward the rule. */
export function progressToward(map, skillId) {
  const entry = map?.[skillId];
  const have = entry ? Math.min(entry.window.split("").filter((c) => c === "1").length, MASTERY_RULE.minAttempts) : 0;
  return { have, need: MASTERY_RULE.minAttempts };
}

/** Counts for a (grade, topic) — the "2 of 4 Grade 3 skills mastered" line. */
export function summarize(map, skills) {
  const mastered = skills.filter((skill) => stateOf(map, skill.id) === STATES.MASTERED);
  return {
    total: skills.length,
    mastered: mastered.length,
    practicing: skills.filter((skill) => stateOf(map, skill.id) === STATES.PRACTICING).length,
    needsReview: mastered.filter((skill) => map[skill.id].needsReview).map((skill) => skill.id),
    complete: skills.length > 0 && mastered.length === skills.length,
  };
}

/**
 * Skills in the order a mixed session should work on them: unmastered first
 * (least accurate first, untouched skills after the ones already in motion so
 * a kid finishes what they started), then mastered skills needing review.
 */
export function practiceOrder(map, skills) {
  const accuracy = (skill) => {
    const entry = map?.[skill.id];
    return entry && entry.attempts ? entry.correct / entry.attempts : 1;
  };
  const inMotion = skills.filter((skill) => stateOf(map, skill.id) === STATES.PRACTICING).sort((a, b) => accuracy(a) - accuracy(b));
  const untouched = skills.filter((skill) => stateOf(map, skill.id) === STATES.NEW);
  const review = skills.filter((skill) => stateOf(map, skill.id) === STATES.MASTERED && map[skill.id].needsReview);
  return [...inMotion, ...untouched, ...review];
}
