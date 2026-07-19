import { describe, it, expect } from "vitest";
import {
  LEVEL_BANDS,
  GRADE_BANDS,
  levelToBand,
  levelToGradeBand,
  levelRangeToBands,
  levelToGrade,
  levelRangeToGrades,
  legacyBandToGrades,
  gradeToLegacyBand,
} from "../bands.js";

// Also assert the item-bank layer re-exports the same bindings, so downstream
// callers importing from "./itemBank" are unaffected by the centralisation.
import {
  LEVEL_BANDS as BANK_LEVEL_BANDS,
  levelToBand as bankLevelToBand,
  levelRangeToBands as bankLevelRangeToBands,
} from "../itemBank/index.js";
import { levelToGradeBand as metaLevelToGradeBand } from "../modes/itemMetadata.js";

describe("legacy 3-band scheme (unchanged behavior)", () => {
  it("maps every level 1–10 to the original band", () => {
    expect([1, 2, 3].map(levelToBand)).toEqual(["K-1", "K-1", "K-1"]);
    expect([4, 5, 6].map(levelToBand)).toEqual(["2-3", "2-3", "2-3"]);
    expect([7, 8, 9, 10].map(levelToBand)).toEqual(["4-5", "4-5", "4-5", "4-5"]);
  });

  it("keeps LEVEL_BANDS as the active 3-band axis", () => {
    expect(LEVEL_BANDS).toEqual(["K-1", "2-3", "4-5"]);
  });

  it("levelToGradeBand is a byte-for-byte alias of the legacy mapping", () => {
    for (let level = 1; level <= 10; level++) {
      expect(levelToGradeBand(level)).toBe(levelToBand(level));
    }
  });

  it("levelRangeToBands spans the legacy bands a range touches", () => {
    expect(levelRangeToBands([1, 3])).toEqual(["K-1"]);
    expect(levelRangeToBands([4, 6])).toEqual(["2-3"]);
    expect(levelRangeToBands([7, 10])).toEqual(["4-5"]);
    expect(levelRangeToBands([1, 10])).toEqual(["K-1", "2-3", "4-5"]);
    expect(levelRangeToBands(null)).toEqual([]);
  });
});

describe("Grade 1–4 scheme (introduced alongside)", () => {
  it("exposes four grade bands", () => {
    expect(GRADE_BANDS).toEqual(["G1", "G2", "G3", "G4"]);
  });

  it("maps levels to grades, splitting the legacy 4-5 band into G3/G4", () => {
    expect([1, 2, 3].map(levelToGrade)).toEqual(["G1", "G1", "G1"]);
    expect([4, 5, 6].map(levelToGrade)).toEqual(["G2", "G2", "G2"]);
    expect([7, 8].map(levelToGrade)).toEqual(["G3", "G3"]);
    expect([9, 10].map(levelToGrade)).toEqual(["G4", "G4"]);
  });

  it("levelRangeToGrades spans the grades a range touches", () => {
    expect(levelRangeToGrades([1, 3])).toEqual(["G1"]);
    expect(levelRangeToGrades([7, 10])).toEqual(["G3", "G4"]);
    expect(levelRangeToGrades([1, 10])).toEqual(["G1", "G2", "G3", "G4"]);
  });
});

describe("alias bridges between schemes", () => {
  it("maps each legacy band to its grade(s)", () => {
    expect(legacyBandToGrades("K-1")).toEqual(["G1"]);
    expect(legacyBandToGrades("2-3")).toEqual(["G2"]);
    expect(legacyBandToGrades("4-5")).toEqual(["G3", "G4"]);
    expect(legacyBandToGrades("nope")).toEqual([]);
  });

  it("maps each grade back to its legacy band", () => {
    expect(gradeToLegacyBand("G1")).toBe("K-1");
    expect(gradeToLegacyBand("G2")).toBe("2-3");
    expect(gradeToLegacyBand("G3")).toBe("4-5");
    expect(gradeToLegacyBand("G4")).toBe("4-5");
    expect(gradeToLegacyBand("G9")).toBe(null);
  });

  it("returns fresh arrays (no shared mutable state)", () => {
    const a = legacyBandToGrades("4-5");
    a.push("MUT");
    expect(legacyBandToGrades("4-5")).toEqual(["G3", "G4"]);
  });
});

describe("centralisation: downstream layers re-export the leaf", () => {
  it("itemBank/index.js re-exports the same band bindings", () => {
    expect(BANK_LEVEL_BANDS).toBe(LEVEL_BANDS);
    expect(bankLevelToBand(5)).toBe("2-3");
    expect(bankLevelRangeToBands([1, 10])).toEqual(["K-1", "2-3", "4-5"]);
  });

  it("modes/itemMetadata.js re-exports levelToGradeBand from the leaf", () => {
    expect(metaLevelToGradeBand).toBe(levelToGradeBand);
  });
});
