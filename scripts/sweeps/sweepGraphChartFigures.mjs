/**
 * Sweep (figure contracts, dataGraphs): the chart-DESCRIBING classes that
 * shipped text-only — countJudgeTeen, keyIgnoredMid/Big, storySticker_*,
 * storyChartTotal_*, halfSymbolMid/Big — get a real Pictograph attached
 * (rows/keyValue built from the phantom display.data payload) and the chart
 * description reworded out of the prompt. Same itemIds, in place.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/sweeps/sweepGraphChartFigures.mjs           report
 *   ... --write                                                                                        update cloud
 */
import { createClient } from "@supabase/supabase-js";
import { FULL_ITEMS } from "../../src/itemBank/fullBank.js";
import { runChecks } from "../../src/itemBank/qc/checks.js";

const WRITE = process.argv.includes("--write");
const NAMES = ["Mina", "Sam", "Ava", "Theo", "Nia", "Luca", "Ben", "Ida", "Zoe", "Kai", "June", "Lily", "Omar", "Finn", "Rosa", "Nora", "Diego", "Priya", "Maya", "Leo", "Amara"];
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const sing = (w) => (w.endsWith("s") ? w.slice(0, -1) : w);
const agree = (n, w) => (Number(n) === 1 ? sing(w) : w);

const TARGET_TYPES = [
  "countJudgeTeen", "keyIgnoredMid", "keyIgnoredBig",
  "storySticker_band1", "storySticker_band2", "storySticker_band3",
  "storyChartTotal_band1", "storyChartTotal_band2", "storyChartTotal_band3",
  "halfSymbolMid", "halfSymbolBig",
];

const targets = FULL_ITEMS.filter(
  (b) => b.modeId === "dataGraphs" && TARGET_TYPES.includes(b.structureType) && !b.question.display.figure
);
const globalPrompts = new Set(
  FULL_ITEMS.filter((b) => !targets.includes(b)).map((b) => b.question?.display?.promptText).filter(Boolean)
);

const nameIn = (text) => NAMES.find((n) => text.includes(n));

const COUNT_JUDGE_STEMS = [
  (nm, noun, said) => `${nm} counts the ${noun} on this chart and says ${said}. Is ${nm} right?`,
  (nm, noun, said) => `Looking at this chart, ${nm} counts ${said} ${agree(said, noun)}. Is that right?`,
  (nm, noun, said) => `${nm} reads this chart and reports ${said} ${agree(said, noun)}. Is ${nm} right?`,
];
const KEY_IGNORED_STEMS = [
  (nm, noun, said) => `${nm} says this chart shows ${said} ${agree(said, noun)}. Is ${nm} right?`,
  (nm, noun, said) => `Reading this chart, ${nm} announces ${said} ${agree(said, noun)}. Is that right?`,
  (nm, noun, said) => `${nm} looks at this chart and claims there are ${said} ${agree(said, noun)}. Is ${nm} right?`,
];
const TOTAL_STEMS = [
  (nm) => `${nm}'s picture chart has two rows. How much do both rows show together?`,
  (nm) => `Here is ${nm}'s two-row picture chart. What total does the chart show?`,
  (nm) => `Both rows of ${nm}'s picture chart count toward one total. How much is it?`,
  (nm) => `Read ${nm}'s picture chart. How much do the two rows show in all?`,
];
const HALF_STEMS = [
  (nm, claim) => `A row on this chart ends in half a picture. ${nm} says the half counts as ${claim}. Is ${nm} right?`,
  (nm, claim) => `${nm} sees the half picture at the end of this chart's row and counts it as ${claim}. Is that right?`,
  (nm, claim) => `On this chart one row ends with half a picture. ${nm} counts the half as ${claim}. Do you agree?`,
];

const NOUNS = ["stickers", "stars", "apples", "books", "shells", "leaves", "coins", "cards"];

