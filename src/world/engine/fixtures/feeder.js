import { depthScaleAt } from "../../regions";
import { sfx } from "../../worldAudio";
import { countPop, sparkle, pulseRing } from "../juice";
import { toWorld, standProp, hitZone } from "./common";

/**
 * A fill-to-capacity container: the bird feeder's tray, the picnic log,
 * the pantry log. Items (seed / berry / acorn textures) sit in rows; each
 * placement drops one in with a little bounce and a rising pop.
 */
export function buildFeeder(scene, zone, region) {
  const o = zone.objects.feeder;
  const { x: cx, y: cy } = toWorld(region, o);
  const ds = depthScaleAt(cy);
  const prop = standProp(scene, o.prop, cx, cy, o.size);
  const size = o.size * ds;

  // Where items sit on this prop.
  const isLog = o.prop === "log";
  const trayY = isLog ? cy - size * 0.5 : cy - size * 0.505;
  const trayW = isLog ? size * 1.7 : size * 0.44;
  const perRow = o.rows ?? (o.capacity <= 6 ? o.capacity : Math.ceil(o.capacity / 2));
  const itemScale = (isLog ? 1.25 : 1.0) * ds;

  const spotFor = (i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const rowW = trayW * 0.86;
    const x = cx - rowW / 2 + (rowW / Math.max(1, perRow - 1 || 1)) * col + (perRow === 1 ? rowW / 2 : 0);
    const y = trayY - row * 14 * ds + (col % 2) * 3;
    return { x, y };
  };

  const items = [];
  const addItem = (i, animate) => {
    const { x, y } = spotFor(i);
    const img = scene.add.image(x, y, o.item).setScale(itemScale).setDepth(cy + 1 + Math.floor(i / perRow) * 0.01);
    items.push(img);
    if (!animate) return;
    img.y = y - 140;
    img.setScale(itemScale * 0.6);
    scene.tweens.add({ targets: img, y, scale: itemScale, duration: 420, ease: "Bounce.easeOut" });
  };
  for (let i = 0; i < o.present; i++) addItem(i, false);

  const handle = {
    anchor: { x: cx - 30, y: cy + 60 },
    fixture: o.fixture,
    zones: [],
    rings: [],
    clear() {
      this.zones.forEach((z) => z.destroy());
      this.rings.forEach((r) => r.destroy());
      this.zones = [];
      this.rings = [];
    },
    armPlacing(onPlaced, onDone, count) {
      this.clear();
      let placed = 0;
      const ring = pulseRing(scene, cx, trayY, 70);
      this.rings.push(ring);
      const z = hitZone(scene, cx, cy - size * 0.45, Math.max(160, trayW + 80), size * 0.95, () => {
        if (placed >= count || items.length >= o.capacity) return;
        placed += 1;
        addItem(items.length, true);
        sfx.pop(items.length);
        countPop(scene, cx, trayY - 60, items.length);
        if (placed >= count) {
          ring.destroy();
          sparkle(scene, cx, trayY, { count: 14, tint: 0xfff3d6, radius: 50 });
          scene.time.delayedCall(600, () => onDone?.());
        }
        onPlaced?.(placed);
      });
      this.zones.push(z);
    },
    complete() {
      while (items.length < o.capacity) addItem(items.length, false);
      this.clear();
    },
    prop,
  };
  return handle;
}
