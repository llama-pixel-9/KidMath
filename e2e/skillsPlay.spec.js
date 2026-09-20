/**
 * Play by skill (flagged: ?gam=skillsPlay). `/play/<mode>?skill=<id>` pins one
 * catalog skill; `?mix=1` is "Larkit picks" across the kid's grade for the
 * topic. Reads the engine's own question through the DEV QA hook — the same
 * one the robot kid uses — and answers through the real widgets.
 */
import { expect, test } from "@playwright/test";

const question = (page) => page.evaluate(() => window.__kidmathQA?.question || null);

async function nextQuestion(page, afterSeq) {
  await page.waitForFunction((seq) => (window.__kidmathQA?.seq || 0) > seq, afterSeq, { timeout: 20000 });
  return page.evaluate(() => ({ seq: window.__kidmathQA.seq, q: window.__kidmathQA.question }));
}

test("a pinned drill serves only its skill — and practicing below your level never moves it", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kidmath-progress", JSON.stringify({
      subtraction: { level: 9, mistakeBank: [], totalSessions: 3, lifetimeStars: 0, bankItemStats: {}, recentBankItemIds: [] },
    }));
  });
  await page.goto("/play/subtraction?skill=sub-2digit-no-regroup&gam=skillsPlay&qaFeedbackMs=120");
  let seq = 0;
  // A whole session, so the end-of-session save really runs.
  for (let i = 0; i < 15; i += 1) {
    const next = await nextQuestion(page, seq);
    seq = next.seq;
    const q = next.q;
    expect(q.skillId).toBe("sub-2digit-no-regroup");
    expect(q.a >= 10 && q.a <= 99 && q.b >= 10 && q.b <= 99, `${q.a} − ${q.b}`).toBe(true);
    await page.getByRole("button", { name: String(q.answer), exact: true }).first().click();
  }
  await page.waitForFunction(() => window.__kidmathQA?.done === true, null, { timeout: 20000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kidmath-progress")).subtraction);
  expect(saved.totalSessions, "the session was saved").toBe(4);
  expect(saved.level, "a grade-2 skill played by a level-9 kid leaves the level alone").toBe(9);
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("kidmath-sessions")));
  expect(log.at(-1)).toMatchObject({ sessionKind: "skill", skillId: "sub-2digit-no-regroup", grade: "2", levelEnd: 9 });
  expect(log.at(-1).attempts.every((a) => a.skillId === "sub-2digit-no-regroup")).toBe(true);
});

test("a pinned bank skill draws from its own cell once the topic is loaded", async ({ page }) => {
  await page.goto("/play/time?skill=time-read-clock-4&gam=skillsPlay&qaFeedbackMs=120");
  const { q } = await nextQuestion(page, 0);
  expect(q.skillId).toBe("time-read-clock-4");
  expect(q.metadata.itemSource).toBe("bank");
  expect(q.metadata.subskill).toBe("readClock");
});

test("Larkit picks: a mixed session for the kid's grade serves that grade's skills", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kidmath-active-kid-grade", "3rd"));
  await page.goto("/play/multiplication?mix=1&gam=skillsPlay&qaFeedbackMs=120");
  const { q } = await nextQuestion(page, 0);
  expect(q.skillId).toMatch(/^mul-/);
  expect(await question(page)).toBeTruthy();
});

test("without the flag, ?skill= is ignored and play is the ladder it always was", async ({ page }) => {
  await page.goto("/play/subtraction?skill=sub-2digit-no-regroup&qaFeedbackMs=120");
  const { q } = await nextQuestion(page, 0);
  expect(q.skillId).toBeUndefined();
});
