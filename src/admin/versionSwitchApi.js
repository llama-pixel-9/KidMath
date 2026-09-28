import { supabase } from "../supabaseClient.js";
import { refreshBankFromCloud } from "../itemBank/cloudLoader.js";

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
