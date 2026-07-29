import { promptOptionsOf, payloadWithChoice, choiceList } from "./reviewChoice.js";

/**
 * Batch-trust review: items that arrived together get reviewed together.
 *
 * Every generated item has already passed the deterministic math/structure
 * gate, so per-item human review of thousands of siblings mostly re-reads the
 * same register. Instead the reviewer reads a random sample of a batch and
 * approves the whole batch on its strength; Retire remains available per item
 * afterwards, and QC-failing items are NEVER swept in — they stay in the
 * queue for individual attention.
 */

/** Grouping key: how the item was produced × which mode it belongs to. */
export function batchKeyOf(item) {
  if (item.reviewStatus === "approved" && promptOptionsOf(item).length > 0) {
    return `rewording::${item.modeId}`;
  }
  const origin = item.source?.generator || item.source?.provider || "manual";
  return `${origin}::${item.modeId}`;
}

const ORIGIN_LABELS = {
  rewording: "Wording rewrites (top pick applies)",
  authorStructures: "Difficult structures",
  "scripts/itemGen": "New items (exemplar pipeline)",
  manual: "Manually added",
};

export function batchLabel(key) {
  const [origin, modeId] = key.split("::");
  return `${ORIGIN_LABELS[origin] || origin} — ${modeId}`;
}

/** Group queue items into batches, largest first. */
export function groupIntoBatches(items) {
  const map = new Map();
  for (const it of items || []) {
    const key = batchKeyOf(it);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return [...map.entries()]
    .map(([key, batchItems]) => ({ key, label: batchLabel(key), items: batchItems }))
    .sort((a, b) => b.items.length - a.items.length);
}

/** Spot-check size: everything for tiny batches, ~10% clamped to 12..30 otherwise. */
export function sampleSize(n) {
  if (n <= 12) return n;
  return Math.min(30, Math.max(12, Math.ceil(n * 0.1)));
}

/** A random sample of the batch, stable while the same array is passed. */
export function sampleOf(batchItems, rand = Math.random) {
  const n = sampleSize(batchItems.length);
  const pool = [...batchItems];
  const picks = [];
  while (picks.length < n && pool.length) {
    picks.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return picks;
}

/**
 * Build the approval entries for a whole batch. QC-failing items are excluded
 * (they stay in the queue); optioned items get the reviewer's chosen wording,
 * defaulting to the top-ranked option.
 */
export function batchApprovalEntries(batchItems, qcById, choices = new Map()) {
  const entries = [];
  const skipped = [];
  for (const it of batchItems) {
    if (qcById.get(it.itemId)?.pass === false) {
      skipped.push(it.itemId);
      continue;
    }
    const list = choiceList(it);
    if (list.length > 0) {
      const picked = choices.get(it.itemId);
      const chosen = picked !== undefined && list.includes(picked) ? picked : list[0];
      entries.push({ itemId: it.itemId, payload: payloadWithChoice(it.payload, chosen) });
    } else {
      entries.push({ itemId: it.itemId });
    }
  }
  return { entries, skipped };
}
