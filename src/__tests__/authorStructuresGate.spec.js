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
      gated(draft("addToStartUnknown", "Some frogs sat on a log. 8 more hopped on. Now there are 20. How many were there before?", { a: 8, b: 20, op: "+", answer: 12 }))
    ).toBe(true);
  });

  it("rejects a Result Unknown mislabelled as Start Unknown", () => {
    expect(
      gated(draft("addToStartUnknown", "12 frogs sat on a log. 8 more hopped on. How many frogs now?", { a: 12, b: 8, op: "+", answer: 20 }))
    ).toBe(false);
  });

  it("accepts the fewer/add language trap", () => {
    expect(
      gated(draft("compareBiggerFewer", "Maya has 15 fewer stickers than Ethan. Maya has 12 stickers. How many does Ethan have?", { a: 12, b: 15, op: "+", answer: 27 }))
    ).toBe(true);
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
