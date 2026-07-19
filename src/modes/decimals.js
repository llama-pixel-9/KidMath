import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Grade 4 decimals (4.NF.C). Exercises the decimal and symbolSelect answer
// formats: write-as-decimal and fraction->decimal -> decimal answers,
// compareDecimals -> a <,>,= symbol.

const SUBSKILLS = ["tenthsHundredths", "compareDecimals", "fractionToDecimal"];

// Round to 2 decimal places without float noise.
function round2(x) {
  return Math.round(x * 100) / 100;
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

function buildBySubskill(subskill, level) {
  const hundredths = level >= 7; // tenths at lower levels, hundredths at Grade 4

  if (subskill === "compareDecimals") {
    const scale = hundredths ? 100 : 10;
    const x = randInt(1, scale - 1) / scale;
    const y = Math.random() < 0.25 ? x : randInt(1, scale - 1) / scale;
    const a = round2(x);
    const b = round2(y);
    const answer = a > b ? ">" : a < b ? "<" : "=";
    return {
      answer,
      answerType: "symbolSelect",
      symbolic: `Compare: ${a} ? ${b}`,
      contextual: `One runner's time improved by ${a} s and another by ${b} s. Use <, >, or =.`,
    };
  }

  if (subskill === "fractionToDecimal") {
    const den = hundredths && Math.random() < 0.5 ? 100 : 10;
    const num = randInt(1, den - 1);
    const answer = round2(num / den);
    return {
      answer,
      answerType: "decimal",
      symbolic: `Write ${num}/${den} as a decimal.`,
      contextual: `A jug is ${num}/${den} full. Write that as a decimal.`,
    };
  }

  // tenthsHundredths: write a spoken quantity as a decimal.
  if (hundredths) {
    const tenths = randInt(0, 9);
    const hundredthsDigit = randInt(1, 9);
    const answer = round2(tenths / 10 + hundredthsDigit / 100);
    return {
      answer,
      answerType: "decimal",
      symbolic: `Write as a decimal: ${tenths} tenths and ${hundredthsDigit} hundredths.`,
      contextual: `A coin is worth ${tenths} tenths and ${hundredthsDigit} hundredths of a dollar. Write it as a decimal.`,
    };
  }
  const tenths = randInt(1, 9);
  const answer = round2(tenths / 10);
  return {
    answer,
    answerType: "decimal",
    symbolic: `Write as a decimal: ${tenths} tenths.`,
    contextual: `A strip is split into 10 equal parts; ${tenths} are shaded. Write that as a decimal.`,
  };
}

export default {
  id: "decimals",
  label: "Decimal Dash!",
  shortLabel: "Decimals",
  description: "Tenths, hundredths, and comparing decimals.",
  icon: "Percent",
  op: "dec",
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
      op: "dec",
      answer,
      answerType,
      level,
      display: { promptText, representation: "symbolic" },
    };

    question.metadata = createQuestionMetadata({
      modeId: "decimals",
      level,
      domain: "NF",
      cluster: "Decimal notation for fractions; compare decimals",
      subskill,
      itemFamily,
      cognitiveDemand: itemFamily === ITEM_FAMILIES.PROCEDURAL ? "DOK1" : "DOK2",
      representation: itemFamily === ITEM_FAMILIES.APPLICATION ? "verbalContext" : "symbolic",
      mathPractices: ["MP2", "MP6"],
      standardRefs: ["4.NF"],
      misconceptionTags: ["longerIsLarger", "placeValueSlip", "decimalPointDrift"],
      blueprintId: `decimals-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
