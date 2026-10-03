/**
 * The live step's rules: which topics may be approved, which blueprint rows
 * wait on a build, which approved models are held, and how a filled row is
 * stamped. Pure data and small functions, no imports: read by the live
 * scripts (scripts/live/), the manifest refill (src/itemBank/v2/modelRows.js)
 * and liveStep.spec.
 *
 * Every rule here is an owner decision written as code, so it is easy to
 * find and change:
 *   - OLD_IOS_TOPICS: iPhone builds before PR #150 ignore the version switch
 *     and serve every approved row of a topic they show, so no v2 row is
 *     approved in these topics until kids have that build (SKILL.md step 7).
 *   - DEFERRED_ROWS: rows with no model yet, deferred until their widget is
 *     built (owner card, recommended default, 2026-10-03).
 *   - HOLD_ORIGINAL_WHILE_FIX_PENDING: an approved model whose "-2" fix is a
 *     draft is held, so no row is written that must be retired once the fix
 *     is approved (owner card, recommended default).
 */

/** Items per model, distinct by promptIdentity (item-models SKILL.md step 7). */
export const FILL_QUOTA = 30;

/** Seeds a model may draw from before it is reported short of its quota. */
export const MAX_SEED = 200;

/**
 * Items a blueprint row needs at each tier it lists to count as covered:
 * the session's no-repeat window (RECENT_BANK_WINDOW, src/mathEngine.js).
 */
export const COVERED_MIN = 8;

/** The share of a model's checked items that, once flagged by QC, holds the whole model. */
export const HOLD_FLAG_RATE = 0.1;

/** Default ceiling on the A/B disagreement rate of a QC gate (C.4.5); fix it on the first calibrated run. */
export const MAX_AB_DISAGREEMENT = 0.02;

/** QC passes: the same pinned judge, two different batch shuffles. */
export const QC_PASSES = Object.freeze(["A", "B"]);

/** Reruns of a pass that missed a canary before the run stops. */
export const MAX_VOID_RERUNS = 2;

/**
 * The 25 topics an iPhone build before PR #150 shows (97669d0^:
 * ios/KidMath/Models/ModeCatalog.swift). Those builds read no `version`
 * column and serve every approved row of a topic they fetch, so a v2 row
 * may be written to these topics as a draft at most.
 */
export const OLD_IOS_TOPICS = Object.freeze([
  "counting", "numberBonds", "comparing", "skipCounting", "placeValue", "placeValueDiscs",
  "addition", "subtraction", "barModels",
  "multiplication", "division", "factorsMultiples", "patterns",
  "fractions", "decimals", "fractionOps", "decimalOps",
  "measurement", "money", "time", "areaPerimeter",
  "linesShapes", "angles", "dataGraphs", "volumeCoordinates",
]);

const OLD_IOS = new Set(OLD_IOS_TOPICS);

/** The review status a live-step write may give a topic's rows. */
export function writeStatusFor(topic) {
  return OLD_IOS.has(topic) ? "draft" : "approved";
}

/**
 * Blueprint rows deferred by the owner, one entry per row: why, in the
 * owner's words, and when. A deferred row is reported, never counted as a
 * coverage gap. Remove a row from this list when its widget ships and its
 * model is approved.
 */
const NO_WIDGET = { reason: "no widget yet", decided: "2026-10-03" };
export const DEFERRED_ROWS = Object.freeze({
  "wp-g2-choose-two-equations": NO_WIDGET,
  "wp-g2-two-step-two-part": NO_WIDGET,
  "wp-g2-two-step-tape-choice": NO_WIDGET,
  "wp-g2-tx-fl-story-for-equation": NO_WIDGET,
  "wp-g2-tx-1000-story-for-equation": NO_WIDGET,
  "calc-g2-add-number-line": NO_WIDGET,
  "calc-g2-true-false": NO_WIDGET,
  "calc-g2-true-false-both-sides": NO_WIDGET,
  "calc-g2-va-not-equal": NO_WIDGET,
});

/** Owner card (a): hold an approved original while its fix is a draft. */
export const HOLD_ORIGINAL_WHILE_FIX_PENDING = true;

/**
 * The fixes of a model: ids `<id>-<n>` with n >= 2 (a fix to a flagged,
 * rejected or approved model gets a new id with a "-2" suffix, a fix of
 * the fix "-3"). Only ids present in `ids` count.
 */
export function fixesOf(id, ids) {
  const re = new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`);
  return [...ids].filter((other) => {
    const m = re.exec(other);
    return m && Number(m[1]) >= 2;
  });
}

/**
 * Decide what the live step does with each model of a topic and grade.
 *
 * `statuses` maps model id -> review_status (draft | approved | rejected |
 * flagged), from the database. Returns Map(id -> { state, reason, by }):
 *   fill        approved and not set aside
 *   superseded  approved, but a fix of it is approved: the fix is filled
 *   held        approved, but a fix of it is still a draft (owner card a)
 *   pending     a draft: not filled, may cover its row once approved
 *   skip        rejected or flagged
 */
export function planModels(statuses, { holdWhileFixPending = HOLD_ORIGINAL_WHILE_FIX_PENDING } = {}) {
  const map = statuses instanceof Map ? statuses : new Map(Object.entries(statuses));
  const ids = new Set(map.keys());
  const out = new Map();
  for (const [id, status] of map) {
    if (status === "draft") {
      out.set(id, { state: "pending", reason: "draft model", by: null });
      continue;
    }
    if (status !== "approved") {
      out.set(id, { state: "skip", reason: `${status} model`, by: null });
      continue;
    }
    const fixes = fixesOf(id, ids);
    const approvedFix = fixes.find((f) => map.get(f) === "approved");
    const draftFix = fixes.find((f) => map.get(f) === "draft");
    if (approvedFix) out.set(id, { state: "superseded", reason: `fix ${approvedFix} is approved`, by: approvedFix });
    else if (draftFix && holdWhileFixPending) out.set(id, { state: "held", reason: `fix ${draftFix} is a draft`, by: draftFix });
    else out.set(id, { state: "fill", reason: "approved", by: null });
  }
  return out;
}

/** "wp-g2-x-s7-v2" -> "wp-g2-x" (fill.js item ids). */
export function modelIdOfItem(itemId) {
  const m = /^(.*)-s\d+-v2$/.exec(String(itemId));
  return m ? m[1] : null;
}

/**
 * A filled item as the live step writes it: its review status, and a
 * source that names the run, the model spec it was filled from and the
 * seed (fill.js gives { generator, itemModelId, seed }). Script rows (no
 * model) keep their own source fields plus the run.
 */
export function stampItem(item, { status, run, specMd5 = null }) {
  const source = item.itemModelId
    ? { generator: "itemModels", itemModelId: item.itemModelId, seed: item.source?.seed ?? null, specMd5, run }
    : { generator: "script", blueprintId: item.blueprintId ?? null, variant: item.tags?.variant ?? null, run };
  return { ...item, reviewStatus: status, source };
}
