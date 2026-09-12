import { FIGURE_COLORS } from "./kit";

/**
 * A rectangular prism built from unit cubes, drawn in simple oblique
 * projection (5.MD.C: volume as packed unit cubes). `display.cube` carries
 * { l, w, h, hideBack } — length across, width into the page, height up.
 * Kept small (≤ 6 per edge) so every cube is countable.
 */

const VIEW_W = 320;
const VIEW_H = 190;
const DX = 0.5; // oblique depth factor
const DY = 0.28;

export default function CubeGrid({ l = 2, w = 2, h = 2 }) {
  const L = Math.min(l, 6);
  const W = Math.min(w, 6);
  const H = Math.min(h, 6);
  const unit = Math.min(46, (VIEW_W - 40) / (L + W * DX), (VIEW_H - 30) / (H + W * DY));
  const ox = (VIEW_W - unit * (L + W * DX)) / 2;
  const oy = VIEW_H - 16 - unit * 0; // baseline

  const faces = [];
  // Draw back-to-front so nearer cubes overlap farther ones.
  for (let d = W - 1; d >= 0; d -= 1) {
    for (let z = 0; z < H; z += 1) {
      for (let x = 0; x < L; x += 1) {
        const px = ox + x * unit + d * unit * DX;
        const py = oy - z * unit - d * unit * DY - unit;
        const key = `${x}-${z}-${d}`;
        faces.push(
          <g key={key}>
            {/* top */}
            <polygon
              points={`${px},${py} ${px + unit * DX},${py - unit * DY} ${px + unit + unit * DX},${py - unit * DY} ${px + unit},${py}`}
              fill={FIGURE_COLORS.fillSoft ?? "#d9efe9"}
              stroke={FIGURE_COLORS.ink}
              strokeWidth="1"
            />
            {/* right */}
            <polygon
              points={`${px + unit},${py} ${px + unit + unit * DX},${py - unit * DY} ${px + unit + unit * DX},${py - unit * DY + unit} ${px + unit},${py + unit}`}
              fill={FIGURE_COLORS.inkSoft ?? "#9db8b0"}
              stroke={FIGURE_COLORS.ink}
              strokeWidth="1"
            />
            {/* front */}
            <rect x={px} y={py} width={unit} height={unit} fill={FIGURE_COLORS.fill} stroke={FIGURE_COLORS.ink} strokeWidth="1.4" />
          </g>
        );
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full max-w-[320px] mx-auto block" aria-label={`a box of unit cubes, ${l} long, ${w} wide, ${h} tall`}>
      {faces}
    </svg>
  );
}
