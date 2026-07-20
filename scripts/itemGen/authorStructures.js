#!/usr/bin/env node
/**
 * Author the empty difficult structures.
 *
 * The bank audit found the difficult tier all but empty — the Start Unknowns,
 * the Compare language traps, and multiplicative Compare had never been
 * authored. The normal pipeline generates variants from EXEMPLARS, but these
 * cells have none, so this script seeds itself:
 *
 *   1. the M1 structure engine generates a few CORRECT reference items per
 *      structure — right math, right structure, templated prose
 *   2. `claude -p` (on the subscription, Haiku by default) authors varied prose
 *      versions, guided by the references and by the structure's defining rule
 *   3. every candidate passes checkStructure (catches the model downgrading a
 *      hard structure to an easy one — the whole reason this tier is risky) AND
 *      the deterministic QC gate
 *   4. survivors are written as review_status='draft' — inert until a human
 *      approves them
 *
 * Usage:
 *   node scripts/itemGen/authorStructures.js --dry            generate + gate, write nothing
 *   node scripts/itemGen/authorStructures.js --per 12         items per structure
 *   node scripts/itemGen/authorStructures.js --only compareBiggerFewer
 *   node scripts/itemGen/authorStructures.js --write          write drafts to Supabase
 */

import { spawn } from "node:child_process";
import {
  ADDITIVE_BY_ID,
  MULTIPLICATIVE_BY_ID,
  generateAdditiveItem,
  generateMultiplicativeItem,
} from "../../src/modes/structures/index.js";
import { checkStructure } from "../../src/itemBank/qc/structureCheck.js";
import { runChecks } from "../../src/itemBank/qc/checks.js";
import { writeDrafts } from "./writeDrafts.js";

const args = process.argv.slice(2);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const has = (n) => args.includes(`--${n}`);

const perStructure = Number(flag("per", "12"));
const onlyStructure = flag("only");
const write = has("write");
const model = process.env.KIDMATH_ITEMGEN_MODEL || "haiku";

// The defining rule per structure — exactly what checkStructure enforces,
// stated for the author so it gets the hard ones right on the first try.
const RULES = {
  addToStartUnknown:
    'The STARTING amount is unknown and must NOT be stated. Begin with "Some ...". State exactly two numbers: the change and the end total.',
  takeFromStartUnknown:
    'The STARTING amount is unknown and must NOT be stated. Begin with "Some ...". State the amount removed and the amount left.',
  compareBiggerMore:
    'Consistent-language compare: use the word "more", and the child ADDS. State the smaller quantity and the difference.',
  compareBiggerFewer:
    'LANGUAGE TRAP: use the word "fewer", even though the child must ADD. Never use "more". State the smaller quantity and the difference.',
  compareSmallerMore:
    'LANGUAGE TRAP: use the word "more", even though the child must SUBTRACT. Never use "fewer". State the larger quantity and the difference.',
  compareSmallerFewer:
    'Consistent-language compare: use the word "fewer", and the child SUBTRACTS. State the larger quantity and the difference.',
  compareProductUnknown:
    'Multiplicative compare: say "X times as much/many", never "more". State the smaller amount and the multiplier; ask for the larger.',
  compareSetSizeUnknown:
    'Multiplicative compare: say "X times as much/many". State the larger amount and the multiplier; ask for the smaller.',
  compareMultiplierUnknown:
    'Multiplicative compare: ask "how many times as much/many". State both amounts; ask for the multiplier.',
  arrayRowCountUnknown:
    'ARRAY structure — use ROWS, not groups or bunches. Say the items are "arranged in rows" with N in each row, and ask "how many ROWS". The word "rows" must appear.',
};

const TARGETS = Object.keys(RULES);

function structureMeta(id) {
  const s = ADDITIVE_BY_ID[id] || MULTIPLICATIVE_BY_ID[id];
  const modeId = s.op === "+" ? "addition" : s.op === "-" ? "subtraction" : s.op === "x" ? "multiplication" : "division";
  const gen = ADDITIVE_BY_ID[id] ? generateAdditiveItem : generateMultiplicativeItem;
  return { structure: s, modeId, gen };
}

/** A few correct reference items straight from the structure engine. */
function referenceItems(id, gen, count = 3) {
  const out = [];
  for (let i = 0; i < count * 4 && out.length < count; i += 1) {
    // Force the structure and a story rendering; levels 7-10 for the hard tier.
    const item = gen(8, { structureType: id });
    if (item.structureType === id && item.asStory) {
      out.push({ prompt: item.display.promptText, a: item.a, b: item.b, answer: item.answer });
    }
  }
  return out;
}

