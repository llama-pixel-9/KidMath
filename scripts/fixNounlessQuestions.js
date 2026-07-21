#!/usr/bin/env node
/* Repair noun-less question sentences in cloud item_bank rows.
 *
 * "How many does Lily have?" makes a young reader resolve the referent from an
 * earlier sentence; the wording rule (word-problem-authoring-guide.md, enforced
 * by the `nounlessQuestion` QC check) requires restating the counted noun:
 * "How many toy cars does Lily have?".
 *
 * The counted noun is recovered from the prompt itself (compare phrases,
 * "Some <noun> ..." openers), the fix is inserted, and the result must pass the
 * full authoring gate (checkStructure + runChecks) before it is written back.
 * Anything the heuristics cannot fix confidently is reported for manual edit.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/fixNounlessQuestions.js            report only
 *   node --import ./scripts/lib/registerResolve.js scripts/fixNounlessQuestions.js --write    apply fixes
 *   ... --generator authorStructures   restrict to one source.generator (default)
 *   ... --all                          scan every bank row regardless of source
 */

import { checkStructure } from "../src/itemBank/qc/structureCheck.js";
import { runChecks } from "../src/itemBank/qc/checks.js";

const args = process.argv.slice(2);
const write = args.includes("--write");
const all = args.includes("--all");
const generator = args.includes("--generator")
  ? args[args.indexOf("--generator") + 1]
  : "authorStructures";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Same closed list as the nounlessQuestion QC check.
const DANGLING = /\b(how) many\s+(?=(does|do|did|is|are|was|were|in|now)\b)/i;
const BARE = /\bhow many\s*[?.!]/i;

// Words that follow "<number> " without being the counted noun.
const NOUN_STOPWORDS = new Set([
  "is", "was", "are", "were", "has", "does", "plus", "minus", "times",
  "equals", "less", "apiece", "groups", "rows", "columns", "equal",
]);

// Items whose wording needs a human sentence, not a heuristic insertion.
const MANUAL_FIXES = {
  // Two different plural nouns; the total needs the superordinate "people".
  "addition-app-292":
    "A fair booth has 16 ring-toss players and 29 dart-throwers in line. How many people in line?",
  // The only stated count is the singular "1 berry".
  "addition-app-409": "Holt had 1 berry. After picking more, he had 8. How many berries did Holt pick?",
};

/** Recover the counted noun (with any adjectives) from the prompt's setup. */
function extractNoun(prompt) {
  // "2 ducks each have 3 feathers" — the counted thing is the per-group noun,
  // not the first noun; this must win over the generic first-plural rule.
  const each = prompt.match(/\beach (?:has|have|holds|hold|contains|contain|gets|get)\s+\d+\s+([a-z]+)/i);
  if (each) return each[1];

  const patterns = [
    /\d+\s+(?:fewer|more)\s+([a-z][a-z ]*?)\s+than\b/i, // "7 fewer toy cars than"
    /times as many\s+([a-z][a-z ]*?)\s+as\b/i, // "3 times as many stickers as"
    // "Some toy cars were ..." — noun phrase up to the clause's verb.
    /\bsome\s+([a-z][a-z ]*?)\s+(?:was|were|sat|are|is|lay|swam|flew|landed|stood|grew|fell|hopped|hung|floated|rested|waited)\b/i,
  ];
  for (const re of patterns) {
    const m = prompt.match(re);
    if (m) return m[1].trim();
  }

  // Legacy story shapes ("Ina had 10 grapes and ate some. How many did she
  // eat?"): the counted noun is the first plural right after a number. Try the
  // two-word phrase ("toy cars"), then the single word ("birds" in "birds on").
  for (const m of prompt.matchAll(/\b\d+\s+([a-z]+(?:\s[a-z]+)?)\b/gi)) {
    for (const candidate of [m[1], m[1].split(" ")[0]]) {
      const words = candidate.toLowerCase().split(" ");
      if (words.some((w) => NOUN_STOPWORDS.has(w))) continue;
      if (words[words.length - 1].endsWith("s")) return candidate.trim();
    }
  }
  return null;
}

/**
 * Purely numeric conceptual drills have no noun anywhere, so one is supplied:
 * "counters", the classroom manipulative these number relations model (CPA).
 */
