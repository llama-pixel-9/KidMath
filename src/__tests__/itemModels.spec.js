import { describe, it, expect } from "vitest";
import { fill, formatMoney, coinPhrase, mulberry32 } from "../itemModels/fill.js";
import { validateModel } from "../itemModels/validate.js";
import { evalExpr, identifiersIn, parseExpr } from "../itemModels/expr.js";
import { WIDGET_IDS, slotTokensIn, resolveSlotToken } from "../itemModels/schema.js";
import { NAMES } from "../itemModels/names.js";
import { GRADE2_MONEY_MODELS, changeFromOneDollar, compareTwoAmounts } from "../itemModels/samples/grade2Money.js";
import PILOT_MODELS from "../itemModels/pilot/grade2Money.json";
import GRADE5_MODELS from "../itemModels/money/grade5.json";
import { runChecks } from "../itemBank/qc/checks.js";
import { validateBankItem } from "../itemBank/index.js";
import { hintContainsAnswer, validateHint } from "../hints/hintSchema.js";
import { findObjectsInText } from "../content/contextTable.js";
import { findKidSafeHits } from "../content/kidSafeList.js";
import { blueprintById } from "../blueprints/index.js";
import { ANSWER_TYPES } from "../components/widgetRegistry.js";

/**
 * Item models (plan section 4): one reviewed template, many generated
 * items. The invariants that matter:
 *   - a fill is a function of (model, seed): same seed, same item;
 *   - every fill of the pilot models is a bank item the QC gate passes;
 *   - the key is among the choices, the choices are distinct, and no
 *     hint layer a kid reads before answering states the key;
 *   - a model with a typo in a slot name is refused before it fills.
 */

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const fails = (qc) => qc.findings.filter((f) => f.severity === "fail").map((f) => `${f.id}: ${f.message}`);

describe("the Grade 2 money models", () => {
  it("are five, one per pilot item type, and all validate", () => {
    expect(GRADE2_MONEY_MODELS).toHaveLength(5);
    expect(new Set(GRADE2_MONEY_MODELS.map((m) => m.id)).size).toBe(5);
    for (const model of GRADE2_MONEY_MODELS) {
      expect(validateModel(model), model.id).toEqual({ ok: true, errors: [] });
      expect(model.grade).toBe("2");
      expect(model.standards.ccss).toContain("2.MD.C.8");
    }
  });

  it("name a widget the app registers, or the choice grid", () => {
    for (const id of WIDGET_IDS) expect(id === "choice" || ANSWER_TYPES.includes(id), id).toBe(true);
    for (const model of GRADE2_MONEY_MODELS) expect(model.widget === null || WIDGET_IDS.includes(model.widget)).toBe(true);
  });
});

