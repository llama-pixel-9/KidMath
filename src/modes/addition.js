import { randInt } from "./helpers";

const RANGES = [
  { aMin: 1, aMax: 3, bMin: 1, bMax: 3 },
  { aMin: 1, aMax: 5, bMin: 1, bMax: 5 },
  { aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
  { aMin: 1, aMax: 9, bMin: 10, bMax: 15 },
  { aMin: 5, aMax: 15, bMin: 5, bMax: 15 },
  { aMin: 10, aMax: 20, bMin: 10, bMax: 20 },
  { aMin: 10, aMax: 30, bMin: 1, bMax: 20 },
  { aMin: 10, aMax: 30, bMin: 10, bMax: 30 },
  { aMin: 10, aMax: 40, bMin: 10, bMax: 30 },
  { aMin: 10, aMax: 50, bMin: 10, bMax: 50 },
];

export default {
  id: "addition",
  label: "Addition Fun!",
  shortLabel: "Addition",
  description: "Master adding numbers from 1 all the way to 50!",
  icon: "Plus",
  op: "+",

  generate(level) {
    const r = RANGES[level - 1];
    const a = randInt(r.aMin, r.aMax);
    const b = randInt(r.bMin, r.bMax);
    return { a, b, op: "+", answer: a + b, level };
  },
};
