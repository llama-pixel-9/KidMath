/**
 * Sweep (QC residue, 2026-08-24): the 39 live items whose genuine wording
 * defects became visible when the phantom-display-key loophole closed
 * (PR #79). Prompt-only rewrites, same itemIds, answers untouched:
 *   - money: prices restated as coin words ("a dime and 4 cents") so the
 *     pennies answer is computed, not copied
 *   - angles: the whole is stated ("A full turn is 4 quarter turns")
 *   - linesShapes: criterion numbers in word form ("exactly four sides")
 *   - dataGraphs pictoSymbolsTeen n=1: fully word-form
 *   - placeValue: drop the described "puzzle card"
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/sweeps/sweepWordingResidue.mjs [--write]
 */
import { createClient } from "@supabase/supabase-js";
import { FULL_ITEMS } from "../../src/itemBank/fullBank.js";
import { runChecks } from "../../src/itemBank/qc/checks.js";

const WRITE = process.argv.includes("--write");

const coinWords = (c) => {
  const parts = [];
  let rest = c;
  const dimes = Math.floor(rest / 10);
  rest -= dimes * 10;
  const nickels = Math.floor(rest / 5);
  rest -= nickels * 5;
  if (dimes) parts.push(dimes === 1 ? "a dime" : dimes === 2 ? "two dimes" : `${dimes} dimes`);
  if (nickels) parts.push("a nickel");
  if (rest) parts.push(rest === 1 ? "1 cent" : `${rest} cents`);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts[0]}, ${parts[1]} and ${parts[2]}`;
};
const WORD_NUMS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function rewrite(b) {
  const d = b.question.display;
  const old = d.promptText;
  const st = b.structureType;

  if (st === "storyNeedCoins_band1") {
    const cents = d.money.fromCents;
    const nm = old.match(/^(\w+) pays/) ? old.match(/^(\w+) pays/)[1] : old.match(/does (\w+) drop/)[1];
    return old.includes("sticker")
      ? `The sticker machine only takes pennies. A sticker costs ${coinWords(cents)}. How many pennies does ${nm} drop in?`
      : `${nm} pays a fare worth ${coinWords(cents)} using only pennies. How many pennies is that?`;
  }
  if (st === "storyMachine_band1") {
    return "The coin machine takes 20 cents from Lily and gives back only dimes. How many dimes slide out?";
  }
  if (st === "storyFewest_band1") {
    const cents = d.money.cents;
    const w = WORD_NUMS[cents];
    const nm = old.match(/(\w+) (?:wants|hand)/)[1];
    return old.includes("fare")
      ? `To pay a ${w}-cent fare with the fewest coins, how many coins does ${nm} hand over?`
      : `${nm} wants to pay ${w} cents exactly, carrying as few coins as possible. How many coins is that?`;
  }
  if (st === "quartersLeft_band1" || st === "missingQuarters_band1") {
    return `A full turn is 4 quarter turns. ${old}`;
  }
  if (st === "missingCornerLine_band1") {
    return old.replace("Two square corners", "2 square corners");
  }
  if (st === "pictoSymbolsTeen") {
    return "Each picture means one. How many pictures show one thing?";
  }
  if (st === "buildFromUnits") {
    const m = old.match(/(\d+) tens and (\d+) ones/);
    return `${m[1]} tens and ${m[2]} ones make what number?`;
  }
  if (b.modeId === "linesShapes") {
    // criterion digit -> word form ("4 sides" -> "four sides", "2 pairs" -> "two pairs", "1 pair" -> "one pair")
    return old
      .replace(/\b4 sides\b/g, "four sides")
      .replace(/\b2 pairs\b/g, "two pairs")
      .replace(/\b1 pair\b/g, "one pair");
  }
  throw new Error(`no rewriter for ${b.itemId} (${st})`);
}

const targets = [];
for (const b of FULL_ITEMS) {
  const f = runChecks(b).findings.filter((x) => x.severity === "fail");
  if (f.length) targets.push(b);
}
console.log("flagged items:", targets.length);

const globalPrompts = new Set(
  FULL_ITEMS.filter((b) => !targets.includes(b)).map((b) => b.question?.display?.promptText).filter(Boolean)
);
const out = [];
const failures = [];
for (const b of targets) {
  try {
    const promptText = rewrite(b);
    if (globalPrompts.has(promptText)) throw new Error(`duplicate prompt: ${b.itemId} :: "${promptText}"`);
    globalPrompts.add(promptText);
    const nb = { ...b, question: { ...b.question, display: { ...b.question.display, promptText } } };
    const qc = runChecks(nb);
    const fails = qc.findings.filter((x) => x.severity === "fail");
    if (fails.length) throw new Error(`${b.itemId}: still fails ${fails.map((x) => x.id).join(",")} :: "${promptText}"`);
    out.push(nb);
  } catch (e) {
    failures.push(String(e.message));
  }
}
console.log(`rewrites gate-clean: ${out.length} · failures: ${failures.length}`);
for (const f of failures.slice(0, 8)) console.log("  ✗", f);
for (const nb of out.slice(0, 8)) console.log(`  ${nb.itemId} → "${nb.question.display.promptText}"`);
if (failures.length) process.exit(1);

if (WRITE) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let n = 0;
  const missing = [];
  for (const nb of out) {
    const { data: rows, error: readErr } = await sb.from("item_bank").select("item_id,payload").eq("item_id", nb.itemId);
    if (readErr) throw readErr;
    if (rows.length !== 1) { missing.push(`${nb.itemId} (${rows.length} rows)`); continue; }
    const payload = rows[0].payload;
    payload.display = { ...payload.display, promptText: nb.question.display.promptText };
    const { error } = await sb.from("item_bank").update({ payload }).eq("item_id", nb.itemId);
    if (error) throw error;
    n += 1;
  }
  console.log(`cloud rows updated: ${n}`);
  if (missing.length) console.log("NOT in cloud (bundle-only legacy — fix at source):", missing);
} else {
  console.log("(report only — pass --write to update the cloud)");
}
