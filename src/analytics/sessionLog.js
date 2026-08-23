import { supabase } from "../supabaseClient";

/**
 * The practice log: one record per finished session, with every question the
 * kid answered inside it. This is what the parent report is built from —
 * before it, nothing recorded *when* a session happened, how long it took, or
 * which prompts were missed (the engine computed all of it and dropped it at
 * session end).
 *
 * Storage mirrors progressStore: always mirrored to localStorage (scoped by
 * active kid, like engagement), and inserted into `practice_sessions` when
 * signed in. Local rows carry `synced` so a session finished offline or before
 * sign-in is uploaded the next time the log is read by a signed-in parent.
 *
 * A record is *opened* when a session starts and *closed* when it finishes;
 * a quit mid-session is still discarded (matching progress), so partial time
 * is not counted — see docs/parent-report.md for the follow-up.
 */

const STORE_KEY = "kidmath-sessions";
const ACTIVE_KID_KEY = "kidmath-active-kid"; // kidProfiles.js owns this key
const MAX_LOCAL_SESSIONS = 400;
const MAX_ATTEMPTS_PER_SESSION = 60;
const PAGE_SIZE = 1000;
/** A tab left open overnight must not become "8 hours of practice". */
export const MAX_SESSION_MS = 30 * 60 * 1000;

function activeKid() {
  try {
    return localStorage.getItem(ACTIVE_KID_KEY) || null;
  } catch {
    return null;
  }
}

function storeKey(kidId) {
  return kidId ? `${STORE_KEY}:${kidId}` : STORE_KEY;
}

function readLocal(kidId) {
  try {
    const rows = JSON.parse(localStorage.getItem(storeKey(kidId)));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeLocal(kidId, rows) {
  try {
    localStorage.setItem(storeKey(kidId), JSON.stringify(rows.slice(-MAX_LOCAL_SESSIONS)));
  } catch {
    /* quota or private mode — the cloud copy is the durable one */
  }
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function answerText(value) {
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

// --- record lifecycle (pure) ---

export function openSessionRecord({ mode, level, kind = "normal", now = Date.now(), kidId = activeKid() }) {
  return {
    id: newId(),
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

export function appendAttempt(record, { question, submitted, correct, wasRetry, responseTimeMs, level, now = Date.now() }) {
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

// --- persistence ---

function toRow(record, userId) {
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

function fromRow(row) {
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

async function getUser() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

async function uploadRows(userId, records) {
  if (!records.length) return false;
  const { error } = await supabase
    .from("practice_sessions")
    .upsert(records.map((r) => toRow(r, userId)), { onConflict: "id" });
  if (error) {
    console.warn("practice_sessions upsert failed", error.message);
    return false;
  }
  return true;
}

/**
 * Persist a closed record: the local mirror is written synchronously first so
 * a closed tab never loses the session, then the cloud copy when signed in
 * (flipping `synced` on success).
 */
export async function saveSessionRecord(record) {
  if (!record || !record.endedAt) return;
  const kidId = record.kidId;
  const put = (synced) =>
    writeLocal(kidId, [...readLocal(kidId).filter((r) => r.id !== record.id), { ...record, synced }]);
  put(false);
  const user = await getUser();
  if (user && (await uploadRows(user.id, [record]))) put(true);
}

/** Push any local rows that never reached the cloud (offline, or pre-sign-in). */
export async function flushUnsynced(userId, kidId) {
  const rows = readLocal(kidId);
  const pending = rows.filter((r) => !r.synced);
  if (!pending.length) return;
  const ok = await uploadRows(userId, pending);
  if (ok) writeLocal(kidId, rows.map((r) => ({ ...r, synced: true })));
}

/**
 * Every session for the report. Signed-in: the cloud copy (paginated — the
 * 1,000-row cap is a wrong read, not a slow one), filtered by kid when one is
 * given. Anonymous: this device's rows for the active kid.
 */
export async function loadSessions({ kidId = activeKid(), userId } = {}) {
  const user = userId ? { id: userId } : await getUser();
  if (user && supabase) {
    await flushUnsynced(user.id, kidId);
    const out = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase
        .from("practice_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (kidId) query = query.eq("kid_id", kidId);
      const { data, error } = await query;
      if (error) {
        console.warn("practice_sessions read failed", error.message);
        break;
      }
      out.push(...(data || []).map(fromRow));
      if (!data || data.length < PAGE_SIZE) return { source: "cloud", sessions: out };
    }
  }
  return { source: "local", sessions: readLocal(kidId).slice().sort((a, b) => a.startedAt - b.startedAt) };
}

export function loadSessionsSync(kidId = activeKid()) {
  return readLocal(kidId).slice().sort((a, b) => a.startedAt - b.startedAt);
}
