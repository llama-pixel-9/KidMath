import { supabase } from "../supabaseClient";
import { refreshBankFromCloud } from "../itemBank/cloudLoader";

const ADMIN_SELECT_FIELDS =
  "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, " +
  "review_status, payload, representation_type, source, level_band, " +
  "version, created_at, updated_at, reviewed_by, reviewed_at";

function rowToItem(row) {
  return {
    itemId: row.item_id,
    modeId: row.mode_id,
    itemFamily: row.item_family,
    subskill: row.subskill,
    structureType: row.structure_type,
    levelMin: row.level_min,
    levelMax: row.level_max,
    reviewStatus: row.review_status,
    payload: row.payload,
    representationType: row.representation_type || null,
    source: row.source || null,
    levelBand: row.level_band || null,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at || null,
  };
}

function itemToRow(item) {
  return {
    item_id: item.itemId,
    mode_id: item.modeId,
    item_family: item.itemFamily || "application",
    subskill: item.subskill,
    structure_type: item.structureType,
    level_min: Number(item.levelMin),
    level_max: Number(item.levelMax),
    review_status: item.reviewStatus,
    payload: item.payload,
    representation_type: item.representationType || null,
    source: item.source || null,
  };
}

export async function listAllItems() {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("item_bank")
    .select(ADMIN_SELECT_FIELDS)
    .order("mode_id", { ascending: true })
    .order("item_id", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToItem);
}

export async function upsertItem(item) {
  if (!supabase) throw new Error("Supabase not configured");
  const row = itemToRow(item);
  const { data, error } = await supabase
    .from("item_bank")
    .upsert(row, { onConflict: "item_id" })
    .select(ADMIN_SELECT_FIELDS)
    .single();
  if (error) throw error;
  // Refresh the in-memory cache so an approval is reflected in the next session.
  refreshBankFromCloud({ force: true });
  return rowToItem(data);
}

export async function deleteItem(itemId) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("item_bank").delete().eq("item_id", itemId);
  if (error) throw error;
  refreshBankFromCloud({ force: true });
}

export async function setReviewStatus(itemId, reviewStatus) {
  if (!supabase) throw new Error("Supabase not configured");
  const patch = { review_status: reviewStatus };
  if (reviewStatus === "approved" || reviewStatus === "reviewed") {
    patch.reviewed_at = new Date().toISOString();
    const userRes = await supabase.auth.getUser().catch(() => null);
    const uid = userRes?.data?.user?.id;
    if (uid) patch.reviewed_by = uid;
  }
  const { data, error } = await supabase
    .from("item_bank")
    .update(patch)
    .eq("item_id", itemId)
    .select(ADMIN_SELECT_FIELDS)
    .single();
  if (error) throw error;
  refreshBankFromCloud({ force: true });
  return rowToItem(data);
}

/**
 * Bulk-approve a set of items by id. Returns the updated rows.
 */
export async function bulkSetReviewStatus(itemIds, reviewStatus) {
  if (!supabase) throw new Error("Supabase not configured");
  if (!Array.isArray(itemIds) || itemIds.length === 0) return [];
  const patch = { review_status: reviewStatus };
  if (reviewStatus === "approved" || reviewStatus === "reviewed") {
    patch.reviewed_at = new Date().toISOString();
    const userRes = await supabase.auth.getUser().catch(() => null);
    const uid = userRes?.data?.user?.id;
    if (uid) patch.reviewed_by = uid;
  }
  const { data, error } = await supabase
    .from("item_bank")
    .update(patch)
    .in("item_id", itemIds)
    .select(ADMIN_SELECT_FIELDS);
  if (error) throw error;
  refreshBankFromCloud({ force: true });
  return (data || []).map(rowToItem);
}

/**
 * Server-side cell coverage counts to power the admin heatmap. Returns an
 * array of { modeId, subskill, itemFamily, levelBand, count } rows for
 * APPROVED items only.
 */
export async function fetchCellCoverage() {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("item_bank")
    .select("mode_id, subskill, item_family, level_band")
    .eq("review_status", "approved");
  if (error) throw error;
  const counts = new Map();
  for (const row of data || []) {
    const key = `${row.mode_id}::${row.subskill}::${row.item_family}::${row.level_band}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => {
    const [modeId, subskill, itemFamily, levelBand] = key.split("::");
    return { modeId, subskill, itemFamily, levelBand, count };
  });
}