function rewrite(b, idx) {
  const d = b.question.display;
  const data = d.data || {};
  const old = d.promptText;
  const st = b.structureType;
  const nm = nameIn(old) || NAMES[idx % NAMES.length];
  let rows, keyValue, promptText;

  if (st === "countJudgeTeen") {
    const noun = (old.match(/pictures (?:of|for) ([\w ]+?)(?:,|\.| and )/) || old.match(/tallies the ([\w ]+?) pictures/) || [])[1];
    const said = data.said;
    if (!noun || !Number.isFinite(said) || !Number.isFinite(data.sym)) throw new Error(`${b.itemId}: parse "${old}"`);
    rows = [{ label: cap(noun), symbols: data.sym }];
    keyValue = data.key ?? 1;
    promptText = COUNT_JUDGE_STEMS[idx % COUNT_JUDGE_STEMS.length](nm, noun, said);
  } else if (st.startsWith("keyIgnored")) {
    const m =
      old.match(/counts (\d+) pictures for ([\w ]+?) and says there are (\d+)/) ||
      (old.match(/reads (\d+) pictures as (\d+) ([\w ]+?)\./) && (([, a, c, n]) => [null, a, n, c])(old.match(/reads (\d+) pictures as (\d+) ([\w ]+?)\./)));
    if (!m) throw new Error(`${b.itemId}: parse "${old}"`);
    const [, sym, noun, said] = m;
    rows = [{ label: cap(noun), symbols: Number(sym) }];
    keyValue = data.key;
    promptText = KEY_IGNORED_STEMS[idx % KEY_IGNORED_STEMS.length](nm, noun, said);
  } else if (st.startsWith("storySticker")) {
    // keep the sentence that gives the key its real-world meaning; the chart
    // state moves into the figure.
    const m =
      old.match(/(\w+) picture on .*? means (\d+) ([a-z]+)/) ||
      old.match(/one (\w+) picture for every (\d+) ([a-z]+)/) ||
      old.match(/(\d+) points? per (\w+) picture/);
    const sym = data.sym;
    if (!Number.isFinite(sym) || !Number.isFinite(data.key)) throw new Error(`${b.itemId}: no data "${old}"`);
    let noun, unit;
    if (m && m[0].includes("per")) { noun = m[2]; unit = "points"; }
    else if (m) { noun = m[1]; unit = m[3]; }
    else throw new Error(`${b.itemId}: parse "${old}"`);
    rows = [{ label: cap(noun) + "s", symbols: sym }];
    keyValue = data.key;
    const unitPl = unit.endsWith("s") ? unit : `${unit}s`;
    promptText = `Each ${noun} picture on ${nm}'s chart means ${data.key} ${agree(data.key, unitPl)}. How many ${unitPl} does this chart show?`;
  } else if (st.startsWith("storyChartTotal")) {
    if (!Number.isFinite(data.s1) || !Number.isFinite(data.s2)) throw new Error(`${b.itemId}: no data "${old}"`);
    const noun = NOUNS[idx % NOUNS.length];
    rows = [
      { label: cap(noun.slice(0, -1)) + " A", symbols: data.s1 },
      { label: cap(noun.slice(0, -1)) + " B", symbols: data.s2 },
    ];
    keyValue = data.key;
    promptText = TOTAL_STEMS[idx % TOTAL_STEMS.length](nm);
  } else {
    // halfSymbol*
    const claim = (old.match(/half counts as (\d+)/) || old.match(/as (\d+) when the key/) || old.match(/counts? (?:it|the half)? ?as (\d+)/) || [])[1];
    if (!claim || !Number.isFinite(data.key)) throw new Error(`${b.itemId}: parse "${old}"`);
    const noun = NOUNS[idx % NOUNS.length];
    rows = [{ label: cap(noun), symbols: 2, half: true }];
    keyValue = data.key;
    promptText = HALF_STEMS[idx % HALF_STEMS.length](nm, claim);
  }

  return {
    ...b,
    question: {
      ...b.question,
      display: { ...d, figure: "pictograph", rows, keyValue, promptText },
    },
  };
}

const out = [];
const failures = [];
for (const [i, b] of targets.entries()) {
  let nb = null;
  try {
    for (let off = 0; off < 90; off += 1) {
      const cand = rewrite(b, i + off * 7);
      if (!globalPrompts.has(cand.question.display.promptText)) { nb = cand; break; }
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
      figure: "pictograph",
      rows: nb.question.display.rows,
      keyValue: nb.question.display.keyValue,
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
