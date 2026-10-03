/**
 * The item-model harness's per-model rules (scripts/itemModels/harness.mjs):
 * the topic a model must be filed under, the codes it must carry and the id
 * it should have, and whether the coin checks apply.
 *
 * What decides, in order:
 *   1. the model's blueprint row (`blueprintId`, src/blueprints/): the row's
 *      topic and grade; codes are held to the row's by validateModel, so the
 *      harness only asks that one exists in some framework (an empty ccss is
 *      fine when the row has a state code); ids `<row id>[-<variant>][-2]`;
 *   2. the --mode, --code and --prefix flags, for a model with no row;
 *   3. money, the pilot's rules: Grade 2 names 2.MD.C.8, Grades 3-5 name a
 *      CCSS code, ids `money-g<grade>-<shape>-<difficulty>[-n]`.
 * The coin checks (8 coins at most, no empty tray) are money's alone.
 */
import { blueprintById } from "../../src/blueprints/index.js";
import { STANDARD_KEYS } from "../../src/itemModels/schema.js";

const escapeRe = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const codesOf = (standards) => STANDARD_KEYS.flatMap((k) => (Array.isArray(standards?.[k]) ? standards[k] : []));

/**
 * @param {object} model
 * @param {{mode?: string|null, code?: string|null, prefix?: string|null}} [flags]
 * @returns {{topic: string|null, errors: string[], warnings: string[], coinChecks: boolean}}
 */
export function modelRules(model, { mode = null, code = null, prefix = null } = {}) {
  const errors = [];
  const warnings = [];
  const grade = String(model?.grade ?? "").toUpperCase();
  const row = model?.blueprintId ? blueprintById(model.blueprintId) : null;
  // An unknown row id is validateModel's to name; nothing else can be held to it.
  if (model?.blueprintId && !row) return { topic: null, errors, warnings, coinChecks: false };

  let topic;
  let grades;
  let codeError;
  let idPattern;
  let idShape;
  if (row) {
    topic = row.mode_id;
    if (mode && mode !== topic) errors.push(`--mode ${mode}, but blueprint row ${row.id} is filed under ${topic}`);
    grades = [String(row.grade).toUpperCase()];
    codeError = codesOf(model.standards).length ? null : `blueprint row ${row.id} has no code in any framework`;
    idPattern = new RegExp(`^${escapeRe(row.id)}(?:-[a-z0-9]+)*$`, "i");
    idShape = `${row.id}[-<variant>][-2]`;
  } else if ((mode || "money") === "money" && !code && !prefix) {
    topic = "money";
    grades = ["2", "3", "4", "5"];
    if (grade === "2") codeError = model.standards?.ccss?.includes("2.MD.C.8") ? null : "standards.ccss must include 2.MD.C.8";
    else codeError = model.standards?.ccss?.length > 0 ? null : "standards.ccss must name at least one standard";
    idPattern = new RegExp(`^money-g${grade}-[a-z0-9]+(?:-[a-z0-9]+)*-(easy|moderate|hard)(?:-\\d+)?$`, "i");
    idShape = `money-g${grade}-<shape>-<difficulty>[-n]`;
  } else {
    topic = mode || "money";
    grades = ["K", "1", "2", "3", "4", "5"];
    const all = codesOf(model.standards);
    if (code) codeError = all.includes(code) ? null : `standards must include ${code}`;
    else codeError = all.length ? null : "standards must name at least one code (Common Core or a state's)";
    const stem = prefix || `${topic}-g${grade.toLowerCase()}`;
    idPattern = new RegExp(`^${escapeRe(stem)}-[a-z0-9]+(?:-[a-z0-9]+)*$`, "i");
    idShape = `${stem}-<shape>...`;
  }

  if (!idPattern.test(String(model?.id))) warnings.push(`id "${model?.id}" does not follow ${idShape}`);
  if (model?.modeId !== topic) errors.push(`modeId must be "${topic}"`);
  if (!grades.includes(grade)) errors.push(`grade must be ${grades.map((g) => `"${g}"`).join(", ")}`);
  if (codeError) errors.push(codeError);
  return { topic, errors, warnings, coinChecks: topic === "money" };
}
