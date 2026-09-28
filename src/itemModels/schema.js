/**
 * An item model is the unit Sai reviews (plan section 4): one well-written
 * question with its numbers and context left as slots, each slot limited to
 * realistic ranges from the context table. fill.js turns a model plus a
 * seed into one concrete bank item; validate.js says whether a model is
 * well formed. This file is the shape, as plain data and JSDoc types, with
 * the closed lists the fields draw from. No code runs here.
 *
 * @typedef {"K"|"1"|"2"|"3"|"4"|"5"} Grade
 * @typedef {"easy"|"moderate"|"hard"} Difficulty
 *
 * @typedef {Object} Standards  Codes per framework; an empty list means the
 *   skill is not in that state's map for this grade.
 * @property {string[]} ccss
 * @property {string[]} tx
 * @property {string[]} fl
 * @property {string[]} va
 * @property {string[]} ga
 *
 * A slot is drawn by the fill. `kind` says how:
 * @typedef {Object} NameSlot     { kind: "name" } — a kid's first name;
 *   every name slot in a model gets a different name.
 * @typedef {Object} ObjectSlot   { kind: "object", skill, band, minAppeal,
 *   priceCents?: [lo, hi], categories?: string[], excludeCategories?:
 *   string[], exclude?: id[] } — a context-table object listed for the
 *   skill and age band (appeal 2+ by default); `priceCents` keeps to
 *   objects whose unit price range overlaps it, the category and id lists
 *   narrow further. Coins and bills, and objects sold as a pack, box or
 *   bag, are never drawn. Rendered as {slot} (singular), {slot_plural} or
 *   {slot_a} ("an eraser").
 * @typedef {Object} SettingSlot  { kind: "setting", of?: objectSlot,
 *   options?: string[], startsWith?: string, words?: string[], fallback?:
 *   string[] } — one of the object's settings ("at the school store"), or
 *   of `options`; kept when it starts with `startsWith` and contains one
 *   of `words`, else one of `fallback`. A setting that names another table
 *   object is skipped.
 * @typedef {Object} MoneySlot    { kind: "money", of: objectSlot | [lo, hi]
 *   | number, step?: number } — cents: a price drawn inside the object's
 *   range (narrowed by the object slot's priceCents), a range, or a fixed
 *   amount (the dollar paid). Rendered per the kid's state money rule.
 * @typedef {Object} IntSlot      { kind: "int", min, max, step? }
 * @typedef {Object} CoinsSlot    { kind: "coins", count: [lo, hi], kinds?:
 *   string[], sameKind?: boolean, maxCents?: number } — a list of coin
 *   names; rendered as "2 quarters and 1 dime".
 * @typedef {Object} ExprSlot     { kind: "expr", expr, format: "int" |
 *   "money" | "text" | "coins" } — a value computed from earlier slots, so
 *   hints can name the hops without restating arithmetic in prose.
 *
 * @typedef {Object} Distractor
 * @property {string} expr      the wrong value, over the slots
 * @property {string} mistake   the mistake it represents (a tag the parent
 *   report and the feedback layer key on)
 *
 * @typedef {Object} HintTemplate  The four hint layers (plan section 9),
 *   every string templated with the same slots as the prompt:
 * @property {string} nudge     one sentence: what is asked, where to start
 * @property {string[]} steps   the strategy with this item's numbers, stopping
 *   before the answer
 * @property {Object|null} picture  { kind: one of PICTURE_KINDS, ...fields }
 *   where each string field is an expression over the slots (a numberLine
 *   takes min, max, mark and an optional step, the tick spacing, so a hint
 *   that counts by nickels labels the line by fives)
 * @property {"auto"|Object|null} example  "auto" fills the same model with
 *   other numbers and solves it; or a fixed { problem, steps, answer }
 * @property {Object<string,string>|null} feedback  mistake tag -> the sentence
 *   shown after that wrong answer
 * @property {{steps: string[], answer: string}|null} solution  the worked
 *   solution; `answer` is an expression
 *
 * @typedef {Object} ItemModel
 * @property {string} id            unique, kebab-case; item ids derive from it
 * @property {string} modeId        a key of TOPIC_LABELS (src/skills/catalog.js)
 * @property {string} subskill      one of the mode's subskills
 * @property {"application"|"conceptual"|"procedural"} [family]  default application
 * @property {string} [structureType]  bank structure tag; default the model id
 * @property {Grade} grade
 * @property {Standards} standards
 * @property {Difficulty} difficulty
 * @property {string} format        one of FORMATS: what the kid gives back
 * @property {string|null} widget   an answerType from src/components/widgetRegistry.js,
 *   or null for the choice grid
 * @property {{prompt: string}} template  the prompt with {slot} placeholders
 * @property {number} [promptVariants]  for a bare drill whose text can only
 *   take a few forms (a picture-first tray item has one): how many distinct
 *   prompts the model can produce, so the harness holds it to that instead of
 *   the usual twenty; item identity then includes the pictured coins
 * @property {Object<string, NameSlot|ObjectSlot|SettingSlot|MoneySlot|IntSlot|CoinsSlot|ExprSlot>} slots
 * @property {string[]} [constraints]  expressions that must all hold; the
 *   fill re-rolls until they do (a slot may also carry its own)
 * @property {{a?: string, b?: string, op: string}} [operation]  when the item
 *   is one operation: expressions for the two givens and the operator, put
 *   on the payload as a, b, op for the arithmetic checks
 * @property {{expr: string, type: "int"|"money"|"text"}} answer
 * @property {Distractor[]} distractors
 * @property {Object} [display]     extra payload fields (coins, counting…),
 *   each string an expression over the slots
 * @property {HintTemplate} hint
 * @property {{author: string, checkedAgainst: string[]}} provenance  who wrote
 *   it and which references it was checked against (structure and pedagogy
 *   only — never wording)
 */

