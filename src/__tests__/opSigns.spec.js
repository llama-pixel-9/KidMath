import { describe, it, expect } from "vitest";
import { asciiOp, opGlyph, typesetSigns } from "../opSigns.js";

describe("operation signs", () => {
  it("maps each sign between its two spellings", () => {
    for (const [ascii, glyph] of [["-", "−"], ["x", "×"], ["/", "÷"]]) {
      expect(opGlyph(ascii)).toBe(glyph);
      expect(asciiOp(glyph)).toBe(ascii);
      expect(asciiOp(opGlyph(ascii))).toBe(ascii);
      expect(opGlyph(opGlyph(ascii))).toBe(glyph);
    }
    expect(opGlyph("+")).toBe("+");
    expect(asciiOp("+")).toBe("+");
    expect(asciiOp("*")).toBe("x");
    expect(opGlyph("*")).toBe("×");
    expect(asciiOp("count")).toBe("count");
  });

  it("typesets the signs of a written equation", () => {
    expect(typesetSigns("17 - 5 = ?")).toBe("17 − 5 = ?");
    expect(typesetSigns("? x 3 = 21")).toBe("? × 3 = 21");
    expect(typesetSigns("114 / 6 = ?")).toBe("114 ÷ 6 = ?");
    expect(typesetSigns("(4 x 2) x 5 = ?")).toBe("(4 × 2) × 5 = ?");
    expect(typesetSigns("8 + 5 = ?")).toBe("8 + 5 = ?");
  });

  it("leaves fractions, ranges and words alone", () => {
    expect(typesetSigns("Which fraction equals 3/4?")).toBe("Which fraction equals 3/4?");
    expect(typesetSigns("Pick a number from 5-10.")).toBe("Pick a number from 5-10.");
    expect(typesetSigns("Find the x-coordinate.")).toBe("Find the x-coordinate.");
    expect(typesetSigns("Draw an x on 4.")).toBe("Draw an x on 4.");
    expect(typesetSigns(undefined)).toBe(undefined);
  });
});
