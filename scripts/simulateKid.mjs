/**
 * Simulated-kid QA harness: plays the real adaptive engine headlessly as a
 * persona (typical / strong / struggling kid) and reports on everything below
 * the DOM — item validity, renderability preconditions, level pacing, variety,
 * and the star economy. UI/layout bugs are out of scope (play in a browser).
 *
 * Run: node --import ./scripts/lib/registerResolve.js scripts/simulateKid.mjs
 * Flags:
 *   --personas typical,strong,struggling   which pacing personas to run
 *   --modes addition,fractions             restrict modes (default: all)
 *   --maxSessions 60                       pacing cap per mode
 *   --economyDays 60                       calendar-sim length
 *   --out path.json                        detailed JSON report destination
 *   --words 1                              play with word problems ON (the app
 *                                          default is OFF; both must be bank-served)
 *   --bank cloud                           play against the LIVE Supabase bank
 *                                          (what signed-in kids get) instead of
 *                                          the bundle; needs .env.local sourced
 *   --auditBank 1                          exhaustively validate every bank item
 *                                          at min/mid/max level + diff cloud
 *                                          answers against the bundle (drift)
 */

import { writeFileSync } from "node:fs";

import {
  MODES,
  SESSION_SIZE,
  MAX_LEVEL,
  createAdaptiveSession,
  getNextQuestion,
  recordAnswer,
  isSessionComplete,
  checkAnswer,
  generateChoices,
  questionAnswerType,
  summarizeFlight,
  getBankFallbackStats,
  resetBankFallbackStats,
} from "../src/mathEngine.js";
// The registries import .jsx components, which plain Node can't load — parse
// their keys from source text instead. Drift-safe: any key added to the
// registry object is picked up automatically.
import { readFileSync } from "node:fs";
function registryKeys(path, objectName) {
  const src = readFileSync(new URL(path, import.meta.url), "utf8");
  const body = src.split(`export const ${objectName} = {`)[1];
  return [...body.matchAll(/^  (\w+): \{/gm)].map((m) => m[1]);
}
const ANSWER_TYPES = registryKeys("../src/components/widgetRegistry.js", "WIDGETS");
const FIGURE_KEYS = registryKeys("../src/components/figureRegistry.js", "FIGURES");
import { DAILY_GOAL, EGG_WARMTH_TARGET } from "../src/engagement/engagementStore.js";
import { SPECIES } from "../src/engagement/roster.js";
import { getBankItems, setBankItems, buildQuestionFromBankItem } from "../src/itemBank/index.js";
import { normalizeBankRow } from "../src/itemBank/normalize.js";

// --- CLI ---------------------------------------------------------------------

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) =>
    a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "1"] : []
  ).filter((p) => p.length)
);
const MODE_LIST = args.modes ? args.modes.split(",") : MODES;
const MAX_SESSIONS = Number(args.maxSessions || 60);
const ECONOMY_DAYS = Number(args.economyDays || 60);
const PERSONA_KEYS = (args.personas || "typical,strong,struggling").split(",");

// --- Personas ----------------------------------------------------------------
// p(correct) = clamp(base + growth·exposures − levelPenalty·(level−1)); retries
// get a familiarity bonus. Response times gate the fast-promotion path
// (avg < 8500ms), so the struggling kid's slow answers matter.

const PERSONAS = {
  typical: { base: 0.62, growth: 0.02, cap: 0.95, retryBonus: 0.15, levelPenalty: 0.015, msMean: 6500, maxSessions: MAX_SESSIONS },
  strong: { base: 0.85, growth: 0.02, cap: 0.98, retryBonus: 0.1, levelPenalty: 0.01, msMean: 4000, maxSessions: MAX_SESSIONS },
  struggling: { base: 0.45, growth: 0.015, cap: 0.85, retryBonus: 0.15, levelPenalty: 0.02, msMean: 11000, maxSessions: Math.min(30, MAX_SESSIONS) },
};

// --- Findings collector ------------------------------------------------------

const findings = new Map(); // key -> { severity, category, mode, count, example }

