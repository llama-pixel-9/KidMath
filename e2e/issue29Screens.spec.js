/**
 * Issue #29 regression: force each affected counting shape via ?qaVariety=
 * and check the fixes hold — the submit key always reads "Go" (never the
 * typed entry, never an "(N added)" count), and emoji-run prompts lay out as
 * rows of at most ten. Screenshots land in test-results/issue29/ for eyes.
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
];

for (const { variety, level } of TARGETS) {
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
      const prompt = qa.question?.display?.promptText || "";
      const isTenFrame = qa.question?.answerType === "tenFrame";
      const hasRun = /\p{Extended_Pictographic}{2,}/u.test(prompt);
      if (isTenFrame || hasRun) {
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
