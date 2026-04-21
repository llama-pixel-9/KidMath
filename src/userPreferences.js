import { supabase } from "./supabaseClient";

// Per-user preference storage. Uses Supabase when the user is signed in so
// settings sync across devices and persist across sign-outs; falls back to
// localStorage for anonymous play. The local copy is also kept in sync while
// signed in so the initial paint doesn't flicker before the cloud fetch
// resolves.

const WORD_PROBLEM_PREF_KEY = "kidmath-allow-word-problems";

export const DEFAULT_ALLOW_WORD_PROBLEMS = false;

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

async function fetchCloudAllowWordProblems(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("user_preferences")
    .select("allow_word_problems")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return Boolean(data.allow_word_problems);
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
 */
export async function loadAllowWordProblems(userId) {
  if (!userId) return readLocalAllowWordProblems();
  const cloud = await fetchCloudAllowWordProblems(userId);
  if (cloud != null) {
    writeLocalAllowWordProblems(cloud);
    return cloud;
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
