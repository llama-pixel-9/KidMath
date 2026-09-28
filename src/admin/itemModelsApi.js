import { supabase } from "../supabaseClient.js";

/**
 * Admin reads and writes on `item_models`, the templates v2 items are
 * generated from (plan section 8). A row is one reviewed model: `spec` holds
 * the ItemModel JSON (src/itemModels/schema.js) and the review columns say
 * who decided what, when. Review happens per model, never in bulk, so there
 * is one decision writer and no bulk path here on purpose.
 */

const MODEL_SELECT_FIELDS =
  "id, mode_id, subskill, grade, difficulty, spec, review_status, review_note, " +
  "reviewed_by, reviewed_at, created_at, updated_at";

export const MODEL_REVIEW_STATUSES = Object.freeze(["draft", "approved", "rejected", "flagged"]);

export function rowToModel(row) {
  return {
    id: row.id,
    modeId: row.mode_id,
    subskill: row.subskill ?? null,
    grade: row.grade ?? null,
    difficulty: row.difficulty ?? null,
    spec: row.spec,
    reviewStatus: row.review_status,
    reviewNote: row.review_note ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

async function currentUserId() {
  const userRes = await supabase.auth.getUser().catch(() => null);
  return userRes?.data?.user?.id || null;
}

/**
 * Every model, oldest first so the review order is stable between visits.
 * Paginated like the item_bank reads: a skill spanning three grades is about
 * 90 models and there are 25 skills, so the table will pass supabase-js's
 * silent 1,000-row cap, and an unpaginated read would quietly hide the rest.
 */
export async function listItemModels() {
  if (!supabase) throw new Error("Supabase not configured");
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("item_models")
      .select(MODEL_SELECT_FIELDS)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows.map(rowToModel);
}

/**
 * Record a review decision on one model. `note` is the reject reason or the
 * reviewer's remark; `spec` carries an inline edit so wording fix + approval
 * land in one write (the same shape as the bank's wording pick + approve).
 * Returns the updated model.
 */
export async function setModelReview(id, reviewStatus, { note = null, spec } = {}) {
  if (!supabase) throw new Error("Supabase not configured");
  if (!MODEL_REVIEW_STATUSES.includes(reviewStatus)) {
    throw new Error(`Unknown review status "${reviewStatus}"`);
  }
  const patch = {
    review_status: reviewStatus,
    review_note: note || null,
    reviewed_at: new Date().toISOString(),
  };
  const uid = await currentUserId();
  if (uid) patch.reviewed_by = uid;
  if (spec !== undefined) patch.spec = spec;
  const { data, error } = await supabase
    .from("item_models")
    .update(patch)
    .eq("id", id)
    .select(MODEL_SELECT_FIELDS)
    .single();
  if (error) throw error;
  return rowToModel(data);
}

/**
 * Save an inline edit of a model's spec without recording a decision, so a
 * wording fix survives closing the editor. The review columns are left as
 * they are; a later approve, reject or flag writes those.
 */
export async function saveModelSpec(id, spec) {
  if (!supabase) throw new Error("Supabase not configured");
  if (!spec || typeof spec !== "object") throw new Error("A spec object is required");
  const { data, error } = await supabase
    .from("item_models")
    .update({ spec })
    .eq("id", id)
    .select(MODEL_SELECT_FIELDS)
    .single();
  if (error) throw error;
  return rowToModel(data);
}
