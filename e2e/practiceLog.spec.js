import { test, expect } from "@playwright/test";
import { answerQuestion } from "./drivers.js";

/**
 * The practice log (parent report): a finished session must leave exactly one
 * record in localStorage with every answered question inside it. Plays one
 * addition session with the engine's answers — the robot-kid matrix covers
 * rendering; this only proves the log is written.
 */
test("a finished session writes one practice-log record with its attempts", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidmath-progress",
      JSON.stringify({ addition: { level: 1, mistakeBank: [], totalSessions: 0, lifetimeStars: 0, bankItemStats: {}, recentBankItemIds: [] } })
    );
    localStorage.removeItem("kidmath-sessions");
    localStorage.removeItem("kidmath-active-kid");
  });
  await page.goto("/play/addition?qaFeedbackMs=120");

  let lastSeq = 0;
  let answered = 0;
  for (let i = 0; i < 60; i++) {
    const qa = await page
      .waitForFunction(
        (last) => {
          const s = window.__kidmathQA;
          if (!s) return null;
          if (s.done) return JSON.parse(JSON.stringify(s));
          const mounted =
            (s.seq || 0) > last && document.querySelector(`[aria-label="Math question"][data-qa-seq="${s.seq}"]`);
          return mounted ? JSON.parse(JSON.stringify(s)) : null;
        },
        lastSeq,
        { timeout: 25_000 }
      )
      .then((h) => h.jsonValue());
    if (qa.done) break;
    lastSeq = qa.seq;
    await answerQuestion(page, qa.question, undefined);
    answered += 1;
    await page.waitForFunction(
      (n) => (window.__kidmathQA?.result?.count || 0) >= n,
      answered,
      { timeout: 15_000 }
    );
  }

  // The record lands when finishSession settles, shortly after the QA `done` flag.
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kidmath-sessions") || "[]").length > 0, null, { timeout: 10_000 });
  const rows = await page.evaluate(() => JSON.parse(localStorage.getItem("kidmath-sessions") || "[]"));
  expect(rows).toHaveLength(1);
  const [rec] = rows;
  expect(rec.mode).toBe("addition");
  expect(rec.kind).toBe("normal");
  expect(rec.questions).toBe(15);
  expect(rec.attempts.length).toBeGreaterThanOrEqual(15);
  expect(rec.attempts.every((a) => a.prompt && typeof a.correct === "boolean" && a.ms >= 0)).toBe(true);
  expect(rec.firstTryCorrect).toBe(rec.attempts.filter((a) => !a.retry && a.correct).length);
  expect(rec.endedAt).toBeGreaterThan(rec.startedAt);
  expect(rec.durationMs).toBeGreaterThan(0);
  expect(rec.levelStart).toBe(1);
});
