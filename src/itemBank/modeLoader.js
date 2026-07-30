import { supabase } from "../supabaseClient.js";
import { normalizeBankRow } from "./cloudLoader.js";
import { addBankItems, getBankItems } from "./index.js";

/**
 * Mode-scoped item loading.
 *
 * The bundle used to carry every curated item — 1.4 MB of the app's 1.9 MB —
 * so a child downloaded all 22 modes' questions before answering one. At the
 * authoring volumes M6 targets that becomes a bad first load on school wifi.
 *
 * Instead: ship a small seed so every mode works instantly and offline, and
 * fetch the rest of a mode's items the moment the child opens it. A session is
 * 15 questions in ONE mode, so this is exactly the granularity that matters —
 * we never pay for the 21 modes they did not pick.
 *
 * This module is the reusable framework for that. A mode does not opt in and
 * needs no per-mode code: `ensureModeLoaded(modeId)` is idempotent, dedupes
 * concurrent calls, caches results for the session, and always resolves — a
 * failed fetch leaves the seeded items in place rather than blocking play.
 */

/** modeId -> "loading" | "loaded" | "failed" */
const status = new Map();
/** modeId -> in-flight promise, so concurrent callers share one request. */
const inflight = new Map();

const SELECT_FIELDS =
  "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, " +
  "review_status, payload, representation_type, source, level_band, variety_id, format_id";

/** Items already in memory for a mode (seeded or previously fetched). */
export function loadedCount(modeId) {
  return getBankItems().filter((i) => i.modeId === modeId).length;
}

export function modeStatus(modeId) {
  return status.get(modeId) || "seeded";
}

/** Forget all cached state. Tests and sign-out. */
export function resetModeLoader() {
  status.clear();
  inflight.clear();
}

async function fetchMode(modeId, { levelRange } = {}) {
  if (!supabase) return null;
  // Paginated: a single mode (addition ~1,400 approved rows) now exceeds
  // supabase-js's 1,000-row select cap.
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("item_bank")
      .select(SELECT_FIELDS)
      .eq("review_status", "approved")
      .eq("mode_id", modeId)
      .order("item_id");

    // Optional narrowing: a child at level 3 does not need the Grade 4 items.
    if (levelRange) {
      query = query.lte("level_min", levelRange[1]).gte("level_max", levelRange[0]);
    }

    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error || !Array.isArray(data)) return rows.length ? rows.map(normalizeBankRow).filter(Boolean) : null;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows.map(normalizeBankRow).filter(Boolean);
}

/**
 * Ensure a mode's items are in memory. Safe to call on every mode entry.
 *
 * Resolves to { modeId, added, status }. Never rejects: the seeded items are
 * always a working fallback, so a network failure degrades variety rather than
 * breaking play.
 */
export function ensureModeLoaded(modeId, options = {}) {
  if (!modeId) return Promise.resolve({ modeId, added: 0, status: "skipped" });

  if (status.get(modeId) === "loaded" && !options.force) {
    return Promise.resolve({ modeId, added: 0, status: "cached" });
  }
  if (inflight.has(modeId)) return inflight.get(modeId);

  status.set(modeId, "loading");
  const promise = fetchMode(modeId, options)
    .then((items) => {
      if (!items) {
        status.set(modeId, "failed");
        return { modeId, added: 0, status: "failed" };
      }
      const added = addBankItems(items);
      status.set(modeId, "loaded");
      return { modeId, added, status: "loaded" };
    })
    .catch(() => {
      status.set(modeId, "failed");
      return { modeId, added: 0, status: "failed" };
    })
    .finally(() => {
      inflight.delete(modeId);
    });

  inflight.set(modeId, promise);
  return promise;
}

/**
 * Warm a mode without waiting — for hovering a mode tile on the home page, so
 * the items are usually there by the time the child taps in.
 */
export function prefetchMode(modeId, options = {}) {
  if (status.has(modeId)) return;
  ensureModeLoaded(modeId, options);
}