export const GRADES = Object.freeze(["K", "1", "2", "3", "4", "5"]);

export const DIFFICULTIES = Object.freeze(["easy", "moderate", "hard"]);

export const FAMILIES = Object.freeze(["application", "conceptual", "procedural"]);

/** What the kid gives back. `money` and `number` are answered on the choice
 * grid or a pad; the widget field says which. */
export const FORMATS = Object.freeze(["choice", "number", "money", "time", "fraction", "multiSelect", "symbol", "text"]);

/** The frameworks a model carries codes for, in the order the review screen
 * shows them. */
export const STANDARD_KEYS = Object.freeze(["ccss", "tx", "fl", "va", "ga"]);

/** Every answerType the app can render (src/components/widgetRegistry.js,
 * plus the unregistered default `choice`). Kept as a plain list so a model
 * can be validated in Node without loading React. */
export const WIDGET_IDS = Object.freeze([
  "choice",
  "numberPad",
  "fillBlank",
  "decimal",
  "fraction",
  "barGraph",
  "angle",
  "clock",
  "fractionSet",
  "placeValueDiscs",
  "barModel",
  "numberBond",
  "symbolSelect",
  "multiSelect",
  "numberLine",
  "shapeFigure",
  "coinTray",
  "tenFrame",
]);

export const SLOT_KINDS = Object.freeze(["name", "object", "setting", "money", "int", "coins", "expr"]);

export const ANSWER_TYPES = Object.freeze(["int", "money", "text"]);

export const EXPR_FORMATS = Object.freeze(["int", "money", "text", "coins"]);

/** Picture kinds a hint may name — the same list the hint schema accepts. */
export { PICTURE_KINDS } from "../hints/hintSchema.js";

/** The forms a slot can be rendered in: {object_plural}, {object_a}. */
export const SLOT_FORMS = Object.freeze(["plural", "a"]);

const SLOT_TOKEN_RE = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** Every {token} in a template string, in order, unresolved. */
export function slotTokensIn(text) {
  if (typeof text !== "string") return [];
  return [...text.matchAll(SLOT_TOKEN_RE)].map((m) => m[1]);
}

/**
 * A token as { slot, form }: `object_plural` reads slot `object` in its
 * plural form when the model has no slot literally named object_plural.
 */
export function resolveSlotToken(token, slots) {
  if (slots && Object.prototype.hasOwnProperty.call(slots, token)) return { slot: token, form: null };
  const m = token.match(/^(.+)_(plural|a)$/);
  if (m && slots && Object.prototype.hasOwnProperty.call(slots, m[1])) return { slot: m[1], form: m[2] };
  return null;
}

/** The empty standards block, for models a state has no code for yet. */
export const NO_STANDARDS = Object.freeze({ ccss: [], tx: [], fl: [], va: [], ga: [] });
