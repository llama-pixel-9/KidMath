/* TEMPORARY bridge rows for topics whose skills are not authored yet.
 *
 * The picker is Grade → skill for every topic from day one, but only the
 * modes in skills.js have true, claim-checked skills. Every other mode shows
 * one row per level band, titled from the mode's own description and filed
 * under the grade that band plays at, and prints through the old
 * generateFlightLog sheet. As a mode's skills are read off the audit and added
 * to skills.js its bridge rows disappear; when the last one goes, so does this
 * file (and generateFlightLog).
 */
import { gradeWorkForLevel } from "../gradeSeed.js";
import { maxLevelForMode } from "../modeLevels.js";
import { MODE_IDS, getModeConfig } from "../modes";
import { WORKSHEET_SKILLS } from "./skills.js";

const BANDS = [
  { level: 2, label: "starting out" },
  { level: 5, label: "building up" },
  { level: 9, label: "stretching" },
  { level: 12, label: "going further" },
];

const authored = new Set(WORKSHEET_SKILLS.map((skill) => skill.mode));

// "Kindergarten" | "Grade 3" → "K" | "3"; the catalog stops at grade 5.
function gradeKey(label) {
  if (label === "Kindergarten") return "K";
  return String(Math.min(5, parseInt(label.replace(/\D/g, ""), 10) || 1));
}

export const LEGACY_SKILLS = MODE_IDS.filter((mode) => !authored.has(mode)).flatMap((mode) => {
  const config = getModeConfig(mode);
  return BANDS.filter((band) => band.level <= maxLevelForMode(mode)).map((band) => ({
    id: `legacy-${mode}-${band.level}`,
    legacy: true,
    grade: gradeKey(gradeWorkForLevel(mode, band.level)),
    mode,
    ccss: [],
    title: `${config.description} — ${band.label}`,
    level: band.level,
  }));
});
