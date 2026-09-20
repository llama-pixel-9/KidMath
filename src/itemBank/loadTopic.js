import { addBankItems } from "./index.js";
import { ensureModeLoaded } from "./modeLoader.js";

/**
 * Put a topic's bank items in memory and WAIT for them. Anything that draws
 * from a skill's own bank cell — a printed worksheet, a skill play session —
 * needs the rows before the first draw; the seed alone is a few items a cell.
 *
 * Without Supabase (local dev, e2e) the fetch fails; DEV then reads the full
 * corpus from disk. The branch is compiled out of the production bundle,
 * which must never carry the corpus — check `dist/` after touching this.
 */
export async function loadTopic(mode) {
  const result = await ensureModeLoaded(mode);
  if (result.status === "failed" && import.meta.env.DEV) {
    const { FULL_ITEMS } = await import("./fullBank.js");
    addBankItems(FULL_ITEMS.filter((item) => item.modeId === mode), "dev-disk");
    return { ...result, status: "loaded" };
  }
  return result;
}
