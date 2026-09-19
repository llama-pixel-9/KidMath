import { describe, expect, it } from "vitest";
import { checkItems, regroups } from "../worksheets/claimCheck";
import { sampleComputation, sampleSheet } from "../worksheets/computationSampler";

describe("regroups", () => {
  it("sees carries and borrows in any column", () => {
    expect(regroups(118, 87, "+")).toBe(true);
    expect(regroups(211, 704, "+")).toBe(false);
    expect(regroups(199, 1, "+")).toBe(true); // a carry that cascades
    expect(regroups(641, 564, "-")).toBe(true);
    expect(regroups(826, 603, "−")).toBe(false);
    expect(regroups(380, 35, "-")).toBe(true);
  });
});

describe("computation sampler", () => {
  it("builds no-regrouping pairs column by column, inside the claim", () => {
    const claim = { op: "-", a: [100, 999], b: [100, 999], difference: [1, 899], regroup: "none" };
    const items = Array.from({ length: 300 }, () => sampleComputation(claim, "subtraction"));
    expect(items.every(Boolean)).toBe(true);
    expect(checkItems(items, claim)).toEqual([]);
  });

  it("the screenshot sheet: 3-digit − 3-digit, every one regrouping — no 380 − 35, no 459 − 457 freebies by accident of range", () => {
    const claim = { op: "-", a: [100, 999], b: [100, 999], difference: [1, 899], regroup: "required" };
    const sheet = sampleSheet(claim, "subtraction", 24);
    expect(sheet).toHaveLength(24);
    expect(sheet.every((q) => q.a >= 100 && q.b >= 100 && regroups(q.a, q.b, "-"))).toBe(true);
  });

  it("division carries its remainder and never lets it reach the divisor", () => {
    const claim = { op: "/", b: [2, 9], quotient: [2, 49], dividend: [10, 99], remainder: "required" };
    const sheet = sampleSheet(claim, "division", 12);
    expect(checkItems(sheet, claim)).toEqual([]);
    expect(sheet.every((q) => q.remainder > 0 && q.remainder < q.b)).toBe(true);
  });

  it("a fact pool smaller than the page fills with spaced repeats, never back to back", () => {
    const claim = { op: "+", a: [1, 4], b: [1, 4], total: [2, 5], ordered: true };
    const sheet = sampleSheet(claim, "addition", 30);
    expect(sheet).toHaveLength(30);
    for (let i = 1; i < sheet.length; i += 1) {
      expect(`${sheet[i].a},${sheet[i].b}`).not.toBe(`${sheet[i - 1].a},${sheet[i - 1].b}`);
    }
  });

  it("no duplicate facts on a sheet when the pool is big enough", () => {
    const claim = { op: "x", a: [11, 99], b: [2, 9] };
    const sheet = sampleSheet(claim, "multiplication", 24);
    expect(new Set(sheet.map((q) => `${q.a}x${q.b}`)).size).toBe(24);
  });
});
