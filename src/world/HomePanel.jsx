import { usePremium } from "../PremiumContext";
import { propUrl } from "./worldArt";
import { Diamond, Sheet, CloseButton } from "./ui";

const PET_LINES = {
  0: "Your egg is brand new. Practicing keeps it warm!",
  1: "The egg is warming up. Keep practicing!",
  2: "Something is stirring inside…",
  3: "It's wobbling! It will hatch very soon!",
  hatched: "Your chick follows you everywhere now.",
};

/**
 * The home nest panel: pet status and the decoration shop. Everything here
 * is priced in EARNED stars only. Premium-only decorations are simply
 * absent for unsubscribed families — cosmetic breadth is the membership
 * perk, and no child-facing surface ever upsells (plan principle 5).
 */
export default function HomePanel({ zoneHome, world, onBuy, onClose }) {
  const { isPremium } = usePremium();
  const items = zoneHome.shop.filter((item) => !item.premium || isPremium);

  return (
    <Sheet label="Home nest" bottom>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-semibold text-ink text-xl">Home Nest</h2>
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-ink text-lg flex items-center gap-1">
              <Diamond className="w-5 h-5" /> {world.stars}
            </span>
            <CloseButton onClick={onClose} label="Back to the island" />
          </div>
        </div>

        {world.pet !== null && world.pet !== undefined && (
          <p className="mb-3 text-sm font-bold text-ink bg-seafoam/50 rounded-xl px-3 py-2">{PET_LINES[world.pet]}</p>
        )}
        {world.pet == null && <p className="mb-3 text-sm font-bold text-ink/70">Help a bird and something might arrive for your nest.</p>}
        {(world.secrets?.length ?? 0) > 0 && (
          <p className="mb-3 text-xs font-bold text-teal">
            Secrets found: {world.secrets.length} of {world.secretCount}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => {
            const owned = world.decorations.includes(item.id);
            const affordable = world.stars >= item.cost;
            return (
              <button
                key={item.id}
                type="button"
                disabled={owned || !affordable}
                onClick={() => onBuy(item.id)}
                className={`rounded-2xl p-2 text-center font-bold text-[13px] leading-tight border-[1.5px] transition-transform active:scale-95 ${
                  owned
                    ? "bg-seafoam/60 border-teal/30 text-teal"
                    : affordable
                      ? "bg-white border-ink/10 text-ink shadow-sm hover:-translate-y-0.5"
                      : "bg-white/60 border-ink/5 text-ink/40"
                }`}
              >
                <img src={propUrl(item.prop)} alt="" className={`w-12 h-12 mx-auto object-contain ${owned || affordable ? "" : "grayscale opacity-60"}`} />
                <span className="block mt-1">{item.name}</span>
                <span className="mt-0.5 flex items-center justify-center gap-1 text-xs">
                  {owned ? "At home ✓" : (
                    <>
                      <Diamond className="w-3.5 h-3.5" /> {item.cost}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
