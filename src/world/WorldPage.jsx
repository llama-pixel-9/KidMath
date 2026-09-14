import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loadProgressSummary } from "../progressStore";
import { usePremium } from "../PremiumContext";
import { loadCalmMode } from "../userPreferences";
import { isMuted, setMuted } from "../sounds";
import { music } from "./worldMusic";
import { createWorldGame } from "./createWorldGame";
import { loadWorldState } from "./worldStore";
import { timeOfDay } from "./worldTime";
import { REGIONS } from "./regions";
import { ZONES } from "./zones/index";
import { birdUrl } from "./worldArt";
import QuestDialog from "./QuestDialog";
import HomePanel from "./HomePanel";
import PracticePanel from "./PracticePanel";
import MapPanel from "./MapPanel";
import { Diamond } from "./ui";

const FIRST_FLIGHT_KEY = "larkit-world-first-flight";

function firstFlightPending(worldState) {
  if (Object.values(worldState.quests ?? {}).some((q) => q.done)) return false;
  try {
    return localStorage.getItem(FIRST_FLIGHT_KEY) !== "1";
  } catch {
    return false;
  }
}
function markFirstFlight() {
  try {
    localStorage.setItem(FIRST_FLIGHT_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** `?world=all,night` — comma-separated test overrides. */
function readOverrides() {
  try {
    const raw = new URLSearchParams(window.location.search).get("world") ?? "";
    return raw.split(",").map((t) => t.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Skylark Island's DOM layer: the Phaser canvas underneath, and on top the
 * star pocket, region name, toasts, the quest dialog, the home nest panel,
 * the practice panel and the region ribbon. React never touches world
 * state directly — the scene owns it and reports over game.events.
 */
export default function WorldPage() {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const navigate = useNavigate();
  const { isPremium } = usePremium();

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [world, setWorld] = useState(() => {
    const s = loadWorldState();
    return { stars: s.stars, feathers: s.feathers, decorations: s.decorations, pet: null, seed: null, discovered: ["meadow"], region: null, quests: s.quests };
  });
  const [dialog, setDialog] = useState(null);
  const [wrongTick, setWrongTick] = useState(0);
  const [rightTick, setRightTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [homeOpen, setHomeOpen] = useState(false);
  const [practiceRegion, setPracticeRegion] = useState(null);
  const [pocketBump, setPocketBump] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (next) music.stop();
    else music.start(world.region ?? "meadow");
  };
  const [avatarX, setAvatarX] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let game = null;
    const tokens = readOverrides();
    const override = tokens.includes("all") ? "all" : null;
    const timeToken = tokens.find((t) => t === "day" || t === "dusk" || t === "night") ?? null;
    const seasonToken = tokens.find((t) => t === "spring" || t === "summer" || t === "autumn" || t === "winter") ?? null;
    const worldState = loadWorldState();

    loadProgressSummary()
      .catch(() => ({ byMode: {} }))
      .then((summary) => {
        if (cancelled || !hostRef.current) return;
        const byMode = summary?.byMode ?? {};
        const practiceStars = Object.values(byMode).reduce((sum, m) => sum + (m?.lifetimeStars ?? 0), 0);
        let calm = loadCalmMode() || tokens.includes("calm");
        try {
          calm = calm || Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
        } catch {
          /* no matchMedia */
        }
        game = createWorldGame(hostRef.current, {
          byMode,
          calm,
          practiceStars,
          isPremium,
          override,
          timeOfDay: timeOfDay(new Date(), timeToken),
          season: seasonToken,
          firstFlight: tokens.includes("arrive") ? true : override === "all" ? false : firstFlightPending(worldState),
        });
        gameRef.current = game;
        const ev = game.events;
        ev.on("boot-progress", setProgress);
        ev.on("world-ready", () => {
          setReady(true);
          // A phone held upright shows a thin slice of the island; say so once.
          try {
            if (window.innerWidth < window.innerHeight && window.innerWidth < 600 && localStorage.getItem("larkit-world-rotate-hint") !== "1") {
              localStorage.setItem("larkit-world-rotate-hint", "1");
              setTimeout(() => setToast({ title: "Turn your phone sideways", sub: "You'll see more of the island.", id: Date.now() }), 2600);
            }
          } catch {
            /* ignore */
          }
        });
        ev.on("world-state", setWorld);
        ev.on("first-flight-complete", markFirstFlight);
        ev.on("dialog", (d) => {
          setHomeOpen(false);
          setPracticeRegion(null);
          setDialog(d);
        });
        ev.on("dialog-close", () => setDialog(null));
        ev.on("pick-wrong", () => setWrongTick((t) => t + 1));
        ev.on("pick-right", () => setRightTick((t) => t + 1));
        ev.on("star-pocket", () => setPocketBump((b) => b + 1));
        ev.on("home-open", () => {
          setDialog(null);
          setPracticeRegion(null);
          setHomeOpen(true);
        });
        ev.on("practice-open", (regionId) => {
          setDialog(null);
          setHomeOpen(false);
          setPracticeRegion(regionId);
        });
        ev.on("toast", (t) => setToast({ ...t, id: Date.now() }));
        ev.on("avatar-x", setAvatarX);
      });

    return () => {
      cancelled = true;
      gameRef.current = null;
      game?.destroy(true);
    };
  }, [isPremium]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const emit = useCallback((name, payload) => gameRef.current?.events.emit(name, payload), []);
  const region = REGIONS.find((r) => r.id === world.region) ?? null;

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden bg-[#c1e6d5] select-none">
      <div ref={hostRef} data-testid="world-canvas-host" className="absolute inset-0 touch-none" />
      {/* A soft vignette gives the frame depth; purely decorative. */}
      <div aria-hidden="true" className="world-vignette absolute inset-0 pointer-events-none" />

      {/* Loading curtain */}
      <div
        aria-hidden={ready}
        className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-cream transition-opacity duration-700 ${ready ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <img src={birdUrl("skylark-fly")} alt="" className="w-40 h-40 object-contain world-bob" />
        <div className="mt-4 w-48 h-3 rounded-full bg-ink/10 overflow-hidden">
          <div className="h-full bg-sun rounded-full transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="mt-3 font-display text-teal text-lg">Flying to the island…</p>
      </div>

      {/* HUD: region name + star pocket */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        {region && (
          <div className="rounded-full bg-cream/90 shadow-md px-4 py-1.5 font-display font-semibold text-teal text-base backdrop-blur">
            {region.title}
          </div>
        )}
      </div>
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          aria-pressed={muted}
          className="pointer-events-auto rounded-full bg-cream/90 shadow-md w-9 h-9 flex items-center justify-center text-base backdrop-blur hover:scale-105 active:scale-95"
        >
          {muted ? "🔇" : "🔊"}
        </button>
        {world.feathers.length > 0 && (
          <div className="rounded-full bg-cream/90 shadow-md px-3 py-1.5 font-display font-semibold text-ink text-base backdrop-blur flex items-center gap-1.5">
            <img src="/meadow/feathers/firstSession.webp" alt="" className="w-5 h-5 object-contain" />
            {world.feathers.length}
          </div>
        )}
        <div
          key={pocketBump}
          aria-label={`${world.stars} stars`}
          className={`rounded-full bg-cream/90 shadow-md px-3 py-1.5 font-display font-semibold text-ink text-lg backdrop-blur flex items-center gap-1.5 ${pocketBump ? "world-pocket-bump" : ""}`}
        >
          <Diamond className="w-5 h-5" />
          {world.stars}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div key={toast.id} className="absolute top-16 inset-x-0 z-20 flex justify-center pointer-events-none px-4">
          <div className="world-toast rounded-2xl bg-cream/95 shadow-lg px-5 py-3 text-center backdrop-blur max-w-sm">
            <div className="font-display font-semibold text-ink text-xl leading-tight">{toast.title}</div>
            {toast.sub && <div className="text-ink/70 text-sm font-bold mt-0.5">{toast.sub}</div>}
          </div>
        </div>
      )}

      {/* Bottom layer: map button, dialog, panels */}
      {ready && !dialog && !homeOpen && !practiceRegion && !mapOpen && (
        <button
          type="button"
          onClick={() => {
            emit("map-open");
            setMapOpen(true);
          }}
          aria-label="Open the island map"
          className="absolute bottom-3 left-3 z-20 rounded-full bg-cream/95 shadow-md pl-2 pr-4 py-1.5 font-display font-semibold text-teal text-base flex items-center gap-2 backdrop-blur hover:scale-105 active:scale-95"
        >
          <span className="world-scroll-icon" aria-hidden="true" />
          Map
        </button>
      )}
      {mapOpen && (
        <MapPanel
          regions={REGIONS}
          zones={ZONES}
          world={world}
          avatarX={avatarX}
          onFly={(id) => {
            setMapOpen(false);
            emit("go-region", id);
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
      {dialog && (
        <QuestDialog
          key={`${dialog.speaker}:${dialog.line}:${dialog.hint}`}
          dialog={dialog}
          wrongTick={wrongTick}
          rightTick={rightTick}
          onNext={() => emit("dialog-next")}
          onPick={(value) => emit("dialog-pick", value)}
        />
      )}
      {homeOpen && (
        <HomePanel zoneHome={ZONES.meadow.home} world={world} onBuy={(itemId) => emit("shop-buy", itemId)} onClose={() => setHomeOpen(false)} />
      )}
      {practiceRegion && (
        <PracticePanel
          region={REGIONS.find((r) => r.id === practiceRegion)}
          onClose={() => setPracticeRegion(null)}
          onPickMode={(modeId) => navigate(`/play/${modeId}`)}
        />
      )}
    </div>
  );
}
