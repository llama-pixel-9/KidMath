import { REVIEW_STATUS } from "./applicationItems.js";

// Curated conceptual-family item bank.
//
// These items exercise understanding of the underlying structure of a skill
// (part-whole, equal groups, array, tens/ones decomposition, etc.) rather
// than a specific compute procedure or story context.
//
// Conventions:
// - itemId: `<mode>-conc-<3-digit-sequence>` (e.g. "addition-conc-001").
// - display may use representation shapes understood by MathExplorer and
//   PrintableWorksheet: `numberLine`, `tenFrame`, `array`, `placeValueBlocks`,
//   `decomposition`, or a plain `promptText`.
// - See docs/word-problem-authoring-guide.md and docs/mode-blueprints.md.
//
// Seeded empty: all entries are authored through the Admin review queue and
// LLM-draft pipeline. Approved items promoted here are snapshotted into the
// bundle via `npm run bank:seed` + `npm run bank:export`.

void REVIEW_STATUS;

export const CONCEPTUAL_ITEM_BANK = [];
