import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Reading bar graphs (Grade 1-4, MD data). Read a value off the graph or compare
// two bars. Numeric answers on an interactive bar-graph figure.

const SUBSKILLS = ["readBar", "compareBars"];
const CATEGORY_SETS = [
  ["Cats", "Dogs", "Birds", "Fish"],
  ["Red", "Blue", "Green", "Yellow"],
  ["Apples", "Pears", "Plums", "Grapes"],
  ["Bikes", "Cars", "Buses", "Vans"],
];

// Application contexts. Each is a short lead-in naming an actor and a concrete
// setting; the question sentence is appended by the generator.
const CONTEXTS = [
  "Nia surveyed her class and made this graph.",
  "Theo counted what the school garden club brought in.",
  "Ava recorded this tally at the library table.",
  "Luca graphed what the after-school group chose.",
];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.45) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.78 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "dataGraphs",
  label: "Graph Reader!",
  shortLabel: "Graphs",
  description: "Read and compare bar graphs.",
  icon: "ChartColumn",
  op: "graph",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    const labels = CATEGORY_SETS[randInt(0, CATEGORY_SETS.length - 1)];
    const hi = level <= 3 ? 8 : level <= 6 ? 12 : 20;
    const bars = labels.map((label) => ({ label, value: randInt(1, hi) }));

    const isApplication = itemFamily === ITEM_FAMILIES.APPLICATION;
    const lead = CONTEXTS[randInt(0, CONTEXTS.length - 1)];

    let answer;
    let promptText;
    if (subskill === "compareBars") {
      // Pick two distinct bars at random, then order them so the difference is
      // positive and the question text matches the chosen pair.
      const i = randInt(0, bars.length - 1);
      let j = randInt(0, bars.length - 2);
      if (j >= i) j += 1;
      const a = bars[i].value >= bars[j].value ? bars[i] : bars[j];
      const b = bars[i].value >= bars[j].value ? bars[j] : bars[i];
      answer = a.value - b.value;
      const ask = `How many more ${a.label} than ${b.label}?`;
      promptText = isApplication ? `${lead} ${ask}` : ask;
    } else {
      const pickIdx = randInt(0, bars.length - 1);
      answer = bars[pickIdx].value;
      const ask = `How many ${bars[pickIdx].label}?`;
      promptText = isApplication ? `${lead} ${ask}` : ask;
    }

    const question = {
      op: "graph",
      answer,
      answerType: "barGraph",
      level,
      display: { type: "barGraph", bars, promptText },
    };

    question.metadata = createQuestionMetadata({
      modeId: "dataGraphs",
      level,
      domain: "MD",
      cluster: "Represent and interpret data",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK2",
      representation: "barGraph",
      mathPractices: ["MP2", "MP4"],
      standardRefs: ["2.MD", "3.MD"],
      misconceptionTags: ["axisMisread", "compareDirection", "offByOne"],
      blueprintId: `dataGraphs-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
