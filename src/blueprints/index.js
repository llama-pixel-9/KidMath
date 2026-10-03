/**
 * Blueprint rows: the one-line question plans Sai approves before anything is
 * written ("2.MD.C.8, join change unknown, coin picture, typed, easy"). Item
 * models point back at the row they were written for; fluency rows (one per
 * operation, strategy group and fact band) are generated straight from the
 * row by script.
 *
 * Each file here is { rows: [...] }. Rows are authored in the repo and
 * copied into `blueprint_rows` by scripts/standards/loadStandards.js; the
 * row's codes go to `blueprint_standards`. Approval lives in the database
 * (`status`), the same way item models are reviewed there, and a reload
 * never overwrites a row that is no longer a draft.
 *
 * Pure: no network, no DOM.
 */
import factFluency from "./factFluency.json" with { type: "json" };
// Grade 2 add and subtract (Sai approved both lists as recommended,
// 2026-10-02): the Word Problems topic's stories and box equations, and the
// multiDigit topic's computation. The review pages are
// item-skill/g2-addsub-{wp,calc}-blueprints.md in the project files.
import g2AddsubWp from "./g2AddsubWp.json" with { type: "json" };
import g2AddsubCalc from "./g2AddsubCalc.json" with { type: "json" };
import { FRAMEWORKS, GRADES } from "../standards/index.js";

const FILES = { factFluency, g2AddsubWp, g2AddsubCalc };

export const TRACKS = Object.freeze(["item", "fluency"]);

/** Every row, in file order, tagged with the file it came from. */
export const BLUEPRINT_ROWS = Object.freeze(
  Object.entries(FILES).flatMap(([file, data]) =>
    (Array.isArray(data?.rows) ? data.rows : []).map((row) => Object.freeze({ ...row, file }))
  )
);

const BY_ID = new Map(BLUEPRINT_ROWS.map((r) => [r.id, r]));

export function blueprintById(id) {
  return BY_ID.get(id) || null;
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Shape errors in one row, as strings. Codes are checked separately (unknownCodes). */
export function validateBlueprintRow(row) {
  const errors = [];
  if (typeof row?.id !== "string" || !ID.test(row.id)) errors.push(`bad id "${row?.id}"`);
  if (!TRACKS.includes(row?.track)) errors.push(`track "${row?.track}"`);
  if (typeof row?.mode_id !== "string" || !row.mode_id) errors.push("missing mode_id");
  if (!GRADES.includes(row?.grade)) errors.push(`grade "${row?.grade}"`);
  if (typeof row?.title !== "string" || !row.title) errors.push("missing title");
  const standards = row?.standards;
  if (!standards || typeof standards !== "object" || Array.isArray(standards)) {
    errors.push("missing standards");
  } else {
    for (const [fw, codes] of Object.entries(standards)) {
      if (!FRAMEWORKS.includes(fw)) errors.push(`unknown framework "${fw}"`);
      if (!Array.isArray(codes)) errors.push(`standards.${fw} must be a list`);
    }
    if (!(standards.ccss?.length || Object.values(standards).some((c) => Array.isArray(c) && c.length))) {
      errors.push("cites no code");
    }
  }
  if ("status" in (row || {})) errors.push("status is decided in the database, not the file");
  return errors;
}
