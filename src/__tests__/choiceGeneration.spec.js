import { describe, expect, it } from "vitest";
import {
  generateChoices,
  generateQuestion,
  MODES,
  MAX_LEVEL,
} from "../mathEngine";
import placeValueMode from "../modes/placeValue";

// Generous per-call budget so CI fluctuations don't flake. The bug we
// guard against would loop forever, not finish in 250ms.
const HARD_TIMEOUT_MS = 250;

function runWithTimeBudget(fn) {
  const start = Date.now();
  const result = fn();
  const elapsed = Date.now() - start;
  return { result, elapsed };
}

describe("choice generation cannot hang", () => {
  for (const mode of MODES) {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      it(`${mode} L${level}: generateQuestion + generateChoices completes for many seeds`, () => {
        for (let seed = 0; seed < 200; seed++) {
          const { result: question, elapsed } = runWithTimeBudget(() =>
            generateQuestion(mode, level)
          );
          expect(elapsed).toBeLessThan(HARD_TIMEOUT_MS);
          const choicesRun = runWithTimeBudget(() =>
            generateChoices(question.answer, 4, question)
          );
          expect(choicesRun.elapsed).toBeLessThan(HARD_TIMEOUT_MS);
          expect(choicesRun.result.length).toBeGreaterThanOrEqual(3);
          expect(choicesRun.result.length).toBeLessThanOrEqual(4);
          expect(
            choicesRun.result.includes(question.answer) ||
              // Comparing mode returns operator choices not numeric answers
              choicesRun.result.every((c) => typeof c === "string")
          ).toBe(true);
        }
      });
    }
  }

  it("placeValue ONES_IN with answer=0 does not hang generateChoices", () => {
    const question = {
      a: 10,
      b: null,
      op: "place",
      answer: 0,
      level: 1,
      display: { type: "ones_in", promptText: "How many ones in 10?", number: 10, tens: 1, ones: 0 },
      mode: "placeValue",
    };
    const { result, elapsed } = runWithTimeBudget(() =>
      placeValueMode.generateChoices(question.answer, question)
    );
    expect(elapsed).toBeLessThan(HARD_TIMEOUT_MS);
    expect(result).toHaveLength(4);
    expect(result).toContain(0);
    expect(new Set(result).size).toBe(4);
  });

  it("placeValue ONES_IN with answer=0 across many calls stays bounded", () => {
    const question = {
      a: 10,
      b: null,
      op: "place",
      answer: 0,
      level: 1,
      display: { type: "ones_in", promptText: "How many ones in 10?", number: 10, tens: 1, ones: 0 },
      mode: "placeValue",
    };
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const choices = placeValueMode.generateChoices(0, question);
      expect(choices).toHaveLength(4);
      expect(choices).toContain(0);
    }
    expect(Date.now() - start).toBeLessThan(500);
  });
});
