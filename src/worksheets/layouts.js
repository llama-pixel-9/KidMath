/* Sheet layouts and their page-fit budgets. Pure data.
 *
 * One sheet = one layout: a parent should never see problems 1–12 stacked and
 * 13–18 sideways. `practice` is how many problems fill one US Letter page;
 * `mixed` leaves room for the word problems underneath. The numbers are
 * MEASURED, not guessed — e2e/worksheets.spec.js prints every layout through
 * Chromium and pins each sheet to exactly one page. If a layout change makes a
 * sheet spill, shrink the budget here; never delete that assertion.
 */

// `workSpace` is the blank room under each problem for the child's own
// writing; `rowGap` the space between rows. Both are part of the measured fit:
// a sheet should FILL its page — not spill, and not strand the bottom third.
export const LAYOUTS = {
  // Column arithmetic: up to 3-digit ±, n-digit × 1-digit.
  stacked: { columns: 4, practice: 24, mixed: 16, rowGap: 18, workSpace: 60 },
  // Room underneath for partial products / a fourth column of digits.
  stackedWide: { columns: 3, practice: 12, mixed: 9, rowGap: 18, workSpace: 112 },
  // Facts: `7 × 8 = ☐`.
  horizontal: { columns: 3, practice: 36, mixed: 24, rowGap: 34 },
  // Bracket with work space below — division is never stacked like a subtraction.
  longDivision: { columns: 3, practice: 12, mixed: 6, rowGap: 14, workSpace: 128 },
  // Worded bank items whose prompts run two to three lines.
  prompt: { columns: 2, practice: 12, mixed: 8, rowGap: 30 },
  // Worded bank items that are mostly one line ("250 − ? = 75"): the audit's
  // `avg chars` column says which skills these are (median ≲ 45).
  promptShort: { columns: 2, practice: 16, mixed: 10, rowGap: 56 },
  // A chart is ~15 text lines tall.
  figure: { columns: 2, practice: 4, mixed: 3, rowGap: 14 },
};

// Scratch room under each word problem on a mixed sheet.
export const STORY_WORK_SPACE = 52;

// A word-problems-only sheet: bordered work boxes, 2 × 3.
export const STORIES_PER_SHEET = 6;
export const STORIES_PER_FIGURE_SHEET = 3;
// The stories under a mixed sheet.
export const MIXED_STORIES = 2;
export const MIXED_STORIES_FIGURE = 1;

export const PROBLEM_TYPES = ["practice", "stories", "mixed"];

/** The layout a bare-computation claim must print in — the spec holds every
 * computation skill's authored `layout` to this rule. */
export function layoutForClaim(claim) {
  const hi = (range) => (Array.isArray(range) ? range[1] : 0);
  if (claim.op === "/") {
    const dividendMax = claim.dividend ? hi(claim.dividend) : Math.max(...(claim.table || [hi(claim.b)])) * hi(claim.quotient);
    return dividendMax <= 100 && claim.remainder === "none" && !claim.dividend ? "horizontal" : "longDivision";
  }
  if (claim.op === "x") {
    if (claim.table || claim.bStep) return "horizontal";
    if (hi(claim.a) <= 12 && hi(claim.b) <= 12) return "horizontal";
    return hi(claim.b) >= 10 ? "stackedWide" : "stacked";
  }
  const biggest = Math.max(hi(claim.a), hi(claim.b));
  if (biggest <= 20) return "horizontal";
  return biggest >= 1000 ? "stackedWide" : "stacked";
}

/** What the answer key writes for a problem: "12 R 3" when there is a remainder. */
export function printedAnswer(q) {
  return q.remainder ? `${q.answer} R ${q.remainder}` : q.answer;
}
