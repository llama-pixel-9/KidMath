import { depthScaleAt } from "../../regions";
import { propSize } from "../../worldArt";
import { DEPTH } from "../juice";

/** Region-local content coordinates → world coordinates. */
export function toWorld(region, p) {
  return { x: region.x0 + p.x, y: p.y };
}

/** A prop image standing on the ground at (x, feetY), `height` px at depth 1,
 *  with a soft contact shadow so it sits on the grass instead of floating. */
export function standProp(scene, id, x, feetY, height, { depth = null, flip = false, depthScale = true, shadow = true } = {}) {
  const key = `prop-${id}`;
  if (!scene.textures.exists(key)) return null;
  const { h } = propSize(id);
  const s = (height / h) * (depthScale ? depthScaleAt(feetY) : 1);
  const img = scene.add
    .image(x, feetY, key)
    .setOrigin(0.5, 1)
    .setScale(s)
    .setDepth(depth ?? feetY)
    .setFlipX(flip);
  if (shadow) {
    const sh = scene.add.ellipse(x, feetY - 2, img.displayWidth * 0.62, Math.max(8, img.displayWidth * 0.11), 0x14231f, 0.14).setDepth((depth ?? feetY) - 0.5);
    img.contactShadow = sh;
  }
  return img;
}

/** An invisible tap target; `onTap` receives the pointer. Consumes the tap. */
export function hitZone(scene, x, y, w, h, onTap, { circle = false } = {}) {
  const z = scene.add.zone(x, y, w, h).setDepth(DEPTH.fx + 50);
  if (circle) z.setCircleDropZone?.(w / 2);
  z.setInteractive({ useHandCursor: true });
  z.on("pointerdown", (pointer, lx, ly, event) => {
    scene.consumePointer?.(pointer);
    event?.stopPropagation?.();
    onTap?.(pointer);
  });
  return z;
}

/** Wobble "no" on a sprite — the polite refusal (a full nest, a wrong tap). */
export function wobble(scene, obj) {
  scene.tweens.add({ targets: obj, angle: 6, duration: 70, yoyo: true, repeat: 3, ease: "Sine.easeInOut", onComplete: () => obj.setAngle(0) });
}

/** Dashed outline helper for "an empty spot" — round or rectangular. */
export function dashedRect(g, x, y, w, h, color = 0xfffbeb, dash = 8, gap = 6, lineW = 3) {
  g.lineStyle(lineW, color, 0.95);
  const edges = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ];
  for (const [x1, y1, x2, y2] of edges) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    for (let d = 0; d < len; d += dash + gap) {
      const e = Math.min(len, d + dash);
      g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * e, y1 + uy * e);
    }
  }
}

export function dashedCircle(g, cx, cy, r, color = 0xfffbeb, segments = 14, lineW = 3) {
  g.lineStyle(lineW, color, 0.95);
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / segments / 1.8;
    g.beginPath();
    g.arc(cx, cy, r, a0, a1, false);
    g.strokePath();
  }
}
