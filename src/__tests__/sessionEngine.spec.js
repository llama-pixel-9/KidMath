import { describe, expect, it } from "vitest";
import {
  createAdaptiveSession,
  getNextQuestion,
  recordAnswer,
} from "../mathEngine";

describe("adaptive session engine", () => {
  it("stores full question context in mistake bank", () => {
    const session = createAdaptiveSession("skipCounting", 5);
    const { question } = getNextQuestion(session);
    const result = recordAnswer(session, question, null, 1200, false);
    const stored = result.session.mistakeBank[0];
    expect(stored).toBeTruthy();
    expect(stored.mode).toBe("skipCounting");
    expect(stored.display).toBeTruthy();
    expect(stored.metadata).toBeTruthy();
    expect(stored.itemKey).toBeTruthy();
  });

  it("tracks mastery by subskill for answered questions", () => {
    const session = createAdaptiveSession("addition", 5);
    const { question } = getNextQuestion(session);
    const result = recordAnswer(session, question, question.answer, 1000, false);
    const subskill = question.metadata.subskill;
    expect(result.session.skillMastery[subskill].attempts).toBe(1);
    expect(result.session.skillMastery[subskill].correct).toBe(1);
  });

  it("disables story/application items when word problems are off", () => {
    let session = createAdaptiveSession("addition", 40, { allowWordProblems: false });
    session.level = 10;
    for (let i = 0; i < 20; i++) {
      const { question } = getNextQuestion(session);
      expect(question.metadata.itemFamily).not.toBe("application");
      const result = recordAnswer(session, question, question.answer, 1200, false);
      session = result.session;
    }
  });

  it("skips due retry story items when word problems are off", () => {
    const session = createAdaptiveSession("addition", 15, { allowWordProblems: false });
    session.questionsAnswered = 10;
    session.questionsSinceRetry = 10;
    session.mistakeBank = [
      {
        mode: "addition",
        a: 7,
        b: 8,
        op: "+",
        answer: 15,
        dueAt: 0,
        itemKey: "addition|application|story",
        metadata: {
          modeId: "addition",
          itemFamily: "application",
          mathPractices: ["MP1"],
          misconceptionTags: [],
          cognitiveDemand: "DOK2",
          subskill: "makeTen",
        },
      },
    ];

    const { question, isRetry } = getNextQuestion(session);
    expect(isRetry).toBe(false);
    expect(question.metadata.itemFamily).not.toBe("application");
  });
});
