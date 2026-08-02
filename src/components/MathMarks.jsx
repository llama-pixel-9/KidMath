// Decorative math-mark layer (§07) — marketing pages only, never behind body
// copy at full strength, never in the play area. Fredoka, Teal or Sun only,
// 30–50% opacity, small rotations, marks hug the outer margins.
export default function MathMarks() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none font-display select-none"
    >
      <span className="absolute top-16 left-[4%] text-5xl text-sun opacity-50 rotate-[-9deg]">π</span>
      <span className="absolute top-40 right-[3%] text-3xl text-teal opacity-40 rotate-[4deg]">45°</span>
      <span className="absolute top-[34%] left-[2%] text-4xl text-teal opacity-40 rotate-[-3deg]">∠</span>
      <span className="absolute top-[48%] right-[4%] text-4xl text-sun opacity-45 rotate-[0deg]">÷</span>
      <span className="absolute top-[62%] left-[5%] text-3xl text-teal opacity-40 rotate-[6deg]">½</span>
      <span className="absolute top-[76%] right-[2%] text-4xl text-teal opacity-40 rotate-[-5deg]">√9</span>
      <span className="absolute bottom-16 left-[3%] text-4xl text-sun opacity-45 rotate-[-12deg]">×</span>
      <span className="absolute bottom-8 right-[6%] text-3xl text-teal opacity-40 rotate-[7deg]">%</span>
    </div>
  );
}
