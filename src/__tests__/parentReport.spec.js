import { describe, it, expect } from "vitest";
import { openSessionRecord, appendAttempt, closeSessionRecord, questionText, MAX_SESSION_MS } from "../analytics/sessionLog.js";
import { buildReport, headline } from "../analytics/reportModel.js";
import { subskillLabel } from "../analytics/subskillLabels.js";
import { MODE_IDS, getModeConfig } from "../modes";

/**
 * The parent report is built from the practice log. These pin the log's
 * record shape, the time cap, and the report math a parent reads as fact —
 * minutes, first-try accuracy, level movement, and "which question tripped
 * them up".
 */

const NOW = new Date("2026-08-22T18:00:00").getTime();
const DAY = 24 * 60 * 60 * 1000;

function q(prompt, answer, subskill = "makeTen", extra = {}) {
  return { display: { promptText: prompt }, answer, metadata: { subskill, itemFamily: "procedural", itemId: null }, ...extra };
}

/** A finished 5-question session `daysAgo` with the given misses. */
function session({ mode = "addition", daysAgo = 0, level = 3, levelEnd, minutes = 6, misses = [], kind = "normal", hour = 17, kidId = "kid-1" }) {
  const start = new Date(NOW - daysAgo * DAY);
  start.setHours(hour, 0, 0, 0);
  let rec = openSessionRecord({ mode, level, kind, now: start.getTime(), kidId });
  const prompts = ["7 + 3 = ?", "8 + ? = 10", "Lily has 4 apples and gets 5 more. How many apples does Lily have?", "9 + 2 = ?", "6 + 6 = ?"];
  prompts.forEach((p, i) => {
    const miss = misses.includes(i);
    rec = appendAttempt(rec, {
      question: q(p, 10, i % 2 ? "unknownAddend" : "makeTen"),
      submitted: miss ? 9 : 10,
      correct: !miss,
      wasRetry: false,
      responseTimeMs: 4000 + i * 1000,
      level,
      now: start.getTime() + i * 1000,
    });
  });
  const sess = { level: levelEnd ?? level, questionsAnswered: 5, firstTryCorrect: 5 - misses.length, retriesMastered: 0 };
  return closeSessionRecord(rec, sess, { starsEarned: 5 - misses.length, levelEnd: levelEnd ?? level, now: start.getTime() + minutes * 60000 });
}

describe("session record", () => {
  it("captures prompt, answer, what the kid typed, and timing per attempt", () => {
    const rec = session({ misses: [1] });
    expect(rec.attempts).toHaveLength(5);
    expect(rec.attempts[1]).toMatchObject({ prompt: "8 + ? = 10", answer: "10", given: "9", correct: false, retry: false, ms: 5000, level: 3, subskill: "unknownAddend" });
    expect(rec.durationMs).toBe(6 * 60000);
    expect(rec.activeMs).toBe(4000 + 5000 + 6000 + 7000 + 8000);
    expect(rec.questions).toBe(5);
    expect(rec.firstTryCorrect).toBe(4);
    expect(rec.endedAt).toBeGreaterThan(rec.startedAt);
  });

  it("caps a session left open overnight at 30 minutes", () => {
    const rec = session({ minutes: 9 * 60 });
    expect(rec.durationMs).toBe(MAX_SESSION_MS);
  });

  it("reads a prompt from display.promptText or falls back to the operands", () => {
    expect(questionText(q("What is 3 + 4?", 7))).toBe("What is 3 + 4?");
    expect(questionText({ a: 3, op: "+", b: 4, answer: 7 })).toBe("3 + 4 = ?");
  });

  it("formats fraction and list answers as text", () => {
    let rec = openSessionRecord({ mode: "fractions", level: 1, now: NOW, kidId: null });
    rec = appendAttempt(rec, { question: q("Which is bigger?", { numerator: 1, denominator: 2 }), submitted: [1, 2], correct: true, wasRetry: false, responseTimeMs: 10, now: NOW });
    expect(rec.attempts[0].answer).toBe("1/2");
    expect(rec.attempts[0].given).toBe("1, 2");
  });
});

