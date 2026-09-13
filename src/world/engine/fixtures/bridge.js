import { HORIZON_Y, WORLD_H, depthScaleAt } from "../../regions";
import { sfx } from "../../worldAudio";
import { dust, sparkle, countPop, pulseRing, DEPTH } from "../juice";
import { WOOD, WOOD_DARK, WOOD_LIGHT } from "../textures";
import { toWorld, hitZone, dashedRect, dashedCircle } from "./common";

/**
 * A crossing with `slots` positions, `present` of them filled. Styles:
 *   planks — a plank bridge over a stream that cuts the ground band
 *   logs   — round logs over a gully (woods)
 *   rope   — planks tied over a rock gap (cliffs)
 *   stones — stepping stones in the pond, laid front-to-back (vertical)
 * The stream/gap is drawn here too so every crossing has something to cross.
 */
export function buildBridge(scene, zone, region) {
  const o = zone.objects.bridge;
  const { x: cx, y: cy } = toWorld(region, o);
  const style = o.style ?? "planks";
  const vertical = Boolean(o.vertical);
  const span = o.span ?? 150;

  // ------------------------------------------------------- the obstacle
  if (!vertical) {
    const g = scene.add.graphics().setDepth(DEPTH.ground - 4);
    const topW = span * 0.45;
    const botW = span * 1.3;
    const yTop = HORIZON_Y + 12;
    const yBot = WORLD_H;
    if (style === "rope") {
      // A shadowed gap in the rock.
      g.fillStyle(0x5c6b76, 1);
      g.fillPoints([{ x: cx - topW / 2, y: yTop }, { x: cx + topW / 2, y: yTop }, { x: cx + botW / 2, y: yBot }, { x: cx - botW / 2, y: yBot }], true);
      g.fillStyle(0x36434c, 1);
      g.fillPoints([{ x: cx - topW / 3, y: yTop + 40 }, { x: cx + topW / 3, y: yTop + 40 }, { x: cx + botW / 3, y: yBot }, { x: cx - botW / 3, y: yBot }], true);
    } else {
      // A stream: bank edge, water, a deeper channel, a few ripples.
      g.fillStyle(0xe8dfb0, 1);
      g.fillPoints([{ x: cx - topW / 2 - 8, y: yTop }, { x: cx + topW / 2 + 8, y: yTop }, { x: cx + botW / 2 + 12, y: yBot }, { x: cx - botW / 2 - 12, y: yBot }], true);
      g.fillStyle(region.waterColor, 1);
      g.fillPoints([{ x: cx - topW / 2, y: yTop }, { x: cx + topW / 2, y: yTop }, { x: cx + botW / 2, y: yBot }, { x: cx - botW / 2, y: yBot }], true);
      g.fillStyle(region.waterDeep, 1);
      g.fillPoints([{ x: cx - topW / 4, y: yTop + 30 }, { x: cx + topW / 4, y: yTop + 30 }, { x: cx + botW / 4, y: yBot }, { x: cx - botW / 4, y: yBot }], true);
      for (let i = 0; i < 7; i++) {
        const y = yTop + 60 + i * 55;
        const w = topW + ((botW - topW) * (y - yTop)) / (yBot - yTop);
        const r = scene.add
          .image(cx + (Math.random() - 0.5) * w * 0.5, y, "ripple")
          .setScale(0.5 + Math.random() * 0.6, 1)
          .setAlpha(0.5)
          .setDepth(DEPTH.ground - 3);
        scene.tweens.add({ targets: r, y: r.y + 40, alpha: 0.05, duration: 2200 + Math.random() * 1500, repeat: -1, ease: "Sine.easeIn" });
      }
    }
  }

  // ---------------------------------------------------------- the slots
  const slotPos = [];
  for (let i = 0; i < o.slots; i++) {
    if (vertical) {
      const y = cy + span / 2 - (i * span) / (o.slots - 1);
      slotPos.push({ x: cx + Math.sin(i * 1.7) * 26, y });
    } else {
      const totalW = span * 1.25;
      const step = totalW / o.slots;
      slotPos.push({ x: cx - totalW / 2 + step * (i + 0.5), y: cy, w: step - 6 });
    }
  }
  const depthFor = (y) => depthScaleAt(y);

  const layer = scene.add.container(0, 0).setDepth(cy - 2);
  const filled = new Array(o.slots).fill(false);
  const pieces = new Array(o.slots).fill(null);

  // Posts and rails for plank/log/rope styles.
  if (!vertical) {
    const rail = scene.add.graphics();
    const totalW = span * 1.25;
    const postH = 62 * depthFor(cy);
    for (const px of [cx - totalW / 2 - 10, cx + totalW / 2 + 10]) {
      rail.fillStyle(WOOD_DARK, 1);
      rail.fillRoundedRect(px - 7, cy - postH - 20, 14, postH + 20, 4);
      rail.fillStyle(WOOD, 1);
      rail.fillRoundedRect(px - 5, cy - postH - 18, 6, postH + 14, 3);
    }
    if (style === "rope") {
      rail.lineStyle(4, 0xd9b48a, 1);
      rail.lineBetween(cx - totalW / 2 - 10, cy - postH - 10, cx + totalW / 2 + 10, cy - postH - 10);
      rail.lineStyle(3, 0xd9b48a, 0.8);
      rail.lineBetween(cx - totalW / 2 - 10, cy - 6, cx + totalW / 2 + 10, cy - 6);
    } else {
      rail.lineStyle(6, WOOD_DARK, 1);
      rail.lineBetween(cx - totalW / 2 - 10, cy - postH - 8, cx + totalW / 2 + 10, cy - postH - 8);
      rail.lineStyle(3, WOOD_LIGHT, 0.9);
      rail.lineBetween(cx - totalW / 2 - 10, cy - postH - 11, cx + totalW / 2 + 10, cy - postH - 11);
    }
    layer.add(rail);
  }

  const drawPiece = (i) => {
    const p = slotPos[i];
    const ds = depthFor(p.y);
    if (vertical) {
      return scene.add.image(p.x, p.y, "stone").setScale(1.55 * ds, 1.45 * ds).setDepth(p.y - 1);
    }
    const g = scene.add.graphics().setDepth(cy - 1);
    const h = 30 * ds;
    if (style === "logs") {
      g.fillStyle(WOOD_DARK, 1);
      g.fillRoundedRect(p.x - p.w / 2, cy - h, p.w, h, h / 2);
      g.fillStyle(WOOD, 1);
      g.fillRoundedRect(p.x - p.w / 2 + 2, cy - h + 2, p.w - 4, h - 8, h / 2);
      g.fillStyle(WOOD_LIGHT, 0.7);
      g.fillRoundedRect(p.x - p.w / 2 + 6, cy - h + 5, p.w - 12, 5, 2);
    } else {
      g.fillStyle(WOOD_DARK, 1);
      g.fillRoundedRect(p.x - p.w / 2, cy - h, p.w, h, 5);
      g.fillStyle(WOOD, 1);
      g.fillRoundedRect(p.x - p.w / 2 + 2, cy - h + 2, p.w - 4, h - 6, 4);
      g.lineStyle(1.5, WOOD_DARK, 0.5);
      g.lineBetween(p.x - p.w / 2 + 8, cy - h * 0.55, p.x + p.w / 2 - 8, cy - h * 0.5);
      g.lineBetween(p.x - p.w / 2 + 10, cy - h * 0.3, p.x + p.w / 2 - 12, cy - h * 0.28);
      if (style === "rope") {
        g.lineStyle(2, 0xd9b48a, 1);
        g.lineBetween(p.x - p.w / 2 + 3, cy - h - 4, p.x - p.w / 2 + 3, cy);
        g.lineBetween(p.x + p.w / 2 - 3, cy - h - 4, p.x + p.w / 2 - 3, cy);
      }
    }
    return g;
  };

  // The permanent pieces present from the start.
  const presentIdx = [];
  if (vertical) {
    for (let i = 0; i < o.present; i++) presentIdx.push(i);
  } else {
    // Spread the present planks so the gaps read as "some are missing".
    const order = [0, o.slots - 1, Math.floor(o.slots / 2), 1, o.slots - 2, 2, 3, 4, 5, 6, 7];
    for (let k = 0; k < o.present; k++) presentIdx.push(order[k]);
  }
  for (const i of presentIdx) {
    filled[i] = true;
    pieces[i] = drawPiece(i);
  }

  // Empty-slot outlines: drawn faintly always, boldly while counting.
  const outline = scene.add.graphics().setDepth(cy - 1);
  const drawOutlines = (bold) => {
    outline.clear();
    for (let i = 0; i < o.slots; i++) {
      if (filled[i]) continue;
      const p = slotPos[i];
      if (vertical) dashedCircle(outline, p.x, p.y, 22 * depthFor(p.y), bold ? 0xfffbeb : 0xffffff, 14, bold ? 3 : 2);
      else dashedRect(outline, p.x - p.w / 2, cy - 30 * depthFor(cy), p.w, 30 * depthFor(cy), bold ? 0xfffbeb : 0xffffff, 8, 6, bold ? 3 : 2);
    }
    outline.setAlpha(bold ? 1 : 0.55);
  };
  drawOutlines(false);

  const emptyIdx = () => filled.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);

  const handle = {
    anchor: { x: cx, y: vertical ? cy + span / 2 + 40 : cy + 70 },
    fixture: o.fixture,
    /** Where the water is (for tap reactions); null for the rope gap. */
    streamRect: !vertical && style !== "rope" ? { x: cx - span * 0.55, y: HORIZON_Y + 12, w: span * 1.1, h: WORLD_H - HORIZON_Y } : null,
    zones: [],
    rings: [],
    clear() {
      this.zones.forEach((z) => z.destroy());
      this.rings.forEach((r) => r.destroy());
      this.zones = [];
      this.rings = [];
      drawOutlines(false);
    },
    /** countTap: tap each empty spot once. */
    armCounting(onCount, onDone) {
      this.clear();
      drawOutlines(true);
      const targets = emptyIdx();
      const tapped = new Set();
      for (const i of targets) {
        const p = slotPos[i];
        const ring = pulseRing(scene, p.x, vertical ? p.y : cy - 14, 34);
        this.rings.push(ring);
        // Non-overlapping targets: a tap on one slot never lands on its neighbour.
        const zw = vertical ? 64 : Math.min(64, p.w + 2);
        const zh = vertical ? Math.min(64, span / (o.slots - 1) - 2) : 64;
        const z = hitZone(scene, p.x, vertical ? p.y : cy - 14, zw, zh, () => {
          if (tapped.has(i)) return;
          tapped.add(i);
          ring.destroy();
          sfx.pop(tapped.size);
          countPop(scene, p.x, (vertical ? p.y : cy) - 40, tapped.size);
          sparkle(scene, p.x, vertical ? p.y : cy - 10, { count: 6, tint: 0xfff3d6, radius: 20 });
          onCount?.(tapped.size);
          if (tapped.size === targets.length) scene.time.delayedCall(350, () => onDone?.());
        });
        this.zones.push(z);
      }
    },
    /** placeItems: each tap on the crossing lays the next piece. */
    armPlacing(onPlaced, onDone, count) {
      this.clear();
      drawOutlines(true);
      let placed = 0;
      const w = vertical ? 160 : span * 1.4;
      const h = vertical ? span + 80 : 120;
      const ring = pulseRing(scene, cx, vertical ? cy : cy - 14, 60);
      this.rings.push(ring);
      const z = hitZone(scene, cx, vertical ? cy : cy - 20, w, h, () => {
        const next = emptyIdx()[0];
        if (next == null || placed >= count) return;
        placed += 1;
        this.placeOne(next);
        onPlaced?.(placed);
        if (placed >= count) {
          ring.destroy();
          scene.time.delayedCall(600, () => onDone?.());
        }
      });
      this.zones.push(z);
    },
    placeOne(i, instant = false) {
      filled[i] = true;
      const piece = drawPiece(i);
      pieces[i] = piece;
      drawOutlines(true);
      const p = slotPos[i];
      if (instant) return;
      piece.y = (vertical ? p.y : 0) - 170;
      piece.setAlpha(0.9);
      scene.tweens.add({
        targets: piece,
        y: vertical ? p.y : 0,
        alpha: 1,
        duration: 520,
        ease: "Bounce.easeOut",
        onComplete: () => {
          if (vertical) {
            sparkle(scene, p.x, p.y, { count: 10, tint: 0xe8f7ff, radius: 30 });
            sfx.thunk();
          } else {
            dust(scene, p.x, cy, { count: 6, spread: 40 });
            sfx.thunk();
          }
        },
      });
    },
    /** Fixture on: fill everything without ceremony (a revisit). */
    complete(instant = true) {
      for (const i of emptyIdx()) this.placeOne(i, instant);
      this.clear();
      outline.clear();
    },
  };
  return handle;
}