function report(severity, category, mode, detail, example) {
  const key = `${category}|${mode}|${detail}`;
  const hit = findings.get(key);
  if (hit) { hit.count += 1; return; }
  findings.set(key, { severity, category, mode, detail, count: 1, example });
}

function questionRef(q) {
  return {
    itemId: q.metadata?.itemId ?? null,
    source: q.metadata?.itemSource ?? "generated",
    subskill: q.metadata?.subskill ?? null,
    family: q.metadata?.itemFamily ?? null,
    answerType: questionAnswerType(q),
    prompt: String(q.display?.promptText ?? q.prompt ?? "").slice(0, 140),
    answer: q.answer,
  };
}

// --- Per-question validity checks -------------------------------------------

const BAD_TEXT = [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /\bnull\b/];

function validateQuestion(q, mode, level) {
  const ref = () => ({ level, ...questionRef(q) });

  // 1. The declared answer must pass the engine's own scoring authority.
  if (!checkAnswer(q, correctSubmission(q))) {
    report("CRITICAL", "answer-self-check-failed", mode,
      `${q.metadata?.itemId || questionRef(q).prompt.slice(0, 60)}`, ref());
  }

  // 2. Choice hygiene (only "choice"-type questions carry generated choices).
  if (Array.isArray(q.choices)) {
    const strs = q.choices.map((c) => String(c));
    if (new Set(strs).size !== strs.length)
      report("HIGH", "duplicate-choices", mode, strs.join("|"), ref());
    if (questionAnswerType(q) === "choice" && !q.choices.includes(q.answer))
      report("CRITICAL", "answer-missing-from-choices", mode, strs.join("|"), ref());
    if (q.choices.some((c) => c === undefined || c === null || (typeof c === "number" && !Number.isFinite(c))))
      report("HIGH", "invalid-choice-value", mode, strs.join("|"), ref());
  }

  // 3. Prompt text sanity.
  const prompt = String(q.display?.promptText ?? q.prompt ?? "");
  if (!prompt.trim()) report("HIGH", "empty-prompt", mode, q.metadata?.itemId || "generated", ref());
  for (const rx of BAD_TEXT) {
    if (rx.test(prompt)) report("HIGH", "prompt-text-leak", mode, `${rx} in "${prompt.slice(0, 80)}"`, ref());
  }

  // 4. Metadata completeness.
  if (!q.metadata?.subskill) report("MEDIUM", "missing-subskill", mode, questionRef(q).prompt.slice(0, 60), ref());
  if (!["conceptual", "procedural", "application"].includes(q.metadata?.itemFamily))
    report("MEDIUM", "bad-item-family", mode, String(q.metadata?.itemFamily), ref());

  // 5. Display-consistency: the session screen renders symbolic equations
  //    from a/op/b. When the answer is NOT the computed result (unknown-addend
  //    and compare items), the item must carry a promptText stating the real
  //    question — otherwise the UI draws "a op b = ?" and scores a different
  //    question than the kid sees (the "19 + 14 → correct answer 5" bug).
  if ((q.op === "+" || q.op === "−") && typeof q.a === "number" && typeof q.b === "number") {
    const computed = q.op === "+" ? q.a + q.b : q.a - q.b;
    if (Number(q.answer) !== computed && !prompt.trim()) {
      report("HIGH", "false-equation-render", mode, `${q.a} ${q.op} ${q.b} rendered, answer ${q.answer}, no promptText`, ref());
    }
  }

  // 6. Renderability preconditions: the web app can only draw what the
  //    registries know. "choice" is the unregistered default grid.
  const at = questionAnswerType(q);
  if (at !== "choice" && !ANSWER_TYPES.includes(at))
    report("CRITICAL", "unregistered-answer-type", mode, at, ref());
  const fig = q.display?.figure;
  if (fig && !FIGURE_KEYS.includes(fig))
    report("CRITICAL", "unregistered-figure", mode, String(fig), ref());
}

// --- Submissions -------------------------------------------------------------

