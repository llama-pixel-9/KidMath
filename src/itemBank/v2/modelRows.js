/**
 * The version-2 rows the live step wrote, rebuilt from the committed
 * manifests (src/itemBank/v2/manifests/) the way factBankItems rebuilds the
 * Math Facts rows: every row is refilled from its repo model and seed (or
 * taken from the script rows), so the repo and the database hold the same
 * rows and liveStep.spec can prove it (the manifest's md5).
 *
 * Feeds FULL_ITEMS (fullBank.js) beside FACT_ITEMS. With no manifest
 * committed it returns nothing, and FULL_ITEMS is what it always was.
 *
 * Pure apart from the tables fill() reads: no network, no node: modules.
 */
import { MANIFESTS } from "./manifests/index.js";
import { fill } from "../../itemModels/fill.js";
import { repoModelById } from "../../itemModels/repoModels.js";
import { stampItem } from "../../itemModels/live/liveRules.js";
import { calcBankItems } from "../../multiDigit/calcItems.js";

/**
 * One manifest's rows, in manifest order: { items, problems }. A problem
 * (a model the repo no longer has, a script row id the script no longer
 * makes) is reported, never papered over.
 */
export function refillManifest(manifest) {
  const items = [];
  const problems = [];
  const status = manifest.status;
  for (const [modelId, entry] of Object.entries(manifest.models || {})) {
    const model = repoModelById(modelId);
    if (!model) {
      problems.push(`${manifest.topic} G${manifest.grade}: model ${modelId} is not in src/itemModels`);
      continue;
    }
    for (const seed of entry.seeds || []) {
      try {
        items.push(stampItem(fill(model, { seed }), { status, run: entry.run, specMd5: entry.specMd5 }));
      } catch (err) {
        problems.push(`${modelId} seed ${seed}: ${err.message}`);
      }
    }
  }
  const script = manifest.scriptRows;
  if (script?.ids?.length) {
    const byId = new Map(calcBankItems().map((i) => [i.itemId, i]));
    for (const id of script.ids) {
      const item = byId.get(id);
      if (!item) problems.push(`script row ${id} is not made by src/multiDigit/calcItems.js`);
      else items.push(stampItem(item, { status, run: script.run }));
    }
  }
  return { items, problems };
}

/** Every committed manifest's rows. Throws on any problem: a manifest the repo cannot rebuild is a broken bundle. */
export function modelBankItems(manifests = MANIFESTS) {
  return manifests.flatMap((manifest) => {
    const { items, problems } = refillManifest(manifest);
    if (problems.length) throw new Error(`live-step manifest ${manifest.topic} G${manifest.grade}: ${problems.join("; ")}`);
    return items;
  });
}
