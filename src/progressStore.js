import { supabase } from "./supabaseClient";

const PROGRESS_KEY = "kidmath-progress";
const STARTING_LEVEL = 1;
const MAX_LEVEL = 10;

function clampLevel(level) {
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

// --- localStorage helpers ---

function readLocalStore() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch {
    return {};
  }
}

function writeLocalStore(store) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
}

function loadLocal(mode) {
  const entry = readLocalStore()[mode];
  if (!entry) return { level: STARTING_LEVEL, mistakeBank: [], totalSessions: 0, lifetimeStars: 0 };
  return {
    level: clampLevel(entry.level ?? STARTING_LEVEL),
    mistakeBank: Array.isArray(entry.mistakeBank) ? entry.mistakeBank : [],
    totalSessions: entry.totalSessions ?? 0,
    lifetimeStars: entry.lifetimeStars ?? 0,
  };
}

function saveLocal(mode, { level, mistakeBank, firstTryCorrect }) {
  const store = readLocalStore();
  const prev = store[mode] || { totalSessions: 0, lifetimeStars: 0 };
  store[mode] = {
    level: clampLevel(level),
    mistakeBank: (mistakeBank || []).slice(0, 20),
    totalSessions: (prev.totalSessions ?? 0) + 1,
    lifetimeStars: (prev.lifetimeStars ?? 0) + (firstTryCorrect ?? 0),
  };
  writeLocalStore(store);
}

// --- Supabase helpers ---

async function getUser() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

async function loadCloud(userId, mode) {
  const { data, error } = await supabase
    .from("progress")
    .select("level, mistake_bank, total_sessions, lifetime_stars")
    .eq("user_id", userId)
    .eq("mode", mode)
    .single();

  if (error || !data) {
    return { level: STARTING_LEVEL, mistakeBank: [], totalSessions: 0, lifetimeStars: 0 };
  }
  return {
    level: clampLevel(data.level ?? STARTING_LEVEL),
    mistakeBank: Array.isArray(data.mistake_bank) ? data.mistake_bank : [],
    totalSessions: data.total_sessions ?? 0,
    lifetimeStars: data.lifetime_stars ?? 0,
  };
}

async function saveCloud(userId, mode, { level, mistakeBank, firstTryCorrect }) {
  const existing = await loadCloud(userId, mode);
  const newTotalSessions = existing.totalSessions + 1;
  const newLifetimeStars = existing.lifetimeStars + (firstTryCorrect ?? 0);

  await supabase.from("progress").upsert(
    {
      user_id: userId,
      mode,
      level: clampLevel(level),
      mistake_bank: (mistakeBank || []).slice(0, 20),
      total_sessions: newTotalSessions,
      lifetime_stars: newLifetimeStars,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,mode" }
  );
}

// --- Merge localStorage into Supabase on first sign-in ---

export async function mergeLocalToCloud(userId) {
  const store = readLocalStore();
  const modes = Object.keys(store);
  if (modes.length === 0) return;

  for (const mode of modes) {
    const local = store[mode];
    const cloud = await loadCloud(userId, mode);

    const merged = {
      level: Math.max(clampLevel(local.level ?? 1), cloud.level),
      mistake_bank: cloud.mistakeBank.length > 0 ? cloud.mistakeBank : (local.mistakeBank || []).slice(0, 20),
      total_sessions: cloud.totalSessions + (local.totalSessions ?? 0),
      lifetime_stars: cloud.lifetimeStars + (local.lifetimeStars ?? 0),
      updated_at: new Date().toISOString(),
    };

    await supabase.from("progress").upsert(
      { user_id: userId, mode, ...merged },
      { onConflict: "user_id,mode" }
    );
  }

  localStorage.removeItem(PROGRESS_KEY);
}

// --- Public API (same shape as the old mathEngine functions) ---

export async function loadProgress(mode) {
  const user = await getUser();
  if (user) return loadCloud(user.id, mode);
  return loadLocal(mode);
}

export async function saveProgress(mode, data) {
  const user = await getUser();
  if (user) {
    await saveCloud(user.id, mode, data);
  } else {
    saveLocal(mode, data);
  }
}

// Synchronous fallback for initial render before auth resolves
export function loadProgressSync(mode) {
  return loadLocal(mode);
}
