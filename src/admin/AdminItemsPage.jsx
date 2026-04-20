import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, ClipboardCheck, Grid2X2, List } from "lucide-react";
import RequireAdmin from "../RequireAdmin";
import { listAllItems, fetchCellCoverage } from "./itemBankAdminApi";
import { MODE_BLUEPRINTS } from "../modes/blueprints";
import ItemEditor from "./ItemEditor";
import ReviewQueue from "./ReviewQueue";
import CoverageHeatmap from "./CoverageHeatmap";

const STATUS_BADGE_CLASS = {
  draft: "bg-gray-100 text-slate-700",
  reviewed: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  retired: "bg-slate-200 text-slate-600",
};

function StatusBadge({ status }) {
  const cls = STATUS_BADGE_CLASS[status] || "bg-gray-100 text-slate-700";
  return <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${cls}`}>{status}</span>;
}

const TABS = [
  { id: "items", label: "All items", icon: List },
  { id: "review", label: "Review queue", icon: ClipboardCheck },
  { id: "coverage", label: "Coverage", icon: Grid2X2 },
];

function subskillsByMode() {
  return Object.fromEntries(
    Object.entries(MODE_BLUEPRINTS).map(([mode, cfg]) => [mode, cfg.subskills])
  );
}

function AdminItemsInner() {
  const [items, setItems] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("items");
  const [filterMode, setFilterMode] = useState("");
  const [filterFamily, setFilterFamily] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [rows, cov] = await Promise.all([listAllItems(), fetchCellCoverage()]);
      setItems(rows);
      setCoverage(cov);
    } catch (err) {
      setError(err.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const modes = useMemo(() => {
    const set = new Set(items.map((i) => i.modeId));
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filterMode && it.modeId !== filterMode) return false;
      if (filterFamily && it.itemFamily !== filterFamily) return false;
      if (filterStatus && it.reviewStatus !== filterStatus) return false;
      if (search) {
        const needle = search.toLowerCase();
        const haystack = [
          it.itemId,
          it.subskill,
          it.structureType,
          it.payload?.display?.promptText || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [items, filterMode, filterFamily, filterStatus, search]);

  const grouped = useMemo(() => {
    const counts = { draft: 0, reviewed: 0, approved: 0, retired: 0 };
    for (const it of items) counts[it.reviewStatus] = (counts[it.reviewStatus] || 0) + 1;
    return counts;
  }, [items]);

  function handleSaved(saved) {
    setItems((prev) => {
      const next = prev.filter((it) => it.itemId !== saved.itemId);
      return [...next, saved].sort(
        (a, b) => a.modeId.localeCompare(b.modeId) || a.itemId.localeCompare(b.itemId)
      );
    });
    setEditing(saved);
    setCreating(false);
    // Coverage may have changed if we just promoted an item to approved.
    fetchCellCoverage().then(setCoverage).catch(() => {});
  }

  function handleDeleted(itemId) {
    setItems((prev) => prev.filter((it) => it.itemId !== itemId));
    setEditing(null);
    setCreating(false);
    fetchCellCoverage().then(setCoverage).catch(() => {});
  }

  function handleBulkChanged(updated) {
    if (!Array.isArray(updated) || updated.length === 0) return;
    const byId = new Map(updated.map((it) => [it.itemId, it]));
    setItems((prev) =>
      prev
        .map((it) => (byId.has(it.itemId) ? byId.get(it.itemId) : it))
        .sort((a, b) => a.modeId.localeCompare(b.modeId) || a.itemId.localeCompare(b.itemId))
    );
    fetchCellCoverage().then(setCoverage).catch(() => {});
  }

  function handleCoverageCellClick(cell) {
    setActiveTab("items");
    setFilterMode(cell.modeId);
    setFilterFamily(cell.itemFamily);
    setFilterStatus("");
    setSearch(cell.subskill);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-800">Item Bank Admin</h1>
        <div className="flex-1" />
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-slate-700 text-sm font-bold"
          onClick={refresh}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold"
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setActiveTab("items");
          }}
        >
          <Plus className="h-4 w-4" /> New item
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span>Total: {items.length}</span>
        {Object.entries(grouped).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <StatusBadge status={k} /> {v}
          </span>
        ))}
      </div>

      <nav className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-b-2 -mb-px ${
                active
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" /> {tab.label}
              {tab.id === "review" && grouped.reviewed > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono">
                  {grouped.reviewed}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
      {loading && <div className="p-6 text-center text-sm text-slate-500">Loading...</div>}

      {!loading && activeTab === "items" && (
        <>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="">All modes</option>
              {modes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={filterFamily}
              onChange={(e) => setFilterFamily(e.target.value)}
            >
              <option value="">All families</option>
              <option value="conceptual">conceptual</option>
              <option value="procedural">procedural</option>
              <option value="application">application</option>
            </select>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.keys(STATUS_BADGE_CLASS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className="pl-8 pr-3 py-2 w-full rounded-lg border border-gray-300 text-sm"
                placeholder="Search id, subskill, prompt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {creating && (
            <ItemEditor
              item={null}
              onSaved={handleSaved}
              onCancel={() => setCreating(false)}
              onDeleted={handleDeleted}
            />
          )}

          {editing && !creating && (
            <ItemEditor
              item={editing}
              onSaved={handleSaved}
              onCancel={() => setEditing(null)}
              onDeleted={handleDeleted}
            />
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Family</th>
                  <th className="px-3 py-2">Subskill</th>
                  <th className="px-3 py-2">Levels</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Prompt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr
                    key={it.itemId}
                    className={`border-t border-gray-100 cursor-pointer hover:bg-violet-50 ${
                      editing?.itemId === it.itemId ? "bg-violet-50" : ""
                    }`}
                    onClick={() => {
                      setEditing(it);
                      setCreating(false);
                    }}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{it.itemId}</td>
                    <td className="px-3 py-2">{it.modeId}</td>
                    <td className="px-3 py-2 text-xs italic">{it.itemFamily}</td>
                    <td className="px-3 py-2">{it.subskill}</td>
                    <td className="px-3 py-2">
                      {it.levelMin}-{it.levelMax}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={it.reviewStatus} />
                    </td>
                    <td className="px-3 py-2 text-xs truncate max-w-[280px]">
                      {it.payload?.display?.promptText || ""}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                      No items match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && activeTab === "review" && (
        <ReviewQueue
          items={items}
          coverage={coverage}
          onItemChanged={(it) => {
            setItems((prev) =>
              prev.map((x) => (x.itemId === it.itemId ? it : x))
            );
            fetchCellCoverage().then(setCoverage).catch(() => {});
          }}
          onBulkChanged={handleBulkChanged}
          onOpenEditor={(it) => {
            setEditing(it);
            setActiveTab("items");
          }}
        />
      )}

      {!loading && activeTab === "coverage" && (
        <CoverageHeatmap
          coverage={coverage}
          subskillsByMode={subskillsByMode()}
          onCellClick={handleCoverageCellClick}
        />
      )}
    </div>
  );
}

export default function AdminItemsPage() {
  return (
    <RequireAdmin>
      <AdminItemsInner />
    </RequireAdmin>
  );
}
