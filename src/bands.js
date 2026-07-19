// Single source of truth for level → band mapping.
//
// KidMath is migrating from the legacy 3-band scheme (K-1 / 2-3 / 4-5) to
// explicit Grade 1–4 bands (G1–G4). See docs/grade1-4-expansion-plan.md §2 and
// docs/grade1-4-claude-code-workorders.md (Phase 0).
//
// This module is a dependency-free leaf: `src/itemBank/index.js` deliberately
// keeps no inbound edge to the modes layer, so the shared band logic lives here
// where both the modes layer and the item-bank layer can import it without a
// cycle. It previously lived (duplicated) in both places.
//
// MIGRATION STANCE (Phase 0 step 1): the legacy 3-band scheme remains the
// ACTIVE coverage axis (`LEVEL_BANDS`, `levelRangeToBands`) so the existing
// ~4,275-item bank, `npm run bank:report`, the admin coverage tools, and every
// test keep working unchanged. The Grade 1–4 vocabulary is introduced alongside
// as pure additions (`GRADE_BANDS`, `levelToGrade`, and the alias bridges). The
// switchover — making G1–G4 the active axis, extending modes to 12 levels, and
// re-tagging items — is a later Phase 0 step gated on those mode changes, per
// the work-order. Nothing here changes current behavior.

// ---------------------------------------------------------------------------
// Legacy 3-band scheme (currently active)
// ---------------------------------------------------------------------------

export const LEVEL_BANDS = ["K-1", "2-3", "4-5"];

// level (1–10) → legacy band. Unchanged from the original duplicated
// definitions in itemMetadata.js / itemBank/index.js.
export function levelToBand(level) {
  if (level <= 3) return "K-1";
  if (level <= 6) return "2-3";
  return "4-5";
}

// Every legacy band a [min, max] levelRange touches.
export function levelRangeToBands(levelRange) {
  if (!Array.isArray(levelRange) || levelRange.length !== 2) return [];
  const [min, max] = levelRange;
  const bands = new Set();
  for (let level = min; level <= max; level++) bands.add(levelToBand(level));
  return [...bands];
}

// Back-compat alias: the modes layer historically exported this name (it
// returned legacy bands despite the "gradeBand" label). Preserved verbatim.
export const levelToGradeBand = levelToBand;

// ---------------------------------------------------------------------------
// Target Grade 1–4 scheme (introduced alongside; not yet the active axis)
// ---------------------------------------------------------------------------

export const GRADE_BANDS = ["G1", "G2", "G3", "G4"];

// level → grade over the current 10-level ladder. G3/G4 split the legacy 4-5
// band (7–8 / 9–10). When modes extend to 12 levels (G4 = levels 10–12) this
// becomes the canonical axis and `levelToBand` retires.
export function levelToGrade(level) {
  if (level <= 3) return "G1";
  if (level <= 6) return "G2";
  if (level <= 8) return "G3";
  return "G4";
}

// Every grade band a [min, max] levelRange touches.
export function levelRangeToGrades(levelRange) {
  if (!Array.isArray(levelRange) || levelRange.length !== 2) return [];
  const [min, max] = levelRange;
  const grades = new Set();
  for (let level = min; level <= max; level++) grades.add(levelToGrade(level));
  return [...grades];
}

// ---------------------------------------------------------------------------
// Alias bridges between the two schemes (used during migration)
// ---------------------------------------------------------------------------

const LEGACY_TO_GRADES = {
  "K-1": ["G1"],
  "2-3": ["G2"],
  "4-5": ["G3", "G4"],
};

const GRADE_TO_LEGACY = {
  G1: "K-1",
  G2: "2-3",
  G3: "4-5",
  G4: "4-5",
};

// Legacy band → the grade band(s) it maps onto.
export function legacyBandToGrades(band) {
  return LEGACY_TO_GRADES[band] ? [...LEGACY_TO_GRADES[band]] : [];
}

// Grade band → its legacy band (for reading legacy-tagged data as grades).
export function gradeToLegacyBand(grade) {
  return GRADE_TO_LEGACY[grade] || null;
}
