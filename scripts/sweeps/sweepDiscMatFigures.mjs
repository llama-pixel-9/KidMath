/**
 * Sweep (figure contracts, placeValueDiscs): the mat-DESCRIBING bank classes
 * — whichNumberMat(+Big/Th), readJudge(+Big), zeroColumnJudge,
 * compareMats(+Big) — get a real DiscMat figure (cols parsed from the prose)
 * and the layout description reworded out of the prompt. Same itemIds.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/sweeps/sweepDiscMatFigures.mjs [--write]
 */
import { createClient } from "@supabase/supabase-js";
import { FULL_ITEMS } from "../../src/itemBank/fullBank.js";
import { runChecks } from "../../src/itemBank/qc/checks.js";

const WRITE = process.argv.includes("--write");
const NAMES = ["Mina", "Sam", "Ava", "Theo", "Nia", "Luca", "Ben", "Ida", "Zoe", "Kai", "June", "Lily", "Omar", "Finn", "Rosa", "Nora", "Diego", "Priya", "Maya", "Leo", "Amara"];
const PLACE = { one: 1, ten: 10, "one hundred": 100, "one thousand": 1000 };

const TARGET_TYPES = ["whichNumberMat", "whichNumberMatBig", "whichNumberMatTh", "readJudge", "readJudgeBig", "zeroColumnJudge", "compareMats", "compareMatsBig"];

/** "2 discs of one thousand, 4 discs of one hundred, 7 discs of ten, and 3 discs of one" -> cols */
function parseCols(text) {
  const cols = [];
  for (const m of text.matchAll(/(\d+) discs? of (one thousand|one hundred|ten|one)\b/g)) {
    cols.push({ place: PLACE[m[2]], count: Number(m[1]) });
  }
  for (const m of text.matchAll(/(\d+) discs? worth (one thousand|one hundred|ten|one)(?: each)?\b/g)) {
    cols.push({ place: PLACE[m[2]], count: Number(m[1]) });
  }
  if (/no tens discs/.test(text)) cols.push({ place: 10, count: 0 });
  cols.sort((a, b) => b.place - a.place);
  return cols;
}

const nameIn = (text) => NAMES.find((n) => text.includes(n));

const WHICH_STEMS = [
  (nm) => `${nm} puts these discs on the mat. Which number is that?`,
  (nm) => `Read the discs on ${nm}'s mat. Which number do they make?`,
  (nm) => `${nm} builds a number with the discs on this mat. Which number is it?`,
  (nm) => `Here is ${nm}'s disc mat. Which number does it show?`,
];
const JUDGE_STEMS = [
  (nm, said) => `${nm} reads this mat and says it shows ${said}. Is ${nm} right?`,
  (nm, said) => `Looking at this mat, ${nm} writes ${said}. Is that right?`,
  (nm, said) => `${nm} calls the number on this mat ${said}. Do you agree?`,
];
const COMPARE_STEMS = [
  (nm) => `${nm} compares two mats. Which mat shows the bigger number?`,
  (nm) => `Read both of ${nm}'s mats. Which one makes the bigger number?`,
  (nm) => `${nm} lays out two mats. Which mat shows more?`,
];

function rewrite(b, idx) {
  const d = b.question.display;
  const old = d.promptText;
  const st = b.structureType;
  const nm = nameIn(old) || NAMES[idx % NAMES.length];

  if (st.startsWith("whichNumberMat")) {
    const cols = parseCols(old);
    if (!cols.length) throw new Error(`${b.itemId}: no cols in "${old}"`);
    return { discMat: { cols }, promptText: WHICH_STEMS[idx % WHICH_STEMS.length](nm) };
  }
  if (st.startsWith("readJudge") || st === "zeroColumnJudge") {
    const cols = parseCols(old);
    if (!cols.length) throw new Error(`${b.itemId}: no cols in "${old}"`);
    const said = (old.match(/(?:shows|writes|says[^0-9]*|as) (\d+)/) || old.match(/(\d+)\s*[.?]\s*Is/) || [])[1];
    if (!said) throw new Error(`${b.itemId}: no said number in "${old}"`);
    return { discMat: { cols }, promptText: JUDGE_STEMS[idx % JUDGE_STEMS.length](nm, said) };
  }
  // compareMats*
  const half = old.split(/Mat B|,? ?B (?=holds|shows)/);
  if (half.length !== 2) throw new Error(`${b.itemId}: no Mat B in "${old}"`);
  const colsA = parseCols(half[0]);
  const colsB = parseCols(half[1]);
  if (!colsA.length || !colsB.length) throw new Error(`${b.itemId}: mats unparsed in "${old}"`);
  return {
    discMat: { mats: [{ label: "Mat A", cols: colsA }, { label: "Mat B", cols: colsB }] },
    promptText: COMPARE_STEMS[idx % COMPARE_STEMS.length](nm),
  };
}

const targets = FULL_ITEMS.filter(
  (b) => b.modeId === "placeValueDiscs" && TARGET_TYPES.includes(b.structureType) && !b.question.display.figure
);
const globalPrompts = new Set(
  FULL_ITEMS.filter((b) => !targets.includes(b)).map((b) => b.question?.display?.promptText).filter(Boolean)
);

const out = [];
const failures = [];
for (const [i, b] of targets.entries()) {
  try {
    let nb = null;
    for (let off = 0; off < 90; off += 1) {
      const r = rewrite(b, i + off * 7);
      if (!globalPrompts.has(r.promptText)) {
        nb = { ...b, question: { ...b.question, display: { ...b.question.display, figure: "discMat", ...r } } };
        break;
      }
    }
    if (!nb) throw new Error(`no fresh prompt for ${b.itemId}`);
    globalPrompts.add(nb.question.display.promptText);
    const qc = runChecks(nb);
    const fails = qc.findings.filter((f) => f.severity === "fail");
    if (fails.length) throw new Error(`${nb.itemId}: ${fails.map((f) => f.id).join(",")} :: "${nb.question.display.promptText}"`);
    out.push(nb);
  } catch (e) {
    failures.push(String(e.message));
  }
}
console.log(`targets: ${targets.length} · rewrites gate-clean: ${out.length} · failures: ${failures.length}`);
for (const f of failures.slice(0, 8)) console.log("  ✗", f);
for (const nb of out.slice(0, 6)) console.log(`  ${nb.itemId} → "${nb.question.display.promptText}"`);
if (failures.length) process.exit(1);

if (WRITE) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let n = 0;
  for (const nb of out) {
    const { data: rows, error: readErr } = await sb.from("item_bank").select("item_id,payload").eq("item_id", nb.itemId);
    if (readErr) throw readErr;
    if (rows.length !== 1) throw new Error(`${nb.itemId}: ${rows.length} cloud rows`);
    const payload = rows[0].payload;
    payload.display = {
      ...payload.display,
      figure: "discMat",
      discMat: nb.question.display.discMat,
      promptText: nb.question.display.promptText,
    };
    const { error } = await sb.from("item_bank").update({ payload }).eq("item_id", nb.itemId);
    if (error) throw error;
    n += 1;
  }
  console.log(`cloud rows updated: ${n} (now run: npm run bank:export)`);
} else {
  console.log("(report only — pass --write to update the cloud)");
}
