/**
 * US coins, drawn to scale from photographs of the real thing.
 *
 * The relative sizes are not decoration. A dime is worth MORE than a nickel but
 * is physically SMALLER, and that mismatch is exactly where children go wrong
 * when counting mixed change. A tray drawn at uniform size would quietly teach
 * the misconception we are trying to surface, so `r` here follows real
 * proportions (penny 19.05mm, nickel 21.21, dime 17.91, quarter 24.26).
 *
 * `src` is a public-domain US Mint image; see public/coins/README.md. Nothing
 * on the face states the value, on purpose — a disc reading "10¢" turns coin
 * recognition into plain addition, and recognition is the skill. `label` is for
 * screen readers and for prose, never printed on the coin.
 *
 * iOS mirrors this table in ManipulativeWidgets.swift against the same PNGs.
 */
export const COINS = {
  penny: { value: 1, label: "1¢", name: "Penny", r: 19.05, src: "/coins/penny.png" },
  nickel: { value: 5, label: "5¢", name: "Nickel", r: 21.21, src: "/coins/nickel.png" },
  dime: { value: 10, label: "10¢", name: "Dime", r: 17.91, src: "/coins/dime.png" },
  quarter: { value: 25, label: "25¢", name: "Quarter", r: 24.26, src: "/coins/quarter.png" },
};
