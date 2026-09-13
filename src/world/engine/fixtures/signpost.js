import { depthScaleAt } from "../../regions";
import { sfx } from "../../worldAudio";
import { standProp, hitZone } from "./common";

/**
 * The practice signpost: the strand's minigames live behind it (plan Part
 * 2 — "the existing minigames slot in as practice spots"). A Sun diamond on
 * the sign face plus PLAY, so non-readers know it too.
 */
export function buildSignpost(scene, region) {
  const s = region.signpost;
  if (!s) return null;
  const x = region.x0 + s.x;
  const y = s.y;
  const ds = depthScaleAt(y);
  const sign = standProp(scene, "sign", x, y, 140);
  if (!sign) return null;
  const faceY = y - 140 * ds * 0.72;
  const diamond = scene.add.image(x - 26 * ds, faceY, "diamond").setScale(0.75 * ds).setDepth(y + 0.1);
  const label = scene.add
    .text(x + 10 * ds, faceY, "PLAY", {
      fontFamily: "Fredoka, system-ui, sans-serif",
      fontSize: `${Math.round(24 * ds)}px`,
      fontStyle: "600",
      color: "#14231f",
    })
    .setOrigin(0.5)
    .setDepth(y + 0.1);
  // A slow glint so it reads as a thing to tap.
  scene.tweens.add({ targets: diamond, angle: 20, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

  hitZone(scene, x, y - 70 * ds, 150 * ds, 150 * ds, () => {
    scene.tweens.add({ targets: [sign, diamond, label], y: "-=8", duration: 110, yoyo: true });
    sfx.chirp(5);
    scene.game.events.emit("practice-open", region.id);
  });
  return { x, y, sign, anchor: { x: x - 70, y: y + 20 } };
}
