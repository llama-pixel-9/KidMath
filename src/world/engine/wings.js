import Phaser from "phaser";

/**
 * Wings for every bird. The art has one standing pose per species (only the
 * skylark has a flying pose), so flight was a squash. Each bird now gets a
 * pair of wings drawn once as a soft feathered silhouette, tinted from the
 * bird's own body colour, pinned at the shoulder behind the body: they flap
 * in flight, tuck when perched, and stretch every so often at rest.
 */
export function makeWingTexture(scene) {
  if (scene.textures.exists("wingfeather")) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // A wing pointing right from its shoulder at (6, 10): three feather lobes.
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(34, 12, 56, 20);
  g.fillEllipse(48, 16, 40, 14);
  g.fillEllipse(58, 20, 26, 10);
  g.fillStyle(0xffffff, 0.75);
  g.fillEllipse(24, 9, 30, 12);
  g.generateTexture("wingfeather", 76, 30);
  // The outer third of the wing, for a darker tip.
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(52, 16, 34, 13);
  g.fillEllipse(60, 20, 24, 9);
  g.generateTexture("wingtip", 76, 30);
  g.destroy();
}

/** Average colour of the bird's body from its texture; falls back to warm grey. */
export function bodyColor(scene, key) {
  const tex = scene.textures.get(key);
  const src = tex?.getSourceImage?.();
  if (!src) return 0xb0a090;
  const w = src.width;
  const h = src.height;
  let r = 0;
  let gg = 0;
  let b = 0;
  let n = 0;
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const px = scene.textures.getPixel(Math.round(w * 0.5 + i * w * 0.05), Math.round(h * 0.58 + j * h * 0.05), key);
      if (!px || px.alpha < 200) continue;
      r += px.red;
      gg += px.green;
      b += px.blue;
      n += 1;
    }
  }
  if (!n) return 0xb0a090;
  // Slightly darker than the body so the wing reads as a wing.
  const dim = (v) => Math.max(0, Math.round((v / n) * 0.82));
  return Phaser.Display.Color.GetColor(dim(r), dim(gg), dim(b));
}

/**
 * Attach wings to a bird image whose origin is (0.5, 1) — feet at its y.
 * Returns a rig with flap()/rest()/stretch()/sync()/destroy().
 */
export function attachWings(scene, sprite, { key = sprite.texture.key, size = 1 } = {}) {
  makeWingTexture(scene);
  const color = bodyColor(scene, key);
  const darker = Phaser.Display.Color.IntegerToColor(color).darken(22).color;
  const far = scene.add.image(0, 0, "wingfeather").setOrigin(0.08, 0.35).setTint(color).setAlpha(0.85);
  const near = scene.add.image(0, 0, "wingfeather").setOrigin(0.08, 0.35).setTint(color);
  const tip = scene.add.image(0, 0, "wingtip").setOrigin(0.08, 0.35).setTint(darker);
  far.setDepth(sprite.depth - 0.2);
  near.setDepth(sprite.depth - 0.1);
  tip.setDepth(sprite.depth - 0.09);
  let flapTween = null;
  let mode = "rest";

  const rig = {
    color,
    near,
    far,
    /** Follow the bird every frame: shoulder position, facing, scale, depth. */
    sync() {
      const h = sprite.displayHeight;
      const w = sprite.displayWidth;
      const dir = sprite.flipX ? -1 : 1;
      const sx = sprite.x - dir * w * 0.12;
      const sy = sprite.y - h * 0.62;
      const s = (h / 110) * size;
      for (const wing of [near, far, tip]) {
        if (wing.scrollFactorX !== sprite.scrollFactorX) wing.setScrollFactor(sprite.scrollFactorX, sprite.scrollFactorY);
        wing.setPosition(sx, sy);
        wing.setScale(s * (wing === far ? 0.9 : 1), s);
        wing.setFlipX(dir < 0);
        wing.setDepth(sprite.depth - (wing === far ? 0.2 : wing === near ? 0.1 : 0.09));
        wing.setVisible(sprite.visible && sprite.alpha > 0.05);
        wing.setAlpha(sprite.alpha * (wing === far ? 0.8 : 1));
      }
      // Wings point back and down when tucked, out and beating in flight.
      if (mode === "rest") {
        near.setAngle(dir * 168);
        tip.setAngle(dir * 168);
        far.setAngle(dir * 172);
        near.setScale(s * 0.55, s * 0.5);
        tip.setScale(s * 0.55, s * 0.5);
        far.setScale(s * 0.5, s * 0.45);
      }
    },
    flap(hz = 6) {
      if (mode === "flap") return;
      mode = "flap";
      flapTween?.stop();
      const dir = sprite.flipX ? -1 : 1;
      const a = { v: 0 };
      flapTween = scene.tweens.add({
        targets: a,
        v: 1,
        duration: 1000 / hz / 2,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          const d = sprite.flipX ? -1 : 1;
          const up = -55;
          const down = 30;
          near.setAngle(d * (up + (down - up) * a.v));
          tip.setAngle(near.angle);
          far.setAngle(d * (up - 12 + (down - 8 - (up - 12)) * a.v));
        },
      });
      void dir;
    },
    rest() {
      mode = "rest";
      flapTween?.stop();
      flapTween = null;
      rig.sync();
    },
    /** A slow stretch at rest: both wings out, then tuck. */
    stretch(onDone) {
      if (mode !== "rest") return;
      mode = "stretch";
      const d = sprite.flipX ? -1 : 1;
      const a = { v: 0 };
      scene.tweens.add({
        targets: a,
        v: 1,
        duration: 420,
        yoyo: true,
        hold: 380,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          const h = sprite.displayHeight;
          const s = (h / 110) * size;
          near.setAngle(d * (168 - 200 * a.v));
          tip.setAngle(near.angle);
          far.setAngle(d * (172 - 190 * a.v));
          near.setScale(s * (0.55 + 0.45 * a.v), s * (0.5 + 0.5 * a.v));
          tip.setScale(near.scaleX, near.scaleY);
          far.setScale(s * (0.5 + 0.4 * a.v), s * (0.45 + 0.45 * a.v));
        },
        onComplete: () => {
          mode = "rest";
          rig.sync();
          onDone?.();
        },
      });
    },
    get mode() {
      return mode;
    },
    destroy() {
      flapTween?.stop();
      near.destroy();
      far.destroy();
      tip.destroy();
    },
  };
  rig.sync();
  return rig;
}
