/**
 * Grade span per mode, in parent language. From the content gap analysis §1:
 * a mode's levels are its own ladder, and different modes serve different
 * grade ranges — this map is what lets the grown-ups view say "Grade 2 work"
 * instead of "level 5".
 */
export const GRADE_SPANS = {
  counting: "K–1",
  comparing: "K–2",
  numberBonds: "K–2",
  skipCounting: "K–2",
  addition: "K–2",
  subtraction: "K–2",
  placeValue: "1–2",
  placeValueDiscs: "1–4",
  time: "1–3",
  money: "1–4",
  measurement: "K–4",
  patterns: "K–4",
  linesShapes: "K–4",
  dataGraphs: "1–4",
  barModels: "2–4",
  multiplication: "2–4",
  fractions: "2–4",
  division: "3–4",
  areaPerimeter: "3–4",
  decimals: "4",
  factorsMultiples: "4",
  angles: "4",
};

export function gradeSpanFor(modeId) {
  return GRADE_SPANS[modeId] || "K–4";
}
