import { describe, it, expect } from "vitest";
import { checkStructure } from "../itemBank/qc/structureCheck.js";
import { runChecks } from "../itemBank/qc/checks.js";

/**
 * authorStructures.js writes only items that clear BOTH checkStructure and the
 * QC gate. The value of that gate is entirely in what it rejects: an LLM asked
 * for a hard structure often returns an easy one with the same nouns. These
 * assert the gate catches exactly those substitutions, so authoring the empty
 * difficult tier cannot quietly fill it with mislabelled easy items.
 */

const draft = (structureType, promptText, q) => ({
  itemId: "x",
  modeId: q.op === "×" ? "multiplication" : q.op === "÷" ? "division" : "addition",
  structureType,
  levelRange: [7, 10],
  question: { ...q, display: { promptText } },
});

function gated(item) {
  const s = checkStructure(item);
  const qc = runChecks(item);
  return s.ok && qc.pass;
}

describe("authoring gate on the empty difficult structures", () => {
  it("accepts a genuine Start Unknown", () => {
    expect(
      gated(draft("addToStartUnknown", "Some frogs sat on a log. 8 more hopped on. Now there are 20. How many frogs were there before?", { a: 8, b: 20, op: "+", answer: 12 }))
    ).toBe(true);
  });

  it("rejects a Result Unknown mislabelled as Start Unknown", () => {
    expect(
      gated(draft("addToStartUnknown", "12 frogs sat on a log. 8 more hopped on. How many frogs now?", { a: 12, b: 8, op: "+", answer: 20 }))
    ).toBe(false);
  });

  it("accepts the fewer/add language trap", () => {
    expect(
      gated(draft("compareBiggerFewer", "Maya has 15 fewer stickers than Ethan. Maya has 12 stickers. How many stickers does Ethan have?", { a: 12, b: 15, op: "+", answer: 27 }))
    ).toBe(true);
  });

  it("rejects a noun-less question even when structure and math are right", () => {
    // "How many does Ethan have?" — the reader must resolve "how many WHAT"
    // from the previous sentence. The question must restate the noun.
    expect(
      gated(draft("compareBiggerFewer", "Maya has 15 fewer stickers than Ethan. Maya has 12 stickers. How many does Ethan have?", { a: 12, b: 15, op: "+", answer: 27 }))
    ).toBe(false);
  });

  it("rejects the trap when the trap word is replaced", () => {
    // "more" instead of "fewer" makes it the easy consistent variant.
    expect(
      gated(draft("compareBiggerFewer", "Maya has 15 more stickers than Ethan. Ethan has 12 stickers. How many does Maya have?", { a: 12, b: 15, op: "+", answer: 27 }))
    ).toBe(false);
  });

  it("accepts multiplicative compare phrased with 'times as many'", () => {
    expect(
      gated(draft("compareProductUnknown", "A blue ribbon is 6 cm. A red ribbon is 3 times as long. How many cm is the red ribbon?", { a: 3, b: 6, op: "×", answer: 18 }))
    ).toBe(true);
  });

  it("rejects multiplicative compare written additively", () => {
    expect(
      gated(draft("compareProductUnknown", "A blue ribbon is 6 cm. A red ribbon is 3 cm more. How many cm is the red ribbon?", { a: 3, b: 6, op: "×", answer: 9 }))
    ).toBe(false);
  });

  it("rejects quotitive prose asking for group size", () => {
    expect(
      gated(draft("arrayRowCountUnknown", "20 chairs are arranged into 5 rows. How many chairs are in each row?", { a: 20, b: 5, op: "÷", answer: 4 }))
    ).toBe(false);
  });
});

