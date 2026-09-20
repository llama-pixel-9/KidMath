import { beforeAll, describe, expect, it, vi } from "vitest";
import { FULL_ITEMS } from "../itemBank/fullBank";
import { setBankItems } from "../itemBank";
import { createAdaptiveSession, getNextQuestion, isSessionComplete, recordAnswer } from "../mathEngine";
import { applySession } from "../skills/mastery";
import { playSkillById, playSkills, skillsForPlay } from "../skills/play";
import { skillServable } from "../skills/session";
import { checkItems } from "../worksheets/claimCheck";

vi.setConfig({ testTimeout: 30000 });
beforeAll(() => setBankItems(FULL_ITEMS, "test"));

const fresh = { level: 1, mistakeBank: [], bankItemStats: {}, recentBankItemIds: [] };

/** Play a session to the end; `answer(q, n)` decides right (true) or wrong. */
function play(mode, options, { size = 15, answer = () => true } = {}) {
  let session = createAdaptiveSession(mode, size, { savedProgress: fresh, allowWordProblems: true, ...options });
  const served = [];
  let guard = 0;
  while (!isSessionComplete(session) && guard < 200) {
    guard += 1;
    const { question, isRetry } = getNextQuestion(session);
    const right = answer(question, served.length);
    const wrong = typeof question.answer === "number" ? question.answer + 1 : "__wrong__";
    const result = recordAnswer(session, question, right ? question.answer : wrong, 3000, isRetry);
    expect(result.levelChanged, "no ladder inside a skill session").toBe(false);
    served.push({ question, isRetry, correct: result.correct });
    session = result.session;
  }
  return { session, served };
}

describe("a session without skills is the session it always was", () => {
  it("carries no skill fields and still climbs the ladder", () => {
    const session = createAdaptiveSession("addition", 15, { savedProgress: fresh });
    expect(session.skillIds).toBeUndefined();
    expect(session.level).toBe(1);
  });
});

describe("pinned skill session", () => {
  it("a bank skill: every question is an approved bank row from the skill's own cell", () => {
    const skill = playSkillById("time-read-clock-4");
    const { session, served } = play("time", { skillId: skill.id });
    expect(session.pinned).toBe(true);
    for (const { question: q } of served) {
      expect(q.skillId).toBe(skill.id);
      expect(q.metadata.itemSource).toBe("bank");
      expect(skill.source.subskills).toContain(q.metadata.subskill);
      expect(q.level >= skill.source.levels[0] && q.level <= skill.source.levels[1]).toBe(true);
    }
    // The merged twin serves pictured AND un-pictured items — one skill in play.
    // (About one row in six is pictured, so look across a long session.)
    const long = play("time", { skillId: skill.id }, { size: 60 }).served;
    expect(new Set(long.map(({ question: q }) => Boolean(q.display?.figure))).size).toBe(2);
    expect(session.level).toBe(skill.level);
  });

  it("a twin's picture id starts the merged skill", () => {
    const { session } = play("time", { skillId: "time-read-clock-4-pic" }, { size: 3 });
    expect(session.skillIds).toEqual(["time-read-clock-4"]);
  });

  it("a drill: every question keeps the skill's promise, looks like the mode's own, and rarely repeats", () => {
    const skill = playSkillById("sub-3digit-regroup");
    const { served } = play("subtraction", { skillId: skill.id });
    const questions = served.map((s) => s.question);
    expect(checkItems(questions, skill.source)).toEqual([]);
    for (const q of questions) {
      expect(q.skillId).toBe(skill.id);
      expect(q.mode).toBe("subtraction");
      expect(q.metadata.itemSource).toBe("skillSampler");
      expect(q.itemKey).toBeTruthy();
      expect(q.distractorContext).toEqual({ a: q.a, b: q.b });
      // Three-digit answers are typed, not spotted among look-alikes.
      expect(q.answerType).toBe(q.answer >= 100 ? "numberPad" : undefined);
      if (!q.answerType) expect(q.choices.map(String)).toContain(String(q.answer));
    }
    expect(new Set(questions.map((q) => `${q.a}-${q.b}`)).size).toBe(questions.length);
  });

  it("facts are answered by choice, with the answer among the options", () => {
    const { served } = play("multiplication", { skillId: "mul-tables-7-8-9" }, { size: 10 });
    for (const { question: q } of served) {
      expect(q.choices.length).toBeGreaterThanOrEqual(3);
      expect(q.choices.map(String)).toContain(String(q.answer));
    }
  });

  it("missed questions come back, and only this skill's — another skill's old mistake waits its turn", () => {
    const stranger = { ...play("subtraction", { skillId: "sub-across-zeros" }, { size: 1 }).served[0].question, dueAt: 0 };
    const { served } = play(
      "subtraction",
      { skillId: "sub-3digit-regroup", savedProgress: { ...fresh, mistakeBank: [stranger] } },
      { size: 15, answer: (q, n) => n !== 0 }
    );
    const retries = served.filter((s) => s.isRetry);
    expect(retries.length).toBeGreaterThan(0);
    for (const { question } of retries) expect(question.skillId).toBe("sub-3digit-regroup");
  });

  it("word problems off: no story is served, and the session still fills", () => {
    const { served } = play("subtraction", { skillId: "sub-missing-number-1000", allowWordProblems: false });
    expect(served.filter((s) => !s.isRetry)).toHaveLength(15);
    for (const { question: q } of served) expect(q.metadata.itemFamily).not.toBe("application");
  });

  it("word problems on: a skill with stories mixes them in", () => {
    const { served } = play("subtraction", { skillId: "sub-missing-number-1000", allowWordProblems: true });
    expect(served.some(({ question: q }) => q.metadata.itemFamily === "application")).toBe(true);
  });
});

