import { describe, expect, it } from "vitest";
import { FACTS_KEY, FAST_RULE, applyFactAttempts, factById, factOfAttempt, fastLimitMs, mergeFactMarks } from "../facts/factMarks.js";
import { FLUENCY_SESSION_SIZE, factsForSkill, fluencyPlan, rowsForSkill } from "../facts/factPractice.js";
import { FACTS } from "../facts/factSets.js";
import { appendAttempt, closeSessionRecord, openSessionRecord } from "../analytics/sessionRecord.js";
import { skillStanding } from "../analytics/reportModel.js";
import { createAdaptiveSession, getNextQuestion, isSessionComplete, recordAnswer } from "../mathEngine.js";
import { applySession, deriveMastery } from "../skills/mastery.js";
import { settleSkillSession, topicSheetModel } from "../skills/flow.js";
import { playSkillById } from "../skills/play.js";
import { mergeTopicState } from "../skills/topicState.js";

const DAY = 24 * 60 * 60 * 1000;
const NOON = new Date(2026, 9, 1, 12).getTime();
const fresh = { level: 1, mistakeBank: [], totalSessions: 0 };

// One fact attempt as the practice log records it.
const attempt = (factId, { ms = 2000, correct = true, format = "plain", t = NOON, ...rest } = {}) => ({
  t,
  correct,
  ms,
  retry: false,
  hint: false,
  itemId: `mathFacts-v2-${factId}-${format}`,
  ...rest,
});
const record = (attempts, extra = {}) => ({ mode: "mathFacts", kind: "normal", grade: "2", attempts, startedAt: NOON, endedAt: NOON, ...extra });
const fold = (...records) => records.reduce(applyFactAttempts, {});
const allFast = (facts) =>
  Object.fromEntries(facts.map((f) => [f.trackKey, { seen: 2, last: "fast", days: ["2026-9-29", "2026-9-30"], fast: true, slip: false, at: NOON }]));

