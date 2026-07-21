/** Format a bank item's answer for display in the review UI.
 *
 * Answers come in several shapes: plain numbers, fractions {num,den}, arrays
 * (multi-answer items), symbols, and strings (true/false). A blank card answer
 * would make review useless, so every shape renders to something readable.
 */
export function formatAnswer(answer) {
  if (answer == null) return "—";
  if (Array.isArray(answer)) return answer.map(formatAnswer).join(", ");
  if (typeof answer === "object" && "num" in answer && "den" in answer) {
    return `${answer.num}/${answer.den}`;
  }
  return String(answer);
}
