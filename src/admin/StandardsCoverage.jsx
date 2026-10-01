import { Fragment, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { FRAMEWORK_LABELS, GRADES } from "../standards/index.js";
import { COVERAGE_STATUSES, catalogSkillsFor, coverageTotals, statusLabel } from "../standards/coverage.js";
import { getCodeDetail, listCoverage, listLoadedFrameworks } from "./standardsApi";

// One row per standards code for a framework and grade, read from the
// computed standard_coverage view (docs/standards-coverage.md): what is
// planned, written, approved and live, and one status. Clicking a code lists
// the plan rows and models that count toward it.

const STATUS_CLASS = {
  out_of_scope: "bg-slate-100 text-slate-500",
  not_planned: "bg-red-50 text-red-700",
  planned: "bg-amber-100 text-amber-800",
  building: "bg-sky-100 text-sky-800",
  ready_to_flip: "bg-violet-100 text-violet-800",
  in_preview: "bg-indigo-100 text-indigo-800",
  covered: "bg-emerald-100 text-emerald-800",
};

const KIND_LABEL = { fluency: "fluency", skill: "skill", word_problem: "word problem", concept: "concept" };

const GRADE_LABEL = (g) => (g === "K" ? "Kindergarten" : `Grade ${g}`);

function StatusChip({ status }) {
  const meta = COVERAGE_STATUSES.find((s) => s.id === status);
  return (
    <span title={meta?.hint} className={`px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap ${STATUS_CLASS[status] || "bg-gray-100"}`}>
      {statusLabel(status)}
    </span>
  );
}

function Num({ value, muted }) {
  return <span className={`font-mono ${value ? "text-slate-800" : "text-slate-300"} ${muted ? "text-xs" : ""}`}>{value}</span>;
}

function CodeDetail({ framework, row }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const skills = framework === "ccss" ? catalogSkillsFor(row.code) : [];

  useEffect(() => {
    let live = true;
    getCodeDetail(framework, row.code)
      .then((d) => live && setDetail(d))
      .catch((err) => live && setError(err.message || "Failed to load"));
    return () => {
      live = false;
    };
  }, [framework, row.code]);

  return (
    <div className="space-y-3 text-xs text-slate-700">
      {row.scopeNote && <p className="text-slate-500">Scope: {row.scopeNote}</p>}
      {error && <p className="text-red-700">{error}</p>}
      {!detail && !error && <p className="text-slate-400">Loading…</p>}
      {detail && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <h4 className="font-bold text-slate-600 mb-1">Plan rows ({detail.blueprintRows.length})</h4>
            {detail.blueprintRows.length === 0 && <p className="text-slate-400">None yet.</p>}
            <ul className="space-y-0.5">
              {detail.blueprintRows.map((b) => (
                <li key={b.id}>
                  <span className="font-mono">{b.id}</span> · {b.status}
                  {b.via === "crosswalk" && <span className="text-slate-400"> · via Common Core</span>}
                  <div className="text-slate-500">{b.title}</div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-600 mb-1">Models ({detail.models.length})</h4>
            {detail.models.length === 0 && <p className="text-slate-400">None yet.</p>}
            <ul className="space-y-0.5 max-h-48 overflow-auto">
              {detail.models.map((m) => (
                <li key={m.id}>
                  <span className="font-mono">{m.id}</span> · {m.review_status}
                  {m.via === "crosswalk" && <span className="text-slate-400"> · via Common Core</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {framework === "ccss" && (
        <div>
          <h4 className="font-bold text-slate-600 mb-1">Today's catalog skills (v1) ({skills.length})</h4>
          {skills.length === 0 ? <p className="text-slate-400">None cite this code.</p> : <p>{skills.map((s) => s.title).join(" · ")}</p>}
        </div>
      )}
    </div>
  );
}

export default function StandardsCoverage() {
  const [frameworks, setFrameworks] = useState(null);
  const [framework, setFramework] = useState("ccss");
  const [grade, setGrade] = useState("K");
  const [open, setOpen] = useState(null);
  const [reload, setReload] = useState(0);
  const [frameworksError, setFrameworksError] = useState(null);
  // The last answer and the query it answers; a newer query shows as loading.
  const query = `${framework}|${grade}|${reload}`;
  const [result, setResult] = useState({ query: null, rows: [], error: null });
  const loading = result.query !== query;
  const rows = useMemo(() => (loading ? [] : result.rows), [loading, result.rows]);
  const error = frameworksError || (loading ? null : result.error);

  useEffect(() => {
    listLoadedFrameworks()
      .then((list) => {
        setFrameworks(list);
        if (list.length && !list.some((f) => f.framework === "ccss")) setFramework(list[0].framework);
      })
      .catch((err) => setFrameworksError(err.message || "Failed to load frameworks"));
  }, []);

  useEffect(() => {
    let live = true;
    listCoverage(framework, grade)
      .then((r) => live && setResult({ query, rows: r, error: null }))
      .catch((err) => live && setResult({ query, rows: [], error: err.message || "Failed to load coverage" }));
    return () => {
      live = false;
    };
  }, [framework, grade, query]);

  const totals = useMemo(() => coverageTotals(rows), [rows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
          value={framework}
          onChange={(e) => {
            setFramework(e.target.value);
            setOpen(null);
          }}
          aria-label="Framework"
        >
          {(frameworks || [{ framework: "ccss" }]).map((f) => (
            <option key={f.framework} value={f.framework}>
              {FRAMEWORK_LABELS[f.framework] || f.framework}
              {f.codes ? ` (${f.codes} codes)` : ""}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setOpen(null);
          }}
          aria-label="Grade"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {GRADE_LABEL(g)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold"
          onClick={() => setReload((n) => n + 1)}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        {frameworks && frameworks.length < 5 && (
          <span className="text-xs text-slate-400">
            Not loaded yet:{" "}
            {Object.keys(FRAMEWORK_LABELS)
              .filter((fw) => !frameworks.some((f) => f.framework === fw))
              .map((fw) => FRAMEWORK_LABELS[fw])
              .join(", ")}
          </span>
        )}
      </div>

      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-bold text-slate-800">
            Covered {totals.covered} of {totals.inScope} in scope ({totals.percent}%)
          </span>
          {COVERAGE_STATUSES.filter((s) => totals.byStatus[s.id]).map((s) => (
            <span key={s.id} className="flex items-center gap-1">
              <StatusChip status={s.id} /> {totals.byStatus[s.id]}
            </span>
          ))}
          <span className="text-slate-400">A code with sub-parts counts through them.</span>
        </div>
      )}

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
      {loading && <div className="p-6 text-center text-sm text-slate-500">Loading...</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">No codes for this framework and grade in the database.</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-slate-500 text-left">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">What it asks (our words)</th>
                <th className="px-3 py-2 text-right" title="Approved plan rows">Planned</th>
                <th className="px-3 py-2 text-right" title="Approved / written (not rejected)">Models</th>
                <th className="px-3 py-2 text-right" title="Approved v2 items live for everyone (in preview)">Live</th>
                <th className="px-3 py-2 text-right" title="Catalog skills citing the code today">v1</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = open === r.code;
                const v1 = framework === "ccss" ? catalogSkillsFor(r.code).length : null;
                return (
                  <Fragment key={r.code}>
                    <tr
                      className={`border-t border-gray-100 cursor-pointer hover:bg-violet-50 ${r.inScope === "no" ? "opacity-60" : ""}`}
                      onClick={() => setOpen(isOpen ? null : r.code)}
                    >
                      <td className={`px-3 py-2 font-mono text-xs whitespace-nowrap ${r.parentCode ? "pl-7 text-slate-500" : "font-bold"}`}>{r.code}</td>
                      <td className="px-3 py-2">
                        <span>{r.summary}</span>{" "}
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">{KIND_LABEL[r.kind] || r.kind}</span>
                        {r.inScope === "partly" && <span className="ml-1 text-[10px] text-amber-700">partly in scope</span>}
                        {r.needsLook > 0 && (
                          <span className="ml-1 text-[10px] text-amber-700" title="Models tagged with a Common Core code that only partly matches this one">
                            {r.needsLook} need a look
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right"><Num value={r.plannedRows} /></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Num value={r.modelsApproved} /> <span className="text-slate-300">/</span> <Num value={r.modelsDrafted} muted />
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Num value={r.itemsLive} />
                        {r.itemsPreview > 0 && <span className="text-xs text-indigo-600"> ({r.itemsPreview})</span>}
                      </td>
                      <td className="px-3 py-2 text-right">{v1 === null ? <span className="text-slate-300">–</span> : <Num value={v1} />}</td>
                      <td className="px-3 py-2"><StatusChip status={r.status} /></td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-3 py-3">
                          <CodeDetail framework={framework} row={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
