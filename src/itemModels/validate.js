/**
 * validateModel(model) -> { ok, errors }: is this item model well formed
 * enough to fill? Every slot a template names exists, every expression
 * parses and reads only known slots, the closed-list fields hold listed
 * values, the hint has its layers and the distractors carry mistake tags.
 * It runs before a model is saved to item_models and before a fill, so a
 * typo in a slot name is a reviewer-facing error rather than a leaked
 * "{price}" in a kid's question. Pure.
 */
import { identifiersIn } from "./expr.js";
import {
  ANSWER_TYPES,
  DIFFICULTIES,
  EXPR_FORMATS,
  FAMILIES,
  FORMATS,
  GRADES,
  PICTURE_KINDS,
  SLOT_KINDS,
  STANDARD_KEYS,
  WIDGET_IDS,
  resolveSlotToken,
  slotTokensIn,
  MONEY_STYLES,
} from "./schema.js";
import { blueprintById } from "../blueprints/index.js";

const isText = (x) => typeof x === "string" && x.trim().length > 0;
const isRecord = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const isTextList = (x) => Array.isArray(x) && x.every(isText);
const isRange = (x) => Array.isArray(x) && x.length === 2 && x.every((n) => typeof n === "number" && Number.isFinite(n)) && x[0] <= x[1];

/**
 * A model written for a blueprint row points back at it and agrees with it:
 * a real item row of the same grade and topic, the row's subskill, family
 * and structureType, a levelRange inside the row's, and the row's codes in
 * every framework (a model copies its row's codes; codes live on a row).
 */
function checkBlueprintRow(model, err) {
  const id = model.blueprintId;
  if (!isText(id)) {
    err("blueprintId must be a blueprint row id");
    return;
  }
  const row = blueprintById(id);
  if (!row) {
    err(`blueprintId "${id}" is not a blueprint row (src/blueprints/)`);
    return;
  }
  const spec = row.spec || {};
  if (row.track !== "item") err(`blueprint row "${id}" is a ${row.track} row; models are written for item rows`);
  if (String(row.grade).toUpperCase() !== String(model.grade ?? "").toUpperCase()) {
    err(`blueprint row "${id}" is Grade ${row.grade}, but the model is Grade ${model.grade}`);
  }
  if (row.mode_id !== model.modeId) err(`blueprint row "${id}" is filed under ${row.mode_id}, not ${model.modeId}`);
  if (spec.subskill && model.subskill !== spec.subskill) err(`subskill must be the row's (${spec.subskill})`);
  if (spec.family && (model.family ?? "application") !== spec.family) err(`family must be the row's (${spec.family})`);
  if (spec.structureType && model.structureType !== spec.structureType) {
    err(`structureType must be the row's (${spec.structureType}), so its items and the row agree`);
  }
  if (!isRange(model.levelRange)) err("a model with a blueprintId sets levelRange (Grade 2 is [4, 6])");
  else if (isRange(spec.levelRange) && (model.levelRange[0] < spec.levelRange[0] || model.levelRange[1] > spec.levelRange[1])) {
    err(`levelRange must sit inside the row's [${spec.levelRange.join(", ")}]`);
  }
  if (isRecord(model.standards) && isRecord(row.standards)) {
    for (const key of STANDARD_KEYS) {
      const mine = [...(model.standards[key] || [])].sort();
      const rows = [...(row.standards[key] || [])].sort();
      if (JSON.stringify(mine) !== JSON.stringify(rows)) err(`standards.${key} must be the row's codes (${rows.join(", ") || "none"})`);
    }
  }
}

