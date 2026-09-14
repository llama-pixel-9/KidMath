/**
 * Day, dusk or night on the island, from the kid's clock — with a URL
 * override (`?world=night`) for testing. Phaser-free so tests can import it.
 */
export function timeOfDay(date = new Date(), override = null) {
  if (override === "night" || override === "dusk" || override === "day") return override;
  const h = date.getHours();
  if (h >= 20 || h < 6) return "night";
  if (h >= 17) return "dusk";
  return "day";
}
