import { motion } from "framer-motion";

// Falling end-card confetti (§11): squares and dots in Sun / Seafoam /
// Sun Light / Apricot, drifting down for ~3s. Decorative layer only —
// callers gate it behind the motion settings.
const PIECES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${4 + i * 7}%`,
  color: ["bg-sun-light", "bg-teal-mid", "bg-sun", "bg-apricot"][i % 4],
  round: i % 2 === 0,
  size: i % 3 === 0 ? 11 : 8,
  duration: 2.8 + (i % 5) * 0.3,
  delay: (i % 7) * 0.4,
}));

export default function ConfettiRain() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PIECES.map((p) => (
        <motion.span
          key={p.id}
          className={`absolute ${p.color} ${p.round ? "rounded-full" : "rounded-[2px]"}`}
          style={{ left: p.left, top: -24, width: p.size, height: p.size }}
          initial={{ y: -24, rotate: 0, opacity: 0 }}
          animate={{ y: "105vh", rotate: 420, opacity: [0, 1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "linear", repeat: Infinity }}
        />
      ))}
    </div>
  );
}
