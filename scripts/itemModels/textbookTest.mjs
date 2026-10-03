/**
 * The textbook test (scripts/itemModels/textbookTest.js has the design).
 * Run it on every new model after the harness passes, before the model is
 * loaded into Sai's queue:
 *
 *   npm run models:textbook -- <models.json> [more.json ...] [options]
 *
 * Options:
 *   --only id,id      just these models
 *   --runs N          reader runs per role (default 2: 3 roles x 2 = 6 votes)
 *   --measures-only   the counting layer only (no model calls; same answer every run)
 *   --out DIR         where the report goes (default: next to the first input)
 *   --sql PATH        also write SQL that stores each passing or noted model's
 *                     verdict in item_models.spec.checks.textbook (drafts only),
 *                     which the review screen shows as a card
 *   --batch N         models per reader call (default 4)
 *   --concurrency N   reader calls at once (default 8)
 *   --calibrate       inputs are [{ id, label, model }] (label = Sai's call);
 *                     prints agreement by label, and with --runs 4 compares
 *                     two independent panels (runs 1-2 vs 3-4)
 *
 * Verdicts: fail = fix the model before loading it; review = load it, the
 * readers' quotes go to Sai beside it; pass. Exit 1 when any model fails.
 * Needs the `claude` CLI on PATH unless --measures-only.
 */
import fs from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const imp = (p) => import(path.join(REPO, p));
const T = await imp("scripts/itemModels/textbookTest.js");
const { runClaude, extractJsonArray, claudeAvailable, parseArgs } = await imp("scripts/itemGen/qc/qcCli.js");
const { sqlLiteral } = await imp("src/standards/dbRows.js");

let args;
try {
  args = parseArgs(process.argv.slice(2), {
    flags: ["measures-only", "calibrate", "help"],
    options: ["only", "runs", "out", "sql", "batch", "concurrency"],
  });
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
if (args.flags.has("help") || !args.positional.length) {
  console.error("usage: npm run models:textbook -- <models.json> [more.json] [--only ids] [--runs 2] [--measures-only] [--out dir] [--sql path] [--calibrate]");
  process.exit(args.flags.has("help") ? 0 : 2);
}
const RUNS = Number(args.options.runs ?? T.DEFAULT_RUNS);
const BATCH = Number(args.options.batch ?? 4);
const CONC = Number(args.options.concurrency ?? 8);
const MEASURES_ONLY = args.flags.has("measures-only");
const CALIBRATE = args.flags.has("calibrate");
const ONLY = args.options.only ? new Set(args.options.only.split(",")) : null;
const OUT = args.options.out || path.dirname(args.positional[0]);
if (!MEASURES_ONLY && (RUNS < 1 || RUNS % T.DEFAULT_RUNS !== 0)) {
  console.error(`--runs must be a multiple of ${T.DEFAULT_RUNS}: the vote thresholds are set for ${T.ROLES.length * T.DEFAULT_RUNS} votes`);
  process.exit(2);
}

// Entries: { id, label?, model }.
const entries = [];
for (const file of args.positional) {
  let data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data)) data = data.models || Object.values(data);
  for (const x of data) {
    const entry = x && x.model && typeof x.model === "object" ? { id: x.id ?? x.model.id, label: x.label ?? null, model: x.model } : { id: x?.id, label: null, model: x };
    if (!ONLY || ONLY.has(entry.id)) entries.push(entry);
  }
}
if (!entries.length) {
  console.error("no models to test");
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const measures = new Map(entries.map((e) => [e.id, T.measureModel(e.model)]));
const replies = new Map(entries.map((e) => [e.id, []]));
let failedCalls = 0;

if (!MEASURES_ONLY) {
  if (!(await claudeAvailable())) {
    console.error("the `claude` CLI is not on PATH; run with --measures-only, or where Claude Code is installed");
    process.exit(2);
  }
  const reads = new Map(entries.map((e) => [e.id, T.readsOf(e.model)]));
  const batches = [];
  for (let i = 0; i < entries.length; i += BATCH) batches.push(entries.slice(i, i + BATCH));
  const tasks = [];
  for (let run = 1; run <= RUNS; run++) {
    for (const role of T.ROLES) for (const batch of batches) tasks.push({ run, role, batch });
  }
  const ask = async ({ run, role, batch }) => {
    const prompt = batch.map((e) => T.modelBlock(e.id, e.model.grade, reads.get(e.id))).join("\n\n---\n\n");
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const arr = extractJsonArray(await runClaude(prompt, { system: T.systemFor(role) }));
        for (const rep of arr) {
          if (rep?.modelId && replies.has(rep.modelId)) replies.get(rep.modelId).push({ run, role, lines: rep.lines || {} });
        }
        return;
      } catch (e) {
        if (attempt === 2) {
          failedCalls++;
          process.stderr.write(`reader call failed (${role}, run ${run}): ${e.message || e}\n`);
        }
      }
    }
  };
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONC, tasks.length) }, async () => {
      while (next < tasks.length) {
        await ask(tasks[next++]);
        if (++done % 10 === 0 || done === tasks.length) process.stderr.write(`${done}/${tasks.length} reader calls\n`);
      }
    }),
  );
}

