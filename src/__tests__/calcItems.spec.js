import { describe, expect, it } from "vitest";
import {
  CALC_ROWS,
  ITEMS_PER_VARIANT,
  MINUS,
  calcBankItems,
  checkCalcItem,
  drawCalcItem,
  parsePrompt,
  slipValue,
  subtractColumns,
  tradeCount,
} from "../multiDigit/calcItems.js";
import { BLUEPRINT_ROWS } from "../blueprints/index.js";
import { runChecks } from "../itemBank/qc/checks.js";
import { validateBankItem } from "../itemBank/index.js";
import { hintContainsAnswer, validateHint } from "../hints/hintSchema.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";

/**
 * The script route for the plain computing rows of the Grade 2 calc list
 * (rows 1-4 and 16-22, decision 3; Sai approved the list 2026-10-02). The
 * module is tied to the approved rows here, every item it makes passes its
 * own checks and the bank's QC gate, and the checks catch a bad key, a
 * wrong trade count and a slip that equals the key.
 */

const CALC = BLUEPRINT_ROWS.filter((r) => r.file === "g2AddsubCalc");
const rowNumber = (id) => CALC.findIndex((r) => r.id === id) + 1;
const ITEMS = calcBankItems();

describe("the script rows match the approved list", () => {
  it("are rows 1-4 and 16-22, in order", () => {
    expect(CALC_ROWS.map((r) => rowNumber(r.rowId))).toEqual([1, 2, 3, 4, 16, 17, 18, 19, 20, 21, 22]);
  });

  it("copy each row's structureType, subskill, codes and slips, and its layout", () => {
    for (const r of CALC_ROWS) {
      const row = CALC.find((x) => x.id === r.rowId);
      expect(r.structureType, r.rowId).toBe(row.spec.structureType);
      expect(r.subskill, r.rowId).toBe(row.spec.subskill);
      expect(row.spec.family, r.rowId).toBe("procedural");
      expect(row.spec.levelRange, r.rowId).toEqual([4, 6]);
      expect(r.standards, r.rowId).toEqual(row.standards);
      expect(r.mistakes, r.rowId).toEqual(row.spec.mistakes);
      // "numbers stacked in columns" stacks; "in a row" stays sideways.
      expect(r.layout, r.rowId).toBe(/stacked in columns/.test(row.picture) ? "vertical" : "horizontal");
    }
  });

  it("make one variant per variant the row names, 24 in all, each at the tier the row gives it", () => {
    let total = 0;
    for (const r of CALC_ROWS) {
      const row = CALC.find((x) => x.id === r.rowId);
      const named = row.spec.variants || [null];
      expect(r.variants, r.rowId).toHaveLength(named.length);
      named.forEach((text, i) => {
        const tier = /\((easy|moderate|hard)\)/.exec(text || "")?.[1] ?? row.difficulty;
        expect(r.variants[i].difficulty, `${r.rowId} ${r.variants[i].id}`).toBe(tier);
      });
      total += named.length;
    }
    expect(total).toBe(24);
  });

  it("compute every slip the row writes out, from the row's own example", () => {
    for (const r of CALC_ROWS) {
      const row = CALC.find((x) => x.id === r.rowId);
      const m = /^(.+ = \?) \[(\d+)\]/.exec(row.example);
      const parsed = parsePrompt(m[1]);
      expect(parsed, r.rowId).toBeTruthy();
      const answer = Number(m[2]);
      for (const slip of row.spec.slips || []) {
        expect(slipValue(slip.tag, { ...parsed, answer }), `${r.rowId} ${slip.tag}`).toBe(Number(slip.value));
      }
    }
  });
});

