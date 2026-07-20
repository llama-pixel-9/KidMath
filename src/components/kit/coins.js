/**
 * US coins, drawn to scale.
 *
 * The relative sizes are not decoration. A dime is worth MORE than a nickel but
 * is physically SMALLER, and that mismatch is exactly where children go wrong
 * when counting mixed change. A tray drawn at uniform size would quietly teach
 * the misconception we are trying to surface, so `r` here follows real
 * proportions (penny 19.05mm, nickel 21.21, dime 17.91, quarter 24.26).
 */
export const COINS = {
  penny: { value: 1, label: "1¢", name: "Penny", r: 19.05, fill: "#c88a5a", edge: "#9a6640", text: "#5b3a22" },
  nickel: { value: 5, label: "5¢", name: "Nickel", r: 21.21, fill: "#c6ccd4", edge: "#98a1ab", text: "#48505a" },
  dime: { value: 10, label: "10¢", name: "Dime", r: 17.91, fill: "#ced4db", edge: "#a2abb5", text: "#48505a" },
  quarter: { value: 25, label: "25¢", name: "Quarter", r: 24.26, fill: "#c9cfd6", edge: "#9aa3ad", text: "#48505a" },
};
