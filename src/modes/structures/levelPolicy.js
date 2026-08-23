import { TIERS } from "./additiveStructures";

/**
 * Which structures a level may use, and how big its numbers get.
 *
 * This is the fix for the plan's root cause C2: difficulty was numeric only
 * (RANGES grew from 1..3 to 10..50 and nothing else changed). Real K-4
 * difficulty is structural — where the unknown sits — so tiers unlock by band
 * and number size is a secondary dial *within* a structure.
 *
 * Gating follows the OA Progressions (research §1):
 *   K   the four Easy subtypes only, totals within 10
 *   G1  all subtypes; the four Difficult ones seen but not mastered
 *   G2+ all subtypes and both language variants, within 100; two-step unlocked
 */

export const BANDS = { K: "K", G1: "G1", G2: "G2" };

export function bandForLevel(level) {
  if (level <= 3) return BANDS.K;
  if (level <= 6) return BANDS.G1;
  return BANDS.G2;
}

const TIERS_BY_BAND = {
  [BANDS.K]: [TIERS.EASY],
  [BANDS.G1]: [TIERS.EASY, TIERS.MIDDLE, TIERS.DIFFICULT],
  [BANDS.G2]: [TIERS.EASY, TIERS.MIDDLE, TIERS.DIFFICULT],
};

/**
 * How often the Difficult tier is drawn. G1 "works with but need not master"
 * them, so they appear — sparingly — rather than being withheld until G2.
 */
const DIFFICULT_WEIGHT = { [BANDS.K]: 0, [BANDS.G1]: 0.15, [BANDS.G2]: 0.35 };

/** Total size ceiling per level. Secondary to structure, never the only dial. */
// L8-10 extended 2026-08-23 (grade-4 completion): multi-digit ± with
// regrouping (3.NBT.2 / 4.NBT.4) was unreachable when sums capped at 100.
const MAX_TOTAL = [10, 10, 10, 20, 20, 30, 50, 200, 500, 1000];

/**
 * Word problems are ON at every level, including Kindergarten.
 *
 * The generators previously downgraded every application item to procedural
 * below level 7, which switched word problems off for levels 1-6 and left the
 * youngest users with a single prompt shape — the direct cause of the 100%
 * signature-share cells in docs/variety-baseline.md.
 *
 * K does word problems in the standards (read aloud); what K needs is *short*
 * prose and small numbers, not the absence of prose. `allowWordProblems`
 * remains a user-facing setting and is still respected.
 */
export const WORD_PROBLEMS_FROM_LEVEL = 1;

/** Share of items rendered as a story rather than an equation. */
const STORY_SHARE = { [BANDS.K]: 0.5, [BANDS.G1]: 0.55, [BANDS.G2]: 0.6 };

export function allowedTiers(level) {
  return TIERS_BY_BAND[bandForLevel(level)];
}

export function maxTotalForLevel(level) {
  return MAX_TOTAL[Math.min(Math.max(level, 1), MAX_TOTAL.length) - 1];
}

export function storyShare(level) {
  return STORY_SHARE[bandForLevel(level)];
}

/**
 * Structures available at `level`, weighted so Difficult ones stay rare early.
 * Returns a flat array with difficult structures repeated to match the weight.
 */
export function structuresForLevel(structures, level) {
  const tiers = allowedTiers(level);
  let pool = structures.filter(
    (s) => tiers.includes(s.tier) && (s.minLevel == null || level >= s.minLevel)
  );

  // Some modes have no structure at the easiest tier at all — division's
  // easiest situation is still Level-2 reasoning. Rather than emit nothing,
  // fall back to that mode's own easiest tier. The band still shapes number
  // size via maxTotalForLevel.
  if (!pool.length) {
    const order = [TIERS.EASY, TIERS.MIDDLE, TIERS.DIFFICULT];
    const lowest = order.find((t) => structures.some((s) => s.tier === t));
    pool = structures.filter((s) => s.tier === lowest);
  }
  const band = bandForLevel(level);
  const weight = DIFFICULT_WEIGHT[band];
  if (weight === 0) return pool.filter((s) => s.tier !== TIERS.DIFFICULT);

  const easyish = pool.filter((s) => s.tier !== TIERS.DIFFICULT);
  const hard = pool.filter((s) => s.tier === TIERS.DIFFICULT);
  if (!hard.length) return easyish;

  // Repeat the easier pool so `hard` lands near the intended share.
  const copies = Math.max(1, Math.round((hard.length * (1 - weight)) / (easyish.length * weight)));
  return [...Array.from({ length: copies }, () => easyish).flat(), ...hard];
}

/**
 * Two-step problems are G2+ only, and the Progressions are explicit that they
 * "should not involve these [most difficult] subtypes".
 */
export function allowsTwoStep(level) {
  return bandForLevel(level) === BANDS.G2;
}

export function canComposeTwoStep(structure) {
  return structure.tier !== TIERS.DIFFICULT;
}
