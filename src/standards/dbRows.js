/**
 * The repo's standards files and blueprint rows as database rows, and the SQL
 * that loads them (scripts/standards/loadStandards.js prints it). Pure, so
 * the CI gate can check exactly what a load would write.
 *
 * A load:
 *   - upserts every code of each loaded framework (the file is the source);
 *   - replaces each loaded state's crosswalk links;
 *   - upserts blueprint rows, leaving any row that is no longer a draft
 *     untouched (approval lives in the database), and rewrites the code
 *     links of draft rows only;
 *   - re-derives item_model_standards from item_models.spec, so models
 *     loaded before a framework's codes pick up their links.
 * Codes are never deleted unless the load is asked to prune.
 */
import { LOADED_CROSSWALKS, LOADED_FRAMEWORKS, crosswalkFor, normalizeCode, standardsFor } from "./index.js";
import { BLUEPRINT_ROWS } from "../blueprints/index.js";

export function standardsDbRows() {
  return LOADED_FRAMEWORKS.flatMap((framework) =>
    standardsFor(framework).map((s) => ({
      framework,
      code: s.code,
      aliases: [...s.aliases],
      grade: s.grade,
      domain: s.domain,
      cluster: s.cluster ?? null,
      summary: s.summary,
      kind: s.kind,
      in_scope: s.in_scope,
      scope_note: s.scope_note ?? null,
      parent_code: s.parent ?? null,
      edition: s.edition,
      source_url: s.source_url ?? null,
      sort_order: s.sort_order,
    }))
  );
}

export function crosswalkDbRows() {
  return LOADED_CROSSWALKS.flatMap((framework) =>
    crosswalkFor(framework).map((l) => ({
      framework,
      code: l.code,
      ccss_code: l.ccss_code,
      match: l.match,
      note: l.note ?? null,
      checked_by: l.checked_by ?? null,
      checked_at: l.checked_at ?? null,
    }))
  );
}

const BLUEPRINT_FIELDS = ["track", "mode_id", "grade", "title", "problem_type", "picture", "answer_format", "difficulty", "example"];

export function blueprintDbRows() {
  return BLUEPRINT_ROWS.map((r) => ({
    id: r.id,
    ...Object.fromEntries(BLUEPRINT_FIELDS.map((f) => [f, r[f] ?? null])),
    spec: r.spec ?? {},
  }));
}

/** One link per row × code, for loaded frameworks only (the table's foreign key needs the code). */
export function blueprintStandardDbRows() {
  const out = [];
  for (const r of BLUEPRINT_ROWS) {
    for (const framework of LOADED_FRAMEWORKS) {
      const seen = new Set();
      for (const code of r.standards?.[framework] || []) {
        const canonical = normalizeCode(framework, code);
        if (!canonical || seen.has(canonical)) continue;
        seen.add(canonical);
        out.push({ blueprint_id: r.id, framework, code: canonical });
      }
    }
  }
  return out;
}

// --- SQL --------------------------------------------------------------------

export function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length ? `array[${value.map(sqlLiteral).join(", ")}]::text[]` : "'{}'::text[]";
  if (typeof value === "object") return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function valuesList(rows, columns) {
  return rows.map((r) => `  (${columns.map((c) => sqlLiteral(r[c])).join(", ")})`).join(",\n");
}

const STANDARD_COLUMNS = ["framework", "code", "aliases", "grade", "domain", "cluster", "summary", "kind", "in_scope", "scope_note", "parent_code", "edition", "source_url", "sort_order"];
const CROSSWALK_COLUMNS = ["framework", "code", "ccss_code", "match", "note", "checked_by", "checked_at"];
const BLUEPRINT_COLUMNS = ["id", ...BLUEPRINT_FIELDS, "spec"];

