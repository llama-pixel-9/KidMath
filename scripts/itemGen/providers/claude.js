/* Claude provider: authors real draft items for one cell via a single
 * structured message. Slots into the existing per-cell orchestrator
 * (generateDrafts.js) as `--provider claude`. For bulk generation across many
 * cells at 50% cost, use scripts/itemGen/generateBatch.js instead.
 *
 * Needs @anthropic-ai/sdk (npm i -D @anthropic-ai/sdk) and credentials
 * (ANTHROPIC_API_KEY, or an `ant auth login` profile). Every item still lands
 * as reviewStatus=draft and must clear the numeric/duplicate gate in
 * validateDrafts.js and the admin review queue before any learner sees it.
 *
 * Model defaults to claude-sonnet-5 (the deliberate cost choice for bulk
 * content); override with KIDMATH_ITEMGEN_MODEL.
 */

import { buildCellPrompt, parseCandidates } from "../prompt.js";

const MODEL = process.env.KIDMATH_ITEMGEN_MODEL || "claude-sonnet-5";

export async function generate({ exemplars, n = 6 }) {
  if (!exemplars || exemplars.length === 0) return [];

  let Anthropic;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch {
    throw new Error(
      "The 'claude' provider requires @anthropic-ai/sdk. Install it with " +
        "`npm i -D @anthropic-ai/sdk` and set ANTHROPIC_API_KEY (or run `ant auth login`)."
    );
  }

  const client = new Anthropic();
  const prompt = buildCellPrompt({ exemplars, n });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return parseCandidates(text, { exemplars, n, model: MODEL });
}
