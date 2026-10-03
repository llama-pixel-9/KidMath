/**
 * The live step's row logic: which fills of an approved item model become
 * version-2 item_bank rows, the gate every row passes as the app will see
 * it, the database row, and the checksum the database must reproduce.
 *
 * Node only (node:crypto for the md5), and no Supabase import: the live
 * scripts (scripts/live/) and liveStep.spec use it, never app code. The
 * manifest refill the bundle reads (src/itemBank/v2/modelRows.js) stays
 * free of it.
 *
 * One rule runs through it: whatever the database will hold is computed
 * here in JavaScript first, in the database's own text form (jsonbText),
 * so a checksum taken in Postgres must equal the one taken here, row for
 * row and in the same column order (LINE_COLUMNS feeds both rowLine and
 * the SQL).
 */
import { createHash } from "node:crypto";
import { promptIdentity, validateBankItem } from "../../itemBank/index.js";
import { runChecks } from "../../itemBank/qc/checks.js";
import { normalizeBankRow } from "../../itemBank/normalize.js";
import { isServable } from "../../itemBank/versionRules.js";
import { buildBankQuestion, checkAnswer, questionAnswerType } from "../../mathEngine.js";
import { CONCEPTS } from "../../hints/concepts.js";
import { fill } from "../fill.js";
import { FILL_QUOTA, MAX_SEED, stampItem } from "./liveRules.js";

// ── jsonb's text form ────────────────────────────────────────────────────

const encoder = new TextEncoder();

