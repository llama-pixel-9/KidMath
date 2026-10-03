/**
 * Is a topic ready to serve version 2 to everyone? The /admin/switch panel
 * asks this of the approved version-2 rows it reads for a topic, and keeps
 * the topic's v2 button disabled until the answer is yes (plan C.2).
 *
 * Ready means: the topic has approved version-2 rows, and every catalog
 * skill of the topic that draws from the bank finds rows in its own cell,
 * matched the way a session draws them (cellMatches + withinNumbers,
 * src/skills/session.js). A skill with none is a serving gap: flipped to v2,
 * its session would fall to the template generator. Computation drills
 * build their own questions, so they never gap.
 *
 * The same question is asked of this build's bundle (withBundle): the seed
 * is what signed-out and offline kids play, so a topic whose rows are in
 * the database but whose manifest and seed are not deployed yet is not
 * ready either. Flipped then, signed-in kids would get the rows and every
 * other kid the generator: the bundle and the database would disagree.
 *
 * Pure (catalog data and the rows passed in): no network, no storage.
 * liveCoverage.skillServing counts with the same matcher.
 */
import { playSkills } from "../../skills/play.js";
import { cellMatches, withinNumbers } from "../../skills/skillPool.js";

/** Does a play skill serve bank rows (not a computation drill)? */
export function isBankSkill(skill) {
  return skill?.source?.kind !== "computation" && Array.isArray(skill?.source?.families);
}

/** The rows of `items` a skill's session would draw: its own cell, inside its numbers. */
export function skillRows(skill, items) {
  return items.filter((item) => cellMatches(item, skill.mode, skill.source) && withinNumbers(item.question || {}, skill.source.numbers));
}

const isApprovedV2 = (item) => item?.reviewStatus === "approved" && Number(item?.version) === 2;

/**
 * A topic's readiness for v2, from normalized bank items (any mix; only the
 * topic's approved version-2 rows count). Returns { modeId, rows, skills:
 * [{ skillId, title, grade, count }], gaps: [skillId], ready, reason }.
 */
export function topicReadiness(modeId, items, { skills = playSkills() } = {}) {
  const mine = (items || []).filter((item) => item?.modeId === modeId && isApprovedV2(item));
  const perSkill = skills
    .filter((skill) => skill.mode === modeId && isBankSkill(skill))
    .map((skill) => ({ skillId: skill.id, title: skill.title, grade: skill.grade, count: skillRows(skill, mine).length }));
  const gaps = perSkill.filter((s) => s.count === 0).map((s) => s.skillId);
  let reason;
  if (!mine.length) reason = "no approved version-2 rows";
  else if (gaps.length) reason = `${gaps.length} of ${perSkill.length} skills have nothing to serve: ${gaps.join(", ")}`;
  else reason = `${mine.length} approved version-2 rows; ${perSkill.length ? `every skill serves (${perSkill.length})` : "no bank skills"}`;
  return { modeId, rows: mine.length, skills: perSkill, gaps, ready: mine.length > 0 && gaps.length === 0, reason };
}

/**
 * A database readiness result held to this build's bundle as well
 * (`bundleItems`: the seed the app ships, src/itemBank/bundle.js): ready
 * only when the bundle also has approved version-2 rows for every bank
 * skill of the topic. Adds `bundle: { rows, gaps, ready }`.
 */
export function withBundle(result, bundleItems, { skills } = {}) {
  const b = topicReadiness(result.modeId, bundleItems, skills ? { skills } : undefined);
  const bundle = { rows: b.rows, gaps: b.gaps, ready: b.ready };
  if (!result.ready || b.ready) return { ...result, bundle };
  const why = !b.rows
    ? "this build's bundle has no approved version-2 rows for the topic (deploy its manifest and seed first)"
    : `this build's bundle has nothing to serve for ${b.gaps.length} skills: ${b.gaps.join(", ")} (deploy its manifest and seed first)`;
  return { ...result, ready: false, bundle, reason: `${result.reason}; but ${why}` };
}
