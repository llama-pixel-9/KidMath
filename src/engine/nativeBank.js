/**
 * The native engine's item bank, with the version switch applied.
 *
 * Swift fetches a topic's approved rows (both versions) and the
 * `item_version_switch` rows, and injects both; nothing here fetches. This
 * module keeps every injected cloud row and rebuilds the engine's in-memory
 * bank whenever the rows, the switch or the preview flag change, so a flip
 * takes effect at the next re-read of the switch without a re-fetch.
 *
 * What a kid is served matches the web (src/itemBank/cloudLoader.js,
 * modeLoader.js), using the same rule (src/itemBank/versionRules.js):
 *   - A topic with cloud rows serves only the rows `isServable` allows, and
 *     they replace that topic's seed items, as the web's signed-in refresh
 *     replaces the seed. A topic at v2 with no approved v2 rows serves no
 *     bank items, so its cells fall back to the generator, as on the web.
 *   - A topic whose fetch succeeded counts as having cloud rows even when it
 *     returned none (Swift passes the topic id with the rows).
 *   - A topic with no cloud rows (signed out, offline, not opened yet) keeps
 *     its seed items unfiltered, as the web does for anonymous and offline
 *     kids.
 *
 * Pure: imports only the bank leaves and the rules, so it is safe in
 * JavaScriptCore (scripts/buildEngineBundle.js guards the graph).
 */

import { BUNDLED_ITEMS } from "../itemBank/bundle.js";
import { setBankItems } from "../itemBank/index.js";
import { normalizeBankRow } from "../itemBank/normalize.js";
import { isServable, switchMapFromRows, topicVisible } from "../itemBank/versionRules.js";

/** Items served for topics with no cloud rows: the seed, or what setItems injected. */
let base = BUNDLED_ITEMS;
let baseSource = "bundle";
/** modeId -> Map(itemId -> normalized item): every injected cloud row, any version. */
const cloud = new Map();
/** Map(modeId -> "v1" | "preview" | "v2"); empty means the defaults (v1; Math Facts v2; Word Problems preview). */
let switchMap = new Map();
let preview = false;

function rebuild() {
  const served = base.filter((item) => !cloud.has(item?.modeId));
  for (const held of cloud.values()) {
    for (const item of held.values()) {
      if (isServable(item, switchMap, { preview })) served.push(item);
    }
  }
  setBankItems(served, cloud.size ? "native-cloud" : baseSource);
}

/** Replace the base bank wholesale and drop every cloud row (tests pass []). */
export function setItems(items) {
  base = Array.isArray(items) ? items.slice() : [];
  baseSource = "native";
  cloud.clear();
  rebuild();
}

/** Back to the bundled seed with no cloud rows (sign-out). The switch stays. */
export function reset() {
  base = BUNDLED_ITEMS;
  baseSource = "bundle";
  cloud.clear();
  rebuild();
}

/**
 * Raw PostgREST item_bank rows -> normalized (the web's mapping) -> held per
 * topic. A row already held is replaced by the newer copy. Invalid rows are
 * dropped. Returns how many item ids were not held before.
 *
 * `modeId` names the topic the fetch was for. That topic then counts as
 * cloud-loaded even when the fetch returned no valid rows, so it serves what
 * the switch allows (possibly nothing, falling back to the generator) in
 * place of its seed, as the web's signed-in refresh does for a topic with no
 * approved rows.
 */
export function addRows(rows, modeId) {
  let changed = false;
  if (typeof modeId === "string" && modeId && !cloud.has(modeId)) {
    cloud.set(modeId, new Map());
    changed = true;
  }
  let fresh = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const item = normalizeBankRow(row);
    if (!item?.itemId || !item.modeId) continue;
    let held = cloud.get(item.modeId);
    if (!held) {
      held = new Map();
      cloud.set(item.modeId, held);
    }
    if (!held.has(item.itemId)) fresh += 1;
    held.set(item.itemId, item);
    changed = true;
  }
  if (changed) rebuild();
  return fresh;
}

function sameSwitch(a, b) {
  if (a.size !== b.size) return false;
  for (const [modeId, live] of a) if (b.get(modeId) !== live) return false;
  return true;
}

/**
 * Inject the switch: raw `item_version_switch` rows ({ mode_id, live_version })
 * and whether this device is a preview viewer. An empty or missing list means
 * every topic at its default, which is what the web serves when its read fails.
 * Swift re-injects the switch at every session start once its 30 s cache
 * runs out, so an unchanged switch skips the rebuild.
 */
export function setVersionSwitch(rows, options) {
  const nextMap = switchMapFromRows(rows);
  const nextPreview = Boolean(options?.preview);
  if (nextPreview === preview && sameSwitch(nextMap, switchMap)) return;
  switchMap = nextMap;
  preview = nextPreview;
  rebuild();
}

/** The topics among `topicIds` (the v2-only ones) the pickers must hide. */
export function hiddenTopics(topicIds) {
  return (Array.isArray(topicIds) ? topicIds : []).filter(
    (id) => !topicVisible(id, switchMap, { v2Only: true, preview })
  );
}
