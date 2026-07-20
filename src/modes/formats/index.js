import { randInt, shuffleArray } from "../helpers";
import { ITEM_FAMILIES } from "../itemMetadata";
import { bandForLevel, BANDS } from "../structures/levelPolicy";

/**
 * Format transforms (implementation plan M3).
 *
 * Same mathematics, asked a different way. A format takes an already-solved
 * item and re-presents it, so one structure engine yields many question types
 * and every mode benefits from work done once.
 *
 * Formats are GENERATOR-side and are never banked: banking them would multiply
 * the corpus by the format count for no quality gain. A transform over a banked
 * item inherits that item's reviewed prose; a transform over a symbolic item is
 * plain generated content.
 *
 * The equality group (reversed, reflexive, commutative, balance, relational) is
 * the highest-value cluster here. Children who only ever meet `a + b = ?` come
 * to read "=" as "write the answer next" rather than "is the same number as",
 * and then reject `3 = 3` as false (Carpenter, Franke & Levi 2003). That is a
 * FORMAT problem, and it was previously inexpressible in this app.
 */

const OP_SYMBOL = { "+": "+", "-": "-", x: "x", "/": "/" };

/** A wrong-but-plausible value, so true/false items are not trivially false. */
function nearMiss(answer) {
  const deltas = [1, -1, 2, -2, 10, -10];
  const d = deltas[randInt(0, deltas.length - 1)];
  const candidate = answer + d;
  return candidate > 0 ? candidate : answer + Math.abs(d);
}

const TF = ["True", "False"];

/**
 * Does `a op b = answer` actually hold for this item?
 *
 * It does NOT hold for conceptual items, where the unknown is embedded: for
 * `? + 54 = 87` the generator stores the two GIVENS as a and b (54, 87) and the
 * answer is the missing start (33). Any format that renders "a op b = ..." must
 * check this first, or it emits an equation no operator can satisfy.
 */
function relationHolds(q) {
  if (q?.a == null || q?.b == null || q?.answer == null) return false;
  switch (q.op) {
    case "+": return q.a + q.b === q.answer;
    case "-": return q.a - q.b === q.answer;
    case "x": return q.a * q.b === q.answer;
    case "/": return q.b !== 0 && q.a / q.b === q.answer;
    default: return false;
  }
}

/**
 * Each format declares when it applies and how to rebuild the question.
 * `transform` returns the fields to override on the base question.
 */
