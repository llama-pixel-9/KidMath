/**
 * The flap rig (docs/bird-animation-plan.md, applied to Phaser): art supplies
 * poses, code supplies motion. With today's two poses (wings spread / wings
 * folded) a ~6Hz pose alternation plus a flap-synced bob and a banking tilt
 * reads as cartoon flapping; at rest the bird perches on folded wings.
 *
 * When multi-frame flight art lands (Level 2: wings raised/level/down from
 * the same image model + style reference), extend `flyKeys` with the new
 * texture keys — the rig itself doesn't change.
 */
const FLAP_MS = 85; // half-beat: full wingbeat ≈ 170ms ≈ 6Hz
const BOB_PX = 4;

export function createFlapRig(scene, sprite, { flyKeys, perchKey, height }) {
  let timer = null;
  let frame = 0;
  let bobTween = null;

  // Poses have different native sizes; normalize to a constant display
  // height so the swap doesn't visibly resize the bird.
  const setPose = (key) => {
    if (!scene.textures.exists(key)) return;
    sprite.setTexture(key);
    sprite.setScale(height / sprite.height);
  };

  const stopBob = () => {
    bobTween?.stop();
    bobTween = null;
  };

  return {
    /** Begin flapping; call when a flight/walk starts. dirX tilts the bank. */
    start(dirX = 1) {
      this.stop();
      sprite.setAngle(6 * Math.sign(dirX || 1) * (sprite.flipX ? -1 : 1));
      frame = 0;
      setPose(flyKeys[0]);
      timer = scene.time.addEvent({
        delay: FLAP_MS,
        loop: true,
        callback: () => {
          frame = (frame + 1) % (flyKeys.length + 1);
          // Cycle through fly poses with the folded pose as the downstroke.
          setPose(frame < flyKeys.length ? flyKeys[frame] : perchKey);
        },
      });
      bobTween = scene.tweens.add({
        targets: sprite,
        y: sprite.y - BOB_PX,
        duration: FLAP_MS * 2,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    },

    /** Land: folded wings, level body. Call when movement ends. */
    stop() {
      timer?.remove();
      timer = null;
      stopBob();
      sprite.setAngle(0);
      setPose(perchKey);
    },

    /** For flights where the sprite's y is tweened externally (the bob would
     *  fight it) — flap poses only, no bob. */
    startPosesOnly() {
      this.stop();
      frame = 0;
      setPose(flyKeys[0]);
      timer = scene.time.addEvent({
        delay: FLAP_MS,
        loop: true,
        callback: () => {
          frame = (frame + 1) % (flyKeys.length + 1);
          setPose(frame < flyKeys.length ? flyKeys[frame] : perchKey);
        },
      });
    },

    destroy() {
      timer?.remove();
      stopBob();
    },
  };
}
