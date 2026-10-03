import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { BLUEPRINT_ROWS } from "../blueprints/index.js";
import { FULL_ITEMS, MODEL_ITEMS } from "../itemBank/fullBank.js";
import { MANIFESTS } from "../itemBank/v2/manifests/index.js";
import { modelBankItems, refillManifest } from "../itemBank/v2/modelRows.js";
import { fill } from "../itemModels/fill.js";
import { MODEL_FILES, REPO_MODELS, repoModelById, repoModelsFor } from "../itemModels/repoModels.js";
import { calcBankItems } from "../multiDigit/calcItems.js";
import {
  DEFERRED_ROWS,
  OLD_IOS_TOPICS,
  fixesOf,
  modelIdOfItem,
  planModels,
  stampItem,
  writeStatusFor,
} from "../itemModels/live/liveRules.js";
import {
  NULL_TEXT,
  appGate,
  byteOrder,
  checksumOf,
  conceptExamples,
  exampleLeak,
  identityIndex,
  identityOf,
  itemFromIdentityRow,
  jsonbText,
  rowLine,
  selectFills,
  specMd5,
  toDbRow,
} from "../itemModels/live/liveRows.js";
import { SCRIPT_ROW_TIERS, listedTiers, rowCoverage, skillServing } from "../itemModels/live/liveCoverage.js";
import { insertChunks } from "../../scripts/live/lib/sql.mjs";
import { IDENTITY_DISPLAY_FIELDS } from "../../scripts/live/exportSql.mjs";
import { corruptKey, disagreement, judgeFacts, modelFlags, passedAll, runPanels, timesFlagged } from "../../scripts/live/qcPanels.mjs";
import { diffRows, withoutRetired } from "../../scripts/live/readiness.mjs";
import { retireRunSql, retireV1Sql } from "../../scripts/live/retire.mjs";
import { unapproveSql } from "../../scripts/live/unapprove.mjs";
import { buildSeed, seedCellKey, subskillSeedModes } from "../../scripts/lib/seedBank.js";
import { SEED_ITEMS } from "../itemBank/bundle.js";

/**
 * The live step (scripts/live/, plan C.2): approved item models become
 * version-2 item_bank rows through files a person runs. The pure modules
 * are tested here on small fixtures; every committed manifest
 * (src/itemBank/v2/manifests/) is checked against the repo it is refilled
 * from. With no manifest committed the bank is what it always was.
 */

const SLOW = 60_000;

// Three rows whose checksum Postgres computed (jsonb_to_recordset, then the
// same coalesced line and md5(string_agg(... order by item_id collate "C"))):
// unicode keys, a minus sign, nulls, a quote and a backslash, key order by
// byte length.
const BASE_ROW = {
  mode_id: "wordProblems",
  item_family: "application",
  subskill: "changeStories",
  structure_type: "addToResultUnknown",
  level_min: 4,
  level_max: 6,
  review_status: "approved",
  version: 2,
  blueprint_id: "wp-g2-x",
  difficulty: "easy",
  item_model_id: "wp-g2-x",
  representation_type: null,
};
const PG_ROWS = [
  { ...BASE_ROW, item_id: "fx-b", payload: { answer: 2.5, display: { promptText: "Café − 3 = ?", b: [1, -3, 0] }, choices: [true, false, null], a: "x" }, hint: null, tags: { grade: "2", zz: { "é": 1, ab: 2, b: 3 } } },
  { ...BASE_ROW, item_id: "fx-A", level_min: null, blueprint_id: null, payload: { answer: 10, display: { promptText: 'Tom\'s 7 "big" dogs\\cats' } }, hint: { nudge: "n" }, tags: null, item_model_id: null },
  { ...BASE_ROW, item_id: "fx-a", payload: { answer: 0, display: {} }, hint: { steps: ["one", "two"], nudge: "n", example: { answer: 77, problem: "p" } }, tags: { grade: "2" } },
];
const PG_CHECKSUM = "bf19fa21adbe58c0de97ca2a460d8bdf";

const firstModel = (topic) => REPO_MODELS.find((e) => e.model.modeId === topic)?.model;