// Score: one panel per DEFAULT_RUNS runs.
const panels = [];
for (let r = 1; r <= (MEASURES_ONLY ? 0 : RUNS); r += T.DEFAULT_RUNS) panels.push(Array.from({ length: T.DEFAULT_RUNS }, (_, i) => r + i));
const expected = T.ROLES.length * T.DEFAULT_RUNS;
const results = entries.map((e) => {
  const m = measures.get(e.id);
  const scores = MEASURES_ONLY
    ? [T.scoreModel(m, [])]
    : panels.map((p) => {
        const s = T.scoreModel(m, replies.get(e.id).filter((r) => p.includes(r.run)));
        if (s.readers < expected) s.notes = [...s.notes, `only ${s.readers} of ${expected} reader replies came back`];
        if (s.readers < T.FAIL_VOTES && s.verdict === "pass") s.verdict = "review";
        return s;
      });
  return { id: e.id, label: e.label, stats: m.stats, ...scores[0], panels: scores.length > 1 ? scores.map((s) => s.verdict) : undefined };
});

const counts = { pass: 0, review: 0, fail: 0 };
for (const r of results) counts[r.verdict]++;
const report = { measuresOnly: MEASURES_ONLY, runs: MEASURES_ONLY ? 0 : RUNS, failedCalls, counts, results };

// Calibration: agreement with Sai's calls, and panel-to-panel steadiness.
if (CALIBRATE) {
  const byLabel = {};
  for (const r of results) {
    const k = (byLabel[r.label ?? "unlabelled"] ||= { n: 0, pass: 0, review: 0, fail: 0 });
    k.n++;
    k[r.verdict]++;
  }
  report.byLabel = byLabel;
  if (panels.length >= 2) {
    const steady = results.filter((r) => r.panels[0] === r.panels[1]).length;
    const steadyFail = results.filter((r) => (r.panels[0] === "fail") === (r.panels[1] === "fail")).length;
    report.steadiness = { models: results.length, sameVerdict: steady, sameFailOrNot: steadyFail };
  }
}

const base = path.join(OUT, "textbook.report");
fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 1));

// The human-readable report: what to fix, then what Sai will see.
const name = (l) => T.LINE_NAMES[l] || l;
const md = [`# Textbook test`, ``, `${results.length} models: ${counts.fail} fail, ${counts.review} go to Sai with reader notes, ${counts.pass} pass.${MEASURES_ONLY ? " Counting layer only." : ""}`, ``];
for (const verdict of ["fail", "review", "pass"]) {
  const rows = results.filter((r) => r.verdict === verdict);
  if (!rows.length) continue;
  md.push(`## ${verdict === "fail" ? "Fix before loading" : verdict === "review" ? "Load with the readers' notes" : "Pass"}`, ``);
  for (const r of rows) {
    md.push(`### ${r.id}${r.label ? ` (Sai: ${r.label})` : ""}`);
    for (const f of r.flags) md.push(`- Counted: ${f}`);
    for (const l of [...r.fails, ...r.reviews]) {
      md.push(`- ${name(l.line)}: ${l.votes.length} of ${r.readers} readers say no`);
      for (const v of l.votes.slice(0, 3)) md.push(`  - ${v.role}: "${v.evidence}"${v.fix ? ` Fix: ${v.fix}` : ""}`);
    }
    for (const n of r.notes) md.push(`- Note: ${n}`);
    if (r.pageNotes.length) md.push(`- Variety notes for the page check: ${r.pageNotes.length}`);
    md.push("");
  }
}
fs.writeFileSync(`${base}.md`, md.join("\n"));

if (args.options.sql) {
  const checkedAt = new Date().toISOString();
  const lines = results
    .filter((r) => r.verdict !== "fail")
    .map((r) => {
      const entry = JSON.stringify(T.checkEntry(r, { checkedAt }));
      return `update public.item_models set spec = jsonb_set(spec, '{checks}', coalesce(spec->'checks', '{}'::jsonb) || jsonb_build_object('textbook', ${sqlLiteral(entry)}::jsonb)) where id = ${sqlLiteral(r.id)} and review_status = 'draft';`;
    });
  fs.writeFileSync(args.options.sql, `begin;\n${lines.join("\n")}\ncommit;\n`);
}

console.log(`${results.length} models: ${counts.fail} fail, ${counts.review} review, ${counts.pass} pass${failedCalls ? ` (${failedCalls} reader calls failed)` : ""}`);
if (report.byLabel) for (const [label, k] of Object.entries(report.byLabel)) console.log(`  Sai ${label}: ${k.fail} fail, ${k.review} review, ${k.pass} pass (of ${k.n})`);
if (report.steadiness) console.log(`  same verdict in both panels: ${report.steadiness.sameVerdict} of ${report.steadiness.models}; same fail-or-not: ${report.steadiness.sameFailOrNot}`);
console.log(`report: ${base}.md`);
process.exit(counts.fail ? 1 : 0);
