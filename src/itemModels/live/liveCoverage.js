/**
 * Coverage for the live step: does every blueprint row of a topic and grade
 * have items at each tier it lists, and does every catalog skill of that
 * topic and grade have rows to serve?
 *
 * Pure (catalog data, the blueprint rows and the script rows' table), so
 * prepare.mjs, readiness.mjs and liveStep.spec read the same answer.
 */
import { CALC_ROWS } from "../../multiDigit/calcItems.js";
import { skillsForPlay } from "../../skills/play.js";
import { isBankSkill, skillRows } from "../../itemBank/v2/topicReadiness.js";
import { COVERED_MIN, DEFERRED_ROWS } from "./liveRules.js";

export const TIERS = Object.freeze(["easy", "moderate", "hard"]);
const TIER_IN_TEXT = /\((easy|moderate|hard)\)/;

/** Tiers of the script rows (src/multiDigit/calcItems.js), by row id. */
export const SCRIPT_ROW_TIERS = new Map(CALC_ROWS.map((r) => [r.rowId, [...new Set(r.variants.map((v) => v.difficulty))]]));

/**
 * The tiers a blueprint row lists: its own `difficulty`, the "(easy)",
 * "(moderate)" or "(hard)" written on any of its `spec.variants`, and, for
 * a script row, its variants' tiers. In easy, moderate, hard order.
 */
export function listedTiers(row, { scriptTiers = SCRIPT_ROW_TIERS } = {}) {
  const found = new Set();
  if (TIERS.includes(row?.difficulty)) found.add(row.difficulty);
  for (const v of row?.spec?.variants || []) {
    const m = TIER_IN_TEXT.exec(String(v));
    if (m) found.add(m[1]);
  }
  for (const t of scriptTiers.get(row?.id) || []) found.add(t);
  return TIERS.filter((t) => found.has(t));
}

/**
 * Each row and listed tier, with its state:
 *   covered      at least `min` items
 *   thin         some items, fewer than `min`
 *   deferred     no items yet, and the row is on the owner's deferral list
 *   held         no items: the tier's approved model is held (its fix is a draft)
 *   pending      no items: the tier's only models are drafts
 *   rejected     no items: the tier's models were rejected or flagged
 *   needs-build  no items: no model, and the row says the app needs a build
 *   missing      no items and no model
 *
 * `items` are this topic and grade's rows (filled and script); `models`
 * every repo model of the topic and grade ({ id, blueprintId, difficulty });
 * `plan` the model plan (liveRules.planModels) — a model it does not list
 * is not in the database.
 *
 * Returns { rows: [{ rowId, title, app, deferred, tiers: [{ tier, count,
 * state, note, models }] }], gaps, waiting } where `gaps` are the tiers that
 * stop a write (thin, missing, rejected, needs-build) and `waiting` the
 * held and pending ones.
 */
export function rowCoverage({ rows, items, models = [], plan = new Map(), deferred = DEFERRED_ROWS, min = COVERED_MIN, scriptTiers = SCRIPT_ROW_TIERS }) {
  const counts = new Map();
  for (const item of items) {
    const key = `${item.blueprintId}|${item.difficulty}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const out = [];
  const gaps = [];
  const waiting = [];
  for (const row of rows) {
    const app = String(row.spec?.app ?? "");
    const isDeferred = Boolean(deferred[row.id]);
    const tiers = listedTiers(row, { scriptTiers }).map((tier) => {
      const count = counts.get(`${row.id}|${tier}`) || 0;
      const tierModels = models.filter((m) => m.blueprintId === row.id && m.difficulty === tier);
      const states = tierModels.map((m) => ({ id: m.id, ...(plan.get(m.id) || { state: "unloaded", reason: "not in the database" }) }));
      let state;
      let note = "";
      if (count >= min) state = "covered";
      else if (count > 0) state = "thin";
      else if (isDeferred) {
        state = "deferred";
        note = `${deferred[row.id].reason} (${deferred[row.id].decided})`;
      } else if (states.some((s) => s.state === "held")) {
        state = "held";
        note = states.filter((s) => s.state === "held").map((s) => `${s.id}: ${s.reason}`).join("; ");
      } else if (states.some((s) => s.state === "pending")) {
        state = "pending";
        note = states.filter((s) => s.state === "pending").map((s) => `${s.id} is a draft`).join("; ");
      } else if (states.length && states.every((s) => s.state === "skip")) {
        state = "rejected";
        note = states.map((s) => `${s.id}: ${s.reason}`).join("; ");
      } else if (!tierModels.length && /^needs\b/i.test(app)) {
        state = "needs-build";
        note = app;
      } else {
        state = "missing";
        note = tierModels.length ? states.map((s) => `${s.id}: ${s.reason}`).join("; ") : "no model at this tier";
      }
      const entry = { tier, count, state, note, models: states.map((s) => `${s.id} (${s.state})`) };
      if (["thin", "missing", "rejected", "needs-build"].includes(state)) gaps.push({ rowId: row.id, ...entry });
      if (["held", "pending"].includes(state)) waiting.push({ rowId: row.id, ...entry });
      return entry;
    });
    out.push({ rowId: row.id, title: row.title, app, deferred: isDeferred, tiers });
  }
  return { rows: out, gaps, waiting };
}

/**
 * What each catalog skill of a topic and grade would serve from `items`
 * (as approved rows: a draft run is judged as if approved): the rows in
 * its own cell (cellMatches + withinNumbers, as a session draws them),
 * per family and tier, and the families it lists that have none. A skill
 * with no rows is a serving gap: its session falls to the generator. The
 * same matcher as the switch panel's readiness (src/itemBank/v2/topicReadiness.js);
 * computation drills are left out (they build their own questions).
 */
export function skillServing({ topic, grade, items }) {
  const approved = items.map((i) => (i.reviewStatus === "approved" ? i : { ...i, reviewStatus: "approved" }));
  return skillsForPlay(String(grade), topic).filter(isBankSkill).map((skill) => {
    const mine = skillRows(skill, approved);
    const families = Object.fromEntries(skill.source.families.map((f) => [f, mine.filter((i) => i.itemFamily === f).length]));
    const tiers = Object.fromEntries(TIERS.map((t) => [t, mine.filter((i) => i.difficulty === t).length]));
    return {
      skillId: skill.id,
      title: skill.title,
      count: mine.length,
      rows: new Set(mine.map((i) => i.blueprintId).filter(Boolean)).size,
      families,
      holes: Object.entries(families).filter(([, n]) => n === 0).map(([f]) => f),
      tiers,
      gap: mine.length === 0,
    };
  });
}
