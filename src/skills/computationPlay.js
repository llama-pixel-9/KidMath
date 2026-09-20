/* A computation skill as a PLAY question.
 *
 * "Subtract 3-digit numbers with regrouping" is a drill built to a claim
 * (worksheets/computationSampler.js) — the bank cannot promise it and neither
 * can the mode generators. In play it has to look exactly like the arithmetic
 * modes' own symbolic questions so everything downstream just works: the
 * question card's column layout, misconception-linked choices
 * (generateChoices reads `distractorContext`), hints, the mistake bank, and
 * the practice log. The mode's generator supplies the metadata scaffold, as it
 * does for bank items (buildBankQuestion).
 */
import { finalizeQuestion, generateChoices, questionAnswerType } from "../mathEngine.js";
import { getModeConfig } from "../modes/index.js";
import { sampleComputation } from "../worksheets/computationSampler.js";

// A three-digit answer is typed, not picked: four look-alike options turn
// column arithmetic into spotting the odd one out.
const TYPE_IT_FROM = 100;

export function computationKeyOf(q) {
  return `${q.op}:${q.a},${q.b}`;
}

export function buildComputationQuestion(skill, { avoidKeys = [] } = {}) {
  const avoid = new Set(avoidKeys);
  let built = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = sampleComputation(skill.source, skill.mode);
    if (!candidate) break;
    built = candidate;
    if (!avoid.has(computationKeyOf(candidate))) break;
  }
  if (!built) throw new Error(`No computation could be built for skill ${skill.id}`);

  const scaffold = getModeConfig(skill.mode).generate(skill.level, { itemFamily: "procedural", allowWordProblems: false });
  const question = finalizeQuestion(skill.mode, null, {
    a: built.a,
    b: built.b,
    op: built.op,
    answer: built.answer,
    level: skill.level,
    distractorContext: { a: built.a, b: built.b },
    ...(built.answer >= TYPE_IT_FROM ? { answerType: "numberPad" } : {}),
    metadata: {
      ...(scaffold.metadata || {}),
      modeId: skill.mode,
      itemFamily: "procedural",
      itemSource: "skillSampler",
      itemId: null,
      structureType: "computation",
      blueprintId: `skill-${skill.id}`,
    },
  });
  if (questionAnswerType(question) === "choice") {
    question.choices = generateChoices(question.answer, 4, question);
  }
  return question;
}
