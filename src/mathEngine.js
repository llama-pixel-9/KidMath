export const SESSION_SIZE = 15;
export const MAX_LEVEL = 10;
export const STARTING_LEVEL = 1;
export const MODES = ["addition", "subtraction", "multiplication"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const ADDITION_RANGES = [
  { aMin: 1, aMax: 3, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 9, bMin: 10, bMax: 15 },
  { aMin: 5, aMax: 15, bMin: 5, bMax: 15 },
  { aMin: 10, aMax: 20, bMin: 10, bMax: 20 },
  { aMin: 10, aMax: 30, bMin: 1, bMax: 20 },
  { aMin: 10, aMax: 30, bMin: 10, bMax: 30 },
  { aMin: 10, aMax: 40, bMin: 10, bMax: 30 },
  { aMin: 10, aMax: 50, bMin: 10, bMax: 50 },
];

const MULTIPLICATION_RANGES = [
  { aMin: 1, aMax: 3, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 12 },
  { aMin: 5, aMax: 12, bMin: 5, bMax: 12 },
  { aMin: 7, aMax: 12, bMin: 7, bMax: 12 },
];

function clampLevel(level) {
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

export function generateQuestion(mode, level) {
  const idx = clampLevel(level) - 1;
  let a, b, op, answer;

  switch (mode) {
    case "addition": {
      op = "+";
      const r = ADDITION_RANGES[idx];
      a = randInt(r.aMin, r.aMax);
      b = randInt(r.bMin, r.bMax);
      answer = a + b;
      break;
    }
    case "subtraction": {
      op = "−";
      const r = ADDITION_RANGES[idx];
      a = randInt(r.aMin, r.aMax);
      b = randInt(r.bMin, r.bMax);
      if (a < b) [a, b] = [b, a];
      if (a === b) a += 1;
      answer = a - b;
      break;
    }
    case "multiplication": {
      op = "×";
      const r = MULTIPLICATION_RANGES[idx];
      a = randInt(r.aMin, r.aMax);
      b = randInt(r.bMin, r.bMax);
      answer = a * b;
      break;
    }
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }

  return { a, b, op, answer, level };
}

export function generateChoices(answer, count = 4) {
  const choices = new Set([answer]);
  const spread = Math.max(3, Math.ceil(answer * 0.3));

  while (choices.size < count) {
    const offset = randInt(1, spread) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + offset;
    if (candidate >= 0 && candidate !== answer) {
      choices.add(candidate);
    }
  }

  return shuffleArray([...choices]);
}

// --- Adaptive Session Engine ---

import { loadProgressSync } from "./progressStore";

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
    retryQ.choices = generateChoices(retryQ.answer);
    return { question: retryQ, isRetry: true };
  }

  const q = generateQuestion(session.mode, session.level);
  q.choices = generateChoices(q.answer);
  return { question: q, isRetry: false };
}

export function recordAnswer(session, question, chosenAnswer, responseTimeMs, wasRetry) {
  const correct = chosenAnswer === question.answer;
  const next = { ...session };

  if (wasRetry) {
    // Retries are "free" — they don't advance questionsAnswered or the progress bar.
    // After any retry (pass or fail), reset spacing so we wait before the next one.
    next.questionsSinceRetry = 0;

    if (correct) {
      next.correctStreak = session.correctStreak + 1;
      next.retriesMastered = session.retriesMastered + 1;
      next.mistakeBank = session.mistakeBank.filter(
        (q) => !(q.a === question.a && q.b === question.b && q.op === question.op)
      );
    } else {
      next.correctStreak = 0;
      // Keep in mistake bank — it will come back again after RETRY_SPACING more questions
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

  // Incorrect on a new question — move on, add to mistake bank for later
  next.correctStreak = 0;
  next.mistakesAtLevel = session.mistakesAtLevel + 1;

  const alreadyInBank = session.mistakeBank.some(
    (q) => q.a === question.a && q.b === question.b && q.op === question.op
  );
  if (!alreadyInBank) {
    next.mistakeBank = [...session.mistakeBank, { a: question.a, b: question.b, op: question.op, answer: question.answer }];
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
    q.choices = generateChoices(q.answer);
    questions.push(q);
  }
  return questions;
}
