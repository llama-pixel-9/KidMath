import { describe, it, expect } from "vitest";
import { emojiPromptLines, chunkEmojiRun } from "../promptLayout";
import countingMode from "../modes/counting";

// Issue #29: "Group A: 🍪… Group B: 🍪…" rendered as one wrapping inline line,
// and a 30-bead estimation run overflowed the question card. The renderer now
// splits these prompts into labelled lines and chunks runs into rows of ten.
describe("emojiPromptLines", () => {
  it("returns null for prompts without emoji runs", () => {
    expect(emojiPromptLines("Start at 5 and count on 3 more. What number do you land on?")).toBeNull();
    expect(emojiPromptLines("")).toBeNull();
    expect(emojiPromptLines(null)).toBeNull();
  });

  it("keeps a single inline emoji as plain text", () => {
    expect(emojiPromptLines("Count the 🍎 by 2s. How many?")).toBeNull();
  });

  it("puts Group A and Group B on their own lines with the question after", () => {
    const lines = emojiPromptLines("Group A: 🍪🍪🍪🍪🍪 Group B: 🍪🍪🍪 Which group has more?");
    expect(lines.map((l) => l.text)).toEqual([
      "Group A: 🍪🍪🍪🍪🍪",
      "Group B: 🍪🍪🍪",
      "Which group has more?",
    ]);
    expect(lines[0].isRun).toBe(true);
    expect(lines[1].isRun).toBe(true);
    expect(lines[2].isRun).toBe(false);
  });

  it("chunks a long bead run into rows of ten under its label", () => {
    const beads = "🟠".repeat(34);
    const lines = emojiPromptLines(`A jar holds these beads: ${beads} About how many beads is that?`);
    expect(lines.map((l) => l.text)).toEqual([
      "A jar holds these beads:",
      "🟠".repeat(10),
      "🟠".repeat(10),
      "🟠".repeat(10),
      "🟠".repeat(4),
      "About how many beads is that?",
    ]);
  });

  it("drops bare | separators so array rows become their own lines", () => {
    const lines = emojiPromptLines("🍪🍪🍪  |  🍪🍪🍪 — 2 rows of 3. How many altogether?");
    expect(lines.map((l) => l.text)).toEqual([
      "🍪🍪🍪",
      "🍪🍪🍪",
      "2 rows of 3.",
      "How many altogether?",
    ]);
  });

  it("keeps authored pair grouping intact when packing rows", () => {
    // 8 pairs = 16 glyphs -> a row of five pairs then a row of three.
    const pairs = Array.from({ length: 8 }, () => "🍎🍎").join("  ");
    expect(chunkEmojiRun(pairs)).toEqual([
      Array.from({ length: 5 }, () => "🍎🍎").join("  "),
      Array.from({ length: 3 }, () => "🍎🍎").join("  "),
    ]);
  });

  it("lays out every emoji-carrying counting variety without overflow-width rows", () => {
    // maybeApplyFormat sometimes re-dresses an item without its emoji run
    // ("20 = 20"), so only run-carrying prompts are asserted — but each
    // variety must produce at least a few of them across the sample.
    const runVarieties = ["arrangementInvariance", "compareTwoSets", "estimateThenCount"];
    for (const varietyId of runVarieties) {
      let seen = 0;
      for (let i = 0; i < 40; i += 1) {
        const q = countingMode.generate(varietyId === "estimateThenCount" ? 5 : 1, { varietyId });
        const lines = emojiPromptLines(q.display?.promptText || "");
        if (!lines) continue;
        seen += 1;
        for (const line of lines.filter((l) => l.isRun)) {
          // A run row never exceeds ten glyphs plus an optional short label.
          const runGlyphs = Array.from(line.text).filter((c) => /\p{Extended_Pictographic}/u.test(c));
          expect(runGlyphs.length, line.text).toBeLessThanOrEqual(10);
        }
      }
      expect(seen, `${varietyId} should produce run prompts`).toBeGreaterThan(3);
    }
  });
});

describe("sentence-long labels", () => {
  it("puts a long label on its own text line instead of gluing it to the run", () => {
    const lines = emojiPromptLines("Priya counted these cars and said 17: 🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗 Priya skipped one. How many cars are there really?");
    expect(lines.filter((l) => !l.isRun).map((l) => l.text)).toEqual([
      "Priya counted these cars and said 17:",
      "Priya skipped one.",
      "How many cars are there really?",
    ]);
    expect(lines.filter((l) => l.isRun).every((l) => !l.label)).toBe(true);
  });

  it("keeps a short label inline with a single-row run", () => {
    const lines = emojiPromptLines("Group A: 🍪🍪🍪 How many?");
    expect(lines[0]).toMatchObject({ isRun: true, label: "Group A:" });
  });
});
