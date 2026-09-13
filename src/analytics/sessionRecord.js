/**
 * The practice-log RECORD — pure. One record per session with every attempt
 * inside it; sessionLog.js wraps this with the browser/cloud IO. Split out so
 * the native engine bundle can share it: iOS opens/appends/closes records
 * through KidMath.openSessionRecord & co. and writes the same rows to
 * practice_sessions, so the parent report counts iPad sessions too.
 */

const MAX_ATTEMPTS_PER_SESSION = 60;
/** A tab left open overnight must not become "8 hours of practice". */
export const MAX_SESSION_MS = 30 * 60 * 1000;

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function answerText(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(answerText).join(", ");
  if (typeof value === "object") {
    if ("numerator" in value && "denominator" in value) return `${value.numerator}/${value.denominator}`;
    return Object.values(value).map(answerText).join(" ");
  }
  return String(value);
}

/** The question as a parent would read it aloud. */
export function questionText(q) {
  const prompt = q?.display?.promptText;
  if (prompt) return String(prompt).replace(/\s+/g, " ").trim();
  if (q?.a != null && q?.op && q?.b != null) return `${q.a} ${q.op} ${q.b} = ?`;
  if (q?.prompt) return String(q.prompt);
  return "";
}

// --- record lifecycle ---

export function openSessionRecord({ mode, level, kind = "normal", now = Date.now(), kidId = null, id = newId() }) {
  return {
    id,
    kidId,
    mode,
    kind,
    levelStart: level,
    levelEnd: level,
    startedAt: now,
    endedAt: null,
    durationMs: 0,
    activeMs: 0,
    questions: 0,
    firstTryCorrect: 0,
    retriesMastered: 0,
    starsEarned: 0,
    attempts: [],
  };
}

export function appendAttempt(record, { question, submitted, correct, wasRetry, responseTimeMs, level, hintUsed = false, now = Date.now() }) {
  if (!record) return record;
  const attempt = {
    t: now,
    prompt: questionText(question),
    answer: answerText(question?.answer),
    given: answerText(submitted),
    correct: Boolean(correct),
    retry: Boolean(wasRetry),
    ms: Math.max(0, Math.round(responseTimeMs || 0)),
    level: level ?? record.levelEnd,
    subskill: question?.metadata?.subskill || "unknown",
    family: question?.metadata?.itemFamily || "unknown",
    itemId: question?.metadata?.itemId || null,
    // The kid opened the hint pane before answering (feature: hints).
    hint: Boolean(hintUsed),
  };
  const attempts = [...record.attempts, attempt].slice(-MAX_ATTEMPTS_PER_SESSION);
  return { ...record, attempts, activeMs: record.activeMs + attempt.ms };
}

export function closeSessionRecord(record, session, { starsEarned = 0, levelEnd, now = Date.now() } = {}) {
  if (!record) return record;
  const wall = Math.max(0, now - record.startedAt);
  return {
    ...record,
    endedAt: now,
    durationMs: Math.min(wall, MAX_SESSION_MS),
    levelEnd: levelEnd ?? session?.level ?? record.levelEnd,
    questions: session?.questionsAnswered ?? record.attempts.filter((a) => !a.retry).length,
    firstTryCorrect: session?.firstTryCorrect ?? record.attempts.filter((a) => !a.retry && a.correct).length,
    retriesMastered: session?.retriesMastered ?? 0,
    starsEarned,
  };
}

// --- practice_sessions row mapping ---

export function toRow(record, userId) {
  return {
    id: record.id,
    user_id: userId,
    kid_id: record.kidId || null,
    mode: record.mode,
    kind: record.kind,
    level_start: record.levelStart,
    level_end: record.levelEnd,
    started_at: new Date(record.startedAt).toISOString(),
    ended_at: new Date(record.endedAt ?? record.startedAt).toISOString(),
    duration_ms: record.durationMs,
    active_ms: record.activeMs,
    questions: record.questions,
    first_try_correct: record.firstTryCorrect,
    retries_mastered: record.retriesMastered,
    stars_earned: record.starsEarned,
    attempts: record.attempts,
  };
}

export function fromRow(row) {
  return {
    id: row.id,
    kidId: row.kid_id,
    mode: row.mode,
    kind: row.kind,
    levelStart: row.level_start,
    levelEnd: row.level_end,
    startedAt: Date.parse(row.started_at),
    endedAt: Date.parse(row.ended_at),
    durationMs: row.duration_ms ?? 0,
    activeMs: row.active_ms ?? 0,
    questions: row.questions ?? 0,
    firstTryCorrect: row.first_try_correct ?? 0,
    retriesMastered: row.retries_mastered ?? 0,
    starsEarned: row.stars_earned ?? 0,
    attempts: Array.isArray(row.attempts) ? row.attempts : [],
    synced: true,
  };
}
