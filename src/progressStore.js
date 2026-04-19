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

const MAX_PERSISTED_BANK_ITEMS = 200;
const MAX_PERSISTED_RECENT_IDS = 12;

function mergeBankItemStats(prev = {}, incoming = {}) {
  const merged = { ...prev };
  for (const [itemId, stats] of Object.entries(incoming)) {
    const base = merged[itemId] || {
      attempts: 0,
      firstTryCorrect: 0,
      correct: 0,
      totalResponseMs: 0,
      lastSeenAt: -1,
    };
    merged[itemId] = {
      attempts: (base.attempts ?? 0) + (stats.attempts ?? 0),
      firstTryCorrect: (base.firstTryCorrect ?? 0) + (stats.firstTryCorrect ?? 0),
      correct: (base.correct ?? 0) + (stats.correct ?? 0),
      totalResponseMs: (base.totalResponseMs ?? 0) + (stats.totalResponseMs ?? 0),
      lastSeenAt: Math.max(base.lastSeenAt ?? -1, stats.lastSeenAt ?? -1),
    };
  }
  const ids = Object.keys(merged);
  if (ids.length <= MAX_PERSISTED_BANK_ITEMS) return merged;
  const trimmed = ids
    .map((id) => [id, merged[id].lastSeenAt ?? -1])
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PERSISTED_BANK_ITEMS);
  return Object.fromEntries(trimmed.map(([id]) => [id, merged[id]]));
}

function loadLocal(mode) {
  const entry = readLocalStore()[mode];
  if (!entry) {
    return {
      level: STARTING_LEVEL,
      mistakeBank: [],
      totalSessions: 0,
      lifetimeStars: 0,
      bankItemStats: {},
      recentBankItemIds: [],
    };
  }
  return {
    level: clampLevel(entry.level ?? STARTING_LEVEL),
    mistakeBank: Array.isArray(entry.mistakeBank) ? entry.mistakeBank : [],
    totalSessions: entry.totalSessions ?? 0,
    lifetimeStars: entry.lifetimeStars ?? 0,
    bankItemStats: entry.bankItemStats && typeof entry.bankItemStats === "object" ? entry.bankItemStats : {},
    recentBankItemIds: Array.isArray(entry.recentBankItemIds) ? entry.recentBankItemIds : [],
  };
}

function saveLocal(mode, { level, mistakeBank, firstTryCorrect, bankItemStats, recentBankItemIds }) {
  const store = readLocalStore();
  const prev = store[mode] || { totalSessions: 0, lifetimeStars: 0, bankItemStats: {} };
  store[mode] = {
    level: clampLevel(level),
    mistakeBank: (mistakeBank || []).slice(0, 20),
    totalSessions: (prev.totalSessions ?? 0) + 1,
    lifetimeStars: (prev.lifetimeStars ?? 0) + (firstTryCorrect ?? 0),
    bankItemStats: mergeBankItemStats(prev.bankItemStats || {}, bankItemStats || {}),
    recentBankItemIds: (recentBankItemIds || []).slice(-MAX_PERSISTED_RECENT_IDS),
  };
  writeLocalStore(store);
}

// --- Supabase helpers ---

async function getUser() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

async function loadCloudBankItemStats(userId, mode) {
  const { data, error } = await supabase
    .from("progress_item_stats")
    .select("item_id, attempts, first_try_correct, correct, total_response_ms, last_seen_at")
    .eq("user_id", userId)
    .eq("mode", mode);
  if (error || !Array.isArray(data)) return {};
  const stats = {};
  for (const row of data) {
    stats[row.item_id] = {
      attempts: row.attempts ?? 0,
      firstTryCorrect: row.first_try_correct ?? 0,
      correct: row.correct ?? 0,
      totalResponseMs: row.total_response_ms ?? 0,
      lastSeenAt: row.last_seen_at ? Date.parse(row.last_seen_at) : -1,
    };
  }
  return stats;
}

async function upsertCloudBankItemStats(userId, mode, bankItemStats) {
  if (!bankItemStats || Object.keys(bankItemStats).length === 0) return;
  const rows = Object.entries(bankItemStats).map(([itemId, stats]) => ({
    user_id: userId,
    mode,
    item_id: itemId,
    attempts: stats.attempts ?? 0,
    first_try_correct: stats.firstTryCorrect ?? 0,
    correct: stats.correct ?? 0,
    total_response_ms: stats.totalResponseMs ?? 0,
    last_seen_at: new Date(
      Number.isFinite(stats.lastSeenAt) && stats.lastSeenAt > 0 ? stats.lastSeenAt : Date.now()
    ).toISOString(),
  }));
  await supabase
    .from("progress_item_stats")
    .upsert(rows, { onConflict: "user_id,mode,item_id" });
}

async function loadCloud(userId, mode) {
  const [{ data, error }, bankItemStats] = await Promise.all([
    supabase
      .from("progress")
      .select("level, mistake_bank, total_sessions, lifetime_stars")
      .eq("user_id", userId)
      .eq("mode", mode)
      .single(),
    loadCloudBankItemStats(userId, mode),
  ]);

  if (error || !data) {
    return {
      level: STARTING_LEVEL,
      mistakeBank: [],
      totalSessions: 0,
      lifetimeStars: 0,
      bankItemStats: bankItemStats || {},
      recentBankItemIds: [],
    };
  }
  return {
    level: clampLevel(data.level ?? STARTING_LEVEL),
    mistakeBank: Array.isArray(data.mistake_bank) ? data.mistake_bank : [],
    totalSessions: data.total_sessions ?? 0,
    lifetimeStars: data.lifetime_stars ?? 0,
    bankItemStats,
    // recentBankItemIds is a session-window concern; not persisted across devices.
    recentBankItemIds: [],
  };
}

async function saveCloud(userId, mode, { level, mistakeBank, firstTryCorrect, bankItemStats }) {
  const existing = await loadCloud(userId, mode);
  const newTotalSessions = existing.totalSessions + 1;
  const newLifetimeStars = existing.lifetimeStars + (firstTryCorrect ?? 0);

  await Promise.all([
    supabase.from("progress").upsert(
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
    ),
    upsertCloudBankItemStats(userId, mode, bankItemStats),
  ]);
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

    // Migrate per-item stats: sum local counts into cloud counts.
    const mergedBankStats = mergeBankItemStats(cloud.bankItemStats || {}, local.bankItemStats || {});
    await upsertCloudBankItemStats(userId, mode, mergedBankStats);
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
