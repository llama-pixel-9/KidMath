import { describe, it, expect } from "vitest";
import {
  FORMATS,
  FORMAT_IDS,
  applyFormat,
  maybeApplyFormat,
  availableFormats,
} from "../modes/formats";
import { checkAnswer } from "../mathEngine";
import { validateQuestion } from "../modes/itemQuality";
import { getModeConfig } from "../modes";

/**
 * The point of these tests: a format transform that gets the mathematics wrong
 * is worse than no format at all. A true/false item with the wrong truth value
 * teaches the misconception it was written to correct, and nothing else in the
 * pipeline would catch it.
 */

const base = (over = {}) => ({
  a: 7,
  b: 5,
  op: "+",
  answer: 12,
  level: 9,
  mode: "addition",
  display: { promptText: "7 + 5 = ?" },
  metadata: {
    modeId: "addition",
    level: 9,
    gradeBand: "2-3",
    domain: "OA",
    cluster: "c",
    subskill: "composeDecompose",
    itemFamily: "procedural",
    cognitiveDemand: "DOK1",
    representation: "symbolic",
    mathPractices: ["MP2"],
    standardRefs: ["1.OA"],
    misconceptionTags: ["offByOne"],
    blueprintId: "b",
  },
  ...over,
});

/** Evaluate an "a op b" string so we can check a claim independently. */
function evalExpr(text) {
  const m = text.match(/^\s*(\d+)\s*([+\-x/])\s*(\d+)\s*$/);
  if (!m) return null;
  const [, a, op, b] = m;
  const x = Number(a);
  const y = Number(b);
  return op === "+" ? x + y : op === "-" ? x - y : op === "x" ? x * y : x / y;
}

/** Independently decide whether a rendered equation is actually true. */
function equationIsTrue(promptText) {
  const [lhs, rhs] = promptText.split("=").map((s) => s.trim());
  const l = /^\d+$/.test(lhs) ? Number(lhs) : evalExpr(lhs);
  const r = /^\d+$/.test(rhs) ? Number(rhs) : evalExpr(rhs);
  if (l === null || r === null) return null;
  return l === r;
}

