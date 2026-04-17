import { randInt } from "./helpers";

const RANGES = [
  { min: 1, max: 3 },
  { min: 1, max: 5 },
  { min: 1, max: 7 },
  { min: 1, max: 9 },
  { min: 1, max: 12 },
  { min: 1, max: 15 },
  { min: 5, max: 20 },
  { min: 5, max: 25 },
  { min: 10, max: 30 },
  { min: 10, max: 50 },
];

const OBJECTS = ["🍎", "⭐", "🐟", "🌸", "🟢", "🔵", "❤️", "🍪"];

export default {
  id: "counting",
  label: "Count It Up!",
  shortLabel: "Counting",
  description: "Count the objects and pick the right number!",
  icon: "Hash",
  op: "count",

  generate(level) {
    const r = RANGES[level - 1];
    const answer = randInt(r.min, r.max);
    const emoji = OBJECTS[randInt(0, OBJECTS.length - 1)];

    return {
      a: answer,
      b: null,
      op: "count",
      answer,
      level,
      display: { emoji, count: answer },
    };
  },
};
