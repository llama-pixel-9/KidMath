import { supabase } from "../supabaseClient.js";
import { setBankItems } from "./index.js";
import { normalizeBankRow } from "./normalize.js";

// Re-exported so existing callers (modeLoader, admin UI) keep their import path.
export { normalizeBankRow };

const APPROVED_SELECT_FIELDS =
  "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, " +
  "review_status, payload, representation_type, source, level_band";


/**
 * Fetch all approved items from Supabase. Returns null when Supabase is
 * unconfigured or the network call fails so callers can keep using the
 * bundled snapshot.
 */
// supabase-js caps any select at 1,000 rows; the bank is well past that. An
// unpaginated fetch here once REPLACED the in-memory bank with the first
// 1,000 rows for every signed-in child. All bank reads page.
const PAGE = 1000;
async function fetchAllPages(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error || !Array.isArray(data)) return rows.length ? rows : null;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

export async function fetchApprovedBank() {
  if (!supabase) return null;
  try {
    const data = await fetchAllPages(() =>
      supabase.from("item_bank").select(APPROVED_SELECT_FIELDS).eq("review_status", "approved").order("item_id")
    );
    if (!data) return null;
    return data.map(normalizeBankRow).filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Fetch all bank items (any review_status). Used by the admin UI.
 */
export async function fetchAllBankItems() {
  if (!supabase) return [];
  const data = await fetchAllPages(() =>
    supabase
      .from("item_bank")
      .select(APPROVED_SELECT_FIELDS + ", created_at, updated_at")
      .order("mode_id", { ascending: true })
      .order("item_id", { ascending: true })
  );
  if (!data) return [];
  return data.map((row) => ({
    ...normalizeBankRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Hydrate the in-memory cache from Supabase. Returns true on success.
 * On failure, the cache remains unchanged (still bundled or last-good).
 */
export async function hydrateBankFromCloud() {
  const items = await fetchApprovedBank();
  if (!items || items.length === 0) return false;
  setBankItems(items, "cloud");
  return true;
}

const REFRESH_DEBOUNCE_MS = 30_000;
let lastRefreshAt = 0;
let pendingRefresh = null;

/**
 * Debounced refresh so visibility/storage events don't flood requests.
 */
export function refreshBankFromCloud({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastRefreshAt < REFRESH_DEBOUNCE_MS) {
    return pendingRefresh || Promise.resolve(false);
  }
  lastRefreshAt = now;
  pendingRefresh = hydrateBankFromCloud().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

/** One row by id, any review status (reviewers pin drafts). Null if absent,
 * invalid, or Supabase is not configured. */
export async function fetchBankItemById(itemId) {
  if (!supabase || !itemId) return null;
  const { data, error } = await supabase
    .from("item_bank")
    .select(APPROVED_SELECT_FIELDS)
    .eq("item_id", itemId)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeBankRow(data);
}
