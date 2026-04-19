import { MODE_IDS, getModeConfig } from "./modes";
import { shuffleArray } from "./modes/helpers";
import { buildItemKey, ITEM_FAMILIES } from "./modes/itemMetadata";
import { validateChoices, validateQuestion } from "./modes/itemQuality";
import { loadProgressSync } from "./progressStore";
import { buildQuestionFromBankItem, selectApprovedApplicationItem } from "./itemBank.js";

export const SESSION_SIZE = 15;
export const MAX_LEVEL = 10;
export const STARTING_LEVEL = 1;
export const MODES = MODE_IDS;

export { shuffleArray };

const RETRY_SPACING = 5;
const REVIEW_INTERVALS = [4, 8, 16];
const MAX_REVIEW_ITEMS = 20;
const RECENT_BANK_WINDOW = 8;
const MAX_BANK_ITEM_STATS = 200;

function clampLevel(level) {
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

function createSkillMastery(modeConfig) {
  const skills = modeConfig.subskills || ["overall"];
  return Object.fromEntries(
    skills.map((skill) => [
      skill,
      { attempts: 0, correct: 0, streak: 0, mastery: 0, lastSeenAt: -1, lastCorrectAt: -1 },
    ])
  );
}

function getSkillMasteryRate(entry) {
  if (!entry || entry.attempts === 0) return 0.5;
  return entry.correct / entry.attempts;
}

function getWeakestSubskill(session, modeConfig) {
  const skills = modeConfig.subskills || Object.keys(session.skillMastery || {});
  if (skills.length === 0) return "overall";
  let weakest = skills[0];
  let weakestScore = Number.POSITIVE_INFINITY;
  for (const skill of skills) {
    const score = getSkillMasteryRate(session.skillMastery?.[skill]);
    if (score < weakestScore) {
      weakestScore = score;
      weakest = skill;
    }
  }
  return weakest;
}

function getMasterySnapshot(session, modeConfig) {
  const weakestSubskill = getWeakestSubskill(session, modeConfig);
  return {
    weakestSubskill,
    weakestScore: getSkillMasteryRate(session.skillMastery?.[weakestSubskill]),
  };
}

function getNextFamily(session, modeConfig) {
  const families = modeConfig.families || Object.values(ITEM_FAMILIES);
  const cursor = session.familyCursor ?? 0;
  return { nextFamily: families[cursor % families.length], nextCursor: cursor + 1 };
}

function cloneQuestionForReview(question, dueAt) {
  return {
    ...question,
    choices: undefined,
    dueAt,
    retryCount: (question.retryCount || 0) + 1,
    itemKey: question.itemKey || buildItemKey(question),
    mode: question.mode,
  };
}

function updateSkillMastery(session, question, correct) {
  const subskill = question.metadata?.subskill || "overall";
  const current = session.skillMastery[subskill] || {
    attempts: 0,
    correct: 0,
    streak: 0,
    mastery: 0,
    lastSeenAt: -1,
    lastCorrectAt: -1,
  };
  const attempts = current.attempts + 1;
  const hit = current.correct + (correct ? 1 : 0);
  const mastery = hit / attempts;
  return {
    ...session.skillMastery,
    [subskill]: {
      attempts,
      correct: hit,
      streak: correct ? current.streak + 1 : 0,
      mastery,
      lastSeenAt: session.questionsAnswered,
      lastCorrectAt: correct ? session.questionsAnswered : current.lastCorrectAt,
    },
  };
}

function logAnalyticsEvent(session, payload) {
  return [...(session.analyticsEvents || []), payload].slice(-200);
}

// Module-level observability: increments whenever an application item is
// requested. Exposed for analytics/sampling tools so we can monitor the
// itemSource=bank vs itemSource=generated rate over time.
const bankFallbackStats = { applicationRequested: 0, bankServed: 0, fallbackToGenerated: 0 };
const warnedFallbackKeys = new Set();

export function getBankFallbackStats() {
  return { ...bankFallbackStats };
}

export function resetBankFallbackStats() {
  bankFallbackStats.applicationRequested = 0;
  bankFallbackStats.bankServed = 0;
  bankFallbackStats.fallbackToGenerated = 0;
  warnedFallbackKeys.clear();
}

export function generateQuestion(mode, level, context = null) {
  const config = getModeConfig(mode);
  const targetLevel = clampLevel(level);
  const q = config.generate(targetLevel, context || undefined);
  const isApplication = q.metadata?.itemFamily === ITEM_FAMILIES.APPLICATION;
  const allowWordProblems = context?.allowWordProblems ?? true;
  const requireBankForApplication = context?.requireBankForApplication === true;

  let bankQuestion = null;
  if (isApplication && allowWordProblems) {
    bankFallbackStats.applicationRequested += 1;
    const bankItem = selectApprovedApplicationItem({
      modeId: mode,
      level: targetLevel,
      targetSubskill: context?.targetSubskill || q.metadata?.subskill,
      recentItemIds: context?.recentBankItemIds || [],
    });
    bankQuestion = buildQuestionFromBankItem(bankItem, targetLevel);
    if (bankQuestion) {
      bankFallbackStats.bankServed += 1;
    } else {
      bankFallbackStats.fallbackToGenerated += 1;
      if (requireBankForApplication) {
        throw new Error(
          `Bank-required application item missing for mode=${mode} level=${targetLevel} subskill=${context?.targetSubskill || q.metadata?.subskill}`
        );
      }
      const subskill = context?.targetSubskill || q.metadata?.subskill;
      const warnKey = `${mode}::${targetLevel}::${subskill}`;
      if (!warnedFallbackKeys.has(warnKey)) {
        warnedFallbackKeys.add(warnKey);
        console.warn(
          `[itemBank] No approved application item for mode=${mode} level=${targetLevel} subskill=${subskill}; falling back to generated.`
        );
      }
    }
  }
  const bankMetadata = bankQuestion?.metadataOverrides || null;
  const bankPayload = bankQuestion ? { ...bankQuestion } : null;
  if (bankPayload) delete bankPayload.metadataOverrides;
  const effectiveQuestion = bankQuestion
    ? {
        ...bankPayload,
        mode,
        metadata: {
          ...(q.metadata || {}),
          subskill: bankMetadata?.bankSubskill || q.metadata?.subskill,
          itemId: bankMetadata?.itemId,
          itemSource: bankMetadata?.itemSource,
          reviewStatus: bankMetadata?.reviewStatus,
          structureType: bankMetadata?.structureType || q.metadata?.structureType || null,
        },
      }
    : q;
  effectiveQuestion.mode = mode;
  effectiveQuestion.metadata = effectiveQuestion.metadata || {};
  effectiveQuestion.metadata.modeId = effectiveQuestion.metadata.modeId || mode;
  effectiveQuestion.itemKey = effectiveQuestion.itemKey || buildItemKey(effectiveQuestion);
  const quality = validateQuestion(effectiveQuestion);
  if (!quality.valid) {
    throw new Error(`Invalid question for mode ${mode}: ${quality.errors.join("; ")}`);
  }
  return effectiveQuestion;
}

export function generateChoices(answer, count = 4, question = null) {
  if (question?.mode) {
    try {
      const config = getModeConfig(question.mode);
      if (config.generateChoices) {
        const customChoices = config.generateChoices(answer, question);
        const validation = validateChoices(question, customChoices);
        if (!validation.valid) throw new Error(validation.errors.join("; "));
        return customChoices;
      }
    } catch {
      // fall through to default
    }
  }

  const choices = new Set([answer]);
  const spread = Math.max(3, Math.ceil(Math.abs(answer) * 0.3));

  while (choices.size < count) {
    const offset = (Math.floor(Math.random() * spread) + 1) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + offset;
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
  }

  const finalChoices = shuffleArray([...choices]);
  const validation = validateChoices(question || { answer }, finalChoices);
  if (!validation.valid) {
    throw new Error(`Invalid choices: ${validation.errors.join("; ")}`);
  }
  return finalChoices;
}

// --- Adaptive Session Engine ---

export function createAdaptiveSession(mode, sessionSize = SESSION_SIZE, options = {}) {
  const saved = loadProgressSync(mode);
  const modeConfig = getModeConfig(mode);
  const allowWordProblems = options.allowWordProblems ?? false;
  return {
    mode,
    level: saved.level,
    questionsAnswered: 0,
    firstTryCorrect: 0,
    retriesMastered: 0,
    correctStreak: 0,
    mistakesAtLevel: 0,
    mistakeBank: (saved.mistakeBank || []).slice(-MAX_REVIEW_ITEMS),
    responseTimesMs: [],
    sessionSize,
    questionsSinceRetry: 0,
    familyCursor: 0,
    skillMastery: createSkillMastery(modeConfig),
    analyticsEvents: [],
    allowWordProblems,
    recentBankItemIds: Array.isArray(saved.recentBankItemIds) ? saved.recentBankItemIds.slice(-RECENT_BANK_WINDOW) : [],
    bankItemStats: saved.bankItemStats && typeof saved.bankItemStats === "object" ? saved.bankItemStats : {},
  };
}

export function getNextQuestion(session) {
  const dueReview = session.mistakeBank.find(
    (q) =>
      (q.dueAt ?? RETRY_SPACING) <= session.questionsAnswered &&
      !(
        session.allowWordProblems === false &&
        q.metadata?.itemFamily === ITEM_FAMILIES.APPLICATION
      )
  );
  if (dueReview && session.questionsSinceRetry >= RETRY_SPACING) {
    const retryQ = { ...dueReview, mode: dueReview.mode || session.mode };
    retryQ.itemKey = retryQ.itemKey || buildItemKey(retryQ);
    retryQ.choices = generateChoices(retryQ.answer, 4, retryQ);
    return { question: retryQ, isRetry: true };
  }

  const modeConfig = getModeConfig(session.mode);
  const { nextFamily, nextCursor } = getNextFamily(session, modeConfig);
  const scheduledFamily =
    session.allowWordProblems === false && nextFamily === ITEM_FAMILIES.APPLICATION
      ? ITEM_FAMILIES.PROCEDURAL
      : nextFamily;
  const targetSubskill = getWeakestSubskill(session, modeConfig);
  const q = generateQuestion(session.mode, session.level, {
    itemFamily: scheduledFamily,
    targetSubskill,
    allowWordProblems: session.allowWordProblems !== false,
    recentBankItemIds: session.recentBankItemIds || [],
  });
  q.scheduler = { targetSubskill, itemFamily: scheduledFamily };
  q.nextFamilyCursor = nextCursor;
  q.choices = generateChoices(q.answer, 4, q);
  return { question: q, isRetry: false };
}

function updateBankItemStats(session, question, correct, responseTimeMs) {
  const itemId = question.metadata?.itemId;
  if (!itemId || question.metadata?.itemSource !== "bank") return session.bankItemStats || {};
  const current = session.bankItemStats?.[itemId] || {
    attempts: 0,
    firstTryCorrect: 0,
    correct: 0,
    totalResponseMs: 0,
    lastSeenAt: -1,
  };
  const next = {
    attempts: current.attempts + 1,
    firstTryCorrect: current.firstTryCorrect + (correct && current.attempts === 0 ? 1 : 0),
    correct: current.correct + (correct ? 1 : 0),
    totalResponseMs: current.totalResponseMs + (responseTimeMs || 0),
    lastSeenAt: session.questionsAnswered,
  };
  const merged = { ...(session.bankItemStats || {}), [itemId]: next };
  const keys = Object.keys(merged);
  if (keys.length <= MAX_BANK_ITEM_STATS) return merged;
  // Drop the least-recently seen items to bound size.
  const sorted = keys
    .map((id) => [id, merged[id].lastSeenAt ?? -1])
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_BANK_ITEM_STATS);
  return Object.fromEntries(sorted.map(([id]) => [id, merged[id]]));
}