describe("format transforms are mathematically sound", () => {
  const truthFormats = [
    "trueFalse",
    "equationReversed",
    "reflexive",
    "commutative",
    "balanceBothSides",
    "relationalNonComputable",
    "doublingHalving",
  ];

  it("labels true/false items with the actual truth value", () => {
    for (const id of truthFormats) {
      const q = base(
        id === "relationalNonComputable"
          ? { a: 37, b: 48, answer: 85 }
          : id === "doublingHalving"
            ? { a: 8, b: 3, op: "x", answer: 24 }
            : {}
      );
      if (!FORMATS[id].appliesTo(q)) continue;
      for (let i = 0; i < 200; i++) {
        const out = applyFormat(q, id);
        const actuallyTrue = equationIsTrue(out.display.promptText);
        expect(actuallyTrue, `${id}: could not parse ${out.display.promptText}`).not.toBeNull();
        expect(
          out.answer,
          `${id} claims ${out.answer} for "${out.display.promptText}"`
        ).toBe(actuallyTrue ? "True" : "False");
      }
    }
  });

  it("produces both true and false items", () => {
    for (const id of truthFormats) {
      const q = base(
        id === "relationalNonComputable"
          ? { a: 37, b: 48, answer: 85 }
          : id === "doublingHalving"
            ? { a: 8, b: 3, op: "x", answer: 24 }
            : {}
      );
      if (!FORMATS[id].appliesTo(q)) continue;
      const seen = new Set();
      for (let i = 0; i < 200; i++) seen.add(applyFormat(q, id).answer);
      expect([...seen].sort(), `${id} should vary its truth value`).toEqual(["False", "True"]);
    }
  });

  it("solves balanceOpen correctly", () => {
    for (let i = 0; i < 200; i++) {
      const out = applyFormat(base(), "balanceOpen");
      const m = out.display.promptText.match(/(\d+) \+ (\d+) = \? \+ (\d+)/);
      expect(m).toBeTruthy();
      expect(Number(m[1]) + Number(m[2])).toBe(out.answer + Number(m[3]));
    }
  });

  it("makes the odd-one-out genuinely the only wrong option", () => {
    for (let i = 0; i < 200; i++) {
      const out = applyFormat(base(), "oddOneOut");
      const target = Number(out.display.promptText.match(/NOT equal (\d+)/)[1]);
      const wrong = out.choices.filter((c) => evalExpr(c) !== target);
      expect(wrong, "exactly one option should differ").toHaveLength(1);
      expect(out.answer).toBe(wrong[0]);
    }
  });

  it("makes exactly the two correct options correct in twoCorrect", () => {
    for (let i = 0; i < 200; i++) {
      const out = applyFormat(base(), "twoCorrect");
      const target = Number(out.display.promptText.match(/equal (\d+)/)[1]);
      const correct = out.display.options.filter((c) => evalExpr(c) === target);
      expect(correct.sort()).toEqual([...out.answer].sort());
      expect(out.display.requiredCount).toBe(2);
    }
  });

  it("names the right operator in missingOperator", () => {
    for (const [op, expected] of [["+", "+"], ["-", "-"], ["x", "x"]]) {
      const q = base({ op, a: 12, b: 3, answer: op === "+" ? 15 : op === "-" ? 9 : 36 });
      const out = applyFormat(q, "missingOperator");
      expect(out.answer).toBe(expected);
      expect(out.choices).toContain(expected);
    }
  });

  it("asks for the correct answer in errorAnalysis, not the wrong one", () => {
    for (let i = 0; i < 200; i++) {
      const out = applyFormat(base(), "errorAnalysis", { actor: "Sam" });
      expect(out.answer).toBe(12);
      const claimed = Number(out.display.promptText.match(/= (\d+)\./)[1]);
      expect(claimed, "the fictional child must actually be wrong").not.toBe(12);
    }
  });

  it("rounds estimation to a reachable option", () => {
    for (let i = 0; i < 100; i++) {
      const out = applyFormat(base({ a: 48, b: 51, answer: 99 }), "estimation");
      expect(out.choices).toContain(out.answer);
      expect(out.answer % 10).toBe(0);
    }
  });

  it("excludes the true fact-family member as the odd one", () => {
    const q = base({ a: 3, b: 6, op: "x", answer: 18 });
    for (let i = 0; i < 50; i++) {
      const out = applyFormat(q, "factFamily");
      expect(out.choices).toHaveLength(4);
      expect(out.choices).toContain(out.answer);
      expect(out.answer).toContain("-"); // the subtraction impostor
    }
  });
});

describe("format transforms produce valid questions", () => {
  it("passes the item quality gate and scores through checkAnswer", () => {
    for (const id of FORMAT_IDS) {
      const q = base(
        id === "relationalNonComputable"
          ? { a: 37, b: 48, answer: 85 }
          : ["factFamily", "doublingHalving"].includes(id)
            ? { a: 8, b: 3, op: "x", answer: 24 }
            : {}
      );
      if (!FORMATS[id].appliesTo(q)) continue;
      const out = applyFormat(q, id, { actor: "Ana" });

      const { valid, errors } = validateQuestion(out);
      expect(valid, `${id}: ${errors?.join("; ")}`).toBe(true);
      expect(checkAnswer(out, out.answer), `${id} should accept its own answer`).toBe(true);
      expect(out.metadata.formatId).toBe(id);
      expect(out.display.promptText).toBeTruthy();
    }
  });

  it("keeps a prompt every format item can be read from", () => {
    for (const id of FORMAT_IDS) {
      const q = base();
      if (!FORMATS[id].appliesTo(q)) continue;
      const out = applyFormat(q, id, { actor: "Ana" });
      expect(out.display.promptText.length).toBeLessThanOrEqual(220);
    }
  });
});

