// Line plot (dot plot): X marks stacked over a labelled number line. Was prose
// ("Plant heights in cm: 3 cm XX, 4 cm XXX, ...") which loses the one thing a
// line plot is for — seeing the shape and the spread of the data at a glance.
//
// Every tick on the axis is drawn whether or not it has data, because a value
// with no X above it is exactly what "which height did nobody grow to?" and the
// range questions depend on.

const VIEW_W = 340;
const PAD_LEFT = 26;
const PAD_RIGHT = 26;
const PAD_TOP = 10;
const AXIS_LABEL_H = 34;
const MARK_STEP = 15;

export default function LinePlot({ points, axisLabel, theme }) {
  const data = points || [];
  const tallest = Math.max(1, ...data.map((p) => p.count));
  const plotH = tallest * MARK_STEP + 8;
  const axisY = PAD_TOP + plotH;
  const height = axisY + AXIS_LABEL_H;
  const span = VIEW_W - PAD_LEFT - PAD_RIGHT;
  const gap = data.length > 1 ? span / (data.length - 1) : 0;
  const x = (i) => PAD_LEFT + i * gap;

  const secondary = theme?.textSecondary || "text-slate-500";

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      className="w-full h-auto max-h-[40vh]"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Line plot. ${data.map((p) => `${p.value}: ${p.count}`).join(", ")}.`}
    >
      <g className={secondary} stroke="currentColor" fill="currentColor">
        <line x1={PAD_LEFT - 14} x2={VIEW_W - PAD_RIGHT + 14} y1={axisY} y2={axisY} strokeWidth="2" />
        {data.map((p, i) => (
          <g key={p.value}>
            <line x1={x(i)} x2={x(i)} y1={axisY} y2={axisY + 5} strokeWidth="2" />
            <text
              x={x(i)}
              y={axisY + 19}
              textAnchor="middle"
              fontSize="12"
              className="font-bold"
              stroke="none"
            >
              {p.value}
            </text>
            {Array.from({ length: p.count }, (_, m) => (
              <text
                key={m}
                x={x(i)}
                y={axisY - 9 - m * MARK_STEP}
                textAnchor="middle"
                fontSize="14"
                className="font-extrabold fill-violet-400"
                stroke="none"
              >
                ✕
              </text>
            ))}
          </g>
        ))}
        {axisLabel && (
          <text
            x={VIEW_W / 2}
            y={height - 4}
            textAnchor="middle"
            fontSize="12"
            className="font-bold"
            stroke="none"
          >
            {axisLabel}
          </text>
        )}
      </g>
    </svg>
  );
}
