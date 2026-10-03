import { describe, expect, it } from "vitest";
import { FACTS, FACT_ROWS, factsForRow, factsForLevel, addGroup, mulGroup } from "../facts/factSets.js";
import { FACT_FORMATS, factBankItems, factHint, factQuestion, formatApplies, formatsForFact } from "../facts/factItems.js";
import { hintContainsAnswer, validateHint } from "../hints/hintSchema.js";
import { runChecks } from "../itemBank/qc/checks.js";
import { validateBank, validateBankItem } from "../itemBank/index.js";
import { generateQuestion } from "../mathEngine.js";
import { startingLevelFor } from "../gradeSeed.js";
import { gradeForModeLevel, playSkills } from "../skills/play.js";
import { resolveTopic } from "../skills/topicState.js";
import { kidView } from "../../scripts/itemGen/qc/kidView.js";

// Fact fluency plan, Part A: every basic fact, in exactly one plan row, asked
// in the formats of B2, and every generated row passing the bank's gates.

const SOLVE = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
};

const ITEMS = factBankItems();

describe("the facts", () => {
  it("are every addition fact to 10 + 10, every times fact to 12 × 12, and their partners", () => {
    const count = (op) => FACTS.filter((f) => f.op === op).length;
    expect([count("add"), count("sub"), count("mul"), count("div")]).toEqual([121, 121, 169, 156]);
    for (const f of FACTS) expect(SOLVE[f.op](f.a, f.b), f.id).toBe(f.answer);
    expect(FACTS.some((f) => f.op === "div" && f.b === 0)).toBe(false);
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
  });

  it("sit in exactly one plan row each, and each row holds the facts its spec counts", () => {
    expect(FACT_ROWS).toHaveLength(54);
    const rowIds = new Set(FACT_ROWS.map((r) => r.id));
    for (const f of FACTS) expect(rowIds.has(f.rowId), f.id).toBe(true);
    for (const row of FACT_ROWS) {
      const facts = factsForRow(row.id);
      expect(facts.length, row.id).toBe(row.spec.facts);
      for (const f of facts) expect([f.op, f.group, f.band], f.id).toEqual([row.spec.op, row.spec.group, row.spec.band]);
    }
  });

  it("take the first strategy group they fit", () => {
    expect(addGroup(0, 7)).toBe(1); // plus zero beats plus 1 or 2
    expect(addGroup(1, 1)).toBe(2); // plus 1 beats doubles
    expect(addGroup(6, 6)).toBe(3);
    expect(addGroup(10, 3)).toBe(4);
    expect(addGroup(6, 4)).toBe(5);
    expect(addGroup(7, 8)).toBe(6); // near doubles beats make ten with 8
    expect(addGroup(9, 5)).toBe(7);
    expect(addGroup(8, 5)).toBe(8);
    expect(addGroup(6, 3)).toBe(9);
    expect(mulGroup(0, 12)).toBe(13); // the 11s and 12s band first
    expect(mulGroup(11, 3)).toBe(12);
    expect(mulGroup(5, 10)).toBe(4); // times 10 beats times 5
    expect(mulGroup(7, 7)).toBe(8);
    expect(mulGroup(7, 8)).toBe(11);
  });

  it("track a turnaround pair as one fact for addition and times, never for take-away or divide", () => {
    const fact = (id) => FACTS.find((f) => f.id === id);
    expect(fact("add-8-5").trackKey).toBe(fact("add-5-8").trackKey);
    expect(fact("mul-7-6").trackKey).toBe(fact("mul-6-7").trackKey);
    expect(fact("div-42-6").trackKey).not.toBe(fact("div-42-7").trackKey);
  });

  it("serve addition and subtraction up to level 6, times and divide from 7", () => {
    for (let level = 1; level <= 10; level += 1) {
      const ops = new Set(factsForLevel(level).map((f) => f.op));
      expect([...ops].sort(), `level ${level}`).toEqual(level <= 6 ? ["add", "sub"] : ["div", "mul"]);
    }
  });
});

