/**
 * The standards code lists: one JSON file per framework (Common Core and the
 * four states), each row a code with our own one-line summary. These files
 * are the source; scripts/standards/loadStandards.js copies them into the
 * `standards` table, and the coverage view counts against that copy
 * (docs/standards-coverage.md).
 *
 * The CI gate (src/__tests__/standards.spec.js) checks every code an item
 * model, blueprint row or catalog skill cites against these files, for each
 * framework that is loaded. A framework is loaded once its file is listed in
 * FILES below; codes for a framework not loaded yet are carried but not
 * checked.
 *
 * Summaries are our own words. The official text stays at each file's
 * source_url (Texas and others restrict reuse of their text).
 *
 * Pure: no network, no DOM.
 */
import ccss from "./ccss.json" with { type: "json" };

/** Every framework the app tags, in display order. Kid profiles store a state; any other state reads as Common Core. */
export const FRAMEWORKS = Object.freeze(["ccss", "tx", "fl", "va", "ga"]);

export const FRAMEWORK_LABELS = Object.freeze({
  ccss: "Common Core",
  tx: "Texas (TEKS)",
  fl: "Florida (B.E.S.T.)",
  va: "Virginia (SOL)",
  ga: "Georgia",
});

export const GRADES = Object.freeze(["K", "1", "2", "3", "4", "5"]);
export const KINDS = Object.freeze(["fluency", "skill", "word_problem", "concept"]);
export const SCOPES = Object.freeze(["yes", "partly", "no"]);
export const MATCHES = Object.freeze(["same", "partly", "broader", "narrower"]);

/** Framework → its file. A state joins here when its list lands. */
const FILES = { ccss };

/** Crosswalk files, framework → { links: [...] }. None loaded yet. */
const CROSSWALKS = {};

export const LOADED_FRAMEWORKS = Object.freeze(Object.keys(FILES));

export function isLoaded(framework) {
  return Object.prototype.hasOwnProperty.call(FILES, framework);
}

const CCSS_CODE = /^([K1-5])\.([A-Z]+)\.([A-Z])\.(\d+)([a-e])?$/;

/**
 * The other ways a Common Core code is written: the short form without the
 * cluster letter (3.OA.7, 3.NF.2a) and, for a sub-part, the official dotted
 * identifier (3.NF.A.2.a).
 */
export function ccssAliases(code) {
  const m = CCSS_CODE.exec(code);
  if (!m) return [];
  const [, grade, domain, , num, letter] = m;
  const aliases = [`${grade}.${domain}.${num}${letter || ""}`];
  if (letter) aliases.push(code.slice(0, -1) + "." + letter);
  return aliases;
}

function withDerived(framework, file) {
  const rows = Array.isArray(file?.standards) ? file.standards : [];
  return Object.freeze(
    rows.map((row, i) =>
      Object.freeze({
        ...row,
        framework,
        aliases: Object.freeze([...(row.aliases || []), ...(framework === "ccss" ? ccssAliases(row.code) : [])]),
        edition: row.edition || file.edition,
        source_url: row.source_url || file.source_url,
        sort_order: i,
      })
    )
  );
}

const ROWS = Object.fromEntries(Object.entries(FILES).map(([fw, file]) => [fw, withDerived(fw, file)]));

const BY_CODE = new Map();
const BY_ALIAS = new Map();
for (const [fw, rows] of Object.entries(ROWS)) {
  for (const row of rows) {
    BY_CODE.set(`${fw}|${row.code}`, row);
    for (const alias of row.aliases) BY_ALIAS.set(`${fw}|${alias}`, row);
  }
}

/** The file's header fields (name, edition, source_url, checked, note). */
export function frameworkInfo(framework) {
  const file = FILES[framework];
  if (!file) return null;
  const { standards: _rows, ...info } = file;
  return info;
}

/** Every row of a loaded framework in file order, each with framework, aliases and sort_order. Empty when not loaded. */
export function standardsFor(framework) {
  return ROWS[framework] || [];
}

/** The row for an exact code, or null. */
export function standardByCode(framework, code) {
  return BY_CODE.get(`${framework}|${code}`) || null;
}

/** The row for a code or one of its aliases, or null. */
export function findStandard(framework, code) {
  if (typeof code !== "string") return null;
  const key = `${framework}|${code.trim()}`;
  return BY_CODE.get(key) || BY_ALIAS.get(key) || null;
}

/** The canonical code for a code or alias, or null when unknown. */
export function normalizeCode(framework, code) {
  return findStandard(framework, code)?.code ?? null;
}

/** Crosswalk links of one state framework (framework, code, ccss_code, match, note). Empty until its file lands. */
export function crosswalkFor(framework) {
  const links = CROSSWALKS[framework]?.links;
  return Array.isArray(links) ? links.map((l) => ({ framework, ...l })) : [];
}

export const LOADED_CROSSWALKS = Object.freeze(Object.keys(CROSSWALKS));

/**
 * Codes in a `standards` object ({ ccss: [...], tx: [...] }) that a loaded
 * framework does not list exactly. Aliases count as unknown here: tags are
 * written in the canonical form so a search for the code finds them.
 * Frameworks not loaded yet are skipped.
 */
export function unknownCodes(standards) {
  const out = [];
  if (!standards || typeof standards !== "object") return out;
  for (const [framework, codes] of Object.entries(standards)) {
    if (!isLoaded(framework)) continue;
    for (const code of Array.isArray(codes) ? codes : [codes]) {
      if (!standardByCode(framework, code)) {
        const canonical = normalizeCode(framework, code);
        out.push({ framework, code, ...(canonical ? { canonical } : {}) });
      }
    }
  }
  return out;
}

/**
 * Shape errors in one framework file, as strings. Used by the CI gate for
 * every file, including a state list before it is wired into FILES.
 */
export function validateStandardsFile(file, framework = file?.framework) {
  const errors = [];
  if (!FRAMEWORKS.includes(framework)) errors.push(`unknown framework "${framework}"`);
  if (!file?.edition) errors.push("missing edition");
  if (!file?.source_url) errors.push("missing source_url");
  const rows = Array.isArray(file?.standards) ? file.standards : null;
  if (!rows || rows.length === 0) {
    errors.push("no standards");
    return errors;
  }
  const seen = new Set();
  for (const row of rows) {
    const at = row?.code || "(no code)";
    if (typeof row?.code !== "string" || !row.code.trim() || row.code !== row.code.trim()) errors.push(`${at}: bad code`);
    if (seen.has(row.code)) errors.push(`${at}: duplicate code`);
    seen.add(row.code);
    if (!GRADES.includes(row.grade)) errors.push(`${at}: grade "${row.grade}"`);
    if (typeof row.domain !== "string" || !row.domain) errors.push(`${at}: missing domain`);
    if (!KINDS.includes(row.kind)) errors.push(`${at}: kind "${row.kind}"`);
    if (!SCOPES.includes(row.in_scope)) errors.push(`${at}: in_scope "${row.in_scope}"`);
    if (row.in_scope !== "yes" && !row.scope_note) errors.push(`${at}: in_scope ${row.in_scope} needs a scope_note`);
    if (typeof row.summary !== "string" || row.summary.length < 10 || row.summary.length > 200) {
      errors.push(`${at}: summary must be one line of 10 to 200 characters`);
    }
    if (framework === "ccss" && !CCSS_CODE.test(row.code || "")) errors.push(`${at}: not a long-form Common Core code`);
  }
  for (const row of rows) {
    if (row.parent && !seen.has(row.parent)) errors.push(`${row.code}: parent ${row.parent} is not in the file`);
  }
  return errors;
}