describe("fill", () => {
  it("is deterministic for a seed and varies across seeds", () => {
    for (const model of GRADE2_MONEY_MODELS) {
      expect(fill(model, { seed: 42 })).toEqual(fill(model, { seed: 42 }));
      const prompts = new Set(SEEDS.slice(0, 40).map((seed) => fill(model, { seed }).question.display.promptText));
      expect(prompts.size, model.id).toBeGreaterThan(20);
    }
  });

  it("fills the same item whether the spec's keys come in file order or database order", () => {
    // jsonb stores object keys sorted by length, then bytes; a spec read back
    // from item_models arrives that way, with a slot's dependencies after it.
    const jsonbOrder = (obj) =>
      Object.fromEntries(
        Object.keys(obj)
          .sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))
          .map((k) => [k, obj[k]]),
      );
    const original = PILOT_MODELS.find((m) => m.id === "money-g2-equivBillsForCoins-hard");
    expect(original).toBeTruthy();
    const fromDb = jsonbOrder({ ...original, slots: jsonbOrder(original.slots) });
    expect(Object.keys(fromDb.slots)).not.toEqual(Object.keys(original.slots));
    for (const seed of [1, 2, 3, 4, 5]) expect(fill(fromDb, { seed })).toEqual(fill(original, { seed }));
    // Every pilot model fills from database order too.
    for (const model of PILOT_MODELS) {
      const reordered = { ...model, slots: jsonbOrder(model.slots) };
      expect(() => fill(reordered, { seed: 1 }), model.id).not.toThrow();
    }
  });

  it("refuses expression slots that depend on each other", () => {
    const loop = {
      ...changeFromOneDollar,
      slots: { ...changeFromOneDollar.slots, a: { kind: "expr", expr: "b + 1", format: "int" }, b: { kind: "expr", expr: "a + 1", format: "int" } },
    };
    expect(() => fill(loop, { seed: 1 })).toThrow(/depend on each other/);
  });

  it("gives a v2 bank item the loader, the gate and the served question all accept", () => {
    for (const model of GRADE2_MONEY_MODELS) {
      for (const seed of SEEDS) {
        const item = fill(model, { seed });
        expect(validateBankItem(item).errors, `${model.id} seed ${seed}`).toEqual([]);
        expect(fails(runChecks(item)), `${model.id} seed ${seed}: ${item.question.display.promptText}`).toEqual([]);
        expect(item.version).toBe(2);
        expect(item.itemModelId).toBe(model.id);
        expect(item.difficulty).toBe(model.difficulty);
        expect(item.levelBand).toBe("2-3");
        expect(item.levelRange).toEqual([4, 6]);
        expect(item.reviewStatus).toBe("draft");
        expect(item.itemId).toBe(`${model.id}-s${seed}-v2`);
        expect(item.question.answerType).toBe(model.widget || "choice");
        expect(item.tags.grade).toBe("2");
        expect(item.tags.notes).toEqual([]);
      }
    }
  });

  it("puts the key among distinct choices, one per distractor, never negative", () => {
    for (const model of GRADE2_MONEY_MODELS) {
      for (const seed of SEEDS) {
        const { question, tags } = fill(model, { seed });
        expect(question.choices, `${model.id} seed ${seed}`).toContain(question.answer);
        expect(new Set(question.choices).size).toBe(question.choices.length);
        expect(question.choices).toHaveLength(1 + model.distractors.length);
        for (const c of question.choices) {
          if (typeof c === "number") expect(Number.isInteger(c) && c >= 0).toBe(true);
          else expect(c).not.toMatch(/-/);
        }
        // Every wrong choice carries the mistake it stands for.
        const wrong = question.choices.filter((c) => c !== question.answer).map(String);
        expect(Object.keys(tags.mistakes).sort()).toEqual(wrong.sort());
        expect(new Set(Object.values(tags.mistakes)).size).toBe(wrong.length);
      }
    }
  });

  it("fills every hint layer with the item's numbers and never the answer", () => {
    for (const model of GRADE2_MONEY_MODELS) {
      for (const seed of SEEDS) {
        const item = fill(model, { seed });
        const { hint, question } = item;
        expect(validateHint(hint).errors, `${model.id} seed ${seed}`).toEqual([]);
        expect(hintContainsAnswer(hint, question.answer), `${model.id} seed ${seed}: ${JSON.stringify(hint)}`).toBe(false);
        expect(hint.nudge).not.toMatch(/[{}]/);
        expect(hint.steps.length).toBeGreaterThanOrEqual(2);
        expect(hint.picture?.kind).toBe(model.hint.picture.kind);
        // Feedback is keyed by the wrong choices as shown; the solution ends
        // on the key; the worked example is another fill with another answer.
        for (const key of Object.keys(hint.feedback)) expect(question.choices.map(String)).toContain(key);
        expect(hint.solution.answer).toEqual(question.answer);
        expect(hint.example.answer).not.toEqual(question.answer);
        expect(hint.example.problem).not.toBe(question.display.promptText);
        expect(hint.example.steps.length).toBeGreaterThan(0);
      }
    }
  });

  it("shows the coins it names on the count model", () => {
    const item = fill(GRADE2_MONEY_MODELS[0], { seed: 3 });
    expect(item.question.answerType).toBe("coinTray");
    expect(item.question.display.coins.length).toBeGreaterThan(1);
    expect(item.question.display.counting).toEqual({ kind: "sum", parts: item.question.display.coins.map((c) => ({ quarter: 25, dime: 10, nickel: 5, penny: 1 }[c])) });
    expect(item.hint.picture.coins).toHaveLength(item.question.display.coins.length);
  });

  it("writes money the way the kid's state does", () => {
    const cc = fill(changeFromOneDollar, { seed: 11 });
    expect(cc.question.display.promptText).toMatch(/for \d+¢ /);
    expect(cc.hint.steps[0]).toMatch(/\d+¢ to \$1\.00/);
    // Florida never uses the cent sign from grade 2 on.
    const fl = fill(changeFromOneDollar, { seed: 11, state: "FL" });
    expect(fl.question.display.promptText).toMatch(/for \$0\.\d\d /);
    expect(fl.question.display.promptText).not.toMatch(/¢/);
    expect(fl.question.choices.every((c) => /^\$\d+\.\d\d$/.test(c))).toBe(true);
    // The same numbers behind both renderings.
    expect(fl.tags.slots).toEqual(cc.tags.slots);
    // One style for the whole choice set, ordered by value.
    for (const seed of SEEDS.slice(0, 50)) {
      const { choices } = fill(GRADE2_MONEY_MODELS[3], { seed }).question;
      expect(choices.every((c) => /^\$\d+\.\d\d$/.test(c))).toBe(true);
    }
  });

  it("honors a model's own money style and level range", () => {
    const pinned = { ...changeFromOneDollar, moneyStyle: "dollars", levelRange: [6, 7] };
    const item = fill(pinned, { seed: 11 });
    expect(item.question.display.promptText).toMatch(/\$0\.\d\d/);
    expect(item.question.display.promptText).not.toMatch(/¢/);
    expect(item.levelRange).toEqual([6, 7]);
    expect(fill(changeFromOneDollar, { seed: 11 }).levelRange).toEqual([4, 6]);
  });

  it("carries the operation on the payload when the prompt states its numbers", () => {
    const change = fill(changeFromOneDollar, { seed: 5 }).question;
    expect(change.op).toBe("-");
    expect(change.a).toBe(100);
    expect(change.b).toBe(change.display.money.price);
    expect(change.display.money.change).toBe(100 - change.b);
    const compare = fill(compareTwoAmounts, { seed: 5 }).question;
    expect(compare.op).toBeNull();
    expect(NAMES).toContain(compare.answer);
  });
});

