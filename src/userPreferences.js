import { supabase } from "./supabaseClient";

// Per-user preference storage. Uses Supabase when the user is signed in so
// settings sync across devices and persist across sign-outs; falls back to
// localStorage for anonymous play. The local copy is also kept in sync while
// signed in so the initial paint doesn't flicker before the cloud fetch
// resolves.

const WORD_PROBLEM_PREF_KEY = "kidmath-allow-word-problems";

// Word problems are on unless the household turned them off (Sai,
// 2026-10-02): a browser with no saved choice and a new signed-in user get
// stories. Some topics still hold their v1 stories out of play
// (skills/storyHold.js); the setting cannot bring those back.
export const DEFAULT_ALLOW_WORD_PROBLEMS = true;

function readLocalAllowWordProblems() {
  try {
    const raw = localStorage.getItem(WORD_PROBLEM_PREF_KEY);
    if (raw == null) return DEFAULT_ALLOW_WORD_PROBLEMS;
    return raw === "true";
  } catch {
    return DEFAULT_ALLOW_WORD_PROBLEMS;
  }
}

function writeLocalAllowWordProblems(value) {
  try {
    localStorage.setItem(WORD_PROBLEM_PREF_KEY, String(Boolean(value)));
  } catch {
    // ignore quota / access issues
  }
}

// Synchronous best-effort read for first paint; returns the local value.
export function loadAllowWordProblemsSync() {
  return readLocalAllowWordProblems();
}

// What the cloud says: `{ ok: true, value }` with value null when the user
// has no row yet, or `{ ok: false }` when the read failed (offline, an
// expired session, a thrown client). A failed read is not "no row".
async function fetchCloudAllowWordProblems(userId) {
  if (!supabase || !userId) return { ok: false };
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("allow_word_problems")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { ok: false };
    return { ok: true, value: data ? Boolean(data.allow_word_problems) : null };
  } catch {
    return { ok: false };
  }
}

async function upsertCloudAllowWordProblems(userId, value) {
  if (!supabase || !userId) return;
  await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        allow_word_problems: Boolean(value),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
}

/**
 * Load the preference for a given user (null for anonymous). For signed-in
 * users, the cloud value wins; if the cloud has no row yet, we seed it from
 * whatever is in localStorage so a toggle made while logged out carries
 * through the user's first login. The local cache is refreshed to match.
 * A failed cloud read plays on the local value and writes nothing: seeding
 * the row then would overwrite a saved choice (say, off) with this device's
 * copy (say, the default on).
 */
export async function loadAllowWordProblems(userId) {
  if (!userId) return readLocalAllowWordProblems();
  const cloud = await fetchCloudAllowWordProblems(userId);
  if (!cloud.ok) return readLocalAllowWordProblems();
  if (cloud.value != null) {
    writeLocalAllowWordProblems(cloud.value);
    return cloud.value;
  }
  const local = readLocalAllowWordProblems();
  await upsertCloudAllowWordProblems(userId, local);
  return local;
}

/**
 * Persist a change. Writes to localStorage immediately so the next reload is
 * snappy even before auth resolves, and upserts to Supabase when a user id is
 * available.
 */
export async function saveAllowWordProblems(userId, value) {
  writeLocalAllowWordProblems(value);
  if (userId) await upsertCloudAllowWordProblems(userId, value);
}

// Calm mode (brand spec §12): drops confetti, card shake, and pop scaling.
// It never disables the star or the level bar. Local-only for now — it is a
// device-level comfort setting, like the sound toggle.
const CALM_MODE_KEY = "kidmath-calm-mode";

export function loadCalmMode() {
  try {
    return localStorage.getItem(CALM_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveCalmMode(value) {
  try {
    localStorage.setItem(CALM_MODE_KEY, String(Boolean(value)));
  } catch {
    // ignore quota / access issues
  }
}
