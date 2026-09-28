/**
 * fill(model, { seed, state }) — one concrete bank item from an item model.
 *
 * The same seed always gives the same item (a seeded mulberry32, the PRNG
 * the engine parity fixtures use), so a reviewer's "roll again" is
 * reproducible and a generated batch can be rebuilt from its seeds. Names
 * come from names.js, objects and settings from the context table, prices
 * from the object's own range, and every text — prompt, hint, feedback,
 * solution — is rendered from the same slot values, so the bulb panel
 * always matches the story on screen. Money is written the way the kid's
 * state writes it (stateWords.js): 45¢ and $1.09 by default, $0.45 where
 * the state test never uses the cent sign.
 *
 * The result is the in-memory bank item shape (normalizeBankRow's output,
 * plus the v2 fields): runChecks and validateBankItem accept it as is.
 * Pure apart from the tables it reads; no network, no DOM.
 */
import { findObjectsInText, objectsFor, priceRangeFor } from "../content/contextTable.js";
import { localize, moneyRuleFor } from "../content/stateWords.js";
import { NAMES } from "./names.js";
import { evalExpr } from "./expr.js";
import { GRADES, resolveSlotToken } from "./schema.js";

/** The engine's seeded PRNG (scripts/engineParity.mjs); same seed, same run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a, so seed 1 of two models does not draw the same name and price.
function hash32(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const GRADE_LEVEL_RANGE = { K: [1, 3], 1: [1, 3], 2: [4, 6], 3: [4, 6], 4: [7, 10], 5: [7, 10] };
const GRADE_BAND = { K: "K-1", 1: "K-1", 2: "2-3", 3: "2-3", 4: "4-5", 5: "4-5" };

const COIN_VALUE = { quarter: 25, dime: 10, nickel: 5, penny: 1 };
const COIN_ORDER = ["quarter", "dime", "nickel", "penny"];
const COIN_PLURAL = { quarter: "quarters", dime: "dimes", nickel: "nickels", penny: "pennies" };

// Objects sold as a pack, box or bag: the price check reads the pack price
// for any sentence with those words, so "a juice box for 85¢" fails it.
const PACK_NOUN = /\b(?:pack|packs|box|boxes|bag|bags)\b/i;
// Money itself is what a kid pays with, never what a story sells.
const CURRENCY_IDS = new Set(["penny", "nickel", "dime", "quarter", "half-dollar", "dollar-bill", "coin", "game-coin"]);

const SLOT_TOKEN_RE = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

// A full draw is retried while a constraint fails; a distractor that
// collides with the key is retried this many times before it is dropped.
const MAX_ATTEMPTS = 500;
const COLLISION_PATIENCE = 40;

// ---------------------------------------------------------------------------
// Money and coin wording
// ---------------------------------------------------------------------------

/**
 * `cents` as kid text. "auto" writes under a dollar as 45¢ and from a
 * dollar as $1.09 (the Common Core default); "dollars" always writes
 * $0.45, the Florida rule; "cents" writes 45¢ only.
 */
export function formatMoney(cents, style = "auto") {
  const c = Math.round(cents);
  if (style === "dollars" || (style !== "cents" && c >= 100)) return `$${(c / 100).toFixed(2)}`;
  return `${c}¢`;
}

