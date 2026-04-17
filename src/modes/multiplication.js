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
  id: "multiplication",
  label: "Multiply Mania!",
  shortLabel: "Multiplication",
  description: "Conquer times tables up to 12 × 12!",
  icon: "X",
  op: "×",

  generate(level) {
    const r = RANGES[level - 1];
    const a = randInt(r.aMin, r.aMax);
    const b = randInt(r.bMin, r.bMax);
    return { a, b, op: "×", answer: a * b, level };
  },
};
