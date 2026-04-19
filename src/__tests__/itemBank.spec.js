import { describe, expect, it } from "vitest";
import {
  APPLICATION_ITEM_BANK,
  REVIEW_STATUS,
  buildQuestionFromBankItem,
  selectApprovedApplicationItem,
  validateBank,
  getBankCoverage,
} from "../itemBank.js";
import {
  createAdaptiveSession,
  generateQuestion,
  recordAnswer,
  getBankFallbackStats,
  resetBankFallbackStats,
} from "../mathEngine";

const REQUIRED_MODES = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "comparing",
  "counting",
  "skipCounting",
  "placeValue",
];

describe("application item bank", () => {
  it("contains approved entries for each required mode", () => {
    const modes = new Set(
      APPLICATION_ITEM_BANK.filter((item) => item.reviewStatus === REVIEW_STATUS.APPROVED).map(
        (item) => item.modeId
      )
    );
    for (const mode of REQUIRED_MODES) {
      expect(modes.has(mode)).toBe(true);
    }
  });

  it("passes structural validation (no missing fields, no duplicate ids/prompts)", () => {
    const result = validateBank(APPLICATION_ITEM_BANK);
    if (!result.valid) {
      console.error(JSON.stringify(result.issues, null, 2));
    }
    expect(result.valid).toBe(true);
  });

  it("meets minimum per-(mode,subskill) coverage of 3 approved items", () => {
    const counts = getBankCoverage();
    const failures = [];
    for (const item of APPLICATION_ITEM_BANK) {
      if (item.reviewStatus !== REVIEW_STATUS.APPROVED) continue;
      const key = `${item.modeId}::${item.subskill}`;
      if ((counts.get(key) || 0) < 3) failures.push(key);
    }
    if (failures.length > 0) {
      console.error("Coverage below threshold:", [...new Set(failures)]);
    }
    expect(failures).toEqual([]);
  });

  it("returns an approved item for the requested mode and subskill", () => {
    const item = selectApprovedApplicationItem({
      modeId: "addition",
      level: 10,
      targetSubskill: "makeTen",
    });
    expect(item).toBeTruthy();
    expect(item.modeId).toBe("addition");
    expect(item.reviewStatus).toBe(REVIEW_STATUS.APPROVED);
    expect(item.subskill).toBe("makeTen");
  });

  it("avoids items in the recent exposure window when alternates exist", () => {
    const first = selectApprovedApplicationItem({
      modeId: "subtraction",
      level: 10,
      targetSubskill: "differenceAsDistance",
    });
    expect(first).toBeTruthy();

    const next = selectApprovedApplicationItem({
      modeId: "subtraction",
      level: 10,
      targetSubskill: "differenceAsDistance",
      recentItemIds: [first.itemId],
    });
    expect(next).toBeTruthy();
    expect(next.itemId).not.toBe(first.itemId);
  });

  it("builds a question payload with metadata overrides and structureType", () => {
    const item = selectApprovedApplicationItem({
      modeId: "division",
      level: 10,
      targetSubskill: "partitioning",
    });
    const question = buildQuestionFromBankItem(item, 10);
    expect(question).toBeTruthy();
    expect(question.level).toBe(10);
    expect(question.metadataOverrides.itemId).toBe(item.itemId);
    expect(question.metadataOverrides.itemSource).toBe("bank");
    expect(question.metadataOverrides.structureType).toBe(item.structureType);
    expect(question.display.promptText.length).toBeGreaterThan(0);
  });
});

describe("session exposure tracking and per-item stats", () => {
  function answerAt(session, allowWordProblems = true) {
    const q = generateQuestion(session.mode, session.level, {
      itemFamily: "application",
      targetSubskill: "makeTen",
      allowWordProblems,
      recentBankItemIds: session.recentBankItemIds || [],
    });
    return q;
  }

  it("records bankItemStats and recentBankItemIds when a bank item is answered", () => {
    let session = createAdaptiveSession("addition", 5, { allowWordProblems: true });
    session.level = 10;

    const q = answerAt(session);
    expect(q.metadata.itemSource).toBe("bank");
    const itemId = q.metadata.itemId;
    expect(itemId).toBeTruthy();

    const result = recordAnswer(session, q, q.answer, 1500, false);
    expect(result.session.recentBankItemIds).toContain(itemId);
    expect(result.session.bankItemStats[itemId].attempts).toBe(1);
    expect(result.session.bankItemStats[itemId].correct).toBe(1);
    expect(result.session.bankItemStats[itemId].firstTryCorrect).toBe(1);
  });

  it("does not repeat the same bank item back-to-back when alternates exist", () => {
    let session = createAdaptiveSession("addition", 5, { allowWordProblems: true });
    session.level = 10;

    const first = answerAt(session);
    const result = recordAnswer(session, first, first.answer, 1500, false);
    const next = answerAt(result.session);
    expect(next.metadata.itemId).not.toBe(first.metadata.itemId);
  });

  it("aggregates bank item stats across multiple attempts", () => {
    let session = createAdaptiveSession("addition", 5, { allowWordProblems: true });
    session.level = 10;

    const q1 = answerAt(session);
    const after1 = recordAnswer(session, q1, q1.answer, 1500, false);
    const after1Wrong = recordAnswer(after1.session, q1, q1.answer + 1, 2000, false);

    const stats = after1Wrong.session.bankItemStats[q1.metadata.itemId];
    expect(stats.attempts).toBe(2);
    expect(stats.correct).toBe(1);
    expect(stats.firstTryCorrect).toBe(1);
    expect(stats.totalResponseMs).toBe(3500);
  });
});

describe("bank fallback and observability", () => {
  it("tracks bank-served vs fallback rates via getBankFallbackStats", () => {
    resetBankFallbackStats();
    const initial = getBankFallbackStats();
    expect(initial.applicationRequested).toBe(0);
    expect(initial.bankServed).toBe(0);
    expect(initial.fallbackToGenerated).toBe(0);

    for (let i = 0; i < 5; i++) {
      generateQuestion("addition", 10, {
        itemFamily: "application",
        allowWordProblems: true,
      });
    }
    const after = getBankFallbackStats();
    expect(after.applicationRequested).toBe(5);
    expect(after.bankServed).toBe(5);
    expect(after.fallbackToGenerated).toBe(0);
  });

  it("throws when requireBankForApplication is set and no bank item exists for the (mode, level) bucket", () => {
    // Level 1 is below every approved item's levelRange (currently min 7),
    // so the bank pool is empty and strict mode must throw.
    expect(() =>
      generateQuestion("addition", 1, {
        itemFamily: "application",
        allowWordProblems: true,
        requireBankForApplication: true,
      })
    ).toThrow(/Bank-required application item missing/);
  });

  it("does not throw when requireBankForApplication is unset and falls back gracefully", () => {
    resetBankFallbackStats();
    // Same low level but without strict requirement: fallback must succeed silently.
    const q = generateQuestion("addition", 1, {
      itemFamily: "application",
      allowWordProblems: true,
    });
    expect(q.metadata.itemSource).toBe("generated");
    const stats = getBankFallbackStats();
    expect(stats.applicationRequested).toBe(1);
    expect(stats.fallbackToGenerated).toBe(1);
  });
});
