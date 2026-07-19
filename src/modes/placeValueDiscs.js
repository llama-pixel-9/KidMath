import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Place-value discs / place-value chart (Math in Focus). Discs sit in
// thousands/hundreds/tens/ones columns; the child reads the number they show.
// The answer is the numeric value. A "regroup" variant over-fills the ones
// column (e.g. 1 ten + 14 ones) to build regrouping sense.

const SUBSKILLS = ["readNumber", "regroupSense"];
const PLACES = [1000, 100, 10, 1];

function maxPlace(level) {
  if (level <= 3) return 100; // to hundreds
  if (level <= 6) return 1000; // to thousands
  return 1000;
}

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.55) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.85 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "placeValueDiscs",
  label: "Place Value Discs!",
  shortLabel: "PV Discs",
  description: "Read the number the discs show.",
  icon: "CircleDot",
  op: "pvdiscs",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    const top = maxPlace(level);
    const usePlaces = PLACES.filter((p) => p <= top);

    // Standard digit per place, but keep the leading place non-zero.
    const counts = {};
    for (const p of usePlaces) counts[p] = randInt(0, 9);
    counts[usePlaces[0]] = randInt(1, 9);

    // Regroup variant: over-fill the ones column so it reads as a trade.
    if (subskill === "regroupSense") {
      counts[1] = randInt(10, 15);
    }

    const answer = usePlaces.reduce((sum, p) => sum + p * counts[p], 0);
    const cols = usePlaces.map((place) => ({ place, count: counts[place] }));

    const promptText =
      itemFamily === ITEM_FAMILIES.APPLICATION
        ? "A counting mat shows these place-value discs. What number is it?"
        : subskill === "regroupSense"
          ? "Trade to find the number these discs show."
          : "What number do these discs show?";

    const question = {
      op: "pvdiscs",
      answer,
      answerType: "placeValueDiscs",
      level,
      display: { type: "discs", cols, promptText },
    };

    question.metadata = createQuestionMetadata({
      modeId: "placeValueDiscs",
      level,
      domain: "NBT",
      cluster: "Understand place value with base-ten discs",
      subskill,
      itemFamily,
      cognitiveDemand: subskill === "regroupSense" ? "DOK2" : "DOK1",
      representation: itemFamily === ITEM_FAMILIES.APPLICATION ? "verbalContext" : "placeValueBlocks",
      mathPractices: ["MP2", "MP7"],
      standardRefs: ["1.NBT", "2.NBT", "4.NBT"],
      misconceptionTags: ["placeValueSlip", "digitReversal", "regroupMiss"],
      blueprintId: `placeValueDiscs-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
