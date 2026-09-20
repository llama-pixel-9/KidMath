import { beforeAll, describe, expect, it } from "vitest";
import { FULL_ITEMS } from "../itemBank/fullBank";
import { setBankItems } from "../itemBank";
import { isTrivialFact, isYesNoJudgment, printOptionBank, questionAnswerType } from "../mathEngine";
import { MODE_IDS } from "../modes";
import { checkItems, storyMatches } from "../worksheets/claimCheck";
import { generateWorksheet, paperFigureKey, practiceAvailability, storyPlan } from "../worksheets/generateWorksheet";
import { LAYOUTS, isFigureLayout, layoutForClaim } from "../worksheets/layouts";
import { documentTitle, headerLine, skillForModeLevel, topicsForGrade } from "../worksheets/skillIndex";
import { GRADES, GRADE_SLUGS, TOPIC_LABELS, WORKSHEET_SKILLS } from "../worksheets/skills";

// A skill's title is a promise about every problem on the sheet. This spec is
// what keeps "Subtract 3-digit numbers with regrouping" from printing 380 − 35.

const CCSS = /^(K|[1-5])\.(CC|OA|NBT|NF|MD|G)\.[A-D]\.\d+[a-d]?$/;
const SCREEN_VERBS = /\b(tap|press|drag|swipe|click|touch)\b|\bType (the|its|in|your|a|an)\b/i;
const SHEETS = 3;

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
      // No standard (calendars, early coins) is fine; a wrong grade is not.
      if (skill.ccss[0]) expect(skill.ccss[0].split(".")[0], skill.id).toBe(skill.grade);
    }
  });

  it("every mode and every grade has skills, and every topic has a plain name", () => {
    for (const mode of MODE_IDS) {
      expect(WORKSHEET_SKILLS.some((s) => s.mode === mode), mode).toBe(true);
      expect(TOPIC_LABELS[mode], mode).toBeTruthy();
    }
    for (const grade of GRADES) {
      expect(WORKSHEET_SKILLS.some((s) => s.grade === grade), grade).toBe(true);
      expect(GRADE_SLUGS[grade]).toBeTruthy();
    }
  });

  it("one sheet, one layout: multi-digit stacks, facts go sideways, division gets a bracket", () => {
    for (const skill of WORKSHEET_SKILLS) {
      expect(LAYOUTS[skill.layout], skill.id).toBeTruthy();
      if (skill.source.kind === "computation") {
        expect(skill.layout, skill.id).toBe(layoutForClaim(skill.source));
      }
    }
  });

  it("lookups: topics per grade, legacy mode+level bridge, header and PDF title", () => {
    expect(topicsForGrade("3", MODE_IDS).slice(0, 4)).toEqual(["addition", "subtraction", "multiplication", "division"]);
    expect(topicsForGrade("K", MODE_IDS)).not.toContain("division");
    expect(skillForModeLevel("subtraction", 10).mode).toBe("subtraction");
    const skill = WORKSHEET_SKILLS.find((s) => s.id === "sub-3digit-regroup");
    expect(headerLine(skill)).toBe("Subtraction · Subtract 3-digit numbers with regrouping · Grade 3");
    // Standard codes are data, not copy: never on a sheet or a PDF name.
    expect(`${headerLine(skill)} ${documentTitle(skill)}`).not.toContain(skill.ccss[0]);
    expect(documentTitle(skill)).toContain("Worksheet");
    expect(`${headerLine(skill)} ${documentTitle(skill)}`).not.toMatch(/level|flight/i);
  });
});

// The paper rules (#34): everything a sheet prints must be answerable with a
// pencil. They used to be checked on the old mode + level sheets; they are
// checked on every skill now.
function expectPaperRules(sheet, id) {
  const questions = [...sheet.items, ...sheet.wordProblems.map((item) => item.question)];
  for (const q of questions) {
    const text = q.display?.promptText || "";
    const where = `${id}: "${text}"`;
    expect(SCREEN_VERBS.test(text), where).toBe(false);
    // The answer is never printed inside its own prompt.
    if (typeof q.answer === "number" && text) {
      expect(new RegExp(`\\b${String(q.answer).replace(/\./g, "\\.")}\\b`).test(text), where).toBe(false);
    }
    if (questionAnswerType(q) !== "choice") continue;
    const bank = printOptionBank(q);
    const numeric = typeof q.answer === "number" || (typeof q.answer === "string" && /^-?\d+([./]\d+)?$/.test(q.answer.trim()));
    // Judgments print as circle-Yes-or-No; a non-numeric answer is
    // unanswerable without its options; a printed bank holds the answer.
    if (isYesNoJudgment(q)) expect(bank, where).toBeNull();
    else if (!numeric) expect(bank, where).not.toBeNull();
    if (bank) expect(bank.map(String), where).toContain(String(q.answer));
  }
  // A page of n × 1 teaches nothing: at most one identity fact a drill
  // (pools smaller than a page excepted — they repeat by design).
  if (sheet.items.every((q) => q.metadata?.itemSource === "worksheetSampler")) {
    const keys = new Set(sheet.items.map((q) => `${q.a},${q.b}`));
    if (keys.size === sheet.items.length) {
      expect(sheet.items.filter(isTrivialFact).length, id).toBeLessThanOrEqual(1);
    }
  }
}

describe("worksheet skills keep their promise", () => {
  for (const skill of WORKSHEET_SKILLS) {
    it(`${skill.id}: practice sheets are full and match "${skill.title}"`, () => {
      for (const sheet of printRun(skill, "practice")) {
        expect(sheet.layout).toBe(skill.layout);
        expect(sheet.wordProblems).toEqual([]);
        expect(sheet.items.length, "fills the page").toBe(LAYOUTS[skill.layout].practice);
        expect(sheet.shortfall).toBe(0);
        expect(checkItems(sheet.items, skill.source)).toEqual([]);
        expectPaperRules(sheet, skill.id);
        for (const q of sheet.items) {
          // One sheet, one kind of item: all pictured, or none.
          if (skill.source.kind === "bank") expect(Boolean(paperFigureKey(q)), q.display?.promptText).toBe(isFigureLayout(skill.layout));
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
      const plan = storyPlan(skill.id);
      const [mixed] = printRun(skill, "mixed");
      const [stories] = printRun(skill, "stories");
      expect(stories.layout).toBe("stories");
      expect(stories.items).toEqual([]);
      // Never a fake story: a thin pool comes back short and says so.
      expect(stories.wordProblems.length).toBe(Math.min(plan.pool.length, plan.perSheet));
      expect(stories.shortfall).toBe(plan.perSheet - stories.wordProblems.length);
      // All pictured or none, so the page budget holds.
      const pictured = stories.wordProblems.map(({ question }) => Boolean(paperFigureKey(question)));
      expect(new Set(pictured).size).toBeLessThanOrEqual(1);
      expect(mixed.items.length).toBe(LAYOUTS[skill.layout].mixed);
      expect(checkItems(mixed.items, skill.source)).toEqual([]);
      expectPaperRules(mixed, skill.id);
      expectPaperRules(stories, skill.id);
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
