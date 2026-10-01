/**
 * Helpers for the admin Standards tab: the status vocabulary of the
 * `standard_coverage` view, the totals line, and the v1 baseline (which
 * catalog skills cite a code). Pure, so the tab's arithmetic is tested
 * without a database.
 */
import { WORKSHEET_SKILLS } from "../skills/catalog.js";

/** The view's statuses, in the order a code moves through them. */
export const COVERAGE_STATUSES = Object.freeze([
  { id: "out_of_scope", label: "Out of scope", hint: "Marked not for the app, with a reason" },
  { id: "not_planned", label: "Not planned", hint: "No approved plan rows yet" },
  { id: "planned", label: "Planned", hint: "Plan rows approved, nothing written yet" },
  { id: "building", label: "Building", hint: "Some rows have models; not all have approved items" },
  { id: "ready_to_flip", label: "Ready to flip", hint: "Every row has approved items; the topic is not live" },
  { id: "in_preview", label: "In preview", hint: "Live for preview browsers" },
  { id: "covered", label: "Covered", hint: "Every approved row is live for everyone" },
]);

const LABEL = Object.fromEntries(COVERAGE_STATUSES.map((s) => [s.id, s.label]));

export function statusLabel(id) {
  return LABEL[id] || id;
}

/** The view's snake_case row in the shape the tab reads. */
export function rowToCoverage(row) {
  return {
    framework: row.framework,
    code: row.code,
    grade: row.grade,
    domain: row.domain,
    summary: row.summary,
    kind: row.kind,
    inScope: row.in_scope,
    scopeNote: row.scope_note ?? null,
    parentCode: row.parent_code ?? null,
    sortOrder: row.sort_order ?? 0,
    plannedRows: row.planned_rows ?? 0,
    modelsDrafted: row.models_drafted ?? 0,
    modelsApproved: row.models_approved ?? 0,
    itemsReady: row.items_ready ?? 0,
    itemsPreview: row.items_preview ?? 0,
    itemsLive: row.items_live ?? 0,
    needsLook: row.needs_look ?? 0,
    status: row.status,
  };
}

/**
 * The totals line. A code with sub-parts counts through them (3.NF.A.2 is
 * covered when 3.NF.A.2a and 3.NF.A.2b are), so only codes with no
 * sub-parts are counted; out-of-scope codes are left out of the percentage.
 */
export function coverageTotals(rows) {
  const parents = new Set(rows.map((r) => r.parentCode).filter(Boolean));
  const leaves = rows.filter((r) => !parents.has(r.code));
  const byStatus = Object.fromEntries(COVERAGE_STATUSES.map((s) => [s.id, 0]));
  for (const r of leaves) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const inScope = leaves.filter((r) => r.inScope !== "no").length;
  const covered = byStatus.covered || 0;
  return { codes: leaves.length, inScope, covered, percent: inScope ? Math.round((100 * covered) / inScope) : 0, byStatus };
}

let skillsByCode = null;

/** Catalog skills (v1 play and worksheets) that cite a Common Core code: the baseline before v2. */
export function catalogSkillsFor(code) {
  if (!skillsByCode) {
    skillsByCode = new Map();
    for (const skill of WORKSHEET_SKILLS) {
      for (const c of [].concat(skill.ccss || [])) {
        if (!c) continue;
        if (!skillsByCode.has(c)) skillsByCode.set(c, []);
        skillsByCode.get(c).push({ id: skill.id, title: skill.title, mode: skill.mode });
      }
    }
  }
  return skillsByCode.get(code) || [];
}
