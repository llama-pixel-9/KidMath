import { getModeConfig, MODE_GROUPS } from "../modes/index.js";
import { Sheet, CloseButton } from "./ui";

/**
 * The practice signpost's panel: the strand's minigames (plan Part 2 —
 * nothing already built is thrown away; the world is the motivation layer,
 * the minigames are the high-rep drill layer). Premium gating stays out of
 * this child-facing surface; the /play route handles it parent-side.
 */
export default function PracticePanel({ region, onClose, onPickMode }) {
  if (!region) return null;
  const groups = (region.signpost?.groups ?? [region.groupId]).map((id) => MODE_GROUPS.find((g) => g.id === id)).filter(Boolean);
  return (
    <Sheet label={`Practice at ${region.title}`} bottom>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-ink text-xl">Practice spots</h2>
          <CloseButton onClick={onClose} label="Back to the island" />
        </div>
        <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="font-display font-semibold text-teal text-sm tracking-wide mb-1.5">{g.title}</div>
              <div className="grid grid-cols-2 gap-2">
                {g.modeIds.map((modeId) => {
                  const cfg = getModeConfig(modeId);
                  return (
                    <button
                      key={modeId}
                      type="button"
                      onClick={() => onPickMode(modeId)}
                      className="rounded-2xl bg-white border-[1.5px] border-ink/10 hover:border-teal/40 shadow-sm text-ink font-bold py-2.5 px-3 text-sm text-left active:scale-[0.98]"
                    >
                      {cfg?.label ?? modeId}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