describe("the fast mark", () => {
  it("needs a right answer within the limit on two different days", () => {
    const sameDay = fold(record([attempt("add-8-5"), attempt("add-8-5", { t: NOON + 60_000 })]));
    expect(sameDay["add-5-8"]).toMatchObject({ fast: false, last: "fast", seen: 2 });
    const twoDays = fold(record([attempt("add-8-5")]), record([attempt("add-8-5", { t: NOON + DAY })]));
    expect(twoDays["add-5-8"].fast).toBe(true);
  });

  it("is 3 seconds, and 5 in Kindergarten and Grade 1", () => {
    expect([fastLimitMs("K"), fastLimitMs("1"), fastLimitMs("2"), fastLimitMs("4")]).toEqual([5000, 5000, 3000, 3000]);
    const at = (grade) => fold(record([attempt("add-3-4", { ms: 4500 })], { grade }))["add-3-4"].last;
    expect(at("1")).toBe("fast");
    expect(at("2")).toBe("slow");
    expect(FAST_RULE.days).toBe(2);
  });

  it("tracks a turnaround pair as one fact, take-away and divide facts one by one", () => {
    const marks = fold(record([attempt("add-8-5")]), record([attempt("add-5-8", { t: NOON + DAY })]));
    expect(marks["add-5-8"].fast).toBe(true);
    const sub = fold(record([attempt("sub-13-5")]), record([attempt("sub-13-8", { t: NOON + DAY })]));
    expect(sub["sub-13-5"].fast).toBe(false);
    expect(sub["sub-13-8"].fast).toBe(false);
  });

  it("counts only recall: no retry, no right answer after a hint, no picture or true-or-false", () => {
    const marks = fold(
      record([
        attempt("add-2-3", { retry: true }),
        attempt("add-2-4", { hint: true }),
        attempt("add-2-5", { format: "tenFrame" }),
        attempt("add-2-6", { format: "trueFalse" }),
        attempt("add-2-7", { format: "missing" }),
        attempt("add-2-8", { format: "stacked" }),
      ])
    );
    expect(Object.keys(marks).sort()).toEqual(["add-2-7", "add-2-8"]);
    // A miss counts even with a hint.
    expect(fold(record([attempt("add-2-4", { hint: true, correct: false })]))["add-2-4"].last).toBe("miss");
  });

  it("is never taken away: a miss marks a slip, and the next fast answer clears it", () => {
    const fast = fold(record([attempt("mul-6-7")]), record([attempt("mul-6-7", { t: NOON + DAY })]));
    const slipped = applyFactAttempts(fast, record([attempt("mul-7-6", { correct: false, t: NOON + 2 * DAY })]));
    expect(slipped["mul-6-7"]).toMatchObject({ fast: true, slip: true, last: "miss" });
    expect(applyFactAttempts(slipped, record([attempt("mul-6-7", { t: NOON + 3 * DAY })]))["mul-6-7"].slip).toBe(false);
  });

  it("ignores a Fledging Flight, and never mutates the map it is given", () => {
    const before = fold(record([attempt("add-1-1")]));
    const frozen = JSON.stringify(before);
    expect(applyFactAttempts(before, record([attempt("add-1-2")], { kind: "fledging" }))).toEqual(before);
    applyFactAttempts(before, record([attempt("add-1-1", { t: NOON + DAY })]));
    expect(JSON.stringify(before)).toBe(frozen);
  });

  it("reads the fact off a stamped attempt or a Math Facts bank row id", () => {
    expect(factOfAttempt({ factId: "div-56-8", factFormat: "missing" })).toEqual({ fact: factById("div-56-8"), format: "missing" });
    expect(factOfAttempt({ itemId: "mathFacts-v2-sub-12-0-takeAway" }).format).toBe("takeAway");
    expect(factOfAttempt({ itemId: "subtraction-b0821-0042" }).fact).toBeNull();
  });

  it("rides in the Math Facts mastery map, rebuilt from the log by the same fold", () => {
    const day1 = record([attempt("add-8-5")], { id: "a", startedAt: NOON });
    const day2 = record([attempt("add-8-5", { t: NOON + DAY })], { id: "b", startedAt: NOON + DAY });
    const saved = applySession(applySession({}, day1), day2);
    expect(saved[FACTS_KEY]["add-5-8"].fast).toBe(true);
    expect(deriveMastery([day2, day1])).toEqual(saved);
    expect(applySession({}, { ...day1, mode: "addition" })[FACTS_KEY]).toBeUndefined();
  });

  it("survives a sign-in merge: a fast mark is never lost", () => {
    const local = { [FACTS_KEY]: { "add-5-8": { seen: 2, fast: true, days: ["a", "b"] } } };
    const cloud = { [FACTS_KEY]: { "add-5-8": { seen: 9, fast: false, days: [] }, "add-1-1": { seen: 1, fast: false, days: [] } } };
    const merged = mergeTopicState({ skillMastery: cloud }, { skillMastery: local }).skillMastery[FACTS_KEY];
    expect(merged["add-5-8"].fast).toBe(true);
    expect(merged["add-1-1"].seen).toBe(1);
    expect(mergeFactMarks(undefined, { x: { seen: 1 } })).toEqual({ x: { seen: 1 } });
  });
});

