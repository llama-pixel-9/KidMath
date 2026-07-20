/* Run full validation + license + dedupe checks on a batch of candidate
 * drafts before they're written to Supabase.
 */

import { validateBankItem } from "../../src/itemBank/index.js";
import { BUNDLED_ITEMS } from "../../src/itemBank/bundle.js";
import { licenseAllowed } from "./loadExemplars.js";
import { checkStructure } from "../../src/itemBank/qc/structureCheck.js";
import { promptSignature } from "../../src/itemBank/index.js";

/** At most this many items in one batch may share a prompt signature. */
const SIGNATURE_LIMIT = 3;
/** At most this many items in one batch may open with the same name. */
const ACTOR_LIMIT = 4;

export function validateDrafts(candidates, { cell, exemplarsById }) {
  const existingPrompts = new Set(
    BUNDLED_ITEMS.map((i) => i.question?.display?.promptText?.trim())
      .filter(Boolean)
  );
  const accepted = [];
  const rejected = [];
  const seenPrompts = new Set();
  const signatureCounts = new Map();
  const actorCounts = new Map();
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

    // Does the prose actually match the structure it claims? The usual LLM
    // failure on a hard structure is to quietly write an easy one instead
    // (M6.2). Rejecting here is cheap; a mislabelled item in the bank is not.
    const structure = checkStructure(item);
    if (!structure.ok) {
      errors.push(...structure.problems.map((p) => `structure ${item.structureType}: ${p}`));
    }

    const prompt = cand.payload?.display?.promptText?.trim();
    if (prompt) {
      if (prompt.length > 220) errors.push(`prompt is ${prompt.length} chars; limit is 220`);
      if (existingPrompts.has(prompt)) errors.push(`duplicate prompt in bank: ${prompt}`);
      if (seenPrompts.has(prompt)) errors.push(`duplicate prompt within batch: ${prompt}`);
      seenPrompts.add(prompt);

      // Signature-level repetition: 100 items in one cell that differ only in
      // their numbers are one item. This is the check that stops an authoring
      // batch drifting into a single context.
      const sig = promptSignature(prompt);
      signatureCounts.set(sig, (signatureCounts.get(sig) || 0) + 1);
      if (signatureCounts.get(sig) > SIGNATURE_LIMIT) {
        errors.push(
          `prompt signature repeated ${signatureCounts.get(sig)} times in this batch (limit ${SIGNATURE_LIMIT}) — vary the context, not just the numbers`
        );
      }

      // Actor-name overuse within a cell.
      const actor = prompt.match(/^([A-Z][a-z]+)\b/)?.[1];
      if (actor) {
        actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
        if (actorCounts.get(actor) > ACTOR_LIMIT) {
          errors.push(`actor "${actor}" used ${actorCounts.get(actor)} times in this batch (limit ${ACTOR_LIMIT})`);
        }
      }
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
