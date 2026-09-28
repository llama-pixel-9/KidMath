/**
 * The context table: the objects a v2 story is allowed to be about, with the
 * numbers that keep a story realistic (how many one kid has, what one costs,
 * how long it is) and the age bands and skills each fits.
 *
 * contextTable.json is the data ({ objects: [...] }); this module is the only
 * reader. The JSON is Sai's table and will be replaced by the final version,
 * so every accessor tolerates missing or extra fields — a row is kept as
 * long as it has an id and a singular form.
 *
 * Read by the QC checks (contextObjectKnown, priceInRange) and by item
 * authoring. Pure: no network, no DOM.
 */
import table from "./contextTable.json" with { type: "json" };

const isRow = (o) => o && typeof o === "object" && typeof o.id === "string" && typeof o.singular === "string";

/** Every object row, in table order. Frozen: callers filter, never edit. */
export const CONTEXT_OBJECTS = Object.freeze(
  (Array.isArray(table?.objects) ? table.objects : []).filter(isRow)
);

const BY_ID = new Map(CONTEXT_OBJECTS.map((o) => [o.id, o]));

/** A [lo, hi] numeric pair, or null for anything else (absent, malformed). */
function rangeOf(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lo, hi] = value.map(Number);
  return Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : null;
}

export function objectById(id) {
  return BY_ID.get(id) || null;
}

/**
 * Objects fit for a story: those the table lists for `skill` (a mode id) and
 * `band` (K-1 / 2-3 / 4-5), at or above `minAppeal`. The default of 2 is the
 * rule Sai chose — only objects kids actually care about go in stories.
 * Either filter may be omitted.
 */
export function objectsFor({ skill, band, minAppeal = 2 } = {}) {
  return CONTEXT_OBJECTS.filter((o) => {
    if (typeof o.appeal === "number" && o.appeal < minAppeal) return false;
    if (typeof o.appeal !== "number" && minAppeal > 0) return false;
    if (skill && !(Array.isArray(o.skills) && o.skills.includes(skill))) return false;
    if (band && !(Array.isArray(o.age_bands) && o.age_bands.includes(band))) return false;
    return true;
  });
}

/** Unit price range [lo, hi] in dollars, or null when the table has none. */
export function priceRangeFor(id) {
  return rangeOf(objectById(id)?.price_usd);
}

/** The pack the object is sold in ({ size, price_usd }), or null. */
export function packFor(id) {
  const pack = objectById(id)?.pack;
  if (!pack || typeof pack !== "object") return null;
  const size = Number(pack.size);
  const price = Number(pack.price_usd);
  return Number.isFinite(size) && Number.isFinite(price) ? { size, price_usd: price } : null;
}

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------

// One regex over every singular and plural form, longest forms first so "toy
// car" wins over "car" at the same position and neither is reported twice.
// Whole words only, so "pin" never matches "pineapple" — the boundary is any
// letter or digit (with the u flag, so "piñata" keeps its ñ), written as a
// consumed prefix rather than a lookbehind so it runs on older Safari too.
const FORM_TO_OBJECT = new Map();
for (const o of CONTEXT_OBJECTS) {
  for (const form of [o.singular, o.plural]) {
    if (typeof form !== "string" || !form.trim()) continue;
    const key = form.trim().toLowerCase();
    if (!FORM_TO_OBJECT.has(key)) FORM_TO_OBJECT.set(key, o);
  }
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FORMS = [...FORM_TO_OBJECT.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
const FORM_RE = FORMS.length
  ? new RegExp(`(^|[^\\p{L}\\p{N}])(${FORMS.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu")
  : null;

/**
 * Every place a table object is named in `text`, in reading order:
 * [{ object, form, index, length }]. `index` is the start of the matched
 * word, not of the boundary character before it.
 */
export function objectMatchesInText(text) {
  if (!FORM_RE || typeof text !== "string" || !text) return [];
  const hits = [];
  FORM_RE.lastIndex = 0;
  let m;
  while ((m = FORM_RE.exec(text)) !== null) {
    const form = m[2];
    const object = FORM_TO_OBJECT.get(form.toLowerCase());
    if (object) hits.push({ object, form, index: m.index + m[1].length, length: form.length });
    // A zero-width prefix match at end of input would otherwise loop forever.
    if (m[0].length === 0) FORM_RE.lastIndex += 1;
  }
  return hits;
}

/** The distinct table objects named in `text`, in order of first mention. */
export function findObjectsInText(text) {
  const seen = new Set();
  const out = [];
  for (const { object } of objectMatchesInText(text)) {
    if (seen.has(object.id)) continue;
    seen.add(object.id);
    out.push(object);
  }
  return out;
}
