/**
 * Every item model committed under src/itemModels/, by id: the files the
 * live step fills from (scripts/live/prepare.mjs) and refills from
 * (src/itemBank/v2/modelRows.js). Approval lives in the database
 * (item_models.review_status); a model is filled only when the database's
 * approved spec equals this file's (spec minus `checks`).
 *
 * Pure data. A new model file is listed here as well (liveStep.spec checks
 * that every model file is).
 */
import G2_CALC_EQUAL from "./g2Addsub/calcEqual.json" with { type: "json" };
import G2_CALC_STRATEGIES from "./g2Addsub/calcStrategies.json" with { type: "json" };
import G2_CALC_TRADES from "./g2Addsub/calcTrades.json" with { type: "json" };
import G2_WP_CHANGE from "./g2Addsub/wpChange.json" with { type: "json" };
import G2_WP_COMPARE from "./g2Addsub/wpCompare.json" with { type: "json" };
import G2_WP_EQUATIONS from "./g2Addsub/wpEquations.json" with { type: "json" };
import G2_WP_TWO_STEP from "./g2Addsub/wpTwoStep.json" with { type: "json" };
import MONEY_G3 from "./money/grade3.json" with { type: "json" };
import MONEY_G4 from "./money/grade4.json" with { type: "json" };
import MONEY_G5 from "./money/grade5.json" with { type: "json" };
import MONEY_G2 from "./pilot/grade2Money.json" with { type: "json" };

/** File (relative to src/itemModels/) -> its models. */
export const MODEL_FILES = Object.freeze({
  "g2Addsub/calcEqual.json": G2_CALC_EQUAL,
  "g2Addsub/calcStrategies.json": G2_CALC_STRATEGIES,
  "g2Addsub/calcTrades.json": G2_CALC_TRADES,
  "g2Addsub/wpChange.json": G2_WP_CHANGE,
  "g2Addsub/wpCompare.json": G2_WP_COMPARE,
  "g2Addsub/wpEquations.json": G2_WP_EQUATIONS,
  "g2Addsub/wpTwoStep.json": G2_WP_TWO_STEP,
  "money/grade3.json": MONEY_G3,
  "money/grade4.json": MONEY_G4,
  "money/grade5.json": MONEY_G5,
  "pilot/grade2Money.json": MONEY_G2,
});

/** [{ model, file }] in file order. */
export const REPO_MODELS = Object.freeze(
  Object.entries(MODEL_FILES).flatMap(([file, list]) => (Array.isArray(list) ? list : []).map((model) => Object.freeze({ model, file })))
);

const BY_ID = new Map();
for (const entry of REPO_MODELS) if (!BY_ID.has(entry.model.id)) BY_ID.set(entry.model.id, entry);

/** The committed model with this id, or null. */
export function repoModelById(id) {
  return BY_ID.get(id)?.model ?? null;
}

/** The file a model is committed in, or null. */
export function repoModelFile(id) {
  return BY_ID.get(id)?.file ?? null;
}

/** A topic's committed models for one grade, in file order. */
export function repoModelsFor(topic, grade) {
  return REPO_MODELS.map((e) => e.model).filter((m) => m.modeId === topic && String(m.grade).toUpperCase() === String(grade).toUpperCase());
}
