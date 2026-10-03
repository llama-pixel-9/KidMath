import { describe, it, expect } from "vitest";
import { modelRules } from "../../scripts/itemModels/harnessRules.js";
import { promptIdentity, validateBank } from "../itemBank/index.js";
import { fill } from "../itemModels/fill.js";
import { validateModel } from "../itemModels/validate.js";
import { blueprintById } from "../blueprints/index.js";
import { runChecks } from "../itemBank/qc/checks.js";
import PILOT_MODELS from "../itemModels/pilot/grade2Money.json";
import GRADE3_MODELS from "../itemModels/money/grade3.json";
import GRADE4_MODELS from "../itemModels/money/grade4.json";
import GRADE5_MODELS from "../itemModels/money/grade5.json";
import { hintContainsAnswer } from "../hints/hintSchema.js";
import G2_CALC_STRATEGIES from "../itemModels/g2Addsub/calcStrategies.json";
import G2_CALC_TRADES from "../itemModels/g2Addsub/calcTrades.json";
import G2_CALC_EQUAL from "../itemModels/g2Addsub/calcEqual.json";
import G2_WP_EQUATIONS from "../itemModels/g2Addsub/wpEquations.json";
import G2_WP_CHANGE from "../itemModels/g2Addsub/wpChange.json";
import G2_WP_COMPARE from "../itemModels/g2Addsub/wpCompare.json";
import G2_WP_TWO_STEP from "../itemModels/g2Addsub/wpTwoStep.json";

/**
 * The item-model harness stops being money-only (Grade 2 add and subtract
 * lists, approved by Sai 2026-10-02): a model's topic, codes and id come
 * from its blueprint row, else the --mode, --code and --prefix flags, else
 * money's pilot rules. And the disc mat is part of what makes a prompt a
 * different question, in the bank's duplicate key and the harness's count.
 */

const row = (id) => blueprintById(id);
const fromRow = (id, extra = {}) => {
  const r = row(id);
  return {
    id,
    blueprintId: id,
    modeId: r.mode_id,
    grade: r.grade,
    subskill: r.spec.subskill,
    family: r.spec.family,
    structureType: r.spec.structureType,
    levelRange: r.spec.levelRange,
    standards: structuredClone(r.standards),
    ...extra,
  };
};

describe("the harness's rules for a model", () => {
  it("keep money's pilot rules as the default, for every committed money model", () => {
    for (const m of [...PILOT_MODELS, ...GRADE3_MODELS, ...GRADE4_MODELS, ...GRADE5_MODELS]) {
      const rules = modelRules(m);
      expect(rules.errors, m.id).toEqual([]);
      expect(rules.topic).toBe("money");
      expect(rules.coinChecks).toBe(true);
    }
    const m = PILOT_MODELS[0];
    expect(modelRules({ ...m, modeId: "addition" }).errors).toContain('modeId must be "money"');
    expect(modelRules({ ...m, standards: { ...m.standards, ccss: ["2.NBT.B.5"] } }).errors).toContain("standards.ccss must include 2.MD.C.8");
    expect(modelRules({ ...m, grade: "1" }).errors.join(" ")).toMatch(/grade must be "2", "3", "4", "5"/);
    expect(modelRules({ ...m, id: "change-easy" }).warnings[0]).toMatch(/money-g2-<shape>-<difficulty>/);
  });

  it("take the topic, grade and id from the blueprint row", () => {
    const wp = fromRow("wp-g2-add-to-result", { id: "wp-g2-add-to-result-regroup" });
    expect(modelRules(wp)).toEqual({ topic: "wordProblems", errors: [], warnings: [], coinChecks: false });
    expect(modelRules({ ...wp, id: "wp-g2-add-to-result-regroup-2" }).warnings).toEqual([]);
    expect(modelRules({ ...wp, id: "wp-g2-take-from-result" }).warnings[0]).toMatch(/wp-g2-add-to-result\[-<variant>\]\[-2\]/);
    expect(modelRules({ ...wp, modeId: "addition" }).errors).toContain('modeId must be "wordProblems"');
    expect(modelRules({ ...wp, grade: "3" }).errors).toContain('grade must be "2"');
    // A row's topic beats a flag that disagrees, and says so.
    expect(modelRules(wp, { mode: "money" }).errors.join(" ")).toMatch(/filed under wordProblems/);
    const calc = fromRow("calc-g2-ten-hundred-discs", { id: "calc-g2-ten-hundred-discs-easy" });
    expect(modelRules(calc).topic).toBe("multiDigit");
  });

  it("accept a row with no Common Core code when it has a state code", () => {
    // Row 35, 10 or 100 more or less to 1,200: Texas 2.7B only.
    const r = row("calc-g2-tx-ten-hundred-1200");
    expect(r.standards.ccss).toEqual([]);
    const m = fromRow(r.id);
    expect(modelRules(m).errors).toEqual([]);
    const none = { ccss: [], tx: [], fl: [], va: [], ga: [] };
    expect(modelRules({ ...m, standards: none }).errors.join(" ")).toMatch(/no code in any framework/);
  });

  it("leave an unknown row to validateModel", () => {
    const m = fromRow("wp-g2-add-to-result", { blueprintId: "wp-g2-nope" });
    expect(modelRules(m)).toEqual({ topic: null, errors: [], warnings: [], coinChecks: false });
  });

  it("take the topic, a code and an id prefix from the flags when there is no row", () => {
    const m = { id: "wp-g2-test-story-moderate", modeId: "wordProblems", grade: "2", standards: { ccss: [], tx: ["2.4C"], fl: [], va: [], ga: [] } };
    expect(modelRules(m, { mode: "wordProblems", prefix: "wp-g2-test" })).toEqual({ topic: "wordProblems", errors: [], warnings: [], coinChecks: false });
    expect(modelRules(m, { mode: "wordProblems" }).warnings[0]).toMatch(/wordProblems-g2-<shape>/);
    expect(modelRules(m, { mode: "wordProblems", code: "2.4C" }).errors).toEqual([]);
    expect(modelRules(m, { mode: "wordProblems", code: "2.OA.A.1" }).errors).toContain("standards must include 2.OA.A.1");
    expect(modelRules({ ...m, standards: {} }, { mode: "wordProblems" }).errors.join(" ")).toMatch(/at least one code/);
    // Kindergarten and Grade 1 models are allowed off the money track.
    expect(modelRules({ ...m, grade: "K" }, { mode: "wordProblems" }).errors).toEqual([]);
  });
});

