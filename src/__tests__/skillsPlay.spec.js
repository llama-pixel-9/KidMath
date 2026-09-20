import { describe, expect, it } from "vitest";
import { FULL_ITEMS } from "../itemBank/fullBank";
import { MODE_IDS } from "../modes";
import { maxLevelForMode } from "../modeLevels";
import { GRADES, WORKSHEET_SKILLS } from "../skills/catalog";
import {
  PLAY_TWINS,
  catalogGrade,
  clampGrade,
  gradeForModeLevel,
  isPlayable,
  nextTopicGrade,
  openGrades,
  playSkillById,
  playSkills,
  skillForAttempt,
  skillsForPlay,
  topicGrades,
} from "../skills/play";
import { questionText } from "../analytics/sessionRecord";

// Play and print read ONE catalog. "Subtract 3-digit numbers with regrouping"
// is the same skill on the play sheet and on paper — so a parent can print
// exactly what their kid is stuck on.

describe("skill catalog parity: play vs worksheets", () => {
  const twinIds = new Set(PLAY_TWINS.flatMap((t) => [t.id, t.alias]));
  const printOnly = WORKSHEET_SKILLS.filter((s) => !isPlayable(s)).map((s) => s.id);

  it("every playable skill is the worksheet skill: same id, grade, topic and title", () => {
    for (const skill of playSkills()) {
      const printed = WORKSHEET_SKILLS.find((s) => s.id === skill.id);
      expect(printed, skill.id).toBeTruthy();
      expect([skill.grade, skill.mode], skill.id).toEqual([printed.grade, printed.mode]);
      if (!twinIds.has(skill.id)) expect(skill.title, skill.id).toBe(printed.title);
    }
  });

  it("the only worksheet skills missing from play are picture twins and the two remainder drills", () => {
    const playable = new Set(playSkills().map((s) => s.id));
    const missing = WORKSHEET_SKILLS.filter((s) => !playable.has(s.id)).map((s) => s.id).sort();
    expect(missing).toEqual([...PLAY_TWINS.map((t) => t.alias), ...printOnly].sort());
    expect(printOnly.sort()).toEqual(["div-2digit-remainder", "div-3digit-by-1digit"]);
  });

  it("a picture twin shares its sibling's bank cell, and its id resolves to the merged skill", () => {
    for (const { id, alias } of PLAY_TWINS) {
      const plain = WORKSHEET_SKILLS.find((s) => s.id === id);
      const pic = WORKSHEET_SKILLS.find((s) => s.id === alias);
      expect([pic.mode, pic.grade, pic.source.subskills, pic.source.levels]).toEqual([
        plain.mode, plain.grade, plain.source.subskills, plain.source.levels,
      ]);
      expect(playSkillById(alias).id).toBe(id);
    }
  });

  it("a play skill is its whole cell: no print-only exclusions ride along", () => {
    for (const skill of playSkills()) expect(skill.source.excludeStructureTypes, skill.id).toBeUndefined();
  });
});

