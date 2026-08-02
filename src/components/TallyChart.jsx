// Tally chart: marks in gates of five, the way they are actually taught —
// four uprights with the fifth struck through them. Previously this was the
// string "IIII/ IIII/ III" inside the prompt, which is neither how a tally
// looks nor countable at a glance.
//
// The gate grouping is the whole point: it is what makes a tally countable by
// fives, and it is what the `tallyFifthMiscount` misconception is about.

const VIEW_W = 340;
const ROW_H = 40;
const PAD_TOP = 8;
const LABEL_W = 84;
const MARK_H = 22;
const MARK_GAP = 6;
const GATE_GAP = 16;
const GATE_W = MARK_GAP * 3;

function Gate({ x, cy, count }) {
  const top = cy - MARK_H / 2;
  const bottom = cy + MARK_H / 2;
  const uprights = Math.min(count, 4);
  return (
    <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {Array.from({ length: uprights }, (_, i) => (
        <line key={i} x1={x + i * MARK_GAP} x2={x + i * MARK_GAP} y1={top} y2={bottom} />
      ))}
      {count === 5 && <line x1={x - 4} x2={x + GATE_W + 4} y1={bottom - 3} y2={top + 3} />}
    </g>
  );
}

export default function TallyChart({ rows, theme }) {
  const data = rows || [];
  const height = PAD_TOP * 2 + data.length * ROW_H;
  const secondary = theme?.textSecondary || "text-slate-500";

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      className="w-full h-auto max-h-[40vh]"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Tally chart. ${data.map((r) => `${r.label} ${r.count}`).join(", ")}.`}
    >
      {data.map((r, i) => {
        const cy = PAD_TOP + i * ROW_H + ROW_H / 2;
        const fives = Math.floor(r.count / 5);
        const rest = r.count % 5;
        const gates = [...Array.from({ length: fives }, () => 5), ...(rest ? [rest] : [])];
        return (
          <g key={r.label} className={secondary}>
            <text
              x={LABEL_W - 10}
              y={cy + 5}
              textAnchor="end"
              fontSize="13"
              className="font-bold"
              fill="currentColor"
            >
              {r.label}
            </text>
            {gates.map((n, g) => (
              <Gate key={g} x={LABEL_W + g * (GATE_W + GATE_GAP)} cy={cy} count={n} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
