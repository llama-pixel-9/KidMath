/**
 * The committed live-step manifests: one module per topic and grade
 * (e.g. wordProblemsG2.js), each written by scripts/live/prepare.mjs and
 * kept current by scripts/live/readiness.mjs. A manifest names the approved
 * models, their seeds and the script rows a run wrote as version-2
 * item_bank rows, plus the md5 the database must reproduce; the rows
 * themselves are refilled from the repo's model files
 * (src/itemBank/v2/modelRows.js) and checked by liveStep.spec.
 *
 * Empty until a run is committed: the app and every spec then behave as
 * if this folder did not exist.
 */
export const MANIFESTS = Object.freeze([]);
