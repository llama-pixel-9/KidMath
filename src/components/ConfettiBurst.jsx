import { motion } from "framer-motion";

const CONFETTI_PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const distance = 70 + (i % 4) * 12;
  return {
    id: i,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: ["bg-yellow-400", "bg-pink-400", "bg-sky-400", "bg-lime-400", "bg-violet-400", "bg-orange-400"][i % 6],
    size: 10 + (i % 3) * 3,
  };
});

export default function ConfettiBurst({ intensity = "normal" }) {
  const particles = intensity === "light" ? CONFETTI_PARTICLES.slice(0, 6) : CONFETTI_PARTICLES;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.color}`}
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
