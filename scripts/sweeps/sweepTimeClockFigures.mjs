/**
 * Sweep (figure contracts): the time-bank rows whose class the contract marks
 * needs-face but that ship text-only — judgeFiveRead, judgeMinuteRead,
 * handSwapJudge — get the clockFace figure attached and the described time
 * reworded out of the prompt (PR #78 pattern: same itemIds, in place).
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/sweeps/sweepTimeClockFigures.mjs          report
 *   ... --write                                                                                      update cloud
 *
 * Report mode also prints the full disposition table (every figure-less time
 * class × contract verdict) so the contract's verbal list can be reviewed.
 */
import { createClient } from "@supabase/supabase-js";
import { FULL_ITEMS } from "../../src/itemBank/fullBank.js";
import { runChecks } from "../../src/itemBank/qc/checks.js";
import { contractVerdict } from "../../src/itemBank/figureContracts.js";

const WRITE = process.argv.includes("--write");
const HOUR_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const NAMES = ["Mina", "Sam", "Ava", "Theo", "Nia", "Luca", "Ben", "Ida", "Zoe", "Kai", "June", "Lily", "Omar", "Finn", "Rosa", "Nora", "Diego", "Priya", "Maya", "Leo", "Amara"];
const pad = (n) => String(n).padStart(2, "0");

const time = FULL_ITEMS.filter((b) => b.modeId === "time");

// ---------- disposition table (report) ----------
const table = {};
for (const b of time) {
  const v = contractVerdict("time", b.question, b);
  const k = `${b.structureType} :: ${v.ok ? "ok" : v.reason}`;
  (table[k] = table[k] || { n: 0, sample: b.question.display?.promptText }).n += 1;
}
const broken = Object.entries(table).filter(([k]) => !k.endsWith(":: ok"));
console.log("contract verdicts over the time bank (non-ok classes):");
for (const [k, { n, sample }] of broken) console.log(`  ${k}  n=${n}\n     "${sample?.slice(0, 100)}"`);

// ---------- rewrites ----------
const targets = time.filter((b) => ["judgeFiveRead", "judgeMinuteRead", "handSwapJudge"].includes(b.structureType));
const globalPrompts = new Set(
  FULL_ITEMS.filter((b) => !targets.includes(b)).map((b) => b.question?.display?.promptText).filter(Boolean)
);

const JUDGE_STEMS = [
  (nm, said) => `${nm} reads this clock as ${said}. Is ${nm} right?`,
  (nm, said) => `${nm} looks at this clock and writes ${said}. Is that right?`,
  (nm, said) => `${nm} calls the time on this clock ${said}. Do you agree?`,
];
const SWAP_STEMS = [
  (nm, said) => `${nm} reads the LONG hand of this clock as the hour and announces ${said}. Is ${nm} right?`,
  (nm, said) => `${nm} mixes up the hands on this clock and reads it as ${said}. Is that right?`,
  (nm, said) => `Reading this clock, ${nm} treats the long hand as the hour hand and says ${said}. Is ${nm} right?`,
];

function saidTimeOf(b) {
  const t = b.question.display.time || {};
  const old = b.question.display.promptText;
  if (b.structureType === "handSwapJudge") {
    const m = old.match(/(?:announces|reads it as|as)\s+([a-z]+ o'clock)/i);
    if (!m) throw new Error(`${b.itemId}: no said o'clock in "${old}"`);
    return m[1];
  }
  if (Number.isFinite(t.saidHour)) return `${t.saidHour}:${pad(t.saidMinute ?? 0)}`;
  // fall back to the LAST digital time mentioned (the claim)
  const times = [...old.matchAll(/\b(\d{1,2}):(\d{2})\b/g)];
  if (!times.length) throw new Error(`${b.itemId}: no said time in "${old}"`);
  const m = times[times.length - 1];
  return `${m[1]}:${m[2]}`;
}

function rewrite(b, idx) {
  const t = b.question.display.time || {};
  if (!Number.isFinite(t.hour)) throw new Error(`${b.itemId}: no display.time.hour`);
  const said = saidTimeOf(b);
  const stems = b.structureType === "handSwapJudge" ? SWAP_STEMS : JUDGE_STEMS;
  const nm = NAMES.find((a) => b.question.display.promptText.includes(a)) || NAMES[idx % NAMES.length];
  const promptText = stems[idx % stems.length](nm, said);
  return {
    ...b,
    question: {
      ...b.question,
      display: {
        ...b.question.display,
        figure: "clockFace",
        clock: { hour: t.hour, minute: t.minute ?? 0 },
        promptText,
      },
    },
  };
}

const out = [];
for (const [i, b] of targets.entries()) {
  let nb = null;
  for (let off = 0; off < 80; off += 1) {
    const cand = rewrite(b, i + off * 7);
    if (!globalPrompts.has(cand.question.display.promptText)) { nb = cand; break; }
  }
  if (!nb) throw new Error(`no fresh prompt for ${b.itemId}`);
  globalPrompts.add(nb.question.display.promptText);
  const qc = runChecks(nb);
  const fails = qc.findings.filter((f) => f.severity === "fail");
  if (fails.length) throw new Error(`${nb.itemId}: ${fails.map((f) => f.id).join(",")} :: "${nb.question.display.promptText}"`);
  out.push(nb);
}
console.log(`\nrewrites gate-clean: ${out.length}`);
for (const nb of out.slice(0, 6)) console.log(`  ${nb.itemId} → "${nb.question.display.promptText}"`);

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
      figure: "clockFace",
      clock: nb.question.display.clock,
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
