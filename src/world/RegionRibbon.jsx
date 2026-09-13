import { zoneUrl } from "./worldArt";

/**
 * The island at a glance: one round thumbnail per region. Discovered
 * regions are in colour and tappable (the skylark flies there); the rest
 * sit in mist — no padlock, no price, just "not yet".
 */
export default function RegionRibbon({ regions, discovered, current, onPick }) {
  return (
    <div className="absolute bottom-3 left-3 z-20 flex items-end gap-2">
      {regions.map((r) => {
        const open = discovered.includes(r.id);
        const active = current === r.id;
        return (
          <button
            key={r.id}
            type="button"
            disabled={!open}
            onClick={() => onPick(r.id)}
            aria-label={open ? `Fly to ${r.title}` : `${r.title}: not yet discovered`}
            title={r.title}
            className={`relative rounded-full overflow-hidden shadow-md border-[3px] transition-transform ${
              active ? "w-14 h-14 border-sun scale-105" : "w-12 h-12 border-cream"
            } ${open ? "hover:scale-110 active:scale-95" : "cursor-default"}`}
          >
            <div
              className={`absolute inset-0 bg-cover bg-center ${open ? "" : "grayscale blur-[1.5px] opacity-70"}`}
              style={{ backgroundImage: `url(${zoneUrl(r.backdrop)})`, backgroundPosition: "50% 70%" }}
            />
            {!open && <div className="absolute inset-0 bg-seafoam/60" />}
          </button>
        );
      })}
    </div>
  );
}
