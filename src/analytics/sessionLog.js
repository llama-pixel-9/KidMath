import { supabase } from "../supabaseClient";
import {
  MAX_SESSION_MS,
  questionText,
  openSessionRecord as openRecordPure,
  appendAttempt,
  closeSessionRecord,
  toRow,
  fromRow,
} from "./sessionRecord.js";

// The record itself is pure and shared with the native engine bundle
// (sessionRecord.js); this module adds the active-kid default and the IO.
export { MAX_SESSION_MS, questionText, appendAttempt, closeSessionRecord };

/** openSessionRecord with the web's active-kid default. */
export function openSessionRecord(args = {}) {
  return openRecordPure({ kidId: activeKid(), ...args });
}


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
const PAGE_SIZE = 1000;

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
