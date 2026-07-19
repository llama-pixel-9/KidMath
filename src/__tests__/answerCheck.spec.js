import { describe, it, expect } from "vitest";
import { checkAnswer, questionAnswerType } from "../mathEngine.js";

describe("questionAnswerType", () => {
  it("defaults to 'choice' when unset", () => {
    expect(questionAnswerType({ answer: 5 })).toBe("choice");
    expect(questionAnswerType(null)).toBe("choice");
    expect(questionAnswerType(undefined)).toBe("choice");
  });

  it("returns the explicit answerType when present", () => {
    expect(questionAnswerType({ answer: 5, answerType: "numberPad" })).toBe("numberPad");
  });
});

describe("checkAnswer — choice (default, regression-identical)", () => {
  it("is exactly submitted === question.answer for the default type", () => {
    expect(checkAnswer({ answer: 7 }, 7)).toBe(true);
    expect(checkAnswer({ answer: 7 }, 8)).toBe(false);
    // Strict equality semantics preserved: a string is not the number.
    expect(checkAnswer({ answer: 7 }, "7")).toBe(false);
    expect(checkAnswer({ answer: 0 }, 0)).toBe(true);
  });

  it("behaves identically when answerType is explicitly 'choice'", () => {
    expect(checkAnswer({ answer: 12, answerType: "choice" }, 12)).toBe(true);
    expect(checkAnswer({ answer: 12, answerType: "choice" }, 13)).toBe(false);
  });
});

describe("checkAnswer — numberPad (typed numeric)", () => {
  const q = { answer: 324, answerType: "numberPad" };

  it("accepts the correct number (typed as number or numeric string)", () => {
    expect(checkAnswer(q, 324)).toBe(true);
    expect(checkAnswer(q, "324")).toBe(true);
  });

  it("rejects a wrong number", () => {
    expect(checkAnswer(q, 325)).toBe(false);
    expect(checkAnswer(q, "32")).toBe(false);
  });

  it("rejects empty / null / undefined / non-numeric entries", () => {
    expect(checkAnswer(q, "")).toBe(false);
    expect(checkAnswer(q, null)).toBe(false);
    expect(checkAnswer(q, undefined)).toBe(false);
    expect(checkAnswer(q, "abc")).toBe(false);
  });

  it("compares numerically (leading zeros, integer answers)", () => {
    expect(checkAnswer({ answer: 7, answerType: "numberPad" }, "07")).toBe(true);
    expect(checkAnswer({ answer: 40, answerType: "numberPad" }, "40")).toBe(true);
  });
});
