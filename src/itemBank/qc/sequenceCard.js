/**
 * The sequence card.
 *
 * Any question with `display.sequence` is drawn as a fixed card: "What comes
 * next?", the terms, and a blank at the end (QuestionDisplay.jsx on the web,
 * QuestionDisplayView.swift on iPhone). The prompt text is NOT shown. So a
 * sequence item is honest only when its answer is the next term the kid can
 * work out from the terms alone.
 *
 * On 2026-10-02 the drill sweep found 1,082 patterns items drawn this way whose
 * real question was something else ("Is Theo right?", "Which rule makes this
 * pattern?", "Which number is wrong?", a gap in the middle, a two-term run
 * whose rule ("doubles") lived only in the prompt). Their terms moved to
 * `display.terms`, which nothing draws, so the kid reads the prompt instead.
 * This check keeps it that way.
 */

const close = (a, b) => Math.abs(a - b) < 1e-9;

/** The term that follows `seq`, or null when the terms alone do not decide it. */
export function sequenceNextTerm(seq, step) {
  if (!Array.isArray(seq) || seq.length < 2) return null;
  if (seq.some((t) => t === "?" || t == null)) return null;
  if (seq.every((t) => typeof t === "number" && Number.isFinite(t))) {
    const n = seq.length;
    const d = seq[n - 1] - seq[n - 2];
    const arithmetic = seq.every((t, i) => i === 0 || close(t - seq[i - 1], d));
    if (n === 2) {
      // Two terms decide nothing on their own ("3, 6": add 3 or double?),
      // unless the item carries the step and the terms agree with it.
      return typeof step === "number" && close(d, step) ? round(seq[1] + step) : null;
    }
    if (arithmetic && d !== 0) return round(seq[n - 1] + d);
    if (seq.every((t) => t !== 0)) {
      const r = seq[n - 1] / seq[n - 2];
      if (seq.every((t, i) => i === 0 || close(t / seq[i - 1], r))) return round(seq[n - 1] * r);
    }
    return null;
  }
  // A repeating pattern (words or shapes): the shortest period that repeats.
  for (let p = 1; p < seq.length; p++) {
    if (seq.every((t, i) => i < p || t === seq[i - p])) return seq[seq.length - p];
  }
  return null;
}

function round(v) {
  return Math.round(v * 1e6) / 1e6;
}

/** A sequence card whose answer is not the next term: the kid sees the wrong question. */
export function sequenceCardFinding(item) {
  const q = item?.question || {};
  const seq = q.display?.sequence;
  if (!Array.isArray(seq)) return null;
  const next = sequenceNextTerm(seq, q.display?.step);
  const answer = q.answer;
  const fits =
    next != null &&
    (typeof next === "number"
      ? Number(answer) === Number(answer) && answer !== "" && close(Number(answer), next)
      : String(answer).toLowerCase() === String(next).toLowerCase());
  if (fits) return null;
  return {
    id: "sequenceCardMismatch",
    severity: "fail",
    message:
      next == null
        ? `display.sequence draws "What comes next?" + ${seq.join(", ")}, __ but the terms alone do not decide the next term (the prompt is not shown); move the terms to display.terms`
        : `display.sequence draws "What comes next?" (next is ${next}) but the answer is ${JSON.stringify(answer)}; the prompt is not shown, so move the terms to display.terms`,
  };
}
