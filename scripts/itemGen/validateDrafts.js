/* Run full validation + license + dedupe checks on a batch of candidate
 * drafts before they're written to Supabase.
 */

import { validateBankItem } from "../../src/itemBank/index.js";
import { BUNDLED_ITEMS } from "../../src/itemBank/bundle.js";
import { licenseAllowed } from "./loadExemplars.js";

export function validateDrafts(candidates, { cell, exemplarsById }) {
  const existingPrompts = new Set(
    BUNDLED_ITEMS.map((i) => i.question?.display?.promptText?.trim())
      .filter(Boolean)
  );
  const accepted = [];
  const rejected = [];
  const seenPrompts = new Set();
  for (const cand of candidates) {
    const errors = [];

    const exemplar = cand.exemplarId ? exemplarsById.get(cand.exemplarId) : null;
    if (exemplar && !licenseAllowed(exemplar)) {
      errors.push(`exemplar ${cand.exemplarId} uses non-allowlisted license ${exemplar.source?.license}`);
    }

    const itemId = buildItemId(cell, cand, accepted.length + rejected.length);
    const item = {
      itemId,
      modeId: cell.modeId,
      itemFamily: cell.itemFamily,
      subskill: cell.subskill,
      structureType: cand.structureType || exemplar?.structureType || "unknown",
      levelRange: bandToLevelRange(cell.levelBand),
      reviewStatus: "draft",
      representationType: cand.payload?.display?.representation || null,
      source: {
        generator: "scripts/itemGen",
        exemplarId: cand.exemplarId || null,
        provider: cand.provider || "echo",
      },
      question: cand.payload,
    };

    const { valid, errors: schemaErrors } = validateBankItem(item);
    if (!valid) errors.push(...schemaErrors);

    const prompt = cand.payload?.display?.promptText?.trim();
    if (prompt) {
      if (existingPrompts.has(prompt)) errors.push(`duplicate prompt in bank: ${prompt}`);
      if (seenPrompts.has(prompt)) errors.push(`duplicate prompt within batch: ${prompt}`);
      seenPrompts.add(prompt);
    }

    if (errors.length === 0) accepted.push(item);
    else rejected.push({ itemId, errors });
  }
  return { accepted, rejected };
}

function buildItemId(cell, cand, offset) {
  const suffix = String(offset + 1).padStart(3, "0");
  const fam = cell.itemFamily === "application"
    ? "app"
    : cell.itemFamily === "conceptual"
      ? "conc"
      : "proc";
  const band = cell.levelBand.replace("-", "_");
  return `${cell.modeId}-${fam}-${cell.subskill}-${band}-${suffix}`;
}

function bandToLevelRange(band) {
  if (band === "K-1") return [1, 3];
  if (band === "2-3") return [4, 6];
  return [7, 10];
}
