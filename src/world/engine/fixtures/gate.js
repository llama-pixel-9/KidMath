import { depthScaleAt } from "../../regions";
import { sfx } from "../../worldAudio";
import { countPop, sparkle, pulseRing, DEPTH } from "../juice";
import { WOOD, WOOD_DARK, INK } from "../textures";
import { toWorld, standProp, hitZone } from "./common";

/**
 * The gate at the far end of a region and its ten-frame board. Lighting
 * dots fills the frame; a full frame swings the gate open — and that is
 * what lets the mist beyond roll back.
 */
export function buildGate(scene, zone, region) {
  const o = zone.objects.gate;
  const { x: cx, y: cy } = toWorld(region, o);
  const ds = depthScaleAt(cy);
  const gate = standProp(scene, o.prop, cx, cy, o.size);
  // Hinge the fence at its left post so it can swing.
  if (gate) {
    const w = gate.displayWidth;
    gate.setOrigin(0, 1);
    gate.x = cx - w / 2;
  }

  // Two permanent gate posts: the fence hangs between them, and when it
  // swings open the posts stay, so the hedges on either side always meet a
  // post rather than ending in mid-air.
  if (gate) {
    const posts = scene.add.graphics().setDepth(cy + 2);
    const fh = gate.displayHeight;
    for (const px of [gate.x + 8, gate.x + gate.displayWidth - 8]) {
      posts.fillStyle(WOOD_DARK, 1);
      posts.fillRoundedRect(px - 11 * ds, cy - fh * 1.08, 22 * ds, fh * 1.08, 5);
      posts.fillStyle(WOOD, 1);
      posts.fillRoundedRect(px - 7 * ds, cy - fh * 1.06, 9 * ds, fh * 1.02, 3);
      posts.fillStyle(WOOD_DARK, 1);
      posts.fillRoundedRect(px - 14 * ds, cy - fh * 1.12, 28 * ds, 10 * ds, 4);
    }
  }

  // The ten-frame board: a free-standing sign on the near side, left of the
  // gate, where it never hides the fence.
  const boardGround = cy + 100;
  const bx = cx - o.size * ds * 1.65;
  const by = boardGround - 118 * ds;
  const board = scene.add.container(bx, by).setDepth(boardGround);
  const bw = 214;
  const bh = 96;
  const g = scene.add.graphics();
  g.fillStyle(WOOD_DARK, 1);
  g.fillRoundedRect(-8, bh / 2 - 6, 16, (boardGround - by) / (ds * 0.95) + 6, 4);
  g.fillStyle(WOOD_DARK, 1);
  g.fillRoundedRect(-bw / 2 - 6, -bh / 2 - 6, bw + 12, bh + 12, 14);
  g.fillStyle(WOOD, 1);
  g.fillRoundedRect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, bh + 4, 12);
  g.fillStyle(0xfffbeb, 1);
  g.fillRoundedRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, bh - 8, 9);
  g.lineStyle(2, INK, 0.18);
  g.lineBetween(-bw / 2 + 4, 0, bw / 2 - 4, 0);
  for (let c = 1; c < 5; c++) g.lineBetween(-bw / 2 + 4 + ((bw - 8) / 5) * c, -bh / 2 + 4, -bw / 2 + 4 + ((bw - 8) / 5) * c, bh / 2 - 4);
  board.add(g);
  board.setScale(ds * 0.95);

  const dots = [];
  for (let i = 0; i < 10; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const x = -bw / 2 + 4 + ((bw - 8) / 5) * (col + 0.5);
    const y = -bh / 2 + 4 + ((bh - 8) / 2) * (row + 0.5);
    const lit = i < o.tenFrameFilled;
    const d = scene.add.image(x, y, lit ? "tfdot-on" : "tfdot-off").setScale(0.92);
    dots.push({ img: d, lit, x, y });
    board.add(d);
  }

  let open = false;
  const handle = {
    anchor: { x: bx - 150, y: boardGround + 10 },
    fixture: o.fixture,
    questId: o.questId,
    zones: [],
    rings: [],
    board,
    gate,
    isOpen: () => open,
    /** Show, don't tell: count the unlit (or lit) dots on the frame. */
    hint(mode = "unlit") {
      const list = dots.filter((d) => (mode === "lit" ? d.lit : !d.lit));
      list.forEach((d, n) => {
        scene.time.delayedCall(n * 420, () => {
          const wx = bx + d.x * board.scaleX;
          const wy = by + d.y * board.scaleY;
          scene.tweens.add({ targets: d.img, scale: 1.25, duration: 160, yoyo: true });
          sparkle(scene, wx, wy, { count: 5, tint: 0xfff3d6, radius: 14 });
          sfx.pop(n + 1);
          countPop(scene, wx, wy - 34, n + 1, { size: 30 });
        });
      });
      return list.length;
    },
    clear() {
      this.zones.forEach((z) => z.destroy());
      this.rings.forEach((r) => r.destroy());
      this.zones = [];
      this.rings = [];
    },
    armPlacing(onPlaced, onDone, count) {
      this.clear();
      let placed = 0;
      const ring = pulseRing(scene, bx, by, 90);
      this.rings.push(ring);
      const z = hitZone(scene, bx, by, bw * ds + 60, bh * ds + 60, () => {
        const next = dots.find((d) => !d.lit);
        if (!next || placed >= count) return;
        placed += 1;
        next.lit = true;
        next.img.setTexture("tfdot-on");
        next.img.setScale(0.2);
        scene.tweens.add({ targets: next.img, scale: 0.92, duration: 260, ease: "Back.easeOut" });
        const wx = bx + next.x * board.scaleX;
        const wy = by + next.y * board.scaleY;
        sparkle(scene, wx, wy, { count: 8, tint: 0xffe7c2, radius: 22 });
        const litCount = dots.filter((d) => d.lit).length;
        sfx.pop(litCount);
        countPop(scene, wx, wy - 40, litCount, { size: 34 });
        onPlaced?.(placed);
        if (placed >= count) {
          ring.destroy();
          scene.time.delayedCall(500, () => onDone?.());
        }
      });
      this.zones.push(z);
    },
    /** Swing open (with ceremony unless instant). */
    complete(instant = false) {
      for (const d of dots) {
        d.lit = true;
        d.img.setTexture("tfdot-on");
      }
      this.clear();
      if (open || !gate) return;
      open = true;
      if (instant) {
        gate.setScale(gate.scaleX * 0.14, gate.scaleY).setAlpha(0.9);
        return;
      }
      sfx.creak();
      scene.tweens.add({
        targets: gate,
        scaleX: gate.scaleX * 0.14,
        alpha: 0.9,
        duration: 1000,
        ease: "Back.easeInOut",
      });
      sparkle(scene, cx, cy - 60, { count: 18, tint: 0xfff3d6, radius: 70 });
      // Board glows for a beat.
      scene.tweens.add({ targets: board, scale: board.scaleX * 1.08, duration: 240, yoyo: true, repeat: 2 });
    },
  };
  return handle;
}

export { DEPTH };
