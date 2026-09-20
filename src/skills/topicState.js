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

// The grade-up challenge keeps the Fledging Flight's numbers: six questions,
// five to pass, three tries before one more practice session is asked for.
export const GRADE_UP = { questions: 6, pass: 5, maxAttempts: 3 };
// Its bookkeeping rides inside the topic's mastery map under a reserved key
// (no skill id starts with "__"), so it is stored, merged and purged with it.
const META = "__gradeUp";

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
    gradeUp: { attempts: 0, needsPractice: false, ...(mastery[META] || {}) },
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

/**
 * What finishing a grade means for this kid, right now:
 *   "advance"    every skill mastered and the next grade is ALREADY open (the
 *                profile grade, or a parent, opened it) — nothing to earn, the
 *                focus simply moves up.
 *   "challenge"  every skill mastered and the next grade is locked — it is
 *                earned in the challenge. (`needsPractice`: three tries are
 *                used up; one more practice session first.)
 *   "auto"       as "challenge", but the grade has a single skill: six
 *                questions on the one skill just mastered would test nothing.
 *   "complete"   the topic's top grade is mastered.
 *   null         still working on it.
 */
export function gradeUpStatus(topic) {
  const view = gradeView(topic);
  if (!view.complete) return null;
  if (!view.nextGrade) return { kind: "complete", grade: topic.grade };
  const base = { grade: topic.grade, nextGrade: view.nextGrade };
  if (topic.open.includes(view.nextGrade)) return { kind: "advance", ...base };
  if (view.total === 1) return { kind: "auto", ...base };
  return { kind: "challenge", ...base, attempts: topic.gradeUp.attempts, needsPractice: Boolean(topic.gradeUp.needsPractice) };
}

/** The challenge: the grade's skills, shakiest first, cycled to six questions. */
export function challengeFor(topic) {
  const skills = skillsForPlay(topic.grade, topic.mode);
  const accuracy = (skill) => {
    const entry = topic.mastery[skill.id];
    return entry?.attempts ? entry.correct / entry.attempts : 1;
  };
  return { skillIds: [...skills].sort((a, b) => accuracy(a) - accuracy(b)).map((s) => s.id), grade: topic.grade, challenge: true };
}

const withMeta = (topic, meta) => ({ ...topic.mastery, [META]: meta });

/** Move the focus (and, when earned, the unlock) up a grade. The patch to save. */
export function advanceGrade(topic, nextGrade) {
  return {
    grade: nextGrade,
    gradeUnlocked: higher(topic.gradeUnlocked, nextGrade),
    skillMastery: withMeta(topic, { attempts: 0, needsPractice: false }),
  };
}

/** After a challenge: pass opens the next grade; a third miss asks for one more
 * practice session first ("the lark wants to see one more great flight"). */
export function applyChallengeResult(topic, firstTryCorrect) {
  const status = gradeUpStatus(topic);
  if (!status || status.kind !== "challenge") return { passed: false, patch: {} };
  if (firstTryCorrect >= GRADE_UP.pass) return { passed: true, nextGrade: status.nextGrade, patch: advanceGrade(topic, status.nextGrade) };
  const attempts = topic.gradeUp.attempts + 1;
  const spent = attempts >= GRADE_UP.maxAttempts;
  return { passed: false, reearn: spent, patch: { skillMastery: withMeta(topic, { attempts: spent ? 0 : attempts, needsPractice: spent }) } };
}

/** A finished practice session answers "one more practice session first". */
export function afterPractice(mastery) {
  const meta = mastery?.[META];
  return meta?.needsPractice ? { ...mastery, [META]: { ...meta, needsPractice: false } } : mastery;
}

/** A parent opens a grade for a topic (the 2nd grader who is ahead). */
export function unlockGrade(topic, grade) {
  if (!topicGrades(topic.mode).includes(grade)) return {};
  return { gradeUnlocked: higher(topic.gradeUnlocked, grade), grade };
}
