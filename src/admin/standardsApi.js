import { supabase } from "../supabaseClient.js";
import { FRAMEWORKS } from "../standards/index.js";
import { rowToCoverage } from "../standards/coverage.js";

/**
 * Admin reads for the Standards tab: the computed `standard_coverage` view
 * and, for one code, the plan rows and models that count toward it. Read
 * only; codes are loaded from the repo files (scripts/standards/loadStandards.js)
 * and plan rows are approved in the database. All tables are admin-only by RLS.
 */

const COVERAGE_FIELDS =
  "framework, code, grade, domain, summary, kind, in_scope, scope_note, parent_code, sort_order, " +
  "planned_rows, models_drafted, models_approved, items_ready, items_preview, items_live, needs_look, status";

function client() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

/**
 * The frameworks with codes in the database. One count per framework, so
 * nothing here reads the whole table.
 */
export async function listLoadedFrameworks() {
  const db = client();
  const counts = await Promise.all(
    FRAMEWORKS.map(async (framework) => {
      const { count, error } = await db
        .from("standards")
        .select("code", { count: "exact", head: true })
        .eq("framework", framework);
      if (error) throw error;
      return [framework, count || 0];
    })
  );
  return counts.filter(([, n]) => n > 0).map(([framework, n]) => ({ framework, codes: n }));
}

/**
 * One framework and grade, in the file's order. A grade is at most a few
 * dozen codes (Common Core Grade 5 is 40), far under the 1,000-row cap.
 */
export async function listCoverage(framework, grade) {
  const { data, error } = await client()
    .from("standard_coverage")
    .select(COVERAGE_FIELDS)
    .eq("framework", framework)
    .eq("grade", grade)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToCoverage);
}

/** What counts toward one code: its plan rows and its models, each marked direct or through the crosswalk. */
export async function getCodeDetail(framework, code) {
  const db = client();
  const [bpLinks, modelLinks] = await Promise.all([
    db.from("standard_blueprint_links").select("blueprint_id, via").eq("framework", framework).eq("code", code),
    db.from("standard_model_links").select("item_model_id, via").eq("framework", framework).eq("code", code),
  ]);
  if (bpLinks.error) throw bpLinks.error;
  if (modelLinks.error) throw modelLinks.error;

  const viaOf = (links, key) => new Map((links || []).map((l) => [l[key], l.via]));
  const bpVia = viaOf(bpLinks.data, "blueprint_id");
  const modelVia = viaOf(modelLinks.data, "item_model_id");

  const [rows, models] = await Promise.all([
    bpVia.size
      ? db.from("blueprint_row_progress").select("id, title, status, track, grade, models_drafted, items_ready, stage").in("id", [...bpVia.keys()])
      : { data: [] },
    modelVia.size
      ? db.from("item_models").select("id, subskill, difficulty, review_status").in("id", [...modelVia.keys()])
      : { data: [] },
  ]);
  if (rows.error) throw rows.error;
  if (models.error) throw models.error;

  return {
    blueprintRows: (rows.data || [])
      .map((r) => ({ ...r, via: bpVia.get(r.id) }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    models: (models.data || [])
      .map((m) => ({ ...m, via: modelVia.get(m.id) }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