describe("buildReport", () => {
  const sessions = [
    session({ daysAgo: 0, misses: [1], levelEnd: 4 }),
    session({ daysAgo: 1, misses: [1, 3] }),
    session({ daysAgo: 2, mode: "subtraction", level: 2, misses: [] }),
    session({ daysAgo: 40, misses: [] }), // outside 30 days
    session({ daysAgo: 1, kind: "fledging", level: 3, levelEnd: 4, misses: [] }),
  ];

  it("totals only finished, in-range, non-challenge sessions", () => {
    const r = buildReport(sessions, { now: NOW, days: 30 });
    expect(r.totals.sessions).toBe(3);
    expect(r.totals.minutes).toBe(18);
    expect(r.totals.questions).toBe(15);
    expect(r.totals.accuracy).toBe(80); // 12/15
    expect(r.totals.activeDays).toBe(3);
    expect(r.totals.streakDays).toBe(3);
    expect(r.totals.levelUps).toBe(1);
    expect(r.totals.challengesTaken).toBe(1);
    expect(r.totals.challengesPassed).toBe(1);
  });

  it("all-time includes the old session", () => {
    expect(buildReport(sessions, { now: NOW, days: null }).totals.sessions).toBe(4);
  });

  it("summarizes each mode with level movement and subskill accuracy", () => {
    const r = buildReport(sessions, { now: NOW, days: 30, progressByMode: { addition: { level: 4 } } });
    const add = r.modes.find((m) => m.id === "addition");
    expect(add).toMatchObject({ sessions: 2, minutes: 12, questions: 10, accuracy: 70, levelStart: 3, levelNow: 4, levelDelta: 1, gradeSpan: "K–2" });
    const unknown = add.subskills.find((s) => s.id === "unknownAddend");
    expect(unknown).toMatchObject({ attempts: 4, correct: 1, accuracy: 25, label: "missing addend (3 + ? = 10)" });
    expect(add.weakest.id).toBe("unknownAddend");
    expect(r.modes[0].id).toBe("addition"); // most time first
  });

  it("surfaces the most-missed prompt with the wrong answer tried", () => {
    const r = buildReport(sessions, { now: NOW, days: 30 });
    expect(r.struggles[0]).toMatchObject({ prompt: "8 + ? = 10", misses: 2, answer: "10", given: ["9"], modeLabel: "Addition" });
    expect(r.needsWork[0].id).toBe("unknownAddend");
    expect(r.strengths.map((s) => s.id)).toContain("makeTen");
  });

  it("marks a struggle as mastered when a later retry lands", () => {
    let rec = openSessionRecord({ mode: "addition", level: 3, now: NOW - 1000, kidId: "kid-1" });
    rec = appendAttempt(rec, { question: q("8 + ? = 10", 2), submitted: 3, correct: false, wasRetry: false, responseTimeMs: 10, now: NOW - 900 });
    rec = appendAttempt(rec, { question: q("8 + ? = 10", 2), submitted: 2, correct: true, wasRetry: true, responseTimeMs: 10, now: NOW - 800 });
    rec = closeSessionRecord(rec, { level: 3, questionsAnswered: 1, firstTryCorrect: 0, retriesMastered: 1 }, { now: NOW });
    const r = buildReport([rec], { now: NOW, days: 7 });
    expect(r.struggles[0].masteredLater).toBe(true);
  });

  it("buckets practice by week, day, weekday and time of day", () => {
    const r = buildReport(sessions, { now: NOW, days: 7 });
    expect(r.byDay).toHaveLength(7);
    expect(r.byDay[6].minutes).toBe(6); // today
    expect(r.byWeek.length).toBeGreaterThanOrEqual(2);
    expect(r.byWeek[r.byWeek.length - 1].minutes).toBe(18);
    expect(r.when.busiestSlot).toBe("evening");
    expect(r.when.byWeekday.reduce((n, d) => n + d.sessions, 0)).toBe(3);
  });

  it("writes a headline and focus recommendation in plain language", () => {
    const r = buildReport(sessions, { now: NOW, days: 30, progressByMode: { addition: { level: 4 } } });
    expect(headline(r, "Maya")).toBe("Maya practiced 18 minutes over 3 sessions in the last 30 days, 80% right on the first try, 1 level-up.");
    expect(r.recommendations.some((x) => x.kind === "focus" && /missing addend/.test(x.text))).toBe(true);
    expect(r.recommendations.some((x) => x.kind === "celebrate")).toBe(true);
    expect(headline(buildReport([], { now: NOW }), null)).toMatch(/hasn't practiced/);
  });
});

describe("subskill labels", () => {
  it("covers every subskill of every mode in parent language (no bare camelCase)", () => {
    for (const id of MODE_IDS) {
      for (const sub of getModeConfig(id).subskills) {
        const label = subskillLabel(sub);
        expect(label, `${id}.${sub}`).not.toMatch(/[A-Z]/);
        expect(label.length).toBeGreaterThan(3);
      }
    }
  });
});
