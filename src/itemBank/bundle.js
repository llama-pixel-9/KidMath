import { APPLICATION_ITEM_BANK } from "./applicationItems.js";
import { CONCEPTUAL_ITEM_BANK } from "./conceptualItems.js";
import { PROCEDURAL_ITEM_BANK } from "./proceduralItems.js";

// Single aggregated snapshot of the bundled (offline) item bank. The cloud
// loader replaces this in-memory after authentication; this bundle guarantees
// the app works during first paint, in tests, and when Supabase is offline.
export const BUNDLED_ITEMS = [
  ...APPLICATION_ITEM_BANK,
  ...CONCEPTUAL_ITEM_BANK,
  ...PROCEDURAL_ITEM_BANK,
];

export { APPLICATION_ITEM_BANK, CONCEPTUAL_ITEM_BANK, PROCEDURAL_ITEM_BANK };
