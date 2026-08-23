// Prompt layout for object-set pictures embedded in prompt text.
//
// Prompts like "Group A: 🍪🍪🍪 Group B: 🍪🍪 …" or "A jar holds these beads:
// ⚫×30 …" render as one long unbreakable word: labels wrap mid-pair and long
// runs overflow the question card. These helpers split such prompts into
// labelled lines — each "Label: run" on its own line so the labels start at
// the same point — and chunk runs longer than ten glyphs into rows of ten, so
// counting in tens is visible. Pure functions, shared by the renderer and its
// spec.

const EMOJI_GROUP = "(?:\\p{Extended_Pictographic}[\\uFE0F\\u200D]*){2,}";
const EMOJI_RUN_RE = new RegExp(`${EMOJI_GROUP}(?:[ ]+${EMOJI_GROUP})*`, "gu");
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+/;
const RUN_ROW_GLYPHS = 10;
const LABEL_INLINE_MAX = 22;

// Reflow one emoji run into rows of at most ten glyphs, keeping any authored
// sub-grouping ("🍎🍎  🍎🍎" pairs) intact within a row.
export function chunkEmojiRun(run) {
  const glyphs = (s) => Array.from(s).length;
  const groups = run.split(/\s+/).filter(Boolean).flatMap((g) => {
    if (glyphs(g) <= RUN_ROW_GLYPHS) return [g];
    const chars = Array.from(g);
    const pieces = [];
    for (let i = 0; i < chars.length; i += RUN_ROW_GLYPHS) {
      pieces.push(chars.slice(i, i + RUN_ROW_GLYPHS).join(""));
    }
    return pieces;
  });
  const rows = [];
  let row = "";
  let count = 0;
  for (const g of groups) {
    const n = glyphs(g);
    if (count > 0 && count + n > RUN_ROW_GLYPHS) {
      rows.push(row);
      row = "";
      count = 0;
    }
    row = row ? `${row}  ${g}` : g;
    count += n;
  }
  if (row) rows.push(row);
  return rows;
}

// Returns [{text, isRun}] lines when the prompt contains emoji runs, else null.
export function emojiPromptLines(promptText) {
  if (!promptText || typeof promptText !== "string") return null;
  const matches = [...promptText.matchAll(EMOJI_RUN_RE)];
  if (matches.length === 0) return null;
  const lines = [];
  const pushSentences = (text) =>
    text.split(SENTENCE_SPLIT_RE).filter(Boolean).forEach((s) => lines.push({ text: s, isRun: false }));
  let last = 0;
  for (const m of matches) {
    const pre = promptText.slice(last, m.index).trim();
    last = m.index + m[0].length;
    let label = "";
    // Bare separators between runs (the "|" between array rows) are dropped —
    // the line break already separates the rows.
    if (pre && !/^[|—–-]+$/.test(pre)) {
      const sentences = pre.split(SENTENCE_SPLIT_RE).filter(Boolean);
      label = sentences.pop() || "";
      sentences.forEach((s) => lines.push({ text: s, isRun: false }));
    }
    const rows = chunkEmojiRun(m[0].trim());
    // A short label ("Group A:") shares the line with its run. A sentence-long
    // label ("Priya counted these cars and said 17:") plus a run of ten is
    // wider than the card, so it becomes its own text line above the picture.
    const shortLabel = label && label.length <= LABEL_INLINE_MAX;
    if (shortLabel && rows.length === 1) {
      // `label`/`run` are kept apart so the renderer can space out the run's
      // glyphs without stretching the label's letters.
      lines.push({ text: `${label} ${rows[0]}`, isRun: true, label, run: rows[0] });
    } else {
      if (label) lines.push({ text: label, isRun: false });
      rows.forEach((r) => lines.push({ text: r, isRun: true, run: r }));
    }
  }
  const tail = promptText.slice(last).trim().replace(/^[—–-]\s*/, "");
  if (tail) pushSentences(tail);
  return lines;
}
