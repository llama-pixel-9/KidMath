import { supabase } from "./supabaseClient";

/**
 * Math progress is PER KID. Locally the blob is scoped by the active kid
 * profile pointer (same scheme as engagementStore: `kidmath-progress:<kid>`,
 * bare key for anonymous play, first kid inherits the device blob once — copy,
 * never rename). In the cloud every row carries `kid_id`; rows with a null
 * kid_id are "household" rows merged from a device before any profile existed,
 * and the first kid to load a mode inherits them as a seed.
 *
 * The active-kid key is read directly (kidProfiles.js owns it) so the sync
 * loader the engine calls stays cheap and import-light.
 */
const PROGRESS_KEY = "kidmath-progress";
const ACTIVE_KID_KEY = "kidmath-active-kid"; // kidProfiles.js owns this key
const MIGRATED_KEY = "kidmath-progress-migrated"; // which kid inherited the device blob
const STARTING_LEVEL = 1;
const MAX_LEVEL = 10;

export function activeKidIdSync() {
  try {
    return localStorage.getItem(ACTIVE_KID_KEY) || null;
  } catch {
    return null;
  }
}

function storeKey(kidId) {
  return kidId ? `${PROGRESS_KEY}:${kidId}` : PROGRESS_KEY;
}

function clampLevel(level) {
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

// --- localStorage helpers ---

function parseStore(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readLocalStore(kidId = activeKidIdSync()) {
  const key = storeKey(kidId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return parseStore(raw);
    // First kid on this device inherits the anonymous blob — exactly once,
    // stamped even when there was nothing to inherit, so a later kid can
    // never claim it. Copy, never rename: renaming wipes progress.
    if (kidId && !localStorage.getItem(MIGRATED_KEY)) {
      localStorage.setItem(MIGRATED_KEY, kidId);
      const device = localStorage.getItem(PROGRESS_KEY);
      if (device) {
        localStorage.setItem(key, device);
        return parseStore(device);
      }
    }
    return {};
  } catch {
    return {};
  }
}

function writeLocalStore(store, kidId = activeKidIdSync()) {
  try {
    localStorage.setItem(storeKey(kidId), JSON.stringify(store));
  } catch {
    /* private mode / quota — the cloud copy is the durable one when signed in */
  }
}

function clearLocalStore(kidId) {
  try {
    localStorage.removeItem(storeKey(kidId));
  } catch {
    /* ignore */
  }
}

const MAX_PERSISTED_BANK_ITEMS = 200;
const MAX_PERSISTED_RECENT_IDS = 24;

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

function loadLocal(mode, kidId) {
  const entry = readLocalStore(kidId)[mode];
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

// `starsEarned` is the flight payout (§01 economy). Callers not yet on the
// Flight Report (and iOS until its port) omit it and keep the historical
// one-star-per-first-try formula.
function saveLocal(mode, { level, mistakeBank, firstTryCorrect, starsEarned, bankItemStats, recentBankItemIds }, kidId) {
  const store = readLocalStore(kidId);
  const prev = store[mode] || { totalSessions: 0, lifetimeStars: 0, bankItemStats: {} };
  store[mode] = {
    level: clampLevel(level),
    mistakeBank: (mistakeBank || []).slice(0, 20),
    totalSessions: (prev.totalSessions ?? 0) + 1,
    lifetimeStars: (prev.lifetimeStars ?? 0) + (starsEarned ?? firstTryCorrect ?? 0),
    bankItemStats: mergeBankItemStats(prev.bankItemStats || {}, bankItemStats || {}),
    recentBankItemIds: (recentBankItemIds || []).slice(-MAX_PERSISTED_RECENT_IDS),
  };
  writeLocalStore(store, kidId);
}

// --- Supabase helpers ---

async function getUser() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/** `.eq` cannot match NULL; household rows need `.is`. */
function forKid(query, kidId) {
  return kidId ? query.eq("kid_id", kidId) : query.is("kid_id", null);
}

async function loadCloudBankItemStats(userId, kidId, mode) {
  const { data, error } = await forKid(
    supabase
      .from("progress_item_stats")
      .select("item_id, attempts, first_try_correct, correct, total_response_ms, last_seen_at")
      .eq("user_id", userId)
      .eq("mode", mode),
    kidId
  );
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

async function upsertCloudBankItemStats(userId, kidId, mode, bankItemStats) {
  if (!bankItemStats || Object.keys(bankItemStats).length === 0) return;
  const rows = Object.entries(bankItemStats).map(([itemId, stats]) => ({
    user_id: userId,
    kid_id: kidId || null,
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
    .upsert(rows, { onConflict: "user_id,kid_id,mode,item_id" });
}

async function fetchProgressRow(userId, kidId, mode) {
  const { data, error } = await forKid(
    supabase
      .from("progress")
      .select("level, mistake_bank, total_sessions, lifetime_stars, recent_bank_item_ids")
      .eq("user_id", userId)
      .eq("mode", mode),
    kidId
  ).limit(1);
  if (error || !Array.isArray(data)) return null;
  return data[0] || null;
}

/**
 * A kid's cloud progress for one mode. A kid with no row yet inherits the
 * household row (kid_id null — merged from a device before the profile
 * existed) as a seed; the first save writes their own row, so the inherit is
 * one-time by construction.
 */
async function loadCloud(userId, kidId, mode) {
  let [data, bankItemStats] = await Promise.all([
    fetchProgressRow(userId, kidId, mode),
    loadCloudBankItemStats(userId, kidId, mode),
  ]);
  if (!data && kidId) {
    [data, bankItemStats] = await Promise.all([
      fetchProgressRow(userId, null, mode),
      loadCloudBankItemStats(userId, null, mode),
    ]);
  }

  if (!data) {
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
    recentBankItemIds: Array.isArray(data.recent_bank_item_ids) ? data.recent_bank_item_ids : [],
  };
}

async function saveCloud(userId, kidId, mode, { level, mistakeBank, firstTryCorrect, starsEarned, bankItemStats, recentBankItemIds }) {
  const existing = await loadCloud(userId, kidId, mode);
  const newTotalSessions = existing.totalSessions + 1;
  const newLifetimeStars = existing.lifetimeStars + (starsEarned ?? firstTryCorrect ?? 0);

  await Promise.all([
    supabase.from("progress").upsert(
      {
        user_id: userId,
        kid_id: kidId || null,
        mode,
        level: clampLevel(level),
        mistake_bank: (mistakeBank || []).slice(0, 20),
        total_sessions: newTotalSessions,
        lifetime_stars: newLifetimeStars,
        // Persisted since PR B so the no-repeat window survives a device switch.
        recent_bank_item_ids: (recentBankItemIds || []).slice(-MAX_PERSISTED_RECENT_IDS),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,kid_id,mode" }
    ),
    upsertCloudBankItemStats(userId, kidId, mode, bankItemStats),
  ]);
}

// --- Merge localStorage into Supabase on first sign-in ---

/**
 * Merge this device's blob for the active kid (or the anonymous blob when no
 * profile is active) into that kid's cloud rows, then drop the local copy.
 * The anonymous blob is merged as household rows (kid_id null) and later
 * inherited by the first kid — see loadCloud.
 */
export async function mergeLocalToCloud(userId, kidId = activeKidIdSync()) {
  const store = readLocalStore(kidId);
  const modes = Object.keys(store);
  if (modes.length === 0) return;

  for (const mode of modes) {
    const local = store[mode];
    const cloud = await loadCloud(userId, kidId, mode);

    const merged = {
      level: Math.max(clampLevel(local.level ?? 1), cloud.level),
      mistake_bank: cloud.mistakeBank.length > 0 ? cloud.mistakeBank : (local.mistakeBank || []).slice(0, 20),
      total_sessions: cloud.totalSessions + (local.totalSessions ?? 0),
      lifetime_stars: cloud.lifetimeStars + (local.lifetimeStars ?? 0),
      updated_at: new Date().toISOString(),
    };

    await supabase.from("progress").upsert(
      { user_id: userId, kid_id: kidId || null, mode, ...merged },
      { onConflict: "user_id,kid_id,mode" }
    );

    // Migrate per-item stats: sum local counts into cloud counts.
    const mergedBankStats = mergeBankItemStats(cloud.bankItemStats || {}, local.bankItemStats || {});
    await upsertCloudBankItemStats(userId, kidId, mode, mergedBankStats);
  }

  clearLocalStore(kidId);
}

// --- Public API (same shape as the old mathEngine functions) ---

export async function loadProgress(mode, { kidId = activeKidIdSync() } = {}) {
  const user = await getUser();
  if (user) return loadCloud(user.id, kidId, mode);
  return loadLocal(mode, kidId);
}

export async function saveProgress(mode, data, { kidId = activeKidIdSync() } = {}) {
  const user = await getUser();
  if (user) {
    await saveCloud(user.id, kidId, mode, data);
  } else {
    saveLocal(mode, data, kidId);
  }
}

// Synchronous fallback for initial render before auth resolves (also the
// engine's injected progressLoader — keep it sync and cheap).
export function loadProgressSync(mode, kidId = activeKidIdSync()) {
  return loadLocal(mode, kidId);
}

/**
 * Every mode's progress in one read — the Grown-Ups panel's shape. Signed-in
 * families must get the cloud rows (the sign-in merge deletes the local blob,
 * so localStorage is empty for them); everyone else gets the local store.
 * `source` tells the UI which copy it is looking at.
 */
export async function loadProgressSummary({ kidId = activeKidIdSync() } = {}) {
  const user = await getUser();
  if (user) {
    let { data, error } = await forKid(
      supabase
        .from("progress")
        .select("mode, level, mistake_bank, total_sessions, lifetime_stars")
        .eq("user_id", user.id),
      kidId
    );
    // A kid with no rows of their own yet sees the household seed they would
    // inherit on first play — the same rule as loadCloud.
    if (!error && kidId && Array.isArray(data) && data.length === 0) {
      ({ data, error } = await supabase
        .from("progress")
        .select("mode, level, mistake_bank, total_sessions, lifetime_stars")
        .eq("user_id", user.id)
        .is("kid_id", null));
    }
    if (!error && Array.isArray(data)) {
      return {
        source: "cloud",
        byMode: Object.fromEntries(
          data.map((row) => [
            row.mode,
            {
              level: clampLevel(row.level ?? STARTING_LEVEL),
              mistakeBank: Array.isArray(row.mistake_bank) ? row.mistake_bank : [],
              totalSessions: row.total_sessions ?? 0,
              lifetimeStars: row.lifetime_stars ?? 0,
            },
          ])
        ),
      };
    }
  }
  return {
    source: "local",
    byMode: Object.fromEntries(
      Object.keys(readLocalStore(kidId)).map((mode) => [mode, loadLocal(mode, kidId)])
    ),
  };
}