function correctSubmission(q) {
  const a = q.answer;
  // multiSelect may list several acceptable selections (list of lists);
  // q.answer itself is then not a valid submission — submit the first option.
  if (Array.isArray(a) && Array.isArray(a[0])) return a[0];
  return a;
}

function wrongSubmission(q, rand) {
  const at = questionAnswerType(q);
  const a = q.answer;
  if (Array.isArray(q.choices) && q.choices.length > 1) {
    const wrong = q.choices.filter((c) => c !== a);
    if (wrong.length) return wrong[Math.floor(rand() * wrong.length)];
  }
  switch (at) {
    case "multiSelect": {
      const set = correctSubmission(q);
      return set.length > 1 ? set.slice(1) : [...set, "__wrong__"];
    }
    case "fraction": {
      if (a && typeof a === "object" && "num" in a) return { num: (a.num ?? 0) + 1, den: a.den ?? 1 };
      const [n, d] = String(a).split("/");
      return `${Number(n || 0) + 1}/${d || 1}`;
    }
    case "symbolSelect": {
      const pool = ["<", ">", "="].filter((s) => s !== a);
      return pool[Math.floor(rand() * pool.length)];
    }
    case "decimal":
      return Number(a) + 0.1;
    default: {
      const n = Number(a);
      return Number.isFinite(n) ? n + 1 + Math.floor(rand() * 3) : `${a}x`;
    }
  }
}

// --- The simulated kid -------------------------------------------------------

function makeKid(persona) {
  const proficiency = new Map(); // `${mode}:${subskill}` -> exposures
  return {
    pCorrect(mode, subskill, level, isRetry) {
      const key = `${mode}:${subskill || "?"}`;
      const exposures = proficiency.get(key) || 0;
      proficiency.set(key, exposures + 1);
      const p = persona.base + persona.growth * exposures - persona.levelPenalty * (level - 1) + (isRetry ? persona.retryBonus : 0);
      return Math.max(0.1, Math.min(persona.cap, p));
    },
    responseMs(correct) {
      const base = persona.msMean * (correct ? 0.85 : 1.25);
      return Math.max(900, Math.round(base * (0.6 + Math.random() * 0.8)));
    },
  };
}

