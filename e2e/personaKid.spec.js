/**
 * Persona kid runner: plays multi-session practice history for simulated kids
 * (struggling / okay / strong) through the REAL widgets, at a faked clock so
 * response times and session dates are realistic without the wall time.
 *
 *   QA_PLAN=qa-out/plan.json KIDMATH_E2E_PORT=5199 npx playwright test e2e/personaKid.spec.js
 *
 * plan.json: [{ kid, persona, grade, modes: [..], sessions, startLevel,
 *              account?: { email, password }, kidId?: uuid, days?: 28 }]
 * Output: qa-out/sessions/<kid>.json — ground truth for reconciling /report.
 */
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { answerQuestion } from "./drivers.js";
import { PERSONAS, rng, pCorrect, responseMs, wrongValue, scheduleSessions } from "./persona.js";

const plan = JSON.parse(readFileSync(process.env.QA_PLAN || "qa-out/plan.json", "utf8"));
const NOW = Number(process.env.QA_NOW || Date.now());
const IGNORED_CONSOLE = [/favicon/i, /\[vite\]/, /Download the React DevTools/, /Failed to load resource.*40[13]/];

test.describe.configure({ mode: "parallel" });

for (const kid of plan) {
  test(`${kid.kid} (${kid.persona}, grade ${kid.grade}) plays ${kid.modes.length} modes × ${kid.sessions}`, async ({ page }) => {
    test.setTimeout(20 * 60_000);
    const persona = PERSONAS[kid.persona];
    const rand = rng(kid.kid);
    const pageErrors = [];
    const failedRequests = [];
    page.on("response", async (r) => {
      if (r.status() >= 400 && !/favicon/.test(r.url())) {
        let body = ""; try { body = (await r.text()).slice(0, 300); } catch { body = "(unreadable)"; }
        failedRequests.push({ status: r.status(), method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, ""), body });
      }
    });
    page.on("pageerror", (e) => pageErrors.push(`pageerror: ${e.message}`));
    const warnings = [];
    page.on("console", (m) => {
      if (m.type() === "warning" && /fail|error/i.test(m.text())) warnings.push(m.text().slice(0, 300));
      if (m.type() === "error" && !IGNORED_CONSOLE.some((rx) => rx.test(m.text()))) pageErrors.push(`console.error: ${m.text().slice(0, 200)}`);
    });

    // Fake ONLY Date (response times + session timestamps). Playwright's
    // page.clock also fakes timers/rAF and freezes the feedback transitions.
    await page.addInitScript(() => {
      const RealDate = Date;
      const offset = () => Number(localStorage.getItem("qa-clock-offset") || 0);
      class QaDate extends RealDate {
        constructor(...a) { if (a.length === 0) super(RealDate.now() + offset()); else super(...a); }
        static now() { return RealDate.now() + offset(); }
      }
      QaDate.parse = RealDate.parse; QaDate.UTC = RealDate.UTC;
      window.Date = QaDate;
      window.__qaAdvance = (ms) => localStorage.setItem("qa-clock-offset", String(offset() + ms));
    });
    const setClock = (t) => page.evaluate((when) => localStorage.setItem("qa-clock-offset", String(when - Date.now() + Number(localStorage.getItem("qa-clock-offset") || 0))), t);
    const advance = (ms) => page.evaluate((n) => window.__qaAdvance(n), ms);
    // Sign in (household kids) — the app's own client, no UI.
    await page.goto("/");
    if (kid.account) {
      const r = await page.evaluate(async ({ email, password }) => {
        const { supabase } = await import("/src/supabaseClient.js");
        const res = await supabase.auth.signInWithPassword({ email, password });
        return res.error ? res.error.message : "ok";
      }, kid.account);
      expect(r, "sign-in").toBe("ok");
    }
    await page.evaluate(({ kidId, level, modes, grade }) => {
      if (kidId) localStorage.setItem("kidmath-active-kid", kidId);
      if (kidId && grade) localStorage.setItem("kidmath-active-kid-grade", grade);
      localStorage.setItem("kidmath-allow-word-problems", "true");
      if (kidId) localStorage.setItem("kidmath-progress-migrated", kidId);
      if (level === "grade") return; // let the app seed from the grade (src/gradeSeed.js)
      const key = kidId ? `kidmath-progress:${kidId}` : "kidmath-progress";
      const store = {};
      for (const m of modes) store[m] = { level, mistakeBank: [], totalSessions: 0, lifetimeStars: 0, bankItemStats: {}, recentBankItemIds: [] };
      localStorage.setItem(key, JSON.stringify(store));
    }, { kidId: kid.kidId || null, level: kid.startLevel || 1, modes: kid.modes, grade: kid.gradeLabel || null });
    // Seeded start level must also reach the cloud for household kids — the
    // first session save does that (read-modify-write), nothing to do here.

    const total = kid.sessions * kid.modes.length;
    const times = scheduleSessions(total, kid.days || 28, rand, NOW);
    const exposures = Object.fromEntries(kid.modes.map((m) => [m, 0]));
    const out = [];
    const problems = [];

    for (let s = 0; s < total; s++) {
      const mode = kid.modes[s % kid.modes.length];
      const startAt = times[s];
      await setClock(startAt);
      await page.goto(`/play/${mode}?qaFeedbackMs=120`);

      let lastSeq = 0, answered = 0;
      const attempts = [];
      const before = await page.evaluate(({ kidId, mode }) => {
        const key = kidId ? `kidmath-progress:${kidId}` : "kidmath-progress";
        try { return JSON.parse(localStorage.getItem(key) || "{}")[mode]?.level ?? null; } catch { return null; }
      }, { kidId: kid.kidId || null, mode });
      let levelStart = before, levelEnd = before;
      for (let i = 0; i < 60; i++) {
        const qa = await page.waitForFunction((last) => {
          const st = window.__kidmathQA;
          if (!st) return null;
          if (st.done) return JSON.parse(JSON.stringify(st));
          const mounted = (st.seq || 0) > last && document.querySelector(`[aria-label="Math question"][data-qa-seq="${st.seq}"]`);
          return mounted ? JSON.parse(JSON.stringify(st)) : null;
        }, lastSeq, { timeout: 25_000 }).then((h) => h.jsonValue());
        if (qa.done) break;
        lastSeq = qa.seq;
        const q = qa.question;
        const level = Number(q.metadata?.level ?? levelEnd ?? kid.startLevel ?? 1);
        const p = pCorrect(persona, { exposures: exposures[mode], level, isRetry: qa.isRetry });
        const wantCorrect = rand() < p;
        const ms = responseMs(persona, rand, { correct: wantCorrect });
        await advance(ms);
        let outcome;
        try {
          outcome = await answerQuestion(page, q, wantCorrect ? undefined : wrongValue(q, rand));
        } catch (e) {
          problems.push(`driver failed ${mode} q${qa.seq}: ${String(e).slice(0, 120)}`);
          break;
        }
        answered += 1;
        const result = await page.waitForFunction((n) => ((window.__kidmathQA?.result?.count || 0) >= n ? window.__kidmathQA.result : null), answered, { timeout: 15_000 }).then((h) => h.jsonValue());
        if (outcome.missingFromChoices && wantCorrect) problems.push(`correct answer not among choices: ${mode} "${String(q.display?.promptText || "").slice(0, 60)}"`);
        if (wantCorrect && !outcome.blind && !result.correct) problems.push(`aimed correct, scored wrong: ${mode} [${q.answerType}] "${String(q.display?.promptText || "").slice(0, 60)}"`);
        attempts.push({ seq: qa.seq, retry: Boolean(qa.isRetry), level, wantCorrect, correct: Boolean(result.correct), ms, subskill: q.metadata?.subskill, prompt: String(q.display?.promptText || "").slice(0, 80) });
        if (!qa.isRetry) exposures[mode] += 1;
        // let feedback + transition elapse on the fake clock
        await advance(2500);
      }
      const done = await page.evaluate(() => Boolean(window.__kidmathQA?.done));
      if (!done) problems.push(`${mode} session ${s} never completed (${answered} answered)`);
      await advance(3000); await page.waitForTimeout(400); // flight report / persist
      const saved = await page.evaluate(({ kidId, mode }) => {
        const key = kidId ? `kidmath-progress:${kidId}` : "kidmath-progress";
        try { return JSON.parse(localStorage.getItem(key) || "{}")[mode] || null; } catch { return null; }
      }, { kidId: kid.kidId || null, mode });
      if (saved?.level) levelEnd = saved.level;
      const firstTry = attempts.filter((a) => !a.retry);
      out.push({ kid: kid.kid, persona: kid.persona, mode, index: s, startedAt: startAt, levelStart, levelEnd, savedLevel: saved?.level ?? null, lifetimeStars: saved?.lifetimeStars ?? null,
        questions: firstTry.length, firstTryCorrect: firstTry.filter((a) => a.correct).length,
        retries: attempts.filter((a) => a.retry).length, retriesMastered: attempts.filter((a) => a.retry && a.correct).length,
        activeMs: attempts.reduce((n, a) => n + a.ms, 0), attempts, done });
      mkdirSync("qa-out/sessions", { recursive: true });
      writeFileSync(`qa-out/sessions/${kid.kid}.json`, JSON.stringify({ kid, sessions: out, problems, pageErrors, failedRequests, warnings }, null, 2));
    }
    // Keep this kid's device state so the report can be reviewed by hand later.
    const dump = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
    mkdirSync("qa-out/state", { recursive: true });
    writeFileSync(`qa-out/state/${kid.kid}.json`, JSON.stringify(dump));
    expect(problems, problems.join("\n")).toEqual([]);
    expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  });
}