describe("the items", () => {
  it(`are ${ITEMS_PER_VARIANT} per variant, 600 in all, with unique ids and unique prompts`, () => {
    expect(ITEMS).toHaveLength(600);
    expect(new Set(ITEMS.map((i) => i.itemId)).size).toBe(600);
    expect(new Set(ITEMS.map((i) => i.question.display.promptText)).size).toBe(600);
    for (const r of CALC_ROWS) {
      for (const v of r.variants) {
        expect(ITEMS.filter((i) => i.blueprintId === r.rowId && i.tags.variant === v.id), `${r.rowId} ${v.id}`).toHaveLength(ITEMS_PER_VARIANT);
      }
    }
  });

  it("are the same on every build (seeded by row and variant)", () => {
    expect(calcBankItems()).toEqual(ITEMS);
  });

  it("each pass the script route's own checks", () => {
    const bad = ITEMS.map((i) => [i.itemId, checkCalcItem(i)]).filter(([, p]) => p.length);
    expect(bad).toEqual([]);
  });

  it("each pass the bank's QC gate with no fail, and validate as bank rows", () => {
    const fails = [];
    for (const i of ITEMS) {
      for (const f of runChecks(i).findings) if (f.severity === "fail") fails.push(`${i.itemId}: ${f.id} ${f.message}`);
      expect(validateBankItem(i).valid, i.itemId).toBe(true);
    }
    expect(fails).toEqual([]);
  });

  it("carry a well-formed hint that never states the key, with a feedback line per slip", () => {
    for (const i of ITEMS) {
      expect(validateHint(i.hint).ok, i.itemId).toBe(true);
      expect(hintContainsAnswer(i.hint, i.question.answer), i.itemId).toBe(false);
      expect(Object.keys(i.hint.feedback || {}).sort(), i.itemId).toEqual(Object.keys(i.tags.mistakes).sort());
    }
  });

  it("are v2 rows pointing back at their row, Grade 2's levels, procedural, typed", () => {
    for (const i of ITEMS) {
      expect(i.modeId).toBe("multiDigit");
      expect(i.version).toBe(2);
      expect(CALC.some((r) => r.id === i.blueprintId), i.itemId).toBe(true);
      expect(i.levelRange).toEqual([4, 6]);
      expect(i.itemFamily).toBe("procedural");
      expect(i.question.answerType).toBe("numberPad");
    }
  });

  it("keep the row's halves: carrying 1 ten and 2 tens, regrouping and not, both sign pairs", () => {
    const of = (rowId) => ITEMS.filter((i) => i.blueprintId === rowId);
    const onesSum = (i) => parsePrompt(i.question.display.promptText).terms.reduce((s, n) => s + (n % 10), 0);
    for (const rowId of ["calc-g2-add-several", "calc-g2-add-several-past-100"]) {
      const twenty = of(rowId).filter((i) => onesSum(i) >= 20).length;
      expect(twenty / of(rowId).length, rowId).toBeGreaterThan(0.4);
      expect(twenty / of(rowId).length, rowId).toBeLessThan(0.6);
    }
    const three = of("calc-g2-add-sub-three").map((i) => parsePrompt(i.question.display.promptText));
    const regrouped = three.filter((p) => tradeCount(p.terms, p.ops) === 1).length;
    expect(regrouped).toBeGreaterThanOrEqual(12);
    expect(regrouped).toBeLessThanOrEqual(13);
    expect(three.filter((p) => p.ops[1] === "+").length).toBeGreaterThanOrEqual(12);
    expect(three.filter((p) => p.ops[1] === MINUS).length).toBeGreaterThanOrEqual(12);
    // Never add then take away (a + b − c): two of its slips are one number.
    expect(three.every((p) => p.ops[0] === MINUS)).toBe(true);
  });

  it("put a second trade, or a trade across a zero, only on the hard rows (decision 10)", () => {
    for (const i of ITEMS) {
      const p = parsePrompt(i.question.display.promptText);
      const count = tradeCount(p.terms, p.ops);
      const acrossZero = p.terms.length === 2 && p.ops[0] === MINUS && subtractColumns(p.terms[0], p.terms[1]).acrossZero;
      if (count >= 2 || acrossZero) expect(i.difficulty, i.itemId).toBe("hard");
    }
  });

  it("stay out of the shipped bundle while the topic is hidden; they load as v2 drafts by script", () => {
    expect(FULL_ITEMS.some((i) => i.modeId === "multiDigit")).toBe(false);
  });
});

describe("the checks catch a bad item", () => {
  const item = ITEMS.find((i) => i.blueprintId === "calc-g2-add-100" && i.tags.variant === "regroupOnes");
  const copy = (fn) => {
    const c = structuredClone(item);
    fn(c);
    return checkCalcItem(c);
  };

  it("a wrong key", () => {
    expect(copy((c) => (c.question.answer += 1)).join(" ")).toMatch(/key/);
  });

  it("a payload that drifts from the printed prompt", () => {
    expect(copy((c) => (c.question.a += 1)).join(" ")).toMatch(/printed numbers/);
  });

  it("a trade count the variant does not allow", () => {
    const sum = ITEMS.find((i) => i.blueprintId === "calc-g2-add-1000-two-trades");
    const c = structuredClone(sum);
    c.blueprintId = "calc-g2-add-1000";
    c.structureType = "addWithin1000";
    c.tags.variant = "regroupOnes";
    c.difficulty = "moderate";
    expect(checkCalcItem(c).join(" ")).toMatch(/regroups or trades/);
  });

  it("a slip that equals the key, or one the row does not name", () => {
    const key = item.question.answer;
    expect(
      copy((c) => {
        c.tags.mistakes[key] = "forgotToCarry";
        c.hint.feedback[key] = "x";
      }).join(" ")
    ).toMatch(/equals the key/);
    expect(copy((c) => (c.tags.mistakes["999"] = "offByHundred")).join(" ")).toMatch(/not one of the row's/);
  });

  it("a hint that states the key", () => {
    expect(copy((c) => c.hint.steps.push(`So the answer is ${c.question.answer}.`)).join(" ")).toMatch(/states the answer/);
  });

  it("numbers outside the row's range", () => {
    const c = structuredClone(item);
    c.question.display.promptText = "98 + 9 = ?";
    c.question.a = 98;
    c.question.b = 9;
    c.question.answer = 107;
    expect(checkCalcItem(c).join(" ")).toMatch(/range/);
  });
});

describe("one random draw (the fallback generator's)", () => {
  it("keeps every rule of its row and variant", () => {
    for (const r of CALC_ROWS) {
      for (const v of r.variants) {
        for (let n = 0; n < 20; n += 1) {
          const item = drawCalcItem(r.rowId, v.id, { index: n });
          expect(checkCalcItem(item), `${r.rowId} ${v.id}: ${item.question.display.promptText}`).toEqual([]);
        }
      }
    }
  });
});
