import { getModeConfig } from "../modes/index.js";

/**
 * The DOM layer over a zoomed-in island: pick one of the strand's practice
 * spots (the existing minigames — plan Part 2: nothing already built is
 * thrown away). Premium gating stays out of this child-facing surface
 * (principle 5); the /play route's parent-facing gate handles it.
 */
export default function IslandPanel({ island, onClose, onPickMode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 pointer-events-none">
      <div
        role="dialog"
        aria-label={island.title}
        className="pointer-events-auto w-full max-w-sm rounded-3xl bg-white/95 shadow-xl backdrop-blur p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-teal-900">{island.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to the map"
            className="rounded-full w-9 h-9 flex items-center justify-center bg-teal-50 text-teal-800 text-lg font-bold hover:bg-teal-100"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {island.modeIds.map((modeId) => (
            <button
              key={modeId}
              type="button"
              onClick={() => onPickMode(modeId)}
              className="rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-3 text-sm text-left"
            >
              {getModeConfig(modeId).label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