export const FORMATS = {
  // --- equality / relational thinking -------------------------------------
  trueFalse: {
    bands: [BANDS.K, BANDS.G1, BANDS.G2],
    appliesTo: relationHolds,
    transform: (q) => {
      const truthy = Math.random() < 0.5;
      const shown = truthy ? q.answer : nearMiss(q.answer);
      return {
        display: { promptText: `${q.a} ${OP_SYMBOL[q.op]} ${q.b} = ${shown}` },
        subPrompt: "True or false?",
        answer: truthy ? "True" : "False",
        choices: [...TF],
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  equationReversed: {
    bands: [BANDS.G1, BANDS.G2],
    appliesTo: relationHolds,
    transform: (q) => {
      // `12 = 7 + 5`. Commonly called false by children reading "=" as
      // "compute now", which is exactly the point of asking.
      const truthy = Math.random() < 0.5;
      const left = truthy ? q.answer : nearMiss(q.answer);
      return {
        display: { promptText: `${left} = ${q.a} ${OP_SYMBOL[q.op]} ${q.b}` },
        subPrompt: "True or false?",
        answer: truthy ? "True" : "False",
        choices: [...TF],
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  reflexive: {
    bands: [BANDS.G1, BANDS.G2],
    // Reflexive only needs a number to restate, so it works on any item.
    appliesTo: (q) => q.answer > 0,
    transform: (q) => {
      const truthy = Math.random() < 0.5;
      const right = truthy ? q.answer : nearMiss(q.answer);
      return {
        display: { promptText: `${q.answer} = ${right}` },
        subPrompt: "True or false?",
        answer: truthy ? "True" : "False",
        choices: [...TF],
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  commutative: {
    bands: [BANDS.G1, BANDS.G2],
    appliesTo: (q) => (q.op === "+" || q.op === "x") && relationHolds(q),
    transform: (q) => {
      const truthy = Math.random() < 0.5;
      const rightB = truthy ? q.a : q.a + 1;
      return {
        display: {
          promptText: `${q.a} ${OP_SYMBOL[q.op]} ${q.b} = ${q.b} ${OP_SYMBOL[q.op]} ${rightB}`,
        },
        subPrompt: "True or false?",
        answer: truthy ? "True" : "False",
        choices: [...TF],
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  balanceBothSides: {
    bands: [BANDS.G2],
    appliesTo: (q) => q.op === "+" && q.a > 1 && q.b > 1 && relationHolds(q),
    transform: (q) => {
      const shift = randInt(1, Math.min(3, q.a - 1));
      const truthy = Math.random() < 0.5;
      const c = q.a - shift;
      const d = truthy ? q.b + shift : q.b + shift + 1;
      return {
        display: { promptText: `${q.a} + ${q.b} = ${c} + ${d}` },
        subPrompt: "True or false?",
        answer: truthy ? "True" : "False",
        choices: [...TF],
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  balanceOpen: {
    bands: [BANDS.G2],
    appliesTo: (q) => q.op === "+" && q.a > 1 && q.b > 1 && relationHolds(q),
    transform: (q) => {
      const d = randInt(1, q.answer - 1);
      return {
        display: { promptText: `${q.a} + ${q.b} = ? + ${d}` },
        subPrompt: "What goes in the box?",
        answer: q.answer - d,
        answerType: "numberPad",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  relationalNonComputable: {
    bands: [BANDS.G2],
    appliesTo: (q) => q.op === "+" && q.a >= 20 && q.b >= 20 && relationHolds(q),
    transform: (q) => {
      // Numbers deliberately awkward: computing both sides is harder than
      // reasoning by compensation, which is the skill being asked for.
      const truthy = Math.random() < 0.5;
      const shift = randInt(1, 5);
      const d = truthy ? q.b + shift : q.b + shift + 2;
      return {
        display: { promptText: `${q.a} + ${q.b} = ${q.a - shift} + ${d}` },
        subPrompt: "True or false? Try not to add.",
        answer: truthy ? "True" : "False",
        choices: [...TF],
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  // --- discrimination ------------------------------------------------------
  missingOperator: {
    bands: [BANDS.G1, BANDS.G2],
    appliesTo: relationHolds,
    transform: (q) => ({
      display: { promptText: `${q.a} ? ${q.b} = ${q.answer}` },
      subPrompt: "Which sign belongs?",
      answer: OP_SYMBOL[q.op],
      choices: shuffleArray(["+", "-", "x", "/"]),
      answerType: "choice",
      family: ITEM_FAMILIES.CONCEPTUAL,
    }),
  },

  oddOneOut: {
    bands: [BANDS.G1, BANDS.G2],
    appliesTo: (q) => q.answer > 3 && q.op === "+" && relationHolds(q),
    transform: (q) => {
      const target = q.answer;
      const equal = new Set();
      for (let i = 1; i < target && equal.size < 3; i += 1) equal.add(`${i} + ${target - i}`);
      const odd = `${1} + ${target}`; // sums to one more
      const options = shuffleArray([...equal, odd]);
      return {
        display: { promptText: `Which one does NOT equal ${target}?` },
        answer: odd,
        choices: options,
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  twoCorrect: {
    bands: [BANDS.G1, BANDS.G2],
    appliesTo: (q) => q.answer > 4 && q.op === "+" && relationHolds(q),
    transform: (q) => {
      const t = q.answer;
      const right = [`1 + ${t - 1}`, `2 + ${t - 2}`];
      const wrong = [`1 + ${t}`, `2 + ${t}`];
      return {
        display: {
          promptText: `Choose BOTH that equal ${t}.`,
          options: shuffleArray([...right, ...wrong]),
          requiredCount: 2,
        },
        answer: right,
        answerType: "multiSelect",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  // --- reasoning about someone else's work ---------------------------------
  errorAnalysis: {
    bands: [BANDS.G2],
    appliesTo: relationHolds,
    transform: (q, { actor }) => {
      // The misconception tags already describe how to be plausibly wrong,
      // which is what makes this format nearly free to generate.
      const wrong = nearMiss(q.answer);
      return {
        display: {
          promptText: `${actor} says ${q.a} ${OP_SYMBOL[q.op]} ${q.b} = ${wrong}. What is the correct answer?`,
        },
        answer: q.answer,
        answerType: "numberPad",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  estimation: {
    bands: [BANDS.G1, BANDS.G2],
    appliesTo: (q) => q.answer >= 10 && relationHolds(q),
    transform: (q) => {
      const round = (n) => Math.round(n / 10) * 10;
      const target = round(q.answer);
      const options = new Set([target]);
      let step = 10;
      while (options.size < 4) {
        options.add(target + step);
        if (target - step > 0) options.add(target - step);
        step += 10;
      }
      return {
        display: { promptText: `About how much is ${q.a} ${OP_SYMBOL[q.op]} ${q.b}?` },
        answer: target,
        choices: shuffleArray([...options].slice(0, 4)),
        answerType: "choice",
        // Number sense, not a word problem: there is no prose here, and
        // tagging it `application` would leak it past allowWordProblems: false.
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  // --- multiplicative ------------------------------------------------------
  factFamily: {
    bands: [BANDS.G2],
    // Works from either direction: a fact family is the same three numbers
    // whether the child arrived by multiplying or dividing, so division items
    // qualify too (their product is simply the largest of the three).
    appliesTo: (q) => {
      if (q.op !== "x" && q.op !== "/") return false;
      const nums = [q.a, q.b, q.answer];
      if (!nums.every((n) => Number.isInteger(n) && n > 1)) return false;
      // A square's family has fewer distinct members: `3 x 3` and `3 x 3` are
      // the same fact, which would leave a duplicate option.
      const [f1, f2] = nums.sort((m, n) => m - n);
      return f1 !== f2;
    },
    transform: (q) => {
      const [f1, f2, p] = [q.a, q.b, q.answer].sort((m, n) => m - n);
      const belongs = [`${f1} x ${f2} = ${p}`, `${f2} x ${f1} = ${p}`, `${p} / ${f1} = ${f2}`];
      const odd = `${p} - ${f2} = ${p - f2}`;
      return {
        display: {
          promptText: `Which one is NOT in the fact family for ${f1}, ${f2} and ${p}?`,
        },
        answer: odd,
        choices: shuffleArray([...belongs, odd]),
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },

  doublingHalving: {
    bands: [BANDS.G2],
    appliesTo: (q) => q.op === "x" && q.a % 2 === 0 && q.a >= 4 && q.b >= 2 && relationHolds(q),
    transform: (q) => {
      const truthy = Math.random() < 0.5;
      const right = truthy ? `${q.a / 2} x ${q.b * 2}` : `${q.a / 2} x ${q.b}`;
      return {
        display: { promptText: `${q.a} x ${q.b} = ${right}` },
        subPrompt: "True or false?",
        answer: truthy ? "True" : "False",
        choices: [...TF],
        answerType: "choice",
        family: ITEM_FAMILIES.CONCEPTUAL,
      };
    },
  },
};

export const FORMAT_IDS = Object.keys(FORMATS);

/** Formats a level may use, filtered to those that fit this item. */
export function availableFormats(question, level, supported = FORMAT_IDS) {
  const band = bandForLevel(level);
  return supported.filter((id) => {
    const f = FORMATS[id];
    return f && f.bands.includes(band) && f.appliesTo(question);
  });
}

/**
 * Re-present a solved question in another format. Returns a NEW question; the
 * original is untouched. Metadata is preserved apart from the fields the format
 * legitimately changes (family, representation, and the format tag itself).
 */
export function applyFormat(question, formatId, { actor = "Sam" } = {}) {
  const format = FORMATS[formatId];
  if (!format || !format.appliesTo(question)) return question;

  const override = format.transform(question, { actor });
  const { family, subPrompt, ...rest } = override;

  return {
    ...question,
    ...rest,
    display: { ...rest.display, ...(subPrompt ? { subPrompt } : {}) },
    metadata: {
      ...question.metadata,
      itemFamily: family || question.metadata?.itemFamily,
      representation: "symbolic",
      formatId,
      cognitiveDemand: formatId === "errorAnalysis" ? "DOK3" : "DOK2",
      blueprintId: `${question.metadata?.modeId}-${formatId}-${question.metadata?.subskill}`,
    },
  };
}

/**
 * Apply a format some of the time. Story items are left alone: transforming
 * prose into an equation throws away the context that made it worth authoring.
 */
export function maybeApplyFormat(question, level, context = {}, supported = FORMAT_IDS, rate = 0.25) {
  if (context.formatId) return applyFormat(question, context.formatId, context);
  if (context.noFormats) return question;
  if (question.metadata?.itemFamily === ITEM_FAMILIES.APPLICATION) return question;
  if (Math.random() >= rate) return question;

  const options = availableFormats(question, level, supported);
  if (!options.length) return question;
  return applyFormat(question, options[randInt(0, options.length - 1)], context);
}
