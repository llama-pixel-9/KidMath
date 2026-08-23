import { describe, it, expect } from "vitest";
import { scaffoldFor, scaffoldHint } from "../scaffold.js";
import { speakableText } from "../speech.js";
import { masterySummary, masteryLine } from "../analytics/masterySummary.js";

describe("scaffoldFor", () => {
  it("models small sums and differences as dot groups", () => {
    expect(scaffoldFor({ a: 7, b: 5, op: "+", answer: 12 })).toMatchObject({ kind: "dots", groups: [7, 5] });
    expect(scaffoldFor({ a: 9, b: 4, op: "-", answer: 5 })).toMatchObject({ kind: "dots", groups: [9], takeAway: 4 });
    expect(scaffoldFor({ a: 47, b: 25, op: "+", answer: 72 }).kind).toBe("look"); // too many to count
  });
  it("models products and sharing as arrays", () => {
    expect(scaffoldFor({ a: 3, b: 4, op: "×", answer: 12 })).toMatchObject({ kind: "array", rows: 3, cols: 4 });
    expect(scaffoldFor({ a: 12, b: 3, op: "÷", answer: 4 })).toMatchObject({ kind: "array", rows: 3, cols: 4 });
    expect(scaffoldFor({ a: 13, b: 13, op: "×", answer: 169 }).kind).toBe("look");
  });
  it("models fractions as a strip and counting as a number line", () => {
    expect(scaffoldFor({ mode: "fractions", answer: "3/4" })).toMatchObject({ kind: "strip", den: 4, shaded: 3 });
    expect(scaffoldFor({ mode: "counting", a: 8, b: 4, op: "count", answer: 12 })).toMatchObject({ kind: "numberLine", mark: 8 });
  });
  it("always has a hint", () => {
    for (const k of ["dots", "array", "strip", "numberLine", "look"]) expect(scaffoldHint({ kind: k })).toBeTruthy();
  });
});

describe("speakableText", () => {
  it("speaks emoji runs as counts and symbols as words", () => {
    expect(speakableText("🍪🍪🍪🍪🍪 🍪🍪 = ?", { noun: "cookies" })).toBe("7 cookies equals what");
    expect(speakableText("8 − 3 = ?")).toBe("8 minus 3 equals what");
    expect(speakableText("3 × 4 = ?")).toBe("3 times 4 equals what");
    expect(speakableText("Which fraction equals 3/4?")).toBe("Which fraction equals 3 over 4 what");
  });
  it("leaves plain sentences alone", () => {
    expect(speakableText("Lily has 4 apples. How many apples does Lily have now?")).toBe("Lily has 4 apples. How many apples does Lily have now what");
  });
});

describe("masterySummary", () => {
  const attempt = (subskill, correct) => ({ subskill, correct, retry: false });
  const sessions = [
    { mode: "addition", kind: "normal", attempts: [...Array(5)].map(() => attempt("makeTen", true)) },
    { mode: "addition", kind: "normal", attempts: [attempt("unknownAddend", false), attempt("unknownAddend", true), attempt("unknownAddend", true), attempt("unknownAddend", false)] },
    { mode: "subtraction", kind: "normal", attempts: [attempt("takeAway", true)] },
  ];
  it("counts solid skills over enough tries, per mode", () => {
    const s = masterySummary(sessions, "addition", ["makeTen", "unknownAddend", "composeDecompose"]);
    expect(s).toEqual({ solid: 1, tried: 2, total: 3 });
    expect(masteryLine(s)).toBe("1 of 3 skills solid");
    expect(masteryLine(masterySummary(sessions, "subtraction", ["takeAway"]))).toBeNull();
  });
});