// Postgres orders jsonb object keys by byte length, then bytewise.
function compareKeys(x, y) {
  const a = encoder.encode(x);
  const b = encoder.encode(y);
  if (a.length !== b.length) return a.length - b.length;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const isAbsent = (v) => v === undefined || typeof v === "function" || typeof v === "symbol";

/**
 * `value` as Postgres prints it from a jsonb column (`payload::text`): keys
 * ordered by length then bytewise, ", " and ": " as separators. A key whose
 * value is undefined is dropped, and undefined in a list is null, as
 * JSON.stringify does (that is what the insert sends).
 */
export function jsonbText(value) {
  if (value === null || isAbsent(value)) return "null";
  if (Array.isArray(value)) return `[${value.map((v) => (isAbsent(v) ? "null" : jsonbText(v))).join(", ")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).filter((k) => !isAbsent(value[k])).sort(compareKeys);
    return `{${keys.map((k) => `${JSON.stringify(k)}: ${jsonbText(value[k])}`).join(", ")}}`;
  }
  return JSON.stringify(value);
}

/** A value after a trip through a jsonb column: what the app reads back. */
export const jsonbRoundTrip = (value) => (value == null ? null : JSON.parse(jsonbText(value)));

export const md5 = (text) => createHash("md5").update(text).digest("hex");

/** A model spec's fingerprint: md5 of jsonbText(spec minus `checks`), as SQL's md5((spec - 'checks')::text). */
export function specMd5(spec) {
  const rest = { ...spec };
  delete rest.checks;
  return md5(jsonbText(rest));
}

// ── Database rows ────────────────────────────────────────────────────────

/**
 * The columns the checksum covers, in order. Every nullable column is
 * coalesced to NULL_TEXT on both sides, so one null column never makes the
 * whole line null (string_agg would then skip the row). `source` and
 * `kid_safe` are left out: they carry the run and a timestamp, not content.
 */
export const LINE_COLUMNS = Object.freeze([
  ["item_id", "text"],
  ["mode_id", "text"],
  ["item_family", "text"],
  ["subskill", "text"],
  ["structure_type", "text"],
  ["level_min", "int"],
  ["level_max", "int"],
  ["review_status", "text"],
  ["version", "int"],
  ["payload", "jsonb"],
  ["hint", "jsonb"],
  ["blueprint_id", "text"],
  ["difficulty", "text"],
  ["tags", "jsonb"],
  ["item_model_id", "text"],
  ["representation_type", "text"],
]);

export const NULL_TEXT = "<null>";

/** One row's checksum line (a database row: snake_case columns). */
export function rowLine(row) {
  return LINE_COLUMNS.map(([col, kind]) => {
    const v = row[col];
    if (v == null) return NULL_TEXT;
    return kind === "jsonb" ? jsonbText(v) : String(v);
  }).join("|");
}

/** The same line in SQL, for `alias.` columns (or bare columns). */
export function lineSql(alias = "") {
  const p = alias ? `${alias}.` : "";
  return LINE_COLUMNS.map(([col]) => `coalesce(${p}${col}::text, '${NULL_TEXT}')`).join(" || '|' || ");
}

// Postgres `collate "C"` is byte order.
export function byteOrder(x, y) {
  const a = encoder.encode(x);
  const b = encoder.encode(y);
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/** md5 over the rows' lines in item_id byte order; null for no rows (SQL md5(null)). */
export function checksumOf(rows) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((x, y) => byteOrder(x.item_id, y.item_id));
  return md5(sorted.map(rowLine).join("\n"));
}

/** The query that returns { rows, checksum } for the rows `where` selects. */
export function checksumSql(where) {
  return `select count(*) as rows,
       md5(string_agg(${lineSql()}, E'\\n' order by item_id collate "C")) as checksum
  from public.item_bank
 where ${where};
`;
}

/** The query that returns each row's own md5, to name the rows that differ (one page of it with `limit`). */
export function rowMd5Sql(where, { limit = null, offset = 0 } = {}) {
  return `select item_id, review_status, md5(${lineSql()}) as md5
  from public.item_bank
 where ${where}
 order by item_id collate "C"${limit ? `\n limit ${limit} offset ${offset}` : ""};
`;
}

/** Each row's md5, keyed by item_id (what rowMd5Sql returns). */
export function rowMd5s(rows) {
  return Object.fromEntries([...rows].sort((x, y) => byteOrder(x.item_id, y.item_id)).map((r) => [r.item_id, md5(rowLine(r))]));
}

/**
 * The item_bank row a filled (or script) item becomes. Never written:
 * level_band and grade_band (generated), variety_id, format_id,
 * reviewed_by / reviewed_at (set by the insert). Payload, hint and tags
 * take the trip through jsonb here, so what is checked is what is stored.
 */
export function toDbRow(item, { status = "approved", run = null, specMd5: spec = null, kidSafe = null } = {}) {
  const stamped = stampItem(item, { status, run, specMd5: spec });
  return {
    item_id: item.itemId,
    mode_id: item.modeId,
    item_family: item.itemFamily,
    subskill: item.subskill,
    structure_type: item.structureType,
    level_min: item.levelRange?.[0] ?? null,
    level_max: item.levelRange?.[1] ?? null,
    review_status: status,
    version: 2,
    payload: jsonbRoundTrip(item.question),
    hint: jsonbRoundTrip(item.hint ?? null),
    blueprint_id: item.blueprintId ?? null,
    difficulty: item.difficulty ?? null,
    tags: jsonbRoundTrip(item.tags ?? null),
    item_model_id: item.itemModelId ?? null,
    representation_type: item.representationType ?? null,
    source: jsonbRoundTrip(stamped.source),
    kid_safe: kidSafe == null ? null : jsonbRoundTrip(kidSafe),
  };
}

// item_bank.level_band is generated from level_min (0005_extend_item_bank_for_all_families.sql).
const levelBandOf = (levelMin) => (levelMin <= 3 ? "K-1" : levelMin <= 6 ? "2-3" : "4-5");

/**
 * The row as the app's loaders fetch it: only the columns they select
 * (src/itemBank/cloudLoader.js, modeLoader.js; no blueprint_id, no
 * kid_safe), with the generated level_band.
 */
export function toAppRow(row) {
  return {
    item_id: row.item_id,
    mode_id: row.mode_id,
    item_family: row.item_family,
    subskill: row.subskill,
    structure_type: row.structure_type,
    level_min: row.level_min,
    level_max: row.level_max,
    review_status: row.review_status,
    payload: row.payload,
    representation_type: row.representation_type ?? null,
    source: row.source ?? null,
    level_band: levelBandOf(row.level_min),
    version: row.version,
    item_model_id: row.item_model_id ?? null,
    difficulty: row.difficulty ?? null,
    hint: row.hint ?? null,
    tags: row.tags ?? null,
    variety_id: null,
    format_id: null,
  };
}

// ── The gate ─────────────────────────────────────────────────────────────

const failsOf = (item) => runChecks(item).findings.filter((f) => f.severity === "fail");

/** What a kid submits to get the item right (a multiSelect may list several acceptable selections). */
export function submittableKey(question) {
  const answer = question?.answer;
  if (questionAnswerType(question) === "multiSelect" && Array.isArray(answer) && Array.isArray(answer[0])) return answer[0];
  return answer;
}

/**
 * Does this item survive the round trip into the app? In order:
 * validateBankItem and runChecks on the item as filled; then the database
 * row it becomes, cut down to what the app selects, through
 * normalizeBankRow; served as approved v2 (and only at v2 or to a preview
 * viewer); runChecks again on what the app holds — without blueprint_id,
 * so figures are classified by structure type, as the app does; and the
 * served question must take its own key.
 *
 * Returns { ok, reasons: [string], appItem }.
 */
export function appGate(item) {
  const reasons = [];
  const valid = validateBankItem(item);
  if (!valid.valid) reasons.push(...valid.errors.map((e) => `as filled: ${e}`));
  for (const f of failsOf(item)) reasons.push(`as filled: ${f.id}: ${f.message}`);

  let appItem = null;
  try {
    appItem = normalizeBankRow(toAppRow(toDbRow(item, { status: "approved" })));
  } catch (err) {
    reasons.push(`row trip threw: ${err.message}`);
  }
  if (!appItem) {
    if (!reasons.some((r) => r.startsWith("row trip"))) reasons.push("row trip: normalizeBankRow drops the row");
    return { ok: false, reasons, appItem: null };
  }
  const mode = appItem.modeId;
  if (!isServable(appItem, new Map([[mode, "v2"]]))) reasons.push("not served at v2");
  if (!isServable(appItem, new Map([[mode, "preview"]]), { preview: true })) reasons.push("not served to a preview viewer");
  if (isServable(appItem, new Map([[mode, "v1"]]))) reasons.push("served at v1");
  for (const f of failsOf(appItem)) reasons.push(`as the app holds it: ${f.id}: ${f.message}`);

  try {
    const served = buildBankQuestion(appItem);
    const key = submittableKey(served);
    if (!checkAnswer(served, key)) reasons.push("served question does not take its own key");
    if (questionAnswerType(served) === "choice" && Array.isArray(served.choices) && !served.choices.includes(served.answer)) {
      reasons.push("served choices leave out the key");
    }
  } catch (err) {
    reasons.push(`serving threw: ${err.message}`);
  }
  return { ok: reasons.length === 0, reasons, appItem };
}

// ── Picking fills ────────────────────────────────────────────────────────

/** The bank's identity of an item (promptIdentity on its trimmed prompt), or an id-only key without a prompt. */
export function identityOf(item) {
  const prompt = item?.question?.display?.promptText;
  const text = typeof prompt === "string" ? prompt.trim() : "";
  return text ? promptIdentity(item, text) : `id:${item?.itemId}`;
}

const isRetired = (status) => status === "retired";

/**
 * An identity index: Map(identity -> { itemId, status }). The first holder
 * of an identity stays, unless it is retired and a later one is not: a
 * holder still in play always wins, so a fill whose question only a
 * retired row asked may be kept, and one a row still in play asks never
 * is. A second holder in play (beside one in play, under another id) is
 * returned in `duplicates` (the bank should have none); a retired row
 * beside a live one is no repeat a kid can meet.
 */
export function identityIndex(entries) {
  const index = new Map();
  const duplicates = [];
  for (const { item, status } of entries) {
    const key = identityOf(item);
    const mine = { itemId: item.itemId, status: status ?? item.reviewStatus ?? null };
    const had = index.get(key);
    if (!had) {
      index.set(key, mine);
      continue;
    }
    if (isRetired(mine.status)) continue;
    if (isRetired(had.status)) index.set(key, mine);
    else if (had.itemId !== mine.itemId) duplicates.push({ itemId: mine.itemId, sameAs: had.itemId });
  }
  return { index, duplicates };
}

/**
 * The `items` whose question a row still in play other than themselves
 * already asks: any of `entries` ({ item, status }) not retired, or another
 * of `items`. Returns [{ itemId, sameAs }]. The live step's last word on
 * promptText uniqueness, independent of the index the fills were picked
 * against.
 */
export function repeatedQuestions(items, entries) {
  const holders = new Map();
  const hold = (key, id) => {
    if (!holders.has(key)) holders.set(key, new Set());
    holders.get(key).add(id);
  };
  for (const { item, status } of entries) if (!isRetired(status ?? item.reviewStatus)) hold(identityOf(item), item.itemId);
  for (const item of items) hold(identityOf(item), item.itemId);
  const out = [];
  for (const item of items) {
    const others = [...holders.get(identityOf(item))].filter((id) => id !== item.itemId);
    if (others.length) out.push({ itemId: item.itemId, sameAs: others[0] });
  }
  return out;
}

/**
 * An exported item_bank identity row ({ item_id, mode_id, structure_type,
 * review_status, prompt, parts }) as the item shape promptIdentity reads.
 * `parts` holds the display fields and choices promptIdentity keys on.
 */
export function itemFromIdentityRow(row) {
  const parts = row.parts && typeof row.parts === "object" ? row.parts : {};
  const { answerType = null, choices = null, ...display } = parts;
  return {
    itemId: row.item_id,
    modeId: row.mode_id,
    structureType: row.structure_type,
    reviewStatus: row.review_status,
    version: row.version ?? 1,
    question: { answerType, choices, display: { ...display, promptText: row.prompt ?? undefined } },
  };
}

const numbersIn = (text) => new Set((String(text).replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+/g) || []).map(Number));

/** The worked examples of a topic's hint pane (src/hints/concepts.js), as { problem, answer }. */
export function conceptExamples(modeId) {
  return Object.values(CONCEPTS[modeId] || {})
    .map((c) => c?.example)
    .filter((e) => e && typeof e.problem === "string")
    .map((e) => ({ problem: e.problem, answer: String(e.answer ?? "") }));
}

/**
 * Does an item ask what a hint-pane example already answers? The same
 * prompt, or exactly the example's numbers (problem and answer) in any
 * order — "27 + 56 = ?" beside the example "56 + 27 = ?  83".
 */
export function exampleLeak(item, examples) {
  const prompt = String(item?.question?.display?.promptText ?? "").trim();
  if (!prompt) return null;
  const mine = numbersIn(`${prompt} ${item.question.answer}`);
  for (const e of examples) {
    if (prompt === e.problem.trim()) return `same prompt as the hint example "${e.problem}"`;
    const theirs = numbersIn(`${e.problem} ${e.answer}`);
    if (theirs.size >= 3 && mine.size === theirs.size && [...theirs].every((n) => mine.has(n))) {
      return `the hint example "${e.problem}" shows these numbers and the answer`;
    }
  }
  return null;
}

export const defaultSeeds = (max = MAX_SEED) => Array.from({ length: max }, (_, i) => i + 1);

/**
 * Fill a model seed by seed and keep the first `quota` fills that are new
 * questions and that `accept` lets through.
 *
 *   taken   Map(identity -> { itemId, status }) of every question already in
 *           the bank or picked; picks are added to it. A fill whose question
 *           a non-retired row already asks is skipped; one that only a
 *           retired row asked is kept and reported in `retiredMatches`.
 *   accept  (item) -> { ok, reasons } — the gate and any verdicts so far.
 *   avoid   (item) -> reason | null — e.g. exampleLeak.
 *   skipIds item ids never to pick (rows that exist retired, QC drops).
 *
 * Returns { picks: [{ seed, item }], skipped: [{ seed, itemId, reason }],
 * retiredMatches: [{ itemId, sameAs }], short }.
 */
export function selectFills(model, { quota = FILL_QUOTA, seeds = defaultSeeds(), taken = new Map(), accept = null, avoid = null, skipIds = null } = {}) {
  const picks = [];
  const skipped = [];
  const retiredMatches = [];
  for (const seed of seeds) {
    if (picks.length >= quota) break;
    let item;
    try {
      item = fill(model, { seed });
    } catch (err) {
      skipped.push({ seed, itemId: `${model.id}-s${seed}-v2`, reason: `fill threw: ${err.message}` });
      continue;
    }
    if (skipIds?.has(item.itemId)) {
      skipped.push({ seed, itemId: item.itemId, reason: skipIds.get?.(item.itemId) || "skipped" });
      continue;
    }
    const key = identityOf(item);
    const owner = taken.get(key);
    if (owner && owner.itemId !== item.itemId && owner.status !== "retired") {
      skipped.push({ seed, itemId: item.itemId, reason: `same question as ${owner.itemId}` });
      continue;
    }
    const leak = avoid ? avoid(item) : null;
    if (leak) {
      skipped.push({ seed, itemId: item.itemId, reason: leak });
      continue;
    }
    const verdict = accept ? accept(item) : { ok: true, reasons: [] };
    if (!verdict.ok) {
      skipped.push({ seed, itemId: item.itemId, reason: verdict.reasons.join("; ") || "not accepted" });
      continue;
    }
    if (owner && owner.itemId !== item.itemId) retiredMatches.push({ itemId: item.itemId, sameAs: owner.itemId });
    taken.set(key, { itemId: item.itemId, status: "picked" });
    picks.push({ seed, item });
  }
  return { picks, skipped, retiredMatches, short: picks.length < quota };
}