describe("validateModel", () => {
  const base = changeFromOneDollar;

  it("rejects a template that names an unknown slot", () => {
    const { ok, errors } = validateModel({ ...base, template: { prompt: "{nope} buys {object_a} for {price}. How much change?" } });
    expect(ok).toBe(false);
    expect(errors).toEqual(['template.prompt names unknown slot {nope}']);
  });

  it("rejects an expression over an unknown slot", () => {
    const { errors } = validateModel({ ...base, answer: { expr: "paid - cost", type: "money" } });
    expect(errors).toEqual(['answer.expr uses unknown slot "cost"']);
    expect(validateModel({ ...base, constraints: ["price %% 10"] }).errors[0]).toMatch(/does not parse/);
  });

  it("requires a difficulty, a hint with nudge and steps, and two tagged distractors", () => {
    expect(validateModel({ ...base, difficulty: "medium" }).errors).toContain("difficulty must be one of easy, moderate, hard");
    expect(validateModel({ ...base, hint: { ...base.hint, steps: [] } }).errors).toContain("hint.steps must be a non-empty list");
    expect(validateModel({ ...base, distractors: base.distractors.slice(0, 1) }).errors).toContain("at least 2 distractors are needed");
    const untagged = validateModel({ ...base, distractors: [{ expr: "paid + price" }, { expr: "price" }] }).errors;
    expect(untagged).toContain("distractors[0] needs a mistake tag");
    expect(validateModel({ ...base, hint: { ...base.hint, feedback: { typo: "x" } } }).errors).toContain('hint.feedback["typo"] matches no distractor mistake tag');
    expect(validateModel({ ...base, widget: "sliderThing" }).errors[0]).toMatch(/not a registered answer type/);
  });

  it("checks the optional money style, level range and prompt-variant count", () => {
    const bad = (extra) => validateModel({ ...changeFromOneDollar, ...extra }).errors.join("; ");
    expect(bad({ moneyStyle: "pounds" })).toMatch(/moneyStyle/);
    expect(bad({ levelRange: [0, 11] })).toMatch(/levelRange/);
    expect(bad({ levelRange: [7, 6] })).toMatch(/levelRange/);
    expect(bad({ promptVariants: 0 })).toMatch(/promptVariants/);
    expect(validateModel({ ...changeFromOneDollar, moneyStyle: "dollars", levelRange: [6, 7], promptVariants: 9 }).ok).toBe(true);
  });

  it("refuses a slot form on a non-object slot", () => {
    const { errors } = validateModel({ ...base, template: { prompt: "{name_plural} buy {object_a} for {price}. How much change?" } });
    expect(errors[0]).toMatch(/only an object slot has a plural form/);
  });
});

