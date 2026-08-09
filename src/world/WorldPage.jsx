import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadProgressSummary } from "../progressStore";
import { usePremium } from "../PremiumContext";
import { createWorldGame } from "./createWorldGame";
import { worldSnapshot } from "./mastery/masteryModel";
import { ISLANDS } from "./islands";
import { loadWorldState } from "./worldStore";
import { ZONES } from "./zones/index";
import IslandPanel from "./IslandPanel";
import QuestDialog from "./QuestDialog";
import HomePanel from "./HomePanel";

// One-shot marker for the wordless first-run flight. localStorage like the
// rest of v1 engagement state; a kid with any existing progress never sees
// the intro even without the marker.
const FIRST_SAIL_KEY = "larkit-world-first-sail";

function firstSailPending(anyProgress) {
  if (anyProgress) return false;
  try {
    return localStorage.getItem(FIRST_SAIL_KEY) !== "1";
  } catch {
    return false;
  }
}

function markFirstSailDone() {
  try {
    localStorage.setItem(FIRST_SAIL_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * World mode: full-bleed Phaser canvas plus the DOM layer on top — the
 * island mode panel on the map, the quest dialog and star chip on a
 * walkable island. Map state derives read-only from existing progress;
 * quest/star state lives in worldStore.
 */
export default function WorldPage() {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const navigate = useNavigate();
  const { isPremium } = usePremium();
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [inZone, setInZone] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [wrongTick, setWrongTick] = useState(0);
  const [homeOpen, setHomeOpen] = useState(false);
  const [world, setWorld] = useState(() => {
    const s = loadWorldState();
    return { stars: s.stars, feathers: s.feathers, decorations: s.decorations, pet: null, seed: null };
  });

  useEffect(() => {
    let cancelled = false;
    let game = null;

    loadProgressSummary()
      .catch(() => ({ byMode: {} }))
      .then((summary) => {
        if (cancelled || !hostRef.current) return;
        const byMode = summary?.byMode ?? {};
        const snapshot = worldSnapshot(byMode, ISLANDS, { isPremium });
        // Lifetime practice stars across every mode warm the pet egg too —
        // the pet grows because the kid practiced, anywhere.
        const practiceStars = Object.values(byMode).reduce(
          (sum, m) => sum + (m?.lifetimeStars ?? 0),
          0,
        );
        game = createWorldGame(hostRef.current, {
          snapshot,
          firstSail: firstSailPending(snapshot.anyProgress),
          practiceStars,
        });
        gameRef.current = game;
        game.events.on("island-selected", (islandId) => {
          setSelectedIsland(ISLANDS.find((i) => i.id === islandId) ?? null);
        });
        game.events.on("island-selected-clear", () => setSelectedIsland(null));
        game.events.on("first-sail-complete", markFirstSailDone);
        game.events.on("island-dialog", (d) => {
          setHomeOpen(false);
          setDialog(d);
        });
        game.events.on("island-dialog-close", () => setDialog(null));
        game.events.on("pick-wrong", () => setWrongTick((t) => t + 1));
        game.events.on("world-state", setWorld);
        game.events.on("home-open", () => setHomeOpen(true));
        game.events.on("home-close", () => setHomeOpen(false));
      });

    return () => {
      cancelled = true;
      gameRef.current = null;
      game?.destroy(true);
    };
  }, [isPremium]);

  const closePanel = () => {
    setSelectedIsland(null);
    gameRef.current?.events.emit("world-close-panel");
  };

  const explore = (zoneId) => {
    setSelectedIsland(null);
    setInZone(true);
    gameRef.current?.events.emit("world-enter-zone", zoneId);
  };

  const backToMap = () => {
    setInZone(false);
    setDialog(null);
    setHomeOpen(false);
    gameRef.current?.events.emit("world-go-map");
  };

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div
        ref={hostRef}
        data-testid="world-canvas-host"
        className="absolute inset-0 touch-none select-none"
      />
      {inZone && (
        <>
          <button
            type="button"
            onClick={backToMap}
            aria-label="Back to the map"
            className="absolute top-3 left-3 rounded-2xl bg-white/90 shadow-md px-4 py-2 font-bold text-teal-900 text-lg"
          >
            🗺️ Map
          </button>
          <div
            className="absolute top-3 right-3 rounded-2xl bg-white/90 shadow-md px-4 py-2 font-bold text-amber-600 text-lg"
            aria-label={`${world.stars} stars`}
          >
            ⭐ {world.stars}
            {world.feathers.length > 0 && (
              <span className="ml-2 text-amber-700">🪶 {world.feathers.length}</span>
            )}
          </div>
        </>
      )}
      {selectedIsland && !inZone && (
        <IslandPanel
          island={selectedIsland}
          onClose={closePanel}
          onExplore={explore}
          onPickMode={(modeId) => navigate(`/play/${modeId}`)}
        />
      )}
      {inZone && !homeOpen && (
        <QuestDialog
          dialog={dialog}
          wrongTick={wrongTick}
          onNext={() => gameRef.current?.events.emit("dialog-next")}
          onPick={(value) => gameRef.current?.events.emit("dialog-pick", value)}
        />
      )}
      {inZone && homeOpen && (
        <HomePanel
          zoneHome={ZONES.meadow.home}
          world={world}
          onBuy={(itemId) => gameRef.current?.events.emit("shop-buy", itemId)}
          onClose={() => setHomeOpen(false)}
        />
      )}
    </div>
  );
}