function counterRewrites(prompt) {
  let m = prompt.match(/^Start with (\d+)\. After (removing|adding) some, (\d+) remain\. How many were (removed|added)\?$/);
  if (m) return `Start with ${m[1]} counters. After ${m[2]} some, ${m[3]} remain. How many counters were ${m[4]}?`;
  m = prompt.match(/^How many in (\d+) groups of (\d+)\?$/);
  if (m) return `How many counters in ${m[1]} groups of ${m[2]}?`;
  m = prompt.match(/^How many is (\d+) groups of (\d+)\?$/);
  if (m) return `How many counters are in ${m[1]} groups of ${m[2]}?`;
  m = prompt.match(/^How many in each group when (\d+) is split into (\d+) equal groups\?$/);
  if (m) return `How many counters in each group when ${m[1]} counters are split into ${m[2]} equal groups?`;
  m = prompt.match(/^If I had (\d+) and now have (\d+), how many were taken away\?$/);
  if (m) return `If I had ${m[1]} counters and now have ${m[2]}, how many counters were taken away?`;
  // Array drills count the dots of the array itself.
  if (/^Rows and columns: \d+ rows × \d+ columns gives how many\?$/.test(prompt)) {
    return prompt.replace(/gives how many\?$/, "gives how many dots?");
  }
  if (/^Count rows of \d+: [\d, ]+\. That's \d+ rows\. How many in total\?$/.test(prompt)) {
    return prompt.replace(/How many in total\?$/, "How many dots in total?");
  }
  return null;
}

function rewrite(prompt, itemId) {
  if (MANUAL_FIXES[itemId]) return { fixed: MANUAL_FIXES[itemId] };
  const counters = counterRewrites(prompt);
  if (counters) return { fixed: counters };
  const noun = extractNoun(prompt);
  if (!noun) return { fixed: null, bare: BARE.test(prompt) && !DANGLING.test(prompt) };
  if (DANGLING.test(prompt)) return { fixed: prompt.replace(DANGLING, `$1 many ${noun} `) };
  // Bare "how many?" — "The other group has how many?", "by how many?"
  return { fixed: prompt.replace(/\b(how) many\s*([?.!])/i, `$1 many ${noun}$2`) };
}

async function fetchRows() {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const params = new URLSearchParams({
      select: "item_id,mode_id,structure_type,level_min,level_max,payload,source",
      order: "item_id.asc",
    });
    if (!all) params.set("source->>generator", `eq.${generator}`);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/item_bank?${params}`, {
      headers: { ...HEADERS, Range: `${from}-${from + PAGE - 1}` },
    });
    if (!resp.ok) throw new Error(`fetch failed (${resp.status}): ${await resp.text()}`);
    const page = await resp.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

async function patchRow(itemId, payload) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/item_bank?item_id=eq.${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ payload }),
  });
  if (!resp.ok) throw new Error(`patch ${itemId} failed (${resp.status}): ${await resp.text()}`);
}

async function main() {
  const rows = await fetchRows();
  const flagged = rows.filter((r) => {
    const text = r.payload?.display?.promptText || "";
    return DANGLING.test(text) || BARE.test(text);
  });
  console.log(`${rows.length} row(s) scanned (${all ? "whole bank" : `generator=${generator}`}), ${flagged.length} noun-less.`);

  const manual = [];
  let fixedCount = 0;
  for (const row of flagged) {
    const prompt = row.payload.display.promptText;
    const { fixed, bare } = rewrite(prompt, row.item_id);
    if (!fixed) {
      manual.push({ itemId: row.item_id, prompt, reason: bare ? "bare 'How many?'" : "noun not recoverable" });
      continue;
    }

    const candidate = {
      itemId: row.item_id,
      modeId: row.mode_id,
      structureType: row.structure_type,
      levelRange: [Number(row.level_min), Number(row.level_max)],
      question: { ...row.payload, display: { ...row.payload.display, promptText: fixed } },
    };
    const struct = checkStructure(candidate);
    const qc = runChecks(candidate);
    if (!struct.ok || !qc.pass) {
      const why = [...(struct.ok ? [] : struct.problems), ...qc.findings.filter((f) => f.severity === "fail").map((f) => f.id)];
      manual.push({ itemId: row.item_id, prompt, reason: `rewrite failed gate: ${why.join(", ")}` });
      continue;
    }

    console.log(`  ${row.item_id}`);
    console.log(`    - ${prompt}`);
    console.log(`    + ${fixed}`);
    if (write) await patchRow(row.item_id, candidate.question);
    fixedCount += 1;
  }

  console.log(`\n${fixedCount} fix(es) ${write ? "written" : "ready (dry run — pass --write to apply)"}.`);
  if (manual.length) {
    console.log(`${manual.length} item(s) need manual edit:`);
    for (const m of manual) console.log(`  ${m.itemId} — ${m.reason}\n    "${m.prompt}"`);
  }
}

main().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