describe("format gating", () => {
  it("keeps the equality group out of Kindergarten", () => {
    const q = base({ level: 1 });
    const k = availableFormats(q, 1);
    expect(k).not.toContain("balanceOpen");
    expect(k).not.toContain("relationalNonComputable");
    expect(k).not.toContain("errorAnalysis");
  });

  it("leaves story items alone", () => {
    const story = base({
      display: { promptText: "Mina has 7 shells and finds 5 more. How many now?" },
      metadata: { ...base().metadata, itemFamily: "application" },
    });
    for (let i = 0; i < 50; i++) {
      expect(maybeApplyFormat(story, 9, {}, FORMAT_IDS, 1).display.promptText).toBe(
        story.display.promptText
      );
    }
  });

  it("can be switched off", () => {
    for (let i = 0; i < 50; i++) {
      const out = maybeApplyFormat(base(), 9, { noFormats: true }, FORMAT_IDS, 1);
      expect(out.metadata.formatId).toBeUndefined();
    }
  });

  it("honours an explicitly requested format", () => {
    const out = maybeApplyFormat(base(), 9, { formatId: "trueFalse" }, FORMAT_IDS);
    expect(out.metadata.formatId).toBe("trueFalse");
  });
});

describe("modes emit formats end to end", () => {
  it("produces every declared format over repeated sampling", () => {
    for (const mode of ["addition", "subtraction", "multiplication", "division"]) {
      const config = getModeConfig(mode);
      const seen = new Set();
      for (let i = 0; i < 6000 && seen.size < config.supportedFormats.length; i++) {
        const q = config.generate(9);
        if (q.metadata.formatId) seen.add(q.metadata.formatId);
      }
      for (const id of config.supportedFormats) {
        expect(seen.has(id), `${mode} never emitted ${id}`).toBe(true);
      }
    }
  });

  it("keeps every generated format item self-consistent", () => {
    for (const mode of ["addition", "subtraction", "multiplication", "division"]) {
      const config = getModeConfig(mode);
      for (let i = 0; i < 800; i++) {
        const q = config.generate(9);
        if (!q.metadata.formatId) continue;
        expect(checkAnswer(q, q.answer), `${mode}/${q.metadata.formatId}`).toBe(true);
        const { valid, errors } = validateQuestion(q);
        expect(valid, `${mode}/${q.metadata.formatId}: ${errors?.join("; ")}`).toBe(true);
      }
    }
  });

  // Regression: formats that render "a op b = ..." assumed a op b == answer,
  // which is false for conceptual items where the unknown is embedded. For
  // `? + 54 = 87` the generator stores the two GIVENS as a and b, so
  // missingOperator rendered `54 ? 87 = 33` — an equation no operator
  // satisfies. Checking against a hand-built procedural fixture missed it;
  // only real generator output has the embedded-unknown items.
  it("never renders an equation the arithmetic cannot satisfy", () => {
    const OPS = { "+": (x, y) => x + y, "-": (x, y) => x - y, x: (x, y) => x * y, "/": (x, y) => x / y };

    for (const mode of ["addition", "subtraction", "multiplication", "division"]) {
      const config = getModeConfig(mode);
      for (let level = 4; level <= 10; level++) {
        for (let i = 0; i < 400; i++) {
          const q = config.generate(level);
          const fid = q.metadata.formatId;
          if (!fid) continue;
          const text = q.display.promptText;

          // "a ? b = c" — some operator must actually produce c.
          const mo = text.match(/^(\d+) \? (\d+) = (\d+)$/);
          if (mo) {
            const [, a, b, c] = mo.map(Number);
            const works = Object.entries(OPS).filter(([, f]) => f(a, b) === c);
            expect(works.length, `${mode}/${fid}: no operator satisfies "${text}"`).toBeGreaterThan(0);
            expect(works.map(([o]) => o)).toContain(q.answer);
          }

          // Any true/false equation must be labelled with its real truth value.
          if (q.answer === "True" || q.answer === "False") {
            const truth = equationIsTrue(text);
            if (truth !== null) {
              expect(q.answer, `${mode}/${fid}: "${text}" mislabelled`).toBe(
                truth ? "True" : "False"
              );
            }
          }
        }
      }
    }
  });
});
