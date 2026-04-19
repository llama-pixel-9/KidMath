import { supabase } from "../supabaseClient";
import { refreshBankFromCloud } from "../itemBank/cloudLoader";

const ADMIN_SELECT_FIELDS =
  "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, review_status, payload, version, created_at, updated_at";

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
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  const { data, error } = await supabase
    .from("item_bank")
    .update({ review_status: reviewStatus })
    .eq("item_id", itemId)
    .select(ADMIN_SELECT_FIELDS)
    .single();
  if (error) throw error;
  refreshBankFromCloud({ force: true });
  return rowToItem(data);
}