export function validateModel(model) {
  const errors = [];
  if (!isRecord(model)) return { ok: false, errors: ["model must be an object"] };
  const err = (m) => errors.push(m);

  if (!isText(model.id)) err("id must be a non-empty string");
  if (!isText(model.modeId)) err("modeId must be a non-empty string");
  if (!isText(model.subskill)) err("subskill must be a non-empty string");
  if (model.family != null && !FAMILIES.includes(model.family)) err(`family must be one of ${FAMILIES.join(", ")}`);
  if (!GRADES.includes(String(model.grade ?? "").toUpperCase())) err(`grade must be one of ${GRADES.join(", ")}`);
  if (!DIFFICULTIES.includes(model.difficulty)) err(`difficulty must be one of ${DIFFICULTIES.join(", ")}`);
  if (!FORMATS.includes(model.format)) err(`format must be one of ${FORMATS.join(", ")}`);
  if (model.widget != null && !WIDGET_IDS.includes(model.widget)) err(`widget "${model.widget}" is not a registered answer type`);

  if (!isRecord(model.standards)) err("standards must be an object with ccss, tx, fl, va, ga lists");
  else {
    for (const key of STANDARD_KEYS) {
      if (!isTextList(model.standards[key] ?? [])) err(`standards.${key} must be a list of codes`);
    }
  }
  if (!isRecord(model.provenance) || !isText(model.provenance.author) || !Array.isArray(model.provenance.checkedAgainst)) {
    err("provenance needs author and checkedAgainst[]");
  }
  if (model.blueprintId != null) checkBlueprintRow(model, err);

  // Slots: known kinds, each kind's own fields, references to other slots.
  const slots = isRecord(model.slots) ? model.slots : null;
  if (!slots) err("slots must be an object");
  const slotNames = slots ? Object.keys(slots) : [];
  const known = new Set(slotNames);
  const kindOf = (name) => (slots && isRecord(slots[name]) ? slots[name].kind : null);
  const checkExpr = (expr, where) => {
    if (!isText(expr)) {
      err(`${where} must be an expression string`);
      return;
    }
    try {
      for (const id of identifiersIn(expr)) if (!known.has(id)) err(`${where} uses unknown slot "${id}"`);
    } catch (e) {
      err(`${where} does not parse: ${e.message}`);
    }
  };
  if (slots) {
    for (const [name, spec] of Object.entries(slots)) {
      if (!isRecord(spec) || !SLOT_KINDS.includes(spec.kind)) {
        err(`slot "${name}" must have a kind in ${SLOT_KINDS.join(", ")}`);
        continue;
      }
      switch (spec.kind) {
        case "object":
          if (spec.priceCents != null && !isRange(spec.priceCents)) err(`slot "${name}".priceCents must be [lo, hi]`);
          break;
        case "setting":
          if (spec.of == null && !isTextList(spec.options)) err(`slot "${name}" needs of (an object slot) or options[]`);
          else if (spec.of != null && kindOf(spec.of) !== "object") err(`slot "${name}".of must name an object slot`);
          break;
        case "money":
          if (typeof spec.of === "string") {
            if (kindOf(spec.of) !== "object") err(`slot "${name}".of must name an object slot or be [lo, hi]`);
          } else if (typeof spec.of !== "number" && !isRange(spec.of)) {
            err(`slot "${name}".of must name an object slot, be [lo, hi], or be a fixed amount`);
          }
          if (spec.pack != null && spec.pack !== true) err(`slot "${name}".pack must be true when given`);
          if (spec.pack === true && typeof spec.of !== "string") err(`slot "${name}".pack needs of to name an object slot`);
          break;
        case "int":
          if (!isRange([spec.min, spec.max])) err(`slot "${name}" needs min <= max`);
          break;
        case "coins":
          if (!isRange(spec.count) || spec.count[0] < 1) err(`slot "${name}".count must be [lo, hi] with lo >= 1`);
          break;
        case "expr":
          checkExpr(spec.expr, `slot "${name}".expr`);
          if (!EXPR_FORMATS.includes(spec.format)) err(`slot "${name}".format must be one of ${EXPR_FORMATS.join(", ")}`);
          break;
        default:
      }
      if (spec.constraints != null) {
        if (!Array.isArray(spec.constraints)) err(`slot "${name}".constraints must be a list`);
        else spec.constraints.forEach((c, i) => checkExpr(c, `slot "${name}".constraints[${i}]`));
      }
    }
  }
  (model.constraints || []).forEach((c, i) => checkExpr(c, `constraints[${i}]`));

  // Templates: every {token} resolves to a slot (or a slot's plural / a form).
  const checkTemplate = (text, where) => {
    if (!isText(text)) {
      err(`${where} must be a non-empty string`);
      return;
    }
    for (const token of slotTokensIn(text)) {
      const r = resolveSlotToken(token, slots || {});
      if (!r) err(`${where} names unknown slot {${token}}`);
      else if (r.form && kindOf(r.slot) !== "object") err(`${where}: {${token}} — only an object slot has a ${r.form} form`);
    }
  };
  if (!isRecord(model.template)) err("template must be { prompt }");
  else checkTemplate(model.template.prompt, "template.prompt");

  if (model.operation != null) {
    if (!isRecord(model.operation) || !isText(model.operation.op)) err("operation needs op");
    else {
      if (model.operation.a != null) checkExpr(model.operation.a, "operation.a");
      if (model.operation.b != null) checkExpr(model.operation.b, "operation.b");
    }
  }

  if (!isRecord(model.answer)) err("answer must be { expr, type }");
  else {
    checkExpr(model.answer.expr, "answer.expr");
    if (!ANSWER_TYPES.includes(model.answer.type)) err(`answer.type must be one of ${ANSWER_TYPES.join(", ")}`);
  }

  if (!Array.isArray(model.distractors) || model.distractors.length < 2) err("at least 2 distractors are needed");
  else {
    const tags = new Set();
    model.distractors.forEach((d, i) => {
      if (!isRecord(d)) {
        err(`distractors[${i}] must be { expr, mistake }`);
        return;
      }
      checkExpr(d.expr, `distractors[${i}].expr`);
      if (!isText(d.mistake)) err(`distractors[${i}] needs a mistake tag`);
      else if (tags.has(d.mistake)) err(`distractors[${i}] repeats the mistake tag "${d.mistake}"`);
      tags.add(d.mistake);
      // `when`: the numbers on which this slip exists; `otherwise`: the slip
      // shown on the other numbers (omit it to drop the choice there).
      if (d.when != null) checkExpr(d.when, `distractors[${i}].when`);
      if (d.otherwise != null) {
        if (d.when == null) err(`distractors[${i}].otherwise needs a when`);
        if (!isRecord(d.otherwise)) err(`distractors[${i}].otherwise must be { expr, mistake }`);
        else {
          checkExpr(d.otherwise.expr, `distractors[${i}].otherwise.expr`);
          if (!isText(d.otherwise.mistake)) err(`distractors[${i}].otherwise needs a mistake tag`);
          else if (tags.has(d.otherwise.mistake)) err(`distractors[${i}].otherwise repeats the mistake tag "${d.otherwise.mistake}"`);
          tags.add(d.otherwise.mistake);
        }
      }
    });

    // Hint: nudge and steps always; the other layers when present.
    const h = model.hint;
    if (!isRecord(h)) err("hint must be an object with nudge and steps");
    else {
      checkTemplate(h.nudge, "hint.nudge");
      if (!Array.isArray(h.steps) || !h.steps.length) err("hint.steps must be a non-empty list");
      else h.steps.forEach((s, i) => checkTemplate(s, `hint.steps[${i}]`));
      if (h.picture != null) {
        if (!isRecord(h.picture) || !PICTURE_KINDS.includes(h.picture.kind)) err(`hint.picture.kind must be one of ${PICTURE_KINDS.join(", ")}`);
        else checkFields(h.picture, "hint.picture", checkExpr);
      }
      if (h.feedback != null) {
        if (!isRecord(h.feedback)) err("hint.feedback must map mistake tags to sentences");
        else {
          for (const [tag, line] of Object.entries(h.feedback)) {
            if (!tags.has(tag)) err(`hint.feedback["${tag}"] matches no distractor mistake tag`);
            checkTemplate(line, `hint.feedback["${tag}"]`);
          }
        }
      }
      if (h.solution != null) {
        if (!isRecord(h.solution) || !Array.isArray(h.solution.steps)) err("hint.solution needs steps[] and answer");
        else {
          h.solution.steps.forEach((s, i) => checkTemplate(s, `hint.solution.steps[${i}]`));
          checkExpr(h.solution.answer, "hint.solution.answer");
        }
      }
      if (h.example === "auto") {
        if (h.solution == null) err('hint.example "auto" needs hint.solution to solve the other fill');
      } else if (h.example != null) {
        if (!isRecord(h.example) || !Array.isArray(h.example.steps)) err("hint.example must be \"auto\" or { problem, steps, answer }");
        else {
          checkTemplate(h.example.problem, "hint.example.problem");
          h.example.steps.forEach((s, i) => checkTemplate(s, `hint.example.steps[${i}]`));
          if (h.example.answer == null) err("hint.example needs an answer");
        }
      }
    }
  }

  if (model.display != null) {
    if (!isRecord(model.display)) err("display must be an object of expressions");
    else checkFields(model.display, "display", checkExpr);
  }

  if (model.moneyStyle != null && !MONEY_STYLES.includes(model.moneyStyle)) err(`moneyStyle must be one of ${MONEY_STYLES.join(", ")}`);
  if (model.levelRange != null) {
    const r = model.levelRange;
    const okRange = Array.isArray(r) && r.length === 2 && r.every((v) => Number.isInteger(v) && v >= 1 && v <= 10) && r[0] <= r[1];
    if (!okRange) err("levelRange must be [min, max] with levels 1-10 and min <= max");
  }
  if (model.promptVariants != null && !(Number.isInteger(model.promptVariants) && model.promptVariants > 0)) err("promptVariants must be a positive integer");

  return { ok: errors.length === 0, errors };
}

// A picture or display block: string fields are expressions (kind aside).
function checkFields(block, where, checkExpr) {
  for (const [key, value] of Object.entries(block)) {
    if (key === "kind") continue;
    if (typeof value === "string") checkExpr(value, `${where}.${key}`);
    else if (Array.isArray(value)) value.forEach((v, i) => typeof v === "string" && checkExpr(v, `${where}.${key}[${i}]`));
    else if (isRecord(value)) checkFields(value, `${where}.${key}`, checkExpr);
  }
}
