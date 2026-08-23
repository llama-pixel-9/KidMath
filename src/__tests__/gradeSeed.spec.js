import { describe, it, expect } from "vitest";
import { startingLevelFor, gradeFitFor, gradeIndex, parseSpan, MAX_SEEDED_LEVEL } from "../gradeSeed.js";
import { GRADE_SPANS } from "../engagement/gradeSpans.js";
import { MODE_IDS } from "../modes/index.js";

describe("gradeSeed", () => {
  it("parses grades and spans", () => {
    expect(gradeIndex("K")).toBe(0);
    expect(gradeIndex("1st")).toBe(1);
    expect(gradeIndex("5th")).toBe(5);
    expect(gradeIndex(undefined)).toBeNull();
    expect(parseSpan("K–1")).toEqual([0, 1]);
    expect(parseSpan("2–4")).toEqual([2, 4]);
    expect(parseSpan("4")).toEqual([4, 4]);
  });

  it("starts at 1 for an unknown grade or a kid at/below the span start", () => {
    expect(startingLevelFor("addition", null)).toBe(1);
    expect(startingLevelFor("addition", "K")).toBe(1);
    expect(startingLevelFor("multiplication", "2nd")).toBe(1);
    expect(startingLevelFor("decimals", "4th")).toBe(1);
  });

  it("adds one band per grade above the span start, capped at the top band", () => {
    expect(startingLevelFor("addition", "1st")).toBe(4);
    expect(startingLevelFor("addition", "2nd")).toBe(7);
    expect(startingLevelFor("addition", "5th")).toBe(7); // outgrown → treated as the last grade
    expect(startingLevelFor("multiplication", "3rd")).toBe(4);
    expect(startingLevelFor("multiplication", "4th")).toBe(7);
  });

  it("never seeds above the earned top band, for every mode and grade", () => {
    for (const mode of MODE_IDS) {
      expect(GRADE_SPANS[mode], mode).toBeTruthy();
      for (const g of ["K", "1st", "2nd", "3rd", "4th", "5th", "6th"]) {
        const lv = startingLevelFor(mode, g);
        expect(lv).toBeGreaterThanOrEqual(1);
        expect(lv).toBeLessThanOrEqual(MAX_SEEDED_LEVEL);
      }
    }
  });

  it("classifies a mode against the kid's grade", () => {
    expect(gradeFitFor("decimals", "K")).toBe("above");
    expect(gradeFitFor("counting", "5th")).toBe("below");
    expect(gradeFitFor("fractions", "3rd")).toBe("in");
  });
});
