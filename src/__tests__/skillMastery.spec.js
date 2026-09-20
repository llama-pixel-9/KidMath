import { describe, expect, it } from "vitest";
import { MASTERY_RULE, STATES, applySession, deriveMastery, practiceOrder, progressToward, stateOf, summarize } from "../skills/mastery";
import { skillsForPlay } from "../skills/play";

const SKILL = "sub-3digit-regroup";
let clock = 0;

// A session of first-try attempts on one skill: "1" right, "0" wrong.
function session(marks, { skillId = SKILL, mode = "subtraction", kind = "normal", extra = [] } = {}) {
  clock += 1000;
  return {
    id: `s${clock}`,
    mode,
    kind,
    startedAt: clock,
    endedAt: clock + 500,
    attempts: [...marks.split("").map((m) => ({ skillId, correct: m === "1", retry: false, hint: false })), ...extra],
  };
}

describe("skill mastery rule", () => {
  it("nothing is mastered in one sitting, however clean", () => {
    const map = applySession({}, session("1111111111"));
    expect(stateOf(map, SKILL)).toBe(STATES.PRACTICING);
    expect(progressToward(map, SKILL)).toEqual({ have: MASTERY_RULE.minAttempts, need: MASTERY_RULE.minAttempts });
  });

  it("8 of the last 10 with at most one miss, the last three right, over two sessions → mastered", () => {
    const map = [session("11110"), session("1111")].reduce(applySession, {});
    expect(stateOf(map, SKILL)).toBe(STATES.MASTERED);
    expect(map[SKILL].masteredAt).toBeGreaterThan(0);
  });

  it("two misses in the window, or a miss in the closing three, is not mastery yet", () => {
    expect(stateOf([session("11010"), session("1111")].reduce(applySession, {}), SKILL)).toBe(STATES.PRACTICING);
    expect(stateOf([session("11111"), session("1101")].reduce(applySession, {}), SKILL)).toBe(STATES.PRACTICING);
  });

  it("the window forgets: early stumbles do not bar a kid who has since got it", () => {
    const map = [session("0000"), session("11111"), session("11111")].reduce(applySession, {});
    expect(stateOf(map, SKILL)).toBe(STATES.MASTERED);
  });

  it("retries and hint-assisted right answers are not evidence; a miss with a hint still is", () => {
    const retries = Array.from({ length: 10 }, () => ({ skillId: SKILL, correct: true, retry: true }));
    const hinted = Array.from({ length: 10 }, () => ({ skillId: SKILL, correct: true, retry: false, hint: true }));
    let map = [session("", { extra: retries }), session("", { extra: hinted })].reduce(applySession, {});
    expect(stateOf(map, SKILL)).toBe(STATES.NEW);
    map = applySession(map, session("", { extra: [{ skillId: SKILL, correct: false, retry: false, hint: true }] }));
    expect(map[SKILL].recent).toBe("0");
  });

  it("the grade-up challenge is a test, not practice", () => {
    expect(applySession({}, session("111111", { kind: "fledging" }))).toEqual({});
  });

  it("a star is never taken away; a later slip only flags the skill for review", () => {
    let map = [session("11111"), session("11111")].reduce(applySession, {});
    map = applySession(map, session("00100"));
    expect(stateOf(map, SKILL)).toBe(STATES.MASTERED);
    expect(map[SKILL].needsReview).toBe(true);
    map = [session("11111"), session("11111")].reduce(applySession, map);
    expect(map[SKILL].needsReview).toBe(false);
  });

  it("the reducer never mutates the map it is given", () => {
    const before = applySession({}, session("111"));
    const frozen = JSON.stringify(before);
    applySession(before, session("000"));
    expect(JSON.stringify(before)).toBe(frozen);
  });
});

describe("mastery from the practice log", () => {
  it("a rebuild over the log equals folding sessions as they happened, in any order given", () => {
    const log = [session("1101"), session("111", { skillId: "sub-across-zeros" }), session("11111"), session("0")];
    expect(deriveMastery([...log].reverse())).toEqual(log.reduce(applySession, {}));
  });

  it("sessions from before skills existed are credited by what was asked", () => {
    const old = (prompts) => {
      clock += 1000;
      return { id: `o${clock}`, mode: "subtraction", kind: "normal", startedAt: clock, endedAt: clock + 1,
        attempts: prompts.map((prompt) => ({ prompt, subskill: "decomposeToSubtract", level: 9, correct: true, retry: false })) };
    };
    const drills = ["641 − 564 = ?", "624 − 487 = ?", "685 − 416 = ?", "612 − 466 = ?"];
    const map = deriveMastery([old(drills), old(drills)]);
    expect(stateOf(map, "sub-3digit-regroup")).toBe(STATES.MASTERED);
  });
});

describe("a grade of a topic", () => {
  const skills = skillsForPlay("3", "subtraction");

  it("summarizes as 'N of M skills mastered', complete only when all are", () => {
    expect(skills.length).toBeGreaterThan(1);
    let map = {};
    expect(summarize(map, skills)).toMatchObject({ total: skills.length, mastered: 0, complete: false });
    for (const skill of skills) {
      map = [session("11111", { skillId: skill.id }), session("11111", { skillId: skill.id })].reduce(applySession, map);
    }
    expect(summarize(map, skills)).toMatchObject({ mastered: skills.length, complete: true, needsReview: [] });
  });

  it("practice order: finish what is in motion (weakest first), then new skills, then reviews", () => {
    const [a, b, c] = skills;
    let map = applySession({}, session("1100", { skillId: b.id }));
    map = [session("11111", { skillId: c.id }), session("11111", { skillId: c.id }), session("00000", { skillId: c.id })].reduce(applySession, map);
    const order = practiceOrder(map, skills).map((s) => s.id);
    expect(order[0]).toBe(b.id);
    expect(order.indexOf(a.id)).toBeLessThan(order.indexOf(c.id));
    expect(order.at(-1)).toBe(c.id);
  });
});
