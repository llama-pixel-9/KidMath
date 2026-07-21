import { validateBankItem } from "./index.js";

/**
 * Convert a row from public.item_bank into the in-memory bank shape.
 * Returns null when the row fails client-side validation so a bad cloud
 * row never replaces a known-good bundled item.
 *
 * Pure module (no network imports): shared by the web cloud loaders AND the
 * native engine bundle, so the row->item mapping exists exactly once. The iOS
 * app fetches raw PostgREST rows in Swift and hands them to
 * KidMath.addBankRows, which runs this same normalization inside JSC.
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
    representationType: row.representation_type || null,
    levelBand: row.level_band || null,
    source: row.source || null,
  };
  const { valid } = validateBankItem(item);
  if (!valid) return null;
  return item;
}
