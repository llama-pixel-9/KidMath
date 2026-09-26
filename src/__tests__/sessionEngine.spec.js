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
    // multiSelect answers may be a list of acceptable selections (a list of
    // lists) — q.answer itself is not a valid submission; submit answer[0],
    // mirroring the session loop. The unseeded draw occasionally lands on
    // such an item, which made this test flaky.
    const submission = Array.isArray(question.answer) && Array.isArray(question.answer[0])
      ? question.answer[0]
      : question.answer;
    const result = recordAnswer(session, question, submission, 1000, false);
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

  it("retries string-answer choice items without crashing (poison-item fix)", () => {
    // "Is 3 a factor of 4?" → "No": numeric distractor synthesis can't rebuild
    // options around a string answer. getNextQuestion used to throw here, and
    // the item persisted in the saved mistakeBank — crashing every later
    // session of the mode too. (allowWordProblems on, else the verbal-prompt
    // filter skips the due retry before the choice rebuild is ever reached.)
    const session = createAdaptiveSession("factorsMultiples", 15, { allowWordProblems: true });
    const q = {
      mode: "factorsMultiples",
      answer: "No",
      choices: ["Yes", "No"],
      display: { promptText: "Is 3 a factor of 4?" },
      metadata: { subskill: "factorPairs", itemFamily: "conceptual" },
    };
    const result = recordAnswer(session, q, "Yes", 1500, false);
    const s = result.session;
    expect(s.mistakeBank).toHaveLength(1);
    expect(s.mistakeBank[0].reviewChoices).toEqual(["Yes", "No"]);

    s.questionsAnswered = 10;
    s.questionsSinceRetry = 10;
    s.mistakeBank[0].dueAt = 0;
    const { question: retryQ, isRetry } = getNextQuestion(s);
    expect(isRetry).toBe(true);
    expect(retryQ.choices.length).toBeGreaterThanOrEqual(2);
    expect(retryQ.choices).toContain("No");
  });

  it("serves a fresh question instead of crashing on a legacy poison retry entry", () => {
    // A mistakeBank entry persisted BEFORE reviewChoices existed: string
    // answer, no saved options. It cannot be served — but it must not throw.
    const session = createAdaptiveSession("factorsMultiples", 15, { allowWordProblems: true });
    session.questionsAnswered = 10;
    session.questionsSinceRetry = 10;
    session.mistakeBank = [
      {
        mode: "factorsMultiples",
        answer: "No",
        dueAt: 0,
        itemKey: "factorsMultiples|legacy|poison",
        display: { promptText: "Is 3 a factor of 4?" },
        metadata: { subskill: "factorPairs", itemFamily: "conceptual" },
      },
    ];
    const { question, isRetry } = getNextQuestion(session);
    expect(isRetry).toBe(false);
    expect(question).toBeTruthy();
  });

  it("never moves the level mid-session — the ladder is gone, the level only picks the band", () => {
    // Play by skill (2026-09): mastery is settled from the practice log and a
    // grade is earned in the Fledging Flight. A run of right answers that once
    // promoted, and a run of misses that once demoted, both leave the level.
    const session = createAdaptiveSession("money", 15, { savedProgress: { level: 4 } });
    let s = session;
    for (let i = 0; i < 12; i += 1) {
      const { question } = getNextQuestion(s);
      const right = i % 2 === 0;
      const submission = Array.isArray(question.answer) && Array.isArray(question.answer[0]) ? question.answer[0] : question.answer;
      const result = recordAnswer(s, question, right ? submission : "__wrong__", 3000, false);
      expect(result.levelChanged).toBe(false);
      expect(result.newLevel).toBe(4);
      s = result.session;
    }
    expect(s.level).toBe(4);
    expect(s).not.toHaveProperty("mistakesAtLevel");
  });
});
