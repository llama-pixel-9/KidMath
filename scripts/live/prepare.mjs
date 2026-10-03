#!/usr/bin/env node
/**
 * The live step for one topic and grade (plan C.2): from approved item
 * models to version-2 item_bank rows, as files for a human-approved write.
 * Nothing here touches the database; it reads an export folder (the
 * read-only SELECTs exportSql.mjs prints, saved as JSON) and writes SQL.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/live/prepare.mjs <topic> --grade 2 \
 *     --export <dir> --model <judge id> [--run <id>] [--base <manifest.js>] [--reviewer <uuid>]
 *
 * Stops at the first red step:
 *   1. The export: every table against its count(*); every item_bank
 *      identity (all statuses), FULL_ITEMS (with any committed manifests)
 *      and the script rows (calcItems.js) make the identity index. Rows of
 *      this topic and grade already live in the bank must be exactly the
 *      --base manifest's.
 *   2. Drift and holds: a model is filled only when the database approved
 *      it and its spec (minus `checks`) equals the repo's; an approved
 *      original whose "-2" fix is a draft is held (liveRules.planModels).
 *   3. Fill: each model seed by seed to its quota, through appGate (the row
 *      as the app will hold it), new questions only, no hint-pane example.
 *      Script rows (calcItems.js) of the topic go through the same gate.
 *   4. Layout: every new item at 390 px through the session's own card
 *      (layout.mjs); a spill drops the item and the next seed refills it.
 *   5. QC: blind solve and kid-safe, two passes each (qcPanels.mjs); an
 *      item flagged once is dropped and refilled, a model with an item
 *      flagged twice or 10% flagged is held.
 *   6. Coverage: every listed tier of every blueprint row has 8 or more
 *      items, unless it is deferred or waits on a draft or a hold; and what
 *      each catalog skill would serve.
 *   7. Output in <out>/<topic>/<run>/: manifest.js, sql/ (blueprint
 *      approval, switch row, insert chunks with read-only try files,
 *      checksum and per-row md5 queries), expected.json, expected-rows.json,
 *      items.json, receipt.json and report.md.
 *
 * --skip-layout and --skip-qc make a dry run: the report and items.json,
 * never a manifest or SQL (every gate must run before anything is written).
 *
 * Options: --quota 30, --max-seed 200, --status approved|draft (default by
 * topic: liveRules.writeStatusFor), --chunk-kb 100, --cache <dir> (QC
 * verdicts and calibration), --out qa-out/live, --max-ab 0.02.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BLUEPRINT_ROWS } from "../../src/blueprints/index.js";
import { calcBankItems } from "../../src/multiDigit/calcItems.js";
import { repoModelById, repoModelsFor } from "../../src/itemModels/repoModels.js";
import {
  FILL_QUOTA,
  HOLD_FLAG_RATE,
  MAX_AB_DISAGREEMENT,
  MAX_SEED,
  DEFERRED_ROWS,
  OLD_IOS_TOPICS,
  modelIdOfItem,
  planModels,
  writeStatusFor,
} from "../../src/itemModels/live/liveRules.js";
import {
  appGate,
  checksumOf,
  conceptExamples,
  defaultSeeds,
  exampleLeak,
  identityIndex,
  identityOf,
  itemFromIdentityRow,
  rowMd5s,
  selectFills,
  specMd5,
  toDbRow,
} from "../../src/itemModels/live/liveRows.js";
import { rowCoverage, skillServing } from "../../src/itemModels/live/liveCoverage.js";
import { refillManifest } from "../../src/itemBank/v2/modelRows.js";
import {
  checkExportCounts,
  fileSha,
  gitFacts,
  loadManifest,
  manifestModule,
  parseArgs,
  readCounts,
  readExportTable,
  sha256,
  stamp,
  writeJson,
  writeText,
} from "./lib/common.mjs";
import { blueprintApprovalSql, checkSql, insertChunks, switchSql } from "./lib/sql.mjs";
import { spilled } from "./layout.mjs";

const HELP = `prepare.mjs <topic> --grade <g> --export <dir> --model <judge id>
  [--run <id>] [--base <manifest.js>] [--reviewer <uuid>] [--status approved|draft]
  [--quota ${FILL_QUOTA}] [--max-seed ${MAX_SEED}] [--chunk-kb 100] [--cache <dir>] [--out qa-out/live]
  [--max-ab ${MAX_AB_DISAGREEMENT}] [--skip-layout] [--skip-qc]   (either skip: a dry run, no manifest or SQL)`;

class Stop extends Error {}
const stop = (msg) => {
  throw new Stop(msg);
};

// ── Step 1: the export ────────────────────────────────────────────────────

/**
 * Read and check an export folder. Returns { counts, models, blueprintRows,
 * switchRows, identities, files } or throws Stop with every problem.
 */
