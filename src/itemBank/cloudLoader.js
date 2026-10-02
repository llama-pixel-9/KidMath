import { supabase } from "../supabaseClient.js";
import { setBankItems } from "./index.js";
import { normalizeBankRow } from "./normalize.js";
import { isServable, previewEnabled, readVersionSwitch } from "./versionSwitch.js";

// Re-exported so existing callers (modeLoader, admin UI) keep their import path.
export { normalizeBankRow };

const APPROVED_SELECT_FIELDS =
  "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, " +
  "review_status, payload, representation_type, source, level_band";

// Columns added by the v2 groundwork migration. Kept apart from the v1 list so
// a web deploy that lands before the migration is applied (or against a
// project that never gets it) falls back to the v1 select instead of failing
// every bank read and stranding kids on the seed.
const V2_SELECT_FIELDS = "version, item_model_id, difficulty, hint, tags";
let v2ColumnsAvailable = true;

/** The item_bank select list, with the v2 columns while the table has them. */
export function bankSelectFields(base = APPROVED_SELECT_FIELDS) {
  return v2ColumnsAvailable ? `${base}, ${V2_SELECT_FIELDS}` : base;
}

function isMissingColumnError(error) {
  // PostgREST reports an unknown column in a select as Postgres 42703.
  return error?.code === "42703" || /column .* does not exist/i.test(error?.message || "");
}

/**
 * Note a select error. Returns true when it was a missing column, so the
 * caller should re-run the same query once on the v1 select. Answered per
 * error, not per session: the full refresh (main.jsx) and the first mode load
 * (MathExplorer) are in flight together on every reload, and both hit the
 * missing column before either can switch the module. Logged once per
 * session so the fallback is visible.
 */
export function noteMissingV2Columns(error) {
  if (!isMissingColumnError(error)) return false;
  if (v2ColumnsAvailable) {
    v2ColumnsAvailable = false;
    console.warn("[itemBank] item_bank lacks the v2 columns; using the v1 select until the migration is applied");
  }
  return true;
}

/**
 * The per-skill version switch, cached for the session so mode loads never
 * wait on a second round trip. The first caller loads it; `refresh: true`
 * re-reads it, which the debounced full refresh does so a flip in the admin
 * page reaches the next session without a redeploy. Never rejects. A failed
 * re-read keeps the last good map (iOS BankService does the same), so a
 * flaky read cannot roll a flipped skill back to v1; before any good read
 * the fallback is an empty map, meaning every skill at its default.
 */
let switchMap = null;
let switchPromise = null;
export function getVersionSwitch({ refresh = false } = {}) {
  if (switchMap && !refresh) return Promise.resolve(switchMap);
  if (!switchPromise) {
    switchPromise = readVersionSwitch()
      .then((map) => {
        switchMap = map ?? switchMap ?? new Map();
        return switchMap;
      })
      .finally(() => {
        switchPromise = null;
      });
  }
  return switchPromise;
}

/** Forget the cached switch and column probe. Tests and sign-out. */
export function resetCloudLoader() {
  switchMap = null;
  switchPromise = null;
  v2ColumnsAvailable = true;
}

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
    let { data, error } = await buildQuery().range(from, from + PAGE - 1);
    // buildQuery re-reads bankSelectFields, so one retry picks up the v1 list.
    if (error && noteMissingV2Columns(error)) {
      ({ data, error } = await buildQuery().range(from, from + PAGE - 1));
    }
    if (error || !Array.isArray(data)) return rows.length ? rows : null;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

export async function fetchApprovedBank() {
  if (!supabase) return null;
  try {
    // The switch is re-read with every full fetch (this is the debounced
    // refresh path) and loads alongside the first page rather than before it.
    const [map, data] = await Promise.all([
      getVersionSwitch({ refresh: true }),
      fetchAllPages(() =>
        supabase.from("item_bank").select(bankSelectFields()).eq("review_status", "approved").order("item_id")
      ),
    ]);
    if (!data) return null;
    const preview = previewEnabled();
    return data.map(normalizeBankRow).filter((item) => isServable(item, map, { preview }));
  } catch {
    return null;
  }
}

/**
 * Fetch all bank items (any review_status, any version). Used by the admin UI,
 * which must see every row regardless of the switch.
 */
export async function fetchAllBankItems() {
  if (!supabase) return [];
  const data = await fetchAllPages(() =>
    supabase
      .from("item_bank")
      .select(bankSelectFields(APPROVED_SELECT_FIELDS + ", created_at, updated_at"))
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

/** One row by id, any review status or version (reviewers pin drafts). Null
 * if absent, invalid, or Supabase is not configured. */
export async function fetchBankItemById(itemId) {
  if (!supabase || !itemId) return null;
  const query = () => supabase.from("item_bank").select(bankSelectFields()).eq("item_id", itemId).maybeSingle();
  let { data, error } = await query();
  if (error && noteMissingV2Columns(error)) ({ data, error } = await query());
  if (error || !data) return null;
  return normalizeBankRow(data);
}
