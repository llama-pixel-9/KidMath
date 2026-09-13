import Phaser from "phaser";
import { depthScaleAt, clampToGround, GROUND_BOTTOM } from "../regions";
import { AVATAR } from "../worldArt";
import { sfx } from "../worldAudio";
import { dust, squash, stretch, DEPTH } from "./juice";

const HOP_LEN = 92; // px per hop along the ground
const HOP_MS = 250;
const HOP_ARC = 30;
const FLY_THRESHOLD = 420; // further than this, take wing
const FLAP_MS = 80;
const AVATAR_HEIGHT = 118; // display px at depth 1.0

/**
 * The kid's skylark. Tap the ground: it hops there (short) or flies there
 * (long, or over water). Facing follows travel; a shadow sits on the ground
 * and shrinks as it climbs; landing squashes and kicks up dust. `pet` is an
 * optional follower (the hatched chick) that hops after it.
 */
export function createAvatar(scene, x, y, { waterRects = [], landRects = [] } = {}) {
  const shadow = scene.add.ellipse(x, y + 2, 70, 18, 0x14231f, 0.18).setDepth(DEPTH.ground - 1);
  const sprite = scene.add.image(x, y, `bird-${AVATAR.standing}`).setOrigin(0.5, 1);
  const baseScaleFor = (feetY) => (AVATAR_HEIGHT / scene.textures.get(`bird-${AVATAR.standing}`).getSourceImage().height) * depthScaleAt(feetY);

  const state = {
    feetY: y,
    moving: false,
    flying: false,
    facing: 1,
    tween: null,
    flapTimer: null,
    idleTimer: null,
    onArrive: null,
    follower: null,
  };

  const place = (px, feetY, altitude = 0) => {
    state.feetY = feetY;
    sprite.x = px;
    sprite.y = feetY - altitude;
    sprite.setDepth(feetY);
    shadow.x = px;
    shadow.y = feetY + 2;
    const s = baseScaleFor(feetY);
    if (!state.flying) sprite.setScale(s);
    const shrink = Math.max(0.35, 1 - altitude / 320);
    shadow.setScale(shrink * depthScaleAt(feetY), shrink * depthScaleAt(feetY));
    shadow.setAlpha(0.18 * shrink);
    shadow.setDepth(feetY - 1);
  };
  place(x, y);

  const face = (dir) => {
    if (!dir) return;
    state.facing = dir;
    sprite.setFlipX(dir < 0);
  };

  const inRect = (r, px, py) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  const inWater = (px, py) => waterRects.some((r) => inRect(r, px, py)) && !landRects.some((r) => inRect(r, px, py));

  // ------------------------------------------------------------- idle life
  const idle = () => {
    state.idleTimer?.remove();
    state.idleTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(2600, 5200),
      loop: true,
      callback: () => {
        if (state.moving) return;
        const s = baseScaleFor(state.feetY);
        const r = Math.random();
        if (r < 0.45) {
          // A little bounce in place.
          breathe.pause();
          scene.tweens.add({ targets: sprite, y: sprite.y - 10, duration: 130, yoyo: true, ease: "Quad.easeOut" });
          squash(scene, sprite, s, { amount: 0.08, duration: 90 });
          scene.time.delayedCall(260, () => {
            if (!state.moving) breathe.resume();
          });
        } else if (r < 0.8) {
          // Head tilt.
          scene.tweens.add({ targets: sprite, angle: state.facing * -6, duration: 220, yoyo: true, hold: 300, ease: "Sine.easeInOut" });
        } else {
          face(-state.facing);
        }
      },
    });
  };
  idle();
  // Breathing: re-created after every move from the current depth scale, so
  // it never snaps the bird back to an old size.
  let breatheTween = null;
  const breathe = {
    pause() {
      breatheTween?.stop();
      breatheTween = null;
      sprite.scaleY = sprite.scaleX;
    },
    resume() {
      breathe.pause();
      const base = sprite.scaleX;
      breatheTween = scene.tweens.add({
        targets: sprite,
        scaleY: base * 1.025,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    },
    stop() {
      breathe.pause();
    },
  };
  breathe.resume();

  // -------------------------------------------------------------- flapping
  const startFlap = () => {
    let frame = 0;
    sprite.setTexture(`bird-${AVATAR.flying}`);
    state.flapTimer?.remove();
    state.flapTimer = scene.time.addEvent({
      delay: FLAP_MS,
      loop: true,
      callback: () => {
        frame = (frame + 1) % 3;
        sprite.setTexture(frame === 2 ? `bird-${AVATAR.standing}` : `bird-${AVATAR.flying}`);
        if (frame === 0) sfx.flap();
      },
    });
  };
  const stopFlap = () => {
    state.flapTimer?.remove();
    state.flapTimer = null;
    sprite.setTexture(`bird-${AVATAR.standing}`);
  };

  const finish = () => {
    state.moving = false;
    state.flying = false;
    stopFlap();
    sprite.setAngle(0);
    breathe.resume();
    const cb = state.onArrive;
    state.onArrive = null;
    cb?.();
  };

  const stop = () => {
    state.tween?.stop();
    state.tween = null;
    if (state.moving) finish();
  };

  // ------------------------------------------------------------------ hop
  const hopTo = (tx, ty) => {
    const dx = tx - sprite.x;
    const dy = ty - state.feetY;
    const dist = Math.hypot(dx, dy);
    const hops = Math.max(1, Math.round(dist / HOP_LEN));
    const sx = sprite.x;
    const sy = state.feetY;
    face(Math.sign(dx));
    breathe.pause();
    let hop = 0;
    const doHop = () => {
      if (hop >= hops) return finish();
      const t0 = hop / hops;
      const t1 = (hop + 1) / hops;
      const from = { x: sx + dx * t0, y: sy + dy * t0 };
      const to = { x: sx + dx * t1, y: sy + dy * t1 };
      const p = { t: 0 };
      sfx.hop();
      state.tween = scene.tweens.add({
        targets: p,
        t: 1,
        duration: HOP_MS,
        ease: "Linear",
        onUpdate: () => {
          const px = from.x + (to.x - from.x) * p.t;
          const py = from.y + (to.y - from.y) * p.t;
          place(px, py, Math.sin(p.t * Math.PI) * HOP_ARC);
          sprite.setAngle(state.facing * (p.t < 0.5 ? -5 : 4));
        },
        onComplete: () => {
          hop += 1;
          sprite.setAngle(0);
          if (hop >= hops) {
            squash(scene, sprite, baseScaleFor(to.y), { amount: 0.14, duration: 100 });
            dust(scene, to.x, to.y, { count: 6, spread: 45 });
            sfx.land();
            state.follower?.follow(to.x, to.y, state.facing);
            finish();
          } else {
            doHop();
          }
        },
      });
    };
    doHop();
  };

  // ------------------------------------------------------------------ fly
  const flyTo = (tx, ty, { onArrive, cinematic = false } = {}) => {
    const sx = sprite.x;
    const sy = state.feetY;
    const dx = tx - sx;
    const dist = Math.hypot(dx, ty - sy);
    face(Math.sign(dx) || state.facing);
    state.flying = true;
    breathe.pause();
    stretch(scene, sprite, baseScaleFor(sy), { amount: 0.16, duration: 110 });
    sfx.takeoff();
    dust(scene, sx, sy, { count: 8, spread: 70 });
    scene.time.delayedCall(200, startFlap);
    const apex = Math.min(300, 110 + dist * 0.22);
    const p = { t: 0 };
    const dur = cinematic ? Math.max(1800, dist / 0.5) : Math.max(700, dist / 0.62);
    state.onArrive = onArrive ?? state.onArrive;
    state.tween = scene.tweens.add({
      targets: p,
      t: 1,
      duration: dur,
      delay: 230,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        const t = p.t;
        const px = sx + dx * t;
        const feet = sy + (ty - sy) * t;
        const alt = Math.sin(t * Math.PI) * apex;
        place(px, feet, alt);
        // Constant display height while airborne, banked into the turn.
        sprite.setScale(baseScaleFor(feet) * 1.08);
        const bank = t < 0.5 ? -9 : 7;
        sprite.setAngle(state.facing * bank * Math.sin(t * Math.PI));
      },
      onComplete: () => {
        place(tx, ty, 0);
        squash(scene, sprite, baseScaleFor(ty), { amount: 0.18, duration: 120 });
        dust(scene, tx, ty, { count: 12, spread: 80 });
        sfx.land();
        state.follower?.follow(tx, ty, state.facing);
        finish();
      },
    });
  };

  const goTo = (tx, ty, { onArrive } = {}) => {
    ty = clampToGround(ty);
    stop();
    state.moving = true;
    state.onArrive = onArrive ?? null;
    const dist = Math.hypot(tx - sprite.x, ty - state.feetY);
    // Sample the straight path for water: birds don't hop across a pond.
    let crossesWater = false;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      if (inWater(sprite.x + (tx - sprite.x) * t, state.feetY + (ty - state.feetY) * t)) crossesWater = true;
    }
    if (dist > FLY_THRESHOLD || crossesWater) flyTo(tx, ty);
    else hopTo(tx, ty);
  };

  return {
    sprite,
    shadow,
    state,
    get x() {
      return sprite.x;
    },
    get y() {
      return state.feetY;
    },
    get facing() {
      return state.facing;
    },
    get moving() {
      return state.moving;
    },
    goTo,
    flyTo,
    face,
    stop,
    place,
    setFollower(f) {
      state.follower = f;
    },
    /** A celebratory little jump. */
    cheer() {
      const s = baseScaleFor(state.feetY);
      breathe.pause();
      scene.tweens.add({ targets: sprite, y: sprite.y - 34, duration: 200, yoyo: true, ease: "Quad.easeOut" });
      squash(scene, sprite, s, { amount: 0.12, duration: 100 });
      sfx.hop();
      scene.time.delayedCall(420, () => {
        if (!state.moving) breathe.resume();
      });
    },
    destroy() {
      state.idleTimer?.remove();
      state.flapTimer?.remove();
      breathe.stop();
      sprite.destroy();
      shadow.destroy();
    },
  };
}

