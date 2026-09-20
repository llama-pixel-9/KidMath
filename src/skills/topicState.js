/* Where a kid stands in one topic — pure, shared with iOS.
 *
 * The saved progress row carries `grade`, `gradeUnlocked`, `pinnedSkillId` and
 * `skillMastery`, all of which can be absent: every kid who played before
 * skills existed has only a level and a practice log. `resolveTopic` fills the
 * gaps the same way every time, and it NEVER moves the level:
 *
 *   grade          saved, else read off the kid's level in the catalog (a kid
 *                  who has played), else the profile grade clamped to the
 *                  grades the topic has.
 *   gradeUnlocked  the highest of: saved, the focus grade, the profile start —
 *                  so the profile grade is always open even when the kid's
 *                  level puts their focus below it.
 *   mastery        saved, else rebuilt from the practice log, so a kid who
 *                  already did the work gets the credit (and the nomination).
 */
import { GRADES } from "./catalog.js";
import { STATES, deriveMastery, practiceOrder, stateOf, summarize } from "./mastery.js";
import { clampGrade, gradeForModeLevel, nextTopicGrade, openGrades, playSkillById, skillsForPlay, topicGrades } from "./play.js";

const rank = (grade) => GRADES.indexOf(grade);
const higher = (a, b) => (rank(a) >= rank(b) ? a : b);

export function resolveTopic(mode, progress = {}, { profileGrade = null, sessions = [] } = {}) {
  const grades = topicGrades(mode);
  if (!grades.length) return null;
  const played = (progress.totalSessions ?? 0) > 0 || (progress.level ?? 1) > 1;
  const start = clampGrade(mode, profileGrade);
  const saved = grades.includes(progress.grade) ? progress.grade : null;
  const grade = saved || (played ? gradeForModeLevel(mode, progress.level ?? 1) : start);
  const unlockedSaved = grades.includes(progress.gradeUnlocked) ? progress.gradeUnlocked : null;
  const gradeUnlocked = [unlockedSaved, grade, start].filter(Boolean).reduce(higher);
  const hasSaved = progress.skillMastery && Object.keys(progress.skillMastery).length > 0;
  const mastery = hasSaved ? progress.skillMastery : deriveMastery(sessions.filter((s) => s.mode === mode));
  const pinned = playSkillById(progress.pinnedSkillId);
  return {
    mode,
    grade,
    gradeUnlocked,
    open: openGrades(mode, { gradeUnlocked, profileGrade }),
    mastery,
    pinnedSkillId: pinned && pinned.mode === mode ? pinned.id : null,
    // What the store is missing — the caller saves these once (never the level).
    toSave: {
      ...(saved ? {} : { grade }),
      ...(unlockedSaved === gradeUnlocked ? {} : { gradeUnlocked }),
      ...(hasSaved || !Object.keys(mastery).length ? {} : { skillMastery: mastery }),
    },
  };
}

/** A (grade, topic) as the sheet shows it: skills with their state, and the counts. */
export function gradeView(topic, grade = topic.grade) {
  const skills = skillsForPlay(grade, topic.mode);
  const counts = summarize(topic.mastery, skills);
  return {
    grade,
    skills: skills.map((skill) => ({
      id: skill.id,
      title: skill.title,
      state: stateOf(topic.mastery, skill.id),
      needsReview: Boolean(topic.mastery[skill.id]?.needsReview),
    })),
    ...counts,
    nextGrade: nextTopicGrade(topic.mode, grade),
  };
}

/** What "Larkit picks" practices: the pinned skill while it is unmastered, else
 * the focus grade's skills (mixed), weakest first. */
export function larkitPicks(topic) {
  const pinned = topic.pinnedSkillId;
  if (pinned && stateOf(topic.mastery, pinned) !== STATES.MASTERED) return { skillId: pinned, grade: playSkillById(pinned).grade };
  const skills = skillsForPlay(topic.grade, topic.mode);
  return { skillIds: practiceOrder(topic.mastery, skills).concat(skills).map((s) => s.id).filter((id, i, all) => all.indexOf(id) === i), grade: topic.grade };
}

/** Sign-in merge of a device's topic state into the cloud's: nothing earned is lost. */
export function mergeTopicState(cloud = {}, local = {}) {
  const mastery = { ...(cloud.skillMastery || {}) };
  for (const [id, entry] of Object.entries(local.skillMastery || {})) {
    const theirs = mastery[id];
    const mine = entry.state === STATES.MASTERED ? 2 : 1;
    const other = theirs ? (theirs.state === STATES.MASTERED ? 2 : 1) : 0;
    if (!theirs || mine > other || (mine === other && (entry.attempts ?? 0) > (theirs.attempts ?? 0))) mastery[id] = entry;
  }
  const pick = (a, b) => (a && b ? higher(a, b) : a || b || null);
  return {
    grade: pick(cloud.grade, local.grade),
    gradeUnlocked: pick(cloud.gradeUnlocked, local.gradeUnlocked),
    pinnedSkillId: cloud.pinnedSkillId ?? local.pinnedSkillId ?? null,
    skillMastery: mastery,
  };
}
