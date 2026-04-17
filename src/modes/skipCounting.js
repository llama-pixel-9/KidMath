import { randInt, shuffleArray } from "./helpers";

const LEVELS = [
  { step: 2, startMax: 6 },
  { step: 2, startMax: 14 },
  { step: 5, startMax: 15 },
  { step: 5, startMax: 40 },
  { step: 10, startMax: 40 },
  { step: 10, startMax: 90 },
  { step: 3, startMax: 15 },
  { step: 3, startMax: 27 },
  { step: 4, startMax: 24 },
  { step: 4, startMax: 40 },
];

export default {
  id: "skipCounting",
  label: "Skip Count!",
  shortLabel: "Skip Counting",
  description: "Count by 2s, 5s, 10s and more — what comes next?",
  icon: "FastForward",
  op: "skip",

  generate(level) {
    const cfg = LEVELS[level - 1];
    const startMultiple = randInt(0, Math.floor(cfg.startMax / cfg.step));
    const start = startMultiple * cfg.step;

    const seqLen = 3;
    const sequence = [];
    for (let i = 0; i < seqLen; i++) {
      sequence.push(start + cfg.step * i);
    }
    const answer = start + cfg.step * seqLen;

    return {
      a: null,
      b: null,
      op: "skip",
      answer,
      level,
      display: { sequence, step: cfg.step },
    };
  },

  generateChoices(answer, question) {
    const step = question.display.step;
    const choices = new Set([answer]);
    const offsets = [step, -step, step * 2, -step * 2, 1, -1, 2, -2];
    for (const off of shuffleArray([...offsets])) {
      if (choices.size >= 4) break;
      const c = answer + off;
      if (c >= 0 && !choices.has(c)) choices.add(c);
    }
    while (choices.size < 4) {
      const c = answer + randInt(1, step * 3) * (Math.random() < 0.5 ? -1 : 1);
      if (c >= 0 && !choices.has(c)) choices.add(c);
    }
    return shuffleArray([...choices]);
  },
};
