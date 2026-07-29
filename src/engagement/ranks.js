/**
 * The three structural bands as named ranks a child can hold on to. Shared by
 * the journey map and the home-page mode pins.
 */
export const RANKS = [
  { from: 1, to: 3, name: "Explorer", emoji: "🧭" },
  { from: 4, to: 6, name: "Adventurer", emoji: "⛺" },
  { from: 7, to: 10, name: "Master", emoji: "🏔️" },
];

export function rankForLevel(level) {
  return RANKS.find((r) => level <= r.to) || RANKS[RANKS.length - 1];
}
