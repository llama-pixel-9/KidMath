/**
 * State vocabulary swaps (plan section 4). Items are written in Common Core
 * wording; `localize` swaps in the words a kid's state test uses ("strip
 * diagram" in Texas). stateWords.json is the table, keyed by state code, and
 * is meant to be extended by hand: each entry maps a phrase to its
 * replacement, plus reserved keys the swap loop skips — `notes`, `gradeLimits`
 * (phrase -> the grades the swap applies to) and `money` (notation rules).
 *
 * Whole phrases only: "equation" never touches "inequation", and a plural
 * ("tape diagrams") swaps as a plural. Pure: safe in the native engine bundle.
 */
import STATE_WORDS from "./stateWords.json" with { type: "json" };

export const STATE_TERMS = STATE_WORDS;

const RESERVED = new Set(["notes", "gradeLimits", "money"]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Grades as the kid profile writes them: "K", "1" .. "5". Numbers accepted. */
function gradeKey(grade) {
  if (grade == null || grade === "") return null;
  const s = String(grade).trim().toUpperCase();
  return s === "0" ? "K" : s;
}

/**
 * The swaps for a state, as [{ from, to }] in table order. Swaps limited to
 * certain grades apply when `grade` is one of them — or when the grade is
 * unknown, since a kid whose grade we have not asked still belongs to the
 * state, and the swapped word is the one every grade there has met.
 */
export function swapsFor(stateCode, { grade } = {}) {
  const entry = stateCode ? STATE_TERMS[String(stateCode).toUpperCase()] : null;
  if (!entry || typeof entry !== "object") return [];
  const limits = entry.gradeLimits && typeof entry.gradeLimits === "object" ? entry.gradeLimits : {};
  const g = gradeKey(grade);
  const out = [];
  for (const [from, to] of Object.entries(entry)) {
    if (RESERVED.has(from) || typeof to !== "string" || !from.trim()) continue;
    const allowed = limits[from];
    if (g && Array.isArray(allowed) && !allowed.map(gradeKey).includes(g)) continue;
    out.push({ from, to });
  }
  return out;
}

/** The state's money notation rule ({ fromGrade, style, notes }) or null. */
export function moneyRuleFor(stateCode) {
  const entry = stateCode ? STATE_TERMS[String(stateCode).toUpperCase()] : null;
  return entry && entry.money && typeof entry.money === "object" ? entry.money : null;
}

const startsWithVowelSound = (word) => /^[aeiou]/i.test(word);

/**
 * `text` with the state's phrases swapped in. Unknown state, no state, or a
 * state with no swaps returns the text unchanged. Case of the first letter
 * is kept ("Tape diagram" -> "Strip diagram"), a trailing s carries over,
 * and "a"/"an" before the phrase follows the new word ("an equation" ->
 * "a number sentence").
 */
export function localize(text, stateCode, { grade } = {}) {
  if (typeof text !== "string" || !text) return text;
  const swaps = swapsFor(stateCode, { grade });
  if (!swaps.length) return text;
  let out = text;
  for (const { from, to } of swaps) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(an?\\s+)?(${escapeRe(from)})(s?)(?![\\p{L}\\p{N}])`, "giu");
    out = out.replace(re, (_m, before, article, matched, plural) => {
      const upper = matched[0] === matched[0].toUpperCase() && matched[0] !== matched[0].toLowerCase();
      const word = upper ? to[0].toUpperCase() + to.slice(1) : to;
      let lead = article || "";
      if (lead) {
        const wantAn = startsWithVowelSound(to);
        const cap = lead[0] === "A";
        lead = (cap ? "A" : "a") + (wantAn ? "n" : "") + lead.slice(lead.search(/\s/));
      }
      return `${before}${lead}${word}${plural}`;
    });
  }
  return out;
}
