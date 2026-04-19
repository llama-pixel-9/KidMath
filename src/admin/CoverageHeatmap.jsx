import { useMemo } from "react";

// Cell = (mode x subskill x family x levelBand). The heatmap lets a reviewer
// see at a glance which pedagogical cells are empty, thin, or healthy and
// decide where to focus authoring effort.

const FAMILIES = ["conceptual", "procedural", "application"];
const LEVEL_BANDS = ["K-1", "2-3", "4-5"];

function bucketForCount(count, minFloor, healthy) {
  if (count === 0) return "empty";
  if (count < minFloor) return "thin";
  if (count < healthy) return "ok";
  return "healthy";
}

const BUCKET_CLASS = {
  empty: "bg-red-100 text-red-800 border-red-200",
  thin: "bg-amber-100 text-amber-800 border-amber-200",
  ok: "bg-sky-100 text-sky-800 border-sky-200",
  healthy: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

/**
 * Props:
 *  - coverage: Array<{modeId, subskill, itemFamily, levelBand, count}>
 *  - subskillsByMode: { [modeId]: string[] }   (authoritative list of expected subskills per mode)
 *  - minFloor (default 3): below this count = "thin"
 *  - healthy (default 8): at/above this count = "healthy"
 *  - onCellClick(cell): click handler
 */
export default function CoverageHeatmap({
  coverage,
  subskillsByMode,
  minFloor = 3,
  healthy = 8,
  onCellClick,
}) {
  const countByKey = useMemo(() => {
    const map = new Map();
    for (const row of coverage || []) {
      const key = `${row.modeId}::${row.subskill}::${row.itemFamily}::${row.levelBand}`;
      map.set(key, row.count);
    }
    return map;
  }, [coverage]);

  const modeIds = useMemo(() => Object.keys(subskillsByMode || {}).sort(), [subskillsByMode]);

  const totals = useMemo(() => {
    let empty = 0;
    let thin = 0;
    let ok = 0;
    let healthyCount = 0;
    let total = 0;
    for (const modeId of modeIds) {
      const subs = subskillsByMode[modeId] || [];
      for (const subskill of subs) {
        for (const family of FAMILIES) {
          for (const band of LEVEL_BANDS) {
            total += 1;
            const key = `${modeId}::${subskill}::${family}::${band}`;
            const count = countByKey.get(key) || 0;
            const b = bucketForCount(count, minFloor, healthy);
            if (b === "empty") empty += 1;
            else if (b === "thin") thin += 1;
            else if (b === "ok") ok += 1;
            else healthyCount += 1;
          }
        }
      }
    }
    return { empty, thin, ok, healthy: healthyCount, total };
  }, [modeIds, subskillsByMode, countByKey, minFloor, healthy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        <LegendChip label={`empty (0)`} bucket="empty" count={totals.empty} />
        <LegendChip label={`thin (<${minFloor})`} bucket="thin" count={totals.thin} />
        <LegendChip label={`ok (${minFloor}..${healthy - 1})`} bucket="ok" count={totals.ok} />
        <LegendChip label={`healthy (>=${healthy})`} bucket="healthy" count={totals.healthy} />
        <span className="text-slate-500">total cells: {totals.total}</span>
      </div>

      <div className="space-y-5">
        {modeIds.map((modeId) => (
          <ModeGrid
            key={modeId}
            modeId={modeId}
            subskills={subskillsByMode[modeId] || []}
            countByKey={countByKey}
            minFloor={minFloor}
            healthy={healthy}
            onCellClick={onCellClick}
          />
        ))}
      </div>
    </div>
  );
}

function LegendChip({ label, bucket, count }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${BUCKET_CLASS[bucket]}`}
    >
      <span className="font-mono text-[10px]">{label}</span>
      <span className="font-bold">{count}</span>
    </span>
  );
}

function ModeGrid({ modeId, subskills, countByKey, minFloor, healthy, onCellClick }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-extrabold text-slate-800 capitalize">{modeId}</h3>
        <span className="text-xs text-slate-500">
          ({subskills.length} subskills x {FAMILIES.length} families x {LEVEL_BANDS.length} bands =
          {" "}{subskills.length * FAMILIES.length * LEVEL_BANDS.length} cells)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="text-[11px] border-collapse">
          <thead>
            <tr>
              <th className="p-1 sticky left-0 bg-white z-10"></th>
              {FAMILIES.map((family) => (
                <th key={family} colSpan={LEVEL_BANDS.length} className="p-1 text-slate-600 font-bold">
                  {family}
                </th>
              ))}
            </tr>
            <tr>
              <th className="p-1 sticky left-0 bg-white z-10"></th>
              {FAMILIES.flatMap((family) =>
                LEVEL_BANDS.map((band) => (
                  <th key={`${family}-${band}`} className="p-1 text-slate-500 font-mono">
                    {band}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {subskills.map((subskill) => (
              <tr key={subskill}>
                <td className="p-1 pr-2 sticky left-0 bg-white z-10 text-slate-700 font-semibold">
                  {subskill}
                </td>
                {FAMILIES.flatMap((family) =>
                  LEVEL_BANDS.map((band) => {
                    const key = `${modeId}::${subskill}::${family}::${band}`;
                    const count = countByKey.get(key) || 0;
                    const bucket = bucketForCount(count, minFloor, healthy);
                    return (
                      <td key={`${family}-${band}`} className="p-0.5">
                        <button
                          type="button"
                          className={`w-10 h-7 text-center font-mono rounded border ${BUCKET_CLASS[bucket]}`}
                          onClick={() =>
                            onCellClick?.({ modeId, subskill, itemFamily: family, levelBand: band, count })
                          }
                          title={`${modeId} / ${subskill} / ${family} / ${band}: ${count}`}
                        >
                          {count}
                        </button>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
