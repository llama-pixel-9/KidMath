/* The play-by-skill flow, as both apps run it — pure, shared with iOS.
 *
 * The web page and the SwiftUI app each own a screen and a store; everything
 * in between lives here so the two cannot drift: what the topic sheet shows,
 * what a tap starts, what the session is called, and what a finished session
 * means for mastery and the grade.
 *
 * `context` everywhere = { profileGrade, sessions } — the kid's profile grade
 * and their practice log (used only to rebuild mastery a store is missing).
 */
import { GRADE_LABELS, TOPIC_LABELS } from "./catalog.js";
import { MASTERY_RULE, STATES, applySession, stateOf } from "./mastery.js";
import { nextTopicGrade, playSkillById, skillsForPlay, topicGrades } from "./play.js";
import {
  GRADE_UP,
  advanceGrade,
  afterPractice,
  applyChallengeResult,
  challengeFor,
  gradeUpStatus,
  gradeView,
  larkitPicks,
  mergeTopicState,
  resolveTopic,
  unlockGrade,
} from "./topicState.js";

/**
 * The topic as the kid should see it now. A finished grade whose next grade is
 * already open (or that was a single skill) has nothing left to earn: the focus
 * moves up here, and that move rides in `toSave` with anything else the store
 * was missing.
 */
export function currentTopic(mode, progress = {}, context = {}) {
  const resolved = resolveTopic(mode, progress, context);
  const status = resolved ? gradeUpStatus(resolved) : null;
  if (status?.kind !== "advance" && status?.kind !== "auto") return resolved;
  const patch = advanceGrade(resolved, status.nextGrade);
  const moved = resolveTopic(mode, { ...progress, ...resolved.toSave, ...patch }, context);
  return { ...moved, toSave: { ...resolved.toSave, ...patch } };
}

const rightCount = (mastery, id) =>
  Math.min((mastery[id]?.recent || "").split("").filter((c) => c === "1").length, MASTERY_RULE.minAttempts);

function stateLabel(skill, right) {
  if (skill.state === STATES.MASTERED) return skill.needsReview ? "mastered · worth a review" : "mastered";
  if (skill.state === STATES.NEW) return "new";
  return `${right} of ${MASTERY_RULE.minAttempts}`;
}

function statusText(skill, right) {
  if (skill.state === STATES.MASTERED) return skill.needsReview ? "Mastered · worth a review" : "Mastered";
  if (skill.state === STATES.NEW) return "Not started";
  return `${right} of ${MASTERY_RULE.minAttempts} right — keep going`;
}

/**
 * Everything the topic sheet renders, for the grade being shown (`shownGrade`
 * when it is one of the open grades, else the focus grade).
 */
export function topicSheetModel(mode, progress = {}, context = {}, shownGrade = null) {
  const topic = currentTopic(mode, progress, context);
  if (!topic) return null;
  const grade = shownGrade && topic.open.includes(shownGrade) ? shownGrade : topic.grade;
  const view = gradeView(topic, grade);
  const status = gradeUpStatus(topic);
  const challenge = status?.kind === "challenge" && grade === topic.grade ? status : null;
  // A grown-up's pin wins whatever grade is showing — until it is mastered.
  const pinned =
    topic.pinnedSkillId && stateOf(topic.mastery, topic.pinnedSkillId) !== STATES.MASTERED ? playSkillById(topic.pinnedSkillId) : null;
  return {
    mode,
    topicLabel: TOPIC_LABELS[mode],
    grade,
    gradeLabel: GRADE_LABELS[grade],
    focusGrade: topic.grade,
    open: topic.open.map((g) => ({ grade: g, label: GRADE_LABELS[g] })),
    pinned: pinned ? { id: pinned.id, title: pinned.title } : null,
    practiceLabel: `Practice — ${pinned ? pinned.title : "Larkit picks"}`,
    practiceNote: pinned ? "Picked by a grown-up." : "A mix of these skills — the ones you need most come first.",
    // What the big button starts (see sessionOptionsFor).
    practiceRequest: pinned ? { skill: pinned.id } : { mix: true, grade },
    skills: view.skills.map((skill) => {
      const right = rightCount(topic.mastery, skill.id);
      return { ...skill, right, goal: MASTERY_RULE.minAttempts, stateLabel: stateLabel(skill, right), statusText: statusText(skill, right) };
    }),
    mastered: view.mastered,
    total: view.total,
    footer: `${view.mastered} of ${view.total} ${GRADE_LABELS[grade]} skills mastered`,
    completeNote: !view.complete ? null : view.nextGrade ? `Every ${GRADE_LABELS[grade]} skill here is mastered.` : `${TOPIC_LABELS[mode]} complete!`,
    flight: challenge && {
      headline: `Every ${GRADE_LABELS[grade]} skill mastered!`,
      needsPractice: challenge.needsPractice,
      detail: challenge.needsPractice
        ? "One more good practice first, then your Fledging Flight comes back."
        : `A Fledging Flight: ${GRADE_UP.questions} questions, ${GRADE_UP.pass} to pass — and ${GRADE_LABELS[challenge.nextGrade]} opens. No stars ride on it.`,
      button: "Take the Fledging Flight",
      nextGrade: challenge.nextGrade,
    },
    toSave: topic.toSave,
  };
}

