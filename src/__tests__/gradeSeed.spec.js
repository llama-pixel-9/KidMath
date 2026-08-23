import { describe, it, expect } from "vitest";
import { startingLevelFor, gradeFitFor, gradeIndex, parseSpan, MAX_SEEDED_LEVEL, gradeWorkForLevel } from "../gradeSeed.js";
import { MODE_MAX_LEVELS, maxLevelForMode, maxSeededLevelForMode } from "../modeLevels.js";
import { getModeConfig } from "../modes/index.js";
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

  it("keeps the per-mode ladder map and mode configs in agreement (Phase 3)", () => {
    for (const mode of MODE_IDS) {
      const cfgMax = getModeConfig(mode).maxLevel ?? 10;
      expect(maxLevelForMode(mode), mode).toBe(cfgMax);
      expect(maxSeededLevelForMode(mode), mode).toBe(cfgMax - 3);
    }
    for (const mode of Object.keys(MODE_MAX_LEVELS)) expect(MODE_IDS).toContain(mode);
  });

  it("seeds Grade-5 kids into the Grade-5 modes and caps below the top band", () => {
    expect(startingLevelFor("fractionOps", "4th")).toBe(1);
    expect(startingLevelFor("fractionOps", "5th")).toBe(4);
    expect(startingLevelFor("decimalOps", "5th")).toBe(4);
    expect(startingLevelFor("volumeCoordinates", "5th")).toBe(1); // span "5" — its first grade
    for (const mode of Object.keys(MODE_MAX_LEVELS)) {
      for (const g of ["K", "1st", "2nd", "3rd", "4th", "5th", "6th"]) {
        expect(startingLevelFor(mode, g)).toBeLessThanOrEqual(maxSeededLevelForMode(mode));
      }
    }
  });

  it("maps a level to parent-language grade work", () => {
    expect(gradeWorkForLevel("fractionOps", 1)).toBe("Grade 4");
    expect(gradeWorkForLevel("fractionOps", 12)).toBe("Grade 5");
    expect(gradeWorkForLevel("counting", 1)).toBe("Kindergarten");
    expect(gradeWorkForLevel("counting", 10)).toBe("Grade 1");
    expect(gradeWorkForLevel("multiplication", 10)).toBe("Grade 4");
  });

  it("classifies a mode against the kid's grade", () => {
    expect(gradeFitFor("decimals", "K")).toBe("above");
    expect(gradeFitFor("counting", "5th")).toBe("below");
    expect(gradeFitFor("fractions", "3rd")).toBe("in");
  });
});
