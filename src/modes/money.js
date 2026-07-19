import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Money (Grade 1-3, 2.MD.C.8). Count coin values and make change. Numeric
// answers in cents.

const SUBSKILLS = ["countCoins", "makeChange"];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.4) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.72 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "money",
  label: "Money Counter!",
  shortLabel: "Money",
  description: "Count coins and make change.",
  icon: "Coins",
  op: "money",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    let answer;
    let symbolic;
    let contextual;
    if (subskill === "makeChange") {
      const paid = level <= 3 ? 100 : randInt(2, 10) * 25;
      const price = randInt(5, paid - 1);
      answer = paid - price;
      symbolic = `You pay ${paid}¢ for a ${price}¢ item. How much change (in cents)?`;
      contextual = `A sticker costs ${price}¢. You give ${paid}¢. How many cents change?`;
    } else {
      const quarters = randInt(0, level <= 3 ? 2 : 4);
      const dimes = randInt(0, 4);
      const pennies = randInt(0, 9);
      answer = quarters * 25 + dimes * 10 + pennies;
      symbolic = `${quarters} quarters, ${dimes} dimes, and ${pennies} pennies. How many cents?`;
      contextual = `Maya has ${quarters} quarters, ${dimes} dimes, and ${pennies} pennies. How many cents in all?`;
    }

    const question = {
      op: "money",
      answer,
      answerType: "numberPad",
      level,
      display: { promptText: itemFamily === ITEM_FAMILIES.APPLICATION ? contextual : symbolic },
    };

    question.metadata = createQuestionMetadata({
      modeId: "money",
      level,
      domain: "MD",
      cluster: "Work with money",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK2",
      representation: "symbolic",
      mathPractices: ["MP1", "MP2"],
      standardRefs: ["2.MD"],
      misconceptionTags: ["coinValueSlip", "changeDirection", "offByOne"],
      blueprintId: `money-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
