/* Echo provider: deterministic stub for CI/dev that derives trivial
 * variants from the exemplars without any network call. Produces outputs
 * whose a/b/answer numbers are shifted by +0, +1, +2, etc. so the numeric
 * consistency + duplicate-prompt checks get exercised.
 *
 * This is useful for:
 *   - smoke-testing the pipeline wiring without incurring LLM costs
 *   - exercising the validator + writer paths in CI
 *   - keeping the pipeline runnable by contributors without API keys
 */

export async function generate({ exemplars, n = 6 }) {
  const out = [];
  for (const ex of exemplars) {
    for (let i = 0; i < Math.ceil(n / exemplars.length); i++) {
      const bump = i;
      const payload = clonePayloadWithBump(ex.payload, bump);
      if (!payload) continue;
      out.push({
        payload,
        structureType: ex.structureType,
        exemplarId: ex.exemplarId,
        notes: `echo variant of ${ex.exemplarId} (bump=${bump})`,
      });
      if (out.length >= n) break;
    }
    if (out.length >= n) break;
  }
  return out;
}

function clonePayloadWithBump(payload, bump) {
  if (!payload) return null;
  const next = { ...payload };
  if (typeof next.a === "number" && typeof next.b === "number" && next.op) {
    next.a = next.a + bump;
    next.answer = compute(next.op, next.a, next.b);
    if (next.answer == null) return null;
    const display = { ...(next.display || {}) };
    if (display.promptText) {
      // Replace the first numeric occurrence in the prompt with the bumped
      // value so prompts vary. Skip if it would break readability -- the
      // validator catches that later.
      display.promptText = display.promptText.replace(/\b\d+\b/, String(next.a));
    }
    next.display = display;
  }
  return next;
}

function compute(op, a, b) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
    case "\u2212":
      return a - b;
    case "*":
    case "\u00d7":
      return a * b;
    case "/":
    case "\u00f7":
      return b === 0 ? null : a / b;
    default:
      return null;
  }
}
