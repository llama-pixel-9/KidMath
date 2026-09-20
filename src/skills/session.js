/* Skill sessions — what a play session practices once a kid (or a parent, or
 * "Larkit picks") has chosen skills instead of riding the level ladder.
 *
 *   pinned     one skill, every question.
 *   mixed      a (grade, topic)'s skills: the few weakest unmastered ones in
 *              focus, interleaved (never three in a row from one skill), about
 *              one question in five a review of a mastered skill, the next
 *              skill rotating in when a focus skill is going well.
 *   challenge  the grade-up test: six questions spread across the grade.
 *
 * What stays as it was: the mistake bank and its spaced retries, family
 * rotation, recent-item avoidance, the word-problems preference, item stats.
 * What goes: promotion and demotion of the integer level — inside a skill
 * session the level only follows the skill being asked.
 *
 * Every worded question is an approved bank row from the skill's own cell;
 * drills are built to the skill's claim. mathEngine calls in here; this file
 * calls back into it only inside functions, so the import cycle is inert.
 */
import { selectApprovedBankItem } from "../itemBank/index.js";
import { buildBankQuestion, generateChoices, generateQuestion, questionAnswerType } from "../mathEngine.js";
import { buildComputationQuestion, computationKeyOf } from "./computationPlay.js";
import { STATES, practiceOrder, stateOf } from "./mastery.js";
import { playSkillById } from "./play.js";
import { cellMatches, storyMatches, withinNumbers } from "./skillPool.js";

const FOCUS_SIZE = 3;
const REVIEW_EVERY = 5;
const MAX_IN_A_ROW = 2;
// In-session sign that a focus skill is going well enough to bring the next in.
const ROTATE_AFTER = { attempts: 5, accuracy: 0.8 };
const RECENT_COMPUTATIONS = 24;

/** The extra fields a skill session carries — all JSON-safe (Swift holds it). */
export function initSkillSession(options = {}) {
  const ids = options.skillIds?.length ? options.skillIds : options.skillId ? [options.skillId] : [];
  const skills = [...new Set(ids.map((id) => playSkillById(id)?.id).filter(Boolean))].map(playSkillById);
  if (!skills.length) return null;
  const mastery = options.masterySnapshot || {};
  const pinned = Boolean(options.skillId) || skills.length === 1;
  const challenge = Boolean(options.challenge);
  const ordered = pinned || challenge ? skills : practiceOrder(mastery, skills);
  const unmastered = ordered.filter((skill) => stateOf(mastery, skill.id) !== STATES.MASTERED || mastery[skill.id]?.needsReview);
  const working = pinned || challenge ? skills : unmastered.length ? unmastered : skills;
  return {
    skillIds: skills.map((skill) => skill.id),
    pinned,
    challenge,
    grade: options.grade ?? skills[0].grade,
    focus: working.slice(0, FOCUS_SIZE).map((skill) => skill.id),
    bench: working.slice(FOCUS_SIZE).map((skill) => skill.id),
    reviewPool: pinned || challenge ? [] : skills.filter((skill) => !working.includes(skill)).map((skill) => skill.id),
    skillStats: {},
    lastSkillIds: [],
    recentComputationKeys: [],
    level: skills[0].level,
  };
}

function pickSkill(session) {
  if (session.challenge) return session.skillIds[session.questionsAnswered % session.skillIds.length];
  if (session.pinned) return session.skillIds[0];
  if (session.reviewPool.length && (session.questionsAnswered + 1) % REVIEW_EVERY === 0) {
    return session.reviewPool[session.questionsAnswered % session.reviewPool.length];
  }
  const last = session.lastSkillIds;
  const tooMany = last.length >= MAX_IN_A_ROW && last.every((id) => id === last[0]) ? last[0] : null;
  const candidates = session.focus.filter((id) => id !== tooMany);
  const pool = candidates.length ? candidates : session.focus;
  const asked = (id) => session.skillStats[id]?.attempts ?? 0;
  return [...pool].sort((a, b) => asked(a) - asked(b))[0];
}

function familiesFor(skill, session) {
  const families = [...skill.source.families];
  if (skill.stories && session.allowWordProblems !== false) families.push("application");
  return families;
}

