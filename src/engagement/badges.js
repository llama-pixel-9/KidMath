/**
 * Badges: named recognition for the behaviors the engine already measures.
 * Each badge has a pure `earned(state)` predicate over engagement state; a
 * badge is awarded once, at session end, and never revoked.
 *
 * The two distinctive ones are tied to what the app actually teaches:
 *  - Word Detective rewards first-try wins on the language-trap structures
 *    ("has 3 FEWER... how many does she have?" solved by ADDING) — the
 *    hardest idea in the K-2 curriculum.
 *  - Comeback Kid rewards clearing mistake-bank reviews — the spaced-
 *    repetition loop is the most valuable habit in the app.
 */

export const BADGES = [
  { id: "firstSession", emoji: "🎉", name: "First Steps", blurb: "Finished a whole session", earned: (s) => (s.sessionsCount ?? 0) >= 1 },
  { id: "perfectRound", emoji: "💯", name: "Perfect Round", blurb: "Every answer right on the first try", earned: (s) => (s.perfectSessions ?? 0) >= 1 },
  { id: "streak3", emoji: "🔥", name: "On Fire", blurb: "Played 3 days in a row", earned: (s) => (s.bestStreak ?? 0) >= 3 },
  { id: "streak7", emoji: "⚡", name: "Week Streak", blurb: "Played 7 days in a row", earned: (s) => (s.bestStreak ?? 0) >= 7 },
  { id: "stars100", emoji: "🌟", name: "Star Collector", blurb: "Earned 100 stars all-time", earned: (s) => (s.earnedStars ?? 0) >= 100 },
  { id: "comeback5", emoji: "💪", name: "Comeback Kid", blurb: "Beat 5 tricky problems that got you before", earned: (s) => (s.comebacks ?? 0) >= 5 },
  { id: "wordDetective", emoji: "🕵️", name: "Word Detective", blurb: "Cracked 5 trick-wording problems first try", earned: (s) => (s.trapWins ?? 0) >= 5 },
  { id: "peakClimber", emoji: "🏔️", name: "Peak Climber", blurb: "Reached the Master levels in a mode", earned: (s) => (s.maxLevel ?? 1) >= 7 },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));

/** Badges newly earned by `state` that aren't in its earned list yet. */
export function newlyEarnedBadges(state) {
  const owned = new Set((state.badges ?? []).map((b) => b.id));
  return BADGES.filter((b) => !owned.has(b.id) && b.earned(state));
}