function buildPrompt(id, meta, refs, n) {
  return [
    "You are an expert K-5 math item author. Write word problems for a kids' math app (US, grades 2-4).",
    "",
    `Problem structure: ${id}`,
    `RULE: ${RULES[id]}`,
    "",
    "Correct reference items (right structure and math; write DIFFERENT prose):",
    ...refs.map((r) => `  "${r.prompt}"  (answer ${r.answer})`),
    "",
    `Write EXACTLY ${n} NEW items. Requirements:`,
    "- Follow the RULE above exactly — it is what makes this the intended structure.",
    "- 1-2 short sentences, concrete nouns, a named child, <= 220 characters.",
    "- Rotate names and contexts; every prompt must be unique.",
    "- Numbers within 100; the answer must be a positive whole number.",
    "- Do NOT state the answer in the prompt.",
    "",
    "Output ONLY a JSON array of objects, each:",
    '  {"promptText": string, "a": number, "b": number, "answer": number}',
    "where a and b are the two numbers stated in the prompt and answer is the solution.",
    "No prose, no markdown fences.",
  ].join("\n");
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const a = ["-p", "--output-format", "json"];
    if (model) a.push("--model", model);
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

function toItem(raw, id, meta, idx) {
  const s = meta.structure;
  const band = "4-5";
  return {
    itemId: `${meta.modeId}-app-${s.subskill}-${band.replace("-", "_")}-${id}-${String(idx + 1).padStart(3, "0")}`,
    modeId: meta.modeId,
    itemFamily: "application",
    subskill: s.subskill,
    structureType: id,
    levelRange: [7, 10],
    reviewStatus: "draft",
    representationType: "verbalContext",
    source: { generator: "authorStructures", model, provider: "claudeCode" },
    question: {
      a: raw.a,
      b: raw.b,
      op: s.op === "x" ? "×" : s.op === "/" ? "÷" : s.op,
      answer: raw.answer,
      display: { promptText: String(raw.promptText || "").trim() },
    },
  };
}

async function authorOne(id) {
  const meta = structureMeta(id);
  const refs = referenceItems(id, meta.gen);
  if (!refs.length) return { id, accepted: [], rejected: [], note: "no reference items" };

  const text = await runClaude(buildPrompt(id, meta, refs, perStructure));
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return { id, accepted: [], rejected: [], note: "no JSON array returned" };

  let raws;
  try {
    raws = JSON.parse(match[0]);
  } catch {
    return { id, accepted: [], rejected: [], note: "JSON parse failed" };
  }

  const accepted = [];
  const rejected = [];
  const seen = new Set();
  raws.forEach((raw, i) => {
    const item = toItem(raw, id, meta, accepted.length);
    const prompt = item.question.display.promptText;
    if (seen.has(prompt)) {
      rejected.push({ prompt, reasons: ["duplicate in batch"] });
      return;
    }
    seen.add(prompt);

    const struct = checkStructure(item);
    const qc = runChecks(item);
    const reasons = [
      ...(struct.ok ? [] : struct.problems.map((p) => `structure: ${p}`)),
      ...qc.findings.filter((f) => f.severity === "fail").map((f) => `${f.id}: ${f.message}`),
    ];
    if (reasons.length) rejected.push({ prompt, reasons });
    else accepted.push(item);
  });

  return { id, accepted, rejected };
}

async function main() {
  const targets = onlyStructure ? [onlyStructure] : TARGETS;
  const allAccepted = [];
  let totalRejected = 0;

  process.stdout.write(`\nAuthoring ${targets.length} structure(s) with model "${model}", ${perStructure} each\n\n`);

  for (const id of targets) {
    const { accepted, rejected, note } = await authorOne(id);
    allAccepted.push(...accepted);
    totalRejected += rejected.length;
    process.stdout.write(
      `${id.padEnd(26)} ${String(accepted.length).padStart(2)} ok  ${String(rejected.length).padStart(2)} rejected${note ? `  (${note})` : ""}\n`
    );
    for (const r of rejected.slice(0, 2)) {
      process.stdout.write(`    ✗ "${r.prompt}" — ${r.reasons[0]}\n`);
    }
    for (const a of accepted.slice(0, 2)) {
      process.stdout.write(`    ✓ "${a.question.display.promptText}" = ${a.question.answer}\n`);
    }
  }

  const passRate = allAccepted.length + totalRejected > 0
    ? Math.round((100 * allAccepted.length) / (allAccepted.length + totalRejected))
    : 0;
  process.stdout.write(`\n${allAccepted.length} accepted, ${totalRejected} rejected (${passRate}% pass)\n`);

  if (!write) {
    process.stdout.write(`\n(dry run — nothing written. Re-run with --write to save drafts.)\n\n`);
    return;
  }

  process.stdout.write(`\nWriting ${allAccepted.length} draft(s) to Supabase...\n`);
  const result = await writeDrafts(allAccepted);
  process.stdout.write(`Wrote ${result.wrote} draft row(s) in ${result.chunks} chunk(s).\n\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});
