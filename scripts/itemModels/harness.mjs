/**
 * Item model harness: validates a JSON file of item models the way the repo's
 * itemModels.spec does, and prints what a reviewer would see.
 *
 * Run from the repo root:
 *   npm run models:harness -- path/to/models.json
 * Options:
 *   --seeds N        fills per model (default 200)
 *   --samples N      sample prompts to print per model (default 6)
 *   --report path    write the JSON report here (default: next to the input, .report.json)
 *   --items path     also write filled items (first --per seeds per model) for the QC scripts
 *   --per N          items per model in --items (default 5)
 *   --quiet          only the summary lines
 * Exit 1 when any model fails.
 */
import fs from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const imp = (p) => import(path.join(REPO, p));
const { fill } = await imp("src/itemModels/fill.js");
const { validateModel } = await imp("src/itemModels/validate.js");
const { runChecks } = await imp("src/itemBank/qc/checks.js");
const { validateBankItem } = await imp("src/itemBank/index.js");
const { hintContainsAnswer, validateHint } = await imp("src/hints/hintSchema.js");
const { findKidSafeHits } = await imp("src/content/kidSafeList.js");

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const flag = (name) => args.includes(name);
const file = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
if (!file) {
  console.error("usage: harness.mjs <models.json> [--seeds N] [--samples N] [--report path] [--items path] [--per N] [--quiet]");
  process.exit(2);
}
const SEEDS = Number(opt("--seeds", 200));
const SAMPLES = Number(opt("--samples", 6));
const PER = Number(opt("--per", 5));
const reportPath = opt("--report", file.replace(/\.json$/, "") + ".report.json");
const itemsPath = opt("--items", null);
const quiet = flag("--quiet");

let models = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(models)) models = models.models || Object.values(models);

const report = { file, models: [], ok: true, counts: { models: models.length, failed: 0 } };
const emitted = [];
const seenIds = new Set();

