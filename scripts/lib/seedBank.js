/**
 * The seed bank's selection (scripts/buildSeedBank.js): which bank rows ship
 * in src/itemBank/seedItems.js. Kept apart from the script so specs can read
 * the same cell key the seed was built with.
 *
 * A cell is (mode, family, level band). For the v2-only topics the live step
 * fills (a committed manifest, src/itemBank/v2/manifests/), the cell is
 * (mode, family, level band, subskill): each of those topics' play skills
 * draws only its own subskill's rows and falls to the generator when that
 * cell is empty, so an offline or signed-out kid needs seed rows in every
 * subskill, not just every family. Math Facts is v2-only too but has no
 * manifest: its practice builds any fact the bank lacks (src/skills/session.js),
 * and its seed stays as it shipped. With no manifest committed the key is
 * the old one for every topic, and the seed is byte-identical.
 */
import { isVerbalPrompt } from "../../src/modes/helpers.js";
import { V2_ONLY_MODE_IDS } from "../../src/modes/index.js";
import { MANIFESTS } from "../../src/itemBank/v2/manifests/index.js";

export const bandOf = (item) => {
  const [min] = item.levelRange || [1];
  return min <= 3 ? "K-1" : min <= 6 ? "2-3" : "4-5";
};

/** The topics whose seed cells also key on subskill: v2-only, with a committed manifest. */
export function subskillSeedModes({ v2Only = V2_ONLY_MODE_IDS, manifests = MANIFESTS } = {}) {
  const filled = new Set(manifests.map((m) => m.topic));
  return new Set(v2Only.filter((id) => filled.has(id)));
}

/** An item's seed cell. */
export function seedCellKey(item, subskillModes = new Set()) {
  const base = `${item.modeId}::${item.itemFamily}::${bandOf(item)}`;
  return subskillModes.has(item.modeId) ? `${base}::${item.subskill || ""}` : base;
}

/**
 * Up to `n` items per cell, spread evenly. Returns { seed, cells }.
 */
export function buildSeed(items, n, { subskillModes = new Set() } = {}) {
  const byCell = new Map();
  for (const item of items) {
    const key = seedCellKey(item, subskillModes);
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key).push(item);
  }

  const seed = [];
  for (const [, group] of byCell) {
    // Round-robin across SUBSKILLS first, spreading within each. Stride
    // sampling over the whole group is subskill-blind: when one authoring run
    // floods a cell, another subskill can end up with a single seed item and
    // the offline adaptive engine (which targets the weakest subskill) has no
    // alternates to rotate.
    const bySubskill = new Map();
    for (const item of group) {
      const key = item.subskill || "";
      if (!bySubskill.has(key)) bySubskill.set(key, []);
      bySubskill.get(key).push(item);
    }
    // Within each subskill, sample letter-free items first: sessions default
    // to word-problems OFF and the runtime selector filters verbal prompts —
    // an all-verbal seed cell serves NOTHING offline under default settings
    // (found via the factorsMultiples seed, which sampled 24 verbal drills).
    for (const [key, list] of bySubskill) {
      bySubskill.set(
        key,
        [...list].sort(
          (a, b) =>
            (isVerbalPrompt(a.question?.display?.promptText) ? 1 : 0) -
            (isVerbalPrompt(b.question?.display?.promptText) ? 1 : 0)
        )
      );
    }
    const buckets = [...bySubskill.values()].map((items) => ({
      items,
      step: Math.max(1, Math.floor(items.length / Math.max(1, Math.ceil(n / bySubskill.size)))),
      i: 0,
    }));
    let taken = 0;
    while (taken < n && buckets.some((b) => b.i < b.items.length)) {
      for (const b of buckets) {
        if (taken >= n) break;
        if (b.i >= b.items.length) continue;
        seed.push(b.items[b.i]);
        b.i += b.step;
        taken += 1;
      }
    }
  }
  return { seed, cells: byCell.size };
}
