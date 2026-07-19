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

    let answer;
    let promptText;
    if (subskill === "compareBars") {
      // Ensure a positive difference by ordering two distinct bars.
      const [i, j] = [0, 1];
      const a = bars[i].value >= bars[j].value ? bars[i] : bars[j];
      const b = bars[i].value >= bars[j].value ? bars[j] : bars[i];
      answer = a.value - b.value;
      promptText = `How many more ${a.label} than ${b.label}?`;
    } else {
      const pickIdx = randInt(0, bars.length - 1);
      answer = bars[pickIdx].value;
      promptText = `How many ${bars[pickIdx].label}?`;
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
