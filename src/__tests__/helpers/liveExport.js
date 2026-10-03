/**
 * A live-step export folder built from the repo, for liveStep.spec: the
 * files exportSql.mjs's SELECTs would give (item_models.json,
 * blueprint_rows.json, switch.json, identities-001.json, counts.json), with
 * every repo model of a topic and grade approved at its own spec unless a
 * test says otherwise. Never a real export: prepare.mjs reads it only
 * under a test's stub layout and QC runners.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BLUEPRINT_ROWS } from "../../blueprints/index.js";
import { repoModelsFor } from "../../itemModels/repoModels.js";
import { specMd5 } from "../../itemModels/live/liveRows.js";
import { modelFlags, passedAll } from "../../../scripts/live/qcPanels.mjs";

export const FIXTURE_REVIEWER = "00000000-0000-4000-8000-0000000000aa";

const scratch = [];

/** A fresh temp folder; removeScratchDirs() removes every one made. */
export function scratchDir(name) {
  const dir = mkdtempSync(join(tmpdir(), `live-${name}-`));
  scratch.push(dir);
  return dir;
}

export function removeScratchDirs() {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
}

/** An item as exportSql.mjs's identity query returns it (prompt, and the display fields promptIdentity reads). */
export function identityRow(item, { status = "approved", version = 2, grade = item.tags?.grade ?? null, run = item.source?.run ?? null } = {}) {
  const d = item.question?.display || {};
  const parts = {};
  for (const f of ["coins", "discMat", "mode", "cols", "filled", "filledB", "takeAway", "array", "layout", "lineMode", "from", "to"]) if (d[f] != null) parts[f] = d[f];
  if (item.question?.answerType) parts.answerType = item.question.answerType;
  if (item.structureType === "chooseTrueEquation") parts.choices = item.question.choices;
  return { item_id: item.itemId, mode_id: item.modeId, structure_type: item.structureType, review_status: status, version, run, grade: grade == null ? null : String(grade), prompt: d.promptText ?? null, parts };
}

/**
 * Write an export folder. Options: statuses (model id -> review_status),
 * md5 (model id -> spec_md5 override), switchRows, identities (rows),
 * blueprintStatus, counts (overrides), extraModels (rows added as is).
 */
export function writeExport(dir, { topic, grade = "2", statuses = {}, md5 = {}, switchRows = [], identities = [], blueprintStatus = "draft", counts = {}, extraModels = [] }) {
  mkdirSync(dir, { recursive: true });
  const g = String(grade);
  const models = [
    ...repoModelsFor(topic, g).map((m) => ({
      id: m.id,
      mode_id: topic,
      grade: g,
      difficulty: m.difficulty ?? null,
      blueprint_id: m.blueprintId ?? null,
      review_status: statuses[m.id] ?? "approved",
      reviewed_by: FIXTURE_REVIEWER,
      reviewed_at: "2026-10-02T00:00:00Z",
      updated_at: "2026-10-02T00:00:00Z",
      spec_md5: md5[m.id] ?? specMd5(m),
    })),
    ...extraModels,
  ];
  const blueprintRows = BLUEPRINT_ROWS.filter((r) => r.mode_id === topic && String(r.grade) === g).map((r) => ({
    id: r.id,
    mode_id: topic,
    grade: g,
    difficulty: r.difficulty ?? null,
    status: blueprintStatus,
    reviewed_by: null,
    reviewed_at: null,
  }));
  const write = (name, rows) => writeFileSync(join(dir, name), JSON.stringify(rows));
  write("item_models.json", models);
  write("blueprint_rows.json", blueprintRows);
  write("switch.json", switchRows);
  write("identities-001.json", identities);
  write("counts.json", [{ item_models: models.length, blueprint_rows: blueprintRows.length, switch: switchRows.length, identities: identities.length, ...counts }]);
  return dir;
}

/** A layout runner that sweeps nothing: every item fits, unless `spill` names it. */
export const stubLayout = ({ spill = new Set() } = {}) => async (items) => new Map(items.map((i) => [i.itemId, { spill: spill.has(i.itemId) ? 40 : 0 }]));

/**
 * A QC module stand-in: both gates, both passes, every item clear unless
 * `flag` names it (flagged in pass A only). Keeps qcPanels' own passedAll
 * and modelFlags, which prepare uses to drop and hold.
 */
export function stubQc({ flag = new Set() } = {}) {
  const seen = [];
  return {
    seen,
    loadCalibration: () => ({ stub: true }),
    passedAll,
    modelFlags,
    runPanels: async (items) => {
      seen.push(items.map((i) => i.itemId));
      const clear = { flagged: false, reason: "" };
      const verdicts = new Map(
        items.map((i) => [
          i.itemId,
          {
            blind: { A: flag.has(i.itemId) ? { flagged: true, reason: "stub flag" } : clear, B: clear },
            kidSafe: { A: clear, B: clear },
          },
        ])
      );
      return { verdicts, receipt: { judge: { model: "stub-judge" }, calls: 0, disagreement: {}, itemsSha: `stub-${items.length}`, createdAt: "2026-10-03T00:00:00.000Z" } };
    },
  };
}
