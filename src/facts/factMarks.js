/**
 * Per-fact "fast" marks (fact fluency plan A7) — pure, shared with iOS.
 *
 * A fact is FAST once the kid has answered it right within the time limit on
 * two different days: 3 seconds, or 5 in Kindergarten and Grade 1. Right but
 * slow is "working on it", and so is a miss. The mark is separate from skill
 * mastery and never gates a grade: mastery has no speed gate on purpose
 * (src/skills/mastery.js), and a slow-but-right kid still moves up.
 *
 * Marks live in the kid's Math Facts mastery map under FACTS_KEY, keyed by
 * the fact's trackKey (8 + 5 and 5 + 8 are one fact; take-away and divide
 * facts count one by one). skills/mastery.js folds them in the same reducer
 * as mastery, so a rebuild from the practice log gives the same marks.
 *
 * Only the recall formats are evidence: a plain or stacked fact, or a missing
 * number. Counting a ten frame or a hop, or judging a true-or-false claim,
 * shows the fact but not recall. A retry, and a right answer after a hint,
 * are not evidence either (as for mastery).
 */
import { FACTS } from "./factSets.js";

/** Where the marks sit in a mastery map. No skill id starts with "__". */
export const FACTS_KEY = "__facts";

export const FAST_RULE = Object.freeze({
  ms: 3000,
  earlyMs: 5000, // Kindergarten and Grade 1
  earlyGrades: Object.freeze(["K", "1"]),
  days: 2,
});

export const RECALL_FORMATS = Object.freeze(["plain", "stacked", "missing"]);

const BY_ID = new Map(FACTS.map((f) => [f.id, f]));

/** A fact by its id ("add-8-5"), or null. */
export function factById(id) {
  return BY_ID.get(id) || null;
}

const BANK_ID = /^mathFacts-v2-((?:add|sub|mul|div)-\d+-\d+)-([A-Za-z]+)$/;

/**
 * The fact and format an attempt asked: stamped on the attempt by the
 * session, else read off a Math Facts bank row id.
 */
export function factOfAttempt(attempt) {
  if (attempt?.factId) return { fact: factById(attempt.factId), format: attempt.factFormat || null };
  const match = BANK_ID.exec(attempt?.itemId || "");
  return match ? { fact: factById(match[1]), format: match[2] } : { fact: null, format: null };
}

/** The time limit for a session's grade (a catalog grade: "K", "1" ...). */
export function fastLimitMs(grade) {
  return FAST_RULE.earlyGrades.includes(String(grade)) ? FAST_RULE.earlyMs : FAST_RULE.ms;
}

/** The kid's calendar day, so two answers an hour apart are one day. */
export function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const blank = () => ({ seen: 0, last: null, days: [], fast: false, slip: false, at: null });

/**
 * Fold one finished session's fact attempts into a marks map
 * `{ [trackKey]: entry }`. Returns a NEW map; never mutates. A Fledging
 * Flight is a test, not practice, so it is not evidence.
 */
export function applyFactAttempts(marks, record) {
  const next = { ...(marks || {}) };
  if (!record || record.kind === "fledging") return next;
  const limit = fastLimitMs(record.grade);
  for (const attempt of record.attempts || []) {
    if (attempt.retry || (attempt.hint && attempt.correct)) continue;
    const { fact, format } = factOfAttempt(attempt);
    if (!fact || !RECALL_FORMATS.includes(format)) continue;
    const entry = { ...(next[fact.trackKey] || blank()) };
    entry.seen += 1;
    entry.at = attempt.t ?? record.endedAt ?? record.startedAt ?? null;
    if (!attempt.correct) {
      entry.last = "miss";
      // A star is never taken away; a slip only brings the fact back sooner.
      if (entry.fast) entry.slip = true;
    } else if (attempt.ms > 0 && attempt.ms <= limit) {
      entry.last = "fast";
      entry.slip = false;
      const day = entry.at == null ? null : dayKey(entry.at);
      if (day && !entry.days.includes(day)) entry.days = [...entry.days, day].slice(-FAST_RULE.days);
      if (entry.days.length >= FAST_RULE.days) entry.fast = true;
    } else {
      entry.last = "slow";
    }
    next[fact.trackKey] = entry;
  }
  return next;
}

/** Is this fact fast for the kid? */
export function isFast(marks, fact) {
  return Boolean(marks?.[fact.trackKey]?.fast);
}

/**
 * How soon a fact should come back, lowest first: a fast fact that slipped,
 * a miss, a slow answer, a fact not met yet, one fast day of two, then fast.
 */
export function factPriority(marks, fact) {
  const entry = marks?.[fact.trackKey];
  if (!entry) return 3;
  if (entry.fast) return entry.slip ? 0 : 5;
  if (entry.last === "miss") return 1;
  if (entry.last === "slow") return 2;
  return 4;
}

/** "14 of 36 facts fast": distinct tracked facts, so 8 + 5 and 5 + 8 are one. */
export function factCounts(marks, facts) {
  const keys = [...new Set(facts.map((f) => f.trackKey))];
  const fast = keys.filter((key) => marks?.[key]?.fast).length;
  return { fast, total: keys.length };
}

/** Sign-in merge: a fast mark is never lost, else the entry with more answers wins. */
export function mergeFactMarks(cloud = {}, local = {}) {
  const merged = { ...(cloud || {}) };
  for (const [key, mine] of Object.entries(local || {})) {
    const theirs = merged[key];
    if (!theirs || (mine.fast && !theirs.fast) || (mine.fast === theirs.fast && (mine.seen ?? 0) > (theirs.seen ?? 0))) merged[key] = mine;
  }
  return merged;
}
