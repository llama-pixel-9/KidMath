import { REVIEW_STATUS } from "./reviewStatus.js";

/**
 * The bank version switch rules: what a viewer is served, given the switch.
 *
 * ONE copy for both platforms. The web loaders reach these through
 * versionSwitch.js (which adds the Supabase read and the browser preview
 * marker); the native engine (src/engine/nativeBank.js) imports this file
 * directly, because the iOS bundle must not pull in the Supabase client or
 * touch browser storage. Keep it pure: no imports beyond the dependency-free
 * review-status leaf, no globals, no I/O.
 *
 * The switch is keyed by topic (mode_id) today. If it is ever keyed per
 * skill, change `switchMapFromRows` and `liveVersionFor` here (plus the two
 * selects that read the table: versionSwitch.js and SupabaseService.swift),
 * and both platforms follow.
 */

export const LIVE_VERSIONS = new Set(["v1", "preview", "v2"]);

/**
 * The live version of a topic the switch table has no row for. Only topics
 * with no v1 rows are listed (modeGroups.spec ties this to the modes that
 * declare `v2Only`); Sai, 2026-10-01: Math Facts needs no flip to go live.
 */
export const DEFAULT_LIVE_VERSION = Object.freeze({ mathFacts: "v2" });

/**
 * `item_version_switch` rows ({ mode_id, live_version }) -> Map(modeId ->
 * "v1" | "preview" | "v2"). Rows without a topic or with an unknown live
 * value are dropped, so they read as the topic's default.
 */
export function switchMapFromRows(rows) {
  const map = new Map();
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    if (row?.mode_id && LIVE_VERSIONS.has(row.live_version)) map.set(row.mode_id, row.live_version);
  }
  return map;
}

/** The topic's live version: its switch value when valid, else its default, else v1. */
export function liveVersionFor(switchMap, modeId) {
  const live = switchMap instanceof Map ? switchMap.get(modeId) : switchMap?.[modeId];
  return LIVE_VERSIONS.has(live) ? live : DEFAULT_LIVE_VERSION[modeId] || "v1";
}

/**
 * Is a topic shown on the pickers? A topic with v1 rows always is. A v2-only
 * topic (Math Facts has nothing else) is shown where its switch serves v2:
 * to everyone at `v2` (and with no row, its default), to preview viewers at
 * `preview`, to nobody at `v1`.
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
 * from the map is v1 (a v2-only topic: v2), so an empty map serves exactly
 * what the app served before the switch existed, plus Math Facts.
 */
export function isServable(item, switchMap, { preview = false } = {}) {
  if (!item || item.reviewStatus !== REVIEW_STATUS.APPROVED) return false;
  const version = item.version == null ? 1 : Number(item.version);
  const live = liveVersionFor(switchMap, item.modeId);
  const wanted = live === "v2" || (live === "preview" && preview) ? 2 : 1;
  return version === wanted;
}
