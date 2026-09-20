import { describe, expect, it } from "vitest";
import { MODE_IDS } from "../modes";
import { maxLevelForMode } from "../modeLevels";
import { applySession } from "../skills/mastery";
import { nextTopicGrade, skillsForPlay, topicGrades } from "../skills/play";
import { GRADE_UP, advanceGrade, afterPractice, applyChallengeResult, challengeFor, gradeUpStatus, gradeView, larkitPicks, mergeTopicState, resolveTopic, unlockGrade } from "../skills/topicState";

let clock = 0;
const session = (skillId, marks, mode = "subtraction") => {
  clock += 1000;
  return { id: `s${clock}`, mode, kind: "normal", startedAt: clock, endedAt: clock + 1,
    attempts: marks.split("").map((m) => ({ skillId, correct: m === "1", retry: false })) };
};
const masterAll = (skills, mode) => skills.flatMap((s) => [session(s.id, "11111", mode), session(s.id, "11111", mode)]);

describe("where a kid stands in a topic", () => {
  it("a never-played topic starts at the profile grade, clamped to grades the topic has", () => {
    expect(resolveTopic("subtraction", {}, { profileGrade: "3rd" })).toMatchObject({ grade: "3", gradeUnlocked: "3" });
    const fractions = resolveTopic("fractions", {}, { profileGrade: "K" });
    expect(fractions.grade).toBe(topicGrades("fractions")[0]);
    expect(resolveTopic("counting", {}, { profileGrade: "5th" }).grade).toBe(topicGrades("counting").at(-1));
    expect(resolveTopic("subtraction", {}, {}).grade).toBe(topicGrades("subtraction")[0]);
  });

  it("a kid who already played is placed by their level — and the profile grade stays open above it", () => {
    const topic = resolveTopic("subtraction", { level: 2, totalSessions: 4 }, { profileGrade: "3rd" });
    expect(topic.grade).toBe("K");
    expect(topic.gradeUnlocked).toBe("3");
    expect(topic.open).toEqual(topicGrades("subtraction").filter((g) => ["K", "1", "2", "3"].includes(g)));
  });

  it("every (mode, level) a kid could be at resolves to a real grade, and what is missing is queued to save — never the level", () => {
    for (const mode of MODE_IDS) for (let level = 1; level <= maxLevelForMode(mode); level += 1) {
      const topic = resolveTopic(mode, { level, totalSessions: 1 }, { profileGrade: "2nd" });
      expect(topicGrades(mode), `${mode} L${level}`).toContain(topic.grade);
      expect(topic.open).toContain(topic.grade);
      expect(Object.keys(topic.toSave)).not.toContain("level");
      expect(topic.toSave.grade).toBe(topic.grade);
    }
  });

  it("saved state wins, and nothing is queued when nothing is missing", () => {
    const saved = { level: 9, totalSessions: 9, grade: "2", gradeUnlocked: "4", skillMastery: { "sub-2digit-regroup": { state: "practicing", attempts: 3, correct: 2, recent: "110", sessions: 1 } } };
    const topic = resolveTopic("subtraction", saved, { profileGrade: "3rd" });
    expect(topic).toMatchObject({ grade: "2", gradeUnlocked: "4" });
    expect(topic.toSave).toEqual({});
  });

  it("mastery is backfilled from the practice log, so work already done counts", () => {
    const skills = skillsForPlay("3", "subtraction");
    const topic = resolveTopic("subtraction", { level: 9, totalSessions: 8, grade: "3" }, { profileGrade: "3rd", sessions: masterAll(skills, "subtraction") });
    expect(gradeView(topic)).toMatchObject({ mastered: skills.length, complete: true, nextGrade: "4" });
    expect(Object.keys(topic.toSave.skillMastery)).toHaveLength(skills.length);
  });

  it("the sheet's view of a grade lists its skills with their state", () => {
    const log = [session("sub-3digit-regroup", "11111"), session("sub-3digit-regroup", "11111"), session("sub-across-zeros", "101")];
    const view = gradeView(resolveTopic("subtraction", { level: 9, totalSessions: 3, grade: "3" }, { sessions: log }));
    expect(view.skills.find((s) => s.id === "sub-3digit-regroup").state).toBe("mastered");
    expect(view.skills.find((s) => s.id === "sub-across-zeros").state).toBe("practicing");
    expect(view).toMatchObject({ mastered: 1, complete: false });
  });
});

describe("Larkit picks", () => {
  it("is the focus grade's skills, what is in motion first", () => {
    const topic = resolveTopic("subtraction", { level: 9, totalSessions: 2, grade: "3" }, { sessions: [session("sub-across-zeros", "10")] });
    const picks = larkitPicks(topic);
    expect(picks.grade).toBe("3");
    expect(picks.skillIds[0]).toBe("sub-across-zeros");
    expect([...picks.skillIds].sort()).toEqual(skillsForPlay("3", "subtraction").map((s) => s.id).sort());
  });

  it("is the skill a parent pinned — until it is mastered", () => {
    const pinned = { level: 9, totalSessions: 2, grade: "3", pinnedSkillId: "sub-2digit-regroup" };
    expect(larkitPicks(resolveTopic("subtraction", pinned, {}))).toEqual({ skillId: "sub-2digit-regroup", grade: "2" });
    const done = [session("sub-2digit-regroup", "11111"), session("sub-2digit-regroup", "11111")];
    expect(larkitPicks(resolveTopic("subtraction", pinned, { sessions: done })).skillIds).toBeTruthy();
    // A pin for another topic's skill is ignored.
    expect(resolveTopic("addition", { pinnedSkillId: "sub-2digit-regroup" }, {}).pinnedSkillId).toBeNull();
  });
});

