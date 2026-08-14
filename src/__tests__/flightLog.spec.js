import { describe, expect, it } from "vitest";
import {
  generateFlightLog,
  flightLogScope,
  FLIGHT_LOG_PART_A,
  FLIGHT_LOG_PART_B,
} from "../mathEngine";
import { maxTotalForLevel } from "../modes/structures/levelPolicy";
import { MODE_IDS } from "../modes";

const OPS = { "+": (a, b) => a + b, "-": (a, b) => a - b, "x": (a, b) => a * b, "/": (a, b) => a / b };

function computationItems(log) {
  return [...log.partA, ...log.partB];
}

describe("generateFlightLog — §15 sheet structure", () => {
  it("returns stacked + inline blocks and a word-problems block by default", () => {
    const log = generateFlightLog("addition", 1);
    expect(log.partA).toHaveLength(FLIGHT_LOG_PART_A);
    expect(log.partB).toHaveLength(FLIGHT_LOG_PART_B);
    expect(log.wordProblems.length).toBeGreaterThan(0);
    expect(log.computational).toBe(true);
  });

  it("Parts A/B are pure computations whose blank is the result slot", () => {
    for (const mode of ["addition", "subtraction", "multiplication", "division"]) {
      for (const level of [1, 4, 8]) {
        const log = generateFlightLog(mode, level);
        for (const q of computationItems(log)) {
          const fn = OPS[q.op];
          expect(fn, `${mode} L${level} op ${q.op}`).toBeTypeOf("function");
          // Never a filled result slot: the answer must be a op b exactly.
          expect(fn(q.a, q.b)).toBe(q.answer);
          expect(Number.isInteger(q.answer)).toBe(true);
        }
      }
    }
  });

  it("additive operands obey the level range (L1 = sums within 10)", () => {
    for (const mode of ["addition", "subtraction"]) {
      for (const level of [1, 2, 3]) {
        const cap = maxTotalForLevel(level);
        const log = generateFlightLog(mode, level);
        for (const q of computationItems(log)) {
          expect(q.a, `${mode} L${level}`).toBeLessThanOrEqual(cap);
          expect(q.b, `${mode} L${level}`).toBeLessThanOrEqual(cap);
          expect(q.answer, `${mode} L${level}`).toBeLessThanOrEqual(cap);
        }
      }
    }
  });

  it("has no duplicate items (commutative pairs count as duplicates)", () => {
    for (let run = 0; run < 5; run += 1) {
      const log = generateFlightLog("addition", 1);
      const keys = computationItems(log).map((q) => {
        const pair = [q.a, q.b].sort((x, y) => x - y);
        return `${q.op}:${pair.join(",")}`;
      });
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("caps identity/zero facts at one per sheet", () => {
    for (let run = 0; run < 10; run += 1) {
      const log = generateFlightLog("addition", 1);
      const zeroFacts = computationItems(log).filter((q) => q.a === 0 || q.b === 0);
      expect(zeroFacts.length).toBeLessThanOrEqual(1);
    }
  });

  it("never repeats prompt wording on one sheet", () => {
    for (const mode of ["addition", "time", "counting"]) {
      const log = generateFlightLog(mode, 2);
      const prompts = [...computationItems(log), ...(log.wordProblems || []).map((w) => w.question)]
        .filter(Boolean)
        .map((q) => q.display?.promptText)
        .filter(Boolean)
        .map((t) => t.trim().toLowerCase());
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });

  it("pick-two word problems always carry their number bank", () => {
    // Draw many logs; whenever the pickTwo shape appears it must be printable.
    for (let run = 0; run < 20; run += 1) {
      const log = generateFlightLog("addition", 1);
      for (const item of log.wordProblems.filter((w) => w.kind === "pickTwo")) {
        const q = item.question;
        expect(Array.isArray(q.display.options)).toBe(true);
        expect(q.display.options.length).toBeGreaterThan(0);
        // The structured answer line needs the whole (q.a) and a valid pair.
        const pair = Array.isArray(q.answer?.[0]) ? q.answer[0] : q.answer;
        expect(pair[0] + pair[1]).toBe(q.a);
      }
    }
  });

  it("every mode produces a full sheet without throwing", () => {
    for (const mode of MODE_IDS) {
      const log = generateFlightLog(mode, 2);
      expect(log.partA.length, mode).toBeGreaterThan(0);
      expect(log.partB.length, mode).toBeGreaterThan(0);
    }
  });

  it("scope phrase tracks the level for additive modes", () => {
    expect(flightLogScope("addition", 1)).toBe("Sums to 10");
    expect(flightLogScope("addition", 4)).toBe("Sums to 20");
    expect(flightLogScope("subtraction", 1)).toBe("Take away to 10");
    expect(flightLogScope("time", 1)).toBe("Read a clock");
  });
});
