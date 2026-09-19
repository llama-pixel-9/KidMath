/* Lookups over the skill catalog. Pure — imports only the catalog data. */
import { GRADE_LABELS, GRADES, TOPIC_LABELS, WORKSHEET_SKILLS } from "./skills.js";

const BY_ID = new Map(WORKSHEET_SKILLS.map((skill) => [skill.id, skill]));

export function skillById(id) {
  return BY_ID.get(id) || null;
}

export function skillsForGrade(grade) {
  return WORKSHEET_SKILLS.filter((skill) => skill.grade === String(grade));
}

/** Topics (mode ids) that have at least one skill in a grade, in `order`
 * (pass MODE_IDS for the home-screen order). */
export function topicsForGrade(grade, order = Object.keys(TOPIC_LABELS)) {
  const present = new Set(skillsForGrade(grade).map((skill) => skill.mode));
  return order.filter((mode) => present.has(mode));
}

export function skillsFor(grade, mode) {
  return skillsForGrade(grade).filter((skill) => skill.mode === mode);
}

/** Bridge for legacy `?mode=&level=` links and the marketing catalog: the
 * skill in that mode whose engine level is nearest. */
export function skillForModeLevel(mode, level) {
  const inMode = WORKSHEET_SKILLS.filter((skill) => skill.mode === mode);
  if (!inMode.length) return null;
  return inMode.reduce((best, skill) =>
    Math.abs(skill.level - level) < Math.abs(best.level - level) ? skill : best
  );
}

/** "Subtraction · Subtract 3-digit numbers with regrouping · Grade 3 · 3.NBT.A.2" */
export function headerLine(skill) {
  return [TOPIC_LABELS[skill.mode], skill.title, GRADE_LABELS[skill.grade], skill.ccss[0]].join(" · ");
}

/** The browser's default PDF filename comes from document.title. */
export function documentTitle(skill) {
  return `Larkit Worksheet - ${TOPIC_LABELS[skill.mode]} - ${skill.title} (${GRADE_LABELS[skill.grade]})`;
}

export { GRADES, GRADE_LABELS, TOPIC_LABELS, WORKSHEET_SKILLS };
