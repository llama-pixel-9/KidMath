import { useEffect, useRef } from "react";
import { useMotionValue, animate } from "framer-motion";
import { TIER2 } from "./motionSpec.js";

/**
 * §14 guide drawer physics, shared by the guide and the store: the sheet
 * follows the finger 1:1 and snaps — past 40% of its height it closes,
 * otherwise it returns on the drawer curve (320ms). Attach `handleProps`
 * to the drawer's header strip and `y` to the sheet's motion style.
 */
export function useDragDismiss(open, onClose) {
  const y = useMotionValue(0);
  const dragRef = useRef(null);

  useEffect(() => {
    if (open) y.set(0);
  }, [open, y]);

  const onPointerDown = (e) => {
    const sheet = e.currentTarget.closest("section");
    dragRef.current = { startY: e.clientY, height: sheet?.clientHeight || 600 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    y.set(Math.max(0, e.clientY - d.startY));
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (y.get() > (d.height * TIER2.guideDrawer.snapPastPct) / 100) {
      onClose();
    } else {
      animate(y, 0, { duration: TIER2.guideDrawer.ms / 1000, ease: TIER2.guideDrawer.ease });
    }
  };

  return {
    y,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      style: { touchAction: "none", cursor: "grab" },
    },
  };
}
