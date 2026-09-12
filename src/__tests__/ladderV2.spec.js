import { describe, it, expect, afterAll } from "vitest";
import { createAdaptiveSession, getNextQuestion, recordAnswer, recentBankWindow } from "../mathEngine.js";
import { selectApprovedBankItem, setBankItems, resetBankToBundle, ITEM_FAMILIES } from "../itemBank/index.js";
import { buildReport } from "../analytics/reportModel.js";
import { openSessionRecord, appendAttempt, closeSessionRecord } from "../analytics/sessionLog.js";

/**
 * Kid-sim fix plan, PR B. Pins the three behaviours the 2026-08 simulation
 * asked for: a slow-but-right kid can climb (ladder v2), a thin level-1 cell
 * does not loop the same prompt, and a session left early still counts.
 */

function playCorrect(session, ms, n) {
  let s = session;
  for (let i = 0; i < n; i++) {
    const { question, isRetry } = getNextQuestion(s);
    const a = Array.isArray(question.answer) && Array.isArray(question.answer[0]) ? question.answer[0] : question.answer;
    s = recordAnswer(s, question, a, ms, isRetry).session;
  }
  return s;
}

describe("ladder v2", () => {
  it("v1 parks a slow, accurate kid; v2 promotes on the same answers", () => {
    const slow = 14000; // well over the v1 8.5 s gate
    const v1 = playCorrect(createAdaptiveSession("addition", 15, { allowWordProblems: false }), slow, 6);
    const v2 = playCorrect(createAdaptiveSession("addition", 15, { allowWordProblems: false, ladderV2: true }), slow, 6);
    expect(v1.level).toBe(1);
    expect(v2.level).toBeGreaterThan(1);
  });

  it("v2 still gates on the kid's OWN pace: a sudden slowdown does not promote", () => {
    let s = createAdaptiveSession("addition", 20, { allowWordProblems: false, ladderV2: true });
    s = playCorrect(s, 3000, 5); // establishes a ~3 s median (and likely a promotion)
    const before = s.level;
    s = { ...s, correctStreak: 0 };
    s = playCorrect(s, 12000, 4); // 4× slower than their median → the fast path waits
    expect(s.level).toBe(before);
  });

  it("v2 demotes on the third miss, not the second", () => {
    const mk = (ladderV2) => {
      let s = createAdaptiveSession("addition", 15, { allowWordProblems: false, ladderV2 });
      s = { ...s, level: 5 };
      for (let i = 0; i < 2; i++) {
        const { question, isRetry } = getNextQuestion(s);
        s = recordAnswer(s, question, "nope", 3000, isRetry).session;
      }
      return s.level;
    };
    expect(mk(false)).toBeLessThan(5); // v1: second miss (or a 0/1 subskill) demotes
    expect(mk(true)).toBe(5);
  });

  it("no-repeat window is wider at low levels", () => {
    expect(recentBankWindow(1)).toBe(24);
    expect(recentBankWindow(3)).toBe(24);
    expect(recentBankWindow(4)).toBe(8);
  });
});

describe("thin subskill pools do not loop", () => {
  afterAll(() => resetBankToBundle());

  it("serves a fresh sibling-subskill item instead of a stale repeat", () => {
    const item = (id, subskill) => ({
      itemId: id,
      modeId: "multiplication",
      itemFamily: ITEM_FAMILIES.PROCEDURAL,
      subskill,
      structureType: "equalGroups",
      levelRange: [1, 3],
      reviewStatus: "approved",
      question: { a: 2, b: 3, op: "×", answer: 6, display: { promptText: `${id} = ?` } },
    });
    setBankItems([
      item("thin-1", "facts"),
      item("thin-2", "facts"),
      item("wide-1", "arrays"),
      item("wide-2", "arrays"),
      item("wide-3", "arrays"),
    ]);
    const picked = selectApprovedBankItem({
      modeId: "multiplication",
      level: 1,
      family: ITEM_FAMILIES.PROCEDURAL,
      targetSubskill: "facts",
      recentItemIds: ["thin-1", "thin-2"],
    });
    expect(picked.subskill).toBe("arrays");
  });
});

describe("partial sessions in the report", () => {
  const NOW = new Date("2026-08-22T18:00:00").getTime();
  const rec = (kind, misses) => {
    let r = openSessionRecord({ mode: "addition", level: 3, kind, now: NOW - 3600000, kidId: "k" });
    for (let i = 0; i < 5; i++) {
      r = appendAttempt(r, {
        question: { display: { promptText: `${i} + 1 = ?` }, answer: i + 1, metadata: { subskill: "makeTen", itemFamily: "procedural" } },
        submitted: i < misses ? 0 : i + 1,
        correct: i >= misses,
        wasRetry: false,
        responseTimeMs: 4000,
        level: 3,
        now: NOW - 3600000 + i * 1000,
      });
    }
    return closeSessionRecord(r, null, { starsEarned: 0, levelEnd: 3, now: NOW - 3600000 + 5 * 60000 });
  };

  it("counts a partial session's minutes and questions but not its level bookkeeping", () => {
    const r = buildReport([rec("normal", 0), rec("partial", 1)], { now: NOW, days: 7 });
    expect(r.totals.sessions).toBe(1);
    expect(r.totals.partialSessions).toBe(1);
    expect(r.totals.minutes).toBe(10);
    expect(r.totals.questions).toBe(10);
    expect(r.totals.accuracy).toBe(90);
    expect(r.totals.perfectSessions).toBe(1);
  });
});
