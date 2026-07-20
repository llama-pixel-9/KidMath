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
    let coinTray = null;
    if (subskill === "makeChange") {
      const paid = level <= 3 ? 100 : randInt(2, 10) * 25;
      const price = randInt(5, paid - 1);
      answer = paid - price;
      symbolic = `You pay ${paid}¢ for a ${price}¢ item. How much change (in cents)?`;
      contextual = `A sticker costs ${price}¢. You give ${paid}¢. How many cents change?`;
    } else {
      const quarters = randInt(0, level <= 3 ? 2 : 4);
      const dimes = randInt(0, 4);
      const nickels = randInt(0, level <= 3 ? 2 : 4);
      const pennies = randInt(0, 9);
      answer = quarters * 25 + dimes * 10 + nickels * 5 + pennies;
      const coins = `${quarters} quarters, ${dimes} dimes, ${nickels} nickels, and ${pennies} pennies`;
      symbolic = `${coins}. How many cents?`;
      contextual = `Maya has ${coins}. How many cents in all?`;

      // Show the coins rather than naming them. Counting mixed change is a
      // visual skill — a dime is worth more than a nickel but is smaller, and
      // that only bites when the child can see them (CoinTray draws to scale).
      coinTray = [
        ...Array.from({ length: quarters }, () => "quarter"),
        ...Array.from({ length: dimes }, () => "dime"),
        ...Array.from({ length: nickels }, () => "nickel"),
        ...Array.from({ length: pennies }, () => "penny"),
      ];
      // Shuffle so the tray is not pre-sorted by value: sorting it first is
      // part of the skill.
      for (let i = coinTray.length - 1; i > 0; i -= 1) {
        const j = randInt(0, i);
        [coinTray[i], coinTray[j]] = [coinTray[j], coinTray[i]];
      }
    }

    // A visible tray only makes sense when there is something to look at, and
    // an over-full tray is a counting slog rather than a coin-value question.
    const useTray = coinTray && coinTray.length > 0 && coinTray.length <= 12;

    const question = {
      op: "money",
      answer,
      answerType: useTray ? "coinTray" : "numberPad",
      level,
      display: useTray
        ? { promptText: "How many cents are shown?", coins: coinTray, coinMode: "count" }
        : { promptText: itemFamily === ITEM_FAMILIES.APPLICATION ? contextual : symbolic },
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