/**
 * The `createAdaptiveSession` options a request starts, or null when the
 * request is not one this kid can make (then the caller plays the ladder).
 *   { skill: id }            one pinned skill
 *   { mix: true, grade? }    "Larkit picks" across an open grade's skills
 *   { challenge: true }      the Fledging Flight — only when really earned
 */
export function sessionOptionsFor(mode, progress = {}, context = {}, request = {}) {
  const topic = resolveTopic(mode, progress, context);
  if (!topic) return null;
  const pinned = playSkillById(request.skill);
  if (pinned && pinned.mode === mode) return { skillId: pinned.id, grade: pinned.grade, masterySnapshot: topic.mastery };
  if (request.challenge) {
    const status = gradeUpStatus(topic);
    return status?.kind === "challenge" && !status.needsPractice
      ? { ...challengeFor(topic), fledging: true, masterySnapshot: topic.mastery }
      : null;
  }
  if (!request.mix) return null;
  const grade = topic.open.includes(request.grade) ? request.grade : topic.grade;
  return { ...larkitPicks({ ...topic, grade }), masterySnapshot: topic.mastery };
}

/** What a skill session is called under the topic title; null on the ladder. */
export function sessionLabel(session, mode) {
  if (!session?.skillIds) return null;
  if (session.challenge) return `Fledging Flight to ${GRADE_LABELS[nextTopicGrade(mode, session.grade)] || "the next grade"}`;
  if (session.pinned) return playSkillById(session.skillIds[0])?.title ?? null;
  return `Mixed · ${GRADE_LABELS[session.grade]}`;
}

function gradeUpNote(gradeUp, gradeLabel, topicLabel) {
  if (!gradeUp) return null;
  if (gradeUp.passed) return { headline: `You finished ${gradeLabel} ${topicLabel}!`, detail: `${gradeUp.nextGradeLabel} is open.` };
  if (gradeUp.challenge) {
    return {
      headline: `${gradeUp.score} of ${GRADE_UP.questions} — not yet.`,
      detail: gradeUp.reearn ? "One more good practice first, then your Fledging Flight comes back." : "A little more practice, then try again.",
    };
  }
  if (gradeUp.ready) return { headline: `Every ${gradeLabel} skill mastered!`, detail: `Next time: a Fledging Flight — six questions to open ${gradeUp.nextGradeLabel}.` };
  if (gradeUp.complete) return { headline: `${topicLabel} complete!`, detail: "Every skill in every grade. Time for a new topic." };
  return null;
}

/**
 * A finished skill session, settled: the patch to save on the progress row
 * (never the level) and what the end card says. Mastery comes from the closed
 * practice record, by the same reducer that can rebuild it from the log.
 */
