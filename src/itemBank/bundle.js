/**
 * The bundled (offline) item bank the APP ships with.
 *
 * This is the seed: a few items per (mode, family, band) cell so every mode
 * works during first paint, in tests, and when Supabase is offline. The rest of
 * a mode's items arrive via modeLoader.ensureModeLoaded() when the child opens
 * that mode.
 *
 * Bundling the whole corpus put 1.2 MB into a 1.9 MB app, so a child downloaded
 * 22 modes' questions before answering one. The full corpus now lives in
 * fullBank.js, which application code must not import.
 *
 * Regenerate the seed with: npm run bank:seed:build
 */
import { SEED_ITEMS } from "./seedItems.js";

export const BUNDLED_ITEMS = SEED_ITEMS;
export { SEED_ITEMS };