describe("mixed session — Larkit picks", () => {
  const skills = skillsForPlay("3", "subtraction");
  const ids = skills.map((s) => s.id);

  it("interleaves the grade's skills and never asks three in a row from one", () => {
    const { served } = play("subtraction", { skillIds: ids, grade: "3" }, { size: 15 });
    const order = served.filter((s) => !s.isRetry).map((s) => s.question.skillId);
    expect(new Set(order).size).toBeGreaterThan(1);
    for (let i = 2; i < order.length; i += 1) {
      expect(order[i] === order[i - 1] && order[i] === order[i - 2], `three in a row at ${i}: ${order[i]}`).toBe(false);
    }
    for (const id of order) expect(ids).toContain(id);
  });

  it("works on what is not mastered; a mastered skill only returns as the occasional review", () => {
    const mastered = ids[0];
    const log = (n) => ({ id: `m${n}`, mode: "subtraction", kind: "normal", startedAt: n, endedAt: n + 1,
      attempts: Array.from({ length: 5 }, () => ({ skillId: mastered, correct: true, retry: false })) });
    const masterySnapshot = [log(1), log(2)].reduce(applySession, {});
    const { session, served } = play("subtraction", { skillIds: ids, grade: "3", masterySnapshot }, { size: 15 });
    expect(session.focus).not.toContain(mastered);
    const reviews = served.filter((s) => !s.isRetry && s.question.skillId === mastered).length;
    expect(reviews).toBeGreaterThan(0);
    expect(reviews).toBeLessThanOrEqual(3);
  });

  it("a skill going well in-session hands its focus slot to the next one waiting", () => {
    const many = skillsForPlay("4", "factorsMultiples").map((s) => s.id);
    expect(many.length).toBeGreaterThan(4);
    const { session } = play("factorsMultiples", { skillIds: many, grade: "4" }, { size: 30 });
    expect(session.bench.length).toBeLessThan(many.length - 3);
  });

  it("the grade-up challenge walks the grade's skills in order, six questions", () => {
    const { served } = play("subtraction", { skillIds: ids, challenge: true, fledging: true }, { size: 6 });
    expect(served.map((s) => s.question.skillId)).toEqual(Array.from({ length: 6 }, (_, i) => ids[i % ids.length]));
  });
});

describe("every playable skill can be played", () => {
  it("from the full bank, with word problems on and off", () => {
    const unservable = playSkills().filter((s) => !skillServable(s.id) || !skillServable(s.id, { allowWordProblems: false }));
    expect(unservable.map((s) => s.id)).toEqual([]);
  });

  for (const skill of playSkills()) {
    it(`${skill.id}: five valid questions, all its own`, () => {
      const { served } = play(skill.mode, { skillId: skill.id }, { size: 5 });
      expect(served.filter((s) => !s.isRetry)).toHaveLength(5);
      for (const { question: q } of served) {
        expect(q.skillId, "served from the skill's cell, not the fallback").toBe(skill.id);
        expect(q.answer).not.toBeUndefined();
      }
    });
  }
});
