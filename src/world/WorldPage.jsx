import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadProgressSummary } from "../progressStore";
import { createWorldGame } from "./createWorldGame";
import { worldSnapshot } from "./mastery/masteryModel";
import { ISLANDS } from "./islands";
import { loadWorldState } from "./worldStore";
import IslandPanel from "./IslandPanel";
import QuestDialog from "./QuestDialog";

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
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [inZone, setInZone] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [wrongTick, setWrongTick] = useState(0);
  const [stars, setStars] = useState(() => loadWorldState().stars);

  useEffect(() => {
    let cancelled = false;
    let game = null;

    loadProgressSummary()
      .catch(() => ({ byMode: {} }))
      .then((summary) => {
        if (cancelled || !hostRef.current) return;
        const snapshot = worldSnapshot(summary?.byMode ?? {}, ISLANDS);
        game = createWorldGame(hostRef.current, {
          snapshot,
          firstSail: firstSailPending(snapshot.anyProgress),
        });
        gameRef.current = game;
        game.events.on("island-selected", (islandId) => {
          setSelectedIsland(ISLANDS.find((i) => i.id === islandId) ?? null);
        });
        game.events.on("island-selected-clear", () => setSelectedIsland(null));
        game.events.on("first-sail-complete", markFirstSailDone);
        game.events.on("island-dialog", setDialog);
        game.events.on("island-dialog-close", () => setDialog(null));
        game.events.on("pick-wrong", () => setWrongTick((t) => t + 1));
        game.events.on("world-stars", setStars);
      });

    return () => {
      cancelled = true;
      gameRef.current = null;
      game?.destroy(true);
    };
  }, []);

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
            aria-label={`${stars} stars`}
          >
            ⭐ {stars}
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
      {inZone && (
        <QuestDialog
          dialog={dialog}
          wrongTick={wrongTick}
          onNext={() => gameRef.current?.events.emit("dialog-next")}
          onPick={(value) => gameRef.current?.events.emit("dialog-pick", value)}
        />
      )}
    </div>
  );
}