describe("what a Math Facts skill practises", () => {
  it("is its operation's facts in its band, in strategy order", () => {
    const counts = Object.fromEntries(
      ["facts-add-to5", "facts-add-to10", "facts-add-to20", "facts-mul-to10", "facts-div-to12"].map((id) => [id, factsForSkill(playSkillById(id)).length])
    );
    expect(counts).toEqual({ "facts-add-to5": 21, "facts-add-to10": 66, "facts-add-to20": 55, "facts-mul-to10": 121, "facts-div-to12": 46 });
    const rows = rowsForSkill(playSkillById("facts-add-to10"));
    expect(rows[0].groupName).toBe("Plus zero");
    expect(rows.flatMap((r) => r.facts).every((f) => f.op === "add" && f.answer <= 10)).toBe(true);
  });

  it("works on the first group not yet fast, reviews the ones before, and reviews all once all are fast", () => {
    const skill = playSkillById("facts-add-to10");
    const [zero, small] = rowsForSkill(skill);
    const start = fluencyPlan(skill, {});
    expect(start.group).toBe("Plus zero");
    expect(start.review).toEqual([]);
    // Plus zero has 11 facts, enough on its own.
    expect(start.focus).toEqual(zero.facts.map((f) => f.id));

    const next = fluencyPlan(skill, allFast(zero.facts));
    expect(next.group).toBe(small.groupName);
    expect(next.review).toEqual(zero.facts.map((f) => f.id));
    expect(next.focus.length).toBeGreaterThanOrEqual(8);

    const done = fluencyPlan(skill, allFast(factsForSkill(skill)));
    expect(done.group).toBeNull();
    expect(done.focus).toHaveLength(66);
  });
});

function playFacts(options, { size, ms = 2000, answer = () => true } = {}) {
  let session = createAdaptiveSession("mathFacts", size, { savedProgress: fresh, ...options });
  let rec = openSessionRecord({ mode: "mathFacts", level: 1, now: NOON, sessionKind: "skill", skillId: options.skillId, grade: options.grade });
  const served = [];
  for (let guard = 0; !isSessionComplete(session) && guard < 200; guard += 1) {
    const { question, isRetry } = getNextQuestion(session);
    const right = answer(question, served.length);
    const wrong = typeof question.answer === "number" ? question.answer + 1 : "__wrong__";
    const result = recordAnswer(session, question, right ? question.answer : wrong, ms, isRetry);
    rec = appendAttempt(rec, { question, submitted: right ? question.answer : wrong, correct: result.correct, wasRetry: isRetry, responseTimeMs: ms, now: NOON + guard });
    served.push({ question, isRetry });
    session = result.session;
  }
  return { session, served, record: closeSessionRecord(rec, session, { now: NOON + 300_000 }) };
}

