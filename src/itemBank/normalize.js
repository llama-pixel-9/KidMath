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
function toVersion(value) {
  const n = Number(value);
  return value != null && Number.isInteger(n) && n >= 1 ? n : 1;
}

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
    // v2 groundwork columns. Every one is optional on the row: v1 rows, the
    // bundled seed, and rows fetched by a client on the pre-migration select
    // all lack them, and a missing `version` means 1 (see versionSwitch).
    version: toVersion(row.version),
    itemModelId: row.item_model_id ?? null,
    difficulty: row.difficulty ?? null,
    hint: row.hint && typeof row.hint === "object" ? row.hint : null,
    tags: row.tags ?? null,
  };
  const { valid } = validateBankItem(item);
  if (!valid) return null;
  return item;
}
