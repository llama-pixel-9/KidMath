import { describe, expect, it } from "vitest";
import {
  restoreMistakeBank,
  buildBankQuestion,
  createAdaptiveSession,
  getNextQuestion,
  isSessionComplete,
  recordAnswer,
} from "../mathEngine";
import { resetBankToBundle, setBankItems } from "../itemBank";

// A bank row as the loaders hand it to the engine (bundle shape: the v2
// columns are absent, as on every v1 row).
function angleItem(overrides = {}, payload = {}) {
  return {
    itemId: "angles-test-served",
    modeId: "angles",
    itemFamily: "conceptual",
    subskill: "classifyAngle",
    structureType: "classifyAngle",
    levelRange: [1, 10],
    reviewStatus: "approved",
    question: {
      answer: "acute",
      choices: ["acute", "obtuse", "right", "straight"],
      display: { promptText: "Which kind of angle is smaller than a right angle?" },
      ...payload,
    },
    ...overrides,
  };
}

// A drill with a misconception-linked option set no near-miss rebuild could
// produce, so a retry that reuses it is told apart from one that rebuilt.
const DRILL = {
  mode: "addition",
  a: 9,
  b: 7,
  op: "+",
  answer: 16,
  choices: [16, 97, 2, 79],
  display: { promptText: "9 + 7 = ?" },
  metadata: { subskill: "makeTen", itemFamily: "procedural", itemSource: "bank", itemId: "addition-test-drill" },
};

