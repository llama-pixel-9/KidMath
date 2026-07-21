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

/** Recover the counted noun (with any adjectives) from the prompt's setup. */
function extractNoun(prompt) {
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
  return null;
}

function rewrite(prompt) {
  if (BARE.test(prompt) && !DANGLING.test(prompt)) return { noun: null, fixed: null, bare: true };
  const noun = extractNoun(prompt);
  if (!noun) return { noun: null, fixed: null };
  return { noun, fixed: prompt.replace(DANGLING, `$1 many ${noun} `) };
}

async function fetchRows() {
  const params = new URLSearchParams({ select: "item_id,mode_id,structure_type,level_min,level_max,payload,source" });
  if (!all) params.set("source->>generator", `eq.${generator}`);
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/item_bank?${params}`, { headers: HEADERS });
  if (!resp.ok) throw new Error(`fetch failed (${resp.status}): ${await resp.text()}`);
  return resp.json();
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
    const { fixed, bare } = rewrite(prompt);
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
