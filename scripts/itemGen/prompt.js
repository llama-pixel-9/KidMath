// Shared prompt builder + response parser for the LLM item-draft providers.
// Used by providers/claude.js (single-cell) and generateBatch.js (Batch API).

function describeBand(band) {
  switch (band) {
    case "K-1":
    case "G1":
      return "Kindergarten to Grade 1 (small numbers, kid-scale contexts)";
    case "2-3":
    case "G2":
    case "G3":
      return "Grades 2 to 3 (numbers to ~1,000, familiar contexts)";
    case "4-5":
    case "G4":
      return "Grade 4 (multi-digit / fractions / decimals, more abstract contexts)";
    default:
      return band;
  }
}

// Build the user-message prompt for one (mode, subskill, family, band) cell.
// Cell metadata is read from the exemplars themselves.
export function buildCellPrompt({ exemplars, n = 6 }) {
  const ex = exemplars[0] || {};
  const payloads = exemplars.map((e) => e.payload);
  return [
    "You are an expert K-5 math item author writing new practice items for a kids' math game.",
    "",
    `Target cell:`,
    `- mode: ${ex.modeId}`,
    `- subskill: ${ex.subskill}`,
    `- item family: ${ex.itemFamily}`,
    `- grade band: ${describeBand(ex.levelBand)}`,
    `- structureType: ${ex.structureType}`,
    "",
    "Write EXACTLY " + n + " NEW items for this cell. Hard rules:",
    "1. Each item's `payload` must have the SAME shape as the exemplar payloads below",
    "   (same keys, same `display` structure).",
    "2. Numeric correctness is mandatory: `answer` must exactly equal the result of",
    "   applying `op` to `a` and `b` (or the stated relationship). Double-check every one.",
    "3. Numbers must fit the grade band above.",
    "4. Exactly one unambiguous answer per item; choose numbers that discourage guessing.",
    "5. Every `promptText` must be UNIQUE — different from the exemplars and from each",
    "   other. Vary contexts/nouns and phrasing.",
    "6. Do NOT copy wording verbatim from textbooks; author original prose.",
    "",
    "Exemplar payloads (canonical shape and register to mimic):",
    JSON.stringify(payloads, null, 2),
    "",
    "Output ONLY a JSON array of exactly " + n + " payload objects — no prose, no",
    "markdown fences, no explanation. Each element is the `payload` object itself.",
  ].join("\n");
}

// Parse a model response (raw text) into candidate items matching the provider
// contract: { payload, structureType, exemplarId, notes }. Defensive about
// stray prose / code fences around the JSON array.
export function parseCandidates(text, { exemplars, n = 6, model = "llm" }) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON array in model output: ${text.slice(0, 200)}`);
  }
  const arr = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("Parsed value is not an array");
  return arr.slice(0, n).map((payload, i) => ({
    payload,
    structureType: exemplars[0]?.structureType,
    exemplarId: exemplars[i % exemplars.length]?.exemplarId,
    notes: `${model} draft`,
  }));
}
