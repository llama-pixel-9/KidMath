import { beforeAll, describe, expect, it } from "vitest";
import { FULL_ITEMS } from "../itemBank/fullBank";
import { setBankItems } from "../itemBank";
import { MODE_IDS } from "../modes";
import { checkItems, storyMatches } from "../worksheets/claimCheck";
import { generateWorksheet, practiceAvailability, storyAvailability } from "../worksheets/generateWorksheet";
import { LAYOUTS, STORIES_PER_SHEET, layoutForClaim } from "../worksheets/layouts";
import { documentTitle, headerLine, skillForModeLevel, topicsForGrade } from "../worksheets/skillIndex";
import { GRADES, GRADE_SLUGS, TOPIC_LABELS, WORKSHEET_SKILLS } from "../worksheets/skills";

// A skill's title is a promise about every problem on the sheet. This spec is
// what keeps "Subtract 3-digit numbers with regrouping" from printing 380 − 35.

const CCSS = /^(K|[1-5])\.(CC|OA|NBT|NF|MD|G)\.[A-D]\.\d+[a-d]?$/;
const SCREEN_VERBS = /\b(tap|press|drag|swipe|click|touch)\b/i;
const SHEETS = 3;

// Modes whose skills are authored. Grows to all of MODE_IDS as the prompt
// modes are read off the audit (docs/worksheet-skill-audit.md).
const AUTHORED_MODES = ["addition", "subtraction", "multiplication", "division"];

function printRun(skill, problemType) {
  const seenKeys = new Set();
  return Array.from({ length: SHEETS }, () => generateWorksheet(skill.id, { problemType, seenKeys }));
}

beforeAll(() => setBankItems(FULL_ITEMS, "test"));

describe("worksheet skill catalog", () => {
  it("ids and titles are unique", () => {
    const ids = WORKSHEET_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const titles = WORKSHEET_SKILLS.map((s) => `${s.grade}|${s.mode}|${s.title}`);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("every skill sits in the grade of its first standard", () => {
    for (const skill of WORKSHEET_SKILLS) {
      expect(GRADES, skill.id).toContain(skill.grade);
      expect(MODE_IDS, skill.id).toContain(skill.mode);
      expect(TOPIC_LABELS[skill.mode], skill.id).toBeTruthy();
      for (const code of skill.ccss) expect(code, skill.id).toMatch(CCSS);
      expect(skill.ccss[0].split(".")[0], skill.id).toBe(skill.grade);
    }
  });

  it("every authored mode has skills, and every topic has a plain name", () => {
    for (const mode of AUTHORED_MODES) {
      expect(WORKSHEET_SKILLS.some((s) => s.mode === mode), mode).toBe(true);
    }
    for (const mode of MODE_IDS) expect(TOPIC_LABELS[mode], mode).toBeTruthy();
    for (const grade of GRADES) expect(GRADE_SLUGS[grade]).toBeTruthy();
  });

  it.todo("every mode in MODE_IDS has at least one skill (prompt modes: phase 6)");

  it("one sheet, one layout: multi-digit stacks, facts go sideways, division gets a bracket", () => {
    for (const skill of WORKSHEET_SKILLS) {
      expect(LAYOUTS[skill.layout], skill.id).toBeTruthy();
      if (skill.source.kind === "computation") {
        expect(skill.layout, skill.id).toBe(layoutForClaim(skill.source));
      }
    }
  });

  it("lookups: topics per grade, legacy mode+level bridge, header and PDF title", () => {
    expect(topicsForGrade("3", MODE_IDS)).toEqual(["addition", "subtraction", "multiplication", "division"]);
    expect(skillForModeLevel("subtraction", 10).mode).toBe("subtraction");
    const skill = WORKSHEET_SKILLS.find((s) => s.id === "sub-3digit-regroup");
    expect(headerLine(skill)).toBe("Subtraction · Subtract 3-digit numbers with regrouping · Grade 3 · 3.NBT.A.2");
    expect(documentTitle(skill)).toContain("Worksheet");
    expect(`${headerLine(skill)} ${documentTitle(skill)}`).not.toMatch(/level|flight/i);
  });
});

describe("worksheet skills keep their promise", () => {
  for (const skill of WORKSHEET_SKILLS) {
    it(`${skill.id}: practice sheets are full and match "${skill.title}"`, () => {
      for (const sheet of printRun(skill, "practice")) {
        expect(sheet.layout).toBe(skill.layout);
        expect(sheet.wordProblems).toEqual([]);
        expect(sheet.items.length, "fills the page").toBe(LAYOUTS[skill.layout].practice);
        expect(sheet.shortfall).toBe(0);
        expect(checkItems(sheet.items, skill.source)).toEqual([]);
        for (const q of sheet.items) {
          expect(SCREEN_VERBS.test(q.display?.promptText || ""), q.display?.promptText).toBe(false);
        }
      }
    });

    if (skill.source.kind === "bank") {
      it(`${skill.id}: bank pool covers a ${SHEETS}-sheet print run, nothing generated`, () => {
        expect(practiceAvailability(skill.id)).toBeGreaterThanOrEqual(LAYOUTS[skill.layout].practice * SHEETS);
        const prompts = printRun(skill, "practice").flatMap((sheet) => sheet.items.map((q) => q.display.promptText));
        expect(new Set(prompts).size, "no sentence twice in a print run").toBe(prompts.length);
      });
    }

    it(`${skill.id}: word problems are bank stories that fit the skill`, () => {
      const available = storyAvailability(skill.id);
      const [mixed] = printRun(skill, "mixed");
      const [stories] = printRun(skill, "stories");
      expect(stories.layout).toBe("stories");
      expect(stories.items).toEqual([]);
      // Never a fake story: a thin pool comes back short and says so.
      expect(stories.wordProblems.length).toBe(Math.min(available, STORIES_PER_SHEET));
      expect(stories.shortfall).toBe(STORIES_PER_SHEET - stories.wordProblems.length);
      expect(mixed.items.length).toBe(LAYOUTS[skill.layout].mixed);
      expect(checkItems(mixed.items, skill.source)).toEqual([]);
      for (const { kind, question: q } of [...mixed.wordProblems, ...stories.wordProblems]) {
        expect(kind).toBe("story");
        expect(q.metadata.itemSource).toBe("bank");
        expect(q.metadata.itemFamily).toBe("application");
        expect(q.mode).toBe(skill.mode);
        expect(storyMatches(q, skill.stories), q.display.promptText).toBe(true);
        expect(SCREEN_VERBS.test(q.display.promptText), q.display.promptText).toBe(false);
      }
    });
  }
});
