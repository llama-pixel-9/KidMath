/**
 * Robot-kid smoke matrix: every mode × level band, one full 15-question
 * session in a real browser, answered through the real widgets.
 *
 * What each session asserts:
 *  - every question RENDERS something (text in the question card or a figure)
 *  - THE KID ORACLE: when the on-screen question is a pure symbolic claim,
 *    the robot computes the answer from the RENDERED DOM text — never from
 *    engine internals — submits it, and the app must score it correct. If
 *    the pixels say "19 + 14", the robot answers 33 like a kid would; an app
 *    that wanted 5 fails loudly. Also fails when the kid-computed answer
 *    isn't even among the choices.
 *  - for non-symbolic questions (word problems, figures), the engine's own
 *    answer through the widget must score correct — the plumbing check
 *  - the session completes (no crashes, no stuck states, retries included)
 *  - zero uncaught page errors and zero console.error calls
 *
 * Runs against the DEV server only (window.__kidmathQA hooks are stripped
 * from production builds). `?qaFeedbackMs=120` shortens feedback pauses.
 */

import { test, expect } from "@playwright/test";
import { requiredSatisfiers, figureSatisfies } from "../src/itemBank/figureContracts.js";
import { answerQuestion } from "./drivers.js";

const MODES = [
  "addition", "subtraction", "multiplication", "division", "comparing",
  "counting", "skipCounting", "placeValue", "fractions", "decimals",
  "numberBonds", "barModels", "placeValueDiscs", "factorsMultiples",
  "areaPerimeter", "money", "patterns", "measurement", "time",
  "dataGraphs", "angles", "linesShapes", "fractionOps", "decimalOps",
  "volumeCoordinates",
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

/**
 * The kid oracle: compute the answer the way a HUMAN would — from the
 * question as actually RENDERED on screen, never from engine internals.
 * Returns null when the on-screen question isn't a pure symbolic claim
 * (word problems, figures) — those fall back to the plumbing check.
 *
 * This is the net for the "19 + 14 → correct answer is 5" class: the engine's
 * answer scores correct by construction, but a kid computes from the pixels.
 * If the pixels say 19 + 14, the kid answers 33, and the app MUST agree.
 */
function kidOracle(domText, answerType) {
  // Collapse the rendered text (the vertical digit grid emits one span per
  // digit) and normalise the minus/multiply/divide glyphs.
  const s = domText
    .replace(/\s+/g, "")
    .replace(/[−–]/g, "-")
    .replace(/[×x]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[_■]/g, "?");
  if (/[A-Za-z]/.test(s)) return null; // words → not a pure symbolic claim

  const apply = (a, op, b) =>
    op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : b !== 0 ? a / b : null;

  // Complete claim, unknown result: "19+14=?" or the vertical grid "19+14?"
  let m = s.match(/^(\d+)([+\-*/])(\d+)(=\?|\?|=)?$/);
  if (m) return apply(Number(m[1]), m[2], Number(m[3]));

  // Unknown operand: "?+7=11" / "19-?=5"
  m = s.match(/^\?([+\-*/])(\d+)=(\d+)$/);
  if (m) {
    const [, op, b, c] = m;
    return op === "+" ? Number(c) - Number(b)
      : op === "-" ? Number(c) + Number(b)
      : op === "*" ? Number(c) / Number(b)
      : Number(c) * Number(b);
  }
  m = s.match(/^(\d+)([+\-*/])\?=(\d+)$/);
  if (m) {
    const [, a, op, c] = m;
    return op === "+" ? Number(c) - Number(a)
      : op === "-" ? Number(a) - Number(c)
      : op === "*" ? Number(c) / Number(a)
      : Number(a) / Number(c);
  }

  // Unknown operator: "5?3=8" → "+" or "-"
  m = s.match(/^(\d+)\?(\d+)=(\d+)$/);
  if (m) {
    const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (a + b === c) return "+";
    if (a - b === c) return "−";
    return null;
  }

  // Bare comparison "24?42" answered through the symbol picker.
  if (answerType === "symbolSelect") {
    m = s.match(/^(\d+)\?(\d+)$/);
    if (m) {
      const [a, b] = [Number(m[1]), Number(m[2])];
      return a < b ? "<" : a > b ? ">" : "=";
    }
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
              if (!s) return null;
              if (s.done) return JSON.parse(JSON.stringify(s));
              // Wait until the CURRENT question's card is in the DOM — the
              // exiting card (old question + revealed answer) hangs around
              // during the AnimatePresence transition and must never be read.
              const mounted =
                (s.seq || 0) > last &&
                document.querySelector(`[aria-label="Math question"][data-qa-seq="${s.seq}"]`);
              return mounted ? JSON.parse(JSON.stringify(s)) : null;
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
        const rendered = await page.evaluate((seq) => {
          const card = document.querySelector(`[aria-label="Math question"][data-qa-seq="${seq}"]`);
          const main = document.querySelector("main") || document.body;
          return {
            questionText: card ? card.innerText || "" : "",
            hasContent:
              (main.innerText || "").trim().length > 0 ||
              Boolean(main.querySelector("svg, img, canvas")),
            // scoped to the CARD: for contract-covered classes, prompt text
            // alone must NOT pass (the clock-incident hole).
            cardDrawsFigure: Boolean((card || main).querySelector("svg, img, canvas")),
          };
        }, qa.seq);
        if (!rendered.hasContent) problems.push(`nothing rendered for ${label}`);
        const neededFigure = requiredSatisfiers(mode, q, q.metadata);
        if (neededFigure) {
          if (!figureSatisfies(q, neededFigure)) {
            problems.push(`figure contract violated in payload for ${label}`);
          } else if (q.display?.figure && q.answerType !== q.display.figure && !rendered.cardDrawsFigure) {
            // Self-drawing answer widgets (answerType === figure, e.g.
            // barGraph) render the chart in the widget — getFigure suppresses
            // the card copy, so only card-drawn figures assert here.
            problems.push(`figure contract: nothing drawn for ${label}`);
          }
        }

        // 2. Answer like a KID: compute from the rendered pixels when the
        //    on-screen question is a pure symbolic claim; otherwise fall back
        //    to the engine's answer (which still verifies widget plumbing).
        const kidAnswer = kidOracle(rendered.questionText, q.answerType || "choice");
        const target = kidAnswer !== null ? kidAnswer : undefined;

        let outcome;
        try {
          outcome = await answerQuestion(page, q, target);
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
        if (outcome.missingFromChoices) {
          problems.push(
            outcome.wasOverride
              ? `the on-screen question computes to ${kidAnswer}, but that is not among the choices on ${label} — a kid cannot answer what they worked out`
              : `the engine's correct answer ${JSON.stringify(q.answer).slice(0, 40)} is not among the rendered choices on ${label} — no clickable option scores correct`
          );
        } else if (kidAnswer !== null && !result.correct) {
          problems.push(
            `KID answered ${kidAnswer} from the rendered question "${rendered.questionText.replace(/\s+/g, " ").trim()}" and was scored WRONG on ${label} (engine wanted ${JSON.stringify(q.answer).slice(0, 40)})`
          );
        } else if (kidAnswer === null && !outcome.blind && !result.correct) {
          problems.push(`widget plumbing: engine answer scored WRONG on ${label} (submitted ${JSON.stringify(result.submitted).slice(0, 60)})`);
        }
      }

      const done = await page.evaluate(() => Boolean(window.__kidmathQA?.done));
      if (!done) problems.push(`session never completed (answered ${answered})`);

      expect(problems, problems.join("\n")).toEqual([]);
      expect(pageErrors, pageErrors.join("\n")).toEqual([]);
    });
  }
}
