/**
 * Robot-kid smoke matrix: every mode × level band, one full 15-question
 * session in a real browser, answered through the real widgets.
 *
 * What each session asserts:
 *  - every question RENDERS something (text in the question card or a figure)
 *  - answering the engine's own correct answer through the widget SCORES
 *    correct — catching display-vs-scoring mismatches ("19 + 14 → 5"),
 *    broken widget input plumbing, and choice sets missing their answer
 *  - symbolic prompts that state a complete claim ("a + b = ?") agree with
 *    the scored answer — the display-consistency oracle, computed from the
 *    rendered text, independent of the engine
 *  - the session completes (no crashes, no stuck states, retries included)
 *  - zero uncaught page errors and zero console.error calls
 *
 * Runs against the DEV server only (window.__kidmathQA hooks are stripped
 * from production builds). `?qaFeedbackMs=120` shortens feedback pauses.
 */

import { test, expect } from "@playwright/test";
import { answerQuestion } from "./drivers.js";

const MODES = [
  "addition", "subtraction", "multiplication", "division", "comparing",
  "counting", "skipCounting", "placeValue", "fractions", "decimals",
  "numberBonds", "barModels", "placeValueDiscs", "factorsMultiples",
  "areaPerimeter", "money", "patterns", "measurement", "time",
  "dataGraphs", "angles", "linesShapes",
];
const LEVELS = [1, 5];

// Console noise that is not an app defect (dev-server chatter, favicons).
const IGNORED_CONSOLE = [
  /favicon/i,
  /\[vite\]/,
  /Download the React DevTools/,
  // Anonymous dev sessions: Supabase auth/prefs endpoints 40x by design.
  /Failed to load resource.*40[13]/,
];

/** Independent display oracle: a prompt that states a complete symbolic
 *  claim must agree with the engine's answer. */
function displayOracle(question) {
  const prompt = String(question.display?.promptText ?? "").trim();
  const plain = prompt.match(/^(\d+)\s*([+−-])\s*(\d+)\s*=\s*\?$/);
  if (plain) {
    const [, a, op, b] = plain;
    return op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
  }
  const missing = prompt.match(/^\?\s*([+−-])\s*(\d+)\s*=\s*(\d+)$/) ||
    prompt.match(/^(\d+)\s*([+−-])\s*\?\s*=\s*(\d+)$/);
  if (missing) {
    // "? + b = c" → c − b · "a + ? = c" → c − a (and the − analogues)
    const nums = prompt.match(/\d+/g).map(Number);
    const op = prompt.includes("−") || prompt.includes("-") ? "−" : "+";
    const startsUnknown = prompt.startsWith("?");
    if (op === "+") return nums[1] - nums[0];
    return startsUnknown ? nums[1] + nums[0] : nums[0] - nums[1];
  }
  return null;
}

for (const mode of MODES) {
  for (const level of LEVELS) {
    test(`${mode} L${level}: robot kid plays a full session`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error" && !IGNORED_CONSOLE.some((rx) => rx.test(m.text()))) {
          pageErrors.push(`console.error: ${m.text().slice(0, 200)}`);
        }
      });

      await page.addInitScript(
        ([m, lv]) => {
          localStorage.setItem(
            "kidmath-progress",
            JSON.stringify({ [m]: { level: lv, mistakeBank: [], totalSessions: 0, lifetimeStars: 0, bankItemStats: {}, recentBankItemIds: [] } })
          );
          localStorage.setItem("kidmath-allow-word-problems", "true");
        },
        [mode, level]
      );

      await page.goto(`/play/${mode}?qaFeedbackMs=120`);

      const problems = [];
      let lastSeq = 0;
      let answered = 0;

      // 15 fresh questions + retries; 60 iterations is a generous ceiling.
      for (let i = 0; i < 60; i++) {
        const qa = await page
          .waitForFunction(
            (last) => {
              const s = window.__kidmathQA;
              return s && (s.done || (s.seq || 0) > last) ? JSON.parse(JSON.stringify(s)) : null;
            },
            lastSeq,
            { timeout: 25_000 }
          )
          .then((h) => h.jsonValue());
        if (qa.done) break;
        lastSeq = qa.seq;
        const q = qa.question;
        const label = `q${qa.seq}${qa.isRetry ? " (retry)" : ""} [${q.answerType || "choice"}] "${String(q.display?.promptText ?? "").slice(0, 60)}"`;

        // 1. Render check: the question must put SOMETHING in front of the kid.
        const hasContent = await page.evaluate(() => {
          const main = document.querySelector("main") || document.body;
          const text = (main.innerText || "").replace(/\s+/g, " ");
          return text.trim().length > 0 || Boolean(main.querySelector("svg, img, canvas"));
        });
        if (!hasContent) problems.push(`nothing rendered for ${label}`);

        // 2. Display oracle: a complete symbolic claim must match the answer.
        const oracle = displayOracle(q);
        if (oracle !== null && Number(q.answer) !== oracle) {
          problems.push(`display says ${oracle}, engine scores ${q.answer} for ${label}`);
        }

        // 3. Answer through the real widget; the engine must agree.
        let outcome;
        try {
          outcome = await answerQuestion(page, q);
        } catch (e) {
          problems.push(`driver failed on ${label}: ${String(e).slice(0, 150)}`);
          break;
        }
        answered += 1;
        const result = await page
          .waitForFunction(
            (n) => ((window.__kidmathQA?.result?.count || 0) >= n ? window.__kidmathQA.result : null),
            answered,
            { timeout: 15_000 }
          )
          .then((h) => h.jsonValue());
        if (!outcome.blind && !result.correct) {
          problems.push(`correct answer scored WRONG on ${label} (submitted ${JSON.stringify(result.submitted).slice(0, 60)})`);
        }
      }

      const done = await page.evaluate(() => Boolean(window.__kidmathQA?.done));
      if (!done) problems.push(`session never completed (answered ${answered})`);

      expect(problems, problems.join("\n")).toEqual([]);
      expect(pageErrors, pageErrors.join("\n")).toEqual([]);
    });
  }
}