describe("the fact rows", () => {
  it("are one per fact and format, with stable ids, the plan row and version 2", () => {
    expect(ITEMS).toHaveLength(FACTS.reduce((n, f) => n + formatsForFact(f).length, 0));
    expect(new Set(ITEMS.map((i) => i.itemId)).size).toBe(ITEMS.length);
    for (const item of ITEMS) {
      expect(item.modeId).toBe("mathFacts");
      expect(item.version).toBe(2);
      expect(FACT_ROWS.some((r) => r.id === item.blueprintId), item.itemId).toBe(true);
    }
  });

  it("are answered on the keypad, except true or false and the pictures that answer on their own widget", () => {
    for (const item of ITEMS) {
      const format = item.structureType.split("-")[1];
      const want = { trueFalse: "choice", tenFrame: "tenFrame", takeAway: "tenFrame", hop: "numberLine" }[format] || "numberPad";
      expect(item.question.answerType, item.itemId).toBe(want);
    }
  });

  it("stack addition, subtraction and times to 10 × 10, never the 11s and 12s or division", () => {
    const stacked = ITEMS.filter((i) => i.question.display.layout === "vertical");
    expect(stacked.length).toBeGreaterThan(0);
    for (const item of stacked) {
      expect(item.structureType, item.itemId).toMatch(/^(add|sub|mul)-stacked$/);
      expect(Math.max(item.question.a, item.question.b), item.itemId).toBeLessThanOrEqual(item.subskill === "mulFacts" ? 10 : 20);
    }
  });

  it("never give the asked number away in a hint, and carry their own steps", () => {
    for (const f of FACTS) {
      for (const format of formatsForFact(f)) {
        const asked = format === "missing" ? f.b : f.answer;
        const hint = factHint(f, format);
        expect(hint.steps.length, `${f.id} ${format}`).toBeGreaterThanOrEqual(2);
        // The steps add to the nudge; none says it again.
        expect(hint.steps, `${f.id} ${format}`).not.toContain(hint.nudge);
        expect(validateHint(hint).errors, `${f.id} ${format}`).toEqual([]);
        // A true-or-false claim is judged, so its total is not a secret; its
        // steps hold no numbers at all.
        if (format === "trueFalse") expect(hint.steps.join(" ")).not.toMatch(/\d/);
        else expect(hintContainsAnswer(hint, asked), `${f.id} ${format}: ${hint.nudge} | ${hint.steps.join(" / ")}`).toBe(false);
        // Never the story steps or the multi-digit ones the app builds for other topics.
        expect(hint.steps.join(" "), `${f.id} ${format}`).not.toMatch(/story|tens and ones|, 0 times|groups with 0/);
      }
    }
  });

  it("keep a true-or-false claim honest: Yes when it holds, No when it does not", () => {
    const tf = ITEMS.filter((i) => i.structureType.endsWith("-trueFalse"));
    expect(tf.some((i) => i.question.answer === "Yes")).toBe(true);
    expect(tf.some((i) => i.question.answer === "No")).toBe(true);
    for (const item of tf) {
      const { a, b, op } = item.question;
      const shown = Number(item.question.display.promptText.split("=")[1]);
      const solve = SOLVE[{ "+": "add", "−": "sub", "×": "mul", "÷": "div" }[op]];
      expect(item.question.answer, item.itemId).toBe(solve(a, b) === shown ? "Yes" : "No");
    }
  });

  it("pass every bank gate: valid, no failing check, no duplicate prompt", () => {
    const invalid = ITEMS.filter((i) => !validateBankItem(i).valid).map((i) => i.itemId);
    expect(invalid).toEqual([]);
    const failing = ITEMS.flatMap((i) =>
      runChecks(i).findings.filter((f) => f.severity === "fail").map((f) => `${i.itemId}: ${f.id}`)
    );
    expect(failing).toEqual([]);
    expect(validateBank(ITEMS).issues).toEqual([]);
  });

  it("let a zero fact hold as written, and nothing else", () => {
    const item = ITEMS.find((i) => i.itemId === "mathFacts-v2-div-0-7-plain");
    const asked = (question) => ({ ...item, question: { ...item.question, ...question } });
    const arithmetic = (i) => runChecks(i).findings.some((f) => f.id === "arithmetic");
    // 0 ÷ 7 = 0 sorts to 0, 0, 7, which the trio rule can't read.
    expect(arithmetic(item)).toBe(false);
    expect(validateBankItem(item).valid).toBe(true);
    // A story division with its numbers swapped (6 m cut into 3, keyed 3 ÷ 6)
    // holds only as written, and must still fail both gates.
    const swapped = asked({ a: 3, b: 6, answer: 0.5 });
    expect(arithmetic(swapped)).toBe(true);
    expect(validateBankItem(swapped).errors.some((e) => e.startsWith("numeric inconsistency"))).toBe(true);
  });

  it("every format applies to some fact, and only to facts it can ask", () => {
    for (const format of FACT_FORMATS) expect(FACTS.some((f) => formatApplies(f, format)), format).toBe(true);
    expect(formatApplies(FACTS.find((f) => f.id === "mul-0-7"), "missing")).toBe(false); // 0 × ? = 0
    expect(formatApplies(FACTS.find((f) => f.id === "add-8-5"), "tenFrame")).toBe(false); // past ten
    expect(() => factQuestion(FACTS[0], "nope")).toThrow();
  });
});

