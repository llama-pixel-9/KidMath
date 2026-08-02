// The bar chart shared by the DataGraph answer widget and the question card.
// Question-card use: varieties like mostLeastIdentify ask about a chart but
// answer through choice buttons, so the chart has to live with the question.
//
// This draws a chart a textbook would recognise: a labelled value axis with
// major ticks and minor gridlines, a baseline, and a category axis. The values
// are deliberately NOT printed on the bars — reading a bar against the scale is
// the skill the mode is testing, and a printed value hands the answer over. The
// `axisMisread` misconception the mode tags its items with only means something
// once there is an axis to misread.

import { chartScale } from "./chartScale.js";

const VIEW_W = 340;
const VIEW_H = 240;
const PAD_LEFT = 40;
const PAD_RIGHT = 10;
// Headroom above the top gridline so a revealed value label sits clear of the
// viewBox edge even when the tallest bar reaches the axis maximum.
const PAD_TOP = 22;
const PAD_BOTTOM = 46;
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

export default function BarChart({ bars, theme, showValues = false, valueLabel = "Number" }) {
  const data = bars || [];
  const { axisMax, step, minorStep } = chartScale(data.map((b) => b.value));

  const y = (v) => PAD_TOP + PLOT_H - (v / axisMax) * PLOT_H;
  const band = PLOT_W / Math.max(1, data.length);
  const barW = Math.min(band * 0.58, 46);

  const majors = [];
  for (let v = 0; v <= axisMax; v += step) majors.push(v);
  // Minor lines only where they add resolution and not so many that the plot
  // turns into graph paper.
  const minors = [];
  if (step > minorStep && axisMax / minorStep <= 24) {
    for (let v = 0; v <= axisMax; v += minorStep) if (v % step !== 0) minors.push(v);
  }

  const muted = theme?.textMuted || "text-slate-400";
  const secondary = theme?.textSecondary || "text-slate-500";

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full h-auto max-h-[46vh]"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Bar graph. ${data.map((b) => `${b.label} ${b.value}`).join(", ")}.`}
    >
      <g className={muted} fill="currentColor" stroke="currentColor">
        {minors.map((v) => (
          <line
            key={`minor-${v}`}
            x1={PAD_LEFT}
            x2={PAD_LEFT + PLOT_W}
            y1={y(v)}
            y2={y(v)}
            strokeWidth="1"
            strokeOpacity="0.25"
          />
        ))}
        {majors.map((v) => (
          <g key={`major-${v}`}>
            <line
              x1={PAD_LEFT}
              x2={PAD_LEFT + PLOT_W}
              y1={y(v)}
              y2={y(v)}
              strokeWidth="1"
              strokeOpacity="0.45"
            />
            <line x1={PAD_LEFT - 4} x2={PAD_LEFT} y1={y(v)} y2={y(v)} strokeWidth="1.5" />
            <text
              x={PAD_LEFT - 8}
              y={y(v) + 3.5}
              textAnchor="end"
              fontSize="11"
              className="font-bold"
              stroke="none"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Value axis and baseline, drawn over the gridlines. */}
        <line x1={PAD_LEFT} x2={PAD_LEFT} y1={PAD_TOP} y2={PAD_TOP + PLOT_H} strokeWidth="2" />
        <line
          x1={PAD_LEFT}
          x2={PAD_LEFT + PLOT_W}
          y1={PAD_TOP + PLOT_H}
          y2={PAD_TOP + PLOT_H}
          strokeWidth="2"
        />

        <text
          transform={`translate(11 ${PAD_TOP + PLOT_H / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="11"
          className="font-bold"
          stroke="none"
        >
          {valueLabel}
        </text>
      </g>

      {data.map((b, i) => {
        const cx = PAD_LEFT + band * i + band / 2;
        const top = y(b.value);
        // Fixed brand ramp in reading order (§09) — never a chart library's
        // default palette, never one bar singled out, and bar color never
        // matches what the bar is about.
        const ramp = ["fill-seafoam", "fill-teal-mid", "fill-apricot", "fill-sun-light"];
        return (
          <g key={b.label}>
            <rect
              x={cx - barW / 2}
              y={top}
              width={barW}
              height={PAD_TOP + PLOT_H - top}
              rx="4"
              className={ramp[i % ramp.length]}
            />
            <text
              x={cx}
              y={PAD_TOP + PLOT_H + 18}
              textAnchor="middle"
              fontSize="12"
              className={`${secondary} font-bold`}
              fill="currentColor"
            >
              {b.label}
            </text>
            {/* Only ever after the answer is settled, as feedback. */}
            {showValues && (
              <text
                x={cx}
                y={top - 5}
                textAnchor="middle"
                fontSize="12"
                className={`${secondary} font-bold`}
                fill="currentColor"
              >
                {b.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
