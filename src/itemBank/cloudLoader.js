import { supabase } from "../supabaseClient.js";
import { setBankItems, validateBankItem } from "./index.js";

const APPROVED_SELECT_FIELDS =
  "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, review_status, payload";

/**
 * Convert a row from public.item_bank into the in-memory bank shape.
 * Returns null when the row fails client-side validation so a bad cloud
 * row never replaces a known-good bundled item.
 */
export function normalizeBankRow(row) {
  if (!row) return null;
  const item = {
    itemId: row.item_id,
    modeId: row.mode_id,
    itemFamily: row.item_family || "application",
    subskill: row.subskill,
    structureType: row.structure_type,
    levelRange: [Number(row.level_min), Number(row.level_max)],
    reviewStatus: row.review_status,
    question: row.payload,
  };
  const { valid } = validateBankItem(item);
  if (!valid) return null;
  return item;
}

/**
 * Fetch all approved items from Supabase. Returns null when Supabase is
 * unconfigured or the network call fails so callers can keep using the
 * bundled snapshot.
 */
export async function fetchApprovedBank() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("item_bank")
      .select(APPROVED_SELECT_FIELDS)
      .eq("review_status", "approved");
    if (error || !Array.isArray(data)) return null;
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
  const { data, error } = await supabase
    .from("item_bank")
    .select(APPROVED_SELECT_FIELDS + ", created_at, updated_at")
    .order("mode_id", { ascending: true })
    .order("item_id", { ascending: true });
  if (error || !Array.isArray(data)) return [];
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
