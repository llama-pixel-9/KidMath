#!/usr/bin/env node
/**
 * M6.1 — re-tagging audit.
 *
 * The 3,924 curated items were authored under the old, informal vocabulary
 * ("joinResultUnknown", "partPartWhole"...). M1 replaced that with the CCSS
 * Table 1 and Table 2 taxonomy — 29 structures. This maps what exists onto what
 * we now generate and reports the gap.
 *
 * Run this BEFORE authoring at volume: it prices the whole phase, and the
 * existing bank may already cover more of the new taxonomy than the skew
 * suggests (equalGroupsTotalUnknown had 933 items against 4 quotitive).
 *
 * Usage:
 *   npm run bank:audit                 human-readable report
 *   npm run bank:audit -- --json       machine-readable
 *   npm run bank:audit -- --mode addition
 */

import { getBankItems } from "../src/itemBank/index.js";
import { ADDITIVE_STRUCTURES, BOTH_ADDENDS_UNKNOWN } from "../src/modes/structures/additiveStructures.js";
import { MULTIPLICATIVE_STRUCTURES } from "../src/modes/structures/multiplicativeStructures.js";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const modeFilter = args.includes("--mode") ? args[args.indexOf("--mode") + 1] : null;

/**
 * Old vocabulary -> new taxonomy.
 *
 * Several old tags are AMBIGUOUS: "partPartWhole" does not say whether the
 * total or an addend was unknown, and that is exactly the distinction the new
 * taxonomy exists to make. Those map to a candidate set and are reported as
 * needing inspection rather than silently assigned — guessing would produce a
 * bank that claims coverage it does not have.
 */
const MAPPING = {
  joinResultUnknown: ["addToResultUnknown"],
  joinChangeUnknown: ["addToChangeUnknown"],
  separateResultUnknown: ["takeFromResultUnknown"],
  separateChangeUnknown: ["takeFromChangeUnknown"],
  compareDifferenceUnknown: ["compareDifferenceMore", "compareDifferenceFewer"],
  partPartWhole: ["putTogetherTotalUnknown", "putTogetherAddendUnknown"],
  equalGroupsTotalUnknown: ["equalGroupsProductUnknown"],
  arrayTotalUnknown: ["arrayProductUnknown"],
  partitiveDivision: ["equalGroupsSizeUnknown", "arrayRowSizeUnknown"],
  quotitiveDivision: ["equalGroupsNumberUnknown", "arrayRowCountUnknown"],
  buildFromUnits: [],
  countObjects: [],
  patternNext: [],
  compareNumbers: [],
};

/**
 * Resolve an ambiguous old tag from the item itself.
 *
 * Most of the ambiguity is decidable without a human: whether the total or an
 * addend was unknown is visible in the arithmetic, and whether a Compare item
 * says "more" or "fewer" is visible in the prose. Only what neither settles is
 * left for review, which is the difference between re-tagging ~850 items by
 * hand and re-tagging a few dozen.
 */
const DISAMBIGUATORS = {
  partPartWhole: (item) => {
    const { a, b, answer } = item.question || {};
    if ([a, b, answer].some((n) => typeof n !== "number")) return null;
    // Total unknown: the two givens are the parts and they sum to the answer.
    return a + b === answer ? "putTogetherTotalUnknown" : "putTogetherAddendUnknown";
  },

  compareDifferenceUnknown: (item) => {
    const text = (item.question?.display?.promptText || "").toLowerCase();
    const more = /\bmore\b/.test(text);
    const fewer = /\bfewer\b|\bless\b/.test(text);
    if (more && !fewer) return "compareDifferenceMore";
    if (fewer && !more) return "compareDifferenceFewer";
    return null; // both or neither — a human should look
  },

  partitiveDivision: (item) => {
    const text = (item.question?.display?.promptText || "").toLowerCase();
    if (/\brows?\b|\barray\b|\bcolumns?\b/.test(text)) return "arrayRowSizeUnknown";
    return "equalGroupsSizeUnknown";
  },

  quotitiveDivision: (item) => {
    const text = (item.question?.display?.promptText || "").toLowerCase();
    if (/\brows?\b|\barray\b|\bcolumns?\b/.test(text)) return "arrayRowCountUnknown";
    return "equalGroupsNumberUnknown";
  },
};

