/**
 * Worksheet print regression (#34). Generates worksheets through the real UI
 * — grade → skill → problem type → sheets — and checks the PAPER rules: no
 * screen-verb language on a sheet, graphs actually drawn, one layout per
 * sheet, and, via Chromium's own print pipeline (page.pdf), that every sheet
 * fits its page: N sheets (+ keys) produce exactly N (+N) PDF pages.
 *
 * The page-fit budgets in src/worksheets/layouts.js are MEASURED by this
 * file. WORKSHEETS_E2E_ALL=1 prints every skill × problem type (minutes);
 * the default run prints each layout's hardest cases.
 *
 * Runs headless-only (page.pdf is a headless-Chromium API). Without Supabase
 * the dev server reads the full bank from disk, so bank skills are testable.
 */
import { expect, test } from "@playwright/test";
import { GRADE_LABELS, WORKSHEET_SKILLS } from "../src/worksheets/skills.js";

const TYPE_BUTTON = { practice: "Practice problems only", stories: "Word problems only", mixed: "Mixed" };

// Chromium writes page objects uncompressed; the /Pages tree's /Count is the
// page total. Take the max in case of nested trees.
function pdfPageCount(buffer) {
  const text = buffer.toString("latin1");
  const counts = [...text.matchAll(/\/Count (\d+)/g)].map((m) => Number(m[1]));
  return counts.length ? Math.max(...counts) : 0;
}

async function pickSkill(page, { grade, title }) {
  await page.goto("/worksheets");
  await page.getByRole("button", { name: GRADE_LABELS[grade], exact: true }).click();
  await page.getByRole("radio", { name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).click();
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
}

async function generate(page, { type = "practice", sheets = 1 } = {}) {
  const typeButton = page.getByRole("button", { name: TYPE_BUTTON[type], exact: true });
  if (await typeButton.isDisabled()) return false;
  await typeButton.click();
  await page.getByRole("button", { name: `${sheets} ${sheets === 1 ? "sheet" : "sheets"}`, exact: true }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByText("Landed").first()).toBeVisible();
  return true;
}

async function expectOnePagePerSheet(page, sheets) {
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
  expect(pdfPageCount(pdf), "one page per sheet + one per answer key").toBe(sheets * 2);
}

async function printedText(page) {
  const text = await page.locator("body").innerText();
  return text.slice(text.indexOf("Name"));
}

// Each layout's hardest page-fit cases: the longest titles (two-line headers)
// and the tallest items.
const REPRESENTATIVES = [
  "sub-3digit-regroup", // the sheet from the original report
  "sub-2digit-1digit", // stacked, long title
  "mul-3digit-by-2digit", // stackedWide: partial-product work space
  "add-4digit",
  "mul-tables-7-8-9", // horizontal
  "mul-by-multiples-of-10",
  "div-2digit-remainder", // longDivision + the longest title in the catalog
  "div-by-2digit",
  "sub-missing-number-1000", // prompt
  "add-make-ten",
  "div-remainders",
];

const printAll = process.env.WORKSHEETS_E2E_ALL === "1";
const skills = WORKSHEET_SKILLS.filter((skill) => printAll || REPRESENTATIVES.includes(skill.id));

for (const skill of skills) {
  for (const type of ["practice", "mixed", "stories"]) {
    test(`worksheets: ${skill.id} · ${type} prints one page per sheet`, async ({ page }) => {
      await pickSkill(page, skill);
      const sheets = type === "practice" ? 2 : 1;
      if (!(await generate(page, { type, sheets }))) {
        test.skip(true, `${skill.id} has no ${type} option — the bank cannot fill it`);
      }
      const state = await page.evaluate(() => window.__larkitWorksheets);
      expect(state.skillId).toBe(skill.id);
      expect(state.problemType).toBe(type);
      for (const sheet of state.sheets) {
        expect(sheet.shortfall, "the sheet is full").toBe(0);
        expect(sheet.layout).toBe(type === "stories" ? "stories" : skill.layout);
        if (type === "practice") expect(sheet.wordProblems).toEqual([]);
        if (type === "stories") expect(sheet.items).toEqual([]);
        if (type !== "practice") expect(sheet.wordProblems.length).toBeGreaterThan(0);
      }
      const text = await printedText(page);
      expect(/\b(tap|drag|swipe)\b/i.test(text), "screen-interaction language on a printed sheet").toBe(false);
      expect(text, "the header names the skill, never a level").toContain(skill.title);
      expect(text).not.toMatch(/\bLevel \d|flight log/i);
      await expectOnePagePerSheet(page, sheets);
    });
  }
}

test("worksheets: the reported sheet — 3-digit subtraction is one format and every problem regroups", async ({ page }) => {
  await pickSkill(page, WORKSHEET_SKILLS.find((s) => s.id === "sub-3digit-regroup"));
  await generate(page, { type: "practice", sheets: 1 });
  const { sheets } = await page.evaluate(() => window.__larkitWorksheets);
  const borrows = (a, b) => {
    for (; b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) if (a % 10 < b % 10) return true;
    return false;
  };
  for (const q of sheets[0].items) {
    expect(q.a >= 100 && q.b >= 100, `${q.a} − ${q.b} is 3-digit − 3-digit`).toBe(true);
    expect(borrows(q.a, q.b), `${q.a} − ${q.b} regroups`).toBe(true);
  }
  // One layout: no `a − b = ☐` lines on a stacked sheet.
  expect(await printedText(page)).not.toMatch(/\d+ − \d+ =/);
});

test("worksheets: the PDF is named for the skill", async ({ page }) => {
  await pickSkill(page, WORKSHEET_SKILLS.find((s) => s.id === "mul-tables-7-8-9"));
  await generate(page);
  await expect(page).toHaveTitle(/Worksheet - Multiplication - Times tables: 7, 8 and 9 \(Grade 3\)/);
});

// Topics whose skills are not authored yet print through the bridge rows
// (legacySkills.js). These are the original #34 reports.
const BRIDGED = [
  // The reported overstuffed sheet: skip counting spilled onto a second page.
  { topic: "Skip Counting", band: "starting out", sheets: 2 },
  // The reported tap-language + true/false sheet.
  { topic: "Place Value", band: "stretching", sheets: 1 },
  // The reported missing-graphs sheet.
  { topic: "Graphs & Data", band: "building up", sheets: 1, expectFigures: true },
];

for (const { topic, band, sheets, expectFigures } of BRIDGED) {
  test(`worksheets: ${topic} (${band}) ×${sheets} prints one page per sheet`, async ({ page }) => {
    await page.goto("/worksheets");
    let found = false;
    for (const label of Object.values(GRADE_LABELS)) {
      await page.getByRole("button", { name: label, exact: true }).click();
      const row = page.getByRole("region", { name: topic, exact: true }).getByRole("radio", { name: new RegExp(`— ${band}`) });
      if (await row.count()) {
        await row.first().click();
        found = true;
        break;
      }
    }
    expect(found, `${topic} — ${band} is listed under some grade`).toBe(true);
    await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
    await generate(page, { type: "mixed", sheets });

    const text = await printedText(page);
    expect(/\b(tap|drag|swipe)\b/i.test(text), "screen-interaction language on a printed sheet").toBe(false);
    expect(text).not.toMatch(/\bLevel \d|flight log/i);
    if (expectFigures) {
      // A graph question without its graph is unanswerable on paper.
      expect(await page.locator("svg").count(), "graph sheets draw their figures").toBeGreaterThan(2);
    }
    await expectOnePagePerSheet(page, sheets);
  });
}
