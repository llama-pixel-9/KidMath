import { describe, it, expect } from "vitest";
import { gcd, toFraction, reduceFraction, fractionsEqual } from "../fractions.js";
import { checkAnswer } from "../mathEngine.js";
import { buildItemKey } from "../modes/itemMetadata.js";

describe("fraction utilities", () => {
  it("gcd", () => {
    expect(gcd(6, 8)).toBe(2);
    expect(gcd(7, 3)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
  });

  it("toFraction accepts objects, strings, and whole numbers", () => {
    expect(toFraction({ num: 3, den: 4 })).toEqual({ num: 3, den: 4 });
    expect(toFraction("3/4")).toEqual({ num: 3, den: 4 });
    expect(toFraction(" 6 / 8 ")).toEqual({ num: 6, den: 8 });
    expect(toFraction(5)).toEqual({ num: 5, den: 1 });
    expect(toFraction("nope")).toBe(null);
    expect(toFraction({ num: 1, den: 0 })).toBe(null);
  });

  it("reduceFraction lowers terms with positive denominator", () => {
    expect(reduceFraction({ num: 6, den: 8 })).toEqual({ num: 3, den: 4 });
    expect(reduceFraction({ num: 2, den: -4 })).toEqual({ num: -1, den: 2 });
    expect(reduceFraction({ num: 0, den: 5 })).toEqual({ num: 0, den: 1 });
  });

  it("fractionsEqual uses value equivalence", () => {
    expect(fractionsEqual({ num: 3, den: 4 }, { num: 6, den: 8 })).toBe(true);
    expect(fractionsEqual("3/4", { num: 6, den: 8 })).toBe(true);
    expect(fractionsEqual({ num: 1, den: 2 }, { num: 2, den: 3 })).toBe(false);
    expect(fractionsEqual(null, { num: 1, den: 2 })).toBe(false);
  });
});

describe("checkAnswer — fraction", () => {
  const q = { answer: { num: 3, den: 4 }, answerType: "fraction" };
  it("accepts equivalent fractions in any form", () => {
    expect(checkAnswer(q, { num: 3, den: 4 })).toBe(true);
    expect(checkAnswer(q, { num: 6, den: 8 })).toBe(true);
    expect(checkAnswer(q, "6/8")).toBe(true);
  });
  it("rejects non-equivalent or unparseable input", () => {
    expect(checkAnswer(q, { num: 2, den: 3 })).toBe(false);
    expect(checkAnswer(q, "")).toBe(false);
    expect(checkAnswer(q, null)).toBe(false);
  });
});

describe("checkAnswer — decimal", () => {
  const q = { answer: 0.5, answerType: "decimal" };
  it("accepts numerically-equal decimals (0.5 == .50)", () => {
    expect(checkAnswer(q, "0.5")).toBe(true);
    expect(checkAnswer(q, ".50")).toBe(true);
    expect(checkAnswer(q, 0.5)).toBe(true);
  });
  it("rejects wrong or empty decimals", () => {
    expect(checkAnswer(q, "0.6")).toBe(false);
    expect(checkAnswer(q, "")).toBe(false);
  });
});

describe("buildItemKey handles object (fraction) answers", () => {
  it("distinguishes distinct fraction answers", () => {
    const k1 = buildItemKey({ mode: "fractions", answer: { num: 1, den: 2 } });
    const k2 = buildItemKey({ mode: "fractions", answer: { num: 3, den: 4 } });
    expect(k1).not.toBe(k2);
    expect(k1).not.toContain("[object Object]");
  });
});
