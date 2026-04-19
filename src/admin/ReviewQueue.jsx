import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { bulkSetReviewStatus, setReviewStatus } from "./itemBankAdminApi";

// Review queue tab: shows items with reviewStatus=reviewed sorted by the cell
// gap they would fill (empty cells first, then thin cells). Supports single
// and bulk approval.

const FAMILIES = ["conceptual", "procedural", "application"];
const LEVEL_BANDS = ["K-1", "2-3", "4-5"];

function bandForLevel(level) {
  if (level <= 3) return "K-1";
  if (level <= 6) return "2-3";
  return "4-5";
}

function itemBands(item) {
  const bands = new Set();
  for (let level = item.levelMin; level <= item.levelMax; level++) bands.add(bandForLevel(level));
  return [...bands];
}

// Heuristic gap score: for each band the item covers, treat the cell count as
// the gap (lower is more valuable). Items spanning multiple bands get credited
// for the smallest cell count so authoring to fill empties is prioritized.
function gapScore(item, coverageMap) {
  const bands = itemBands(item);
  let minCount = Infinity;
  for (const band of bands) {
    const key = `${item.modeId}::${item.subskill}::${item.itemFamily}::${band}`;
    const count = coverageMap.get(key) || 0;
    if (count < minCount) minCount = count;
  }
  return Number.isFinite(minCount) ? minCount : 99;
}

/**
 * Props:
 *  - items: all items (we'll filter to reviewStatus=reviewed)
 *  - coverage: Array of { modeId, subskill, itemFamily, levelBand, count }
 *  - onItemChanged(updatedItem): called after single-item status change
 *  - onBulkChanged(updatedItems): called after bulk status change
 *  - onOpenEditor(item): called to open the inline editor for an item
 */
export default function ReviewQueue({
  items,
  coverage,
  onItemChanged,
  onBulkChanged,
  onOpenEditor,
}) {
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [filterFamily, setFilterFamily] = useState("");
  const [filterBand, setFilterBand] = useState("");

  const coverageMap = useMemo(() => {
    const map = new Map();
    for (const row of coverage || []) {
      const key = `${row.modeId}::${row.subskill}::${row.itemFamily}::${row.levelBand}`;
      map.set(key, row.count);
    }
    return map;
  }, [coverage]);

  const queue = useMemo(() => {
    const filtered = (items || []).filter(
      (it) =>
        it.reviewStatus === "reviewed" &&
        (!filterFamily || it.itemFamily === filterFamily) &&
        (!filterBand || itemBands(it).includes(filterBand))
    );
    return filtered
      .map((it) => ({ it, score: gapScore(it, coverageMap) }))
      .sort((a, b) => a.score - b.score || a.it.itemId.localeCompare(b.it.itemId))
      .map((x) => x.it);
  }, [items, coverageMap, filterFamily, filterBand]);

  // Clear selections that are no longer in the queue.
  useEffect(() => {
    if (selected.size === 0) return;
    const ids = new Set(queue.map((it) => it.itemId));
    let changed = false;
    for (const id of selected) if (!ids.has(id)) changed = true;
    if (changed) setSelected(new Set([...selected].filter((id) => ids.has(id))));
  }, [queue, selected]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function doBulk(reviewStatus) {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await bulkSetReviewStatus([...selected], reviewStatus);
      onBulkChanged?.(updated);
      setSelected(new Set());
    } catch (err) {
      setError(err.message || "Bulk update failed");
    } finally {
      setBusy(false);
    }
  }

  async function doSingle(itemId, reviewStatus) {
    setBusy(true);
    setError(null);
    try {
      const updated = await setReviewStatus(itemId, reviewStatus);
      onItemChanged?.(updated);
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const allSelected = queue.length > 0 && queue.every((it) => selected.has(it.itemId));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-700 font-semibold">
          {queue.length} item{queue.length === 1 ? "" : "s"} awaiting review
        </span>
        <div className="flex-1" />
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={filterFamily}
          onChange={(e) => setFilterFamily(e.target.value)}
        >
          <option value="">All families</option>
          {FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={filterBand}
          onChange={(e) => setFilterBand(e.target.value)}
        >
          <option value="">All bands</option>
          {LEVEL_BANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1"
          onClick={() => doBulk("approved")}
          disabled={busy || selected.size === 0}
        >
          <CheckCircle2 className="h-4 w-4" /> Approve {selected.size}
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-slate-600 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1"
          onClick={() => doBulk("draft")}
          disabled={busy || selected.size === 0}
        >
          <RotateCcw className="h-4 w-4" /> Return to draft
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1"
          onClick={() => doBulk("retired")}
          disabled={busy || selected.size === 0}
        >
          <XCircle className="h-4 w-4" /> Retire {selected.size}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(queue.map((it) => it.itemId)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="px-3 py-2">Gap</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Mode / Subskill / Family</th>
              <th className="px-3 py-2">Levels</th>
              <th className="px-3 py-2">Prompt</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {queue.map((it) => {
              const score = gapScore(it, coverageMap);
              return (
                <tr key={it.itemId} className="border-t border-gray-100 hover:bg-violet-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(it.itemId)}
                      onChange={() => toggle(it.itemId)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{score}</td>
                  <td
                    className="px-3 py-2 font-mono text-xs cursor-pointer"
                    onClick={() => onOpenEditor?.(it)}
                  >
                    {it.itemId}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="font-semibold">{it.modeId}</span> / {it.subskill} /
                    {" "}
                    <span className="italic">{it.itemFamily}</span>
                  </td>
                  <td className="px-3 py-2">
                    {it.levelMin}-{it.levelMax}
                  </td>
                  <td className="px-3 py-2 text-xs truncate max-w-[280px]">
                    {it.payload?.display?.promptText || it.payload?.display?.representation || ""}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-emerald-700 font-bold mr-2 disabled:opacity-50"
                      onClick={() => doSingle(it.itemId, "approved")}
                      disabled={busy}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="text-xs text-slate-600 font-bold disabled:opacity-50"
                      onClick={() => doSingle(it.itemId, "draft")}
                      disabled={busy}
                    >
                      Draft
                    </button>
                  </td>
                </tr>
              );
            })}
            {queue.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                  Review queue is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
