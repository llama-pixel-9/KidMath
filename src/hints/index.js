/**
 * hintFor(question) → what the hint pane shows:
 *   { title, modeTitle, idea, steps, example, visual }
 *
 * A v2 item carries its own hint (question.hint, see hintSchema.js), written
 * with the question so the panel matches the story on screen: its nudge is
 * the idea, its steps, example and picture win over the generic ones. Each
 * field falls back on its own when missing or malformed, so a v1 item — or
 * a partial hint — gets today's text: idea/example from CONCEPTS by mode ×
 * subskill (falling back to any mode that owns the subskill, then to the
 * mode's first entry); steps from the live question's numbers; visual the
 * same model the second chance draws (dots / array / strip / number line)
 * when one fits. Dependency-free apart from scaffold.js so the native
 * engine can bundle it.
 */
import { CONCEPTS, MODE_TITLES } from "./concepts.js";
import { stepsFor, numbersInPrompt } from "./steps.js";
import { usableHintFields } from "./hintSchema.js";
import { scaffoldFor } from "../scaffold.js";

export function conceptFor(mode, subskill) {
  const own = CONCEPTS[mode];
  if (own && subskill && own[subskill]) return own[subskill];
  if (subskill) {
    for (const entries of Object.values(CONCEPTS)) {
      if (entries[subskill]) return entries[subskill];
    }
  }
  if (own) return Object.values(own)[0];
  return {
    title: "Take it step by step",
    idea: "Read the question slowly. Find the numbers. Decide what the question is really asking before you answer.",
    example: { problem: "8 + 5", steps: ["8 needs 2 to make 10.", "5 − 2 = 3.", "10 + 3 = 13."], answer: "13" },
  };
}

const numbersIn = (s) => (String(s ?? "").match(/\d+(?:\.\d+)?/g) || []).map(Number);

/** True when a worked example is the live question itself: every number in
 * its problem is on screen and its answer is the key ("8 + 5 = 13" shown as
 * the worked example on the item 8 + 5). Then the entry's `alt` is shown. */
export function exampleIsLiveQuestion(example, question) {
  const shownNums = numbersIn(example?.problem);
  if (!shownNums.length || !question) return false;
  const onScreen = new Set([...numbersIn(question.display?.promptText ?? question.prompt), ...numbersInPrompt(question).map(Number)]);
  const a = question.answer;
  const keyNums = a && typeof a === "object" && "num" in a ? [Number(a.num), Number(a.den)] : numbersIn(a);
  const exampleAnswer = numbersIn(example.answer);
  return shownNums.every((n) => onScreen.has(n)) && keyNums.length > 0 && exampleAnswer[0] === keyNums[0];
}

export function hintFor(question) {
  const mode = question?.mode || question?.metadata?.modeId || "";
  const subskill = question?.metadata?.subskill || "";
  const concept = conceptFor(mode, subskill);
  const own = usableHintFields(question?.hint);
  const scaffold = scaffoldFor(question);
  return {
    title: concept.title,
    modeTitle: MODE_TITLES[mode] || "Math",
    idea: own.nudge ?? concept.idea,
    steps: own.steps ?? stepsFor(question),
    example: own.example ?? (concept.alt && exampleIsLiveQuestion(concept.example, question) ? concept.alt : concept.example),
    // The item's picture passes through as { kind, ...fields }; the pane
    // decides whether it can draw that kind.
    visual: own.picture ? { ...own.picture } : scaffold && scaffold.kind !== "look" ? scaffold : null,
  };
}