function playSession(mode, persona, kid, savedProgress, promptHistory) {
  let session = createAdaptiveSession(mode, SESSION_SIZE, { savedProgress, allowWordProblems: args.words === "1" });
  const startLevel = session.level;
  const sessionPrompts = new Set();
  let guard = 0;
  let demotions = 0;
  let retriesServed = 0;
  const subskillServed = new Map();

  while (!isSessionComplete(session)) {
    if (++guard > SESSION_SIZE * 6 + 40) {
      report("CRITICAL", "session-never-terminates", mode, `stuck at level ${session.level}`, { level: session.level });
      break;
    }
    let q, isRetry;
    try {
      ({ question: q, isRetry } = getNextQuestion(session));
    } catch (err) {
      // A throw from the retry path is a poison item: it lives in the saved
      // mistakeBank, so every future session of this mode would crash too.
      report("CRITICAL", "generate-threw", mode, `L${session.level}: ${err.message}`, {
        level: session.level,
        stack: String(err.stack).slice(0, 400),
        mistakeBank: session.mistakeBank.slice(0, 3).map((mq) => ({
          itemId: mq.metadata?.itemId ?? null,
          answerType: questionAnswerType(mq),
          answer: mq.answer,
          prompt: String(mq.display?.promptText ?? "").slice(0, 120),
        })),
      });
      break;
    }

    validateQuestion(q, mode, session.level);
    if (isRetry) retriesServed += 1;

    const prompt = String(q.display?.promptText ?? "");
    if (!isRetry && prompt) {
      if (sessionPrompts.has(prompt))
        report("LOW", "within-session-repeat", mode, prompt.slice(0, 80), questionRef(q));
      sessionPrompts.add(prompt);
      promptHistory.push(prompt);
    }
    const sub = q.metadata?.subskill || "?";
    subskillServed.set(sub, (subskillServed.get(sub) || 0) + 1);

    const p = kid.pCorrect(mode, sub, session.level, isRetry);
    const answersRight = Math.random() < p;
    const submission = answersRight ? correctSubmission(q) : wrongSubmission(q, Math.random);
    const prevLevel = session.level;
    let result;
    try {
      result = recordAnswer(session, q, submission, kid.responseMs(answersRight), isRetry);
    } catch (err) {
      report("CRITICAL", "record-threw", mode, `L${session.level}: ${err.message}`, { level: session.level, question: questionRef(q) });
      break;
    }

    // The kid intended a right/wrong answer; the engine must agree.
    if (answersRight && !result.correct)
      report("CRITICAL", "correct-submission-scored-wrong", mode, questionRef(q).prompt.slice(0, 80), questionRef(q));
    if (!answersRight && result.correct)
      report("HIGH", "wrong-submission-scored-right", mode, questionRef(q).prompt.slice(0, 80), { ...questionRef(q), submitted: submission });

    session = result.session;
    if (session.level < 1 || session.level > MAX_LEVEL)
      report("CRITICAL", "level-out-of-bounds", mode, String(session.level), { level: session.level });
    if (Math.abs(session.level - prevLevel) > 1)
      report("CRITICAL", "level-jump", mode, `${prevLevel}→${session.level}`, {});
    if (session.level < prevLevel) demotions += 1;
  }

  const flight = summarizeFlight(session);
  return {
    session,
    flight,
    startLevel,
    endLevel: session.level,
    demotions,
    retriesServed,
    subskillServed,
    progress: {
      level: session.level,
      mistakeBank: session.mistakeBank,
      bankItemStats: session.bankItemStats || {},
      recentBankItemIds: session.recentBankItemIds || [],
      totalSessions: (savedProgress.totalSessions || 0) + 1,
      lifetimeStars: (savedProgress.lifetimeStars || 0) + flight.total,
    },
  };
}

// --- Phase A: pacing per mode per persona -----------------------------------

function runPacing(personaName) {
  const persona = PERSONAS[personaName];
  const kid = makeKid(persona);
  const perMode = {};

  for (const mode of MODE_LIST) {
    let progress = { level: 1, mistakeBank: [], bankItemStats: {}, recentBankItemIds: [], totalSessions: 0, lifetimeStars: 0 };
    const levelAfter = [];
    const firstReached = { 1: 0 };
    const promptHistory = [];
    let totalDemotions = 0;
    let totalStars = 0;
    const subskillTotals = new Map();
    let lastMastery = null;

    for (let s = 0; s < persona.maxSessions; s += 1) {
      const out = playSession(mode, persona, kid, progress, promptHistory);
      progress = out.progress;
      levelAfter.push(out.endLevel);
      totalDemotions += out.demotions;
      totalStars += out.flight.total;
      for (const [sub, n] of out.subskillServed) subskillTotals.set(sub, (subskillTotals.get(sub) || 0) + n);
      lastMastery = out.session.skillMastery;
      for (let lv = 2; lv <= out.endLevel; lv += 1) {
        if (!(lv in firstReached)) firstReached[lv] = s + 1;
      }
      if (out.endLevel >= MAX_LEVEL) break;
    }

    // Cross-session variety: how often does the same prompt come back?
    const counts = new Map();
    for (const pText of promptHistory) counts.set(pText, (counts.get(pText) || 0) + 1);
    const repeats = [...counts.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]);

    perMode[mode] = {
      sessions: levelAfter.length,
      finalLevel: levelAfter.at(-1) ?? 1,
      reachedMax: (levelAfter.at(-1) ?? 1) >= MAX_LEVEL,
      firstReached,
      demotions: totalDemotions,
      avgStarsPerSession: levelAfter.length ? +(totalStars / levelAfter.length).toFixed(1) : 0,
      questionsServed: promptHistory.length,
      distinctPrompts: counts.size,
      topRepeats: repeats.slice(0, 3).map(([text, c]) => ({ count: c, prompt: text.slice(0, 90) })),
      subskillsServed: Object.fromEntries(subskillTotals),
      // Why a stuck mode is stuck: the promotion gate needs the weakest
      // per-session subskill rate ≥ 0.8 (unserved subskills count as 0.5).
      lastSessionMastery: lastMastery
        ? Object.fromEntries(Object.entries(lastMastery).map(([sub, m]) => [sub, `${m.correct}/${m.attempts}`]))
        : null,
    };
    process.stdout.write(`  ${personaName}/${mode}: L${perMode[mode].finalLevel} in ${perMode[mode].sessions} sessions\n`);
  }
  return perMode;
}

