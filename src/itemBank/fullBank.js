/**
 * The complete curated corpus.
 *
 * Imported ONLY by tests, scripts and the seed builder — never by application
 * code, so Vite does not pull 1.2 MB of items into the browser bundle. The app
 * ships `seedItems.js` and fetches the rest per mode (see modeLoader.js).
 *
 * If you find yourself importing this from src/ outside a test, you probably
 * want `getBankItems()` instead.
 */
import { APPLICATION_ITEM_BANK } from "./applicationItems.js";
import { CONCEPTUAL_ITEM_BANK } from "./conceptualItems.js";
import { PROCEDURAL_ITEM_BANK } from "./proceduralItems.js";
import { factBankItems } from "../facts/factItems.js";
import { modelBankItems } from "./v2/modelRows.js";

// Math Facts rows are built from the fact lists rather than stored: the
// database gets the same rows from the same function
// (scripts/facts/generateFacts.mjs), so the two cannot drift, and a
// `bank:export` (which rewrites items/ from version-1 rows) cannot drop them.
export const FACT_ITEMS = factBankItems();

// Version-2 rows the live step wrote, refilled from the committed manifests
// (src/itemBank/v2/manifests/) the same way: the database got the same rows
// from the same models and seeds. No manifest, no rows.
export const MODEL_ITEMS = modelBankItems();

export const FULL_ITEMS = [
  ...APPLICATION_ITEM_BANK,
  ...CONCEPTUAL_ITEM_BANK,
  ...PROCEDURAL_ITEM_BANK,
  ...FACT_ITEMS,
  ...MODEL_ITEMS,
];

export { APPLICATION_ITEM_BANK, CONCEPTUAL_ITEM_BANK, PROCEDURAL_ITEM_BANK };
