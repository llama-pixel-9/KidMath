import { supabase } from "../supabaseClient.js";
import { switchMapFromRows } from "./versionRules.js";

// The rules themselves live in the dependency-free versionRules.js, which the
// native engine imports too, so iOS and the web serve by the same code.
export {
  DEFAULT_LIVE_VERSION,
  LIVE_VERSIONS,
  isServable,
  liveVersionFor,
  switchMapFromRows,
  topicVisible,
} from "./versionRules.js";

/**
 * Per-skill bank version switch (plan section 10).
 *
 * v1 rows are never edited: v2 items are new rows with `version = 2`, and the
 * `item_version_switch` table says, per skill, which version kids see:
 *
 *   v1       version-1 rows for everyone (the default, and what a missing
 *            table means)
 *   preview  version-2 rows for browsers with the preview marker, so Sai's
 *            students can pilot a skill without affecting anyone else
 *   v2       version-2 rows for everyone
 *
 * A topic with no v1 rows at all (Math Facts) has nothing to fall back to, so
 * it is live at v2 with no row; a row set to v1 (or preview) still hides it.
 *
 * The switch lives in the database rather than a deploy-time flag so a flip
 * (or a rollback) reaches the next session with no redeploy. Loaders read it
 * once per hydration and pass it to `isServable`. The iOS app reads the same
 * table in Swift and injects it into the engine (KidMath.setVersionSwitch in
 * src/engine/nativeEntry.js), which applies the same versionRules.js.
 */

const PREVIEW_KEY = "kidmath:previewV2";

let warnedLoad = false;

/**
 * Read the switch table. Resolves to Map(modeId -> "v1" | "preview" | "v2"),
 * or null when the read failed: Supabase unconfigured, the table missing
 * (migration not applied yet), or a policy or network error. Never rejects.
 * Callers that hold an earlier read keep it on null (getVersionSwitch in
 * cloudLoader.js, and BankService on iOS), so a failed re-read never rolls a
 * flipped skill back.
 *
 * Not paginated on purpose: the table holds one row per skill (25), far under
 * the 1,000-row cap that the item_bank reads have to page around.
 */
export async function readVersionSwitch() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("item_version_switch")
      .select("mode_id, live_version");
    if (error || !Array.isArray(data)) {
      // Once per session: a missing table before the migration is expected,
      // but a policy or network problem after it would otherwise hide as
      // "everything is v1".
      if (!warnedLoad) {
        warnedLoad = true;
        console.warn("[itemBank] item_version_switch unavailable; keeping the last read (or v1 for every skill)", error?.message || error);
      }
      return null;
    }
    return switchMapFromRows(data);
  } catch {
    return null;
  }
}

/**
 * The switch table as a Map, empty when the read fails: every skill then
 * behaves as its default (v1; Math Facts v2), which is the safe direction.
 * Never rejects.
 */
export async function loadVersionSwitch() {
  return (await readVersionSwitch()) ?? new Map();
}

/**
 * Whether this browser sees skills that are in `preview` as v2.
 *
 * The marker is localStorage `kidmath:previewV2 === "1"`, set by visiting any
 * page with `?preview=v2` (the same soft-gate pattern as the `?invite=1`
 * tester link: not a security boundary, RLS still decides what rows exist).
 * `?preview=v1` clears it so a tester can leave preview without devtools.
 * Reads the URL on every call so it needs no boot hook and stays correct in
 * tests that swap `window`.
 */
export function previewEnabled() {
  try {
    if (typeof window !== "undefined" && window.location?.search) {
      const wanted = new URLSearchParams(window.location.search).get("preview");
      if (wanted === "v2") setPreviewEnabled(true);
      else if (wanted === "v1") setPreviewEnabled(false);
    }
    return localStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    // No storage (private mode, Node): nobody is a preview user.
    return false;
  }
}

export function setPreviewEnabled(enabled) {
  try {
    if (enabled) localStorage.setItem(PREVIEW_KEY, "1");
    else localStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* private mode */
  }
}