/** "2 quarters, 1 dime and 3 pennies" — biggest coins first. */
export function coinPhrase(coins) {
  const counts = {};
  for (const c of coins) counts[c] = (counts[c] || 0) + 1;
  const parts = COIN_ORDER.filter((c) => counts[c]).map((c) => `${counts[c]} ${counts[c] === 1 ? c : COIN_PLURAL[c]}`);
  if (parts.length <= 1) return parts[0] || "no coins";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function gradeIndex(grade) {
  const i = GRADES.indexOf(String(grade).toUpperCase());
  return i < 0 ? 0 : i;
}

// The style money slots render in for this state and grade: "dollars" when
// the state's rule applies from this grade, else the default.
function promptMoneyStyle(state, grade) {
  const rule = moneyRuleFor(state);
  if (!rule || rule.style !== "dollarsDecimal") return "auto";
  if (rule.fromGrade == null) return "dollars";
  return gradeIndex(grade) >= gradeIndex(rule.fromGrade) ? "dollars" : "auto";
}

const startsWithVowelSound = (word) => /^[aeiou]/i.test(word) && !/^(?:uni|use|one|eu)/i.test(word);
const withArticle = (noun) => `${startsWithVowelSound(noun) ? "an" : "a"} ${noun}`;

// ---------------------------------------------------------------------------
// Drawing slots
// ---------------------------------------------------------------------------

function randInt(rng, lo, hi, step = 1) {
  const count = Math.floor((hi - lo) / step) + 1;
  if (count < 1) throw new Error(`empty range ${lo}..${hi}`);
  return lo + Math.floor(rng() * count) * step;
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The [lo, hi] cent range a money slot may draw from for an object. */
function objectCentRange(object, objectSpec) {
  const usd = priceRangeFor(object.id);
  if (!usd) return null;
  let lo = Math.ceil(usd[0] * 100 - 1e-6);
  let hi = Math.floor(usd[1] * 100 + 1e-6);
  if (Array.isArray(objectSpec?.priceCents)) {
    lo = Math.max(lo, objectSpec.priceCents[0]);
    hi = Math.min(hi, objectSpec.priceCents[1]);
  }
  return lo <= hi ? [lo, hi] : null;
}

function objectCandidates(name, spec, model) {
  const priced = Object.values(model.slots).some((s) => s.kind === "money" && s.of === name);
  const exclude = new Set(spec.exclude || []);
  const excludeCategories = new Set(spec.excludeCategories || []);
  return objectsFor({ skill: spec.skill, band: spec.band, minAppeal: spec.minAppeal }).filter((o) => {
    if (typeof o.singular !== "string" || typeof o.plural !== "string") return false;
    if (CURRENCY_IDS.has(o.id) || PACK_NOUN.test(o.singular)) return false;
    if (exclude.has(o.id) || excludeCategories.has(o.category)) return false;
    if (Array.isArray(spec.categories) && !spec.categories.includes(o.category)) return false;
    if (priced || spec.priceCents) return objectCentRange(o, spec) != null;
    return true;
  });
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The settings a setting slot may draw: the object's own (or a fixed
 * list), keeping those that start with `startsWith` and contain one of
 * `words`; a setting that names another table object ("at the book fair")
 * is skipped, or the price check would read a second thing for sale. */
function settingOptions(spec, object) {
  const own = Array.isArray(spec.options) ? spec.options : Array.isArray(object?.settings) ? object.settings : [];
  let options = own.filter((s) => typeof s === "string" && !findObjectsInText(s).length);
  if (spec.startsWith) options = options.filter((s) => s.startsWith(spec.startsWith));
  if (Array.isArray(spec.words) && spec.words.length) {
    const re = new RegExp(`\\b(?:${spec.words.map(escapeRe).join("|")})\\b`, "i");
    options = options.filter((s) => re.test(s));
  }
  return options.length ? options : spec.fallback || [];
}

function drawCoins(rng, spec) {
  const kinds = Array.isArray(spec.kinds) && spec.kinds.length ? spec.kinds : COIN_ORDER;
  for (let i = 0; i < 50; i += 1) {
    const n = randInt(rng, spec.count[0], spec.count[1]);
    const one = spec.sameKind ? pick(rng, kinds) : null;
    const coins = Array.from({ length: n }, () => one || pick(rng, kinds));
    const value = coins.reduce((s, c) => s + COIN_VALUE[c], 0);
    if (spec.maxCents == null || value <= spec.maxCents) return coins;
  }
  throw new Error(`no coin list under ${spec.maxCents}¢ for count ${spec.count.join("..")}`);
}

/**
 * One draw of every slot: raw values keyed by slot name (an object slot
 * holds the table row). Dependent slots (a price of an object, a setting
 * of an object) resolve their object first; expression slots run last, in
 * declaration order, so each may use the ones before it.
 */
function drawScope(model, rng) {
  const scope = {};
  const usedNames = new Set();
  const usedObjects = new Set();
  const resolving = new Set();

  const get = (name) => {
    if (name in scope) return scope[name];
    const spec = model.slots[name];
    if (!spec) throw new Error(`unknown slot "${name}"`);
    if (resolving.has(name)) throw new Error(`slot "${name}" depends on itself`);
    resolving.add(name);
    let value;
    switch (spec.kind) {
      case "name": {
        const free = NAMES.filter((n) => !usedNames.has(n));
        value = pick(rng, free);
        usedNames.add(value);
        break;
      }
      case "object": {
        const free = objectCandidates(name, spec, model).filter((o) => !usedObjects.has(o.id));
        if (!free.length) throw new Error(`no context object fits slot "${name}"`);
        value = pick(rng, free);
        usedObjects.add(value.id);
        break;
      }
      case "setting": {
        const options = settingOptions(spec, spec.of ? get(spec.of) : null);
        if (!options.length) throw new Error(`no setting fits slot "${name}"`);
        value = pick(rng, options);
        break;
      }
      case "money": {
        if (typeof spec.of === "number") {
          value = spec.of;
        } else if (Array.isArray(spec.of)) {
          value = randInt(rng, spec.of[0], spec.of[1], spec.step || 1);
        } else {
          const object = get(spec.of);
          const range = objectCentRange(object, model.slots[spec.of]);
          if (!range) throw new Error(`"${object.id}" has no price range for slot "${name}"`);
          const step = spec.step || 1;
          const lo = Math.ceil(range[0] / step) * step;
          if (lo > range[1]) throw new Error(`no ${step}¢ step price for "${object.id}"`);
          value = randInt(rng, lo, range[1], step);
        }
        break;
      }
      case "int":
        value = randInt(rng, spec.min, spec.max, spec.step || 1);
        break;
      case "coins":
        value = drawCoins(rng, spec);
        break;
      case "expr":
        value = undefined; // second pass
        break;
      default:
        throw new Error(`slot "${name}" has unknown kind "${spec.kind}"`);
    }
    resolving.delete(name);
    if (spec.kind !== "expr") scope[name] = value;
    return value;
  };

  for (const [name, spec] of Object.entries(model.slots)) if (spec.kind !== "expr") get(name);
  for (const [name, spec] of Object.entries(model.slots)) if (spec.kind === "expr") scope[name] = evalExpr(spec.expr, scope);
  return scope;
}

function constraintsOf(model) {
  const out = [...(model.constraints || [])];
  for (const spec of Object.values(model.slots)) if (Array.isArray(spec.constraints)) out.push(...spec.constraints);
  return out;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderValue(spec, value, form, fmt) {
  switch (spec.kind) {
    case "object":
      if (form === "plural") return value.plural;
      if (form === "a") return withArticle(value.singular);
      return value.singular;
    case "money":
      return fmt.money(value);
    case "coins":
      return coinPhrase(value);
    case "expr":
      if (spec.format === "money") return fmt.money(value);
      if (spec.format === "coins") return coinPhrase(value);
      return String(value);
    default:
      return String(value);
  }
}

function makeRenderer(model, scope, fmt) {
  return (text) => {
    const filled = text.replace(SLOT_TOKEN_RE, (_m, token) => {
      const r = resolveSlotToken(token, model.slots);
      if (!r) throw new Error(`unknown slot {${token}} in "${text}"`);
      return renderValue(model.slots[r.slot], scope[r.slot], r.form, fmt);
    });
    return localize(filled, fmt.state, { grade: model.grade });
  };
}

/** A picture or display block: string fields are expressions, `kind` is
 * kept as written, arrays and objects recurse, other literals pass. */
function evalFields(block, scope) {
  if (Array.isArray(block)) return block.map((v) => evalFields(v, scope));
  if (block && typeof block === "object") {
    const out = {};
    for (const [k, v] of Object.entries(block)) out[k] = k === "kind" ? v : evalFields(v, scope);
    return out;
  }
  return typeof block === "string" ? evalExpr(block, scope) : block;
}

const isWholeAmount = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;

// ---------------------------------------------------------------------------
// The fill
// ---------------------------------------------------------------------------

function fillOnce(model, { seed, state, grade, depth }) {
  const rng = mulberry32(hash32(`${model.id}#${seed}`));
  const answerType = model.answer.type;
  const numeric = answerType !== "text";
  const notes = [];

  let scope = null;
  let answerValue;
  let kept = [];
  const constraints = constraintsOf(model);
  let lastReason = "no attempt";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const draw = drawScope(model, rng);
    const failed = constraints.find((c) => !evalExpr(c, draw));
    if (failed) {
      lastReason = `constraint "${failed}"`;
      continue;
    }
    const value = evalExpr(model.answer.expr, draw);
    if (numeric && !isWholeAmount(value)) {
      lastReason = `answer ${value} is not a whole, non-negative amount`;
      continue;
    }
    const seen = new Set([value]);
    const good = [];
    const bad = [];
    for (const d of model.distractors) {
      const v = evalExpr(d.expr, draw);
      const usable = numeric ? isWholeAmount(v) && !seen.has(v) : typeof v === "string" && v && !seen.has(v);
      if (usable) {
        seen.add(v);
        good.push({ value: v, mistake: d.mistake });
      } else {
        bad.push({ value: v, mistake: d.mistake });
      }
    }
    if (bad.length && attempt < COLLISION_PATIENCE) {
      lastReason = `distractor "${bad[0].mistake}" gives ${bad[0].value}`;
      continue;
    }
    for (const b of bad) notes.push(`dropped distractor "${b.mistake}": ${b.value} collides with the key or another choice`);
    scope = draw;
    answerValue = value;
    kept = good;
    break;
  }
  if (!scope) throw new Error(`fill of "${model.id}" gave up after ${MAX_ATTEMPTS} draws: ${lastReason}`);

  // One money style for the whole choice set — never "90¢" beside "$1.10".
  const promptStyle = promptMoneyStyle(state, grade);
  const choiceStyle =
    promptStyle === "dollars" || (answerType === "money" && [answerValue, ...kept.map((d) => d.value)].some((v) => v >= 100))
      ? "dollars"
      : "auto";
  const fmt = { state, money: (cents) => formatMoney(cents, promptStyle) };
  const render = makeRenderer(model, scope, fmt);
  const asChoice = (v) => (answerType === "money" ? formatMoney(v, choiceStyle) : answerType === "int" ? v : String(v));

  const answer = asChoice(answerValue);
  const distractors = kept.map((d) => ({ ...d, text: asChoice(d.value) }));
  const unordered = [answer, ...distractors.map((d) => d.text)];
  // Numeric options in number order (the test convention); names shuffled.
  const choices = numeric
    ? unordered.slice().sort((x, y) => (answerType === "money" ? centsOf(x) - centsOf(y) : x - y))
    : shuffle(rng, unordered);

  const mistakes = {};
  for (const d of distractors) mistakes[String(d.text)] = d.mistake;

  const promptText = render(model.template.prompt);
  const display = { ...evalFields(model.display || {}, scope), promptText };

  const op = model.operation || null;
  const question = {
    a: op?.a ? evalExpr(op.a, scope) : null,
    b: op?.b ? evalExpr(op.b, scope) : null,
    op: op?.op ?? null,
    answer,
    answerType: model.widget || "choice",
    choices,
    display,
  };

  const h = model.hint;
  const feedback = {};
  for (const d of distractors) {
    if (h.feedback && typeof h.feedback[d.mistake] === "string") feedback[String(d.text)] = render(h.feedback[d.mistake]);
  }
  const solution = h.solution
    ? { steps: h.solution.steps.map(render), answer: asChoice(evalExpr(h.solution.answer, scope)) }
    : null;
  const hint = {
    nudge: render(h.nudge),
    steps: h.steps.map(render),
    picture: h.picture ? evalFields(h.picture, scope) : null,
    example: null,
    feedback: Object.keys(feedback).length ? feedback : null,
    solution,
  };
  if (h.example === "auto") {
    hint.example = depth > 0 ? null : autoExample(model, { seed, state, grade, answer, promptText });
  } else if (h.example && typeof h.example === "object") {
    hint.example = { problem: render(h.example.problem), steps: (h.example.steps || []).map(render), answer: render(String(h.example.answer)) };
  }

  const slots = {};
  for (const [name, spec] of Object.entries(model.slots)) slots[name] = spec.kind === "object" ? scope[name].id : scope[name];
  const objects = Object.entries(model.slots)
    .filter(([, spec]) => spec.kind === "object")
    .map(([name]) => scope[name].id);
  const settingName = Object.keys(model.slots).find((n) => model.slots[n].kind === "setting");

  return {
    itemId: `${model.id}-s${seed}-v2`,
    modeId: model.modeId,
    itemFamily: model.family || "application",
    subskill: model.subskill,
    structureType: model.structureType || model.id,
    levelRange: GRADE_LEVEL_RANGE[grade],
    levelBand: GRADE_BAND[grade],
    reviewStatus: "draft",
    representationType: model.representationType ?? null,
    source: { generator: "itemModels", itemModelId: model.id, seed },
    version: 2,
    itemModelId: model.id,
    difficulty: model.difficulty,
    hint,
    tags: {
      grade,
      standards: model.standards,
      difficulty: model.difficulty,
      format: model.format,
      widget: model.widget || null,
      family: model.family || "application",
      objects,
      setting: settingName ? scope[settingName] : null,
      mistakes,
      slots,
      notes,
    },
    question,
  };
}

function centsOf(text) {
  const m = String(text).match(/\$(\d+)\.(\d{2})|(\d+)¢/);
  if (!m) return Number(text);
  return m[3] != null ? Number(m[3]) : Number(m[1]) * 100 + Number(m[2]);
}

/**
 * The worked example: the same model filled with other numbers and solved
 * to its answer, so the kid sees the method without this item's answer.
 * Seeds are derived from the item's own seed, so it is as reproducible as
 * the item; the first fill whose answer and story differ is used.
 */
function autoExample(model, { seed, state, grade, answer, promptText }) {
  for (let k = 1; k <= 12; k += 1) {
    const other = fillOnce(model, { seed: seed * 7919 + k, state, grade, depth: 1 });
    if (other.question.answer === answer || other.question.display.promptText === promptText) continue;
    return {
      problem: other.question.display.promptText,
      steps: other.hint.solution ? other.hint.solution.steps : [],
      answer: other.question.answer,
    };
  }
  return null;
}

/**
 * @param {import("./schema.js").ItemModel} model
 * @param {{ seed?: number, state?: string|null }} [options]  `state` is the
 *   kid's state code (TX, FL, …) for wording and money notation; null is
 *   the Common Core default the bank stores.
 * @returns the bank item (see the file comment)
 */
export function fill(model, { seed = 1, state = null } = {}) {
  if (!model || typeof model !== "object" || !model.slots || !model.template || !model.answer || !model.hint) {
    throw new Error("fill needs a model with slots, template, answer and hint (see validateModel)");
  }
  const grade = String(model.grade).toUpperCase();
  if (!(grade in GRADE_LEVEL_RANGE)) throw new Error(`model "${model.id}" has an unknown grade "${model.grade}"`);
  return fillOnce(model, { seed: Number(seed) >>> 0, state, grade, depth: 0 });
}
