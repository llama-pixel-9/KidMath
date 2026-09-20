// Pictograph: rows of symbols with a key, the way a textbook prints one.
//
// This used to be prose in the prompt ("Each ● stands for 2. Cats: ●●●●."),
// which asks the child to parse a sentence rather than read a chart. The key is
// part of the figure, not the sentence, because "check the key before you
// multiply" is the habit the `keyIgnored` misconception is about.

const VIEW_W = 340;
const ROW_H = 34;
const KEY_H = 34;
const PAD_TOP = 6;
const LABEL_W = 84;
const SYMBOL_R = 9;
const SYMBOL_GAP = 24;

// `paper` (worksheets): black symbols inside a ruled table, the way a printed
// picture graph looks. Teal symbols print as mid-gray blobs on a bare page.
function Symbol({ cx, cy, half, paper = false }) {
  const fill = paper ? "fill-black" : "fill-teal";
  const stroke = paper ? "stroke-black" : "stroke-teal";
  if (!half) return <circle cx={cx} cy={cy} r={SYMBOL_R} className={fill} />;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={SYMBOL_R}
        className={`fill-none ${stroke}`}
        strokeWidth="1.5"
      />
      {/* Left half only: "half of one symbol" has to look like half of one. */}
      <path
        d={`M ${cx},${cy - SYMBOL_R} A ${SYMBOL_R},${SYMBOL_R} 0 0,0 ${cx},${cy + SYMBOL_R} Z`}
        className={fill}
      />
    </g>
  );
}

export default function Pictograph({ rows, keyValue, theme, paper = false }) {
  const data = rows || [];
  const anyHalf = data.some((r) => r.half);
  const height = PAD_TOP + data.length * ROW_H + KEY_H;
  const secondary = theme?.textSecondary || "text-slate-500";

  const describe = data
    .map((r) => `${r.label} ${r.symbols}${r.half ? " and a half" : ""} symbols`)
    .join(", ");

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      className="w-full h-auto max-h-[40vh]"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Pictograph. Each symbol stands for ${keyValue}. ${describe}.`}
    >
      {paper && (
        <g stroke="#000" strokeWidth="1.2" fill="none">
          <rect x="1" y={PAD_TOP} width={VIEW_W - 2} height={data.length * ROW_H} />
          <line x1={LABEL_W} x2={LABEL_W} y1={PAD_TOP} y2={PAD_TOP + data.length * ROW_H} />
          {data.slice(1).map((r, i) => (
            <line key={r.label} x1="1" x2={VIEW_W - 1} y1={PAD_TOP + (i + 1) * ROW_H} y2={PAD_TOP + (i + 1) * ROW_H} />
          ))}
        </g>
      )}
      {data.map((r, i) => {
        const cy = PAD_TOP + i * ROW_H + ROW_H / 2;
        return (
          <g key={r.label}>
            <text
              x={LABEL_W - 10}
              y={cy + 4}
              textAnchor="end"
              fontSize="13"
              className={`${secondary} font-bold`}
              fill="currentColor"
            >
              {r.label}
            </text>
            {Array.from({ length: r.symbols }, (_, s) => (
              <Symbol key={s} cx={LABEL_W + SYMBOL_GAP / 2 + s * SYMBOL_GAP} cy={cy} half={false} paper={paper} />
            ))}
            {r.half && (
              <Symbol
                cx={LABEL_W + SYMBOL_GAP / 2 + r.symbols * SYMBOL_GAP}
                cy={cy}
                half
                paper={paper}
              />
            )}
          </g>
        );
      })}

      {/* The key, boxed off from the data like a printed chart. */}
      <g className={secondary} fill="currentColor">
        <line
          x1="8"
          x2={VIEW_W - 8}
          y1={PAD_TOP + data.length * ROW_H + 6}
          y2={PAD_TOP + data.length * ROW_H + 6}
          stroke="currentColor"
          strokeOpacity={paper ? "0" : "0.3"}
          strokeWidth="1"
        />
        <text x="10" y={height - 10} fontSize="13" className="font-bold">
          Key:
        </text>
        <Symbol cx={56} cy={height - 14} half={false} paper={paper} />
        <text x="70" y={height - 10} fontSize="13" className="font-bold">
          = {keyValue}
        </text>
        {anyHalf && (
          <>
            <Symbol cx={128} cy={height - 14} half paper={paper} />
            <text x="142" y={height - 10} fontSize="13" className="font-bold">
              = {keyValue / 2}
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
