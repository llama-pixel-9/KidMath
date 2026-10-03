/**
 * workedStepGiveaway: the prompt prints a worked step that already holds the
 * answer, so the kid never does the step the item is about.
 *
 * Sai, 2026-10-02, on a live Addition item "Use compensation: 29 + 41 = 30 +
 * 40. Compute the value.": the prompt prints the easy sum, so the kid just adds
 * two tens. Its siblings printed the make-ten split ("45 + 7 = 45 + 5 + 2"),
 * both place-value partial sums ("30 + 20 = 50, and 5 + 5 = 10, so 35 + 25
 * equals?"), the fact a turn-around or a division comes from ("If 6 × 7 = 42,
 * then 7 × 6 = ?"), or the part a subtraction asks for ("16 is 8 + 8. Use that
 * to find 16 − 8."). Keep the strategy and make the kid do the step: "9 + 9 =
 * 18. What is 9 + 10?", "Make a ten: 8 + 5 = 10 + ?" pass.
 *
 * Fails when, for a numeric answer:
 *  - a complete, true equation (no blank on either side, at least one side an
 *    expression; "=", "equals", "is", "is the same as", "makes" or "as" joins
 *    the sides) has the answer among its numbers or as its value;
 *  - two or more printed facts have values that add up to the answer;
 *  - outside the question sentence, an expression has the answer as one of
 *    its numbers ("Think of 14 as 4 + 10. What is 14 − 4?").
 * A written fraction ("3/4") is one number, never a division. Sentences are
 * the ones the question card shows (promptSentences).
 */

import { promptSentences } from "../../promptLayout.js";
const TOKEN = /(\d+\/\d+)|(\d+(?:,\d{3})*(?:\.\d+)?)|(__+|□|\[\s*\]|\?)|([+\-−×*÷/])|([()])|(=)|([A-Za-z]+)|(\S)/g;
const EQ_WORDS = new Set(["equals", "is", "makes", "as"]);

function tokens(s) {
  const out = [];
  // A spaced slash separates rows of a printed chart ("4 8 12 / 16 20 24"); it
  // is never a division in a K-5 prompt (that is ÷).
  for (const m of s.replace(/\s\/\s/g, " | ").matchAll(TOKEN)) {
    // A written fraction ("3/4") is one number, never a division.
    if (m[1]) out.push({ t: "frac", s: m[1] });
    else if (m[2]) out.push({ t: "num", v: Number(m[2].replace(/,/g, "")), s: m[2] });
    else if (m[3]) out.push({ t: "blank", s: m[3] });
    else if (m[4]) out.push({ t: "op", s: m[4] === "−" ? "-" : m[4] === "×" ? "*" : m[4] === "÷" ? "/" : m[4] });
    else if (m[5]) out.push({ t: "paren", s: m[5] });
    else if (m[6]) out.push({ t: "eq", s: "=" });
    else if (m[7]) {
      const w = m[7].toLowerCase();
      // "x" between numbers is a times sign
      if (w === "x") out.push({ t: "op", s: "*" });
      else out.push({ t: EQ_WORDS.has(w) ? "eqword" : "word", s: w });
    } else out.push({ t: "punct", s: m[8] });
  }
  // "is the same as" -> one eqword
  for (let i = 0; i + 3 < out.length; i++) {
    if (out[i].s === "is" && out[i + 1].s === "the" && out[i + 2].s === "same" && out[i + 3].s === "as") {
      out.splice(i, 4, { t: "eqword", s: "is the same as" });
    }
  }
  return out;
}

// Maximal runs of num/op/paren/blank: each run is one side of a possible equation.
function sides(toks) {
  const runs = [];
  let cur = null;
  toks.forEach((tk, i) => {
    if (tk.t === "num" || tk.t === "op" || tk.t === "paren" || tk.t === "blank") {
      if (!cur) cur = { start: i, toks: [] };
      cur.toks.push(tk);
    } else if (cur) {
      cur.end = i - 1;
      runs.push(cur);
      cur = null;
    }
  });
  if (cur) {
    cur.end = toks.length - 1;
    runs.push(cur);
  }
  for (const r of runs) {
    r.nums = r.toks.filter((t) => t.t === "num").map((t) => t.v);
    r.hasBlank = r.toks.some((t) => t.t === "blank");
    r.isExpr = r.nums.length >= 2 && r.toks.some((t) => t.t === "op");
    r.text = r.toks.map((t) => t.s).join(" ");
    r.value = r.hasBlank ? null : evalRun(r);
  }
  return runs;
}

function evalRun(r) {
  if (!r.isExpr) return r.nums.length === 1 && r.toks.length === 1 ? r.nums[0] : null;
  const src = r.toks.map((t) => (t.t === "num" ? String(t.v) : t.s)).join(" ");
  if (!/^[\d\s+\-*/().]+$/.test(src)) return null;
  try {
    const v = Function(`"use strict"; return (${src});`)();
    return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null;
  } catch {
    return null;
  }
}

const same = (a, b) => Math.abs(a - b) < 1e-9;

export function workedStepFinding(item) {
  const q = item?.question || {};
  const answer = typeof q.answer === "number" ? q.answer : null;
  if (answer == null) return null;
  const text = q.display?.promptText || "";
  if (!text) return null;
  const sentences = promptSentences(text);
  const lastIdx = sentences.length - 1;
  const factValues = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const isQuestion = i === lastIdx || /\?\s*$/.test(s);
    const toks = tokens(s);
    const runs = sides(toks);
    const usedInEquation = new Set();
    for (let k = 0; k + 1 < runs.length; k++) {
      const L = runs[k];
      const R = runs[k + 1];
      const between = toks.slice(L.end + 1, R.start);
      if (between.length !== 1 || (between[0].t !== "eq" && between[0].t !== "eqword")) continue;
      // "=" inside one run never happens (eq breaks runs), so this is "L = R".
      usedInEquation.add(k).add(k + 1);
      if (L.hasBlank || R.hasBlank) continue;
      if (!L.isExpr && !R.isExpr) continue;
      // "What is 8 + 9?" / "is 5 + 3" — a word "is" before an expression in the
      // question sentence asks; it does not print a fact.
      if (between[0].t === "eqword" && between[0].s === "is" && isQuestion && !L.isExpr) continue;
      if (L.value == null || R.value == null || !same(L.value, R.value)) continue;
      const nums = [...L.nums, ...R.nums, L.value];
      if (nums.some((n) => same(n, answer))) {
        return { id: "workedStepGiveaway", severity: "fail", message: `the prompt prints "${L.text} = ${R.text}", which holds the answer ${answer}` };
      }
      factValues.push(L.value);
    }
    if (!isQuestion) {
      for (let k = 0; k < runs.length; k++) {
        const r = runs[k];
        if (!r.isExpr || r.hasBlank) continue;
        if (r.nums.some((n) => same(n, answer))) {
          return { id: "workedStepGiveaway", severity: "fail", message: `the prompt prints "${r.text}" outside the question, and it holds the answer ${answer}` };
        }
      }
    }
  }
  if (factValues.length >= 2 && same(factValues.reduce((a, b) => a + b, 0), answer)) {
    return { id: "workedStepGiveaway", severity: "fail", message: `the prompt prints partial results (${factValues.join(", ")}) that add up to the answer ${answer}` };
  }
  return null;
}