export function settleSkillSession(mode, progress = {}, context = {}, session, closedRecord) {
  if (!session?.skillIds) return null;
  const before = resolveTopic(mode, progress, context);
  if (!before) return null;
  // (A challenge record is kind "fledging", which the reducer ignores.)
  const skillMastery = afterPractice(applySession(before.mastery, closedRecord));
  let patch = { ...before.toSave, skillMastery };
  const after = { ...before, mastery: skillMastery };
  let gradeUp = null;
  if (session.challenge) {
    const score = session.firstTryCorrect ?? 0;
    const result = applyChallengeResult(before, score);
    patch = { ...patch, ...result.patch };
    gradeUp = { challenge: true, passed: result.passed, reearn: Boolean(result.reearn), nextGrade: result.nextGrade, score };
  } else {
    const status = gradeUpStatus(after);
    if (status?.kind === "advance" || status?.kind === "auto") {
      patch = { ...patch, ...advanceGrade(after, status.nextGrade) };
      gradeUp = { passed: true, nextGrade: status.nextGrade };
    } else if (status) {
      gradeUp = { ready: status.kind === "challenge", complete: status.kind === "complete", nextGrade: status.nextGrade };
    }
  }
  const view = gradeView(after, session.grade);
  const gradeLabel = GRADE_LABELS[session.grade];
  const topicLabel = TOPIC_LABELS[mode];
  const labelled = gradeUp && { ...gradeUp, nextGradeLabel: gradeUp.nextGrade ? GRADE_LABELS[gradeUp.nextGrade] : null };
  return {
    patch,
    standing: {
      gradeLabel,
      topicLabel,
      skills: view.skills,
      mastered: view.mastered,
      total: view.total,
      line: `${gradeLabel} · ${view.mastered} of ${view.total} skills mastered`,
      newlyMastered: Object.keys(skillMastery)
        .filter((id) => skillMastery[id]?.state === STATES.MASTERED && before.mastery[id]?.state !== STATES.MASTERED)
        .map((id) => playSkillById(id)?.title)
        .filter(Boolean),
      gradeUp: labelled,
      gradeUpNote: gradeUpNote(labelled, gradeLabel, topicLabel),
    },
  };
}

/** The Home tile chip: "Grade 3 · 1/3", or "New" before any practice. */
export function topicChip(mode, progress = {}, context = {}) {
  const topic = resolveTopic(mode, progress, context);
  if (!topic) return null;
  const view = gradeView(topic);
  const started = view.skills.some((skill) => skill.state !== STATES.NEW);
  return {
    grade: topic.grade,
    gradeLabel: GRADE_LABELS[topic.grade],
    mastered: view.mastered,
    total: view.total,
    started,
    text: `${GRADE_LABELS[topic.grade]} · ${view.mastered}/${view.total}`,
    flightReady: gradeUpStatus(topic)?.kind === "challenge" && !topic.gradeUp.needsPractice,
  };
}

/** What a grown-up can change for one topic: open a grade, pin a skill. */
export function parentControls(mode, progress = {}, context = {}) {
  const topic = resolveTopic(mode, progress, context);
  if (!topic) return null;
  return {
    gradeUnlocked: topic.gradeUnlocked,
    grades: topicGrades(mode).map((g) => {
      const open = topic.open.includes(g);
      return { grade: g, open, label: open ? `${GRADE_LABELS[g]} — open` : `Open ${GRADE_LABELS[g]}` };
    }),
    pinnedSkillId: topic.pinnedSkillId,
    pinGroups: topic.open.map((g) => ({
      grade: g,
      label: GRADE_LABELS[g],
      skills: skillsForPlay(g, mode).map((skill) => ({ id: skill.id, title: skill.title })),
    })),
  };
}

/** The patch a grown-up opening `grade` saves (empty when the topic has no such grade). */
export function unlockGradePatch(mode, progress = {}, context = {}, grade) {
  const topic = resolveTopic(mode, progress, context);
  return topic ? unlockGrade(topic, grade) : {};
}

export { GRADE_UP, mergeTopicState };
