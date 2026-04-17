import { randInt, shuffleArray } from "./helpers";

const QUESTION_TYPES = {
  TENS_IN: "tens_in",
  ONES_IN: "ones_in",
  BUILD: "build",
};

const LEVELS = [
  { max: 19, types: [QUESTION_TYPES.ONES_IN] },
  { max: 29, types: [QUESTION_TYPES.TENS_IN, QUESTION_TYPES.ONES_IN] },
  { max: 49, types: [QUESTION_TYPES.TENS_IN, QUESTION_TYPES.ONES_IN] },
  { max: 59, types: [QUESTION_TYPES.TENS_IN, QUESTION_TYPES.ONES_IN, QUESTION_TYPES.BUILD] },
  { max: 79, types: [QUESTION_TYPES.TENS_IN, QUESTION_TYPES.ONES_IN, QUESTION_TYPES.BUILD] },
  { max: 99, types: [QUESTION_TYPES.TENS_IN, QUESTION_TYPES.ONES_IN, QUESTION_TYPES.BUILD] },
  { max: 99, types: [QUESTION_TYPES.BUILD] },
  { max: 199, types: [QUESTION_TYPES.TENS_IN, QUESTION_TYPES.ONES_IN] },
  { max: 499, types: [QUESTION_TYPES.TENS_IN, QUESTION_TYPES.BUILD] },
  { max: 999, types: [QUESTION_TYPES.TENS_IN, QUESTION_TYPES.ONES_IN, QUESTION_TYPES.BUILD] },
];

export default {
  id: "placeValue",
  label: "Place Value!",
  shortLabel: "Place Value",
  description: "How many tens? How many ones? Build numbers!",
  icon: "Layers",
  op: "place",

  generate(level) {
    const cfg = LEVELS[level - 1];
    const number = randInt(10, cfg.max);
    const tens = Math.floor(number / 10);
    const ones = number % 10;
    const type = cfg.types[randInt(0, cfg.types.length - 1)];

    let answer, promptText;

    switch (type) {
      case QUESTION_TYPES.TENS_IN:
        answer = tens;
        promptText = `How many tens in ${number}?`;
        break;
      case QUESTION_TYPES.ONES_IN:
        answer = ones;
        promptText = `How many ones in ${number}?`;
        break;
      case QUESTION_TYPES.BUILD:
        answer = number;
        promptText = `${tens} tens and ${ones} ones = ?`;
        break;
    }

    return {
      a: number,
      b: null,
      op: "place",
      answer,
      level,
      display: { type, promptText, number, tens, ones },
    };
  },

  generateChoices(answer, question) {
    const choices = new Set([answer]);
    const type = question.display.type;

    if (type === QUESTION_TYPES.BUILD) {
      const n = question.display.number;
      const offsets = [10, -10, 1, -1, 11, -11, 9, -9];
      for (const off of offsets) {
        if (choices.size >= 4) break;
        const c = n + off;
        if (c >= 0 && !choices.has(c)) choices.add(c);
      }
    } else {
      const spread = Math.max(2, answer);
      while (choices.size < 4) {
        const c = answer + randInt(1, spread) * (Math.random() < 0.5 ? -1 : 1);
        if (c >= 0 && !choices.has(c)) choices.add(c);
      }
    }

    while (choices.size < 4) {
      choices.add(answer + choices.size);
    }

    return shuffleArray([...choices]);
  },
};