// --- Phase B: calendar economy sim ------------------------------------------

function runEconomy() {
  const persona = PERSONAS.typical;
  const kid = makeKid(persona);
  const modes = MODE_LIST.slice(0, 8); // a real kid rotates a handful of modes
  const progressByMode = Object.fromEntries(modes.map((m) => [m, { level: 1, mistakeBank: [], bankItemStats: {}, recentBankItemIds: [], totalSessions: 0, lifetimeStars: 0 }]));
  const promptHistory = [];
  let bank = 0;
  const days = [];
  let streak = 0;
  let goalDays = 0;

  for (let d = 0; d < ECONOMY_DAYS; d += 1) {
    let today = 0;
    for (let s = 0; s < 2; s += 1) {
      const mode = modes[(d * 2 + s) % modes.length];
      const out = playSession(mode, persona, kid, progressByMode[mode], promptHistory);
      progressByMode[mode] = out.progress;
      today += out.flight.total;
    }
    bank += today;
    streak += 1; // plays every day in this sim
    if (today >= DAILY_GOAL) goalDays += 1;
    days.push({ day: d + 1, stars: today, cumulative: bank });
  }

  const priced = SPECIES.filter((sp) => sp.price != null).sort((a, b) => a.price - b.price);
  const affordDay = (price) => days.find((x) => x.cumulative >= price)?.day ?? null;
  const avgPerDay = +(bank / ECONOMY_DAYS).toFixed(1);
  return {
    days: ECONOMY_DAYS,
    sessionsPerDay: 2,
    totalStars: bank,
    avgStarsPerDay: avgPerDay,
    dailyGoalHitRate: +(goalDays / ECONOMY_DAYS).toFixed(2),
    eggWarmthDays: +(EGG_WARMTH_TARGET / avgPerDay).toFixed(1),
    birds: priced.map((sp) => ({ id: sp.id, tier: sp.tier, price: sp.price, saveDays: affordDay(sp.price) })),
  };
}

// --- Cloud bank: the exact runtime path signed-in kids get -------------------
// fetch approved rows (PAGINATED — supabase-js caps selects at 1,000 and the
// bank is ~4x that) → normalizeBankRow → setBankItems, mirroring cloudLoader.

async function loadCloudBank() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Missing Supabase credentials — run: set -a && source .env.local && set +a");
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const SELECT =
    "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, " +
    "review_status, payload, representation_type, source, level_band";
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("item_bank").select(SELECT).eq("review_status", "approved")
      .order("item_id").range(from, from + PAGE - 1);
    if (error) { console.error("cloud fetch failed:", error.message); process.exit(1); }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  const items = rows.map(normalizeBankRow).filter(Boolean);
  if (rows.length !== items.length)
    report("HIGH", "cloud-row-failed-normalization", "bank", `${rows.length - items.length} approved rows rejected client-side`, {});
  return { rows: rows.length, items };
}

// --- Exhaustive bank audit: every item, min/mid/max of its level range -------