export function readExport(dir, { topic, grade }) {
  if (!existsSync(dir)) stop(`export folder ${dir} does not exist (scripts/live/exportSql.mjs prints the queries)`);
  const counts = readCounts(dir);
  const tables = {
    item_models: readExportTable(dir, "item_models"),
    blueprint_rows: readExportTable(dir, "blueprint_rows"),
    switch: readExportTable(dir, "switch"),
    identities: readExportTable(dir, "identities"),
  };
  const problems = checkExportCounts(tables, counts, { item_models: "id", blueprint_rows: "id", switch: "mode_id", identities: "item_id" });
  const g = String(grade);
  for (const r of tables.item_models.rows) if (r.mode_id !== topic || String(r.grade) !== g) problems.push(`item_models.json: ${r.id} is ${r.mode_id} grade ${r.grade}, not ${topic} grade ${g}`);
  for (const r of tables.blueprint_rows.rows) if (r.mode_id !== topic || String(r.grade) !== g) problems.push(`blueprint_rows.json: ${r.id} is ${r.mode_id} grade ${r.grade}`);
  for (const r of tables.item_models.rows) if (!/^[0-9a-f]{32}$/.test(String(r.spec_md5))) problems.push(`item_models.json: ${r.id} has no spec_md5`);
  if (problems.length) stop(`the export is not a whole read:\n  ${problems.join("\n  ")}`);
  const files = Object.fromEntries(Object.values(tables).flatMap((t) => t.files).map((f) => [f, fileSha(join(dir, f))]));
  files["counts.json"] = fileSha(join(dir, "counts.json"));
  return {
    counts,
    models: tables.item_models.rows,
    blueprintRows: tables.blueprint_rows.rows,
    switchRows: tables.switch.rows,
    identities: tables.identities.rows,
    files,
  };
}

/** Is a database identity row one of this topic and grade's live v2 rows? */
const liveHere = (row, topic, grade) => row.mode_id === topic && Number(row.version) === 2 && row.review_status !== "retired" && String(row.grade) === String(grade);

// ── Step 3: fill ──────────────────────────────────────────────────────────

/**
 * Fill every model in `fillModels` against a copy of `baseIndex`, in
 * order, skipping `skips` (Map itemId -> reason). Returns Map(modelId ->
 * selectFills result).
 */
function fillAll(fillModels, { baseIndex, quota, seeds, skips, examples }) {
  const taken = new Map(baseIndex);
  const out = new Map();
  for (const model of fillModels) {
    out.set(
      model.id,
      selectFills(model, {
        quota,
        seeds,
        taken,
        accept: appGate,
        avoid: (item) => exampleLeak(item, examples),
        skipIds: skips,
      })
    );
  }
  return out;
}

const reasonClass = (reason) => {
  if (/^same question as /.test(reason)) return "same question as a bank row";
  if (/hint example/.test(reason)) return "a hint-pane example";
  if (/^layout:/.test(reason)) return "layout spill";
  if (/^QC /.test(reason)) return "QC flag";
  if (/exists in the bank/.test(reason)) return "id exists in the bank (retired)";
  if (/fill threw/.test(reason)) return "fill threw";
  return "gate";
};

function countBy(list, key) {
  const out = {};
  for (const x of list) out[key(x)] = (out[key(x)] || 0) + 1;
  return out;
}

// ── The run ───────────────────────────────────────────────────────────────

