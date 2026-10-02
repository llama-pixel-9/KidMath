import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata } from "./itemMetadata";
import { randInt } from "./helpers";
import { opGlyph } from "../opSigns.js";

/**
 * Word Problems: every add and subtract story kind as its own topic (Sai,
 * 2026-10-02), later the multiply and divide stories as their own skills.
 * Each catalog skill is one grade and one story kind (src/skills/catalog.js).
 *
 * v2 only, and hidden until Sai flips it at /admin/switch: its default live
 * version is `preview` (src/itemBank/versionRules.js), so with no switch row
 * only preview viewers see it. Its stories are v2 bank rows only; none exist
 * yet (the Grade 2 blueprint rows are drafts awaiting Sai).
 *
 * The generator below is the empty-cell fallback and NEVER writes story
 * prose (Sai does not want generator stories). Whatever it is asked for, it
 * builds one bare number sentence with one blank, within Grade 2's range
 * (within 100): 46 + ? = 72, ? + 27 = 61, 75 − ? = 38, ? − 27 = 38. No
 * context sentence, so no decorative context. Subskill missingNumber, family
 * conceptual, answered from four options whose wrong ones each name a
 * misconception (src/modes/distractors.js).
 *
 * Levels are the bank band on the Grade 1–4 axis (src/bands.js levelToGrade):
 * Grade 2 is levels 4–6. Levels outside it build Grade 2's nearest band.
 */

export const SUBSKILLS = ["changeStories", "partWholeStories", "compareStories", "twoStepStories", "missingNumber"];

/** Grade 2's levels: the band every Grade 2 skill and its rows sit in. */
export const GRADE2_LEVELS = [4, 6];

/**
 * The blank in a number sentence, as the child sees it. The spec's "box"
 * (46 + □ = 72) is drawn as "?", the blank every other number sentence in the
 * app uses (the balanceOpen format, missing-addend rows, Math Facts), so the
 * QC gate (src/itemBank/qc/checks.js), the read-aloud ("what",
 * src/speakable.js) and the robot-kid oracle all read it as the blank.
 */
export const BLANK = "?";

/**
 * The numbers of the hint pane's worked example (src/hints/concepts.js,
 * missingNumber: 35 + ? = 61). A kid's own question never uses them, so the
 * example never shows the kid's answer (wordProblems.spec ties the two).
 */
export const HINT_EXAMPLE = Object.freeze({ part: 35, missing: 26, whole: 61 });

// Per level inside Grade 2's band: the size of the whole, and whether the
// ones carry (add) or need a ten broken (subtract).
const RANGES = {
  4: { whole: [20, 60], regroup: "none" },
  5: { whole: [30, 99], regroup: "any" },
  6: { whole: [30, 99], regroup: "required" },
};

/** The four places the blank can sit in a part + part = whole sentence. */
export const SHAPES = ["box-add-change", "box-add-start", "box-sub-change", "box-sub-start"];

const pick = (list) => list[randInt(0, list.length - 1)];

function bandLevel(level) {
  const n = Number.isFinite(level) ? Math.round(level) : GRADE2_LEVELS[0];
  return Math.min(GRADE2_LEVELS[1], Math.max(GRADE2_LEVELS[0], n));
}

const carries = (x, y) => (x % 10) + (y % 10) >= 10;

/**
 * Two parts and their whole for a level: parts of at least 2, never equal
 * (an equal part would put the answer in the sentence), whole within 100,
 * never the hint example's numbers.
 */
export function partsForLevel(level) {
  const { whole: [lo, hi], regroup } = RANGES[bandLevel(level)];
  for (let tries = 0; tries < 200; tries += 1) {
    const whole = randInt(lo, hi);
    const p1 = randInt(2, whole - 2);
    const p2 = whole - p1;
    if (p2 < 2 || p1 === p2) continue;
    if (whole === HINT_EXAMPLE.whole && (p1 === HINT_EXAMPLE.part || p1 === HINT_EXAMPLE.missing)) continue;
    if (regroup === "none" && carries(p1, p2)) continue;
    if (regroup === "required" && !carries(p1, p2)) continue;
    return { p1, p2, whole };
  }
  // Never reached in practice: a fixed sentence that fits the band's rule
  // keeps the generator total.
  return regroup === "required" ? { p1: 46, p2: 26, whole: 72 } : { p1: 23, p2: 14, whole: 37 };
}

/**
 * The sentence for a shape. `a`/`b` are the rendered slots (null for the
 * blank, as bank rows store it); `givens` are the two numbers shown, for the
 * distractor builders and the steps.
 */
