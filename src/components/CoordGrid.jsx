import { FIGURE_COLORS } from "./kit";

/**
 * Quadrant-I coordinate grid (5.G.A). `display.coord` carries
 * { max, points: [{ x, y, label }] } — axes 0..max with unit gridlines and
 * labeled points. Read-only: answers go through choice or the number pad.
 */

const VIEW = 300;
const PAD = 34;

export default function CoordGrid({ max = 10, points = [] }) {
  const span = VIEW - PAD - 14;
  const sx = (v) => PAD + (v / max) * span;
  const sy = (v) => VIEW - PAD - (v / max) * span;
  const ticks = [];
  const step = max > 10 ? 2 : 1;
  for (let v = 0; v <= max; v += step) ticks.push(v);

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full max-w-[300px] mx-auto block" aria-label={`coordinate grid to ${max} with ${points.length} labeled point${points.length === 1 ? "" : "s"}`}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={sx(v)} y1={sy(0)} x2={sx(v)} y2={sy(max)} stroke={FIGURE_COLORS.inkSoft} strokeWidth={v === 0 ? 0 : 0.6} />
          <line x1={sx(0)} y1={sy(v)} x2={sx(max)} y2={sy(v)} stroke={FIGURE_COLORS.inkSoft} strokeWidth={v === 0 ? 0 : 0.6} />
          <text x={sx(v)} y={sy(0) + 16} textAnchor="middle" fontSize="11" fontWeight="700" fill={FIGURE_COLORS.ink}>{v}</text>
          <text x={sx(0) - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fontWeight="700" fill={FIGURE_COLORS.ink}>{v}</text>
        </g>
      ))}
      <line x1={sx(0)} y1={sy(0)} x2={sx(max)} y2={sy(0)} stroke={FIGURE_COLORS.ink} strokeWidth="2" />
      <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(max)} stroke={FIGURE_COLORS.ink} strokeWidth="2" />
      {points.map((p) => (
        <g key={`${p.x}-${p.y}`}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r="6" fill={FIGURE_COLORS.warm ?? "#d8623a"} stroke={FIGURE_COLORS.ink} strokeWidth="1.5" />
          {p.label && (
            <text x={sx(p.x) + 9} y={sy(p.y) - 8} fontSize="14" fontWeight="800" fill={FIGURE_COLORS.ink}>{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
