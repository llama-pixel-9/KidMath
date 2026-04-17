import { randInt } from "./helpers";

const RANGES = [
  { aMin: 1, aMax: 3, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 12, bMin: 1, bMax: 12 },
  { aMin: 5, aMax: 12, bMin: 5, bMax: 12 },
  { aMin: 7, aMax: 12, bMin: 7, bMax: 12 },
];

export default {
  id: "division",
  label: "Division Derby!",
  shortLabel: "Division",
  description: "Split numbers evenly — no remainders!",
  icon: "Divide",
  op: "÷",

  generate(level) {
    const r = RANGES[level - 1];
    const divisor = randInt(r.bMin || 1, r.bMax);
    const answer = randInt(r.aMin, r.aMax);
    const dividend = divisor * answer;
    return { a: dividend, b: divisor, op: "÷", answer, level };
  },
};
