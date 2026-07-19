import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Factors & multiples (Grade 4, 4.OA.B). Number-theory foundations: count the
// factors of a number (prime = exactly 2), and find the nth multiple.

const SUBSKILLS = ["factorCount", "nthMultiple"];

function numFactors(n) {
  let count = 0;
  for (let i = 1; i <= n; i++) if (n % i === 0) count++;
  return count;
}

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.5) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.85 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "factorsMultiples",
  label: "Factor Lab!",
  shortLabel: "Factors",
  description: "Factors, multiples, primes.",
  icon: "Sigma",
  op: "factor",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    const cap = level <= 6 ? 20 : 50;

    let answer;
    let symbolic;
    let contextual;
    if (subskill === "nthMultiple") {
      const n = randInt(2, level <= 6 ? 9 : 12);
      const k = randInt(2, 9);
      answer = n * k;
      symbolic = `What is the ${ordinal(k)} multiple of ${n}?`;
      contextual = `Chairs come in rows of ${n}. How many chairs in ${k} rows?`;
    } else {
      const n = randInt(2, cap);
      answer = numFactors(n);
      symbolic = `How many factors does ${n} have?`;
      contextual = `You arrange ${n} tiles into equal rows. How many different row sizes work?`;
    }

    const question = {
      op: "factor",
      answer,
      answerType: "numberPad",
      level,
      display: { promptText: itemFamily === ITEM_FAMILIES.APPLICATION ? contextual : symbolic },
    };

    question.metadata = createQuestionMetadata({
      modeId: "factorsMultiples",
      level,
      domain: "OA",
      cluster: "Gain familiarity with factors and multiples",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK2",
      representation: "symbolic",
      mathPractices: ["MP7", "MP8"],
      standardRefs: ["4.OA"],
      misconceptionTags: ["factorMultipleSwap", "missingFactor", "offByOne"],
      blueprintId: `factorsMultiples-${itemFamily}-${subskill}`,
    });
    return question;
  },
};

function ordinal(k) {
  return { 1: "1st", 2: "2nd", 3: "3rd" }[k] || `${k}th`;
}