function bankQuestionFor(skill, session) {
  const families = familiesFor(skill, session);
  const start = (session.familyCursor || 0) % families.length;
  for (let step = 0; step < families.length; step += 1) {
    const family = families[(start + step) % families.length];
    const story = family === "application";
    const filter = story ? { ...skill.stories, families: ["application"] } : skill.source;
    const item = selectApprovedBankItem({
      modeId: skill.mode,
      family,
      levels: filter.levels,
      accept: (row) =>
        cellMatches(row, skill.mode, filter) &&
        (story ? storyMatches(row.question || {}, skill.stories) : withinNumbers(row.question || {}, skill.source.numbers)),
      recentItemIds: session.recentBankItemIds || [],
      allowWordProblems: session.allowWordProblems !== false,
    });
    if (!item) continue;
    const level = Math.min(Math.max(skill.level, item.levelRange[0]), item.levelRange[1]);
    const q = buildBankQuestion(item, level);
    // finalizeQuestion keeps the generator scaffold's family; the row's is the truth.
    q.metadata.itemFamily = item.itemFamily;
    q.nextFamilyCursor = start + step + 1;
    return q;
  }
  return null;
}

/** The next fresh question of a skill session. */
export function nextSkillQuestion(session) {
  const skill = playSkillById(pickSkill(session));
  let q =
    skill.source.kind === "computation"
      ? buildComputationQuestion(skill, { avoidKeys: session.recentComputationKeys })
      : bankQuestionFor(skill, session);
  if (q) {
    q.skillId = skill.id;
  } else {
    // The skill's cell is not in memory (seed-only bank, offline). The screen
    // gates on this, but a session must never hang: serve what play served
    // before skills existed, un-stamped, so it is credited by its own cell.
    q = generateQuestion(skill.mode, skill.level, {
      targetSubskill: skill.source.subskills?.[0],
      allowWordProblems: session.allowWordProblems !== false,
      recentBankItemIds: session.recentBankItemIds || [],
    });
    if (questionAnswerType(q) === "choice") q.choices = generateChoices(q.answer, 4, q);
  }
  q.scheduler = { skillId: skill.id, itemFamily: q.metadata?.itemFamily };
  return q;
}

/** A due mistake-bank retry belongs in a pinned session only if it is the skill's. */
export function retryBelongs(session, retry) {
  if (!session.pinned) return true;
  return Boolean(retry.skillId) && playSkillById(retry.skillId)?.id === session.skillIds[0];
}

/** Bookkeeping after a fresh (non-retry) answer. Mutates the NEXT session copy. */
export function recordSkillAnswer(next, question, correct) {
  const id = question.skillId ? playSkillById(question.skillId)?.id : null;
  if (question.level) next.level = question.level;
  if (question.metadata?.itemSource === "skillSampler") {
    next.recentComputationKeys = [...(next.recentComputationKeys || []), computationKeyOf(question)].slice(-RECENT_COMPUTATIONS);
  }
  if (!id) return;
  const before = next.skillStats[id] || { attempts: 0, correct: 0 };
  const stats = { attempts: before.attempts + 1, correct: before.correct + (correct ? 1 : 0) };
  next.skillStats = { ...next.skillStats, [id]: stats };
  next.lastSkillIds = [...next.lastSkillIds, id].slice(-MAX_IN_A_ROW);
  const goingWell = stats.attempts >= ROTATE_AFTER.attempts && stats.correct / stats.attempts >= ROTATE_AFTER.accuracy;
  if (!next.pinned && !next.challenge && goingWell && next.bench.length && next.focus.includes(id)) {
    const [incoming, ...bench] = next.bench;
    next.focus = next.focus.map((focusId) => (focusId === id ? incoming : focusId));
    next.bench = bench;
    next.reviewPool = [...next.reviewPool, id];
  }
}

/** Can the bank in memory serve this skill? Drills always can. */
export function skillServable(skillId, { allowWordProblems = true } = {}) {
  const skill = playSkillById(skillId);
  if (!skill) return false;
  if (skill.source.kind === "computation") return true;
  return Boolean(bankQuestionFor(skill, { allowWordProblems, recentBankItemIds: [], familyCursor: 0 }));
}
