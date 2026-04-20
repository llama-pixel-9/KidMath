/* Write a batch of validated draft items to Supabase as reviewStatus=draft
 * rows. Safe no-op when SUPABASE_SERVICE_ROLE_KEY is not set so the pipeline
 * is usable in dry-run mode without credentials.
 */

export async function writeDrafts(items, { dryRun = false } = {}) {
  if (!Array.isArray(items) || items.length === 0) return { wrote: 0 };
  if (dryRun) {
    for (const item of items) {
      process.stdout.write(`[dryRun] would upsert ${item.itemId}\n`);
    }
    return { wrote: 0, dryRun: true };
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required unless --dryRun is set.");
  }

  const rows = items.map((item) => ({
    item_id: item.itemId,
    mode_id: item.modeId,
    item_family: item.itemFamily,
    subskill: item.subskill,
    structure_type: item.structureType,
    level_min: item.levelRange[0],
    level_max: item.levelRange[1],
    review_status: item.reviewStatus,
    payload: item.question,
    representation_type: item.representationType || null,
    source: item.source || null,
  }));

  const resp = await fetch(`${url}/rest/v1/item_bank?on_conflict=item_id`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Supabase upsert failed (${resp.status}): ${text}`);
  }
  return { wrote: rows.length };
}
