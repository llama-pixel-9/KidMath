import { zoneUrl } from "./worldArt";
import { Sheet, CloseButton, Diamond } from "./ui";

/**
 * The map IS the island: a scroll that unrolls from the pocket with the four
 * regions side by side as they truly are, the skylark's position, mist over
 * the parts not yet reached, and what each place still holds. Tap a
 * discovered region to fly there.
 */
export default function MapPanel({ regions, zones, world, avatarX, onFly, onClose }) {
  const total = regions.reduce((s, r) => s + (r.x1 - r.x0), 0);
  const first = regions[0].x0;
  const px = avatarX == null ? null : Math.max(0, Math.min(100, ((avatarX - first) / total) * 100));

  return (
    <Sheet label="Island map" bottom className="world-scroll">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-ink text-xl">Skylark Island</h2>
          <CloseButton onClick={onClose} label="Roll up the map" />
        </div>

        <div className="relative">
          <div className="grid grid-cols-4 gap-1.5">
            {regions.map((r) => {
              const open = world.discovered.includes(r.id);
              const zone = zones[r.id];
              const done = zone ? zone.quests.filter((q) => world.quests?.[q.id]?.done).length : 0;
              const feathers = zone ? zone.feathers.filter((f) => world.feathers.includes(f.id)).length : 0;
              const current = world.region === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={!open}
                  onClick={() => onFly(r.id)}
                  aria-label={open ? `Fly to ${r.title}` : `${r.title}: not yet discovered`}
                  className={`text-left rounded-2xl overflow-hidden border-[3px] transition-transform ${current ? "border-sun" : "border-cream"} ${open ? "hover:-translate-y-0.5 active:scale-[0.98]" : "cursor-default"}`}
                >
                  <div className="relative h-16 sm:h-20">
                    <div
                      className={`absolute inset-0 bg-cover ${open ? "" : "grayscale blur-[2px] opacity-60"}`}
                      style={{ backgroundImage: `url(${zoneUrl(r.backdrop)})`, backgroundPosition: "50% 72%" }}
                    />
                    {!open && <div className="absolute inset-0 bg-seafoam/70 flex items-center justify-center font-display text-teal text-xs">mist</div>}
                  </div>
                  <div className="px-2 py-1.5 bg-white/90">
                    <div className="font-display font-semibold text-ink text-[13px] leading-tight truncate">{r.title}</div>
                    {open && zone && (
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-ink/60">
                        <span className="flex items-center gap-0.5">
                          <Diamond className="w-3 h-3" /> {done}/{zone.quests.length}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <img src="/meadow/feathers/firstSession.webp" alt="" className="w-3 h-3 object-contain" /> {feathers}/{zone.feathers.length}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {/* The skylark, where it actually is. */}
          {px != null && (
            <img
              src="/meadow/birds/skylark.webp"
              alt="You are here"
              className="absolute -top-3 w-9 h-9 object-contain drop-shadow world-bob"
              style={{ left: `calc(${px}% - 18px)` }}
            />
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-ink/60">
          <span>Secrets found: {world.secrets?.length ?? 0} of {world.secretCount ?? 0}</span>
          <span>Tap a place to fly there.</span>
        </div>
      </div>
    </Sheet>
  );
}
