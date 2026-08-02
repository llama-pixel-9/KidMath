import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata } from "./itemMetadata";
import { maybeApplyFormat } from "./formats";
import { pickContext } from "./structures";
import {
  MULTIPLICATIVE_STRUCTURES,
  generateMultiplicativeItem,
  deriveCognitiveDemand,
} from "./structures";
import { randInt } from "./helpers";

// Multiplication draws the unknown-product column of CCSS Table 2.
// Multiplicative compare ("3 times as much") is Grade 4 and sits in the
// difficult tier — children commonly read it additively as "3 more".
// Product-unknown structures give procedural facts (`3 x 4 = ?`); the
// missing-factor structures rendered in x-form give conceptual items
// (`3 x ? = 12`). Both are multiplicative reasoning — only the division
// *rendering* belongs to the division mode.
const STRUCTURES = MULTIPLICATIVE_STRUCTURES;

// Kept as the mode's declared subskills so curated bank items, which are keyed
// by subskill, keep resolving. Each structure maps onto one of these.
const SUPPORTED_FORMATS = ["trueFalse","equationReversed","commutative","missingOperator","factFamily","doublingHalving","errorAnalysis","estimation"];

const SUBSKILLS = ["equalGroups", "arrayReasoning", "factFluency"];

export default {
  id: "multiplication",
  label: "Times Tree",
  shortLabel: "Multiply",
  description: "Equal groups, arrays, and times-as-many.",
  icon: "X",
  op: "x",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: ["conceptual", "procedural", "application"],
  structureTypes: STRUCTURES.map((s) => s.id),

  generate(level, context = {}) {
    const item = generateMultiplicativeItem(level, context, {
      pool: STRUCTURES,
      form: "missingFactor",
    });
    const { structure, itemFamily, asStory } = item;

    const question = {
      a: item.a,
      b: item.b,
      op: "x",
      answer: item.answer,
      level,
      display: item.display,
    };

    // Two-digit work is typed rather than chosen: four plausible options are
    // not a meaningful discrimination once products get large.
    if ((item.a ?? 0) >= 10 || (item.b ?? 0) >= 10) {
      question.answerType = "numberPad";
    }

    // "# x # = ?" is one signature for every fact, so it dominates each band's
    // repetition budget. Re-dress a share of plain product-unknown items with
    // spoken stems or an emoji equal-groups/array picture (small products) —
    // the dot-paper stage of CPA, inline. Math and metadata are unchanged.
    if (!asStory && typeof item.a === "number" && typeof item.b === "number" && item.a * item.b === item.answer) {
      const dress = Math.random();
      const small = item.a <= 6 && item.b <= 6;
      if (dress < 0.3 && small) {
        const emoji = pick(["🍪", "⭐", "🍎", "🔵", "🐟"]);
        const rows = Array.from({ length: item.a }, () => emoji.repeat(item.b)).join("  |  ");
        question.display = {
          promptText: pick([
            `${rows} — ${item.a} groups with ${item.b} in each group. How many in all are there?`,
            `${rows} — ${item.a} rows of ${item.b}. How many altogether?`,
          ]),
        };
        question.answerType = "numberPad";
      } else if (dress < 0.6) {
        question.display = {
          promptText: pick([
            `What is ${item.a} times ${item.b}?`,
            `${item.a} groups of ${item.b}. What total do they make?`,
            `Count by ${item.b}, ${item.a} times. What number do you reach?`,
            item.a === 2 ? `Double ${item.b}! What is 2 times ${item.b}?` : `Multiply ${item.a} by ${item.b}. What do you get?`,
          ]),
        };
        question.answerType = "numberPad";
      }
    } else if (
      // Missing-factor renders ("3 x ? = 12") share one signature too. Spoken
      // stems keep the same unknown in the same place.
      !asStory && typeof item.a === "number" && typeof item.b === "number" &&
      item.a * item.answer === item.b && Math.random() < 0.5
    ) {
      question.display = {
        promptText: pick([
          `${item.a} times what number makes ${item.b}?`,
          `${item.a} groups of some number make ${item.b}. What number is in each group?`,
          `Fill it in: ${item.a} times what equals ${item.b}?`,
        ]),
      };
      question.answerType = "numberPad";
    }

    question.metadata = createQuestionMetadata({
      modeId: "multiplication",
      level,
      domain: "OA",
      cluster: "Multiply and divide within 100",
      subskill: structure.subskill,
      itemFamily,
      cognitiveDemand: deriveCognitiveDemand(structure, asStory),
      representation: asStory ? "verbalContext" : "symbolic",
      mathPractices: ["MP2", "MP7", "MP8"],
      standardRefs: ["3.OA", "4.OA"],
      misconceptionTags: misconceptionsFor(structure),
      blueprintId: `multiplication-${itemFamily}-${structure.id}`,
      structureType: structure.id,
    });

    // Same mathematics, asked another way (M3). Story items are left alone —
    // turning prose into an equation discards the context.
    return maybeApplyFormat(
      question,
      level,
      { actor: pickContext().actor, ...context },
      SUPPORTED_FORMATS
    );
  },

  generateChoices(answer, question) {
    return buildArithmeticDistractors({
      answer,
      a: question.a ?? 0,
      b: question.b ?? answer,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};

const pick = (arr) => arr[randInt(0, arr.length - 1)];

// Distractors should diagnose, so tags follow the structure rather than being a
// fixed list (spec §B6).
function misconceptionsFor(structure) {
  const tags = ["factNeighbor", "operationSwap", "offByOne"];
  if (structure.situation === "multCompare") tags.push("compareAsAdditive");
  return tags;
}