function auditBank(label) {
  const bank = getBankItems();
  let built = 0;
  for (const item of bank) {
    const [lo, hi] = item.levelRange || [1, 10];
    for (const level of new Set([lo, Math.round((lo + hi) / 2), hi])) {
      let q;
      try {
        q = buildQuestionFromBankItem(item, level);
      } catch (err) {
        report("CRITICAL", "bank-item-build-threw", item.modeId, `${item.itemId}: ${err.message}`, { itemId: item.itemId, level });
        continue;
      }
      if (!q) {
        report("HIGH", "bank-item-build-null", item.modeId, item.itemId, { itemId: item.itemId, level });
        continue;
      }
      q.mode = q.mode || item.modeId;
      validateQuestion(q, item.modeId, level);
      // The retry-crash class, enumerated per item: can choices be rebuilt
      // from the bare answer (as the mistake-bank path must)?
      if (questionAnswerType(q) === "choice") {
        try {
          generateChoices(q.answer, 4, { ...q, choices: undefined });
        } catch {
          report("HIGH", "poison-on-retry", item.modeId, item.itemId, { itemId: item.itemId, answer: q.answer });
        }
      }
      built += 1;
    }
  }
  console.log(`bank audit (${label}): ${bank.length} items, ${built} build+validate passes`);
  return bank.length;
}

// Bundle↔cloud drift: same itemId, different answer or prompt. This is the
// exact class that once shipped 27 wrong-answer items online while the bundle
// was correct.
function diffBanks(bundleById, cloudItems) {
  const drift = [];
  for (const item of cloudItems) {
    const b = bundleById.get(item.itemId);
    if (!b) continue;
    const answers = [JSON.stringify(b.question?.answer), JSON.stringify(item.question?.answer)];
    const prompts = [b.question?.display?.promptText, item.question?.display?.promptText];
    if (answers[0] !== answers[1])
      drift.push({ itemId: item.itemId, mode: item.modeId, field: "answer", bundle: answers[0], cloud: answers[1] });
    else if (prompts[0] !== prompts[1])
      drift.push({ itemId: item.itemId, mode: item.modeId, field: "promptText", bundle: String(prompts[0]).slice(0, 90), cloud: String(prompts[1]).slice(0, 90) });
  }
  return drift;
}

// --- Run ---------------------------------------------------------------------

let bankInfo = { source: "bundle", rows: getBankItems().length };
let driftReport = null;
if (args.bank === "cloud" || args.auditBank) {
  const bundleById = new Map(getBankItems().map((i) => [i.itemId, i]));
  if (args.auditBank) auditBank("bundle");
  if (args.bank === "cloud") {
    const cloud = await loadCloudBank();
    setBankItems(cloud.items, "cloud");
    bankInfo = { source: "cloud", rows: cloud.rows, normalized: cloud.items.length };
    console.log(`cloud bank loaded: ${cloud.rows} approved rows → ${cloud.items.length} items in play`);
    driftReport = diffBanks(bundleById, cloud.items);
    console.log(`bundle↔cloud drift: ${driftReport.length} item(s) differ`);
    if (args.auditBank) auditBank("cloud");
  }
}

resetBankFallbackStats();
const started = Date.now();
const pacing = {};
for (const p of PERSONA_KEYS) {
  console.log(`\n=== pacing: ${p} kid ===`);
  pacing[p] = runPacing(p);
}
console.log("\n=== economy: typical kid, calendar sim ===");
const economy = runEconomy();
const fallback = getBankFallbackStats();

const sorted = [...findings.values()].sort((a, b) => {
  const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return rank[a.severity] - rank[b.severity] || b.count - a.count;
});

const reportJson = { generatedIn: `${((Date.now() - started) / 1000).toFixed(1)}s`, bank: bankInfo, drift: driftReport, personas: PERSONA_KEYS, pacing, economy, bankFallback: fallback, findings: sorted };
const outPath = args.out || "simulateKid-report.json";
writeFileSync(outPath, JSON.stringify(reportJson, null, 2));

console.log(`\n=== findings (${sorted.length} distinct) ===`);
for (const f of sorted.slice(0, 40)) {
  console.log(`${f.severity.padEnd(8)} ${f.category.padEnd(32)} ${f.mode.padEnd(18)} ×${f.count}  ${f.detail.slice(0, 90)}`);
}
console.log(`\nfull report → ${outPath}`);
