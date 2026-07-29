/**
 * The sticker book: cosmetic rewards bought with stars. Costs are sized so a
 * kid finishing one good session (~10-15 stars) can usually afford something,
 * while the shiny tier takes a few days of streaks — the loop the daily goal
 * feeds. Purely cosmetic and separate from premium gating on modes/themes.
 */

export const STICKERS = [
  // Friendly tier — first-session wins.
  { id: "cat", emoji: "🐱", name: "Whiskers", cost: 10 },
  { id: "dog", emoji: "🐶", name: "Biscuit", cost: 10 },
  { id: "frog", emoji: "🐸", name: "Hopper", cost: 10 },
  { id: "duck", emoji: "🦆", name: "Puddles", cost: 10 },
  { id: "turtle", emoji: "🐢", name: "Sheldon", cost: 15 },
  { id: "bunny", emoji: "🐰", name: "Clover", cost: 15 },
  { id: "fox", emoji: "🦊", name: "Ember", cost: 15 },
  { id: "panda", emoji: "🐼", name: "Bamboo", cost: 15 },

  // Explorer tier — a couple of sessions.
  { id: "rocket", emoji: "🚀", name: "Zoomer", cost: 25 },
  { id: "rainbow", emoji: "🌈", name: "Prisma", cost: 25 },
  { id: "unicorn", emoji: "🦄", name: "Sparklehoof", cost: 30 },
  { id: "dino", emoji: "🦖", name: "Rexy", cost: 30 },
  { id: "octopus", emoji: "🐙", name: "Inky", cost: 30 },
  { id: "penguin", emoji: "🐧", name: "Waddles", cost: 30 },
  { id: "dragon", emoji: "🐲", name: "Blaze", cost: 40 },
  { id: "narwhal", emoji: "🦭", name: "Splash", cost: 40 },

  // Legend tier — streak money.
  { id: "crown", emoji: "👑", name: "Royal Crown", cost: 60 },
  { id: "gem", emoji: "💎", name: "Star Gem", cost: 60 },
  { id: "trophy", emoji: "🏆", name: "Champion Cup", cost: 75 },
  { id: "wizard", emoji: "🧙", name: "Math Wizard", cost: 75 },
  { id: "shootingstar", emoji: "🌠", name: "Wish Star", cost: 90 },
  { id: "galaxy", emoji: "🪐", name: "Ringworld", cost: 100 },
];

export const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));