describe("grades per topic", () => {
  it("every mode is playable somewhere, and every grade has something to play", () => {
    for (const mode of MODE_IDS) expect(topicGrades(mode).length, mode).toBeGreaterThan(0);
    for (const grade of GRADES) expect(playSkills().some((s) => s.grade === grade), grade).toBe(true);
  });

  it("kid profile grades map onto catalog grades; 6th plays grade 5", () => {
    expect(["K", "1st", "3rd", "6th", "2"].map(catalogGrade)).toEqual(["K", "1", "3", "5", "2"]);
    expect(catalogGrade(null)).toBeNull();
  });

  it("a topic starts at the kid's grade, clamped to grades the topic has", () => {
    expect(clampGrade("subtraction", "3rd")).toBe("3");
    // Fractions starts at grade 2: a kindergartner opening it gets its lowest grade.
    expect(clampGrade("fractions", "K")).toBe(topicGrades("fractions")[0]);
    // Counting stops at grade 1: a 4th grader gets its top grade, not nothing.
    expect(clampGrade("counting", "4th")).toBe(topicGrades("counting").at(-1));
    for (const mode of MODE_IDS) for (const g of ["K", "1st", "2nd", "3rd", "4th", "5th", "6th"]) {
      expect(topicGrades(mode), `${mode} ${g}`).toContain(clampGrade(mode, g));
    }
  });

  it("the next grade skips holes, and is null at the top", () => {
    for (const mode of MODE_IDS) {
      const grades = topicGrades(mode);
      grades.forEach((g, i) => expect(nextTopicGrade(mode, g), `${mode} ${g}`).toBe(grades[i + 1] ?? null));
    }
  });

  it("earlier grades are always open; later ones only once earned or opened by a parent", () => {
    const grades = topicGrades("subtraction");
    expect(openGrades("subtraction", { profileGrade: "2nd" })).toEqual(grades.filter((g) => GRADES.indexOf(g) <= GRADES.indexOf("2")));
    expect(openGrades("subtraction", { profileGrade: "2nd", gradeUnlocked: "4" })).toEqual(grades);
    // An unlocked grade BELOW the profile grade never closes the profile grade.
    expect(openGrades("subtraction", { profileGrade: "3rd", gradeUnlocked: "1" })).toContain("3");
  });

  it("every existing engine level means a grade the topic really has (migration)", () => {
    for (const mode of MODE_IDS) {
      let last = -1;
      for (let level = 1; level <= maxLevelForMode(mode); level += 1) {
        const grade = gradeForModeLevel(mode, level);
        expect(topicGrades(mode), `${mode} L${level}`).toContain(grade);
        // A higher level never migrates to a lower grade.
        expect(GRADES.indexOf(grade), `${mode} L${level}`).toBeGreaterThanOrEqual(last);
        last = GRADES.indexOf(grade);
      }
    }
  });

  it("skills within a grade are ordered easiest band first", () => {
    for (const mode of MODE_IDS) for (const grade of topicGrades(mode)) {
      const levels = skillsForPlay(grade, mode).map((s) => s.level);
      expect(levels, `${mode} ${grade}`).toEqual([...levels].sort((a, b) => a - b));
    }
  });
});

describe("crediting attempts to skills", () => {
  const attemptOf = (item, level) => ({
    prompt: questionText(item.question),
    subskill: item.subskill,
    level,
    retry: false,
    correct: true,
  });

  it("an attempt served for a skill counts for that skill", () => {
    expect(skillForAttempt("time", { skillId: "time-read-clock-4-pic" }).id).toBe("time-read-clock-4");
  });

  it("outside the four operations, every bank row a kid could have answered maps to exactly its cell's skill", () => {
    const arithmetic = new Set(["addition", "subtraction", "multiplication", "division"]);
    let credited = 0;
    let total = 0;
    for (const item of FULL_ITEMS) {
      if (arithmetic.has(item.modeId) || item.itemFamily === "application") continue;
      const level = item.levelRange[0];
      const skill = skillForAttempt(item.modeId, attemptOf(item, level));
      total += 1;
      if (!skill) continue;
      credited += 1;
      expect(skill.mode).toBe(item.modeId);
      expect(skill.source.subskills, item.itemId).toContain(item.subskill);
      expect(level >= skill.source.levels[0] && level <= skill.source.levels[1], item.itemId).toBe(true);
    }
    // Cells left out of the catalog on purpose (thin or widget-bound) are the only gaps.
    expect(credited / total).toBeGreaterThan(0.97);
  });

  it("a bare drill from before skills existed is credited to the computation skill it satisfies", () => {
    const credit = (mode, prompt) => skillForAttempt(mode, { prompt, subskill: "factFluency", level: 8 })?.id;
    expect(credit("subtraction", "641 − 564 = ?")).toBe("sub-3digit-regroup");
    expect(credit("subtraction", "826 - 603 = ?")).toBe("sub-3digit-no-regroup");
    expect(credit("addition", "3 + 1 = ?")).toBe("add-within-5");
    expect(credit("multiplication", "7 × 8 = ?")).toBe("mul-tables-7-8-9");
    expect(credit("division", "56 ÷ 7 = ?")).toBe("div-facts-7-8-9");
  });

  it("a prompt whose numbers fit none of the cell's skills is credited to none", () => {
    // unknownAddend skills are within 10, within 20 and within 1000 — not within 100.
    expect(skillForAttempt("addition", { prompt: "25 + ? = 60", subskill: "unknownAddend", level: 5 })).toBeNull();
    expect(skillForAttempt("addition", { prompt: "9 + ? = 15", subskill: "unknownAddend", level: 5 }).id).toBe("add-missing-addend-20");
  });
});
