import { supabase } from "../supabaseClient.js";
import { refreshBankFromCloud } from "../itemBank/cloudLoader.js";
import { normalizeBankRow } from "../itemBank/normalize.js";
import { SEED_ITEMS } from "../itemBank/bundle.js";
import { topicReadiness, withBundle } from "../itemBank/v2/topicReadiness.js";

/**
 * Admin side of the per-skill version switch (plan section 10). The app's
 * read path is src/itemBank/versionSwitch.js; this module is the write path
 * plus the audit fields (who flipped it, when, why) the panel shows. Writes
 * are admin-only by RLS, so a non-admin call fails at the database, not here.
 */

const SWITCH_SELECT_FIELDS = "mode_id, live_version, changed_by, changed_at, note";

export const LIVE_VERSIONS = Object.freeze(["v1", "preview", "v2"]);

export function rowToSwitch(row) {
  return {
    modeId: row.mode_id,
    liveVersion: row.live_version,
    changedBy: row.changed_by ?? null,
    changedAt: row.changed_at ?? null,
    note: row.note ?? null,
  };
}

async function currentUserId() {
  const userRes = await supabase.auth.getUser().catch(() => null);
  return userRes?.data?.user?.id || null;
}

/**
 * Every skill's row. Not paginated on purpose: one row per skill (25), far
 * under the 1,000-row cap the item_bank reads page around. Throws when the
 * table is unreachable so the panel can say so, unlike the loader's read,
 * which must degrade to "everything is v1" for kids.
 */
export async function listVersionSwitch() {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("item_version_switch")
    .select(SWITCH_SELECT_FIELDS)
    .order("mode_id", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToSwitch);
}

/**
 * Flip one skill. Upserts by mode_id so a skill the seed migration did not
 * know about (a new mode) gets its row on first flip. `changed_by` is the
 * signed-in admin; `changed_at` is set here too, since the trigger only
 * touches it on UPDATE and an insert should carry the same audit stamp.
 */
export async function setLiveVersion(modeId, liveVersion, note = null) {
  if (!supabase) throw new Error("Supabase not configured");
  if (!modeId) throw new Error("A mode id is required");
  if (!LIVE_VERSIONS.includes(liveVersion)) {
    throw new Error(`Unknown live version "${liveVersion}" (expected v1, preview or v2)`);
  }
  const row = {
    mode_id: modeId,
    live_version: liveVersion,
    changed_by: await currentUserId(),
    changed_at: new Date().toISOString(),
    note: typeof note === "string" && note.trim() ? note.trim() : null,
  };
  const { data, error } = await supabase
    .from("item_version_switch")
    .upsert(row, { onConflict: "mode_id" })
    .select(SWITCH_SELECT_FIELDS)
    .single();
  if (error) throw error;
  // The loader reads the switch once per hydration: re-hydrate so the
  // admin's own next session serves the version just chosen.
  refreshBankFromCloud({ force: true });
  return rowToSwitch(data);
}

// What the readiness check needs of a row: the cell columns, the payload
// (withinNumbers reads the question's numbers) and the version.
const V2_ROW_FIELDS =
  "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, review_status, payload, version, difficulty";
const PAGE = 1000;

/**
 * A topic's approved version-2 rows, normalized as the app holds them: the
 * rows a flip to v2 would serve. Filtered by mode, version 2 and approved,
 * and paginated (supabase-js silently caps a select at 1,000 rows, and Math
 * Facts alone has 1,886); never the whole bank (fetchAllBankItems). Throws
 * when a page fails, so the panel can say why. Returns { items, fetched }:
 * a row the app's normalizer drops is in `fetched` but not in `items`.
 */
export async function listApprovedV2Rows(modeId) {
  if (!supabase) throw new Error("Supabase not configured");
  if (!modeId) throw new Error("A mode id is required");
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("item_bank")
      .select(V2_ROW_FIELDS)
      .eq("mode_id", modeId)
      .eq("version", 2)
      .eq("review_status", "approved")
      .order("item_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { items: rows.map(normalizeBankRow).filter(Boolean), fetched: rows.length };
}

/**
 * The readiness line for one topic (src/itemBank/v2/topicReadiness.js), from
 * its approved version-2 rows in the database, held to this build's bundle
 * too (`bundleItems`, default the shipped seed): v2 stays off until the
 * deployed seed also serves every skill, so a flip can never come before
 * the manifest's deploy. Throws when the read fails.
 */
export async function readTopicReadiness(modeId, { bundleItems = SEED_ITEMS } = {}) {
  const { items, fetched } = await listApprovedV2Rows(modeId);
  const result = withBundle(topicReadiness(modeId, items), bundleItems);
  const unreadable = fetched - items.length;
  if (!unreadable) return { ...result, unreadable };
  return { ...result, unreadable, reason: `${result.reason}; ${unreadable} rows the app cannot read` };
}
