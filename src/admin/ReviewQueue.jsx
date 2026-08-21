import { Fragment, useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { bulkSetReviewStatus, setReviewStatus } from "./itemBankAdminApi";
import { runChecksOnAdminItem } from "../itemBank/qc/checks.js";
import { formatAnswer } from "./reviewFormat.js";
import { choiceList, payloadWithChoice, itemWithChoice, promptOptionsOf } from "./reviewChoice.js";
import { groupIntoBatches, sampleOf, sampleSize, batchApprovalEntries } from "./reviewBatches.js";

// The queue reviews two kinds of item: unapproved drafts promoted to
// `reviewed`, and already-approved items carrying pending wording options from
// the reword pipeline (reword-in-place). For the latter, "Approve" simply
// applies the chosen wording — the item never leaves circulation.
function needsReview(item) {
  if (item.reviewStatus === "reviewed") return true;
  return item.reviewStatus === "approved" && promptOptionsOf(item).length > 0;
}

// Review queue tab: shows items with reviewStatus=reviewed sorted by the cell
// gap they would fill (empty cells first, then thin cells). Supports single
// and bulk approval.

const FAMILIES = ["conceptual", "procedural", "application"];
const LEVEL_BANDS = ["K-1", "2-3", "4-5"];

// The wording currently selected for an item: the reviewer's pick, else the
// top-ranked option, else null for items without options.
function chosenText(item, choices) {
  const list = choiceList(item);
  if (list.length === 0) return null;
  const picked = choices.get(item.itemId);
  return picked !== undefined && list.includes(picked) ? picked : list[0];
}

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
  const [filterMode, setFilterMode] = useState("");
  const [filterFamily, setFilterFamily] = useState("");
  const [filterBand, setFilterBand] = useState("");
  const [filterQc, setFilterQc] = useState(""); // "", "fail", "flagged"
  const [expanded, setExpanded] = useState(() => new Set());
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table" | "batches"
  // Batch-trust state: which batch is being spot-checked, its frozen sample,
  // and the two-click confirm arm.
  const [openBatch, setOpenBatch] = useState(null);
  const [batchSamples, setBatchSamples] = useState(() => new Map());
  const [armedBatch, setArmedBatch] = useState(null);
  const [batchNote, setBatchNote] = useState(null);
  const [pageSize, setPageSize] = useState(20); // multiples of 10, up to 50
  const [page, setPage] = useState(0);
  // itemId -> chosen wording, for items carrying ranked promptOptions. Items
  // absent from the map default to the top-ranked option.
  const [choices, setChoices] = useState(() => new Map());

  // Deterministic QC for every item in view — evaluated against the wording
  // the reviewer currently has selected, so the badge and the approve guard
  // always describe what would actually be approved.
  const qcById = useMemo(() => {
    const map = new Map();
    for (const it of items || []) {
      const chosen = chosenText(it, choices);
      map.set(it.itemId, runChecksOnAdminItem(chosen ? itemWithChoice(it, chosen) : it));
    }
    return map;
  }, [items, choices]);

  const coverageMap = useMemo(() => {
    const map = new Map();
    for (const row of coverage || []) {
      const key = `${row.modeId}::${row.subskill}::${row.itemFamily}::${row.levelBand}`;
      map.set(key, row.count);
    }
    return map;
  }, [coverage]);

  const queue = useMemo(() => {
    const filtered = (items || []).filter((it) => {
      if (!needsReview(it)) return false;
      if (filterMode && it.modeId !== filterMode) return false;
      if (filterFamily && it.itemFamily !== filterFamily) return false;
      if (filterBand && !itemBands(it).includes(filterBand)) return false;
      if (filterQc) {
        const qc = qcById.get(it.itemId);
        if (filterQc === "fail" && qc?.pass !== false) return false;
        if (filterQc === "flagged" && !(qc && qc.findings.length)) return false;
      }
      return true;
    });
    return filtered
      .map((it) => ({ it, score: gapScore(it, coverageMap) }))
      // QC failures float to the top: an item that cannot reach a child should
      // be dealt with before one that merely fills a smaller coverage gap.
      .sort((a, b) => {
        const af = qcById.get(a.it.itemId)?.pass === false ? 0 : 1;
        const bf = qcById.get(b.it.itemId)?.pass === false ? 0 : 1;
        return af - bf || a.score - b.score || a.it.itemId.localeCompare(b.it.itemId);
      })
      .map((x) => x.it);
  }, [items, coverageMap, filterMode, filterFamily, filterBand, filterQc, qcById]);

  // Modes present in the review queue (unfiltered), for the mode filter.
  const queueModes = useMemo(() => {
    const modes = new Set();
    for (const it of items || []) if (needsReview(it)) modes.add(it.modeId);
    return [...modes].sort();
  }, [items]);

  const qcSummary = useMemo(() => {
    let fail = 0;
    let warn = 0;
    for (const it of items || []) {
      if (!needsReview(it)) continue;
      const qc = qcById.get(it.itemId);
      if (qc?.pass === false) fail += 1;
      else if (qc?.findings.length) warn += 1;
    }
    return { fail, warn };
  }, [items, qcById]);

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

  // A bulk approve must not sneak a QC failure through. Other statuses (draft,
  // retired) are always allowed — you retire the broken ones.
  const selectionHasFailure = useMemo(
    () => [...selected].some((id) => qcById.get(id)?.pass === false),
    [selected, qcById]
  );

  const byId = useMemo(() => new Map((items || []).map((it) => [it.itemId, it])), [items]);

  // Approval writes the reviewer's selected wording into the payload (and
  // strips the options). Other statuses keep the options for a later pass.
  function approvalEntry(itemId) {
    const it = byId.get(itemId);
    const chosen = it ? chosenText(it, choices) : null;
    return chosen ? { itemId, payload: payloadWithChoice(it.payload, chosen) } : { itemId };
  }

  // Batches are grouped from the filtered queue, so the family/band filters
  // narrow batch review the same way they narrow the card view.
  const batches = useMemo(() => groupIntoBatches(queue), [queue]);

  async function doBatchApprove(batch) {
    const { entries, skipped } = batchApprovalEntries(batch.items, qcById, choices);
    if (!entries.length) return;
    setBusy(true);
    setError(null);
    setBatchNote(null);
    try {
      const updated = await bulkSetReviewStatus(entries, "approved");
      onBulkChanged?.(updated);
      setArmedBatch(null);
      setOpenBatch(null);
      setBatchNote(
        `Approved ${entries.length} item(s) from "${batch.label}"` +
          (skipped.length ? ` — ${skipped.length} QC-failing kept in the queue.` : ".")
      );
    } catch (err) {
      setError(err.message || "Batch approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function doBulk(reviewStatus) {
    if (selected.size === 0) return;
    if (reviewStatus === "approved" && selectionHasFailure) {
      setError("Some selected items fail QC and cannot be approved. Filter to QC failures to find them.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const entries =
        reviewStatus === "approved" ? [...selected].map(approvalEntry) : [...selected].map((itemId) => ({ itemId }));
      const updated = await bulkSetReviewStatus(entries, reviewStatus);
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
      const entry = reviewStatus === "approved" ? approvalEntry(itemId) : { itemId };
      const updated = await setReviewStatus(itemId, reviewStatus, entry.payload);
      onItemChanged?.(updated);
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  // Show one page of up to `pageSize` items. Clamp the page if the queue shrank
  // (e.g. after approving a batch) so we never land on an empty page.
  const pageCount = Math.max(1, Math.ceil(queue.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);
  const pageStart = safePage * pageSize;
  const pageItems = queue.slice(pageStart, pageStart + pageSize);

  const pageAllSelected = pageItems.length > 0 && pageItems.every((it) => selected.has(it.itemId));

  function selectPage(on) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const it of pageItems) {
        if (on) next.add(it.itemId);
        else next.delete(it.itemId);
      }
      return next;
    });
  }

  function QcBadge({ qc }) {
    if (!qc || qc.findings.length === 0) {
      return <ShieldCheck className="h-4 w-4 text-emerald-500" title="Passes automated checks" />;
    }
    const fail = qc.pass === false;
    return (
      <span
        className={`flex items-center gap-1 text-xs font-bold ${fail ? "text-red-700" : "text-amber-700"}`}
        title={qc.findings.map((f) => `${f.severity}: ${f.message}`).join("\n")}
      >
        {fail ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {qc.findings.length}
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-700 font-semibold">
          {queue.length} item{queue.length === 1 ? "" : "s"} awaiting review
        </span>
        <div className="flex-1" />
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
        >
          <option value="">All modes</option>
          {queueModes.map((m) => (
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
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={filterQc}
          onChange={(e) => setFilterQc(e.target.value)}
        >
          <option value="">All QC</option>
          <option value="fail">QC failures only</option>
          <option value="flagged">Any QC finding</option>
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          title="Items shown per page"
        >
          {[10, 20, 30, 40, 50].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-slate-600"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          title="How to review"
        >
          <option value="cards">Card view</option>
          <option value="table">Table view</option>
          <option value="batches">Batch view</option>
        </select>
      </div>

      {(qcSummary.fail > 0 || qcSummary.warn > 0) && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {qcSummary.fail > 0 && (
            <button
              type="button"
              onClick={() => setFilterQc("fail")}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-50 text-red-700 font-semibold"
            >
              <XCircle className="h-4 w-4" /> {qcSummary.fail} must-fix
            </button>
          )}
          {qcSummary.warn > 0 && (
            <span className="flex items-center gap-1 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> {qcSummary.warn} with warnings
            </span>
          )}
          <span className="text-slate-400">automated checks — approving a must-fix is blocked</span>
        </div>
      )}

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
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => selectPage(!pageAllSelected)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold text-slate-600"
          disabled={pageItems.length === 0}
        >
          {pageAllSelected ? "Clear page" : `Select page (${pageItems.length})`}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

      {/* Pagination bar (per-item views only). */}
      {viewMode !== "batches" && queue.length > 0 && (
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>
            Showing {pageStart + 1}–{Math.min(pageStart + pageSize, queue.length)} of {queue.length}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="px-2 py-1 rounded-lg border border-gray-300 disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span>
            Page {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="px-2 py-1 rounded-lg border border-gray-300 disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}

      {viewMode === "batches" ? (
        <div className="space-y-3">
          {batchNote && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm">{batchNote}</div>
          )}
          {batches.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">Review queue is empty.</div>
          )}
          {batches.map((batch) => {
            const failCount = batch.items.filter((it) => qcById.get(it.itemId)?.pass === false).length;
            const isOpen = openBatch === batch.key;
            const sample = batchSamples.get(batch.key) || [];
            return (
              <div key={batch.key} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-extrabold text-slate-800">{batch.label}</p>
                    <p className="text-xs text-slate-500">
                      {batch.items.length} items
                      {failCount > 0 && (
                        <span className="text-red-600 font-bold"> · {failCount} QC-fail (kept back)</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold text-slate-600"
                    onClick={() => {
                      if (isOpen) {
                        setOpenBatch(null);
                      } else {
                        setOpenBatch(batch.key);
                        setArmedBatch(null);
                        if (!batchSamples.has(batch.key)) {
                          setBatchSamples((prev) => new Map(prev).set(batch.key, sampleOf(batch.items)));
                        }
                      }
                    }}
                  >
                    {isOpen ? "Hide sample" : `Spot-check ${sampleSize(batch.items.length)}`}
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 ${
                      armedBatch === batch.key ? "bg-red-600" : "bg-emerald-600"
                    }`}
                    // Two-click confirm: approving hundreds of items should
                    // never happen on a slip. The sample must be open first —
                    // batch trust means the sample was actually looked at.
                    disabled={busy || !isOpen || batch.items.length === failCount}
                    title={!isOpen ? "Open the spot-check sample first" : undefined}
                    onClick={() => {
                      if (armedBatch !== batch.key) {
                        setArmedBatch(batch.key);
                        return;
                      }
                      doBatchApprove(batch);
                    }}
                  >
                    {armedBatch === batch.key
                      ? `Really approve ${batch.items.length - failCount}?`
                      : `Approve all ${batch.items.length - failCount}`}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 border-t border-gray-100 pt-3">
                    {sample.map((it) => {
                      const qc = qcById.get(it.itemId);
                      const text = chosenText(it, choices) || it.payload?.display?.promptText || "(non-text item)";
                      return (
                        <div key={it.itemId} className="rounded-xl bg-slate-50 p-3 text-sm">
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-slate-700 leading-snug">{text}</p>
                            <QcBadge qc={qc} />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Answer <span className="font-extrabold text-slate-700">{formatAnswer(it.payload?.answer)}</span>
                            <span className="ml-2">{it.structureType || it.subskill}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {pageItems.map((it) => {
            const qc = qcById.get(it.itemId);
            const qcFail = qc?.pass === false;
            const isSel = selected.has(it.itemId);
            const options = choiceList(it);
            const chosen = chosenText(it, choices);
            return (
              // Fixed height so the action row lands in the same place on every
              // card: after an approve the next item's buttons sit under the
              // cursor instead of jumping with the content length.
              <div
                key={it.itemId}
                className={`rounded-2xl border p-4 flex flex-col gap-2 transition h-[24rem]
                  ${isSel ? "border-emerald-400 bg-emerald-50/40" : "border-gray-200 bg-white"}
                  ${qcFail ? "ring-1 ring-red-300" : ""}`}
              >
                {/* Variable-length content scrolls; everything below is pinned. */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={isSel}
                      onChange={() => toggle(it.itemId)}
                    />
                    {options.length > 0 ? (
                      <div className="flex-1 space-y-1.5">
                        {options.map((text, i) => {
                          const isOriginal = i === options.length - 1;
                          const isChosen = text === chosen;
                          return (
                            <label
                              key={i}
                              className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 cursor-pointer text-sm leading-snug
                                ${isChosen ? "border-violet-400 bg-violet-50 text-slate-800" : "border-transparent text-slate-500 hover:border-gray-200"}`}
                            >
                              <input
                                type="radio"
                                className="mt-0.5"
                                name={`choice-${it.itemId}`}
                                checked={isChosen}
                                onChange={() =>
                                  setChoices((prev) => new Map(prev).set(it.itemId, text))
                                }
                              />
                              <span className="flex-1">
                                <span className={`mr-1 text-[10px] font-bold uppercase ${isOriginal ? "text-slate-400" : "text-violet-500"}`}>
                                  {isOriginal ? "original" : `#${i + 1}`}
                                </span>
                                {text}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="flex-1 text-slate-800 leading-snug">
                        {it.payload?.display?.promptText || (
                          <span className="italic text-slate-400">
                            {it.payload?.display?.representation || "(non-text item)"}
                          </span>
                        )}
                      </p>
                    )}
                    <QcBadge qc={qc} />
                  </div>

                  {qc && qc.findings.length > 0 && (
                    <ul className="space-y-0.5 border-t border-gray-100 pt-2">
                      {qc.findings.map((f, i) => (
                        <li
                          key={i}
                          className={`text-xs ${f.severity === "fail" ? "text-red-700" : "text-amber-700"}`}
                        >
                          {f.severity === "fail" ? "✗" : "⚠"} {f.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm shrink-0">
                  <span className="text-slate-400">Answer</span>
                  <span className="font-extrabold text-slate-800 text-lg">
                    {formatAnswer(it.payload?.answer)}
                  </span>
                </div>

                {/* One line, always — a wrapping meta row would shift the buttons. */}
                <div className="flex items-center gap-x-2 text-xs text-slate-500 shrink-0 overflow-hidden whitespace-nowrap">
                  <span className="font-semibold">{it.modeId}</span>
                  <span>· {it.structureType || it.subskill}</span>
                  <span>· {it.itemFamily}</span>
                  <span>· L{it.levelMin}-{it.levelMax}</span>
                </div>

                <div className="flex items-center gap-2 pt-1 shrink-0">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-base font-bold disabled:opacity-30 flex items-center gap-1.5"
                    onClick={() => doSingle(it.itemId, "approved")}
                    disabled={busy || qcFail}
                    title={qcFail ? "Fix the QC failure before approving" : undefined}
                  >
                    <CheckCircle2 className="h-5 w-5" /> Approve
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-base font-semibold text-slate-600 disabled:opacity-50"
                    onClick={() => doSingle(it.itemId, "draft")}
                    disabled={busy}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-base font-semibold text-slate-600 disabled:opacity-50"
                    onClick={() => onOpenEditor?.(it)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
          {pageItems.length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-slate-500">
              Review queue is empty.
            </div>
          )}
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={pageAllSelected}
                  onChange={(e) => selectPage(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2">Gap</th>
              <th className="px-3 py-2">QC</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Mode / Subskill / Family</th>
              <th className="px-3 py-2">Levels</th>
              <th className="px-3 py-2">Prompt</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((it) => {
              const score = gapScore(it, coverageMap);
              const qc = qcById.get(it.itemId);
              const qcFail = qc?.pass === false;
              const isExpanded = expanded.has(it.itemId);
              return (
              <Fragment key={it.itemId}>
                <tr
                  className={`border-t border-gray-100 hover:bg-violet-50 ${qcFail ? "bg-red-50/60" : ""}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(it.itemId)}
                      onChange={() => toggle(it.itemId)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{score}</td>
                  <td className="px-3 py-2">
                    {qc && qc.findings.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(it.itemId)) next.delete(it.itemId);
                            else next.add(it.itemId);
                            return next;
                          })
                        }
                        className={`flex items-center gap-1 text-xs font-bold ${qcFail ? "text-red-700" : "text-amber-700"}`}
                        title="Show findings"
                      >
                        {qcFail ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {qc.findings.length}
                      </button>
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    )}
                  </td>
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
                      className="text-xs text-emerald-700 font-bold mr-2 disabled:opacity-30"
                      onClick={() => doSingle(it.itemId, "approved")}
                      // An item that fails a deterministic check cannot reach a
                      // child. Fix it in the editor first; a warning does not
                      // block, since those are advisory.
                      disabled={busy || qcFail}
                      title={qcFail ? "Fix the QC failure before approving" : undefined}
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
                {isExpanded && qc && (
                  <tr className="bg-slate-50">
                    <td colSpan={8} className="px-6 py-2">
                      <ul className="space-y-1">
                        {qc.findings.map((f, i) => (
                          <li
                            key={i}
                            className={`text-xs ${f.severity === "fail" ? "text-red-700" : "text-amber-700"}`}
                          >
                            <span className="font-bold uppercase mr-2">{f.severity}</span>
                            <span className="font-mono">{f.id}</span>: {f.message}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                  Review queue is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

