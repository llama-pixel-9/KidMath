import Phaser from "phaser";
import { depthScaleAt } from "../regions";
import { birdSize } from "../worldArt";
import { sfx } from "../worldAudio";
import { questMarker, hearts, squash, sparkle } from "./juice";
import { toWorld, hitZone } from "./fixtures/common";

/**
 * The birds who live on the island. Each stands at its spot with a little
 * idle life (breathing, the odd hop, a head tilt), wears a marker when it
 * has a quest to offer, turns to face the skylark when it comes near, and
 * remembers you once you've helped ("You fixed my bridge!").
 */
export function buildNpcs(scene, zone, region, { onTap }) {
  const list = zone.npcs.map((npc) => {
    const p = toWorld(region, npc);
    const ds = depthScaleAt(p.y);
    const { h } = birdSize(npc.bird);
    const scale = (npc.size / h) * ds;
    const sprite = scene.add.image(p.x, p.y, `bird-${npc.bird}`).setOrigin(0.5, 1).setScale(scale).setDepth(p.y);
    const shadow = scene.add.ellipse(p.x, p.y + 2, npc.size * 0.55 * ds, 12 * ds, 0x14231f, 0.16).setDepth(p.y - 1);

    // Breathing.
    scene.tweens.add({ targets: sprite, scaleY: scale * 1.03, duration: 1500 + Math.random() * 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    // Idle: hop or tilt every few seconds.
    const idle = scene.time.addEvent({
      delay: Phaser.Math.Between(3500, 7000),
      loop: true,
      callback: () => {
        if (Math.random() < 0.5) {
          scene.tweens.add({ targets: sprite, y: p.y - 14, duration: 150, yoyo: true, ease: "Quad.easeOut" });
        } else {
          scene.tweens.add({ targets: sprite, angle: -5, duration: 260, yoyo: true, hold: 260, ease: "Sine.easeInOut" });
        }
      },
    });

    const handle = {
      def: npc,
      x: p.x,
      y: p.y,
      sprite,
      shadow,
      marker: null,
      /** Where the skylark stands to talk: just in front, on the near side. */
      talkSpot() {
        return { x: p.x - 120, y: Math.min(1120, p.y + 26) };
      },
      setMarker(on) {
        if (on && !this.marker) this.marker = questMarker(scene, p.x, p.y - npc.size * ds - 34);
        if (!on && this.marker) {
          this.marker.destroy();
          this.marker = null;
        }
      },
      face(x) {
        sprite.setFlipX(x < p.x);
      },
      /** A happy hop with hearts (thanks, celebration). */
      cheer() {
        hearts(scene, p.x, p.y - npc.size * ds - 10, 3);
        scene.tweens.add({ targets: sprite, y: p.y - 30, duration: 190, yoyo: true, repeat: 1, ease: "Quad.easeOut" });
        squash(scene, sprite, scale, { amount: 0.1, duration: 100 });
        sfx.happy();
      },
      /** Turn toward the speaker and chirp. */
      greet(fromX) {
        this.face(fromX);
        scene.tweens.add({ targets: sprite, y: p.y - 12, duration: 140, yoyo: true, ease: "Quad.easeOut" });
        sfx.chirp(npc.voice ?? 0);
      },
      /** "Come here!": two hops toward the skylark, a chirp, two hops back. */
      beckon(towardX) {
        if (this.beckoning) return;
        this.beckoning = true;
        const dir = Math.sign(towardX - p.x) || -1;
        this.face(towardX);
        const hop = (toX, onDone) =>
          scene.tweens.add({
            targets: sprite,
            x: toX,
            duration: 220,
            ease: "Sine.easeInOut",
            onUpdate: (tw) => {
              sprite.y = p.y - Math.sin(tw.progress * Math.PI) * 26;
            },
            onComplete: () => {
              sprite.y = p.y;
              onDone?.();
            },
          });
        hop(p.x + dir * 55, () =>
          hop(p.x + dir * 110, () => {
            sfx.chirp(npc.voice ?? 0);
            scene.tweens.add({ targets: sprite, angle: dir * -8, duration: 160, yoyo: true, repeat: 1 });
            scene.time.delayedCall(700, () => {
              this.face(p.x + dir * -200);
              hop(p.x + dir * 55, () =>
                hop(p.x, () => {
                  this.face(towardX);
                  this.beckoning = false;
                }),
              );
            });
          }),
        );
      },
      /** A species-flavoured show-off, for birds you've already helped. */
      flourish() {
        const id = npc.bird;
        const dance = `bird-${id}-dance`;
        if (id === "downyWoodpecker") {
          sfx.peck(6);
          scene.tweens.add({ targets: sprite, angle: -14, duration: 70, yoyo: true, repeat: 5 });
        } else if (id === "hummingbird") {
          scene.tweens.add({ targets: sprite, y: p.y - 40, duration: 300, ease: "Quad.easeOut", yoyo: true, hold: 900 });
          scene.tweens.add({ targets: sprite, angle: 4, duration: 60, yoyo: true, repeat: 20 });
          sfx.chirp(9);
        } else if (id === "snowyOwl" || id === "barnOwl") {
          [0, 250, 500, 750].forEach((d) => scene.time.delayedCall(d, () => sprite.setFlipX(!sprite.flipX)));
          scene.time.delayedCall(1000, () => this.face(scene.avatar?.x ?? p.x));
          sfx.chirp(1);
        } else if (id === "puffin") {
          scene.tweens.add({ targets: sprite, angle: 9, duration: 150, yoyo: true, repeat: 5, ease: "Sine.easeInOut" });
          scene.tweens.add({ targets: sprite, x: p.x + 24, duration: 450, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
          sfx.chirp(5);
        } else if (id === "kingfisher") {
          sfx.takeoff();
          scene.tweens.add({
            targets: sprite,
            y: p.y - 140,
            duration: 380,
            ease: "Quad.easeOut",
            yoyo: true,
            hold: 120,
            onComplete: () => {
              sparkle(scene, p.x, p.y, { count: 12, tint: 0xe8f7ff, radius: 36 });
              sfx.plop();
            },
          });
        } else if (scene.textures.exists(dance)) {
          const key = sprite.texture.key;
          const sc = sprite.scaleX;
          sprite.setTexture(dance).setScale((npc.size / sprite.height) * ds);
          scene.tweens.add({ targets: sprite, angle: 6, duration: 220, yoyo: true, repeat: 3, ease: "Sine.easeInOut" });
          scene.time.delayedCall(1400, () => sprite.setTexture(key).setScale(sc));
          sfx.happy();
        } else {
          scene.tweens.add({ targets: sprite, y: p.y - 26, duration: 170, yoyo: true, repeat: 3, ease: "Quad.easeOut" });
          sfx.chirp(npc.voice ?? 0);
        }
        hearts(scene, p.x, p.y - npc.size * ds - 10, 2);
      },
      destroy() {
        idle.remove();
        this.marker?.destroy();
        sprite.destroy();
        shadow.destroy();
      },
    };

    hitZone(scene, p.x, p.y - (npc.size * ds) / 2, npc.size * ds * 1.1, npc.size * ds * 1.15, () => onTap?.(handle));
    return handle;
  });

  return {
    list,
    byId: (id) => list.find((n) => n.def.id === id) ?? null,
    /** Any bird within reach turns to watch the skylark go by. */
    watch(x) {
      for (const n of list) if (Math.abs(n.x - x) < 420) n.face(x);
    },
    destroy() {
      list.forEach((n) => n.destroy());
    },
  };
}