describe("a Math Facts practice session", () => {
  const skill = playSkillById("facts-add-to10");
  const masteryWithZeroFast = { [FACTS_KEY]: allFast(rowsForSkill(skill)[0].facts) };

  it("runs about 20 facts unless the caller sets a size, every one the skill's own fact", () => {
    const { served } = playFacts({ skillId: skill.id, grade: "1", masterySnapshot: {} });
    expect(served.filter((s) => !s.isRetry)).toHaveLength(FLUENCY_SESSION_SIZE);
    const own = new Set(factsForSkill(skill).map((f) => f.id));
    for (const { question } of served) {
      expect(own.has(question.factId), question.display.promptText).toBe(true);
      expect(question.skillId).toBe(skill.id);
    }
    expect(createAdaptiveSession("mathFacts", 5, { savedProgress: fresh, skillId: skill.id }).sessionSize).toBe(5);
  });

  it("mostly asks the current group, every fourth a review fact and then its turnaround", () => {
    const { served } = playFacts({ skillId: skill.id, grade: "1", masterySnapshot: masteryWithZeroFast });
    const asked = served.filter((s) => !s.isRetry).map((s) => s.question);
    const fresh = asked.map((q) => factById(q.factId));
    const plan = fluencyPlan(skill, masteryWithZeroFast[FACTS_KEY]);
    const focus = new Set(plan.focus);
    let turn = 0;
    let reviews = 0;
    for (let i = 0; i < fresh.length; i += 1) {
      turn += 1;
      if (turn % 4) {
        expect(focus.has(fresh[i].id), `question ${i + 1}`).toBe(true);
        continue;
      }
      reviews += 1;
      expect(plan.review, `question ${i + 1}`).toContain(fresh[i].id);
      // Its turnaround next, asked plain, and not counted as a turn (0 + 0 has none).
      if (fresh[i].a !== fresh[i].b && i + 1 < fresh.length) {
        expect(fresh[i + 1]).toMatchObject({ op: "add", a: fresh[i].b, b: fresh[i].a });
        expect(asked[i + 1].factFormat).toBe("plain");
        i += 1;
      }
    }
    expect(reviews).toBeGreaterThanOrEqual(4);
    // A fact never comes straight back, except as its own turnaround.
    for (let i = 1; i < fresh.length; i += 1) {
      if (fresh[i].trackKey === fresh[i - 1].trackKey) expect(fresh[i].a).toBe(fresh[i - 1].b);
    }
  });

  it("gives each skill of a mixed session its own review slot", () => {
    const skills = ["facts-add-to10", "facts-sub-to10"];
    const marks = allFast(FACTS.filter((f) => f.group === 1 && f.band === "to5"));
    const { session } = playFacts({ skillIds: skills, grade: "1", masterySnapshot: { [FACTS_KEY]: marks } });
    // Each skill reached its fourth turn, so each had a review slot.
    expect(session.fluency.turns["facts-add-to10"]).toBeGreaterThanOrEqual(4);
    expect(session.fluency.turns["facts-sub-to10"]).toBeGreaterThanOrEqual(4);
  });

  it("logs each fact, and settling marks the facts and says so on the end card", () => {
    const options = { skillId: skill.id, grade: "1", masterySnapshot: {} };
    const day1 = playFacts(options);
    expect(day1.record.attempts.every((a) => a.factId && a.factFormat)).toBe(true);
    const progress = { level: 2, totalSessions: 1, grade: "1" };
    const first = settleSkillSession("mathFacts", progress, { profileGrade: "1st", sessions: [] }, day1.session, day1.record);
    expect(first.standing.facts).toMatchObject({ fast: 0, total: 36, newlyFast: 0, line: "0 of 36 facts fast", newLine: null, nextGroup: "Plus zero" });

    const day2 = playFacts({ ...options, masterySnapshot: first.patch.skillMastery });
    const later = { ...day2.record, attempts: day2.record.attempts.map((a) => ({ ...a, t: a.t + DAY })) };
    const second = settleSkillSession("mathFacts", { ...progress, ...first.patch }, { profileGrade: "1st", sessions: [] }, day2.session, later);
    const { facts } = second.standing;
    expect(facts.newlyFast).toBeGreaterThan(0);
    expect(facts.fast).toBe(facts.newlyFast);
    expect(facts.newLine).toMatch(/got fast today!$/);
    // Fast is its own mark: mastery and its stars are what they always were.
    expect(second.patch.skillMastery[skill.id].state).toBeDefined();
  });

  it("slow right answers are not fast, however many days", () => {
    const options = { skillId: skill.id, grade: "2", masterySnapshot: {} };
    const day1 = playFacts(options, { ms: 4000 });
    const day2 = playFacts(options, { ms: 4000 });
    const later = { ...day2.record, attempts: day2.record.attempts.map((a) => ({ ...a, t: a.t + DAY })) };
    const marks = [day1.record, later].reduce(applySession, {})[FACTS_KEY];
    expect(Object.values(marks).some((m) => m.fast)).toBe(false);
  });
});

describe("where the fast mark shows", () => {
  it("on the topic sheet and in the parent report, beside mastery", () => {
    const mastery = { [FACTS_KEY]: allFast(rowsForSkill(playSkillById("facts-add-to10"))[0].facts) };
    const sheet = topicSheetModel("mathFacts", { level: 3, totalSessions: 1, grade: "1", skillMastery: mastery }, { profileGrade: "1st", sessions: [] });
    const add = sheet.skills.find((s) => s.id === "facts-add-to10");
    expect(add.facts).toEqual({ fast: 6, total: 36, text: "6 of 36 facts fast" });
    expect(add.statusText).toBe("Not started");

    const report = skillStanding("mathFacts", 3, { grade: "1" }, mastery);
    expect(report.list.find((s) => s.id === "facts-add-to10")).toMatchObject({ printable: false, facts: { text: "6 of 36 facts fast" } });
    expect(skillStanding("addition", 3, { grade: "1" }, {}).list.every((s) => s.printable && !s.facts)).toBe(true);
  });
});
