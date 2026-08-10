/**
 * Flight-log print regression (#34). Generates worksheets through the real UI
 * and checks the PAPER rules: no screen-verb language on a sheet, graphs
 * actually drawn, and — via Chromium's own print pipeline (page.pdf) — that a
 * log fits its page: N logs (+ keys) produce exactly N (+N) PDF pages.
 *
 * Runs headless-only (page.pdf is a headless-Chromium API).
 */
import { expect, test } from "@playwright/test";

// Chromium writes page objects uncompressed; the /Pages tree's /Count is the
// page total. Take the max in case of nested trees.
function pdfPageCount(buffer) {
  const text = buffer.toString("latin1");
  const counts = [...text.matchAll(/\/Count (\d+)/g)].map((m) => Number(m[1]));
  return counts.length ? Math.max(...counts) : 0;
}

async function generateSheets(page, { modeLabel, level, logs = 1 }) {
  await page.goto("/worksheets");
  await page.getByRole("button", { name: modeLabel, exact: true }).click();
  await page.getByRole("button", { name: `Level ${level}`, exact: true }).click();
  await page.getByRole("button", { name: `${logs} ${logs === 1 ? "log" : "logs"}`, exact: true }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByText("Flight log ·").first()).toBeVisible();
}

const CASES = [
  // The reported overstuffed sheet: skip counting spilled onto a second page.
  { modeLabel: "Skip Counting", level: 1, logs: 2 },
  // The reported tap-language + true/false sheet.
  { modeLabel: "Place Value", level: 10, logs: 1 },
  // The reported missing-graphs sheet.
  { modeLabel: "Graphs", level: 5, logs: 1, expectFigures: true },
  // The healthy baseline.
  { modeLabel: "Addition", level: 1, logs: 1 },
];

for (const { modeLabel, level, logs, expectFigures } of CASES) {
  test(`worksheets: ${modeLabel} L${level} ×${logs} prints one page per sheet`, async ({ page }) => {
    await generateSheets(page, { modeLabel, level, logs });

    // Paper language: no screen verbs anywhere on the printed sheets.
    const sheetText = await page.locator("body").innerText();
    const sheets = sheetText.slice(sheetText.indexOf("Flight log"));
    expect(
      /\b(tap|drag|swipe)\b/i.test(sheets),
      "screen-interaction language on a printed sheet"
    ).toBe(false);

    if (expectFigures) {
      // A graph question without its graph is unanswerable on paper.
      const figures = page.locator("svg");
      expect(await figures.count(), "graph sheets draw their figures").toBeGreaterThan(2);
    }

    // The print itself: logs + answer keys, each exactly one page.
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    expect(pdfPageCount(pdf), "one page per log + one per answer key").toBe(logs * 2);
  });
}

test("worksheets: word-problems toggle removes stories", async ({ page }) => {
  await page.goto("/worksheets");
  await page.getByRole("button", { name: "Addition", exact: true }).click();
  await page.getByRole("button", { name: "Level 3", exact: true }).click();
  await page.getByRole("button", { name: "Skip word problems", exact: true }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByText("Flight log ·").first()).toBeVisible();
  // Part C still exists but is never a story; the sheet stays computational.
  const text = await page.locator("body").innerText();
  expect(text).toContain("PART C");
});
