import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Telling time & elapsed time (Grade 1-3, 1.MD.B / 3.MD.A). readClock shows an
// analog clock and asks the minutes past the hour; elapsedTime is a word
// problem. Numeric answers.

const SUBSKILLS = ["readClock", "elapsedTime"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.5) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.82 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "time",
  label: "Clock Stop!",
  shortLabel: "Time",
  description: "Read clocks and find elapsed time.",
  icon: "Clock",
  op: "time",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    if (subskill === "elapsedTime") {
      const hour = randInt(1, 11);
      const startM = randInt(0, 9) * 5;
      const duration = randInt(1, Math.floor((55 - startM) / 5) || 1) * 5;
      const endM = startM + duration;
      const symbolic = `A show starts at ${hour}:${pad(startM)} and ends at ${hour}:${pad(endM)}. How many minutes long?`;
      const contextual = `Recess starts at ${hour}:${pad(startM)} and ends at ${hour}:${pad(endM)}. How long is recess (minutes)?`;
      const question = {
        op: "time",
        answer: duration,
        answerType: "numberPad",
        level,
        display: { promptText: itemFamily === ITEM_FAMILIES.APPLICATION ? contextual : symbolic },
      };
      question.metadata = timeMeta(level, subskill, itemFamily, "symbolic");
      return question;
    }

    // readClock: show an analog clock, ask the minutes past the hour.
    const hour = randInt(1, 12);
    const minute = randInt(0, 11) * 5;
    const question = {
      op: "time",
      answer: minute,
      answerType: "clock",
      level,
      display: {
        type: "clock",
        hour,
        minute,
        promptText: `How many minutes past ${hour} o'clock is the clock showing?`,
      },
    };
    question.metadata = timeMeta(level, subskill, itemFamily, "clock");
    return question;
  },
};

function timeMeta(level, subskill, itemFamily, representation) {
  return createQuestionMetadata({
    modeId: "time",
    level,
    domain: "MD",
    cluster: "Tell and write time; measure time intervals",
    subskill,
    itemFamily,
    cognitiveDemand: "DOK2",
    representation: itemFamily === ITEM_FAMILIES.APPLICATION ? "verbalContext" : representation,
    mathPractices: ["MP2", "MP6"],
    standardRefs: ["1.MD", "3.MD"],
    misconceptionTags: ["hourMinuteSwap", "clockDirection", "offByFive"],
    blueprintId: `time-${itemFamily}-${subskill}`,
  });
}
