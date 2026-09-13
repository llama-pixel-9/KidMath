import Phaser from "phaser";
import { sfx } from "../worldAudio";
import { hearts, sparkle, DEPTH } from "./juice";

/**
 * Rhythm: quiet moments between quests. When the kid has been still for a
 * few seconds and no quest is running, the birds of the current region get
 * on with their lives — one visits another, someone sings, a chick chases a
 * butterfly, a bird preens. Nothing to tap, nothing gated; a world worth
 * watching. The camera never moves for these.
 */
export function startLife(scene, { npcsFor, currentRegion, isQuiet }) {
  let timer = null;
  let running = false;

  const schedule = () => {
    timer?.remove();
    timer = scene.time.addEvent({
      delay: Phaser.Math.Between(11000, 22000),
      callback: () => {
        if (!running && isQuiet()) play();
        schedule();
      },
    });
  };

  const play = () => {
    const regionId = currentRegion();
    const npcs = npcsFor(regionId)?.list ?? [];
    if (!npcs.length) return;
    const choices = ["visit", "song", "preen"];
    const kind = Phaser.Utils.Array.GetRandom(choices);
    running = true;
    const done = () => {
      running = false;
    };
    if (kind === "visit" && npcs.length >= 2) visit(scene, npcs, done);
    else if (kind === "song") song(scene, Phaser.Utils.Array.GetRandom(npcs), done);
    else preen(scene, Phaser.Utils.Array.GetRandom(npcs), done);
  };

  schedule();
  return {
    destroy() {
      timer?.remove();
    },
  };
}

/** A hops over to B; they bob together; hearts; A hops home. */
function visit(scene, npcs, done) {
  const a = Phaser.Utils.Array.GetRandom(npcs);
  const b = npcs.filter((n) => n !== a).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
  if (!b || Math.abs(b.x - a.x) > 760 || a.beckoning) return done();
  const sprite = a.sprite;
  const homeX = a.x;
  const dir = Math.sign(b.x - a.x) || 1;
  const stopX = b.x - dir * 110;
  const hops = 3;
  a.face(b.x);
  let i = 0;
  const hop = (toX, onDone) =>
    scene.tweens.add({
      targets: sprite,
      x: toX,
      duration: 260,
      ease: "Sine.easeInOut",
      onUpdate: (tw) => {
        sprite.y = a.y - Math.sin(tw.progress * Math.PI) * 24;
      },
      onComplete: () => {
        sprite.y = a.y;
        onDone?.();
      },
    });
  const goOut = () => {
    i += 1;
    hop(homeX + ((stopX - homeX) * i) / hops, () => {
      if (i < hops) return goOut();
      b.face(a.sprite.x);
      sfx.chirp(a.def.voice ?? 0);
      scene.time.delayedCall(350, () => sfx.chirp(b.def.voice ?? 0));
      scene.tweens.add({ targets: [a.sprite, b.sprite], y: "-=10", duration: 200, yoyo: true, repeat: 3, ease: "Sine.easeInOut" });
      hearts(scene, (a.sprite.x + b.x) / 2, a.y - 90, 2);
      scene.time.delayedCall(2200, () => {
        a.face(homeX - dir * 100);
        i = 0;
        const goHome = () => {
          i += 1;
          hop(stopX + ((homeX - stopX) * i) / hops, () => (i < hops ? goHome() : done()));
        };
        goHome();
      });
    });
  };
  goOut();
}

/** Three chirps and floating notes. */
function song(scene, npc, done) {
  const notes = ["♪", "♫", "♪"];
  notes.forEach((n, i) => {
    scene.time.delayedCall(i * 420, () => {
      sfx.chirp((npc.def.voice ?? 0) + i);
      scene.tweens.add({ targets: npc.sprite, y: npc.y - 8, duration: 120, yoyo: true });
      const t = scene.add
        .text(npc.x + 30 + i * 6, npc.y - npc.sprite.displayHeight - 4, n, { fontFamily: "Fredoka, system-ui, sans-serif", fontSize: "30px", color: "#0b7a6a" })
        .setOrigin(0.5)
        .setDepth(DEPTH.fx)
        .setAlpha(0.95);
      scene.tweens.add({ targets: t, y: t.y - 70, x: t.x + 24, alpha: 0, angle: 20, duration: 1500, ease: "Sine.easeOut", onComplete: () => t.destroy() });
    });
  });
  scene.time.delayedCall(2000, done);
}

/** A bird tidies its feathers: a ruffle and a sparkle. */
function preen(scene, npc, done) {
  scene.tweens.add({ targets: npc.sprite, angle: 7, duration: 130, yoyo: true, repeat: 5, ease: "Sine.easeInOut" });
  scene.tweens.add({ targets: npc.sprite, scaleX: npc.sprite.scaleX * 1.08, duration: 200, yoyo: true, repeat: 2 });
  scene.time.delayedCall(700, () => sparkle(scene, npc.x + 10, npc.y - npc.sprite.displayHeight * 0.6, { count: 6, tint: 0xfff6d6, radius: 20 }));
  scene.time.delayedCall(1600, done);
}
