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
        } else if (r < 0.7) {
          // Head tilt.
          scene.tweens.add({ targets: sprite, angle: state.facing * -6, duration: 220, yoyo: true, hold: 300, ease: "Sine.easeInOut" });
        } else if (r < 0.78) {
          // A wing stretch: the flying pose for a beat.
          sprite.setTexture(`bird-${AVATAR.flying}`);
          scene.time.delayedCall(420, () => {
            if (!state.moving) sprite.setTexture(`bird-${AVATAR.standing}`);
          });
        } else if (r < 0.9) {
          // A little song to itself.
          [0, 180, 360].forEach((d, i) => scene.time.delayedCall(d, () => sfx.chirp(i * 2)));
          scene.tweens.add({ targets: sprite, y: sprite.y - 6, duration: 120, yoyo: true, repeat: 2 });
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

/**
 * The hatched chick: a companion, not a counter. It hops after the skylark,
 * but it also acts on its own — points at a feather or a bird with a quest
 * when the kid has been idle a while, hides behind the skylark near an owl,
 * and sleeps in the home nest at night. `tick(ctx)` is called by the scene
 * every ~700ms with what it needs to know.
 */
export function createFollower(scene, x, y, birdKey, height = 56) {
  const sprite = scene.add.image(x, y, birdKey).setOrigin(0.5, 1);
  const scaleAt = (feetY) => (height / sprite.height) * depthScaleAt(feetY);
  sprite.setScale(scaleAt(y)).setDepth(y);
  let busy = false;
  let mode = "follow"; // follow | point | hide | sleep
  let pointUntil = 0;
  let zzz = null;
  const bob = scene.tweens.add({ targets: sprite, y: y - 4, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

  const hopTo = (gx, gy, onDone) => {
    if (busy) return false;
    busy = true;
    bob.pause();
    sprite.setFlipX(gx < sprite.x);
    const sx = sprite.x;
    const sy = sprite.y;
    const p = { t: 0 };
    scene.tweens.add({
      targets: p,
      t: 1,
      duration: Math.min(1100, 300 + Math.hypot(gx - sx, gy - sy) * 1.2),
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
        onDone?.();
      },
    });
    return true;
  };

  const sleep = (nest) => {
    mode = "sleep";
    hopTo(nest.x + 18, nest.y, () => {
      sprite.setAngle(12);
      zzz = scene.add
        .text(sprite.x + 16, sprite.y - 44, "z", { fontFamily: "Fredoka, system-ui, sans-serif", fontSize: "22px", color: "#14231f" })
        .setOrigin(0.5)
        .setDepth(sprite.depth + 1)
        .setAlpha(0.8);
      scene.tweens.add({ targets: zzz, y: zzz.y - 18, alpha: 0.2, scale: 1.4, duration: 1600, repeat: -1, ease: "Sine.easeOut" });
    });
  };
  const wake = () => {
    mode = "follow";
    sprite.setAngle(0);
    zzz?.destroy();
    zzz = null;
  };

  return {
    sprite,
    get mode() {
      return mode;
    },
    follow(tx, ty, facing) {
      if (mode !== "follow") return;
      const gx = tx - facing * 70;
      const gy = clampToGround(Math.min(GROUND_BOTTOM, ty + 14));
      scene.time.delayedCall(180, () => hopTo(gx, gy));
    },
    tick(ctx) {
      const now = scene.time.now;
      // Night: bed time in the nest (the kid can still play; the chick rests).
      if (ctx.night && ctx.nest) {
        if (mode !== "sleep") sleep(ctx.nest);
        return;
      }
      if (mode === "sleep") wake();
      // An owl nearby: hide behind the skylark and shiver.
      const owl = ctx.owls.find((o) => Math.hypot(o.x - ctx.avatar.x, o.y - ctx.avatar.y) < 340);
      if (owl) {
        if (mode !== "hide") {
          mode = "hide";
          const side = Math.sign(ctx.avatar.x - owl.x) || 1;
          hopTo(ctx.avatar.x + side * 44, Math.min(GROUND_BOTTOM, ctx.avatar.y + 10), () => {
            scene.tweens.add({ targets: sprite, x: sprite.x + 3, duration: 60, yoyo: true, repeat: 9 });
            sfx.chirp(3);
          });
        }
        return;
      }
      if (mode === "hide") {
        mode = "follow";
        this.follow(ctx.avatar.x, ctx.avatar.y, ctx.avatar.facing);
        return;
      }
      if (mode === "point") {
        if (now > pointUntil) {
          mode = "follow";
          this.follow(ctx.avatar.x, ctx.avatar.y, ctx.avatar.facing);
        }
        return;
      }
      // Idle kid: point the way to something worth tapping.
      if (ctx.idleMs > 7000 && !ctx.questActive) {
        const near = (list, max) =>
          list
            .map((t) => ({ t, d: Math.hypot(t.x - ctx.avatar.x, t.y - ctx.avatar.y) }))
            .filter((e) => e.d > 80 && e.d < max)
            .sort((a, b) => a.d - b.d)[0]?.t;
        const target = near(ctx.feathers, 620) ?? near(ctx.questNpcs, 820);
        if (!target) return;
        mode = "point";
        pointUntil = now + 6000;
        const gx = ctx.avatar.x + (target.x - ctx.avatar.x) * 0.55;
        const gy = clampToGround(ctx.avatar.y + (target.y - ctx.avatar.y) * 0.55);
        hopTo(gx, gy, () => {
          sprite.setFlipX(target.x < sprite.x);
          sfx.chirp(6);
          scene.tweens.add({ targets: sprite, y: sprite.y - 18, duration: 160, yoyo: true, repeat: 3, ease: "Quad.easeOut" });
          scene.tweens.add({ targets: sprite, angle: (target.x < sprite.x ? 1 : -1) * 10, duration: 200, yoyo: true, repeat: 2 });
        });
      }
    },
    destroy() {
      bob.stop();
      zzz?.destroy();
      sprite.destroy();
    },
  };
}
