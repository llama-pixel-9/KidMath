import { FIGURE_COLORS } from "./index.js";
import { SHAPES, SHAPE_META } from "./shapeData.js";

export function Figure({ shape, size = 90, rotate = 0, showSymmetry = false, fill = FIGURE_COLORS.fill }) {
  const pts = SHAPES[shape] || SHAPES.square;
  const meta = SHAPE_META[shape] || {};
  const closed = shape !== "openFigure";
  const path = pts.map(([px, py]) => `${px * size},${py * size}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={meta.name}>
      <g transform={`rotate(${rotate} ${size / 2} ${size / 2})`}>
        {closed ? (
          <polygon points={path} fill={fill} stroke={FIGURE_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
        ) : (
          <polyline points={path} fill="none" stroke={FIGURE_COLORS.ink} strokeWidth="2.5" strokeLinejoin="round" />
        )}
        {showSymmetry && meta.symmetry > 0 && (
          <line
            x1={size / 2}
            y1={0}
            x2={size / 2}
            y2={size}
            stroke={FIGURE_COLORS.accent}
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        )}
      </g>
    </svg>
  );
}