function appendRecentBankItemId(recent, itemId) {
  if (!itemId) return recent;
  const next = [...(recent || []).filter((id) => id !== itemId), itemId];
  return next.slice(-RECENT_BANK_WINDOW);
}

export function recordAnswer(session, question, chosenAnswer, responseTimeMs, wasRetry) {
  const correct = chosenAnswer === question.answer;
  const next = { ...session };
  next.skillMastery = updateSkillMastery(session, question, correct);
  next.analyticsEvents = logAnalyticsEvent(session, {
    mode: session.mode,
    level: session.level,
    wasRetry,
    correct,
    responseTimeMs,
    itemId: question.metadata?.itemId || null,
    itemSource: question.metadata?.itemSource || "generated",
    itemFamily: question.metadata?.itemFamily || "unknown",
    subskill: question.metadata?.subskill || "unknown",
  });

  if (wasRetry) {
    next.questionsSinceRetry = 0;
    next.bankItemStats = updateBankItemStats(session, question, correct, responseTimeMs);

    if (correct) {
      next.correctStreak = session.correctStreak + 1;
      next.retriesMastered = session.retriesMastered + 1;
      next.mistakeBank = session.mistakeBank.filter((q) => q.itemKey !== question.itemKey);
    } else {
      next.correctStreak = 0;
      next.mistakeBank = session.mistakeBank.map((q) => {
        if (q.itemKey !== question.itemKey) return q;
        const index = Math.min(REVIEW_INTERVALS.length - 1, q.retryCount || 0);
        return cloneQuestionForReview(q, next.questionsAnswered + REVIEW_INTERVALS[index]);
      });
    }

    return { session: next, correct, levelChanged: false, newLevel: next.level };
  }

  // --- New (non-retry) question ---
  next.questionsAnswered = session.questionsAnswered + 1;
  next.questionsSinceRetry = session.questionsSinceRetry + 1;
  if (question.nextFamilyCursor != null) next.familyCursor = question.nextFamilyCursor;
  next.bankItemStats = updateBankItemStats(session, question, correct, responseTimeMs);
  next.recentBankItemIds = appendRecentBankItemId(
    session.recentBankItemIds,
    question.metadata?.itemSource === "bank" ? question.metadata?.itemId : null
  );

  if (correct) {
    next.correctStreak = session.correctStreak + 1;
    next.firstTryCorrect = session.firstTryCorrect + 1;
    next.responseTimesMs = [...session.responseTimesMs.slice(-4), responseTimeMs];

    let levelChanged = false;
    const avgTime = next.responseTimesMs.reduce((a, b) => a + b, 0) / next.responseTimesMs.length;
    const { weakestScore } = getMasterySnapshot(next, getModeConfig(session.mode));

    if (next.correctStreak >= 4 && avgTime < 8500 && weakestScore >= 0.8 && next.level < MAX_LEVEL) {
      next.level = next.level + 1;
      next.correctStreak = 0;
      next.mistakesAtLevel = 0;
      levelChanged = true;
    } else if (next.correctStreak >= 7 && weakestScore >= 0.72 && next.level < MAX_LEVEL) {
      next.level = next.level + 1;
      next.correctStreak = 0;
      next.mistakesAtLevel = 0;
      levelChanged = true;
    }

    return { session: next, correct: true, levelChanged, newLevel: next.level };
  }

  // Incorrect on a new question
  next.correctStreak = 0;
  next.mistakesAtLevel = session.mistakesAtLevel + 1;

  const alreadyInBank = session.mistakeBank.some((q) => q.itemKey === question.itemKey);
  if (!alreadyInBank) {
    next.mistakeBank = [
      ...session.mistakeBank,
      cloneQuestionForReview(question, next.questionsAnswered + RETRY_SPACING),
    ].slice(-MAX_REVIEW_ITEMS);
  }

  let levelChanged = false;
  const { weakestScore } = getMasterySnapshot(next, getModeConfig(session.mode));
  if ((next.mistakesAtLevel >= 2 || weakestScore < 0.45) && next.level > 1) {
    next.level = next.level - 1;
    next.mistakesAtLevel = 0;
    levelChanged = true;
  }

  return { session: next, correct: false, levelChanged, newLevel: next.level };
}

export function isSessionComplete(session) {
  return session.questionsAnswered >= session.sessionSize;
}

// --- Worksheet generation (fixed level, batch) ---

export function generateWorksheetSet(mode, level, size = SESSION_SIZE, options = {}) {
  const questions = [];
  const context = {
    allowWordProblems: options.allowWordProblems ?? false,
  };
  for (let i = 0; i < size; i++) {
    const q = generateQuestion(mode, level, context);
    q.choices = generateChoices(q.answer, 4, q);
    questions.push(q);
  }
  return questions;
}
