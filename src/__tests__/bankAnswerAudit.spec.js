import { describe, it, expect } from "vitest";
import { getBankItems, buildQuestionFromBankItem } from "../itemBank/index.js";
import { checkAnswer } from "../mathEngine";

/**
 * Does each banked item's stated answer actually answer the question it asks?
 *
 * The QC pass surfaced a set of items whose prompt asks for the missing addend
 * while the payload records the TOTAL as the answer. A child answering the
 * question correctly is marked wrong, which is the worst failure mode this app
 * has and is invisible to every other check: the schema is valid, the prose is
 * clean, and the arithmetic is internally consistent.
 */

describe("banked answers answer the question asked", () => {
  it("does not record the total as the answer to a missing-addend prompt", () => {
    const offenders = [];
    for (const item of getBankItems()) {
      const text = item.question?.display?.promptText || "";
      const { a, b, answer } = item.question || {};
      if ([a, b, answer].some((n) => typeof n !== "number")) continue;

      // "makes 10: 4 and what?" — the prompt names the total and one part, so
      // the answer must be the OTHER part, never the total it already states.
      const m = text.match(/makes (\d+)[:,]?\s*(\d+) and what/i);
      if (!m) continue;
      const total = Number(m[1]);
      const shown = Number(m[2]);
      const expected = total - shown;
      if (answer !== expected) {
        offenders.push({ itemId: item.itemId, text, answer, expected });
      }
    }
    expect(
      offenders.slice(0, 5),
      `${offenders.length} banked items answer a different question than they ask`
    ).toEqual([]);
  });

  it("accepts the answer its own prompt implies", () => {
    // Broader sweep: for any prompt of the form "<total> ... <part> and what",
    // the recorded answer must score correct through the real engine.
    let checked = 0;
    const wrong = [];
    for (const item of getBankItems()) {
      const text = item.question?.display?.promptText || "";
      const m = text.match(/makes (\d+)[:,]?\s*(\d+) and what/i);
      if (!m) continue;
      checked += 1;
      const expected = Number(m[1]) - Number(m[2]);
      const q = buildQuestionFromBankItem(item, { mode: item.modeId });
      if (!checkAnswer(q, expected)) {
        wrong.push({ itemId: item.itemId, text, expected, recorded: q.answer });
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(wrong.slice(0, 5), `${wrong.length} items reject their own correct answer`).toEqual([]);
  });
});
