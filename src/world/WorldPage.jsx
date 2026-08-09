import { useEffect, useRef } from "react";
import { createWorldGame } from "./createWorldGame";

/**
 * World mode: a full-bleed Phaser canvas filling the routed-page area.
 * Deliberately outside the ~400pt session column — the world is a map you
 * pan, not a worksheet you read. The navbar stays, so a kid can always
 * back out to the rest of the app.
 */
export default function WorldPage() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const game = createWorldGame(host);
    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-testid="world-canvas-host"
      className="flex-1 min-h-0 relative overflow-hidden touch-none select-none"
    />
  );
}