describe("a model written for a blueprint row", () => {
  // Any model body will do; what is under test is the row it points at.
  const row = blueprintById("wp-g2-add-to-result");
  const model = {
    ...changeFromOneDollar,
    id: "wp-g2-add-to-result-test",
    modeId: "wordProblems",
    subskill: row.spec.subskill,
    family: row.spec.family,
    structureType: row.spec.structureType,
    levelRange: [4, 6],
    standards: structuredClone(row.standards),
    blueprintId: row.id,
  };
  const errorsOf = (extra) => validateModel({ ...model, ...extra }).errors.join("; ");

  it("validates when it agrees with its row", () => {
    expect(validateModel(model)).toEqual({ ok: true, errors: [] });
    // A narrower band inside the row's is fine.
    expect(validateModel({ ...model, levelRange: [5, 6] }).ok).toBe(true);
  });

  it("is refused for a row that does not exist or is not an item row", () => {
    expect(errorsOf({ blueprintId: "wp-g2-nope" })).toMatch(/not a blueprint row/);
    expect(errorsOf({ blueprintId: "facts-add-zero-to5" })).toMatch(/fluency row/);
    expect(errorsOf({ blueprintId: "" })).toMatch(/blueprintId must be/);
  });

  it("is refused when its grade, topic, subskill or family is not the row's", () => {
    expect(errorsOf({ grade: "3" })).toMatch(/is Grade 2, but the model is Grade 3/);
    expect(errorsOf({ modeId: "money", subskill: "countCoins" })).toMatch(/filed under wordProblems/);
    expect(errorsOf({ subskill: "compareStories" })).toMatch(/subskill must be the row's \(changeStories\)/);
    expect(errorsOf({ family: "conceptual" })).toMatch(/family must be the row's \(application\)/);
  });

  it("copies the row's structureType", () => {
    expect(errorsOf({ structureType: "joinResultUnknown" })).toMatch(/structureType must be the row's \(addToResultUnknown\)/);
    expect(errorsOf({ structureType: undefined })).toMatch(/structureType must be the row's/);
  });

  it("sets a levelRange inside the row's", () => {
    expect(errorsOf({ levelRange: undefined })).toMatch(/sets levelRange/);
    expect(errorsOf({ levelRange: [3, 6] })).toMatch(/inside the row's \[4, 6\]/);
    expect(errorsOf({ levelRange: [4, 7] })).toMatch(/inside the row's \[4, 6\]/);
  });

  it("carries the row's codes in every framework, no more and no fewer", () => {
    expect(errorsOf({ standards: { ...row.standards, ccss: ["2.MD.C.8"] } })).toMatch(/standards\.ccss must be the row's codes \(2\.OA\.A\.1\)/);
    expect(errorsOf({ standards: { ...row.standards, tx: [row.standards.tx[0]] } })).toMatch(/standards\.tx/);
    expect(errorsOf({ standards: { ...row.standards, ga: [] } })).toMatch(/standards\.ga/);
    // Order does not matter.
    expect(validateModel({ ...model, standards: { ...row.standards, tx: [...row.standards.tx].reverse() } }).ok).toBe(true);
  });

  it("passes its row's id to every item it fills; a model with none passes null", () => {
    for (const seed of [1, 2, 3]) {
      const item = fill(model, { seed });
      expect(item.blueprintId).toBe(row.id);
      expect(item.structureType).toBe(row.spec.structureType);
      expect(item.levelRange).toEqual([4, 6]);
    }
    expect(fill(changeFromOneDollar, { seed: 1 }).blueprintId).toBeNull();
  });

  it("leaves every model written before rows existed valid without one", () => {
    for (const m of [...GRADE2_MONEY_MODELS, ...PILOT_MODELS, ...GRADE5_MODELS]) {
      expect(m.blueprintId, m.id).toBeUndefined();
      expect(validateModel(m).ok, m.id).toBe(true);
    }
  });
});

describe("the pieces", () => {
  it("writes money as text for choices that carry an amount", () => {
    expect(evalExpr("money(145)", {})).toBe("$1.45");
    expect(evalExpr("money(45)", {})).toBe("45¢");
    expect(evalExpr("dollars(45)", {})).toBe("$0.45");
    expect(evalExpr("'Yes, ' + money(230) + ' left over'", {})).toBe("Yes, $2.30 left over");
  });

  it("evaluates model expressions without running code", () => {
    const scope = { price: 65, paid: 100, coins: ["quarter", "dime", "penny"], name1: "Mia", name2: "Leo" };
    expect(evalExpr("paid - price", scope)).toBe(35);
    expect(evalExpr("nextTen(price) != paid - price && price % 10 != 0", scope)).toBe(true);
    expect(evalExpr("coinValue(coins) > 30 ? name1 : name2", scope)).toBe("Mia");
    expect(evalExpr("fewestCoins(41)", scope)).toEqual(["quarter", "dime", "nickel", "penny"]);
    expect(evalExpr("'They have the same amount'", scope)).toBe("They have the same amount");
    expect(() => evalExpr("cost + 1", scope)).toThrow(/unknown identifier "cost"/);
    expect(() => evalExpr("price.toFixed(2)", scope)).toThrow();
    expect(() => parseExpr("price +")).toThrow();
    expect(identifiersIn("max(price1, price2) - min(price1, price2)")).toEqual(["price1", "price2"]);
  });

  it("reads slot tokens and their forms", () => {
    expect(slotTokensIn("{name} buys {object_a} for {price}.")).toEqual(["name", "object_a", "price"]);
    const slots = { name: { kind: "name" }, object: { kind: "object" } };
    expect(resolveSlotToken("object_plural", slots)).toEqual({ slot: "object", form: "plural" });
    expect(resolveSlotToken("object", slots)).toEqual({ slot: "object", form: null });
    expect(resolveSlotToken("price", slots)).toBeNull();
  });

  it("formats money and coins the way tests write them", () => {
    expect(formatMoney(45)).toBe("45¢");
    expect(formatMoney(109)).toBe("$1.09");
    expect(formatMoney(200)).toBe("$2.00");
    expect(formatMoney(45, "dollars")).toBe("$0.45");
    expect(coinPhrase(["dime", "quarter", "penny", "dime"])).toBe("1 quarter, 2 dimes and 1 penny");
    expect(coinPhrase(["nickel"])).toBe("1 nickel");
  });

  it("seeds the PRNG the engine uses", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("keeps a names list that is no object and no unsafe word", () => {
    expect(NAMES).toHaveLength(40);
    expect(new Set(NAMES).size).toBe(40);
    for (const name of NAMES) {
      expect(name).toMatch(/^[A-Z][a-z]{1,5}$/);
      expect(findObjectsInText(name), name).toEqual([]);
      expect(findKidSafeHits(name), name).toEqual([]);
    }
  });
});

describe("pack prices", () => {
  it("draws a pack money slot from the object's pack price and exposes the pack size", () => {
    const model = GRADE5_MODELS.find((m) => m.id === "money-g5-unitPriceFromPack-easy");
    expect(model).toBeTruthy();
    for (let seed = 1; seed <= 10; seed += 1) {
      const item = fill(model, seed);
      const m = item.question.display.promptText.match(/^A pack of (\d+) .* costs \$(\d+)\.(\d\d) /);
      expect(m, item.question.display.promptText).toBeTruthy();
      const size = Number(m[1]);
      const packCents = Number(m[2]) * 100 + Number(m[3]);
      expect(size).toBeGreaterThanOrEqual(4);
      expect(size).toBeLessThanOrEqual(12);
      expect(packCents % size).toBe(0);
      expect(item.question.answer).toBe(formatMoney(packCents / size, "dollars"));
    }
  });

  it("rejects a pack flag that is not true or has no object to price", () => {
    const base = GRADE5_MODELS.find((m) => m.id === "money-g5-unitPriceFromPack-easy");
    const bad = JSON.parse(JSON.stringify(base));
    bad.slots.pack.pack = "yes";
    expect(validateModel(bad).errors.join("\n")).toMatch(/pack must be true/);
    const loose = JSON.parse(JSON.stringify(base));
    loose.slots.pack.of = [100, 200];
    expect(validateModel(loose).errors.join("\n")).toMatch(/needs of to name an object slot/);
  });
});
