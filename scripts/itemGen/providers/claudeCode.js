/* Claude Code provider: authors real draft items for one cell by shelling out
 * to `claude -p` (Claude Code headless) instead of the raw Anthropic API.
 *
 * This is the provider to use on a Claude subscription (Pro/Max): it runs on
 * that subscription with NO ANTHROPIC_API_KEY and NO separate pay-per-token
 * bill. Slots into generateDrafts.js as `--provider claudeCode`.
 *
 * Trade-off vs. the `claude` provider (raw SDK) and generateBatch.js (Batch
 * API): those can use the Batch API's async 50%-off pricing for a large push,
 * but they cost real API dollars. This costs subscription usage instead. For
 * bulk mechanical authoring, point it at a cheaper model with
 * KIDMATH_ITEMGEN_MODEL=haiku (or claude-haiku-4-5) — Haiku is plenty for
 * generating variants against a fixed exemplar, and every item still has to
 * clear validateDrafts + structureCheck + the admin review queue regardless of
 * which model wrote it.
 *
 * Model: defaults to whatever Claude Code picks; override with
 * KIDMATH_ITEMGEN_MODEL (e.g. "haiku", "sonnet", or a full id).
 */

import { spawn } from "node:child_process";
import { buildCellPrompt, parseCandidates } from "../prompt.js";

const MODEL = process.env.KIDMATH_ITEMGEN_MODEL || null;

function claudeAvailable() {
  return new Promise((resolve) => {
    const probe = spawn("claude", ["--version"], { stdio: "ignore" });
    probe.on("error", () => resolve(false));
    probe.on("close", (code) => resolve(code === 0));
  });
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "json"];
    if (MODEL) args.push("--model", MODEL);

    const child = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${err.trim()}`));
      try {
        const envelope = JSON.parse(out);
        resolve(envelope.result ?? "");
      } catch (e) {
        reject(new Error(`could not parse claude output: ${e.message}`));
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function generate({ exemplars, n = 6 }) {
  if (!exemplars || exemplars.length === 0) return [];

  if (!(await claudeAvailable())) {
    throw new Error(
      "The 'claudeCode' provider needs the `claude` CLI (Claude Code) on PATH. " +
        "Install it and sign in with your Claude subscription — no API key required."
    );
  }

  const prompt = buildCellPrompt({ exemplars, n });
  const text = await runClaude(prompt);
  return parseCandidates(text, { exemplars, n, model: MODEL || "claude-code" });
}