describe("jsonb text and the checksum", () => {
  it("prints jsonb as Postgres does", () => {
    expect(jsonbText(PG_ROWS[0].payload)).toBe('{"a": "x", "answer": 2.5, "choices": [true, false, null], "display": {"b": [1, -3, 0], "promptText": "Café − 3 = ?"}}');
    expect(jsonbText(PG_ROWS[0].tags)).toBe('{"zz": {"b": 3, "ab": 2, "é": 1}, "grade": "2"}');
    expect(jsonbText({ a: undefined, b: [undefined, 1] })).toBe('{"b": [null, 1]}');
    expect(jsonbText(null)).toBe("null");
  });

  it("matches the checksum Postgres gave for the fixture rows", () => {
    expect(checksumOf(PG_ROWS)).toBe(PG_CHECKSUM);
    expect(checksumOf([...PG_ROWS].reverse())).toBe(PG_CHECKSUM);
    expect(checksumOf([])).toBeNull();
  });

  it("keeps a null column in the line", () => {
    const line = rowLine(PG_ROWS[1]);
    expect(line.split("|").filter((x) => x === NULL_TEXT).length).toBe(5); // level_min, blueprint_id, tags, item_model_id, representation_type
    expect(line.startsWith("fx-A|wordProblems|")).toBe(true);
  });

  it("orders ids by bytes, as collate \"C\"", () => {
    expect(["fx-a", "fx-B", "fx-A", "fx-b"].sort(byteOrder)).toEqual(["fx-A", "fx-B", "fx-a", "fx-b"]);
  });

  it("fingerprints a spec without its checks", () => {
    const model = firstModel("wordProblems");
    expect(specMd5({ ...model, checks: { anything: true } })).toBe(specMd5(model));
    expect(specMd5({ ...model, id: `${model.id}-x` })).not.toBe(specMd5(model));
  });
});

describe("live rules", () => {
  it("holds an approved original while its fix is a draft, and fills the approved fix", () => {
    const plan = planModels({ a: "approved", "a-2": "draft", b: "approved", "b-2": "approved", c: "approved", d: "rejected", "d-2": "draft", e: "flagged", "c-2x": "draft" });
    expect(plan.get("a")).toMatchObject({ state: "held", by: "a-2" });
    expect(plan.get("a-2").state).toBe("pending");
    expect(plan.get("b")).toMatchObject({ state: "superseded", by: "b-2" });
    expect(plan.get("b-2").state).toBe("fill");
    expect(plan.get("c").state).toBe("fill");
    expect(plan.get("d").state).toBe("skip");
    expect(plan.get("e").state).toBe("skip");
    expect(planModels({ a: "approved", "a-2": "draft" }, { holdWhileFixPending: false }).get("a").state).toBe("fill");
  });

  it("names fixes by -n suffix only", () => {
    expect(fixesOf("x", ["x-2", "x-3", "x-1", "x-2b", "xy-2", "x"]).sort()).toEqual(["x-2", "x-3"]);
  });

  it("writes drafts only to topics old iPhone builds show", () => {
    expect(OLD_IOS_TOPICS).toHaveLength(25);
    expect(new Set(OLD_IOS_TOPICS).size).toBe(25);
    expect(writeStatusFor("wordProblems")).toBe("approved");
    expect(writeStatusFor("multiDigit")).toBe("approved");
    expect(writeStatusFor("money")).toBe("draft");
    expect(writeStatusFor("addition")).toBe("draft");
  });

  it("defers rows that have no model, with the owner's reason and date", () => {
    const ids = Object.keys(DEFERRED_ROWS);
    expect(ids).toHaveLength(9);
    const rowIds = new Set(BLUEPRINT_ROWS.map((r) => r.id));
    for (const id of ids) {
      expect(rowIds.has(id), id).toBe(true);
      expect(REPO_MODELS.some((e) => e.model.blueprintId === id), id).toBe(false);
      expect(DEFERRED_ROWS[id]).toEqual({ reason: "no widget yet", decided: "2026-10-03" });
    }
  });

  it("stamps the run and the model on a row's source", () => {
    const model = firstModel("wordProblems");
    const item = fill(model, { seed: 3 });
    expect(modelIdOfItem(item.itemId)).toBe(model.id);
    expect(stampItem(item, { status: "approved", run: "r1", specMd5: "m" })).toMatchObject({
      reviewStatus: "approved",
      source: { generator: "itemModels", itemModelId: model.id, seed: 3, specMd5: "m", run: "r1" },
    });
    const script = calcBankItems()[0];
    expect(stampItem(script, { status: "approved", run: "r1" }).source).toEqual({ generator: "script", blueprintId: script.blueprintId, variant: script.tags.variant, run: "r1" });
  });
});

