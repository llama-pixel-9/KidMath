#!/usr/bin/env node
/* Snapshot the live cloud item bank into the split per-mode files under
 * src/itemBank/items/ (+ the applicationItems.js aggregator) so the bundled
 * fallback stays current.
 *
 * Usage:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run bank:export
 *
 * Requires read access to public.item_bank where review_status='approved'.
 * Anonymous role works because of the SELECT-approved-for-authenticated
 * policy plus the public anon role. If your project restricts that, run
 * with a service role key in SUPABASE_SERVICE_ROLE_KEY instead.
 */

import { createClient } from "@supabase/supabase-js";
import { writeSplitBank } from "./lib/itemBankFiles.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing Supabase credentials. Set VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function rowToItem(row) {
  return {
    itemId: row.item_id,
    modeId: row.mode_id,
    itemFamily: row.item_family || "application",
    subskill: row.subskill,
    structureType: row.structure_type,
    levelRange: [Number(row.level_min), Number(row.level_max)],
    reviewStatus: row.review_status,
    question: row.payload,
  };
}

async function main() {
  const { data, error } = await supabase
    .from("item_bank")
    .select(
      "item_id, mode_id, item_family, subskill, structure_type, level_min, level_max, review_status, payload"
    )
    .eq("review_status", "approved")
    .order("mode_id", { ascending: true })
    .order("item_id", { ascending: true });

  if (error) {
    console.error("Failed to fetch from item_bank:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error("No approved items returned. Aborting export to avoid wiping the bundle.");
    process.exit(1);
  }

  const items = data.map(rowToItem);
  // Emit the split layout (per-mode files under src/itemBank/items/ + the
  // applicationItems.js aggregator) via the shared writer, so bank:export stays
  // consistent with the Phase 0.4 split instead of re-monolithing the bundle.
  const { modeOrder } = writeSplitBank(items);
  console.log(
    `Wrote ${items.length} items across ${modeOrder.length} per-mode files ` +
      "(src/itemBank/items/) + applicationItems.js aggregator."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
