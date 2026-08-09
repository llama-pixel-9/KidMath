import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadProgressSummary } from "../progressStore";
import { createWorldGame } from "./createWorldGame";
import { worldSnapshot } from "./mastery/masteryModel";
import { ISLANDS } from "./islands";
import IslandPanel from "./IslandPanel";

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
 * World mode: full-bleed Phaser canvas in the routed-page area, plus the DOM
 * layer on top (island mode panel). The map derives everything from the
 * progress the app already stores — works signed-in (cloud rows) and
 * anonymous (localStorage) alike, read-only.
 */
export default function WorldPage() {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const navigate = useNavigate();
  const [selectedIsland, setSelectedIsland] = useState(null);

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
        game.events.on("first-sail-complete", markFirstSailDone);
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

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div
        ref={hostRef}
        data-testid="world-canvas-host"
        className="absolute inset-0 touch-none select-none"
      />
      {selectedIsland && (
        <IslandPanel
          island={selectedIsland}
          onClose={closePanel}
          onPickMode={(modeId) => navigate(`/play/${modeId}`)}
        />
      )}
    </div>
  );
}
