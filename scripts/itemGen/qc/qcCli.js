/**
 * Shared plumbing for the model-backed QC scripts (blindSolve.js,
 * kidSafeReview.js): argument parsing, the `claude -p` transport and
 * batching.
 *
 * TRANSPORT is the one judge.js uses, kept identical on purpose: Claude Code
 * headless on the developer's subscription (no ANTHROPIC_API_KEY, no
 * per-token bill), a system prompt via --append-system-prompt, the user
 * prompt on stdin, a JSON envelope back. When `claude` is not on PATH the
 * caller skips and says so: a QC tool that quietly does nothing is worse
 * than no QC tool. judge.js keeps its own copy of the transport for now.
 */

import { spawn } from "node:child_process";

export const BATCH_SIZE = 20;
export const DEFAULT_MODEL = process.env.KIDMATH_QC_MODEL || null; // let Claude Code pick by default

/**
 * Minimal argv parser: `--flag`, `--option value` or `--option=value`, and
 * bare positionals. An unknown `--x` is an error rather than a silent no-op
 * so a typo like `--dry_run` cannot start a paid run.
 */
export function parseArgs(argv, { flags = [], options = [] } = {}) {
  const out = { positional: [], flags: new Set(), options: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out.positional.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    if (flags.includes(name)) {
      out.flags.add(name);
    } else if (options.includes(name)) {
      const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
      if (value === undefined || value.startsWith("--")) throw new Error(`--${name} needs a value`);
      out.options[name] = value;
    } else {
      throw new Error(`unknown option --${name} (see --help)`);
    }
  }
  return out;
}

/** Is Claude Code available on PATH? */
export function claudeAvailable() {
  return new Promise((resolve) => {
    const probe = spawn("claude", ["--version"], { stdio: "ignore" });
    probe.on("error", () => resolve(false));
    probe.on("close", (code) => resolve(code === 0));
  });
}

/** One headless call; resolves to the model's reply text. */
export function runClaude(prompt, { system, model = DEFAULT_MODEL } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "json", "--append-system-prompt", system];
    if (model) args.push("--model", model);

    const child = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${err.trim()}`));
      try {
        // Headless JSON wraps the model's text in a result envelope.
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

/** The first JSON array in a reply, parsed. Throws when there is none. */
export function extractJsonArray(text) {
  const match = String(text).match(/\[[\s\S]*\]/);
  if (!match) throw new Error("model returned no JSON array");
  return JSON.parse(match[0]);
}

/**
 * Ask the model about `items` (each with an itemId), BATCH_SIZE at a time.
 * Resolves to { replies: Map(itemId -> reply), failures: Map(itemId -> why) }.
 * A batch whose call or parse fails lands every one of its items in
 * `failures` — a failed batch must never read as a clean batch. A reply
 * naming an itemId that was not in the batch is dropped.
 */
export async function askInBatches(items, { system, buildPrompt, model, log = () => {} }) {
  const replies = new Map();
  const failures = new Map();
  const batches = Math.ceil(items.length / BATCH_SIZE);
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    log(`batch ${i / BATCH_SIZE + 1}/${batches} (${batch.length} items)`);
    try {
      const text = await runClaude(buildPrompt(batch), { system, model });
      const ids = new Set(batch.map((b) => b.itemId));
      for (const reply of extractJsonArray(text)) {
        if (reply && typeof reply === "object" && ids.has(reply.itemId)) replies.set(reply.itemId, reply);
      }
    } catch (err) {
      for (const b of batch) failures.set(b.itemId, err.message);
    }
  }
  return { replies, failures };
}
