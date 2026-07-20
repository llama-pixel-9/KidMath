/**
 * Pass 2 — the judgment pass.
 *
 * Only asked about what code cannot decide. Everything checkable (arithmetic,
 * structure match, grammar agreement, band appropriateness, distractor sanity)
 * has already been decided deterministically in checks.js; re-asking a model
 * about those would add cost and a correlated blind spot without adding
 * information.
 *
 * What a model IS good for here:
 *   - does this read naturally to a 6-9 year old
 *   - is the situation coherent (can you actually eat a bookshelf?)
 *   - does it assume knowledge or culture a child may not have
 *   - is there an ambiguity that would make a correct answer look wrong
 *
 * Items are judged in batches with a strict JSON contract. If no API key is
 * configured the pass is skipped and says so, rather than silently returning
 * "everything is fine" — a QC tool that quietly does nothing is worse than no
 * QC tool.
 */

const MODEL = process.env.KIDMATH_QC_MODEL || "claude-sonnet-5";
const BATCH_SIZE = 20;

const SYSTEM = `You review maths word problems for a children's app (ages 5-10, US K-4).

The arithmetic, the problem structure, the grammar and the answer have ALREADY
been verified by code. Do not re-check them and do not comment on them.

Judge ONLY what code cannot:
1. Readability — would a child of this age read this fluently? Flag long or
   uncommon words, tangled clauses, or an unclear question sentence.
2. Coherence — is the situation physically and socially sensible?
3. Assumed knowledge — does it depend on a specific culture, brand, sport or
   experience a child might not have?
4. Ambiguity — could a child reasonably read it a second way and give a
   different, defensible answer? This is the most important one: an ambiguous
   item marks a thinking child wrong.

Be specific and be sparing. Flag an item only if you would genuinely change it.
A slightly plain sentence is fine; the bar is "would this confuse or mislead a
child", not "could this be more elegant".

Reply with JSON only: an array of objects
  {"itemId": string, "acceptable": boolean, "reason": string}
Include EVERY item you were given. Set reason to "" when acceptable is true.`;

function buildUserMessage(items) {
  return items
    .map(
      (i) =>
        `itemId: ${i.itemId}\nage band: levels ${i.levelRange?.join("-") || "?"}\nprompt: ${i.question?.display?.promptText}`
    )
    .join("\n\n");
}

async function judgeBatch(items) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: buildUserMessage(items) }],
    }),
  });

  if (!res.ok) {
    throw new Error(`QC judge request failed (${res.status}): ${await res.text()}`);
  }

  const body = await res.json();
  const text = body.content?.map((c) => c.text).join("") || "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("QC judge returned no JSON array");

  const parsed = JSON.parse(match[0]);
  const byId = new Map(items.map((i) => [i.itemId, i]));
  return parsed
    .filter((r) => byId.has(r.itemId))
    .map((r) => ({
      itemId: r.itemId,
      acceptable: Boolean(r.acceptable),
      reason: r.reason || "",
      prompt: byId.get(r.itemId).question?.display?.promptText,
    }));
}

export async function judgeItems(items) {
  if (!items.length) return [];
  if (!process.env.ANTHROPIC_API_KEY) {
    process.stderr.write(
      "QC judgment pass SKIPPED: ANTHROPIC_API_KEY is not set. " +
        "Deterministic results below are complete; the judgment pass ran on 0 items.\n"
    );
    return [];
  }

  const out = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    try {
      const judged = await judgeBatch(batch);
      if (judged) out.push(...judged);
    } catch (err) {
      // A failed batch must not be reported as a clean batch.
      process.stderr.write(`QC judge batch ${i / BATCH_SIZE} failed: ${err.message}\n`);
      out.push(
        ...batch.map((item) => ({
          itemId: item.itemId,
          acceptable: false,
          reason: `judgment pass failed: ${err.message}`,
          prompt: item.question?.display?.promptText,
        }))
      );
    }
  }
  return out;
}
