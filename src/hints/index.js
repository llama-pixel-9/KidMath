/**
 * hintFor(question) → what the hint pane shows:
 *   { title, modeTitle, idea, steps, example, visual }
 *
 * idea/example come from CONCEPTS by mode × subskill (falling back to any
 * mode that owns the subskill, then to the mode's first entry); steps come
 * from the live question's numbers; visual is the same model the second
 * chance draws (dots / array / strip / number line) when one fits.
 * Dependency-free apart from scaffold.js so the native engine can bundle it.
 */
import { CONCEPTS, MODE_TITLES } from "./concepts.js";
import { stepsFor } from "./steps.js";
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

export function hintFor(question) {
  const mode = question?.mode || question?.metadata?.modeId || "";
  const subskill = question?.metadata?.subskill || "";
  const concept = conceptFor(mode, subskill);
  const scaffold = scaffoldFor(question);
  return {
    title: concept.title,
    modeTitle: MODE_TITLES[mode] || "Math",
    idea: concept.idea,
    steps: stepsFor(question),
    example: concept.example,
    visual: scaffold && scaffold.kind !== "look" ? scaffold : null,
  };
}
