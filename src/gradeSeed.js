/**
 * Grade → starting level. The kid's grade is collected at onboarding but the
 * engine used to start every mode at level 1 regardless, so a 5th grader's
 * first addition session was `7, 6, 5, ?`. This is the one place that turns a
 * grade into a level; `progressStore` applies it to fresh (never-played)
 * entries only, so an existing level is never moved.
 *
 * Rule: a mode's ladder spans its GRADE_SPANS range (e.g. multiplication 2–4).
 * A kid at or below the span's first grade starts at 1; each grade above it
 * adds three levels (one band), capped below the mode's top band so the top
 * band is always earned (level 7 on a 10-level ladder, 9 on a 12-level one).
 * A kid above the span's last grade is treated as being at its last grade.
 *
 * Dependency-free apart from gradeSpans.js so the native engine can bundle it.
 */
import { GRADE_SPANS } from "./engagement/gradeSpans.js";
import { maxSeededLevelForMode } from "./modeLevels.js";

export const GRADE_ORDER = ["K", "1st", "2nd", "3rd", "4th", "5th", "6th"];
export const MAX_SEEDED_LEVEL = 7;
const LEVELS_PER_GRADE = 3;

/** "K" → 0, "1st" → 1 … "6th" → 6; also accepts "1", 1, "5th". Null when unknown. */
export function gradeIndex(grade) {
  if (grade == null) return null;
  const s = String(grade).trim().toUpperCase();
  if (s === "K" || s === "0") return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : null;
}

/** "2–4" → [2, 4]; "K–1" → [0, 1]; "4" → [4, 4]. */
export function parseSpan(span) {
  const parts = String(span || "").split(/[–-]/).map((p) => gradeIndex(p));
  if (parts.length === 0 || parts[0] == null) return [0, 6];
  return [parts[0], parts[1] ?? parts[0]];
}

export function startingLevelFor(modeId, grade) {
  const g = gradeIndex(grade);
  if (g == null) return 1;
  const [start, end] = parseSpan(GRADE_SPANS[modeId]);
  const effective = Math.min(g, end);
  if (effective <= start) return 1;
  return Math.min(maxSeededLevelForMode(modeId), 1 + LEVELS_PER_GRADE * (effective - start));
}

/**
 * Parent-language grade for where a level sits on a mode's ladder: the span is
 * stretched across the ladder, so "Level 8 of 12" in a 4-5 mode reads as
 * "Grade 5 work". Returns e.g. "Grade 3" or "Kindergarten".
 */
export function gradeWorkForLevel(modeId, level) {
  const [start, end] = parseSpan(GRADE_SPANS[modeId]);
  const max = maxSeededLevelForMode(modeId) + 3;
  const g = start + Math.round(((Math.max(1, Math.min(max, level)) - 1) / Math.max(1, max - 1)) * (end - start));
  return g === 0 ? "Kindergarten" : `Grade ${g}`;
}

/** Which of the kid's-grade relationship a mode has: "in" | "below" | "above". */
export function gradeFitFor(modeId, grade) {
  const g = gradeIndex(grade);
  if (g == null) return "in";
  const [start, end] = parseSpan(GRADE_SPANS[modeId]);
  if (g < start) return "above"; // the mode is above the kid
  if (g > end) return "below"; // the kid has outgrown it
  return "in";
}
