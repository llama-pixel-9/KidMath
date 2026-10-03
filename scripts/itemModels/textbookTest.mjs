/**
 * The textbook test (scripts/itemModels/textbookTest.js has the design).
 * Run it on every new model after the harness passes, before the model is
 * loaded into Sai's queue:
 *
 *   npm run models:textbook -- <models.json> [more.json ...] [options]
 *
 * Options:
 *   --only id,id      just these models
 *   --runs N          reader runs per role: 2 (3 roles x 2 = 6 votes, what the
 *                     vote rule is set for); more only with --calibrate
 *   --measures-only   the counting layer only (no model calls; same answer
 *                     every run). Never with --sql: a counts-only pass is not
 *                     a textbook-test pass.
 *   --out DIR         where the report goes (default: next to the first input)
 *   --sql PATH        also write SQL that stores each model's verdict in
 *                     item_models.spec.checks.textbook (drafts only), which
 *                     the review screen shows as a card
 *   --batch N         models per reader call (default 4)
 *   --concurrency N   reader calls at once (default 8)
 *   --calibrate       inputs are [{ id, label, model }] (label = Sai's call);
 *                     prints agreement by label, and with --runs 4 compares
 *                     two independent panels (runs 1-2 vs 3-4)
 *
 * Verdicts: fail = fix the model before loading it; review = load it, the
 * readers' quotes go to Sai beside it; pass; incomplete = some reader replies
 * never came back after a retry, so rerun it (nothing is stored for it).
 * Exit 1 when any model fails or is incomplete. The report is
 * <first input>.textbook.md and .json. Needs the `claude` CLI on PATH unless
 * --measures-only.
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
const usage = (msg) => {
  console.error(msg);
  process.exit(2);
};
const positiveInt = (name, fallback) => {
  const raw = args.options[name] ?? fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) usage(`--${name} must be a whole number of 1 or more (got ${raw})`);
  return n;
};
const RUNS = positiveInt("runs", T.DEFAULT_RUNS);
const BATCH = positiveInt("batch", 4);
const CONC = positiveInt("concurrency", 8);
const MEASURES_ONLY = args.flags.has("measures-only");
const CALIBRATE = args.flags.has("calibrate");
const ONLY = args.options.only ? new Set(args.options.only.split(",")) : null;
const OUT = args.options.out || path.dirname(args.positional[0]);
if (MEASURES_ONLY && args.options.sql) usage("--sql needs the readers: a counts-only run would store a pass no reader gave. Drop --measures-only or --sql.");
// The vote rule is set for one panel of DEFAULT_RUNS runs. More runs are
// for --calibrate, which compares independent panels.
if (!MEASURES_ONLY && RUNS !== T.DEFAULT_RUNS && !(CALIBRATE && RUNS % T.DEFAULT_RUNS === 0)) {
  usage(`--runs is ${T.DEFAULT_RUNS} (${T.ROLES.length * T.DEFAULT_RUNS} votes, what the vote rule is set for); with --calibrate it may be a multiple of ${T.DEFAULT_RUNS}`);
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
  const has = (id, run, role) => replies.get(id).some((r) => r.run === run && r.role === role);
  const ask = async ({ run, role, batch }) => {
    const prompt = batch.map((e) => T.modelBlock(e.id, e.model.grade, reads.get(e.id))).join("\n\n---\n\n");
    const inBatch = new Set(batch.map((e) => e.id));
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const arr = extractJsonArray(await runClaude(prompt, { system: T.systemFor(role) }));
        // One reply per model, run and role, and only for models in this batch.
        for (const rep of arr) {
          if (rep?.modelId && inBatch.has(rep.modelId) && !has(rep.modelId, run, role)) replies.get(rep.modelId).push({ run, role, lines: rep.lines || {} });
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
  const runAll = async (list, label) => {
    let next = 0;
    let done = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONC, list.length) }, async () => {
        while (next < list.length) {
          await ask(list[next++]);
          if (++done % 10 === 0 || done === list.length) process.stderr.write(`${done}/${list.length} ${label}\n`);
        }
      }),
    );
  };
  await runAll(tasks, "reader calls");
  // A reader can leave a model out of its answer, or a call can fail: ask
  // once more for just the missing replies.
  const retries = [];
  for (let run = 1; run <= RUNS; run++) {
    for (const role of T.ROLES) {
      const missing = entries.filter((e) => !has(e.id, run, role));
      for (let i = 0; i < missing.length; i += BATCH) retries.push({ run, role, batch: missing.slice(i, i + BATCH) });
    }
  }
  if (retries.length) await runAll(retries, "retry calls for missing replies");
}

// Score: one panel per DEFAULT_RUNS runs.
const panels = [];
for (let r = 1; r <= (MEASURES_ONLY ? 0 : RUNS); r += T.DEFAULT_RUNS) panels.push(Array.from({ length: T.DEFAULT_RUNS }, (_, i) => r + i));
const expected = T.ROLES.length * T.DEFAULT_RUNS;
const results = entries.map((e) => {
  const m = measures.get(e.id);
  const scores = MEASURES_ONLY
    ? [T.scoreModel(m, [])]
    : panels.map((p) =>
        T.scorePanel(m, replies.get(e.id).filter((r) => p.includes(r.run)), { expected }),
      );
  // The verdict is panel 1's (the only panel outside --calibrate).
  return { id: e.id, label: e.label, stats: m.stats, ...scores[0], panels: scores.length > 1 ? scores.map((s) => s.verdict) : undefined };
});

const counts = { pass: 0, review: 0, fail: 0, incomplete: 0 };
for (const r of results) counts[r.verdict]++;
const report = { measuresOnly: MEASURES_ONLY, runs: MEASURES_ONLY ? 0 : RUNS, failedCalls, counts, results };

// Calibration: agreement with Sai's calls, and panel-to-panel steadiness.
if (CALIBRATE) {
  const byLabel = {};
  for (const r of results) {
    const k = (byLabel[r.label ?? "unlabelled"] ||= { n: 0, pass: 0, review: 0, fail: 0, incomplete: 0 });
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

const base = path.join(OUT, `${path.basename(args.positional[0]).replace(/\.json$/i, "")}.textbook`);
fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 1));

// The human-readable report: what to fix, then what Sai will see.
const name = (l) => T.LINE_NAMES[l] || l;
const md = [
  `# Textbook test`,
  ``,
  `${results.length} models: ${counts.fail} fail, ${counts.review} go to Sai with reader notes, ${counts.pass} pass${counts.incomplete ? `, ${counts.incomplete} incomplete (rerun them)` : ""}.${MEASURES_ONLY ? " Counting layer only." : ""}`,
  ``,
];
const HEADINGS = { fail: "Fix before loading", incomplete: "Incomplete: reader replies missing, rerun", review: "Load with the readers' notes", pass: "Pass" };
for (const verdict of ["fail", "incomplete", "review", "pass"]) {
  const rows = results.filter((r) => r.verdict === verdict);
  if (!rows.length) continue;
  md.push(`## ${HEADINGS[verdict]}`, ``);
  for (const r of rows) {
    md.push(`### ${r.id}${r.label ? ` (Sai: ${r.label})` : ""}`);
    for (const f of r.flags) md.push(`- Counted: ${f}`);
    for (const l of [...r.fails, ...r.reviews]) {
      md.push(`- ${name(l.line)}: ${l.votes.length} of ${r.readers} readers say no`);
      for (const v of l.votes.slice(0, 3)) md.push(`  - ${v.role}: "${v.evidence}"${v.fix ? ` Fix: ${v.fix}` : ""}`);
    }
    for (const n of r.notes) md.push(`- Note: ${n}`);
    if (r.pageNotes.length) {
      md.push(`- Variety (a note for the page check, fails nothing): ${r.pageNotes.length} reader${r.pageNotes.length === 1 ? "" : "s"}`);
      for (const v of r.pageNotes.slice(0, 3)) md.push(`  - ${v.role}: "${v.evidence}"${v.fix ? ` Fix: ${v.fix}` : ""}`);
    }
    md.push("");
  }
}
fs.writeFileSync(`${base}.md`, md.join("\n"));

if (args.options.sql) {
  const checkedAt = new Date().toISOString();
  // Every verdict but incomplete, fails included, so a rerun on a loaded
  // draft replaces its old card. Drafts only.
  const lines = results
    .filter((r) => r.verdict !== "incomplete")
    .map((r) => T.checkSql(r.id, T.checkEntry(r, { checkedAt }), sqlLiteral));
  fs.writeFileSync(args.options.sql, `begin;\n${lines.join("\n")}\ncommit;\n`);
}

console.log(`${results.length} models: ${counts.fail} fail, ${counts.review} review, ${counts.pass} pass${counts.incomplete ? `, ${counts.incomplete} incomplete` : ""}${failedCalls ? ` (${failedCalls} reader calls failed)` : ""}`);
if (report.byLabel) for (const [label, k] of Object.entries(report.byLabel)) console.log(`  Sai ${label}: ${k.fail} fail, ${k.review} review, ${k.pass} pass (of ${k.n})`);
if (report.steadiness) console.log(`  same verdict in both panels: ${report.steadiness.sameVerdict} of ${report.steadiness.models}; same fail-or-not: ${report.steadiness.sameFailOrNot}`);
console.log(`report: ${base}.md`);
process.exit(counts.fail || counts.incomplete ? 1 : 0);
