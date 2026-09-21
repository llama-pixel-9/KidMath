/**
 * Play by skill (flagged: ?gam=skillsPlay). `/play/<mode>?skill=<id>` pins one
 * catalog skill; `?mix=1` is "Larkit picks" across the kid's grade for the
 * topic. Reads the engine's own question through the DEV QA hook — the same
 * one the robot kid uses — and answers through the real widgets.
 */
import { expect, test } from "@playwright/test";
import { answerQuestion } from "./drivers.js";

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

// ── the kid flow: topic sheet → session → end card ─────────────────────────

const seedKid = (page, { grade = "3rd", progress = {}, sessions = [] } = {}) =>
  page.addInitScript(
    ([g, p, s]) => {
      if (localStorage.getItem("seeded")) return;
      localStorage.setItem("seeded", "1");
      localStorage.setItem("kidmath-gam-flags", "skillsPlay");
      localStorage.setItem("kidmath-active-kid-grade", g);
      localStorage.setItem("kidmath-progress", JSON.stringify(p));
      localStorage.setItem("kidmath-sessions", JSON.stringify(s));
    },
    [grade, progress, sessions]
  );

const practiced = (skillId, marks, daysAgo, mode = "subtraction") => {
  const at = Date.now() - daysAgo * 86400000;
  return {
    id: `s-${skillId}-${daysAgo}`, kidId: null, mode, kind: "normal", levelStart: 9, levelEnd: 9, startedAt: at, endedAt: at + 300000,
    durationMs: 300000, activeMs: 200000, questions: marks.length, firstTryCorrect: marks.length, retriesMastered: 0, starsEarned: 5,
    attempts: marks.split("").map((m, i) => ({ t: at + i, prompt: `p${i}`, answer: "1", given: "1", correct: m === "1", retry: false, ms: 4000, level: 9, subskill: "x", family: "procedural", itemId: null, hint: false, skillId })),
  };
};

