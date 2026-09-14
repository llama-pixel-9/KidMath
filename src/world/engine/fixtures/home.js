import { depthScaleAt } from "../../regions";
import { birdSize, propSize } from "../../worldArt";
import { sfx } from "../../worldAudio";
import { sparkle, hearts, dust } from "../juice";
import { toWorld, standProp, hitZone } from "./common";

const PET_BIRD = "condorChick";

/**
 * The home nest by the island's front door: where the pet egg lives and
 * decorations bought with stars appear. Tapping the nest opens the home
 * panel (DOM). `renderPet(stage)` shows the egg stage or the chick;
 * `hatch()` runs the ceremony when the chick arrives.
 */
export function buildHome(scene, zone, region) {
  const o = zone.home;
  if (!o) return null;
  const { x: cx, y: cy } = toWorld(region, o);
  const ds = depthScaleAt(cy);
  const nest = standProp(scene, "nestBig", cx, cy, 150);
  const nestH = 150 * ds;
  const bowlY = cy - nestH * 0.42;

  let petSprite = null;
  let petStage = null;
  let hatched = false;

  const decorations = new Map();
  const renderDecoration = (item, justBought = false) => {
    if (decorations.has(item.id)) return;
    const p = toWorld(region, item);
    const img = standProp(scene, item.prop, p.x, p.y, item.size);
    if (!img) return;
    decorations.set(item.id, img);
    if (!justBought) return;
    const s = img.scaleX;
    img.setScale(0.1).setAlpha(0);
    scene.tweens.add({ targets: img, scale: s, alpha: 1, duration: 520, ease: "Back.easeOut" });
    sparkle(scene, p.x, p.y - 40, { count: 14, tint: 0xfff3d6, radius: 50 });
    dust(scene, p.x, p.y, { count: 8 });
    sfx.chime();
  };

  const showEgg = (stage) => {
    petSprite?.destroy();
    const { h } = { h: 512 };
    petSprite = scene.add
      .image(cx, bowlY + 6, `egg-${stage}`)
      .setOrigin(0.5, 1)
      .setScale((68 / h) * ds)
      .setDepth(cy + 0.5);
    // Gentle rock: the egg is alive.
    scene.tweens.add({ targets: petSprite, angle: 3, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  };
  const showChick = () => {
    petSprite?.destroy();
    const { h } = birdSize(PET_BIRD);
    petSprite = scene.add
      .image(cx, bowlY + 6, `bird-${PET_BIRD}`)
      .setOrigin(0.5, 1)
      .setScale((56 / h) * ds)
      .setDepth(cy + 0.5);
    scene.tweens.add({ targets: petSprite, y: bowlY, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  };

  const handle = {
    anchor: { x: cx + 90, y: cy + 10 },
    x: cx,
    y: cy,
    nest,
    renderPet(stage) {
      petStage = stage;
      if (stage == null) {
        petSprite?.destroy();
        petSprite = null;
        return;
      }
      if (stage === "hatched") {
        // The chick is the follower now; the bowl stays empty (it sleeps here at night).
        hatched = true;
        petSprite?.destroy();
        petSprite = null;
      } else {
        showEgg(stage);
      }
    },
    /** The hatching ceremony: the egg rocks harder and harder, cracks, bursts;
     *  the chick sits up in the nest and chirps, then (onDone) hops out. */
    hatch(onDone) {
      if (hatched) return onDone?.();
      hatched = true;
      if (!petSprite) showEgg(3);
      scene.tweens.killTweensOf(petSprite);
      const egg = petSprite;
      const rock = (amp, dur, reps, onEnd) => scene.tweens.add({ targets: egg, angle: amp, duration: dur, yoyo: true, repeat: reps, ease: "Sine.easeInOut", onComplete: onEnd });
      rock(8, 120, 3, () => {
        sfx.hatch();
        scene.time.delayedCall(200, () => egg.setTexture(`egg-${Math.min(3, (typeof petStage === "number" ? petStage : 0) + 1)}`));
        rock(16, 90, 5, () => {
          egg.setTexture("egg-3");
          rock(26, 70, 7, () => {
            sparkle(scene, cx, bowlY - 20, { count: 30, tint: 0xfff3d6, radius: 90 });
            dust(scene, cx, bowlY + 4, { count: 14, tint: 0xfffbeb });
            showChick();
            petSprite.setScale(petSprite.scaleX * 0.2);
            scene.tweens.add({ targets: petSprite, scale: petSprite.scaleX * 5, duration: 500, ease: "Back.easeOut" });
            hearts(scene, cx, bowlY - 50, 4);
            [300, 700, 1100].forEach((d, i) => scene.time.delayedCall(d, () => sfx.chirp(6 + i)));
            scene.time.delayedCall(2600, () => {
              petSprite?.destroy();
              petSprite = null;
              onDone?.();
            });
          });
        });
      });
    },
    renderDecorations(items, ownedIds, justBoughtId = null) {
      for (const item of items) {
        if (ownedIds.includes(item.id)) renderDecoration(item, item.id === justBoughtId);
      }
    },
    petPosition() {
      return { x: cx, y: bowlY + 6 };
    },
  };

  hitZone(scene, cx, cy - nestH * 0.4, nestH * 1.5, nestH * 1.1, () => {
    scene.tweens.add({ targets: nest, scale: nest.scaleX * 1.05, duration: 120, yoyo: true });
    sfx.chirp(3);
    scene.game.events.emit("home-open");
  });

  return handle;
}

export { propSize };
