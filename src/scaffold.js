/**
 * Scaffolds for the second chance (kid-sim fix plan, PR D).
 *
 * On a first miss the app used to reveal the answer and move on. With the
 * second chance on, it shows a MODEL of the question instead and lets the kid
 * try once more. This module decides, purely from the question's numbers,
 * which model fits:
 *
 *   dots      — two groups of dots (addition / subtraction to 20)
 *   array     — rows × columns (multiplication / division to 12 × 12)
 *   strip     — a fraction strip (denominator ≤ 12)
 *   numberLine— a 0…max line with the start marked (count on / back to 30)
 *   look      — nothing derivable: a "look again" nudge only
 *
 * Pure and dependency-free so it is unit-testable and bundleable for iOS.
 */

const MAX_DOTS = 20;
const MAX_ARRAY = 12;
const MAX_STRIP = 12;
const MAX_LINE = 30;

function num(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function parseFraction(v) {
  if (v && typeof v === "object" && "num" in v && "den" in v) return { num: Number(v.num), den: Number(v.den) };
  const m = String(v ?? "").match(/^(\d+)\s*\/\s*(\d+)$/);
  return m ? { num: Number(m[1]), den: Number(m[2]) } : null;
}

export function scaffoldFor(question) {
  if (!question) return { kind: "look" };
  const mode = question.mode || question.metadata?.modeId || "";
  const a = num(question.a);
  const b = num(question.b);
  const op = question.op;

  if ((op === "+" || op === "-") && a != null && b != null && a >= 0 && b >= 0 && a <= MAX_DOTS && b <= MAX_DOTS) {
    return op === "+"
      ? { kind: "dots", groups: [a, b], label: `${a} and ${b} more` }
      : { kind: "dots", groups: [a], takeAway: b, label: `${a}, take away ${b}` };
  }

  if (op === "×" || op === "*") {
    if (a != null && b != null && a >= 1 && b >= 1 && a <= MAX_ARRAY && b <= MAX_ARRAY) {
      return { kind: "array", rows: a, cols: b, label: `${a} rows of ${b}` };
    }
  }
  if (op === "÷" || op === "/") {
    if (a != null && b != null && b >= 1 && b <= MAX_ARRAY && a / b <= MAX_ARRAY && Number.isInteger(a / b)) {
      return { kind: "array", rows: b, cols: a / b, label: `${a} shared into ${b} rows` };
    }
  }

  if (/fraction/i.test(mode) || /fraction/i.test(question.metadata?.subskill || "")) {
    const f = parseFraction(question.answer) || parseFraction(question.display?.fraction) || parseFraction(question.a);
    if (f && f.den >= 2 && f.den <= MAX_STRIP) {
      return { kind: "strip", den: f.den, shaded: Math.min(f.num, f.den), label: `a whole cut into ${f.den} equal parts` };
    }
  }

  if (/count/i.test(mode) && a != null && a >= 0 && a <= MAX_LINE) {
    const max = Math.min(MAX_LINE, Math.max(10, Math.ceil((a + (b ?? 5)) / 5) * 5));
    return { kind: "numberLine", min: 0, max, mark: a, label: `start at ${a}` };
  }

  return { kind: "look" };
}

/** One sentence the panel (and read-aloud) uses above the model. */
export function scaffoldHint(scaffold) {
  switch (scaffold?.kind) {
    case "dots":
      return scaffold.takeAway != null ? "Count them, then cross some out." : "Count all the dots together.";
    case "array":
      return "Count the rows, then count across.";
    case "strip":
      return "Each piece is one part of the whole.";
    case "numberLine":
      return "Start at the dot and hop along the line.";
    default:
      return "Look again — take your time.";
  }
}
