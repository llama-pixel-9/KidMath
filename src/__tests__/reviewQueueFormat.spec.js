import { describe, it, expect } from "vitest";
import { formatAnswer } from "../admin/reviewFormat.js";

// The card view shows the answer prominently, so it must render every answer
// shape the bank uses — a blank card answer would make review useless.
describe("formatAnswer", () => {
  it("renders plain numbers", () => {
    expect(formatAnswer(49)).toBe("49");
    expect(formatAnswer(0)).toBe("0");
  });
  it("renders fractions as num/den", () => {
    expect(formatAnswer({ num: 3, den: 4 })).toBe("3/4");
  });
  it("renders multi-answer arrays joined", () => {
    expect(formatAnswer([1, 4])).toBe("1, 4");
    expect(formatAnswer([{ num: 1, den: 2 }, 3])).toBe("1/2, 3");
  });
  it("renders symbol and string answers", () => {
    expect(formatAnswer("<")).toBe("<");
    expect(formatAnswer("True")).toBe("True");
  });
  it("shows a dash for a missing answer rather than blank", () => {
    expect(formatAnswer(null)).toBe("—");
    expect(formatAnswer(undefined)).toBe("—");
  });
});
