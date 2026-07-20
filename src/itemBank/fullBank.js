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

export const FULL_ITEMS = [
  ...APPLICATION_ITEM_BANK,
  ...CONCEPTUAL_ITEM_BANK,
  ...PROCEDURAL_ITEM_BANK,
];

export { APPLICATION_ITEM_BANK, CONCEPTUAL_ITEM_BANK, PROCEDURAL_ITEM_BANK };
