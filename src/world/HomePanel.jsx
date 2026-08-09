import { usePremium } from "../PremiumContext";

const PET_LINES = {
  0: "Your egg is brand new. Practicing keeps it warm!",
  1: "The egg is warming up — keep practicing!",
  2: "Something is stirring inside…",
  3: "It's wobbling! It will hatch very soon!",
  hatched: "Your chick follows you everywhere now.",
};

/**
 * The home nest panel: pet status and the decoration shop (plan Phase 3).
 * Everything here is priced in EARNED stars only. Premium-only decorations
 * are simply absent for unsubscribed families — cosmetic breadth is the
 * membership perk, and no child-facing surface ever upsells or shows a
 * price tag in money (principle 5).
 */
export default function HomePanel({ zoneHome, world, onBuy, onClose }) {
  const { isPremium } = usePremium();
  const items = zoneHome.shop.filter((item) => !item.premium || isPremium);

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 pointer-events-none">
      <div
        role="dialog"
        aria-label="Home nest"
        className="pointer-events-auto w-full max-w-md rounded-3xl bg-white/95 shadow-xl backdrop-blur p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-teal-900">🪺 Home Nest</h2>
          <div className="flex items-center gap-3">
            <span className="font-bold text-amber-600 text-lg">⭐ {world.stars}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to the meadow"
              className="rounded-full w-9 h-9 flex items-center justify-center bg-teal-50 text-teal-800 text-lg font-bold hover:bg-teal-100"
            >
              ×
            </button>
          </div>
        </div>

        {world.pet !== null && (
          <p className="mb-3 text-sm font-semibold text-teal-800 bg-teal-50 rounded-xl px-3 py-2">
            {world.pet === "hatched" ? "🐤" : "🥚"} {PET_LINES[world.pet]}
          </p>
        )}
        {world.feathers.length > 0 && (
          <p className="mb-3 text-sm font-semibold text-amber-700">
            🪶 Feathers found: {world.feathers.length}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const owned = world.decorations.includes(item.id);
            const affordable = world.stars >= item.cost;
            return (
              <button
                key={item.id}
                type="button"
                disabled={owned || !affordable}
                onClick={() => onBuy(item.id)}
                className={`rounded-2xl py-3 px-3 text-sm font-semibold text-left ${
                  owned
                    ? "bg-teal-100 text-teal-700"
                    : affordable
                      ? "bg-amber-500 hover:bg-amber-600 text-white border-b-4 border-amber-700"
                      : "bg-stone-200 text-stone-400"
                }`}
              >
                {item.name}
                <span className="block text-xs font-bold mt-1">
                  {owned ? "✓ At home" : `⭐ ${item.cost}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