/** The hatched chick that hops after the skylark, a step behind. */
export function createFollower(scene, x, y, birdKey, height = 56) {
  const sprite = scene.add.image(x, y, birdKey).setOrigin(0.5, 1);
  const scaleAt = (feetY) => (height / sprite.height) * depthScaleAt(feetY);
  sprite.setScale(scaleAt(y)).setDepth(y);
  let busy = false;
  const bob = scene.tweens.add({ targets: sprite, y: y - 4, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  return {
    sprite,
    follow(tx, ty, facing) {
      const gx = tx - facing * 70;
      const gy = clampToGround(Math.min(GROUND_BOTTOM, ty + 14));
      if (busy) return;
      busy = true;
      bob.pause();
      sprite.setFlipX(tx < sprite.x);
      const sx = sprite.x;
      const sy = sprite.y;
      const p = { t: 0 };
      scene.time.delayedCall(180, () => {
        scene.tweens.add({
          targets: p,
          t: 1,
          duration: Math.min(900, 300 + Math.hypot(gx - sx, gy - sy) * 1.2),
          ease: "Sine.easeInOut",
          onUpdate: () => {
            sprite.x = sx + (gx - sx) * p.t;
            const feet = sy + (gy - sy) * p.t;
            sprite.y = feet - Math.abs(Math.sin(p.t * Math.PI * 3)) * 16;
            sprite.setScale(scaleAt(feet)).setDepth(feet);
          },
          onComplete: () => {
            sprite.y = gy;
            busy = false;
            bob.restart();
          },
        });
      });
    },
    destroy() {
      bob.stop();
      sprite.destroy();
    },
  };
}