test("a topic opens on its sheet: Larkit picks + the grade's skills, no levels anywhere", async ({ page }) => {
  await seedKid(page, {
    progress: { subtraction: { level: 9, mistakeBank: [], totalSessions: 3, lifetimeStars: 12, bankItemStats: {}, recentBankItemIds: [] } },
    sessions: [practiced("sub-3digit-regroup", "11111", 4), practiced("sub-3digit-regroup", "1111", 2), practiced("sub-across-zeros", "10110", 1)],
  });
  await page.goto("/play/subtraction");
  await expect(page.getByRole("heading", { name: "Subtraction" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Practice — Larkit picks/ })).toBeVisible();
  // Work done before skills existed is credited from the practice log.
  await expect(page.getByRole("button", { name: "Subtract 3-digit numbers with regrouping — mastered" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Subtract across zeros — 3 of 8" })).toBeVisible();
  await expect(page.getByText("1 of 3 Grade 3 skills mastered")).toBeVisible();
  // Earlier grades are open; later ones are earned.
  await expect(page.getByRole("button", { name: "Grade 2", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Grade 4", exact: true })).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(/\bLevel\b|\bLv\b/);
  // The lazy migration wrote the grade down — and left the level alone.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("kidmath-progress")).subtraction)).toMatchObject({ level: 9, grade: "3" });
});

test("Larkit picks plays the grade's skills, and the end card says where the kid now stands", async ({ page }) => {
  await seedKid(page, {
    progress: { subtraction: { level: 9, mistakeBank: [], totalSessions: 3, lifetimeStars: 12, bankItemStats: {}, recentBankItemIds: [] } },
    sessions: [practiced("sub-across-zeros", "11111", 2)],
  });
  await page.goto("/play/subtraction");
  await page.getByRole("button", { name: /^Subtract across zeros/ }).click();
  await expect(page).toHaveURL(/skill=sub-across-zeros/);
  let seq = 0;
  for (let i = 0; i < 15; i += 1) {
    const next = await nextQuestion(page, seq);
    seq = next.seq;
    expect(next.q.skillId).toBe("sub-across-zeros");
    if (i === 0) await expect(page.getByText("Subtract across zeros", { exact: true })).toBeVisible(); // named under the topic, not "Lv."
    // The robot kid's own driver: choices for small answers, the number pad
    // (typed) for three-digit ones.
    await answerQuestion(page, next.q);
  }
  await page.waitForFunction(() => window.__kidmathQA?.done === true, null, { timeout: 20000 });
  // Second session, all right → mastered: the end card says so, in skills.
  await expect(page.getByText(/Skill mastered:/)).toBeVisible();
  await expect(page.getByText(/Grade 3 · 1 of 3 skills mastered/)).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kidmath-progress")).subtraction);
  expect(saved.level).toBe(9);
  expect(saved.skillMastery["sub-across-zeros"].state).toBe("mastered");
});

// ── moving up a grade is earned ────────────────────────────────────────────

const masteredLog = (ids) => ids.flatMap((id, i) => [practiced(id, "11111", 9 + i), practiced(id, "11111", 3 + i)]);
const GRADE3_SUBTRACTION = ["sub-3digit-regroup", "sub-across-zeros", "sub-missing-number-1000"];

test("every skill mastered → the challenge is offered; five of six opens the next grade, with no stars", async ({ page }) => {
  await seedKid(page, {
    progress: { subtraction: { level: 9, mistakeBank: [], totalSessions: 6, lifetimeStars: 30, bankItemStats: {}, recentBankItemIds: [], grade: "3" } },
    sessions: masteredLog(GRADE3_SUBTRACTION),
  });
  await page.goto("/play/subtraction");
  await expect(page.getByText("Every Grade 3 skill mastered!")).toBeVisible();
  await page.getByRole("button", { name: "Take the Grade 4 challenge" }).click();
  await expect(page).toHaveURL(/challenge=1/);

  let seq = 0;
  const asked = [];
  for (let i = 0; i < 6; i += 1) {
    const next = await nextQuestion(page, seq);
    seq = next.seq;
    asked.push(next.q.skillId);
    if (i === 0) await expect(page.getByText("Grade 3 challenge")).toBeVisible();
    await answerQuestion(page, next.q);
  }
  // Six questions, spread across the grade's skills.
  expect(new Set(asked)).toEqual(new Set(GRADE3_SUBTRACTION));
  await page.waitForFunction(() => window.__kidmathQA?.done === true, null, { timeout: 20000 });
  await expect(page.getByText("You finished Grade 3 Subtraction!")).toBeVisible();
  await expect(page.getByText("Grade 4 is open.")).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kidmath-progress")).subtraction);
  expect(saved).toMatchObject({ grade: "4", gradeUnlocked: "4", level: 9, lifetimeStars: 30 });
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("kidmath-sessions")));
  expect(log.at(-1)).toMatchObject({ kind: "fledging", starsEarned: 0 });

  // Back on the sheet: Grade 4 is the focus now, Grade 3 still open below it.
  await page.goto("/play/subtraction");
  await expect(page.getByText("0 of 1 Grade 4 skills mastered")).toBeVisible();
  await expect(page.getByRole("button", { name: "Grade 3", exact: true })).toBeVisible();
});

test("the challenge cannot be reached by URL alone", async ({ page }) => {
  await seedKid(page, { progress: { subtraction: { level: 9, mistakeBank: [], totalSessions: 2, lifetimeStars: 0, bankItemStats: {}, recentBankItemIds: [], grade: "3" } } });
  await page.goto("/play/subtraction?challenge=1&qaFeedbackMs=120");
  const { q } = await nextQuestion(page, 0);
  expect(q.skillId, "not earned → an ordinary ladder session, no challenge").toBeUndefined();
});

test("a grown-up can open a grade and pin a skill; the pin becomes what Practice plays", async ({ page }) => {
  await seedKid(page, {
    grade: "2nd",
    progress: { multiplication: { level: 2, mistakeBank: [], totalSessions: 2, lifetimeStars: 8, bankItemStats: {}, recentBankItemIds: [] } },
    sessions: [practiced("mul-tables-2-5-10", "1101", 1, "multiplication")],
  });
  await page.goto("/");
  await page.getByText("For grown-ups").first().click();
  await page.getByLabel("Open a grade for Multiply").selectOption("4");
  await page.getByLabel("Pin a skill for Multiply").selectOption("mul-2digit-by-1digit");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("kidmath-progress")).multiplication))
    .toMatchObject({ gradeUnlocked: "4", pinnedSkillId: "mul-2digit-by-1digit", level: 2 });

  await page.goto("/play/multiplication");
  await expect(page.getByRole("button", { name: /Practice — Multiply a 2-digit number by a 1-digit number/ })).toBeVisible();
  await expect(page.getByText("Picked by a grown-up.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Grade 4", exact: true })).toBeVisible();
});
