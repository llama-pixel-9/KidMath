import { describe, it, expect } from "vitest";
import {
  MISCONCEPTION_STRATEGIES,
  misconceptionCandidates,
  buildArithmeticDistractors,
  buildDistractors,
} from "../modes/distractors";
import { getModeConfig } from "../modes";

/**
 * The contract: a wrong answer should DIAGNOSE. If a child picks the option a
 * strategy produced, we learn which mistake they made. Before M5 only four
 * strategies existed and every other tag was decorative — written to metadata,
 * never used to build an option.
 */

describe("misconception strategies", () => {
  it("produces a diagnostic option for every tag the modes emit", () => {
    // Sweep the tags actually written by generators and make sure none is
    // decorative. A tag with no strategy is metadata that lies.
    const emitted = new Set();
    for (const mode of [
      "addition",
      "subtraction",
      "multiplication",
      "division",
    ]) {
      const config = getModeConfig(mode);
      for (let level = 1; level <= 10; level++) {
        for (let i = 0; i < 40; i++) {
          for (const t of config.generate(level).metadata?.misconceptionTags || []) {
            emitted.add(t);
          }
        }
      }
    }
    expect(emitted.size).toBeGreaterThan(4);
    for (const tag of emitted) {
      expect(MISCONCEPTION_STRATEGIES[tag], `${tag} has no strategy — decorative tag`).toBeTruthy();
    }
  });

  it("models the start-unknown error as adding the givens", () => {
    // `? + 3 = 5` answered as 8.
    expect(MISCONCEPTION_STRATEGIES.startAsResult({ a: 3, b: 5 })).toContain(8);
  });

  it("models the compare language trap as the opposite operation", () => {
    // Structure needs adding (answer is the sum) -> the trap is the difference.
    expect(MISCONCEPTION_STRATEGIES.keywordTrap({ a: 2, b: 3, answer: 5 })).toContain(1);
    // Structure needs subtracting -> the trap is the sum.
    expect(MISCONCEPTION_STRATEGIES.keywordTrap({ a: 5, b: 3, answer: 2 })).toContain(8);
  });

  it("models multiplicative compare read additively", () => {
    // "3 times as much as 6" read as "3 more than 6".
    expect(MISCONCEPTION_STRATEGIES.compareAsAdditive({ a: 3, b: 6 })).toContain(9);
  });

  it("models division performed the wrong way round", () => {
    expect(MISCONCEPTION_STRATEGIES.divisionReversed({ a: 18, b: 3 })).toContain(1 / 6);
  });

  it("models the equals-means-compute error", () => {
    // `8 + 4 = ? + 5` answered 12 (the left-hand side).
    expect(MISCONCEPTION_STRATEGIES.equalsMeansCompute({ a: 8, b: 4 })).toContain(12);
  });

  it("models area/perimeter confusion in both directions", () => {
    // Use a rectangle where area and perimeter differ, or the assertion is
    // vacuous — for 3x6 both happen to be 18.
    const out = MISCONCEPTION_STRATEGIES.areaPerimeterSwap({ width: 2, height: 5 });
    expect(out).toContain(10); // area, offered when perimeter was asked
    expect(out).toContain(14); // perimeter, offered when area was asked
  });

  it("models protractor misreading as the supplement", () => {
    expect(MISCONCEPTION_STRATEGIES.protractorMisread({ answer: 40 })).toContain(140);
  });

  it("models counting slips in both directions", () => {
    expect(MISCONCEPTION_STRATEGIES.skipObject({ answer: 8 })).toContain(7);
    expect(MISCONCEPTION_STRATEGIES.doubleCount({ answer: 8 })).toContain(9);
  });

  it("flips comparison symbols", () => {
    expect(MISCONCEPTION_STRATEGIES.symbolFlip({ answer: "<" })).toEqual([">"]);
    expect(MISCONCEPTION_STRATEGIES.symbolFlip({ answer: ">" })).toEqual(["<"]);
  });

  it("returns nothing rather than throwing when a strategy does not fit", () => {
    for (const [tag, strategy] of Object.entries(MISCONCEPTION_STRATEGIES)) {
      expect(() => strategy({}), tag).not.toThrow();
    }
    expect(misconceptionCandidates(["notARealTag"], { answer: 5 })).toEqual([]);
  });
});

describe("distractor sets", () => {
  it("always includes the answer and never duplicates", () => {
    for (let i = 0; i < 200; i++) {
      const answer = 3 + (i % 40);
      const choices = buildArithmeticDistractors({
        answer,
        a: 7,
        b: answer - 7,
        misconceptions: ["offByOne", "operationSwap", "placeValueSlip"],
      });
      expect(choices).toContain(answer);
      expect(new Set(choices).size).toBe(choices.length);
      expect(choices).toHaveLength(4);
    }
  });

  it("never offers a negative option", () => {
    for (let i = 0; i < 200; i++) {
      for (const c of buildArithmeticDistractors({ answer: 2, a: 1, b: 1, misconceptions: ["offByOne"] })) {
        expect(c).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("prefers diagnostic options over generic near-misses", () => {
    // startAsResult on `? + 3 = 5` should survive the four-option cap.
    let hits = 0;
    for (let i = 0; i < 100; i++) {
      const choices = buildArithmeticDistractors({
        answer: 2,
        a: 3,
        b: 5,
        misconceptions: ["startAsResult"],
      });
      if (choices.includes(8)) hits += 1;
    }
    expect(hits).toBeGreaterThan(90);
  });

  it("keeps every option an integer", () => {
    for (let i = 0; i < 200; i++) {
      const choices = buildArithmeticDistractors({
        answer: 6,
        a: 18,
        b: 3,
        misconceptions: ["divisionReversed", "partitiveQuotitiveConfusion"],
      });
      for (const c of choices) expect(Number.isInteger(c), `${c} is not an integer`).toBe(true);
    }
  });

  it("declines non-numeric answers rather than inventing options", () => {
    expect(buildDistractors({ answer: "True" })).toBeNull();
  });
});

describe("every mode offers usable choices", () => {
  it("gives multiple-choice items four distinct options including the answer", () => {
    for (const mode of ["addition", "subtraction", "multiplication", "division"]) {
      const config = getModeConfig(mode);
      for (let level = 1; level <= 10; level++) {
        for (let i = 0; i < 30; i++) {
          const q = config.generate(level);
          if (q.answerType && q.answerType !== "choice") continue;
          const choices = q.choices || config.generateChoices?.(q.answer, q);
          if (!choices) continue;
          expect(choices, `${mode} L${level}`).toContain(q.answer);
          expect(new Set(choices).size).toBe(choices.length);
        }
      }
    }
  });
});
