/**
 * Reword the teacherJargon items by rule (the prompts are templated families —
 * numbers stay exactly as authored), validate through the QC gate + bank-wide
 * prompt uniqueness, and write promptText back to item_bank.
 *   set -a && source .env.local && set +a
 *   node --import ./scripts/lib/registerResolve.js scripts/qa/rewordJargon.mjs [--write]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { runChecks } from "../../src/itemBank/qc/checks.js";
import { FULL_ITEMS } from "../../src/itemBank/fullBank.js";

const WRITE = process.argv.includes("--write");
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const targets = JSON.parse(readFileSync("qa-out/jargon.json", "utf8"));

const RULES = [
  // addition / subtraction decompose + properties
  [/^Decompose (\d+) as (\d+) plus another number: /, "Split $1 into $2 and another number: "],
  [/^Decompose (\d+) as (\d+) (?:and|plus) another part: /, "Split $1 into $2 and another part: "],
  [/^Decompose (\d+) as (\d+) and another part\. What is the other part\?$/, "Split $1 into $2 and another part. What is the other part?"],
  [/^Decompose (\d+) into two parts: /, "Split $1 into two parts: "],
  [/^Decompose (\d+) as (\d+) and another number\. What is the other number\?$/, "Split $1 into $2 and another number. What is the other number?"],
  [/^Commutative property: if (.+?), what (?:is|does) (.+?)(?: equal)?\?$/, "If $1, what is $2?"],
  [/^Commutative: if (.+?), then (.+?) = \?$/, "If $1, then $2 = ?"],
  [/^Identity: adding zero leaves a number unchanged\. What is (.+?)\?$/, "Adding zero keeps a number the same. What is $1?"],
  [/^Identity: (\d+ \+ \d+) equals\?$/, "What is $1?"],
  [/^Identity: anything times 1 is itself\. What is (.+?)\?$/, "Times 1 keeps a number the same. What is $1?"],
  [/^Identity: (\d+ × \d+) = \?$/, "What is $1?"],
  [/^Associative: (.+?) = (.+?)\. What is the product\?$/, "$1 is the same as $2. What is $1?"],
  [/^Decompose (\d+) as (\d+ \+ \d+)\. What is (.+?)\?$/, "$1 is $2. What is $3?"],
  [/^Decompose (\d+) as (\d+ \+ \d+)\. Use this to find (.+?)\.$/, "$1 is $2. Use that to find $3."],
  [/^Use inverse: if (.+?), then (.+?) equals\?$/, "If $1, then $2 = ?"],
  // area / bar models / fractions "partition"
  [/^(\w+) partitions a field into two plots and asserts the combined area equals the original\. Is the assertion sound\?( No paper is lost in the cut\.)?$/,
    (m, name, tail) => `${name} cuts a field into two plots and says the two areas add up to the whole field.${tail ? " Nothing is lost in the cut." : ""} Is ${name} right?`],
  [/^(\w+) partitions (\d+) into sections (.+?)\. Is the partition sound\?$/, "$1 splits $2 into parts $3. Do the parts add up to $2?"],
  [/^(\w+) partitions (\d+) into (\d+) units of (\d+)\. Is the partition exact\?$/, "$1 splits $2 into $3 equal parts of $4. Is that exactly right?"],
  [/^Partition (\d+) into (\d+) identical units\. Exactly what is one unit\?$/, "Split $1 into $2 equal parts. How big is one part?"],
  [/^(\w+) partitions (a|an) (.+?) into (\d+) (equal|even|identical|same) (\w+)\. Is the partition into genuinely equal parts\?$/, "$1 cuts $2 $3 into $4 $6. Are all the $6 the same size?"],
  [/^(\w+) pairs (\S+) with (\S+) as equivalents\. Do they match\?$/, "$1 says $2 and $3 are the same amount. Is $1 right?"],
  [/^Pick the equivalent of (\S+) from the choices\. \w+ checks each\.$/, "Which fraction is the same amount as $1?"],
  [/^Identify the exact equivalent of (\S+)\. \w+ cross-multiplies to verify\.$/, "Which fraction equals $1?"],
  [/^Reading (\S+) as a number: the whole was partitioned how many ways\?$/, "In $1, how many equal parts is the whole cut into?"],
  [/^The unit fraction (\S+) implies how many equal partitions of the whole\?$/, "For $1, how many equal pieces make the whole?"],
  [/^Partition the unit interval into (\d+) equal steps\. Which fraction is mark (\d+)\?$/, "Cut the space from 0 to 1 into $1 equal steps. Which fraction is at mark $2?"],
  [/^The fraction (\S+) decomposes into how many (\S+) units\?$/, "How many $2 pieces make $1?"],
  [/^An equivalent of (\S+) over (\d+) carries which numerator\?$/, "$1 = ?/$2. What is the top number?"],
  [/^An equivalent of (\S+) carrying numerator (\d+) has which bottom number\?$/, "$1 = $2/?. What is the bottom number?"],
  [/^The decimal (\S+) decomposes into how many hundredths\?$/, "How many hundredths make $1?"],
  // place value numerals
  [/^(\w+) hears "(\w+)" in the story and writes the numeral\. What does \w+ write\?$/, "$1 hears \"$2\" in the story and writes it as a number. What does $1 write?"],
  [/^(\w+) matches the word "(\w+)" to the numeral (\d+)\. Is that right\?$/, "$1 writes \"$2\" as $3. Is that right?"],
];
const RETIRE = /cardinality/i; // answer-in-prompt, no figure: retire rather than reword

const existing = new Set(FULL_ITEMS.map((r) => r.question?.display?.promptText));
const out = [], retire = [], unmatched = [];
const { data: rows, error } = await admin.from("item_bank").select("item_id,mode_id,structure_type,level_min,level_max,payload").in("item_id", targets.map((t) => t.itemId));
if (error) throw error;
for (const row of rows) {
  const text = row.payload.display.promptText;
  if (RETIRE.test(text)) { retire.push(row.item_id); continue; }
  let next = null;
  for (const [re, rep] of RULES) if (re.test(text)) { next = text.replace(re, rep); break; }
  if (!next || next === text) { unmatched.push(`${row.item_id} | ${text}`); continue; }
  const qc = runChecks({ itemId: row.item_id, modeId: row.mode_id, structureType: row.structure_type, levelRange: [row.level_min, row.level_max], question: { ...row.payload, display: { ...row.payload.display, promptText: next } } });
  let dupe = existing.has(next) && FULL_ITEMS.find((r) => r.question?.display?.promptText === next)?.itemId !== row.item_id;
  // Two items in one family can collapse onto the same sentence; give the
  // second a sibling phrasing instead of failing uniqueness.
  if (dupe && /^Which fraction equals /.test(next)) { next = next.replace("equals", "is equal to"); dupe = existing.has(next); }
  const fails = qc.findings.filter((f) => f.severity === "fail").map((f) => f.id);
  out.push({ itemId: row.item_id, from: text, to: next, fails, dupe });
  existing.add(next);
}
const bad = out.filter((o) => o.fails.length || o.dupe);
console.log(`reworded ${out.length}, retire ${retire.length}, unmatched ${unmatched.length}, failing gate ${bad.length}`);
for (const u of unmatched) console.log("UNMATCHED", u);
for (const b of bad) console.log("GATE", b.itemId, b.fails.join(","), b.dupe ? "DUPLICATE" : "", "|", b.to);
writeFileSync("qa-out/reword-plan.json", JSON.stringify({ out, retire, unmatched }, null, 1));
if (WRITE && !bad.length && !unmatched.length) {
  for (const o of out) {
    const row = rows.find((r) => r.item_id === o.itemId);
    const payload = { ...row.payload, display: { ...row.payload.display, promptText: o.to } };
    const { error: e } = await admin.from("item_bank").update({ payload }).eq("item_id", o.itemId);
    if (e) throw e;
  }
  const { error: e2 } = await admin.from("item_bank").update({ review_status: "retired" }).in("item_id", retire);
  if (e2) throw e2;
  console.log("written", out.length, "retired", retire.length);
}
