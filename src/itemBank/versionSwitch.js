import { supabase } from "../supabaseClient.js";
import { REVIEW_STATUS } from "./reviewStatus.js";

/**
 * Per-skill bank version switch (plan section 10).
 *
 * v1 rows are never edited: v2 items are new rows with `version = 2`, and the
 * `item_version_switch` table says, per skill, which version kids see:
 *
 *   v1       version-1 rows for everyone (the default, and what a missing
 *            table means)
 *   preview  version-2 rows for browsers with the preview marker, so Sai's
 *            students can pilot a skill without affecting anyone else
 *   v2       version-2 rows for everyone
 *
 * The switch lives in the database rather than a deploy-time flag so a flip
 * (or a rollback) reaches the next session with no redeploy. Loaders read it
 * once per hydration and pass it to `isServable`.
 */

const PREVIEW_KEY = "kidmath:previewV2";
const LIVE_VERSIONS = new Set(["v1", "preview", "v2"]);

let warnedLoad = false;

/**
 * Read the switch table. Resolves to Map(modeId -> "v1" | "preview" | "v2").
 * Empty when Supabase is unconfigured, the table is missing (migration not
 * applied yet), or the read fails: every skill then behaves as v1, which is
 * the safe direction. Never rejects.
 *
 * Not paginated on purpose: the table holds one row per skill (25), far under
 * the 1,000-row cap that the item_bank reads have to page around.
 */
export async function loadVersionSwitch() {
  const map = new Map();
  if (!supabase) return map;
  try {
    const { data, error } = await supabase
      .from("item_version_switch")
      .select("mode_id, live_version");
    if (error || !Array.isArray(data)) {
      // Once per session: a missing table before the migration is expected,
      // but a policy or network problem after it would otherwise hide as
      // "everything is v1".
      if (!warnedLoad) {
        warnedLoad = true;
        console.warn("[itemBank] item_version_switch unavailable; serving v1 for every skill", error?.message || error);
      }
      return map;
    }
    for (const row of data) {
      if (row?.mode_id && LIVE_VERSIONS.has(row.live_version)) map.set(row.mode_id, row.live_version);
    }
    return map;
  } catch {
    return map;
  }
}

/**
 * Whether this browser sees skills that are in `preview` as v2.
 *
 * The marker is localStorage `kidmath:previewV2 === "1"`, set by visiting any
 * page with `?preview=v2` (the same soft-gate pattern as the `?invite=1`
 * tester link: not a security boundary, RLS still decides what rows exist).
 * `?preview=v1` clears it so a tester can leave preview without devtools.
 * Reads the URL on every call so it needs no boot hook and stays correct in
 * tests that swap `window`.
 */
export function previewEnabled() {
  try {
    if (typeof window !== "undefined" && window.location?.search) {
      const wanted = new URLSearchParams(window.location.search).get("preview");
      if (wanted === "v2") setPreviewEnabled(true);
      else if (wanted === "v1") setPreviewEnabled(false);
    }
    return localStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    // No storage (private mode, Node): nobody is a preview user.
    return false;
  }
}

export function setPreviewEnabled(enabled) {
  try {
    if (enabled) localStorage.setItem(PREVIEW_KEY, "1");
    else localStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* private mode */
  }
}

function liveVersionFor(switchMap, modeId) {
  const live = switchMap instanceof Map ? switchMap.get(modeId) : switchMap?.[modeId];
  return LIVE_VERSIONS.has(live) ? live : "v1";
}

/**
 * Is a topic shown on the pickers? A topic with v1 rows always is. A v2-only
 * topic (Math Facts has nothing else) is shown where its switch serves v2:
 * to everyone at `v2`, to preview browsers at `preview`, to nobody at `v1`.
 */
export function topicVisible(modeId, switchMap, { v2Only = false, preview = false } = {}) {
  if (!v2Only) return true;
  const live = liveVersionFor(switchMap, modeId);
  return live === "v2" || (live === "preview" && preview);
}

/**
 * Should this normalized bank item be served, given the switch map and
 * whether the viewer is a preview user?
 *
 * Approved rows only. A row's `version` null counts as 1 (every v1 row and
 * every bundled item predates the column being meaningful). A skill absent
 * from the map is v1, so an empty map serves exactly what the app served
 * before the switch existed.
 */
export function isServable(item, switchMap, { preview = false } = {}) {
  if (!item || item.reviewStatus !== REVIEW_STATUS.APPROVED) return false;
  const version = item.version == null ? 1 : Number(item.version);
  const live = liveVersionFor(switchMap, item.modeId);
  const wanted = live === "v2" || (live === "preview" && preview) ? 2 : 1;
  return version === wanted;
}