describe("checker handles payload operand order and comparative phrasing", () => {
  it("accepts a Compare item storing [difference, larger] in a/b", () => {
    // "Sofia has 8 more crayons than Marcus. Sofia has 47. How many crayons
    // does Marcus have?" = 39. The model stored a=8 (difference), b=47
    // (larger); 47 - 8 = 39. Order-agnostic subtraction must accept this.
    expect(
      gated(draft("compareSmallerMore", "Sofia has 8 more crayons than Marcus. Sofia has 47. How many crayons does Marcus have?", { a: 8, b: 47, op: "-", answer: 39 }))
    ).toBe(true);
  });

  it("still rejects a subtraction answer no operand order can produce", () => {
    expect(
      gated(draft("compareSmallerFewer", "Kai has 15 fewer than Sofia. Sofia has 47. How many does Kai have?", { a: 15, b: 47, op: "-", answer: 30 }))
    ).toBe(false); // 47 - 15 = 32, not 30
  });

  it("accepts 'how many times heavier' without the word 'as'", () => {
    expect(
      gated(draft("compareMultiplierUnknown", "A big dog weighs 60 pounds and a small dog weighs 12 pounds. How many times heavier is the big dog?", { a: 60, b: 12, op: "÷", answer: 5 }))
    ).toBe(true);
  });
});

describe("arithmetic accepts every operand position of one relation", () => {
  it("accepts Take From / Start Unknown (answer - taken = left)", () => {
    // "Some pencils. Maria used 12. Now 8. How many before?" = 20; 8+12=20.
    expect(
      gated(draft("takeFromStartUnknown", "Some pencils were on the desk. Maria used 12. Now there are 8. How many pencils were there before?", { a: 12, b: 8, op: "-", answer: 20 }))
    ).toBe(true);
  });

  it("accepts a double stored as [part, part, whole] in any slot", () => {
    expect(gated(draft("compareBiggerMore", "Ana has 6 more shells than Bo. Bo has 6. How many shells does Ana have?", { a: 6, b: 6, op: "+", answer: 12 }))).toBe(true);
  });

  it("still rejects a wrong additive trio", () => {
    expect(gated(draft("addToStartUnknown", "Some cats sat. 3 more came. Now there are 5. How many before?", { a: 3, b: 5, op: "+", answer: 4 }))).toBe(false); // 5-3=2, not 4
  });
});

describe("bondMath verifies number-bond payloads that arithmetic skips", () => {
  // Bank convention (docs/numberbonds-bank-design.md): op "bond", givens in
  // display — whole+part (missing part), whole+parts (three-part), parts only
  // (whole unknown). `op: "bond"` has no OPS entry, so without this check a
  // wrong bond answer would sail through the gate.
  const bond = (display, answer, levelRange = [1, 3]) => ({
    itemId: "x",
    modeId: "numberBonds",
    structureType: "partUnknown",
    itemFamily: "procedural",
    subskill: "missingPart",
    levelRange,
    question: { a: null, b: null, op: "bond", answer, display: { promptText: "9 = 4 + ?", ...display } },
  });

  it("accepts a correct missing-part bond", () => {
    expect(runChecks(bond({ whole: 9, part: 4 }, 5)).pass).toBe(true);
  });

  it("rejects a wrong missing-part bond", () => {
    const qc = runChecks(bond({ whole: 9, part: 4 }, 6));
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "bondMath")).toBe(true);
  });

  it("accepts a correct whole-unknown bond (parts only)", () => {
    expect(runChecks(bond({ parts: [4, 5], promptText: "4 + 5 = ?" }, 9)).pass).toBe(true);
  });

  it("rejects a three-part bond whose given parts + answer miss the whole", () => {
    const qc = runChecks(bond({ whole: 10, parts: [2, 3], promptText: "10 = 2 + 3 + ?" }, 6));
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "bondMath")).toBe(true);
  });

  it("skips judged forms with no numeric bond payload", () => {
    const item = bond({ promptText: "4 + 5 = 9" }, 9);
    item.question.answer = "True";
    item.question.choices = ["True", "False"];
    expect(runChecks(item).findings.some((f) => f.id === "bondMath")).toBe(false);
  });
});