describe("signing in merges a device's skills into the account's", () => {
  it("keeps the higher grade, the mastered entry, and the one with more evidence", () => {
    const mastered = [session("sub-across-zeros", "11111"), session("sub-across-zeros", "11111")].reduce(applySession, {});
    const some = applySession({}, session("sub-across-zeros", "110"));
    const merged = mergeTopicState(
      { grade: "2", gradeUnlocked: "3", skillMastery: { ...some, "sub-3digit-regroup": { state: "practicing", attempts: 6, correct: 5 } } },
      { grade: "3", gradeUnlocked: "2", pinnedSkillId: "sub-across-zeros", skillMastery: { ...mastered, "sub-3digit-regroup": { state: "practicing", attempts: 2, correct: 1 } } }
    );
    expect(merged).toMatchObject({ grade: "3", gradeUnlocked: "3", pinnedSkillId: "sub-across-zeros" });
    expect(merged.skillMastery["sub-across-zeros"].state).toBe("mastered");
    expect(merged.skillMastery["sub-3digit-regroup"].attempts).toBe(6);
  });
});

describe("moving up a grade is earned", () => {
  const grade3 = skillsForPlay("3", "subtraction");
  const mastered3 = masterAll(grade3, "subtraction");
  const kid = (profileGrade, extra = {}) =>
    resolveTopic("subtraction", { level: 9, totalSessions: 9, grade: "3", ...extra }, { profileGrade, sessions: mastered3 });

  it("still working → nothing; all mastered and the next grade locked → the challenge", () => {
    expect(gradeUpStatus(resolveTopic("subtraction", { grade: "3", level: 9, totalSessions: 1 }, { profileGrade: "3rd" }))).toBeNull();
    expect(gradeUpStatus(kid("3rd"))).toMatchObject({ kind: "challenge", grade: "3", nextGrade: "4", attempts: 0, needsPractice: false });
  });

  it("all mastered and the next grade already open (profile grade, or a parent) → the focus just moves up", () => {
    expect(gradeUpStatus(kid("4th"))).toMatchObject({ kind: "advance", nextGrade: "4" });
    expect(gradeUpStatus(kid("3rd", { gradeUnlocked: "4" }))).toMatchObject({ kind: "advance" });
    expect(advanceGrade(kid("4th"), "4")).toMatchObject({ grade: "4", gradeUnlocked: "4" });
  });

  it("a one-skill grade skips the challenge; the top grade is 'complete'", () => {
    const one = MODE_IDS.flatMap((mode) => topicGrades(mode).map((g) => [mode, g])).find(([mode, g]) => skillsForPlay(g, mode).length === 1 && nextTopicGrade(mode, g));
    expect(one, "the catalog has single-skill grades").toBeTruthy();
    const [mode, g] = one;
    const topic = resolveTopic(mode, { level: 1, totalSessions: 3, grade: g }, { profileGrade: g, sessions: masterAll(skillsForPlay(g, mode), mode) });
    expect(["auto", "advance"]).toContain(gradeUpStatus(topic).kind);

    const top = topicGrades("subtraction").at(-1);
    const done = resolveTopic("subtraction", { level: 10, totalSessions: 9, grade: top }, { profileGrade: "5th", sessions: masterAll(skillsForPlay(top, "subtraction"), "subtraction") });
    expect(gradeUpStatus(done)).toEqual({ kind: "complete", grade: top });
  });

  it("the challenge walks the grade's skills, shakiest first", () => {
    const shaky = [...mastered3, session(grade3[1].id, "0000")];
    const topic = resolveTopic("subtraction", { level: 9, totalSessions: 9, grade: "3" }, { profileGrade: "3rd", sessions: shaky });
    expect(challengeFor(topic)).toMatchObject({ challenge: true, grade: "3" });
    expect(challengeFor(topic).skillIds[0]).toBe(grade3[1].id);
  });

  it("five of six opens the next grade; a third miss asks for one more practice session, which a session then answers", () => {
    let topic = kid("3rd");
    expect(applyChallengeResult(topic, GRADE_UP.pass)).toMatchObject({ passed: true, nextGrade: "4", patch: { grade: "4", gradeUnlocked: "4" } });

    for (let miss = 1; miss <= GRADE_UP.maxAttempts; miss += 1) {
      const result = applyChallengeResult(topic, 3);
      expect(result.passed).toBe(false);
      expect(Boolean(result.reearn)).toBe(miss === GRADE_UP.maxAttempts);
      topic = resolveTopic("subtraction", { level: 9, totalSessions: 9, grade: "3", skillMastery: result.patch.skillMastery }, { profileGrade: "3rd" });
    }
    expect(gradeUpStatus(topic)).toMatchObject({ kind: "challenge", needsPractice: true, attempts: 0 });
    const practiced = resolveTopic("subtraction", { level: 9, totalSessions: 10, grade: "3", skillMastery: afterPractice(topic.mastery) }, { profileGrade: "3rd" });
    expect(gradeUpStatus(practiced)).toMatchObject({ kind: "challenge", needsPractice: false });
    // The bookkeeping never counts as a skill.
    expect(gradeView(practiced).total).toBe(grade3.length);
  });

  it("a parent can open a later grade; it never closes an earned one", () => {
    const topic = resolveTopic("multiplication", {}, { profileGrade: "2nd" });
    expect(unlockGrade(topic, "4")).toMatchObject({ gradeUnlocked: "4", grade: "4" });
    expect(unlockGrade(kid("3rd", { gradeUnlocked: "4" }), "2")).toMatchObject({ gradeUnlocked: "4", grade: "2" });
    expect(unlockGrade(topic, "9")).toEqual({});
  });
});
