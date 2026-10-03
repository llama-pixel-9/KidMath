#!/usr/bin/env node
/**
 * The live step's subjective gates, made steady (plan C.4): blind solve
 * (a model answers each item from only what the kid sees and must reach
 * the key) and kid-safe (would a school print it?), each asked of one
 * pinned judge in two passes with different batch shuffles.
 *
 *   1. Fixed judge: no run starts without --model. The receipt records the
 *      model, the sha of each system prompt, kidView's sha and commit, and
 *      the sha of the items.
 *   2. Two passes, A and B: the same judge, other batch neighbours.
 *   3. Fail-closed: an item passes only if both passes reach the key and
 *      both call it printable. The caller (prepare.mjs) drops an item
 *      flagged once and refills it; flagged twice, or 10% of a model's
 *      items flagged, holds the model. (This reverses the authoring rule
 *      "a flag counts only if it comes back on a rerun".)
 *   4. Canaries in every batch, never written: a copy of a real item with
 *      its key corrupted (the solver must not reach it), a calibrated story
 *      the word list lets through but a school would not print, and a
 *      calibrated known-good item that must pass. A pass that misses one is
 *      void and rerun with a new shuffle, at most twice; then the run stops.
 *   5. The A/B disagreement rate per gate is reported; above --max-ab the
 *      run stops.
 *   6. No silent skip: no `claude` on PATH, or a batch that still fails
 *      after two retries, stops the run. Exit codes of other tools are not
 *      read; verdicts are.
 *   7. Verdicts are cached per item content, gate, pass, model, prompt sha
 *      and kidView sha; the receipt names the items' sha.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/live/qcPanels.mjs --calibrate --model <id>
 *     run the canary candidates through both passes; keeps the ones that
 *     behave, and records the A/B rate (needed once per model and prompt)
 *   node --import ./scripts/lib/registerResolve.js scripts/live/qcPanels.mjs <items.json> --model <id> [--out <dir>]
 *   ... --smoke   at most 2 items with one uncalibrated canary of each kind,
 *                 one call per gate and pass; the receipt says smoke and
 *                 prepare.mjs never accepts it
 *
 * Options: --cache <dir> (default qa-out/live/qc-cache), --max-ab <rate>,
 * --allow-ambiguous (an agreed answer the solver calls ambiguous passes).
 * Needs the `claude` CLI (Claude Code) on PATH.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findKidSafeHits } from "../../src/content/kidSafeList.js";
import { jsonbText } from "../../src/itemModels/live/liveRows.js";
import { HOLD_FLAG_RATE, MAX_AB_DISAGREEMENT, MAX_VOID_RERUNS, QC_PASSES, modelIdOfItem } from "../../src/itemModels/live/liveRules.js";
import { mulberry32 } from "../../src/itemModels/fill.js";
import { BATCH_SIZE, claudeAvailable, extractJsonArray, runClaude } from "../itemGen/qc/qcCli.js";
import { kidFacingText, kidView } from "../itemGen/qc/kidView.js";
import * as BLIND from "../itemGen/qc/blindSolve.js";
import * as KIDSAFE from "../itemGen/qc/kidSafeReview.js";
import { fileSha, lastCommitOf, parseArgs, sha256, writeJson } from "./lib/common.mjs";

const HERE = new URL(".", import.meta.url).pathname;
const KID_VIEW_FILE = resolve(HERE, "../itemGen/qc/kidView.js");
const CANARY_FILE = resolve(HERE, "canaries/kidSafe.json");

export const GATES = Object.freeze(["blind", "kidSafe"]);
const SYSTEMS = { blind: BLIND.SYSTEM, kidSafe: KIDSAFE.SYSTEM };
const BUILD = { blind: BLIND.buildPrompt, kidSafe: KIDSAFE.buildPrompt };

/** Real items per batch: BATCH_SIZE less the two canaries. */
export const REAL_PER_BATCH = BATCH_SIZE - 2;
const BATCH_RETRIES = 2;

