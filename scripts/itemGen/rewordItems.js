#!/usr/bin/env node
/**
 * Generate ranked natural-prose alternatives for existing bank items.
 *
 * The reviewer chooses wording; the pipeline only guarantees math. For each
 * target item, `claude -p` writes up to 3 rewrites in the house register
 * (structureRules.js: NARRATIVE_RULES + GOLD_EXAMPLES), ordered best first.
 * Every candidate must state the same given numbers, keep the answer hidden,
 * and pass checkStructure + the deterministic QC gate. Survivors are stored on
 * the item as payload.display.promptOptions; the Review queue then shows them
 * as choices and approval writes the reviewer's pick into promptText.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/rewordItems.js            dry run
 *   ... --write               store options on the items
 *   ... --generator NAME      target source.generator (default authorStructures)
 *   ... --only STRUCTURE      restrict to one structureType
 *   ... --include-approved    also reword approved items (default: draft+reviewed only)
 */

import { spawn } from "node:child_process";
import { checkStructure } from "../../src/itemBank/qc/structureCheck.js";
import { runChecks } from "../../src/itemBank/qc/checks.js";
import { RULES, NARRATIVE_RULES, GOLD_EXAMPLES } from "./structureRules.js";

const args = process.argv.slice(2);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const has = (n) => args.includes(`--${n}`);

const write = has("write");
const includeApproved = has("include-approved");
const generator = flag("generator", "authorStructures");
const onlyStructure = flag("only");
const model = process.env.KIDMATH_ITEMGEN_MODEL || "haiku";

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

async function fetchRows() {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const params = new URLSearchParams({
      select: "item_id,mode_id,structure_type,level_min,level_max,review_status,payload,source",
      "source->>generator": `eq.${generator}`,
      order: "item_id.asc",
    });
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/item_bank?${params}`, {
      headers: { ...HEADERS, Range: `${from}-${from + PAGE - 1}` },
    });
    if (!resp.ok) throw new Error(`fetch failed (${resp.status}): ${await resp.text()}`);
    const page = await resp.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

function buildPrompt(structureId, items) {
  return [
    "You rewrite word problems for a kids' math app (US, grades 2-4) so they read naturally to a young child.",
    "",
    `Problem structure: ${structureId}`,
    `STRUCTURE RULE (must still hold in every rewrite): ${RULES[structureId] || "keep the same mathematical structure"}`,
    "",
    "Target register — reviewer-approved examples:",
    ...GOLD_EXAMPLES.map((g) => `  "${g}"`),
    "",
    "Style rules:",
    ...NARRATIVE_RULES.map((r) => `- ${r}`),
    "",
    "For EACH item below, write up to 3 rewrites ORDERED BEST FIRST. Keep the same two given numbers,",
    "the same unknown, and the same answer. Never state the answer. You may change names, objects and",
    "scene freely as long as the structure rule holds. <= 220 characters each.",
    "",
    "Items:",
    ...items.map((it) =>
      `  ${it.item_id}: "${it.payload.display.promptText}" (given numbers ${it.payload.a} and ${it.payload.b}, answer ${it.payload.answer})`
    ),
    "",
    "Output ONLY a JSON object mapping each item id to an array of 1-3 rewrite strings, best first.",
    "No prose, no markdown fences.",
  ].join("\n");
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const a = ["-p", "--output-format", "json", "--model", model];
    const child = spawn("claude", a, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${err.trim()}`));
      try {
        resolve(JSON.parse(out).result ?? "");
      } catch (e) {
        reject(new Error(`parse: ${e.message}`));
      }
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

const numbersIn = (text) => (text.match(/\d+/g) || []).map(Number);

/** A candidate is usable only if the gate cannot tell it from the original. */
function gateCandidate(row, candidate) {
  const text = String(candidate || "").trim();
  if (!text || text.length > 220) return null;
  const { a, b, answer } = row.payload;
  const nums = numbersIn(text);
  if (typeof a === "number" && !nums.includes(a)) return null;
  if (typeof b === "number" && !nums.includes(b)) return null;
  // Stricter than the QC warn: a reworded prompt has no excuse to surface the answer.
  if (typeof answer === "number" && nums.includes(answer) && answer !== a && answer !== b) return null;

  const item = {
    itemId: row.item_id,
    modeId: row.mode_id,
    structureType: row.structure_type,
    levelRange: [Number(row.level_min), Number(row.level_max)],
    question: { ...row.payload, display: { ...row.payload.display, promptText: text } },
  };
  const struct = checkStructure(item);
  const qc = runChecks(item);
  return struct.ok && qc.pass ? text : null;
}

async function patchOptions(itemId, payload, options) {
  const newPayload = { ...payload, display: { ...payload.display, promptOptions: options } };
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/item_bank?item_id=eq.${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ payload: newPayload }),
  });
  if (!resp.ok) throw new Error(`patch ${itemId} failed (${resp.status}): ${await resp.text()}`);
}

async function main() {
  const rows = (await fetchRows()).filter((r) => {
    if (!includeApproved && r.review_status === "approved") return false;
    if (r.review_status === "retired") return false;
    if (onlyStructure && r.structure_type !== onlyStructure) return false;
    return typeof r.payload?.display?.promptText === "string";
  });

  const byStructure = new Map();
  for (const r of rows) {
    if (!byStructure.has(r.structure_type)) byStructure.set(r.structure_type, []);
    byStructure.get(r.structure_type).push(r);
  }
  console.log(`${rows.length} item(s) across ${byStructure.size} structure(s), model "${model}"\n`);

  let withOptions = 0;
  let noOptions = 0;
  for (const [structureId, items] of byStructure) {
    const text = await runClaude(buildPrompt(structureId, items));
    const match = text.match(/\{[\s\S]*\}/);
    let parsed = {};
    try {
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      console.log(`${structureId.padEnd(26)} JSON parse failed — skipped`);
      continue;
    }

    for (const row of items) {
      const raw = Array.isArray(parsed[row.item_id]) ? parsed[row.item_id] : [];
      const seen = new Set([row.payload.display.promptText]);
      const options = [];
      for (const cand of raw) {
        const ok = gateCandidate(row, cand);
        if (ok && !seen.has(ok)) {
          seen.add(ok);
          options.push(ok);
        }
        if (options.length === 3) break;
      }
      if (options.length === 0) {
        noOptions += 1;
        continue;
      }
      withOptions += 1;
      console.log(`  ${row.item_id}`);
      console.log(`    orig: ${row.payload.display.promptText}`);
      options.forEach((o, i) => console.log(`    #${i + 1}:   ${o}`));
      if (write) await patchOptions(row.item_id, row.payload, options);
    }
    console.log(`${structureId.padEnd(26)} done`);
  }

  console.log(
    `\n${withOptions} item(s) got options, ${noOptions} had no gate-surviving rewrite.` +
      `${write ? " Written." : " (dry run — pass --write to store)"}`
  );
}

main().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