const ALL_STRUCTURES = [
  ...ADDITIVE_STRUCTURES.map((s) => ({ id: s.id, tier: s.tier, family: "additive" })),
  { id: BOTH_ADDENDS_UNKNOWN.id, tier: BOTH_ADDENDS_UNKNOWN.tier, family: "additive" },
  ...MULTIPLICATIVE_STRUCTURES.map((s) => ({ id: s.id, tier: s.tier, family: "multiplicative" })),
];

function audit() {
  const items = getBankItems().filter((i) => !modeFilter || i.modeId === modeFilter);

  const byOld = new Map();
  for (const item of items) {
    const key = item.structureType || "(none)";
    if (!byOld.has(key)) byOld.set(key, []);
    byOld.get(key).push(item);
  }

  // Confident vs ambiguous re-tags.
  const confident = new Map();
  const ambiguous = new Map();
  const unmapped = new Map();

  for (const [oldTag, group] of byOld) {
    const targets = MAPPING[oldTag];
    if (!targets) {
      unmapped.set(oldTag, group.length);
    } else if (targets.length === 1) {
      confident.set(targets[0], (confident.get(targets[0]) || 0) + group.length);
    } else if (targets.length === 0) {
      unmapped.set(oldTag, group.length);
    } else {
      // Try to settle each item from its own payload before asking a human.
      const resolver = DISAMBIGUATORS[oldTag];
      let unresolved = 0;
      for (const item of group) {
        const resolved = resolver ? resolver(item) : null;
        if (resolved) confident.set(resolved, (confident.get(resolved) || 0) + 1);
        else unresolved += 1;
      }
      if (unresolved) {
        ambiguous.set(oldTag, { count: unresolved, candidates: targets });
      }
    }
  }

  const rows = ALL_STRUCTURES.map((s) => {
    const have = confident.get(s.id) || 0;
    const maybe = [...ambiguous.values()]
      .filter((a) => a.candidates.includes(s.id))
      .reduce((sum, a) => sum + a.count, 0);
    return { ...s, have, maybe };
  });

  return { total: items.length, rows, ambiguous, unmapped };
}

const { total, rows, ambiguous, unmapped } = audit();

if (asJson) {
  process.stdout.write(
    JSON.stringify(
      { total, rows, ambiguous: [...ambiguous], unmapped: [...unmapped] },
      null,
      2
    ) + "\n"
  );
} else {
  const pad = (s, n) => String(s).padEnd(n);
  process.stdout.write(`\nBANK STRUCTURE AUDIT — ${total} approved items${modeFilter ? ` (${modeFilter})` : ""}\n\n`);
  process.stdout.write(`${pad("structure", 32)}${pad("tier", 11)}${pad("confident", 11)}${pad("ambiguous", 11)}status\n`);
  process.stdout.write(`${"-".repeat(76)}\n`);

  let covered = 0;
  for (const r of rows) {
    const status = r.have >= 25 ? "ok" : r.have > 0 ? "THIN" : r.maybe > 0 ? "needs re-tag" : "EMPTY";
    if (r.have >= 25) covered += 1;
    process.stdout.write(
      `${pad(r.id, 32)}${pad(r.tier, 11)}${pad(r.have, 11)}${pad(r.maybe || "", 11)}${status}\n`
    );
  }

  process.stdout.write(`\nAMBIGUOUS old tags — cannot be re-tagged without inspecting the prose:\n`);
  if (!ambiguous.size) process.stdout.write("  (none)\n");
  for (const [tag, info] of ambiguous) {
    process.stdout.write(`  ${pad(tag, 30)} ${pad(info.count, 6)} -> one of: ${info.candidates.join(", ")}\n`);
  }

  process.stdout.write(`\nNOT PART OF TABLE 1/2 (other modes; no re-tag needed):\n`);
  if (!unmapped.size) process.stdout.write("  (none)\n");
  for (const [tag, count] of unmapped) process.stdout.write(`  ${pad(tag, 30)} ${count}\n`);

  const empty = rows.filter((r) => r.have === 0 && r.maybe === 0);
  const ambiguousTotal = [...ambiguous.values()].reduce((s, a) => s + a.count, 0);

  process.stdout.write(`\nSUMMARY\n`);
  process.stdout.write(`  structures with >=25 items:   ${covered}/${rows.length}\n`);
  process.stdout.write(`  structures with nothing:      ${empty.length}/${rows.length}\n`);
  process.stdout.write(`  items needing manual re-tag:  ${ambiguousTotal}\n`);
  process.stdout.write(`  structures never authored:    ${empty.map((r) => r.id).join(", ") || "(none)"}\n\n`);
}