// multiSelect answers may be a list of acceptable selections (a list of
// lists) — q.answer itself is not a valid submission; submit answer[0].
const submissionFor = (question) =>
  Array.isArray(question.answer) && Array.isArray(question.answer[0]) ? question.answer[0] : question.answer;

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

  it("serves a due retry of a story item even when word problems are off", () => {
    // The setting decides which NEW questions get scheduled (the test above);
    // an item the kid already met always comes back. With it off — the
    // default — the retry step used to skip every miss whose prompt had
    // words in it, which is most of the bank.
    // (Multiplication: addition's stories were retired on 2026-10-02.)
    const session = createAdaptiveSession("multiplication", 15, { allowWordProblems: false });
    session.questionsAnswered = 10;
    session.questionsSinceRetry = 10;
    session.mistakeBank = [
      {
        mode: "multiplication",
        a: 3,
        b: 4,
        op: "x",
        answer: 12,
        dueAt: 0,
        itemKey: "multiplication|application|story",
        reviewChoices: [12, 7, 16, 1],
        display: { promptText: "Mina has 3 bags with 4 shells in each bag. How many shells does Mina have?" },
        metadata: {
          modeId: "multiplication",
          itemFamily: "application",
          mathPractices: ["MP1"],
          misconceptionTags: [],
          cognitiveDemand: "DOK2",
          subskill: "equalGroups",
        },
      },
    ];

    const { question, isRetry } = getNextQuestion(session);
    expect(isRetry).toBe(true);
    expect(question.itemKey).toBe("multiplication|application|story");
  });

  it("retries string-answer choice items without crashing (poison-item fix)", () => {
    // "Is 3 a factor of 4?" → "No": numeric distractor synthesis can't rebuild
    // options around a string answer. getNextQuestion used to throw here, and
    // the item persisted in the saved mistakeBank — crashing every later
    // session of the mode too.
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

describe("authored choices are served shuffled", () => {
  it("lands the key in every position over 400 served copies of a bank item", () => {
    const item = angleItem();
    const positions = [0, 0, 0, 0];
    for (let i = 0; i < 400; i += 1) {
      const q = buildBankQuestion(item);
      expect([...q.choices].sort()).toEqual([...item.question.choices].sort());
      positions[q.choices.indexOf(q.answer)] += 1;
    }
    for (const count of positions) expect(count).toBeGreaterThanOrEqual(400 * 0.15);
    // The row's own array is never touched: it is the in-memory bank's.
    expect(item.question.choices).toEqual(["acute", "obtuse", "right", "straight"]);
  });

  it("keeps a Yes/No judgment pair and a choicesFixed set in authored order", () => {
    const yesNo = angleItem(
      { itemId: "angles-test-yes-no" },
      { answer: "No", choices: ["Yes", "No"], display: { promptText: "Is a right angle smaller than an acute angle?" } }
    );
    const fixed = angleItem({ itemId: "angles-test-fixed" }, { choicesFixed: true });
    for (let i = 0; i < 20; i += 1) {
      expect(buildBankQuestion(yesNo).choices).toEqual(["Yes", "No"]);
      expect(buildBankQuestion(fixed).choices).toEqual(["acute", "obtuse", "right", "straight"]);
    }
  });

  it("shuffles on the session path as well, and leaves generator sets alone", () => {
    setBankItems(
      ["conceptual", "procedural", "application"].map((family) =>
        angleItem({ itemId: `angles-test-${family}`, itemFamily: family })
      ),
      "test"
    );
    try {
      const session = createAdaptiveSession("angles", 15, { savedProgress: { level: 1 } });
      const positions = new Set();
      for (let i = 0; i < 60; i += 1) {
        const { question } = getNextQuestion(session);
        expect(question.metadata.itemSource).toBe("bank");
        positions.add(question.choices.indexOf(question.answer));
      }
      expect(positions.size).toBe(4);
    } finally {
      resetBankToBundle();
    }
    // A generator's own set (a format's Yes/No, a comparing item's trays) is
    // the generator's to order: with the bank empty the engine serves it as is.
    setBankItems([], "test");
    try {
      const session = createAdaptiveSession("counting", 15, { savedProgress: { level: 4 } });
      for (let i = 0; i < 40; i += 1) {
        const { question } = getNextQuestion(session);
        if (Array.isArray(question.choices) && question.choices.length === 2 && question.choices.includes("Yes")) {
          expect(question.choices).toEqual(["Yes", "No"]);
        }
      }
    } finally {
      resetBankToBundle();
    }
  });
});

describe("retry choices", () => {
  it("a retry reuses a reshuffled copy of the choices the kid missed against", () => {
    const session = createAdaptiveSession("addition", 15);
    const s = recordAnswer(session, DRILL, 97, 1500, false).session;
    expect(s.mistakeBank[0].reviewChoices).toEqual([16, 97, 2, 79]);

    s.questionsAnswered = 10;
    s.questionsSinceRetry = 10;
    s.mistakeBank[0].dueAt = 0;
    const seen = new Set();
    for (let i = 0; i < 40; i += 1) {
      const { question: retryQ, isRetry } = getNextQuestion(s);
      expect(isRetry).toBe(true);
      expect([...retryQ.choices].sort((x, y) => x - y)).toEqual([2, 16, 79, 97]);
      expect(retryQ.choices).not.toBe(s.mistakeBank[0].reviewChoices);
      seen.add(retryQ.choices.join(","));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("rebuilds options only for a miss saved without them", () => {
    const session = createAdaptiveSession("addition", 15);
    session.questionsAnswered = 10;
    session.questionsSinceRetry = 10;
    session.mistakeBank = [
      {
        mode: "addition",
        a: 9,
        b: 7,
        op: "+",
        answer: 16,
        dueAt: 0,
        itemKey: "addition|legacy|numeric",
        display: { promptText: "9 + 7 = ?" },
        metadata: { subskill: "makeTen", itemFamily: "procedural" },
      },
    ];
    const { question, isRetry } = getNextQuestion(session);
    expect(isRetry).toBe(true);
    expect(question.choices.length).toBeGreaterThanOrEqual(2);
    expect(question.choices).toContain(16);
  });
});

describe("a miss late in the session", () => {
  const dueAtAfterMiss = (questionsAnswered) => {
    const session = createAdaptiveSession("addition", 15);
    session.questionsAnswered = questionsAnswered;
    return recordAnswer(session, DRILL, 97, 1500, false).session.mistakeBank[0].dueAt;
  };

  it("keeps the usual spacing while it fits in the session", () => {
    expect(dueAtAfterMiss(5)).toBe(11);
    expect(dueAtAfterMiss(8)).toBe(14);
  });

  it("is pulled forward to the last retry slot when at least two fresh questions remain", () => {
    // The miss is the 12th fresh question; three remain. The retry is served
    // after the 14th, before the last fresh question closes the session.
    expect(dueAtAfterMiss(11)).toBe(14);
    expect(dueAtAfterMiss(12)).toBe(14);
  });

  it("persists to the next session when it is the last fresh question", () => {
    expect(dueAtAfterMiss(14)).toBe(20);
  });

  it("comes back before the session ends", () => {
    let session = createAdaptiveSession("addition", 15, { savedProgress: { level: 4 } });
    let retried = null;
    let guard = 0;
    while (!isSessionComplete(session) && guard < 60) {
      guard += 1;
      const { question, isRetry } = getNextQuestion(session);
      if (isRetry) retried = question;
      // Miss the 12th fresh question, get everything else right.
      const miss = !isRetry && session.questionsAnswered === 11;
      session = recordAnswer(session, question, miss ? "__wrong__" : submissionFor(question), 2000, isRetry).session;
    }
    expect(isSessionComplete(session)).toBe(true);
    expect(retried).toBeTruthy();
    expect(session.mistakeBank).toHaveLength(0);
  });
});

describe("a served bank question carries the row's version identity", () => {
  it("passes version, itemModelId, difficulty and hint through", () => {
    const hint = {
      nudge: "Start from what a square corner looks like.",
      steps: ["Picture a square corner.", "Is this angle narrower than that?"],
      picture: null,
      example: null,
      feedback: null,
      solution: null,
    };
    const q = buildBankQuestion(
      angleItem({ itemId: "angles-test-v2", version: 2, itemModelId: "angles-classify-01", difficulty: "moderate", hint })
    );
    expect(q.version).toBe(2);
    expect(q.itemModelId).toBe("angles-classify-01");
    expect(q.difficulty).toBe("moderate");
    expect(q.hint).toEqual(hint);
    expect(q.metadata.itemId).toBe("angles-test-v2");
  });

  it("defaults to version 1 and nothing else on a v1 row", () => {
    const q = buildBankQuestion(angleItem());
    expect(q.version).toBe(1);
    expect(q.itemModelId).toBeNull();
    expect(q.difficulty).toBeNull();
    expect(q.hint).toBeNull();
  });

  it("reaches the session path and the mistake bank", () => {
    setBankItems(
      ["conceptual", "procedural", "application"].map((family) =>
        angleItem({ itemId: `angles-test-${family}`, itemFamily: family, version: 2, difficulty: "hard" })
      ),
      "test"
    );
    try {
      const session = createAdaptiveSession("angles", 15, { savedProgress: { level: 1 } });
      const { question } = getNextQuestion(session);
      expect(question.version).toBe(2);
      expect(question.difficulty).toBe("hard");
      const stored = recordAnswer(session, question, "__wrong__", 1500, false).session.mistakeBank[0];
      expect(stored.version).toBe(2);
      expect(stored.difficulty).toBe("hard");
    } finally {
      resetBankToBundle();
    }
  });
});

describe("carried-over misses", () => {
  it("come due after the normal spacing in the next session, whatever dueAt they were saved with", () => {
    const miss = { mode: "addition", a: 7, b: 8, op: "+", answer: 15, answerType: "number", itemKey: "addition:7+8", display: { promptText: "7 + 8" }, dueAt: 20, retryCount: 1 };
    const session = createAdaptiveSession("addition", 15, { savedProgress: { level: 3, mistakeBank: [miss, { ...miss, itemKey: "addition:1+1", dueAt: 3 }] } });
    expect(session.mistakeBank.map((q) => q.dueAt)).toEqual([5, 3]);
    expect(restoreMistakeBank(null)).toEqual([]);
    expect(restoreMistakeBank(Array.from({ length: 30 }, (_, i) => ({ ...miss, itemKey: `k${i}` }))).length).toBe(20);
  });

  it("drop a saved story from a topic that no longer asks stories (2026-10-02 retire)", () => {
    const story = (mode) => ({
      mode,
      a: 3,
      b: 4,
      answer: 12,
      itemKey: `${mode}|application|story`,
      display: { promptText: "A saved word problem." },
      metadata: { modeId: mode, itemFamily: "application" },
      dueAt: 3,
    });
    const sum = { mode: "addition", a: 7, b: 8, op: "+", answer: 15, itemKey: "addition:7+8", metadata: { modeId: "addition", itemFamily: "procedural" }, dueAt: 3 };
    const kept = restoreMistakeBank([story("addition"), story("subtraction"), story("barModels"), story("numberBonds"), sum, story("multiplication"), story("counting")]);
    expect(kept.map((q) => q.itemKey)).toEqual(["addition:7+8", "multiplication|application|story", "counting|application|story"]);
    const session = createAdaptiveSession("addition", 15, { savedProgress: { level: 3, mistakeBank: [story("addition"), sum] } });
    expect(session.mistakeBank.map((q) => q.itemKey)).toEqual(["addition:7+8"]);
  });

  it("drop a saved retired Counting or Comparing story, keep their other stories (2026-10-02 retire)", () => {
    const row = (mode, structureType) => ({
      mode,
      answer: 5,
      itemKey: `${mode}|${structureType}`,
      display: { promptText: "A saved word problem." },
      metadata: { modeId: mode, itemFamily: "application", structureType },
      dueAt: 3,
    });
    const saved = [
      row("counting", "storyTwoSpots"),
      row("counting", "storyCountOn"),
      row("comparing", "storyDifference"),
      row("comparing", "storyLanguageTrap"),
      row("comparing", "storyEnough"),
    ];
    expect(restoreMistakeBank(saved).map((q) => q.itemKey)).toEqual(["counting|storyCountOn", "comparing|storyEnough"]);
    const session = createAdaptiveSession("comparing", 15, { savedProgress: { level: 3, mistakeBank: saved } });
    expect(session.mistakeBank.map((q) => q.itemKey)).toEqual(["counting|storyCountOn", "comparing|storyEnough"]);
  });
});
