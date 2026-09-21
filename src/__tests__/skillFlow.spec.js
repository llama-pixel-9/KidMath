import { describe, expect, it } from "vitest";
import { MODE_IDS } from "../modes";
import { skillsForPlay, topicGrades } from "../skills/play";
import {
  parentControls,
  sessionLabel,
  sessionOptionsFor,
  settleSkillSession,
  topicChip,
  topicSheetModel,
  unlockGradePatch,
} from "../skills/flow";

// skills/flow.js is what BOTH apps run between their screen and their store.
// The web page and the SwiftUI app render its output; neither re-derives it.

let clock = 0;
const session = (skillId, marks, mode = "subtraction", extra = {}) => {
  clock += 1000;
  return { id: `s${clock}`, mode, kind: "normal", startedAt: clock, endedAt: clock + 1,
    attempts: marks.split("").map((m) => ({ skillId, correct: m === "1", retry: false })), ...extra };
};
const masterAll = (skills, mode) => skills.flatMap((s) => [session(s.id, "11111", mode), session(s.id, "11111", mode)]);
const G3 = skillsForPlay("3", "subtraction");
const kid = { profileGrade: "3rd" };

describe("the topic sheet model", () => {
  it("a new kid: their grade, every skill not started, Larkit picks", () => {
    const sheet = topicSheetModel("subtraction", {}, { ...kid, sessions: [] });
    expect(sheet.gradeLabel).toBe("Grade 3");
    expect(sheet.practiceLabel).toBe("Practice — Larkit picks");
    expect(sheet.practiceRequest).toEqual({ mix: true, grade: "3" });
    expect(sheet.skills.map((s) => s.statusText)).toEqual(G3.map(() => "Not started"));
    expect(sheet.footer).toBe(`0 of ${G3.length} Grade 3 skills mastered`);
    expect(sheet.flight).toBeFalsy();
    expect(sheet.toSave.grade).toBe("3");
  });

  it("progress reads as a count toward the rule, and a pin takes over the big button", () => {
    const sessions = [session(G3[0].id, "1101")];
    const sheet = topicSheetModel("subtraction", { pinnedSkillId: G3[1].id }, { ...kid, sessions });
    expect(sheet.skills[0]).toMatchObject({ state: "practicing", right: 3, goal: 8, stateLabel: "3 of 8", statusText: "3 of 8 right — keep going" });
    expect(sheet.practiceLabel).toBe(`Practice — ${G3[1].title}`);
    expect(sheet.practiceRequest).toEqual({ skill: G3[1].id });
  });

  it("every skill mastered and the next grade locked → the Fledging Flight is offered", () => {
    const sheet = topicSheetModel("subtraction", {}, { ...kid, sessions: masterAll(G3, "subtraction") });
    expect(sheet.flight).toMatchObject({ button: "Take the Fledging Flight", needsPractice: false, nextGrade: "4" });
    expect(sheet.flight.detail).toMatch(/^A Fledging Flight: 6 questions, 5 to pass — and Grade 4 opens/);
  });

  it("only an open grade can be shown", () => {
    const context = { ...kid, sessions: [] };
    expect(topicSheetModel("subtraction", {}, context, "2").grade).toBe("2");
    expect(topicSheetModel("subtraction", {}, context, "4").grade).toBe("3");
  });

  it("every topic builds a sheet for every kid grade", () => {
    for (const mode of MODE_IDS) {
      if (!topicGrades(mode).length) continue;
      for (const profileGrade of ["K", "1st", "3rd", "5th", "6th", null]) {
        const sheet = topicSheetModel(mode, {}, { profileGrade, sessions: [] });
        expect(sheet.skills.length, `${mode} ${profileGrade}`).toBeGreaterThan(0);
        expect(sheet.open.map((g) => g.grade)).toContain(sheet.grade);
      }
    }
  });
});

describe("what a tap starts", () => {
  const context = { ...kid, sessions: [] };
  it("a skill, a mix of an open grade, and nothing for a grade that is not open", () => {
    expect(sessionOptionsFor("subtraction", {}, context, { skill: G3[0].id })).toMatchObject({ skillId: G3[0].id, grade: "3" });
    expect(sessionOptionsFor("subtraction", {}, context, { skill: skillsForPlay("3", "addition")[0].id })).toBeNull();
    expect(sessionOptionsFor("subtraction", {}, context, { mix: true, grade: "2" }).grade).toBe("2");
    expect(sessionOptionsFor("subtraction", {}, context, { mix: true, grade: "4" }).grade).toBe("3");
    expect(sessionOptionsFor("subtraction", {}, context, {})).toBeNull();
  });

  it("a Fledging Flight only when it has been earned", () => {
    expect(sessionOptionsFor("subtraction", {}, context, { challenge: true })).toBeNull();
    const earned = sessionOptionsFor("subtraction", {}, { ...kid, sessions: masterAll(G3, "subtraction") }, { challenge: true });
    expect(earned).toMatchObject({ challenge: true, fledging: true, grade: "3" });
  });

  it("names the session", () => {
    expect(sessionLabel({ level: 3 }, "subtraction")).toBeNull();
    expect(sessionLabel({ skillIds: [G3[0].id], pinned: true, grade: "3" }, "subtraction")).toBe(G3[0].title);
    expect(sessionLabel({ skillIds: G3.map((s) => s.id), grade: "3" }, "subtraction")).toBe("Mixed · Grade 3");
    expect(sessionLabel({ skillIds: G3.map((s) => s.id), grade: "3", challenge: true }, "subtraction")).toBe("Fledging Flight to Grade 4");
  });
});