for (const model of models) {
  const r = { id: model?.id, ok: true, errors: [], warnings: [], samples: [], stats: {} };
  report.models.push(r);
  const err = (m) => {
    r.ok = false;
    r.errors.push(m);
  };
  const warn = (m) => r.warnings.push(m);
  if (!model || typeof model !== "object") {
    err("not an object");
    continue;
  }
  if (seenIds.has(model.id)) err(`duplicate id ${model.id}`);
  seenIds.add(model.id);
  const grade = String(model.grade);
  const idPattern = new RegExp(`^money-g${grade}-[a-z0-9]+(?:-[a-z0-9]+)*-(easy|moderate|hard)(?:-\\d+)?$`, "i");
  if (!idPattern.test(String(model.id))) warn(`id "${model.id}" does not follow money-g${grade}-<shape>-<difficulty>[-n]`);
  if (model.modeId !== "money") err(`modeId must be "money"`);
  if (!["2", "3", "4", "5"].includes(grade)) err(`grade must be "2", "3", "4" or "5"`);
  if (grade === "2" && !model.standards?.ccss?.includes("2.MD.C.8")) err("standards.ccss must include 2.MD.C.8");
  if (grade !== "2" && !(model.standards?.ccss?.length > 0)) err("standards.ccss must name at least one standard");
  const v = validateModel(model);
  if (!v.ok) {
    for (const e of v.errors) err(`validateModel: ${e}`);
    continue;
  }
  // Kid-safe list over every string in the spec (template, hints, options).
  const specText = JSON.stringify(model);
  const hits = findKidSafeHits ? findKidSafeHits(specText) : [];
  if (hits && hits.length) err(`kid-safe list hits in the spec: ${hits.map((h) => h.term || h).join(", ")}`);

  const prompts = new Set();
  const answers = new Set();
  const failCounts = {};
  const warnCounts = {};
  let dropped = 0;
  let noExample = 0;
  let filled = 0;
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    let item;
    try {
      item = fill(model, { seed });
    } catch (e) {
      err(`seed ${seed}: fill threw: ${e.message}`);
      break;
    }
    filled += 1;
    const q = item.question;
    const prompt = q.display.promptText;
    // A picture-first item repeats its text; the pictured coins make it a
    // different question (validateBank keys duplicates the same way).
    if (seed <= 40) prompts.add(Array.isArray(q.display.coins) && q.display.coins.length ? `${prompt}|${q.display.coins.join(",")}` : prompt);
    answers.add(String(q.answer));
    const bv = validateBankItem(item);
    if (bv.errors?.length) err(`seed ${seed}: validateBankItem: ${bv.errors.join("; ")}`);
    const qc = runChecks(item);
    for (const f of qc.findings) {
      const key = `${f.id}: ${f.message}`;
      if (f.severity === "fail") {
        failCounts[f.id] = (failCounts[f.id] || 0) + 1;
        if (failCounts[f.id] <= 2) err(`seed ${seed}: ${key}`);
      } else if (f.severity === "warn") {
        warnCounts[f.id] = (warnCounts[f.id] || 0) + 1;
        if (warnCounts[f.id] === 1) warn(`seed ${seed}: ${key}`);
      }
    }
    if (!q.choices.includes(q.answer)) err(`seed ${seed}: key not among choices`);
    if (new Set(q.choices).size !== q.choices.length) err(`seed ${seed}: duplicate choices ${JSON.stringify(q.choices)}`);
    if (q.choices.length < 3) err(`seed ${seed}: only ${q.choices.length} choices (a dropped distractor?)`);
    const hv = validateHint(item.hint);
    if (!hv.ok) err(`seed ${seed}: hint: ${hv.errors.join("; ")}`);
    if (hintContainsAnswer(item.hint, q.answer)) err(`seed ${seed}: a hint layer the kid reads before answering states the key`);
    if (item.tags.notes.length) dropped += 1;
    if (item.hint.example == null && model.hint.example != null) noExample += 1;
    const coins = q.display.coins;
    if (Array.isArray(coins) && coins.length > 8) err(`seed ${seed}: ${coins.length} coins pictured (limit 8)`);
    if (Array.isArray(coins) && coins.length === 0 && q.answerType === "coinTray") err(`seed ${seed}: coinTray widget with an empty tray`);
    if (prompt.length > 220) err(`seed ${seed}: prompt ${prompt.length} chars`);
    if (seed <= SAMPLES) {
      r.samples.push({ seed, prompt, answer: q.answer, choices: q.choices, answerType: q.answerType, coins: coins ?? null, mistakes: item.tags.mistakes, objects: item.tags.objects, setting: item.tags.setting });
    }
    if (seed === 1) r.hintSample = item.hint;
    if (itemsPath && seed <= PER) emitted.push(item);
  }
  // A state fill must also work (FL writes $0.45; TX swaps words).
  for (const state of ["FL", "TX"]) {
    for (let seed = 1; seed <= Math.min(20, SEEDS); seed += 1) {
      try {
        const item = fill(model, { seed, state });
        const qc = runChecks(item);
        const f = qc.findings.find((x) => x.severity === "fail");
        if (f) {
          err(`state ${state} seed ${seed}: ${f.id}: ${f.message}`);
          break;
        }
      } catch (e) {
        err(`state ${state} seed ${seed}: fill threw: ${e.message}`);
        break;
      }
    }
  }
  r.stats = { filled, uniquePromptsIn40: prompts.size, uniqueAnswers: answers.size, droppedDistractorFills: dropped, fillsWithoutExample: noExample, fails: failCounts, warns: warnCounts };
  // A bare drill may only have so many wordings ("Which coin is worth 10¢?"
  // has four values); it declares them as promptVariants and is held to half.
  const variantFloor = model.promptVariants > 0 ? Math.min(20, Math.ceil(model.promptVariants / 2)) : 20;
  if (filled && prompts.size < variantFloor) err(`only ${prompts.size} distinct prompts in 40 seeds (need ${variantFloor}+)`);
  if (filled && answers.size < 8) warn(`only ${answers.size} distinct answers in ${SEEDS} seeds`);
  if (filled && dropped / filled > 0.2) err(`a distractor collides with the key in ${Math.round((100 * dropped) / filled)}% of fills (limit 20%)`);
  if (filled && model.hint.example === "auto" && noExample / filled > 0.1) warn(`no worked example in ${Math.round((100 * noExample) / filled)}% of fills`);
  if (!r.ok) report.counts.failed += 1;
}
report.ok = report.counts.failed === 0;
fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
if (itemsPath) fs.writeFileSync(itemsPath, JSON.stringify(emitted, null, 0));

for (const r of report.models) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.id}  prompts40=${r.stats.uniquePromptsIn40 ?? "-"} answers=${r.stats.uniqueAnswers ?? "-"} warns=${JSON.stringify(r.stats.warns || {})}`);
  for (const e of r.errors) console.log(`   ✗ ${e}`);
  if (!quiet) {
    for (const w of r.warnings.slice(0, 4)) console.log(`   ~ ${w}`);
    for (const s of r.samples) console.log(`   · [${s.answerType}] ${s.prompt}  → ${s.answer}  ${JSON.stringify(s.choices)}${s.coins ? "  coins=" + s.coins.join(",") : ""}`);
  }
}
console.log(`\n${report.counts.models - report.counts.failed}/${report.counts.models} models pass. Report: ${reportPath}${itemsPath ? `; items: ${itemsPath} (${emitted.length})` : ""}`);
process.exit(report.ok ? 0 : 1);
