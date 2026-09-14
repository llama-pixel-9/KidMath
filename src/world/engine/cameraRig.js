import { WORLD_W, WORLD_H } from "../regions";

/**
 * The camera: sized so the ground band and horizon fill the screen, follows
 * the skylark with a soft lag and a little look-ahead in the direction of
 * travel, and can "focus" (zoom toward an NPC or fixture while a dialog is
 * open) and release again.
 */
const VISIBLE_H = 880; // world px we want to see vertically at the base zoom

const PORTRAIT_VISIBLE_W = 560; // world px across a phone held upright

export function zoomFor(viewW, viewH) {
  // Landscape: fit the ground band plus horizon vertically. Portrait: fit
  // enough of the island ACROSS the screen to walk in, at the cost of sky.
  const fit = viewW < viewH ? viewW / PORTRAIT_VISIBLE_W : viewH / VISIBLE_H;
  // Never show more than the whole world height, never zoom out so far
  // on a tall phone that the ground band turns into a strip.
  const minByWorld = viewH / WORLD_H;
  return Math.max(minByWorld, Math.min(1.35, Math.max(0.45, fit)));
}

export function setupCamera(scene, target) {
  const cam = scene.cameras.main;
  cam.setBounds(0, 0, WORLD_W, WORLD_H);
  cam.setRoundPixels(true);

  const rig = {
    baseZoom: 1,
    focused: false,
    lookAhead: 0,
    apply() {
      const z = zoomFor(scene.scale.width, scene.scale.height);
      rig.baseZoom = z;
      if (!rig.focused) cam.setZoom(z);
    },
    follow() {
      cam.startFollow(target, false, 0.08, 0.08);
      // Keep the horizon in frame: bias the camera to look slightly above
      // the bird's feet.
      cam.setFollowOffset(0, 120);
    },
    setLookAhead(dir) {
      const want = dir * 110;
      if (want === rig.lookAhead) return;
      rig.lookAhead = want;
      scene.tweens.add({
        targets: cam.followOffset,
        x: -want,
        duration: 600,
        ease: "Sine.easeOut",
      });
    },
    focus(x, y, zoomMul = 1.18) {
      rig.focused = true;
      cam.stopFollow();
      cam.pan(x, y - 80, 520, "Sine.easeInOut");
      cam.zoomTo(rig.baseZoom * zoomMul, 520, "Sine.easeInOut");
    },
    release() {
      if (!rig.focused) return;
      rig.focused = false;
      cam.zoomTo(rig.baseZoom, 460, "Sine.easeInOut");
      scene.time.delayedCall(120, () => rig.follow());
    },
    /** A long cinematic pan (region reveals), then hand control back. */
    cinematic(x, y, duration = 1200, hold = 900, onDone) {
      cam.stopFollow();
      cam.pan(x, y - 60, duration, "Sine.easeInOut", false, (c, progress) => {
        if (progress === 1) {
          scene.time.delayedCall(hold, () => {
            cam.pan(target.x, target.y - 120, 900, "Sine.easeInOut", false, (cc, p) => {
              if (p === 1) {
                rig.follow();
                onDone?.();
              }
            });
          });
        }
      });
    },
    destroy() {
      scene.scale.off("resize", rig.apply);
    },
  };

  rig.apply();
  scene.scale.on("resize", rig.apply);
  return rig;
}