describe("the disc mat in a prompt's identity", () => {
  const cols = (...counts) => counts.map(([place, count]) => ({ place, count }));
  const mat = (i, discMat) => ({
    itemId: `mat-${i}`,
    modeId: "multiDigit",
    itemFamily: "procedural",
    subskill: "tenOrHundred",
    structureType: "tenOrHundredOnMat",
    levelRange: [4, 6],
    reviewStatus: "approved",
    question: { answer: 486, answerType: "numberPad", display: { promptText: "One more hundred disc goes on the mat. What number does the mat show now?", figure: "discMat", discMat } },
  });
  const dupes = (items) => validateBank(items).issues.filter((i) => /duplicate promptText/.test(i.errors.join(" ")));

  it("tells two mats apart when their discs differ, and not when they match", () => {
    expect(dupes([mat(1, { cols: cols([100, 3], [10, 8], [1, 6]) }), mat(2, { cols: cols([100, 4], [10, 8], [1, 6]) })])).toEqual([]);
    expect(dupes([mat(1, { cols: cols([100, 3], [10, 8], [1, 6]) }), mat(2, { cols: cols([100, 3], [10, 8], [1, 6]) })])).toHaveLength(1);
  });

  it("reads a pair of labelled mats too", () => {
    const pair = (a, b) => ({ mats: [{ label: "Mat A", cols: cols(...a) }, { label: "Mat B", cols: cols(...b) }] });
    const one = mat(1, pair([[10, 4], [1, 14]], [[10, 5], [1, 4]]));
    const swapped = mat(2, pair([[10, 5], [1, 4]], [[10, 4], [1, 14]]));
    expect(promptIdentity(one, "x")).not.toBe(promptIdentity(swapped, "x"));
    expect(dupes([one, swapped])).toEqual([]);
    expect(dupes([one, mat(3, pair([[10, 4], [1, 14]], [[10, 5], [1, 4]]))])).toHaveLength(1);
  });

  it("tells two which-is-true items apart by their choices", () => {
    const pick = (n, choices) => ({
      itemId: `calc-which-${n}`,
      modeId: "multiDigit",
      itemFamily: "conceptual",
      subskill: "equalSign",
      structureType: "chooseTrueEquation",
      levelRange: [4, 6],
      reviewStatus: "approved",
      question: { answer: choices[0], choices, display: { promptText: "Which equation is true?" } },
    });
    const a = ["70 = 46 + 24", "54 = 36 + 28", "63 − 27 = 46", "82 − 45 = 43"];
    const b = ["86 = 48 + 38", "23 = 16 + 17", "83 − 67 = 26", "54 − 35 = 21"];
    expect(dupes([pick(1, a), pick(2, b)])).toEqual([]);
    expect(dupes([pick(1, a), pick(2, [...a].reverse())])).toHaveLength(1);
  });

  it("counts a fixed-words disc-mat model's fills as different questions", () => {
    // Calc row 27's shape: the words never change, only the mat does.
    const model = {
      ...fromRow("calc-g2-ten-hundred-discs", { id: "calc-g2-ten-hundred-discs-easy" }),
      difficulty: "easy",
      format: "number",
      widget: "numberPad",
      representationType: "symbolic",
      promptVariants: 1,
      template: { prompt: "One more hundred disc goes on the mat. What number does the mat show now?" },
      slots: {
        h: { kind: "int", min: 1, max: 8 },
        t: { kind: "int", min: 0, max: 9 },
        o: { kind: "int", min: 0, max: 9 },
        start: { kind: "expr", expr: "h * 100 + t * 10 + o", format: "int" },
      },
      display: { figure: "'discMat'", discMat: { cols: [{ place: 100, count: "h" }, { place: 10, count: "t" }, { place: 1, count: "o" }] } },
      answer: { expr: "start + 100", type: "int" },
      distractors: [
        { expr: "start + 1", mistake: "countedRodsAsOnes" },
        { expr: "start + 10", mistake: "changedTheWrongPlace" },
      ],
      hint: {
        nudge: "A hundred disc changes the hundreds. Read the mat first.",
        steps: ["Count the hundred discs, then the tens, then the ones.", "Now there is one more hundred disc than you counted."],
        picture: null,
        example: null,
        feedback: { countedRodsAsOnes: "That disc is worth 100, not 1.", changedTheWrongPlace: "The new disc is a hundred, so the hundreds digit changes." },
        solution: { steps: ["The mat showed {start}.", "One more hundred makes the hundreds digit one more."], answer: "start + 100" },
      },
      provenance: { author: "larkit", checkedAgainst: ["CCSS 2.NBT.B.8"] },
    };
    expect(validateModel(model)).toEqual({ ok: true, errors: [] });
    const items = Array.from({ length: 40 }, (_, i) => fill(model, { seed: i + 1 }));
    expect(new Set(items.map((i) => i.question.display.promptText)).size).toBe(1);
    expect(new Set(items.map((i) => promptIdentity(i, i.question.display.promptText))).size).toBeGreaterThanOrEqual(20);
    // Its row is a disc-mat row: the figure contract wants the mat, and gets it.
    for (const item of items.slice(0, 5)) {
      expect(item.blueprintId).toBe("calc-g2-ten-hundred-discs");
      expect(runChecks(item).findings.filter((f) => f.severity === "fail")).toEqual([]);
    }
    const bare = fill({ ...model, display: undefined }, { seed: 1 });
    expect(runChecks(bare).findings.map((f) => f.id)).toContain("missingRequiredFigure");
  });
});

