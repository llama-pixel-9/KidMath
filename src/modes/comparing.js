import { randInt, shuffleArray } from "./helpers";

const RANGES = [
  { min: 1, max: 5 },
  { min: 1, max: 9 },
  { min: 1, max: 15 },
  { min: 1, max: 20 },
  { min: 1, max: 30 },
  { min: 5, max: 50 },
  { min: 10, max: 75 },
  { min: 10, max: 100 },
  { min: 50, max: 500 },
  { min: 100, max: 1000 },
];

export default {
  id: "comparing",
  label: "Compare Quest!",
  shortLabel: "Comparing",
  description: "Is it greater than, less than, or equal?",
  icon: "ArrowLeftRight",
  op: "vs",

  generate(level) {
    const r = RANGES[level - 1];
    let a = randInt(r.min, r.max);
    let b = randInt(r.min, r.max);

    // ~20% chance of equal values so kids see "=" too
    if (Math.random() < 0.2) {
      b = a;
    }

    let answer, op;
    if (a > b) { answer = ">"; op = "?"; }
    else if (a < b) { answer = "<"; op = "?"; }
    else { answer = "="; op = "?"; }

    return { a, b, op, answer, level };
  },

  generateChoices() {
    return shuffleArray([">", "<", "="]);
  },
};