export async function prepare(opts) {
  const {
    topic,
    grade,
    exportDir,
    run = `${topic}-g${grade}-${stamp()}`,
    basePath = null,
    reviewer = null,
    quota = FILL_QUOTA,
    maxSeed = MAX_SEED,
    chunkKb = 100,
    model: judge = null,
    cacheDir = "qa-out/live/qc-cache",
    outRoot = "qa-out/live",
    skipLayout = false,
    skipQc = false,
    maxAb = MAX_AB_DISAGREEMENT,
    log = () => {},
    layoutRunner = null,
    qcRunner = null,
  } = opts;
  const g = String(grade);
  const status = opts.status || writeStatusFor(topic);
  if (status === "approved" && OLD_IOS_TOPICS.includes(topic)) stop(`${topic} is shown by iPhone builds before #150: its v2 rows may be drafts at most (liveRules.OLD_IOS_TOPICS)`);
  if (!["approved", "draft"].includes(status)) stop(`--status approved or draft, not ${status}`);
  if (!skipQc && !judge) stop("QC needs a pinned judge: --model <id> (or --skip-qc for a dry run)");
  const dry = skipLayout || skipQc;
  const outDir = resolve(outRoot, topic, run);
  const notes = [];

  // 1. The export.
  log("1. export");
  const ex = readExport(exportDir, { topic, grade });

  const { FULL_ITEMS } = await import("../../src/itemBank/fullBank.js");
  const scriptAll = calcBankItems().filter((i) => i.modeId === topic && String(i.tags?.grade) === g);
  const scriptOther = calcBankItems().filter((i) => !(i.modeId === topic && String(i.tags?.grade) === g));

  let base = null;
  let baseItems = [];
  if (basePath) {
    base = await loadManifest(basePath);
    if (base.topic !== topic || String(base.grade) !== g) stop(`--base ${basePath} is ${base.topic} grade ${base.grade}`);
    if (base.status !== status) stop(`--base was written ${base.status}; this run is ${status}`);
    const refill = refillManifest(base);
    if (refill.problems.length) stop(`--base cannot be refilled: ${refill.problems.join("; ")}`);
    baseItems = refill.items;
  }
  const baseIds = new Set(baseItems.map((i) => i.itemId));
  const liveRows = ex.identities.filter((r) => liveHere(r, topic, g));
  const liveIds = new Set(liveRows.map((r) => r.item_id));
  const strangers = [...liveIds].filter((id) => !baseIds.has(id));
  if (strangers.length) stop(`${topic} grade ${g} already has ${liveIds.size} live v2 rows, ${strangers.length} of them not in ${basePath ? "--base" : "a base manifest (pass --base <its manifest>)"}: ${strangers.slice(0, 5).join(", ")}${strangers.length > 5 ? " ..." : ""}`);
  const unwritten = [...baseIds].filter((id) => !liveIds.has(id));
  if (unwritten.length) stop(`--base lists ${unwritten.length} rows the bank does not hold live (${unwritten.slice(0, 3).join(", ")} ...): write or retire them first`);

  // Item ids the bank already holds in any status: an insert would leave
  // them as they are, so a new pick may never reuse one.
  const skips = new Map();
  for (const r of ex.identities) if (r.mode_id === topic && !baseIds.has(r.item_id)) skips.set(r.item_id, `exists in the bank as ${r.review_status}`);

  const entries = [
    ...ex.identities.map((r) => ({ item: itemFromIdentityRow(r), status: r.review_status })),
    ...FULL_ITEMS.map((item) => ({ item, status: item.reviewStatus })),
    ...scriptOther.map((item) => ({ item, status: "script" })),
  ];
  const { index: baseIndex, duplicates: bankDuplicates } = identityIndex(entries);
  if (bankDuplicates.length) notes.push(`the bank already repeats ${bankDuplicates.length} questions (first: ${bankDuplicates[0].itemId} = ${bankDuplicates[0].sameAs}); not this run's to fix`);

  // 2. Drift and holds.
  log("2. drift and holds");
  const statuses = new Map(ex.models.map((m) => [m.id, m.review_status]));
  const plan = planModels(statuses);
  const repoModels = repoModelsFor(topic, g);
  const dbMd5 = new Map(ex.models.map((m) => [m.id, m.spec_md5]));
  const drift = [];
  const notInRepo = [];
  for (const [id, p] of plan) {
    if (p.state !== "fill") continue;
    const model = repoModelById(id);
    if (!model) notInRepo.push(id);
    else if (specMd5(model) !== dbMd5.get(id)) drift.push(id);
  }
  if (notInRepo.length) stop(`approved in the database but not in src/itemModels: ${notInRepo.join(", ")}`);
  if (drift.length) stop(`the repo and the database disagree on ${drift.length} approved models (spec minus checks): ${drift.join(", ")}. Sync the file to the database's spec (or put the change in as a "-2" draft) and rerun`);
  const notInDb = repoModels.filter((m) => !plan.has(m.id)).map((m) => m.id);
  if (notInDb.length) notes.push(`in the repo but not in the database (not filled): ${notInDb.join(", ")}`);

  let reviewedBy = reviewer;
  if (status === "approved" && !reviewedBy) {
    const who = [...new Set(ex.models.filter((m) => plan.get(m.id)?.state === "fill").map((m) => m.reviewed_by).filter(Boolean))];
    if (who.length !== 1) stop(`approved rows need one reviewer; the filled models name ${who.length} (${who.join(", ")}): pass --reviewer <uuid>`);
    reviewedBy = who[0];
  }

  // An approved row in a topic already switched to v2 would be live at once,
  // before anyone has played it at preview.
  const sw = ex.switchRows.find((r) => r.mode_id === topic);
  if (status === "approved" && sw && sw.live_version === "v2") stop(`${topic} is already switched to v2: approved rows would reach kids before anyone plays them at preview; switch it to preview first`);

  // Models this run fills: approved, unheld, not already in --base.
  const baseModelIds = new Set(Object.keys(base?.models || {}));
  const fillModels = repoModels.filter((m) => plan.get(m.id)?.state === "fill" && !baseModelIds.has(m.id));
  const qcHolds = new Map(); // modelId or script row -> reason

  // 3. Script rows: fixed rows, so a failure stops the run rather than refilling.
  log("3. fill");
  const baseScript = new Set(base?.scriptRows?.ids || []);
  const scriptNew = scriptAll.filter((i) => !baseScript.has(i.itemId));
  if (baseScript.size && scriptNew.length) stop(`the script makes ${scriptNew.length} rows --base does not list (${scriptNew[0].itemId} ...): script rows are written in one run; retire the base's and write them again`);
  const scriptProblems = [];
  const scriptIndex = new Map(baseIndex);
  for (const item of scriptNew) {
    if (skips.has(item.itemId)) {
      scriptProblems.push(`${item.itemId}: ${skips.get(item.itemId)}`);
      continue;
    }
    const gate = appGate(item);
    if (!gate.ok) scriptProblems.push(`${item.itemId}: ${gate.reasons.join("; ")}`);
    const owner = scriptIndex.get(identityOf(item));
    if (owner && owner.itemId !== item.itemId && owner.status !== "retired") scriptProblems.push(`${item.itemId}: same question as ${owner.itemId}`);
    scriptIndex.set(identityOf(item), { itemId: item.itemId, status: "script" });
  }
  if (scriptProblems.length) stop(`${scriptProblems.length} script rows fail the gate (src/multiDigit/calcItems.js makes them; fix the script):\n  ${scriptProblems.slice(0, 20).join("\n  ")}`);
  for (const item of [...baseItems, ...scriptNew]) scriptIndex.set(identityOf(item), { itemId: item.itemId, status: "picked" });

  // 3-5 loop: fill, sweep and judge the new items; drop, hold and refill until nothing changes.
  const seeds = defaultSeeds(maxSeed);
  const examples = conceptExamples(topic);
  const layoutResults = new Map();
  const qcVerdicts = new Map();
  const qcReceipts = [];
  const dropped = new Map(); // itemId -> reason (layout or QC)
  const layoutHolds = new Map();
  let fills;
  let scriptKept = scriptNew;
  let round = 0;
  const scriptRowOf = new Map(scriptNew.map((i) => [i.itemId, i.blueprintId]));
  const groupOf = (id) => (scriptRowOf.has(id) ? `script:${scriptRowOf.get(id)}` : modelIdOfItem(id) || id);
  for (;;) {
    round += 1;
    if (round > 8) stop("fill, layout and QC have not settled after 8 rounds");
    const active = fillModels.filter((m) => !qcHolds.has(m.id) && !layoutHolds.has(m.id));
    fills = fillAll(active, { baseIndex: scriptIndex, quota, seeds, skips: new Map([...skips, ...dropped]), examples });
    scriptKept = scriptNew.filter((i) => !dropped.has(i.itemId) && !qcHolds.has(`script:${i.blueprintId}`) && !layoutHolds.has(`script:${i.blueprintId}`));
    const current = [...[...fills.values()].flatMap((r) => r.picks.map((p) => p.item)), ...scriptKept];
    log(`   round ${round}: ${current.length} items (${active.length} models, ${scriptKept.length} script rows)`);
    let changed = false;

    // 4. Layout.
    if (!skipLayout) {
      const fresh = current.filter((i) => !layoutResults.has(i.itemId));
      if (fresh.length) {
        log(`4. layout: ${fresh.length} new items`);
        const runner = layoutRunner || (await import("./layout.mjs")).runLayout;
        const results = await runner(fresh, { outDir: join(outDir, "layout"), log });
        for (const item of fresh) {
          const r = results.get(item.itemId);
          if (!r) stop(`layout returned nothing for ${item.itemId}`);
          layoutResults.set(item.itemId, r);
        }
      }
      const spills = current.filter((i) => spilled(layoutResults.get(i.itemId)));
      for (const item of spills) {
        const r = layoutResults.get(item.itemId);
        dropped.set(item.itemId, `layout: ${r.err ? r.err : `spills ${r.spill}px`}`);
        changed = true;
      }
      // A model (or script row) whose sweeps spill at the hold rate is held.
      const byGroup = new Map();
      for (const [id, r] of layoutResults) {
        const k = groupOf(id);
        if (!byGroup.has(k)) byGroup.set(k, { n: 0, bad: 0 });
        byGroup.get(k).n += 1;
        if (spilled(r)) byGroup.get(k).bad += 1;
      }
      for (const [k, v] of byGroup) {
        if (!layoutHolds.has(k) && v.bad / v.n >= HOLD_FLAG_RATE) {
          layoutHolds.set(k, `layout: ${v.bad} of ${v.n} items spill past the card`);
          changed = true;
        }
      }
    }

    // 5. QC.
    if (!skipQc) {
      const fresh = current.filter((i) => !qcVerdicts.has(i.itemId) && !dropped.has(i.itemId));
      if (fresh.length) {
        log(`5. QC: ${fresh.length} new items`);
        const qc = qcRunner || (await import("./qcPanels.mjs"));
        const calibration = qc.loadCalibration(cacheDir, judge);
        if (!calibration) stop(`no calibration for judge ${judge} and the current prompts: run qcPanels.mjs --calibrate --model ${judge} first`);
        const { verdicts, receipt } = await qc.runPanels(fresh, { model: judge, cacheDir, calibration, maxAb, canaryPool: current, log });
        qcReceipts.push(receipt);
        for (const [id, v] of verdicts) qcVerdicts.set(id, v);
      }
      const qc = qcRunner || (await import("./qcPanels.mjs"));
      for (const item of current) {
        const v = qcVerdicts.get(item.itemId);
        if (v && !qc.passedAll(v) && !dropped.has(item.itemId)) {
          const why = ["blind", "kidSafe"].flatMap((gate) => ["A", "B"].filter((p) => v[gate]?.[p]?.flagged).map((p) => `${gate} ${p}: ${v[gate][p].reason}`));
          dropped.set(item.itemId, `QC ${why.join(" | ")}`);
          changed = true;
        }
      }
      for (const [k, m] of qc.modelFlags(qcVerdicts, { groupOf })) {
        if (m.held && !qcHolds.has(k)) {
          const reasons = [...m.twice, ...m.once].slice(0, 4).map((id) => `${id}: ${dropped.get(id) || "flagged"}`);
          qcHolds.set(k, `QC: ${m.twice.length} items flagged in both passes, ${m.once.length} in one, of ${m.checked} checked (${reasons.join("; ")})`);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // The plan as it stands after the gates: QC and layout holds count as held.
  const finalPlan = new Map(plan);
  for (const [k, reason] of [...qcHolds, ...layoutHolds]) if (finalPlan.has(k)) finalPlan.set(k, { state: "held", reason, by: null });
  const newItems = [...[...fills.values()].flatMap((r) => r.picks.map((p) => p.item)), ...scriptKept];
  const allItems = [...baseItems, ...newItems];

  // 6. Coverage.
  log("6. coverage");
  const rows = BLUEPRINT_ROWS.filter((r) => r.mode_id === topic && String(r.grade) === g);
  const dbRowIds = new Set(ex.blueprintRows.map((r) => r.id));
  const rowDrift = [...rows.filter((r) => !dbRowIds.has(r.id)).map((r) => `${r.id} not in the database`), ...ex.blueprintRows.filter((r) => !rows.some((x) => x.id === r.id)).map((r) => `${r.id} not in src/blueprints`)];
  if (rowDrift.length) stop(`blueprint rows differ between the repo and the database: ${rowDrift.join(", ")}`);
  const struck = ex.blueprintRows.filter((r) => !["draft", "approved"].includes(r.status)).map((r) => r.id);
  const servedStruck = allItems.filter((i) => struck.includes(i.blueprintId));
  if (servedStruck.length) stop(`items serve blueprint rows that are not draft or approved: ${[...new Set(servedStruck.map((i) => i.blueprintId))].join(", ")}`);
  const coverage = rowCoverage({ rows, items: allItems, models: repoModels.map((m) => ({ id: m.id, blueprintId: m.blueprintId, difficulty: m.difficulty })), plan: finalPlan, deferred: DEFERRED_ROWS });
  const serving = skillServing({ topic, grade: g, items: allItems });

  // The rows and their checksum.
  const kidSafeOf = (item) =>
    skipQc ? null : { ok: true, hits: [], checked_at: qcReceipts.at(-1)?.createdAt ?? null, passes: 2, receipt: sha256(JSON.stringify(qcReceipts.map((r) => r.itemsSha))) };
  const specOf = (id) => dbMd5.get(id);
  const runOf = (item) => {
    if (baseIds.has(item.itemId)) return item.source?.run ?? null;
    return run;
  };
  const dbRows = allItems.map((item) =>
    toDbRow(item, { status, run: runOf(item), specMd5: item.itemModelId ? specOf(item.itemModelId) : null, kidSafe: baseIds.has(item.itemId) ? null : kidSafeOf(item) })
  );
  const newRows = dbRows.filter((r) => !baseIds.has(r.item_id));
  const checksum = checksumOf(dbRows);
  const itemsSha = sha256(JSON.stringify(allItems.map((i) => [i.itemId, sha256(JSON.stringify(i.question)), sha256(JSON.stringify(i.hint ?? null))])));

  // Every new item must carry a clean layout and QC verdict.
  const missingVerdicts = [];
  if (!skipLayout) for (const i of newItems) if (!layoutResults.has(i.itemId)) missingVerdicts.push(`${i.itemId}: no layout result`);
  if (!skipQc) {
    const qc = qcRunner || (await import("./qcPanels.mjs"));
    for (const i of newItems) if (!qc.passedAll(qcVerdicts.get(i.itemId))) missingVerdicts.push(`${i.itemId}: not cleared by QC`);
  }
  if (missingVerdicts.length) stop(`items without a clean verdict: ${missingVerdicts.slice(0, 5).join("; ")}`);

  // The manifest.
  const manifest = {
    topic,
    grade: g,
    status,
    run,
    rows: dbRows.length,
    md5: checksum,
    models: {
      ...(base?.models || {}),
      ...Object.fromEntries(
        [...fills].filter(([, r]) => r.picks.length).map(([id, r]) => [id, { specMd5: dbMd5.get(id), seeds: r.picks.map((p) => p.seed), run }])
      ),
    },
    scriptRows: scriptAll.length
      ? { run: base?.scriptRows?.ids?.length ? base.scriptRows.run : run, ids: [...(base?.scriptRows?.ids || []), ...scriptKept.map((i) => i.itemId)] }
      : null,
    runs: [...new Set([...(base?.runs || (base ? [base.run] : [])), run])],
    // Tiers with no items yet that wait on a model (held, or a draft fix):
    // liveStep.spec accepts these and the deferred rows, nothing else.
    waiting: coverage.waiting.map((w) => ({ rowId: w.rowId, tier: w.tier, state: w.state, note: w.note })),
  };
  if (!manifest.scriptRows) delete manifest.scriptRows;

  // Report facts.
  const perModel = [...fills].map(([id, r]) => ({
    id,
    picks: r.picks.length,
    short: r.short,
    skipped: countBy(r.skipped, (s) => reasonClass(s.reason)),
    retiredMatches: r.retiredMatches.length,
  }));
  const stateList = (state) => [...finalPlan].filter(([, p]) => p.state === state).map(([id, p]) => ({ id, reason: p.reason }));
  const result = {
    run,
    topic,
    grade: g,
    status,
    dry,
    outDir,
    counts: { rows: dbRows.length, newRows: newRows.length, baseRows: baseItems.length, models: Object.keys(manifest.models).length, scriptRows: manifest.scriptRows?.ids.length ?? 0 },
    checksum,
    itemsSha,
    plan: { fill: fillModels.length, held: stateList("held"), pending: stateList("pending"), skip: stateList("skip"), superseded: stateList("superseded") },
    perModel,
    dropped: Object.fromEntries(dropped),
    holds: Object.fromEntries([...qcHolds, ...layoutHolds]),
    coverage,
    serving,
    notes,
    manifest,
    qc: skipQc
      ? null
      : {
          judge: qcReceipts[0]?.judge ?? null,
          calls: qcReceipts.reduce((n, r) => n + r.calls, 0),
          disagreement: qcReceipts.map((r) => r.disagreement),
          receipts: qcReceipts.map((r) => r.itemsSha),
        },
    layout: skipLayout ? null : { swept: layoutResults.size, spilled: [...layoutResults.values()].filter(spilled).length },
  };

  // 7. Output.
  writeJson(join(outDir, "items.json"), allItems);
  const receipt = {
    kind: "live-step",
    run,
    topic,
    grade: g,
    status,
    dry,
    createdAt: new Date().toISOString(),
    git: gitFacts(),
    export: { dir: resolve(exportDir), counts: ex.counts, files: ex.files },
    options: { quota, maxSeed, basePath, reviewer: reviewedBy, skipLayout, skipQc, maxAb },
    itemsSha,
    itemsJsonSha: fileSha(join(outDir, "items.json")),
    checksum,
    counts: result.counts,
    plan: result.plan,
    holds: result.holds,
    dropped: result.dropped,
    layout: result.layout,
    qc: result.qc ? { ...result.qc, receipts: qcReceipts } : null,
    coverage: { gaps: coverage.gaps, waiting: coverage.waiting },
    serving: serving.map((s) => ({ skillId: s.skillId, count: s.count, gap: s.gap, holes: s.holes })),
  };
  writeJson(join(outDir, "receipt.json"), receipt);
  writeText(join(outDir, "report.md"), reportMd(result));

  if (coverage.gaps.length && !dry) {
    stop(`coverage has ${coverage.gaps.length} gaps (${coverage.gaps.slice(0, 4).map((x) => `${x.rowId} ${x.tier} ${x.state}`).join(", ")}); see ${join(outDir, "report.md")}`);
  }
  if (dry) {
    log(`dry run (${[skipLayout && "layout", skipQc && "QC"].filter(Boolean).join(" and ")} skipped): no manifest or SQL`);
    return result;
  }

  writeText(join(outDir, "manifest.js"), manifestModule(manifest));
  const sqlDir = join(outDir, "sql");
  const draftRows = ex.blueprintRows.filter((r) => r.status === "draft").map((r) => r.id);
  if (status === "approved") {
    const bp = blueprintApprovalSql(draftRows, { reviewedBy, run });
    if (bp) writeText(join(sqlDir, "01-blueprints.sql"), bp);
    if (!ex.switchRows.some((r) => r.mode_id === topic)) writeText(join(sqlDir, "02-switch.sql"), switchSql(topic, { run }));
  }
  const chunks = insertChunks(newRows, { run, topic, grade: g, status, reviewedBy, chunkKb });
  for (const c of chunks) {
    writeText(join(sqlDir, `03-${c.name}.sql`), c.sql);
    writeText(join(sqlDir, "try", `${c.name}.try.sql`), c.trySql);
  }
  const check = checkSql(topic, g, { rows: dbRows.length, checksum, run });
  writeText(join(sqlDir, "90-checksum.sql"), check.checksum);
  writeText(join(sqlDir, "91-rows.sql"), check.rows);
  writeJson(join(outDir, "expected.json"), { run, topic, grade: g, rows: dbRows.length, checksum, chunks: chunks.map((c) => ({ name: c.name, rows: c.rows, checksum: c.checksum })) });
  writeJson(join(outDir, "expected-rows.json"), rowMd5s(dbRows));
  result.chunks = chunks.length;
  return result;
}

// ── report.md ─────────────────────────────────────────────────────────────

function reportMd(r) {
  const L = [];
  L.push(`# Live step ${r.run}: ${r.topic}, grade ${r.grade}`);
  L.push("");
  L.push(`${r.dry ? "**Dry run** (a gate was skipped): no manifest or SQL. " : ""}${r.counts.rows} rows written ${r.status} (${r.counts.newRows} new, ${r.counts.baseRows} from the base manifest): ${r.counts.models} models, ${r.counts.scriptRows} script rows. Checksum \`${r.checksum}\`.`);
  L.push("");
  L.push("## Models");
  L.push("");
  L.push(`Filled ${r.plan.fill}; held ${r.plan.held.length}; waiting as drafts ${r.plan.pending.length}; rejected or flagged ${r.plan.skip.length}; superseded ${r.plan.superseded.length}.`);
  L.push("");
  if (r.plan.held.length) {
    L.push("Held:");
    for (const h of r.plan.held) L.push(`- ${h.id}: ${h.reason}`);
    L.push("");
  }
  L.push("| Model | Items | Short | Skipped |");
  L.push("|---|---|---|---|");
  for (const m of r.perModel) L.push(`| ${m.id} | ${m.picks} | ${m.short ? "yes" : ""} | ${Object.entries(m.skipped).map(([k, n]) => `${k} ${n}`).join(", ")} |`);
  L.push("");
  if (r.layout) L.push(`Layout: ${r.layout.swept} items swept at 390 px, ${r.layout.spilled} spilled (dropped and refilled).`);
  if (r.qc) {
    L.push(`QC: judge ${r.qc.judge?.model}, ${r.qc.calls} calls; A/B disagreement per run: ${r.qc.disagreement.map((d) => Object.entries(d).map(([gname, x]) => `${gname} ${x.differ}/${x.items}`).join(", ")).join("; ")}.`);
  }
  const drops = Object.entries(r.dropped);
  if (drops.length) {
    L.push("");
    L.push(`Dropped (${drops.length}):`);
    for (const [id, why] of drops.slice(0, 40)) L.push(`- ${id}: ${why}`);
  }
  L.push("");
  L.push("## Coverage");
  L.push("");
  L.push("| Row | Tier | Items | State | Note |");
  L.push("|---|---|---|---|---|");
  for (const row of r.coverage.rows) for (const t of row.tiers) L.push(`| ${row.rowId} | ${t.tier} | ${t.count} | ${t.state} | ${t.note.replace(/\|/g, "/")} |`);
  L.push("");
  L.push(`Gaps: ${r.coverage.gaps.length}. Waiting (held or draft): ${r.coverage.waiting.length}.`);
  L.push("");
  L.push("## What each skill serves");
  L.push("");
  L.push("| Skill | Items | Rows | Families | Tiers |");
  L.push("|---|---|---|---|---|");
  for (const s of r.serving) {
    L.push(`| ${s.skillId}${s.gap ? " (GAP)" : ""} | ${s.count} | ${s.rows} | ${Object.entries(s.families).map(([f, n]) => `${f} ${n}`).join(", ")} | ${Object.entries(s.tiers).map(([t, n]) => `${t} ${n}`).join(", ")} |`);
  }
  if (r.notes.length) {
    L.push("");
    L.push("## Notes");
    L.push("");
    for (const n of r.notes) L.push(`- ${n}`);
  }
  L.push("");
  return `${L.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    flags: ["help", "skip-layout", "skip-qc"],
    options: ["grade", "export", "run", "base", "reviewer", "status", "quota", "max-seed", "chunk-kb", "model", "cache", "out", "max-ab"],
  });
  const topic = args.positional[0];
  if (args.flags.has("help") || !topic || !args.options.grade || !args.options.export) {
    process.stdout.write(`${HELP}\n`);
    return args.flags.has("help") ? 0 : 2;
  }
  const num = (k, d) => (args.options[k] != null ? Number(args.options[k]) : d);
  const r = await prepare({
    topic,
    grade: args.options.grade,
    exportDir: args.options.export,
    run: args.options.run,
    basePath: args.options.base || null,
    reviewer: args.options.reviewer || null,
    status: args.options.status || null,
    quota: num("quota", FILL_QUOTA),
    maxSeed: num("max-seed", MAX_SEED),
    chunkKb: num("chunk-kb", 100),
    model: args.options.model || null,
    cacheDir: args.options.cache || "qa-out/live/qc-cache",
    outRoot: args.options.out || "qa-out/live",
    maxAb: num("max-ab", MAX_AB_DISAGREEMENT),
    skipLayout: args.flags.has("skip-layout"),
    skipQc: args.flags.has("skip-qc"),
    log: (m) => process.stderr.write(`${m}\n`),
  });
  process.stdout.write(
    `${r.dry ? "DRY RUN " : ""}${r.topic} grade ${r.grade}: ${r.counts.rows} rows (${r.counts.newRows} new), checksum ${r.checksum}; held ${r.plan.held.length}, waiting ${r.coverage.waiting.length}, gaps ${r.coverage.gaps.length}, serving gaps ${r.serving.filter((s) => s.gap).length}\n${r.outDir}\n`
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`prepare: ${err instanceof Stop ? "STOP: " : ""}${err.message}\n`);
      process.exit(err instanceof Stop ? 1 : 2);
    });
}