describe("the committed Grade 2 add and subtract models", () => {
  // The 77 drafts in Sai's queue (2026-10-03) plus the 17 "-2" fixes from
  // Sai's first review (7 rejected, 10 approved with a fault) and 1 from the
  // live step's QC (take-from-result-acrosszero: "have now" read two ways);
  // each row in item_models is one of these objects as committed.
  const G2 = [G2_CALC_STRATEGIES, G2_CALC_TRADES, G2_CALC_EQUAL, G2_WP_EQUATIONS, G2_WP_CHANGE, G2_WP_COMPARE, G2_WP_TWO_STEP].flat();

  it("are valid, point at their blueprint row and follow its rules", () => {
    expect(G2).toHaveLength(95);
    expect(new Set(G2.map((m) => m.id)).size).toBe(G2.length);
    for (const m of G2) {
      expect(validateModel(m).errors, m.id).toEqual([]);
      expect(blueprintById(m.blueprintId), m.id).toBeTruthy();
      expect(modelRules(m).errors, m.id).toEqual([]);
    }
  });

  it("fill into bank items the QC gate passes, with no hint layer stating the key", () => {
    for (const m of G2) {
      for (let seed = 1; seed <= 15; seed += 1) {
        const item = fill(m, { seed });
        expect(runChecks(item).findings.filter((f) => f.severity === "fail"), `${m.id} seed ${seed}`).toEqual([]);
        const { nudge, steps } = item.hint;
        expect(hintContainsAnswer({ nudge, steps }, item.question.answer), `${m.id} seed ${seed}`).toBe(false);
      }
    }
  }, 60000);
});