describe("the Math Facts generator (fallback)", () => {
  it("builds the bank's own questions, no story prose, at every level", () => {
    for (let level = 1; level <= 10; level += 1) {
      for (let i = 0; i < 20; i += 1) {
        const q = generateQuestion("mathFacts", level, { allowWordProblems: false });
        expect(q.metadata.modeId, `level ${level}`).toBe("mathFacts");
        expect(q.display.promptText.length, q.display.promptText).toBeLessThan(40);
      }
    }
  });
});

describe("a kid's first Math Facts session", () => {
  it("opens at their own grade's facts", () => {
    for (const [profile, grade] of [["K", "K"], ["1st", "1"], ["2nd", "2"], ["3rd", "3"], ["4th", "4"]]) {
      const skills = playSkills().filter((s) => s.mode === "mathFacts" && s.grade === grade);
      const level = startingLevelFor("mathFacts", profile);
      expect(skills.some(({ source: { levels: [lo, hi] } }) => level >= lo && level <= hi), profile).toBe(true);
      expect(gradeForModeLevel("mathFacts", level), profile).toBe(grade);
      // The seeded level reads as played, so the topic takes its grade from it.
      expect(resolveTopic("mathFacts", { level, totalSessions: 0 }, { profileGrade: profile }).grade, profile).toBe(grade);
    }
    expect(startingLevelFor("mathFacts", "5th")).toBe(startingLevelFor("mathFacts", "4th"));
  });
});

// The blind solve and the kid-safe review read the picture as words
// (scripts/itemGen/qc/kidView.js). Before 2026-10-03 they were told "7 red
// counters" with no word of the 3 crossed out, and nothing at all of the
// times-table dots, so 55 take-away facts looked unanswerable to the solver.
describe("the QC readers see the Math Facts pictures", () => {
  const view = (id) => kidView(ITEMS.find((i) => i.itemId === id));
  it("says which take-away counters are crossed out", () => {
    expect(view("mathFacts-v2-sub-7-3-takeAway").figure).toBe("1 ten frame with 7 red counters; the last 3 of those counters are crossed out with an X.");
    expect(view("mathFacts-v2-sub-5-1-takeAway").figure).toBe("1 ten frame with 5 red counters; the last 1 of those counters is crossed out with an X.");
  });
  it("describes a times-table array", () => {
    expect(view("mathFacts-v2-mul-3-4-array").figure).toBe("An array of dots: 3 rows of 4 dots each.");
  });
});