function sentence(shape, { p1, p2, whole }) {
  const plus = opGlyph("+");
  const minus = opGlyph("-");
  switch (shape) {
    case "box-add-change":
      return {
        a: p1, b: null, op: "+", answer: p2, givens: { a: p1, b: whole },
        promptText: `${p1} ${plus} ${BLANK} = ${whole}`,
        // Adding the two numbers shown; a slipped ten.
        misconceptionTags: ["equalsMeansCompute", "placeValueSlip", "offByOne"],
        hint: {
          nudge: `Think: ${p1} and what number make ${whole}?`,
          steps: [`Start at ${p1}.`, `Count up to ${whole} in jumps: tens first, then ones.`, "Add up your jumps. That is the missing number."],
        },
      };
    case "box-add-start":
      return {
        a: null, b: p2, op: "+", answer: p1, givens: { a: p2, b: whole },
        promptText: `${BLANK} ${plus} ${p2} = ${whole}`,
        misconceptionTags: ["startAsResult", "placeValueSlip", "offByOne"],
        hint: {
          nudge: `Think: what number and ${p2} make ${whole}?`,
          steps: ["The missing number is one part. The number after = is the whole.", `Count up from ${p2} to ${whole} in jumps: tens first, then ones.`, "Add up your jumps. That is the missing number."],
        },
      };
    case "box-sub-change":
      return {
        a: whole, b: null, op: "-", answer: p1, givens: { a: whole, b: p2 },
        promptText: `${whole} ${minus} ${BLANK} = ${p2}`,
        // Adding instead of taking away; a slipped ten.
        misconceptionTags: ["operationSwap", "placeValueSlip", "offByOne"],
        hint: {
          nudge: `Think: ${whole} take away what number leaves ${p2}?`,
          steps: [`Start at ${p2}.`, `Count up to ${whole} in jumps: tens first, then ones.`, "Add up your jumps. That is the missing number."],
        },
      };
    case "box-sub-start":
      return {
        a: null, b: p1, op: "-", answer: whole, givens: { a: p1, b: p2 },
        promptText: `${BLANK} ${minus} ${p1} = ${p2}`,
        // Taking away the two numbers shown instead of putting them back
        // together; a slipped ten.
        misconceptionTags: ["operationSwap", "placeValueSlip", "offByOne"],
        hint: {
          nudge: `Think: what number take away ${p1} leaves ${p2}?`,
          steps: ["The missing number is the number you start with.", `Put back what was taken away: ${p2} and ${p1} more.`, `Add ${p2} ${plus} ${p1} to find the missing number.`],
        },
      };
    default:
      throw new Error(`unknown word problems shape: ${shape}`);
  }
}

/** One bare number sentence with a blank, as a served question with its metadata. */
export function buildMissingNumberQuestion(level, shape = pick(SHAPES)) {
  const s = sentence(shape, partsForLevel(level));
  const question = {
    a: s.a,
    b: s.b,
    op: s.op,
    answer: s.answer,
    level,
    display: { promptText: s.promptText },
    distractorContext: s.givens,
    hint: s.hint,
  };
  question.metadata = createQuestionMetadata({
    modeId: "wordProblems",
    // The numbers are Grade 2's whatever level was asked, so is the label
    // (gradeBand); question.level keeps the level the engine asked for.
    level: bandLevel(level),
    domain: "NBT",
    cluster: "Add and subtract within 100",
    subskill: "missingNumber",
    itemFamily: "conceptual",
    cognitiveDemand: "DOK2",
    representation: "symbolic",
    mathPractices: ["MP2", "MP7"],
    standardRefs: ["2.NBT.B.5"],
    misconceptionTags: s.misconceptionTags,
    blueprintId: `wordProblems-conceptual-${shape}`,
    structureType: shape,
  });
  return question;
}

export default {
  id: "wordProblems",
  label: "Word Problems",
  shortLabel: "Word Problems",
  description: "Add and subtract stories.",
  icon: "Plus",
  glyph: "+−",
  op: "+",
  subskills: SUBSKILLS,
  // Grade 2 only for now: every subskill lives in Grade 2's band.
  subskillLevels: Object.fromEntries(SUBSKILLS.map((s) => [s, GRADE2_LEVELS])),
  supportedFormats: [],
  // Stories (application) and the box sentences and choose-the-sentence
  // reasoning rows (conceptual); no procedural drills.
  families: ["application", "conceptual"],
  // The fallback generator writes only bare box sentences; stories come from
  // bank rows alone (modes.spec reads this).
  generatedFamilies: ["conceptual"],
  // No v1 rows: shown only where its switch serves v2 (topicVisible). Its
  // default with no switch row is preview (DEFAULT_LIVE_VERSION).
  v2Only: true,

  // Whatever family or subskill is asked for, never a story (see above).
  generate(level) {
    return buildMissingNumberQuestion(level);
  },

  generateChoices(answer, question) {
    const givens = question?.distractorContext || { a: question?.a ?? 0, b: question?.b ?? answer };
    return buildArithmeticDistractors({
      answer,
      a: givens.a ?? 0,
      b: givens.b ?? answer,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};