describe("settling a finished session", () => {
  it("a ladder session settles nothing", () => {
    expect(settleSkillSession("subtraction", {}, { ...kid, sessions: [] }, { level: 3 }, session(G3[0].id, "11111"))).toBeNull();
  });

  it("practice moves mastery, never the level, and says where the kid stands", () => {
    const first = session(G3[0].id, "11111");
    const settled = settleSkillSession("subtraction", { level: 7 }, { ...kid, sessions: [] }, { skillIds: [G3[0].id], pinned: true, grade: "3" }, first);
    expect(settled.patch).not.toHaveProperty("level");
    expect(settled.patch.skillMastery[G3[0].id].state).toBe("practicing");
    expect(settled.standing.line).toBe(`Grade 3 · 0 of ${G3.length} skills mastered`);
    expect(settled.standing.gradeUpNote).toBeNull();
  });

  it("a session already written to the practice log is not counted twice", () => {
    // The log is saved before progress, so the closed record is usually in `sessions`.
    const first = session(G3[0].id, "1111111111");
    const settled = settleSkillSession("subtraction", {}, { ...kid, sessions: [first] }, { skillIds: [G3[0].id], pinned: true, grade: "3" }, first);
    const entry = settled.patch.skillMastery[G3[0].id];
    expect(entry.attempts).toBe(10);
    expect(entry.sessions).toBe(1);
    expect(entry.state).toBe("practicing"); // ten right in ONE session is not mastery
  });

  it("the session that masters the last skill announces the Fledging Flight", () => {
    const log = masterAll(G3, "subtraction");
    const last = log.pop();
    const progress = { skillMastery: topicSheetModel("subtraction", {}, { ...kid, sessions: log }).toSave.skillMastery };
    const settled = settleSkillSession("subtraction", progress, { ...kid, sessions: log }, { skillIds: [G3[G3.length - 1].id], pinned: true, grade: "3" }, last);
    expect(settled.standing.newlyMastered).toEqual([G3[G3.length - 1].title]);
    expect(settled.standing.gradeUpNote.detail).toBe("Next time: a Fledging Flight — six questions to open Grade 4.");
  });

  it("a passed Fledging Flight opens the next grade; a missed one does not", () => {
    const sessions = masterAll(G3, "subtraction");
    const flight = { skillIds: G3.map((s) => s.id), grade: "3", challenge: true };
    const record = session(G3[0].id, "111111", "subtraction", { kind: "fledging" });
    const passed = settleSkillSession("subtraction", {}, { ...kid, sessions }, { ...flight, firstTryCorrect: 5 }, record);
    expect(passed.patch).toMatchObject({ grade: "4", gradeUnlocked: "4" });
    expect(passed.standing.gradeUpNote).toEqual({ headline: "You finished Grade 3 Subtraction!", detail: "Grade 4 is open." });
    const missed = settleSkillSession("subtraction", {}, { ...kid, sessions }, { ...flight, firstTryCorrect: 4 }, record);
    expect(missed.patch.grade ?? "3").toBe("3");
    expect(missed.standing.gradeUpNote.headline).toBe("4 of 6 — not yet.");
  });
});

describe("Home chip and grown-up controls", () => {
  it("the chip says grade and skills mastered", () => {
    const chip = topicChip("subtraction", {}, { ...kid, sessions: masterAll(G3.slice(0, 1), "subtraction") });
    expect(chip).toMatchObject({ text: `Grade 3 · 1/${G3.length}`, started: true, flightReady: false });
    expect(topicChip("subtraction", {}, { ...kid, sessions: [] }).started).toBe(false);
  });

  it("a grown-up can open a later grade and pin any open skill", () => {
    const context = { ...kid, sessions: [] };
    const controls = parentControls("subtraction", {}, context);
    expect(controls.grades.find((g) => g.grade === "4")).toMatchObject({ open: false, label: "Open Grade 4" });
    expect(controls.pinGroups.map((g) => g.grade)).not.toContain("4");
    const patch = unlockGradePatch("subtraction", {}, context, "4");
    expect(patch).toEqual({ gradeUnlocked: "4", grade: "4" });
    expect(parentControls("subtraction", patch, context).pinGroups.map((g) => g.grade)).toContain("4");
    expect(unlockGradePatch("subtraction", {}, context, "9")).toEqual({});
  });
});