/** What the judge was: the facts a cached verdict is keyed on. */
export function judgeFacts(model) {
  return {
    model,
    promptSha: { blind: sha256(SYSTEMS.blind), kidSafe: sha256(SYSTEMS.kidSafe) },
    kidViewSha: fileSha(KID_VIEW_FILE),
    kidViewCommit: lastCommitOf(KID_VIEW_FILE),
  };
}

/** The part of an item the judges read: its question and hint. */
export const contentKey = (item) => sha256(jsonbText({ question: item.question ?? null, hint: item.hint ?? null }));

function cacheKey(item, gate, pass, facts) {
  return sha256(jsonbText({ content: contentKey(item), gate, pass, model: facts.model, promptSha: facts.promptSha[gate], kidViewSha: facts.kidViewSha }));
}

function readCache(dir, key) {
  if (!dir) return null;
  const path = join(dir, `${key}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")).verdict ?? null;
  } catch {
    return null;
  }
}

const writeCache = (dir, key, verdict) => dir && writeJson(join(dir, `${key}.json`), { verdict, at: new Date().toISOString() });

function shuffled(list, seedText) {
  const rng = mulberry32(parseInt(sha256(seedText).slice(0, 8), 16));
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Canaries ──────────────────────────────────────────────────────────────

/**
 * A copy of `item` whose key is wrong: another of its choices, else the
 * number 10 (or 1) away. The solver, which never sees a key, must not
 * land on it. Null when the key cannot be corrupted.
 */
export function corruptKey(item, tag = "x") {
  const q = item?.question;
  if (!q) return null;
  let wrong;
  if (Array.isArray(q.choices) && q.choices.length >= 2) wrong = q.choices.find((c) => c !== q.answer);
  else if (typeof q.answer === "number") wrong = q.answer + (q.answer >= 10 ? 10 : 1);
  if (wrong === undefined) return null;
  return { ...item, itemId: `canary-key-${tag}-${item.itemId}`, hint: null, question: { ...q, answer: wrong } };
}

/** The committed kid-safe canary stories as bank items, minus any the word list already catches. */
export function storyCanaries(file = CANARY_FILE) {
  const { stories } = JSON.parse(readFileSync(file, "utf8"));
  return stories
    .map((s) => ({
      itemId: `canary-story-${s.id}`,
      modeId: "wordProblems",
      itemFamily: "application",
      subskill: "changeStories",
      structureType: "addToResultUnknown",
      levelRange: [4, 6],
      reviewStatus: "approved",
      version: 2,
      hint: null,
      question: { a: null, b: null, op: null, answer: s.answer, answerType: "numberPad", display: { promptText: s.prompt } },
    }))
    .filter((item) => !findKidSafeHits(item.question.display.promptText).length);
}

/**
 * Known-good candidates: approved, already-live items the judges must
 * pass. Blind solve takes plain Grade 2 sums and differences; kid-safe
 * takes Grade 2 add and subtract stories. A fixed spread, so a calibration
 * is repeatable.
 */
export async function knownGoodCandidates(per = 8) {
  const { FULL_ITEMS } = await import("../../src/itemBank/fullBank.js");
  const pick = (list) => {
    const sorted = list.slice().sort((a, b) => (a.itemId < b.itemId ? -1 : 1));
    const step = Math.max(1, Math.floor(sorted.length / per));
    return sorted.filter((_, i) => i % step === 0).slice(0, per);
  };
  const g2 = (i) => i.reviewStatus === "approved" && i.levelRange?.[0] <= 6 && i.levelRange?.[1] >= 4 && ["addition", "subtraction"].includes(i.modeId);
  return {
    blind: pick(FULL_ITEMS.filter((i) => g2(i) && i.itemFamily === "procedural" && typeof i.question?.answer === "number" && /^\s*\d+\s*[+−-]\s*\d+\s*=\s*\?\s*$/.test(i.question?.display?.promptText || ""))),
    kidSafe: pick(FULL_ITEMS.filter((i) => g2(i) && i.itemFamily === "application" && typeof i.question?.display?.promptText === "string")),
  };
}

// ── One pass of one gate ──────────────────────────────────────────────────

function verdictFrom(gate, view, reply, { allowAmbiguous }) {
  if (gate === "blind") {
    const j = BLIND.judge(view, reply);
    const flagged = !j.agreed || (j.ambiguous && !allowAmbiguous);
    return { flagged, agreed: j.agreed, ambiguous: j.ambiguous, answer: j.modelAnswer, reason: j.reason };
  }
  const printable = reply.printable === true;
  return { flagged: !printable, printable, reason: typeof reply.reason === "string" ? reply.reason.trim() : "" };
}

/** The transport: one batch prompt to the pinned judge, the reply's JSON array back. */
export async function askClaude(prompt, { system, model }) {
  return extractJsonArray(await runClaude(prompt, { system, model }));
}

/**
 * Ask one gate about `items` in one pass. Each batch carries REAL_PER_BATCH
 * real items, one bad canary and one known-good, under opaque ids, so the
 * judge cannot tell them apart. Returns { verdicts: Map(itemId -> verdict),
 * canaries: [{ kind, itemId, flagged }], void: reason | null, calls }.
 */
async function runPass(gate, pass, attempt, items, { facts, badCanaries, goodCanaries, ask, allowAmbiguous, log, salt }) {
  const verdicts = new Map();
  const canaries = [];
  let calls = 0;
  const order = shuffled(items, `${gate}|${pass}|${attempt}|${salt}`);
  for (let b = 0; b * REAL_PER_BATCH < order.length; b += 1) {
    const real = order.slice(b * REAL_PER_BATCH, (b + 1) * REAL_PER_BATCH);
    const good = goodCanaries[(b + attempt) % goodCanaries.length];
    const bad = badCanaries(b, real, good);
    if (!bad) throw new Error(`${gate} pass ${pass}: batch ${b + 1} has no bad canary`);
    const entries = [...real.map((item) => ({ kind: "real", item })), ...(bad ? [{ kind: "bad", item: bad }] : []), ...(good ? [{ kind: "good", item: good }] : [])];
    const batch = shuffled(entries, `${gate}|${pass}|${attempt}|${b}|${salt}|batch`).map((e, i) => {
      const view = kidView(e.item);
      const opaque = `q${sha256(`${salt}|${gate}|${pass}|${attempt}|${b}|${i}`).slice(0, 8)}`;
      return { ...e, opaque, view: { ...view, itemId: opaque } };
    });
    let replies = null;
    let lastError = null;
    for (let tryNo = 0; tryNo <= BATCH_RETRIES && !replies; tryNo += 1) {
      try {
        calls += 1;
        const list = await ask(BUILD[gate](batch.map((e) => e.view)), { system: SYSTEMS[gate], model: facts.model });
        replies = new Map(list.filter((r) => r && typeof r === "object").map((r) => [r.itemId, r]));
      } catch (err) {
        lastError = err;
        log(`${gate} pass ${pass} batch ${b + 1}: ${err.message}${tryNo < BATCH_RETRIES ? " (retrying)" : ""}`);
      }
    }
    if (!replies) throw new Error(`${gate} pass ${pass}: batch ${b + 1} still fails after ${BATCH_RETRIES} retries (${lastError?.message}); the run stops`);
    for (const e of batch) {
      const reply = replies.get(e.opaque);
      const verdict = reply ? verdictFrom(gate, e.view, reply, { allowAmbiguous }) : { flagged: true, reason: "the judge returned no verdict for this item" };
      if (e.kind === "real") verdicts.set(e.item.itemId, { ...verdict, cached: false });
      else canaries.push({ kind: e.kind, itemId: e.item.itemId, flagged: verdict.flagged, reason: verdict.reason });
    }
    log(`${gate} pass ${pass}${attempt ? ` (rerun ${attempt})` : ""}: batch ${b + 1} of ${Math.ceil(order.length / REAL_PER_BATCH)}`);
  }
  const missedBad = canaries.filter((c) => c.kind === "bad" && !c.flagged);
  const failedGood = canaries.filter((c) => c.kind === "good" && c.flagged);
  const why = [
    ...missedBad.map((c) => `missed the bad canary ${c.itemId}`),
    ...failedGood.map((c) => `flagged the known-good ${c.itemId}: ${c.reason}`),
  ];
  return { verdicts, canaries, void: why.length ? why.join("; ") : null, calls };
}

// ── The panels ────────────────────────────────────────────────────────────

/** A/B disagreement: the share of items both passes judged where they differ. */
export function disagreement(verdicts, gate) {
  let both = 0;
  let differ = 0;
  for (const v of verdicts.values()) {
    const a = v[gate]?.A;
    const b = v[gate]?.B;
    if (!a || !b) continue;
    both += 1;
    if (a.flagged !== b.flagged) differ += 1;
  }
  return { items: both, differ, rate: both ? differ / both : 0 };
}

/** Is an item clear of both gates in both passes? */
export const passedAll = (v) => Boolean(v) && GATES.every((g) => QC_PASSES.every((p) => v[g]?.[p] && !v[g][p].flagged));

/** How many passes flagged an item at its worst gate (0, 1 or 2). */
export const timesFlagged = (v) => Math.max(...GATES.map((g) => QC_PASSES.filter((p) => v?.[g]?.[p]?.flagged).length));

/**
 * Run both gates, both passes, over `items` (bank items). Verdicts already
 * cached for an item's content are reused. Returns { verdicts:
 * Map(itemId -> { blind: { A, B }, kidSafe: { A, B } }), receipt }.
 * Throws when the run must stop: no judge, a void pass after its reruns,
 * a failed batch, or an A/B rate over `maxAb`.
 */
export async function runPanels(items, {
  model,
  cacheDir = "qa-out/live/qc-cache",
  calibration = null,
  smoke = false,
  allowAmbiguous = false,
  maxAb = MAX_AB_DISAGREEMENT,
  canaryPool = null,
  ask = askClaude,
  log = () => {},
  checkJudge = true,
} = {}) {
  if (!model) throw new Error("QC needs a pinned judge: --model <id> (the default model is not pinned)");
  if (checkJudge && !(await claudeAvailable())) throw new Error("QC cannot run: `claude` (Claude Code) is not on PATH; a skipped QC never passes");
  if (smoke && items.length > 2) throw new Error(`a smoke run takes at most 2 items (got ${items.length})`);
  const facts = judgeFacts(model);
  let good;
  let stories;
  let spare = [];
  if (smoke) {
    const kg = await knownGoodCandidates(2);
    good = { blind: kg.blind.slice(0, 1), kidSafe: kg.kidSafe.slice(0, 1) };
    spare = kg.blind.slice(1);
    stories = storyCanaries().slice(0, 1);
  } else {
    if (!calibration) throw new Error("QC needs a calibration for this judge and prompt (qcPanels.mjs --calibrate --model <id>)");
    if (calibration.model !== model || calibration.promptSha?.blind !== facts.promptSha.blind || calibration.promptSha?.kidSafe !== facts.promptSha.kidSafe || calibration.kidViewSha !== facts.kidViewSha) {
      throw new Error("the calibration was made for another judge, prompt or kidView; run --calibrate again");
    }
    good = calibration.knownGood;
    stories = calibration.badStories;
  }
  if (!good.blind.length || !good.kidSafe.length || !stories.length) throw new Error("no canaries to calibrate the passes with");
  // Corrupted-key canaries: copies of the run's own items (so they look like
  // their neighbours), else of the known-good items.
  const pool = [...(canaryPool || items), ...good.blind, ...spare].map((it, i) => corruptKey(it, String(i))).filter(Boolean);
  if (!pool.length) throw new Error("no item's key could be corrupted for the blind-solve canary");
  const salt = sha256(jsonbText(items.map((i) => i.itemId).sort()));

  const verdicts = new Map(items.map((i) => [i.itemId, { blind: {}, kidSafe: {} }]));
  const passLog = [];
  let calls = 0;
  for (const gate of GATES) {
    for (const pass of QC_PASSES) {
      // The word list decides first on kid-safe; cached verdicts are reused.
      const need = [];
      for (const item of items) {
        if (gate === "kidSafe") {
          const hits = findKidSafeHits(kidFacingText(kidView(item)));
          if (hits.length) {
            verdicts.get(item.itemId)[gate][pass] = { flagged: true, reason: `kid-safe list: ${hits.map((h) => h.term).join(", ")}`, cached: false };
            continue;
          }
        }
        const cached = readCache(cacheDir, cacheKey(item, gate, pass, facts));
        if (cached) verdicts.get(item.itemId)[gate][pass] = { ...cached, cached: true };
        else need.push(item);
      }
      if (!need.length) {
        passLog.push({ gate, pass, items: 0, attempts: [], cached: items.length });
        continue;
      }
      const badCanaries =
        gate === "blind"
          ? (b, real, good) => {
              // Never the corrupted copy of an item in the same batch.
              const ids = new Set([...real.map((r) => r.itemId), good?.itemId]);
              const others = pool.filter((c) => !ids.has(c.itemId.replace(/^canary-key-[^-]+-/, "")));
              return others.length ? others[b % others.length] : null;
            }
          : (b) => stories[b % stories.length];
      const attempts = [];
      let done = null;
      const maxReruns = smoke ? 0 : MAX_VOID_RERUNS;
      for (let attempt = 0; attempt <= maxReruns && !done; attempt += 1) {
        const r = await runPass(gate, pass, attempt, need, { facts, badCanaries, goodCanaries: good[gate], ask, allowAmbiguous, log, salt });
        calls += r.calls;
        attempts.push({ attempt, void: r.void, canaries: r.canaries, calls: r.calls });
        if (!r.void) done = r;
        else log(`${gate} pass ${pass} is void: ${r.void}`);
      }
      passLog.push({ gate, pass, items: need.length, attempts });
      if (!done) {
        if (smoke) continue;
        throw new Error(`${gate} pass ${pass} stays void after ${maxReruns} reruns; the run stops (${attempts.at(-1).void})`);
      }
      for (const [id, v] of done.verdicts) {
        verdicts.get(id)[gate][pass] = v;
        const item = items.find((i) => i.itemId === id);
        const { cached: _ignored, ...stored } = v;
        writeCache(cacheDir, cacheKey(item, gate, pass, facts), stored);
      }
    }
  }
  const rates = Object.fromEntries(GATES.map((g) => [g, disagreement(verdicts, g)]));
  const receipt = {
    kind: "live-qc",
    smoke,
    judge: facts,
    calibration: calibration ? calibration.sha ?? null : null,
    items: items.length,
    itemsSha: sha256(jsonbText(items.map((i) => ({ id: i.itemId, content: contentKey(i) })))),
    calls,
    passes: passLog,
    disagreement: rates,
    maxAb,
    createdAt: new Date().toISOString(),
    verdicts: Object.fromEntries(verdicts),
  };
  const over = Object.entries(rates).filter(([, r]) => r.rate > maxAb);
  if (over.length && !smoke) {
    throw Object.assign(new Error(`A/B disagreement over ${maxAb}: ${over.map(([g, r]) => `${g} ${(r.rate * 100).toFixed(1)}% (${r.differ}/${r.items})`).join(", ")}; the run stops`), { receipt });
  }
  return { verdicts, receipt };
}

/**
 * Calibrate the canaries for a judge: both passes over the committed bad
 * stories and the known-good picks, with no canaries inside. Keeps the bad
 * stories flagged in both passes and the known-good items passed in both;
 * needs at least 3 of each. Returns the calibration (also the A/B rates
 * seen, to fix --max-ab on).
 */
export async function calibrate({ model, ask = askClaude, log = () => {}, per = 8, checkJudge = true } = {}) {
  if (!model) throw new Error("calibration needs a pinned judge: --model <id>");
  if (checkJudge && !(await claudeAvailable())) throw new Error("calibration cannot run: `claude` (Claude Code) is not on PATH");
  const facts = judgeFacts(model);
  const kg = await knownGoodCandidates(per);
  const stories = storyCanaries();
  const sets = { blind: kg.blind, kidSafe: [...kg.kidSafe, ...stories] };
  const results = { blind: new Map(), kidSafe: new Map() };
  let calls = 0;
  for (const gate of GATES) {
    for (const pass of QC_PASSES) {
      const order = shuffled(sets[gate], `calibrate|${gate}|${pass}`);
      for (let b = 0; b * BATCH_SIZE < order.length; b += 1) {
        const batch = order.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE).map((item, i) => ({ item, view: { ...kidView(item), itemId: `q${sha256(`cal|${gate}|${pass}|${b}|${i}`).slice(0, 8)}` } }));
        calls += 1;
        const list = await ask(BUILD[gate](batch.map((e) => e.view)), { system: SYSTEMS[gate], model });
        const replies = new Map(list.map((r) => [r.itemId, r]));
        for (const e of batch) {
          const reply = replies.get(e.view.itemId);
          const v = reply ? verdictFrom(gate, e.view, reply, { allowAmbiguous: false }) : { flagged: true, reason: "no verdict" };
          if (!results[gate].has(e.item.itemId)) results[gate].set(e.item.itemId, {});
          results[gate].get(e.item.itemId)[pass] = v;
        }
        log(`calibrate ${gate} pass ${pass}: batch ${b + 1}`);
      }
    }
  }
  const both = (gate, id, flagged) => QC_PASSES.every((p) => results[gate].get(id)?.[p]?.flagged === flagged);
  const badStories = stories.filter((s) => both("kidSafe", s.itemId, true));
  const knownGood = {
    blind: kg.blind.filter((i) => both("blind", i.itemId, false)),
    kidSafe: kg.kidSafe.filter((i) => both("kidSafe", i.itemId, false)),
  };
  const rate = (gate) => {
    const ids = [...results[gate].keys()];
    const differ = ids.filter((id) => results[gate].get(id).A?.flagged !== results[gate].get(id).B?.flagged).length;
    return { items: ids.length, differ, rate: ids.length ? differ / ids.length : 0 };
  };
  const calibration = {
    kind: "live-qc-calibration",
    model,
    promptSha: facts.promptSha,
    kidViewSha: facts.kidViewSha,
    badStories,
    knownGood,
    dropped: {
      badStories: stories.filter((s) => !badStories.includes(s)).map((s) => ({ itemId: s.itemId, verdicts: results.kidSafe.get(s.itemId) })),
      knownGood: GATES.flatMap((g) => kg[g].filter((i) => !knownGood[g].includes(i)).map((i) => ({ gate: g, itemId: i.itemId, verdicts: results[g].get(i.itemId) }))),
    },
    disagreement: { blind: rate("blind"), kidSafe: rate("kidSafe") },
    calls,
    createdAt: new Date().toISOString(),
  };
  calibration.sha = sha256(jsonbText({ model, promptSha: facts.promptSha, kidViewSha: facts.kidViewSha, bad: badStories.map((s) => s.itemId), good: knownGood }));
  const problems = [];
  if (badStories.length < 3) problems.push(`only ${badStories.length} bad stories flagged in both passes (need 3)`);
  for (const g of GATES) if (knownGood[g].length < 3) problems.push(`only ${knownGood[g].length} ${g} known-good items passed both passes (need 3)`);
  calibration.ok = problems.length === 0;
  calibration.problems = problems;
  return calibration;
}

/** Where a judge's calibration is kept. */
export function calibrationPath(cacheDir, model) {
  const facts = judgeFacts(model);
  return join(cacheDir, `calibration-${sha256(jsonbText({ model, promptSha: facts.promptSha, kidViewSha: facts.kidViewSha })).slice(0, 16)}.json`);
}

export function loadCalibration(cacheDir, model) {
  const path = calibrationPath(cacheDir, model);
  if (!existsSync(path)) return null;
  const c = JSON.parse(readFileSync(path, "utf8"));
  return c.ok ? c : null;
}

/**
 * Per model: items checked, flagged once, flagged twice; and whether the
 * model is held (C.4.3: any item flagged in both passes, or `rate` of its
 * items flagged). `groupOf(itemId)` names the group; by default the model
 * of a filled item, else the script row the caller passes in.
 */
export function modelFlags(verdicts, { rate = HOLD_FLAG_RATE, groupOf = (id) => modelIdOfItem(id) || `script:${id}` } = {}) {
  const out = new Map();
  for (const [id, v] of verdicts) {
    const model = groupOf(id);
    if (!out.has(model)) out.set(model, { checked: 0, once: [], twice: [] });
    const m = out.get(model);
    m.checked += 1;
    const n = timesFlagged(v);
    if (n === 1) m.once.push(id);
    if (n >= 2) m.twice.push(id);
  }
  for (const m of out.values()) m.held = m.twice.length > 0 || (m.checked > 0 && (m.once.length + m.twice.length) / m.checked >= rate);
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { flags: ["help", "smoke", "calibrate", "allow-ambiguous"], options: ["model", "out", "cache", "max-ab"] });
  if (args.flags.has("help")) {
    process.stdout.write("qcPanels.mjs <items.json> --model <id> [--out <dir>] [--cache <dir>] [--smoke] [--max-ab 0.02] [--allow-ambiguous]\nqcPanels.mjs --calibrate --model <id> [--cache <dir>]\n");
    return 0;
  }
  const model = args.options.model;
  const cacheDir = args.options.cache || "qa-out/live/qc-cache";
  const log = (m) => process.stderr.write(`${m}\n`);
  if (args.flags.has("calibrate")) {
    const c = await calibrate({ model, log });
    writeJson(calibrationPath(cacheDir, model), c);
    process.stdout.write(`calibration ${c.ok ? "OK" : "FAILED"}: ${c.badStories.length} bad stories, known-good blind ${c.knownGood.blind.length} / kid-safe ${c.knownGood.kidSafe.length}; A/B blind ${(c.disagreement.blind.rate * 100).toFixed(1)}%, kid-safe ${(c.disagreement.kidSafe.rate * 100).toFixed(1)}%\n`);
    for (const p of c.problems) process.stdout.write(`  ${p}\n`);
    process.stdout.write(`${calibrationPath(cacheDir, model)}\n`);
    return c.ok ? 0 : 1;
  }
  const file = args.positional[0];
  if (!file) throw new Error("give an items JSON file (see --help)");
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  const smoke = args.flags.has("smoke");
  const { receipt } = await runPanels(items, {
    model,
    cacheDir: smoke ? null : cacheDir,
    calibration: smoke ? null : loadCalibration(cacheDir, model),
    smoke,
    allowAmbiguous: args.flags.has("allow-ambiguous"),
    maxAb: args.options["max-ab"] != null ? Number(args.options["max-ab"]) : MAX_AB_DISAGREEMENT,
    log,
  });
  const out = args.options.out || "qa-out/live/qc";
  writeJson(join(out, smoke ? "qc-smoke-receipt.json" : "qc-receipt.json"), receipt);
  const verdicts = new Map(Object.entries(receipt.verdicts));
  const flagged = [...verdicts].filter(([, v]) => !passedAll(v));
  process.stdout.write(`QC ${smoke ? "SMOKE " : ""}${items.length} items, ${receipt.calls} calls: ${items.length - flagged.length} passed both gates in both passes, ${flagged.length} flagged\n`);
  for (const p of receipt.passes) for (const a of p.attempts) process.stdout.write(`  ${p.gate} ${p.pass}${a.attempt ? ` rerun ${a.attempt}` : ""}: ${a.void ? `VOID (${a.void})` : "canaries ok"}\n`);
  for (const [g, r] of Object.entries(receipt.disagreement)) process.stdout.write(`  A/B ${g}: ${r.differ}/${r.items}\n`);
  for (const [id, v] of flagged) process.stdout.write(`  ${id}: ${GATES.flatMap((g) => QC_PASSES.filter((p) => v[g]?.[p]?.flagged).map((p) => `${g} ${p}: ${v[g][p].reason}`)).join(" | ")}\n`);
  const voided = receipt.passes.some((p) => p.attempts.length && p.attempts.every((a) => a.void));
  return flagged.length || voided ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`qcPanels: ${err.message}\n`);
      process.exit(2);
    });
}
