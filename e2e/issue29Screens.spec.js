/**
 * Counting regressions (#29, #32): force each affected shape via ?qaVariety=
 * and check the fixes hold — the submit key always reads "Go" (never the
 * typed entry, never an "(N added)" count), emoji-run prompts lay out as rows
 * of at most ten, unit-step sequences draw their number line, and format
 * transforms show their instruction ("Is this right?") instead of dropping
 * it. Screenshots land in test-results/issue29/ for eyes.
 */
import { expect, test } from "@playwright/test";
import { answerQuestion } from "./drivers.js";

const SHOTS_DIR = process.env.ISSUE29_SHOTS || "test-results/issue29";
const TARGETS = [
  { variety: "arrangementInvariance", level: 1 },
  { variety: "compareTwoSets", level: 1 },
  { variety: "estimateThenCount", level: 5 },
  { variety: "tenFrameCount", level: 1 },
  { variety: "tenFrameBuild", level: 1 },
  { variety: "countBackFrom", level: 1, expectSelector: 'svg[aria-label="Number line for the counting pattern"]' },
  { variety: "countOnFromGiven", level: 1, expectSelector: 'svg[aria-label="Number line for the counting pattern"]' },
  { variety: "countScatteredSet", level: 8 },
  { variety: "subitizeSmallSet", level: 1 },
];

for (const { variety, level, expectSelector } of TARGETS) {
  test(`issue29 screenshot: ${variety}`, async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 950 });
    await page.addInitScript(
      (lv) => {
        localStorage.setItem(
          "kidmath-progress",
          JSON.stringify({ counting: { level: lv, mistakeBank: [], totalSessions: 0, lifetimeStars: 0, bankItemStats: {}, recentBankItemIds: [] } })
        );
        localStorage.setItem("kidmath-allow-word-problems", "true");
      },
      level
    );
    await page.goto(`/play/counting?qaFeedbackMs=120&qaVariety=${variety}`);
    await page.waitForFunction(() => window.__kidmathQA?.question);

    // Formats can re-dress an item without its emoji run ("20 = 20") — advance
    // until the served question carries the shape under test.
    for (let i = 0; i < 15; i += 1) {
      const qa = await page.evaluate(() => window.__kidmathQA);
      const seq = qa.seq;
      await page
        .locator(`[aria-label="Math question"][data-qa-seq="${seq}"]`)
        .waitFor({ state: "attached" });
      const d = qa.question?.display || {};
      const isTenFrame = qa.question?.answerType === "tenFrame";
      const matched = variety.startsWith("tenFrame")
        ? isTenFrame
        : variety === "countBackFrom"
          ? Array.isArray(d.sequence)
          : variety === "countOnFromGiven"
            ? Boolean(d.numberLine)
          : variety === "countScatteredSet" || variety === "subitizeSmallSet"
            ? Boolean(d.emoji)
            : /\p{Extended_Pictographic}{2,}/u.test(d.promptText || "");
      if (matched) {
        if (variety === "tenFrameBuild") {
          const cells = page.getByRole("button", { name: "empty cell" });
          const n = Math.min(3, await cells.count());
          for (let c = 0; c < n; c += 1) await cells.nth(c).click();
        }
        if (variety === "tenFrameCount") {
          await page.getByRole("button", { name: "1", exact: true }).first().click();
        }
        if (isTenFrame) {
          // The bug: the submit key echoed the typed entry / the added count.
          const submit = page.getByRole("button", { name: "Submit answer" }).first();
          await expect(submit).toHaveText("Go");
        }
        if (expectSelector) {
          await expect(page.locator(expectSelector).first()).toBeVisible();
        }
        await page.screenshot({ path: `${SHOTS_DIR}/${variety}.png` });
        return;
      }
      await answerQuestion(page, qa.question);
      await page.waitForFunction(
        (prev) => window.__kidmathQA?.seq !== prev || window.__kidmathQA?.done,
        seq
      );
    }
    throw new Error(`never saw target shape for ${variety}`);
  });
}

// #32: format transforms carry their instruction in display.subPrompt, and the
// renderer used to drop it — a kid saw a bare "8 = 9" with two unexplained
// buttons. Whenever a served question declares a subPrompt, that text must be
// visible in the question card.
test("issue32: format instructions render", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidmath-progress",
      JSON.stringify({ counting: { level: 1, mistakeBank: [], totalSessions: 0, lifetimeStars: 0, bankItemStats: {}, recentBankItemIds: [] } })
    );
    localStorage.setItem("kidmath-allow-word-problems", "true");
  });
  let seen = 0;
  for (let round = 0; round < 4 && seen === 0; round += 1) {
    await page.goto("/play/counting?qaFeedbackMs=120&qaVariety=countOnFromGiven");
    await page.waitForFunction(() => window.__kidmathQA?.question);
    for (let i = 0; i < 16; i += 1) {
      const qa = await page.evaluate(() => window.__kidmathQA);
      if (!qa?.question || qa.done) break;
      const seq = qa.seq;
      const card = page.locator(`[aria-label="Math question"][data-qa-seq="${seq}"]`);
      await card.waitFor({ state: "attached" });
      const sub = qa.question?.display?.subPrompt;
      if (sub) {
        await expect(card).toContainText(sub);
        seen += 1;
      }
      await answerQuestion(page, qa.question);
      await page.waitForFunction(
        (prev) => window.__kidmathQA?.seq !== prev || window.__kidmathQA?.done,
        seq
      );
    }
  }
  expect(seen, "no format-transformed question with a subPrompt was ever served").toBeGreaterThan(0);
});
