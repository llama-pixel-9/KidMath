/**
 * Per-mode ladder length (curriculum plan, Phase 3).
 *
 * The default ladder is 10 levels / 3 bands (L1-3, L4-6, L7-10). Modes whose
 * grade span reaches Grade 5 extend to 12 levels: band 4 is L10-12 and maps to
 * Grade-5 work on the `levelToGrade` axis (src/bands.js). Legacy modes stay at
 * 10 — their bank items keep `[7,10]` tags and their ladders never reach 11.
 *
 * Dependency-free leaf (like bands.js): imported by the engine, progressStore,
 * gradeSeed and UI alike, and safe for the native bundle.
 */

export const DEFAULT_MAX_LEVEL = 10;

export const MODE_MAX_LEVELS = {
  fractionOps: 12,
  decimalOps: 12,
  volumeCoordinates: 12,
};

export function maxLevelForMode(modeId) {
  return MODE_MAX_LEVELS[modeId] || DEFAULT_MAX_LEVEL;
}

/** Highest level grade-seeding may hand out: the top band is always earned. */
export function maxSeededLevelForMode(modeId) {
  return maxLevelForMode(modeId) - 3;
}
