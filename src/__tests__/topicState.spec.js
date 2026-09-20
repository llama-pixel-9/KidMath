import { describe, expect, it } from "vitest";
import { MODE_IDS } from "../modes";
import { maxLevelForMode } from "../modeLevels";
import { applySession } from "../skills/mastery";
import { skillsForPlay, topicGrades } from "../skills/play";
import { gradeView, larkitPicks, mergeTopicState, resolveTopic } from "../skills/topicState";

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
