import { pulseRing } from "./juice";

/**
 * Teach by doing, never by telling (Nintendo's first level IS the tutorial).
 * No instructions on screen: after the arrival flight a feather glints two
 * hops away, and the robin beckons — hops toward the skylark, chirps, hops
 * back — until the kid follows. Collecting the feather is the first tap;
 * tapping the robin is the second; the first quest opens from there.
 *
 * Steps: "feather" → "robin" → done (persisted, so it runs once per kid).
 */
export function startTutorial(scene, { robin, feather, onDone }) {
  let step = "feather";
  let ring = feather ? pulseRing(scene, feather.x, feather.y - 36, 46, 0xfffbeb) : null;
  const beckonTimer = scene.time.addEvent({
    delay: 3600,
    loop: true,
    startAt: 2200,
    callback: () => {
      if (!scene.avatar || scene.runner?.isActive) return;
      robin?.beckon(scene.avatar.x);
    },
  });

  const handle = {
    get step() {
      return step;
    },
    featherCollected() {
      if (step !== "feather") return;
      step = "robin";
      ring?.destroy();
      ring = pulseRing(scene, robin.x, robin.y - 60, 70, 0xfffbeb);
      robin?.beckon(scene.avatar.x);
    },
    questStarted() {
      if (step === "done") return;
      step = "done";
      ring?.destroy();
      ring = null;
      beckonTimer.remove();
      onDone?.();
    },
    destroy() {
      ring?.destroy();
      beckonTimer.remove();
    },
  };
  return handle;
}