/** The whole load as one transaction. `prune` also deletes codes of loaded frameworks that the files no longer list. */
export function loadSql({ prune = false } = {}) {
  const standards = standardsDbRows();
  const crosswalk = crosswalkDbRows();
  const blueprints = blueprintDbRows();
  const links = blueprintStandardDbRows();
  const parts = ["begin;", "set constraints all deferred;"];

  if (standards.length) {
    const update = STANDARD_COLUMNS.filter((c) => c !== "framework" && c !== "code").map((c) => `${c} = excluded.${c}`).join(", ");
    parts.push(
      `insert into public.standards (${STANDARD_COLUMNS.join(", ")}) values\n${valuesList(standards, STANDARD_COLUMNS)}\non conflict (framework, code) do update set ${update};`
    );
    if (prune) {
      for (const framework of LOADED_FRAMEWORKS) {
        const codes = standards.filter((s) => s.framework === framework).map((s) => sqlLiteral(s.code));
        parts.push(`delete from public.standards where framework = ${sqlLiteral(framework)} and code not in (${codes.join(", ")});`);
      }
    }
  }

  for (const framework of LOADED_CROSSWALKS) {
    parts.push(`delete from public.standard_crosswalk where framework = ${sqlLiteral(framework)};`);
  }
  if (crosswalk.length) {
    parts.push(`insert into public.standard_crosswalk (${CROSSWALK_COLUMNS.join(", ")}) values\n${valuesList(crosswalk, CROSSWALK_COLUMNS)};`);
  }

  if (blueprints.length) {
    const update = BLUEPRINT_COLUMNS.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ");
    parts.push(
      `insert into public.blueprint_rows (${BLUEPRINT_COLUMNS.join(", ")}) values\n${valuesList(blueprints, BLUEPRINT_COLUMNS)}\non conflict (id) do update set ${update}\n  where public.blueprint_rows.status = 'draft';`
    );
    const ids = blueprints.map((b) => sqlLiteral(b.id)).join(", ");
    parts.push(
      `delete from public.blueprint_standards bs using public.blueprint_rows r\n where r.id = bs.blueprint_id and r.status = 'draft' and r.id in (${ids});`
    );
    if (links.length) {
      parts.push(
        `insert into public.blueprint_standards (blueprint_id, framework, code)\nselect v.blueprint_id, v.framework, v.code from (values\n${valuesList(links, ["blueprint_id", "framework", "code"])}\n) v(blueprint_id, framework, code)\njoin public.blueprint_rows r on r.id = v.blueprint_id and r.status = 'draft'\non conflict do nothing;`
      );
    }
  }

  parts.push("select public.sync_item_model_standards(null) as item_model_links;");
  parts.push("commit;");
  return parts.join("\n\n") + "\n";
}

/**
 * A query that returns one row per difference between the files and the
 * database (missing, extra or changed codes; draft blueprint rows that differ
 * or are missing). No rows back means the database matches the repo.
 */
export function checkSql() {
  const standards = standardsDbRows();
  const blueprints = blueprintDbRows();
  const fws = LOADED_FRAMEWORKS.map(sqlLiteral).join(", ");
  return `with file_standards (framework, code, summary, kind, in_scope, grade) as (values
${valuesList(standards, ["framework", "code", "summary", "kind", "in_scope", "grade"])}
),
file_blueprints (id, title) as (values
${valuesList(blueprints, ["id", "title"])}
)
select 'missing code' as problem, f.framework, f.code from file_standards f
  left join public.standards s using (framework, code) where s.code is null
union all
select 'extra code', s.framework, s.code from public.standards s
  left join file_standards f using (framework, code) where f.code is null and s.framework in (${fws})
union all
select 'changed code', f.framework, f.code from file_standards f
  join public.standards s using (framework, code)
 where (s.summary, s.kind, s.in_scope, s.grade) is distinct from (f.summary, f.kind, f.in_scope, f.grade)
union all
select 'missing blueprint row', null, b.id from file_blueprints b
  left join public.blueprint_rows r on r.id = b.id where r.id is null
union all
select 'changed draft blueprint row', null, b.id from file_blueprints b
  join public.blueprint_rows r on r.id = b.id where r.status = 'draft' and r.title is distinct from b.title
order by 1, 2, 3;
`;
}
