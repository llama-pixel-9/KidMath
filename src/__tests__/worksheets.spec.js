import { describe, expect, it } from "vitest";
import {
  generateFlightLog,
  printOptionBank,
  isYesNoJudgment,
  questionAnswerType,
  FLIGHT_LOG_PART_A,
  FLIGHT_LOG_PART_B,
  FLIGHT_LOG_PROMPT_PART_A,
  FLIGHT_LOG_PROMPT_PART_B,
} from "../mathEngine";
import { MODE_IDS } from "../modes";

// Issue #34: worksheets are a premium launch feature. These are the paper
// rules — everything a sheet prints must be answerable with a pencil.

const SCREEN_VERBS = /\b(tap|press|drag|swipe|click|touch)\b/i;
const LEVELS = [1, 5, 10];

function allItems(log) {
  const items = [...log.partA, ...log.partB];
  if (log.partC) items.push(log.partC.question);
  return items;
}

function printedPrompt(q) {
  return q.display?.promptText || "";
}

describe("flight logs — paper rules (#34)", () => {
  it("no printed prompt carries screen-interaction language", () => {
    for (const mode of MODE_IDS) {
      for (const level of LEVELS) {
        const log = generateFlightLog(mode, level);
        for (const q of allItems(log)) {
          expect(
            SCREEN_VERBS.test(printedPrompt(q)),
            `${mode} L${level}: "${printedPrompt(q)}"`
          ).toBe(false);
        }
      }
    }
  });

  it("numeric answers never appear verbatim inside their own prompt", () => {
    // Prompt-mode sheets only: a stacked computation ("6 − 3 = ☐") contains
    // its operands by design and prints the a-op-b layout, not the prompt.
    for (const mode of MODE_IDS) {
      for (const level of LEVELS) {
        const log = generateFlightLog(mode, level);
        if (log.computational) continue;
        for (const q of [...log.partA, ...log.partB]) {
          const text = printedPrompt(q);
          if (typeof q.answer !== "number" || !text) continue;
          const re = new RegExp(`\\b${String(q.answer).replace(/\./g, "\\.")}\\b`);
          expect(re.test(text), `${mode} L${level}: "${text}" reveals ${q.answer}`).toBe(false);
        }
      }
    }
  });

  it("option banks print only where the options are the question", () => {
    for (const mode of MODE_IDS) {
      for (const level of LEVELS) {
        const log = generateFlightLog(mode, level);
        for (const q of [...log.partA, ...log.partB]) {
          if (questionAnswerType(q) !== "choice") continue;
          const bank = printOptionBank(q);
          const numericAnswer =
            typeof q.answer === "number" ||
            (typeof q.answer === "string" && /^-?\d+([./]\d+)?$/.test(q.answer.trim()));
          if (isYesNoJudgment(q)) {
            // Judgment prints as circle-Yes-or-No, never as a bank + box.
            expect(bank, `${mode} L${level} judgment bank`).toBeNull();
          } else if (!numericAnswer) {
            // A non-numeric answer is unanswerable without its options.
            expect(bank, `${mode} L${level}: "${printedPrompt(q)}"`).not.toBeNull();
          }
          if (bank) {
            expect(bank.map(String), `${mode} L${level} bank has answer`).toContain(String(q.answer));
          }
        }
      }
    }
  });

  it("prompt-mode sheets use the smaller one-page budget", () => {
    const log = generateFlightLog("skipCounting", 1);
    expect(log.computational).toBe(false);
    expect(log.partA.length).toBeLessThanOrEqual(FLIGHT_LOG_PROMPT_PART_A);
    expect(log.partB.length).toBeLessThanOrEqual(FLIGHT_LOG_PROMPT_PART_B);
    expect(log.itemCount).toBe(log.partA.length + log.partB.length + (log.partC ? 1 : 0));

    const sums = generateFlightLog("addition", 1);
    expect(sums.partA).toHaveLength(FLIGHT_LOG_PART_A);
    expect(sums.partB).toHaveLength(FLIGHT_LOG_PART_B);
    expect(sums.itemCount).toBe(FLIGHT_LOG_PART_A + FLIGHT_LOG_PART_B + (sums.partC ? 1 : 0));
  });

  it("allowWordProblems: false keeps stories off the sheet", () => {
    for (let run = 0; run < 10; run += 1) {
      const log = generateFlightLog("addition", 3, { allowWordProblems: false });
      expect(log.partC?.kind, "no story Part C").not.toBe("story");
      for (const q of allItems(log)) {
        expect(q.metadata?.itemFamily, printedPrompt(q)).not.toBe("application");
      }
    }
  });

  it("graph sheets carry their figures", () => {
    for (const level of LEVELS) {
      const log = generateFlightLog("dataGraphs", level);
      const items = [...log.partA, ...log.partB];
      expect(items.length, `dataGraphs L${level} draws items`).toBeGreaterThan(0);
      for (const q of items) {
        expect(q.display?.figure, `dataGraphs L${level}: "${printedPrompt(q)}"`).toBeTruthy();
      }
    }
  });

  it("prompts are unique within a sheet", () => {
    for (const mode of ["skipCounting", "placeValue", "time"]) {
      const log = generateFlightLog(mode, 5);
      const prompts = allItems(log).map(printedPrompt).filter(Boolean);
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });
});
