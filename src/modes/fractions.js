import { randInt } from "./helpers";
import { gcd } from "../fractions.js";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Grade 3-4 fractions (3.NF / 4.NF). Showcases the fraction and symbolSelect
// answer formats: simplify -> a fraction answer, compare -> a <,>,= symbol,
// add-like-denominators -> a fraction answer.

const SUBSKILLS = ["equivalence", "compareFractions", "addLikeDenominators"];

function denPool(level) {
  if (level <= 3) return [2, 3, 4];
  if (level <= 6) return [2, 3, 4, 5, 6, 8];
  return [2, 3, 4, 5, 6, 8, 10, 12];
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  let family;
  if (roll < 0.34) family = ITEM_FAMILIES.CONCEPTUAL;
  else if (roll < 0.68) family = ITEM_FAMILIES.PROCEDURAL;
  else family = ITEM_FAMILIES.APPLICATION;
  if (context?.allowWordProblems === false && family === ITEM_FAMILIES.APPLICATION) {
    return ITEM_FAMILIES.PROCEDURAL;
  }
  if (level < 7 && family === ITEM_FAMILIES.APPLICATION) {
    return ITEM_FAMILIES.PROCEDURAL;
  }
  return family;
}

// Returns { answer, answerType, symbolic, contextual } for the subskill.
function buildBySubskill(subskill, level) {
  const pool = denPool(level);

  if (subskill === "compareFractions") {
    const b = pick(pool);
    const a = randInt(1, b);
    let c;
    let d;
    if (Math.random() < 0.25) {
      const m = randInt(2, 3); // an equivalent fraction -> "="
      c = a * m;
      d = b * m;
    } else {
      d = pick(pool);
      c = randInt(1, d);
    }
    const answer = a * d > c * b ? ">" : a * d < c * b ? "<" : "=";
    return {
      answer,
      answerType: "symbolSelect",
      symbolic: `Compare: ${a}/${b} ? ${c}/${d}`,
      contextual: `Team A finished ${a}/${b} of a race and Team B finished ${c}/${d}. Use <, >, or =.`,
    };
  }

  if (subskill === "addLikeDenominators") {
    const d = pick(pool.filter((x) => x >= 3));
    const a = randInt(1, d - 2);
    const b = Math.max(1, randInt(1, d - 1 - a));
    return {
      answer: { num: a + b, den: d },
      answerType: "fraction",
      symbolic: `${a}/${d} + ${b}/${d} = ?`,
      contextual: `You read ${a}/${d} of a book, then ${b}/${d} more. How much have you read?`,
    };
  }

  // equivalence: give a non-reduced fraction, ask for simplest form.
  const d = pick(pool);
  let n = randInt(1, d - 1);
  let guard = 0;
  while (gcd(n, d) !== 1 && guard++ < 20) n = randInt(1, d - 1);
  const k = randInt(2, 3);
  const bigNum = n * k;
  const bigDen = d * k;
  return {
    answer: { num: n, den: d },
    answerType: "fraction",
    symbolic: `Write ${bigNum}/${bigDen} in simplest form.`,
    contextual: `A recipe calls for ${bigNum}/${bigDen} cup. Write that in simplest form.`,
  };
}

export default {
  id: "fractions",
  label: "Fraction Frenzy!",
  shortLabel: "Fractions",
  description: "Compare, simplify, and add fractions.",
  icon: "PieChart",
  op: "frac",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    const { answer, answerType, symbolic, contextual } = buildBySubskill(subskill, level);
    const promptText = itemFamily === ITEM_FAMILIES.APPLICATION ? contextual : symbolic;

    const question = {
      op: "frac",
      answer,
      answerType,
      level,
      display: { promptText, representation: "symbolic" },
    };

    question.metadata = createQuestionMetadata({
      modeId: "fractions",
      level,
      domain: "NF",
      cluster: "Build fractions; equivalence and comparison",
      subskill,
      itemFamily,
      cognitiveDemand: itemFamily === ITEM_FAMILIES.PROCEDURAL ? "DOK1" : "DOK2",
      representation: itemFamily === ITEM_FAMILIES.APPLICATION ? "verbalContext" : "symbolic",
      mathPractices: ["MP2", "MP7"],
      standardRefs: ["3.NF", "4.NF"],
      misconceptionTags: ["wholeNumberBias", "denominatorAdd", "nonEquivalence"],
      blueprintId: `fractions-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
