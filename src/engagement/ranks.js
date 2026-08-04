/**
 * The three structural bands as named ranks a child can hold on to
 * (gamification spec §02: Fledgling / Flier / Skymaster — flight words,
 * kid surfaces only; parents see plain "Level n of 10"). Shared by the
 * journey map, the Flight Report level bar, and the home-page mode pins.
 */
export const RANKS = [
  { from: 1, to: 3, name: "Fledgling", emoji: "🐣" },
  { from: 4, to: 6, name: "Flier", emoji: "🪶" },
  { from: 7, to: 10, name: "Skymaster", emoji: "☀️" },
];

export function rankForLevel(level) {
  return RANKS.find((r) => level <= r.to) || RANKS[RANKS.length - 1];
}