describe("the gate and the fills", () => {
  it("passes a fill as the app will hold it, and fails a broken one", () => {
    const good = fill(repoModelById("wp-g2-box-middle") || firstModel("wordProblems"), { seed: 1 });
    expect(appGate(good)).toMatchObject({ ok: true, reasons: [] });
    const noPrompt = structuredClone(good);
    delete noPrompt.question.display.promptText;
    expect(appGate(noPrompt).ok).toBe(false);
    const which = repoModelsFor("multiDigit", "2").find((m) => fill(m, { seed: 1 }).structureType === "chooseTrueEquation");
    if (which) {
      const item = fill(which, { seed: 1 });
      item.question.choices = item.question.choices.filter((c) => c !== item.question.answer);
      expect(appGate(item).reasons).toContain("served choices leave out the key");
    }
  });

  it("picks new questions only, up to the quota", () => {
    const model = firstModel("wordProblems");
    const seed1 = fill(model, { seed: 1 });
    const seed2 = fill(model, { seed: 2 });
    const taken = new Map([
      [identityOf(seed1), { itemId: "someone-else", status: "approved" }],
      [identityOf(seed2), { itemId: "old-one", status: "retired" }],
    ]);
    const r = selectFills(model, { quota: 4, seeds: [1, 2, 3, 4, 5, 6, 7, 8], taken, skipIds: new Map([[`${model.id}-s3-v2`, "retired row"]]), avoid: (i) => (i.itemId.endsWith("-s4-v2") ? "leak" : null) });
    expect(r.skipped.map((s) => s.seed)).toEqual([1, 3, 4]);
    expect(r.skipped[0].reason).toBe("same question as someone-else");
    expect(r.picks.map((p) => p.seed)).toEqual([2, 5, 6, 7]);
    expect(r.retiredMatches).toEqual([{ itemId: seed2.itemId, sameAs: "old-one" }]);
    expect(r.short).toBe(false);
    const few = selectFills(model, { quota: 5, seeds: [1, 2], accept: () => ({ ok: false, reasons: ["no"] }) });
    expect(few).toMatchObject({ picks: [], short: true });
  });

  it("finds a bank duplicate", () => {
    const item = fill(firstModel("wordProblems"), { seed: 1 });
    const { index, duplicates } = identityIndex([
      { item, status: "approved" },
      { item: { ...item, itemId: "twin" }, status: "approved" },
      { item, status: "approved" },
    ]);
    expect(index.size).toBe(1);
    expect(duplicates).toEqual([{ itemId: "twin", sameAs: item.itemId }]);
  });

  it("reads an exported identity row back to the item's identity", () => {
    const ids = ["wp-g2-picture-tens-ones", "wp-g2-number-line-compare"];
    const models = [...ids.map(repoModelById), ...repoModelsFor("multiDigit", "2")].filter(Boolean).slice(0, 40);
    let checked = 0;
    for (const model of models) {
      const item = fill(model, { seed: 2 });
      const d = item.question.display;
      const parts = Object.fromEntries(IDENTITY_DISPLAY_FIELDS.filter((f) => d[f] != null).map((f) => [f, d[f]]));
      if (item.question.answerType) parts.answerType = item.question.answerType;
      if (item.structureType === "chooseTrueEquation") parts.choices = item.question.choices;
      const row = { item_id: item.itemId, mode_id: item.modeId, structure_type: item.structureType, review_status: "approved", version: 2, prompt: d.promptText, parts };
      expect(identityOf(itemFromIdentityRow(row)), item.itemId).toBe(identityOf(item));
      checked += 1;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("spots a hint-pane example's numbers", () => {
    const [example] = conceptExamples("wordProblems");
    expect(example).toBeTruthy();
    expect(exampleLeak({ question: { answer: 0, display: { promptText: example.problem } } }, [example])).toMatch(/same prompt/);
    const nums = (example.problem.match(/\d+/g) || []).reverse().join(" and ");
    const answer = Number(String(example.answer).match(/\d+/)[0]);
    expect(exampleLeak({ question: { answer, display: { promptText: `Sam has ${nums} cars. How many cars?` } } }, [example])).toMatch(/shows these numbers/);
    expect(exampleLeak({ question: { answer: answer + 1, display: { promptText: `Sam has ${nums} cars. How many cars?` } } }, [example])).toBeNull();
  });
});

describe("coverage", () => {
  const row = (id, extra = {}) => ({ id, title: id, mode_id: "wordProblems", grade: "2", difficulty: "moderate", spec: { app: "today", ...extra } });
  const items = (rowId, tier, n) => Array.from({ length: n }, (_, i) => ({ blueprintId: rowId, difficulty: tier, itemId: `${rowId}-${tier}-${i}` }));

  it("lists the tiers a row names", () => {
    expect(listedTiers(row("r", { variants: ["regroup (hard)", "plain (easy)", "other"] }))).toEqual(["easy", "moderate", "hard"]);
    expect(listedTiers({ id: "calc-g2-add-100" })).toEqual(SCRIPT_ROW_TIERS.get("calc-g2-add-100"));
  });

  it("gives every tier one state", () => {
    const rows = [row("ok"), row("thin"), row("defer"), row("held"), row("pend"), row("rej"), row("build", { app: "needs build: a widget" }), row("none")];
    const models = [
      { id: "m-held", blueprintId: "held", difficulty: "moderate" },
      { id: "m-pend", blueprintId: "pend", difficulty: "moderate" },
      { id: "m-rej", blueprintId: "rej", difficulty: "moderate" },
    ];
    const plan = new Map([
      ["m-held", { state: "held", reason: "fix m-held-2 is a draft" }],
      ["m-pend", { state: "pending", reason: "draft model" }],
      ["m-rej", { state: "skip", reason: "rejected model" }],
    ]);
    const r = rowCoverage({ rows, items: [...items("ok", "moderate", 8), ...items("thin", "moderate", 7)], models, plan, deferred: { defer: { reason: "no widget yet", decided: "2026-10-03" } } });
    const state = Object.fromEntries(r.rows.map((x) => [x.rowId, x.tiers[0].state]));
    expect(state).toEqual({ ok: "covered", thin: "thin", defer: "deferred", held: "held", pend: "pending", rej: "rejected", build: "needs-build", none: "missing" });
    expect(r.gaps.map((g) => g.rowId).sort()).toEqual(["build", "none", "rej", "thin"]);
    expect(r.waiting.map((g) => g.rowId).sort()).toEqual(["held", "pend"]);
  });

  it("calls a skill with nothing to serve a gap", () => {
    const serving = skillServing({ topic: "wordProblems", grade: "2", items: [] });
    expect(serving.length).toBeGreaterThan(0);
    expect(serving.every((s) => s.gap && s.count === 0)).toBe(true);
  });
});

describe("the write files", () => {
  const rows = PG_ROWS.map((r) => ({ ...r, source: { run: "r1" }, kid_safe: null }));
  const reviewer = "00000000-0000-4000-8000-000000000000";

  it("inserts only, in chunks whose checksums add up to the rows", () => {
    const chunks = insertChunks(rows, { run: "r1", topic: "wordProblems", grade: "2", status: "approved", reviewedBy: reviewer, chunkKb: 0.3 });
    expect(chunks.length).toBe(3);
    expect(chunks.reduce((n, c) => n + c.rows, 0)).toBe(3);
    for (const c of chunks) {
      expect(c.sql).toContain("on conflict (item_id) do nothing");
      expect(c.sql).not.toMatch(/\bdelete\b|\bupdate\b|\btruncate\b/i);
      expect(c.trySql).not.toMatch(/\binsert into\b/i);
      expect(c.trySql).toContain(c.checksum);
    }
    const one = insertChunks(rows, { run: "r1", topic: "wordProblems", grade: "2", status: "approved", reviewedBy: reviewer });
    expect(one).toHaveLength(1);
    expect(one[0].checksum).toBe(PG_CHECKSUM);
  });

  it("refuses an approved write without a reviewer, and a row of another status", () => {
    expect(() => insertChunks(rows, { run: "r1", topic: "t", grade: "2", status: "approved" })).toThrow(/reviewer/);
    expect(() => insertChunks(rows, { run: "r1", topic: "t", grade: "2", status: "draft" })).toThrow(/status approved, run status draft/);
  });

  it("rolls back by run, never deletes, and guards a v1 retire", () => {
    for (const sql of [unapproveSql("wordProblems", "r1"), retireRunSql("wordProblems", "r1", { ids: ["a"] }), retireV1Sql("addition", ["a"], { tag: "batch-1" })]) {
      expect(sql).not.toMatch(/\bdelete\b/i);
      expect(sql).toMatch(/select count\(\*\) as would_/);
    }
    expect(unapproveSql("wordProblems", "r1")).toContain("source->>'run' = 'r1'");
    expect(retireV1Sql("addition", ["a"], { tag: "batch-1" })).toContain("coalesce(version, 1) = 1");
    expect(retireV1Sql("addition", ["a"], { tag: "batch-1" })).toContain("jsonb_typeof(tags) = 'array'");
    expect(() => retireV1Sql("addition", [], { tag: "b" })).toThrow();
  });
});

describe("QC panels", () => {
  const items = repoModelsFor("wordProblems", "2").slice(0, 3).map((m) => fill(m, { seed: 1 }));
  const knownGood = fill(repoModelsFor("wordProblems", "2")[3], { seed: 1 });
  const spare = fill(repoModelsFor("wordProblems", "2")[4], { seed: 1 });

  it("corrupts a key to another choice", () => {
    const bad = corruptKey(items[0], "t");
    expect(bad.itemId).toBe(`canary-key-t-${items[0].itemId}`);
    expect(bad.question.answer).not.toBe(items[0].question.answer);
    expect(corruptKey({ question: { answer: [1, 2] } })).toBeNull();
  });

  it("holds a model on a double flag or the flag rate", () => {
    const v = (a, b) => ({ blind: { A: { flagged: a }, B: { flagged: b } }, kidSafe: { A: { flagged: false }, B: { flagged: false } } });
    const verdicts = new Map([
      ["m1-s1-v2", v(true, true)],
      ["m1-s2-v2", v(false, false)],
      ["m2-s1-v2", v(true, false)],
      ...Array.from({ length: 19 }, (_, i) => [`m2-s${i + 2}-v2`, v(false, false)]),
      ["m3-s1-v2", v(false, true)],
      ...Array.from({ length: 5 }, (_, i) => [`m3-s${i + 2}-v2`, v(false, false)]),
    ]);
    expect(timesFlagged(verdicts.get("m1-s1-v2"))).toBe(2);
    expect(passedAll(verdicts.get("m1-s2-v2"))).toBe(true);
    expect(passedAll(verdicts.get("m2-s1-v2"))).toBe(false);
    const flags = modelFlags(verdicts);
    expect(flags.get("m1").held).toBe(true);
    expect(flags.get("m2").held).toBe(false);
    expect(flags.get("m3").held).toBe(true);
    expect(disagreement(verdicts, "blind")).toEqual({ items: 28, differ: 2, rate: 2 / 28 });
  });

  it(
    "voids a pass that misses its canary, and never runs unpinned",
    async () => {
      await expect(runPanels(items, { checkJudge: false })).rejects.toThrow(/pinned judge/);
      const facts = judgeFacts("test-judge");
      const calibration = { model: "test-judge", promptSha: facts.promptSha, kidViewSha: facts.kidViewSha, knownGood: { blind: [knownGood], kidSafe: [knownGood] }, badStories: [{ ...items[1], itemId: "canary-story-x" }] };
      // A judge that answers every item with its own key and prints everything: it misses each canary.
      let calls = 0;
      const ask = async (prompt) => {
        calls += 1;
        return prompt.split("\n\n").map((block) => ({ itemId: /itemId: (\S+)/.exec(block)[1], answer: "0", ambiguous: false, printable: true, reason: "" }));
      };
      await expect(runPanels(items, { model: "test-judge", calibration, cacheDir: null, ask, checkJudge: false })).rejects.toThrow(/no bad canary/);
      calls = 0;
      // The corrupted copy comes from an item outside the batch (here a spare fill).
      await expect(runPanels(items, { model: "test-judge", calibration, cacheDir: null, ask, checkJudge: false, canaryPool: [...items, spare] })).rejects.toThrow(/stays void after 2 reruns/);
      expect(calls).toBe(3);
    },
    SLOW
  );
});

describe("readiness", () => {
  it("names the rows that differ", () => {
    expect(diffRows([{ item_id: "a", md5: "1" }, { item_id: "b", md5: "2" }, { item_id: "x", md5: "9" }], { a: "1", b: "3", c: "4" })).toEqual({ missing: ["c"], extra: ["x"], different: ["b"] });
  });

  it("drops retired rows from a manifest and recomputes its md5", () => {
    const model = firstModel("wordProblems");
    const manifest = { topic: "wordProblems", grade: "2", status: "approved", models: { [model.id]: { specMd5: specMd5(model), seeds: [1, 2, 3], run: "r1" } } };
    const { manifest: next, removed } = withoutRetired(manifest, [`${model.id}-s2-v2`, "elsewhere"]);
    expect(removed).toEqual([`${model.id}-s2-v2`]);
    expect(next.models[model.id].seeds).toEqual([1, 3]);
    expect(next.rows).toBe(2);
    const { items } = refillManifest(next);
    expect(next.md5).toBe(checksumOf(items.map((i) => toDbRow(i, { status: "approved" }))));
  });
});

describe("manifests and the bundle", () => {
  it("lists every model file under src/itemModels", () => {
    const root = fileURLToPath(new URL("../itemModels/", import.meta.url));
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".json")) files.push(relative(root, path).split("\\").join("/"));
      }
    };
    walk(root);
    expect(files.sort()).toEqual(Object.keys(MODEL_FILES).sort());
  });

  it("refills a manifest at its seeds and reports what it cannot", () => {
    const model = firstModel("wordProblems");
    const script = calcBankItems()[0];
    const { items, problems } = refillManifest({
      topic: "wordProblems",
      grade: "2",
      status: "approved",
      models: { [model.id]: { specMd5: "m", seeds: [4, 9], run: "r1" }, "no-such-model": { seeds: [1], run: "r1" } },
      scriptRows: { run: "r2", ids: [script.itemId, "no-such-row"] },
    });
    expect(items.map((i) => i.itemId)).toEqual([`${model.id}-s4-v2`, `${model.id}-s9-v2`, script.itemId]);
    expect(items[0].source).toMatchObject({ run: "r1", seed: 4, specMd5: "m" });
    expect(items[2].source).toMatchObject({ generator: "script", run: "r2" });
    expect(problems).toHaveLength(2);
  });

  it("keys a filled topic's seed cells by subskill too, and no other topic's", () => {
    expect(subskillSeedModes({ manifests: [] })).toEqual(new Set());
    const modes = subskillSeedModes({ manifests: [{ topic: "wordProblems" }, { topic: "money" }] });
    expect(modes).toEqual(new Set(["wordProblems"])); // money is not v2-only; Math Facts has no manifest
    const item = (subskill, i) => ({ itemId: `wp-${subskill}-${i}`, modeId: "wordProblems", itemFamily: "application", subskill, levelRange: [4, 6], question: { display: { promptText: `Story ${subskill} ${i}` } } });
    const items = [...Array.from({ length: 10 }, (_, i) => item("changeStories", i)), item("compareStories", 0)];
    expect(seedCellKey(items[0])).toBe("wordProblems::application::2-3");
    expect(seedCellKey(items[0], modes)).toBe("wordProblems::application::2-3::changeStories");
    const flat = buildSeed(items, 8).seed;
    const keyed = buildSeed(items, 8, { subskillModes: modes }).seed;
    // One cell shared by two subskills: 8 split between them (every other change story, the compare story).
    expect(flat.filter((i) => i.subskill === "changeStories")).toHaveLength(5);
    // A cell per subskill: 8 change stories, and the one compare story.
    expect(keyed.filter((i) => i.subskill === "changeStories")).toHaveLength(8);
    expect(keyed.filter((i) => i.subskill === "compareStories")).toHaveLength(1);
  });

  it("adds nothing to the bank while no manifest is committed", () => {
    expect(Array.isArray(MANIFESTS)).toBe(true);
    expect(MODEL_ITEMS).toHaveLength(MANIFESTS.reduce((n, m) => n + m.rows, 0));
    if (!MANIFESTS.length) {
      expect(modelBankItems()).toEqual([]);
      expect(FULL_ITEMS.some((i) => i.version === 2 && i.itemModelId)).toBe(false);
    }
  });

  for (const manifest of MANIFESTS) {
    describe(`manifest ${manifest.topic} grade ${manifest.grade}`, () => {
      const { items, problems } = refillManifest(manifest);

      it("refills to its md5", () => {
        expect(problems).toEqual([]);
        expect(items).toHaveLength(manifest.rows);
        expect(checksumOf(items.map((i) => toDbRow(i, { status: manifest.status })))).toBe(manifest.md5);
        for (const [id, entry] of Object.entries(manifest.models)) expect(specMd5(repoModelById(id)), id).toBe(entry.specMd5);
      });

      it(
        "passes the gate as the app will hold every row",
        () => {
          const failed = items.map((i) => ({ id: i.itemId, ...appGate(i) })).filter((r) => !r.ok);
          expect(failed.map((f) => `${f.id}: ${f.reasons.join("; ")}`)).toEqual([]);
        },
        SLOW
      );

      it(
        "asks no question the bank or another manifest asks",
        () => {
          const mine = new Set(items.map((i) => i.itemId));
          const fullIds = new Set(FULL_ITEMS.map((i) => i.itemId));
          const entries = [...FULL_ITEMS, ...calcBankItems().filter((i) => !fullIds.has(i.itemId))].map((item) => ({ item, status: item.reviewStatus }));
          const { duplicates } = identityIndex(entries);
          expect(duplicates.filter((d) => mine.has(d.itemId) || mine.has(d.sameAs))).toEqual([]);
        },
        SLOW
      );

      it("covers every listed tier, apart from deferred rows and tiers waiting on a model", () => {
        const rows = BLUEPRINT_ROWS.filter((r) => r.mode_id === manifest.topic && String(r.grade) === String(manifest.grade));
        const waiting = new Set((manifest.waiting || []).map((w) => `${w.rowId}|${w.tier}`));
        const { rows: cov } = rowCoverage({ rows, items });
        const open = cov.flatMap((r) => r.tiers.filter((t) => t.state !== "covered" && t.state !== "deferred" && !waiting.has(`${r.rowId}|${t.tier}`)).map((t) => `${r.rowId} ${t.tier} ${t.state} (${t.count})`));
        expect(open).toEqual([]);
      });

      it("is in the seed: every cell of its rows (by subskill) has seed rows (rerun npm run bank:seed:build)", () => {
        const modes = subskillSeedModes();
        const seeded = new Set(SEED_ITEMS.map((i) => seedCellKey(i, modes)));
        const missing = [...new Set(items.map((i) => seedCellKey(i, modes)))].filter((k) => !seeded.has(k));
        expect(missing).toEqual([]);
      });

      it("carries no canary and no model beside its fix", () => {
        expect(items.filter((i) => i.itemId.startsWith("canary-"))).toEqual([]);
        const ids = Object.keys(manifest.models);
        expect(ids.flatMap((id) => fixesOf(id, ids).map((f) => `${id} and ${f}`))).toEqual([]);
        expect(OLD_IOS_TOPICS.includes(manifest.topic) && manifest.status === "approved").toBe(false);
      });
    });
  }
});
