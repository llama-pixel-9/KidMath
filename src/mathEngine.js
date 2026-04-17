import { MODE_IDS, getModeConfig } from "./modes";
import { shuffleArray } from "./modes/helpers";
import { loadProgressSync } from "./progressStore";

export const SESSION_SIZE = 15;
export const MAX_LEVEL = 10;
export const STARTING_LEVEL = 1;
export const MODES = MODE_IDS;

export { shuffleArray };

function clampLevel(level) {
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

export function generateQuestion(mode, level) {
  const config = getModeConfig(mode);
  const q = config.generate(clampLevel(level));
  q.mode = mode;
  return q;
}

export function generateChoices(answer, count = 4, question = null) {
  if (question?.mode) {
    try {
      const config = getModeConfig(question.mode);
      if (config.generateChoices) {
        return config.generateChoices(answer, question);
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
    if (candidate >= 0 && candidate !== answer) {
      choices.add(candidate);
    }
  }

  return shuffleArray([...choices]);
}

// --- Adaptive Session Engine ---

const RETRY_SPACING = 5;

export function createAdaptiveSession(mode, sessionSize = SESSION_SIZE) {
  const saved = loadProgressSync(mode);
  return {
    mode,
    level: saved.level,
    questionsAnswered: 0,
    firstTryCorrect: 0,
    retriesMastered: 0,
    correctStreak: 0,
    mistakesAtLevel: 0,
    mistakeBank: saved.mistakeBank,
    responseTimesMs: [],
    sessionSize,
    questionsSinceRetry: 0,
  };
}

export function getNextQuestion(session) {
  if (session.mistakeBank.length > 0 && session.questionsSinceRetry >= RETRY_SPACING) {
    const retryQ = { ...session.mistakeBank[0] };
    retryQ.choices = generateChoices(retryQ.answer, 4, retryQ);
    return { question: retryQ, isRetry: true };
  }

  const q = generateQuestion(session.mode, session.level);
  q.choices = generateChoices(q.answer, 4, q);
  return { question: q, isRetry: false };
}

export function recordAnswer(session, question, chosenAnswer, responseTimeMs, wasRetry) {
  const correct = chosenAnswer === question.answer;
  const next = { ...session };

  if (wasRetry) {
    next.questionsSinceRetry = 0;

    if (correct) {
      next.correctStreak = session.correctStreak + 1;
      next.retriesMastered = session.retriesMastered + 1;
      next.mistakeBank = session.mistakeBank.filter(
        (q) => !(q.a === question.a && q.b === question.b && q.op === question.op)
      );
    } else {
      next.correctStreak = 0;
    }

    return { session: next, correct, levelChanged: false, newLevel: next.level };
  }

  // --- New (non-retry) question ---
  next.questionsAnswered = session.questionsAnswered + 1;
  next.questionsSinceRetry = session.questionsSinceRetry + 1;

  if (correct) {
    next.correctStreak = session.correctStreak + 1;
    next.firstTryCorrect = session.firstTryCorrect + 1;
    next.responseTimesMs = [...session.responseTimesMs.slice(-4), responseTimeMs];

    let levelChanged = false;
    const avgTime =
      next.responseTimesMs.reduce((a, b) => a + b, 0) / next.responseTimesMs.length;

    if (next.correctStreak >= 5 && avgTime < 8000 && next.level < MAX_LEVEL) {
      next.level = next.level + 1;
      next.correctStreak = 0;
      next.mistakesAtLevel = 0;
      levelChanged = true;
    } else if (next.correctStreak >= 8 && next.level < MAX_LEVEL) {
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

  const alreadyInBank = session.mistakeBank.some(
    (q) => q.a === question.a && q.b === question.b && q.op === question.op
  );
  if (!alreadyInBank) {
    next.mistakeBank = [
      ...session.mistakeBank,
      { a: question.a, b: question.b, op: question.op, answer: question.answer },
    ];
  }

  let levelChanged = false;
  if (next.mistakesAtLevel >= 2 && next.level > 1) {
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

export function generateWorksheetSet(mode, level, size = SESSION_SIZE) {
  const questions = [];
  for (let i = 0; i < size; i++) {
    const q = generateQuestion(mode, level);
    q.choices = generateChoices(q.answer, 4, q);
    questions.push(q);
  }
  return questions;
}
