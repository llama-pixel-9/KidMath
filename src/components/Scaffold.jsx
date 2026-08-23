import { scaffoldHint } from "../scaffold.js";

/**
 * The model shown under a missed question during the second chance
 * (src/scaffold.js decides which). Deliberately plain: big dots, a grid, a
 * strip, a line — something a five-year-old can count on, not a lesson.
 */

function Dots({ groups, takeAway }) {
  const total = groups.reduce((n, g) => n + g, 0);
  let drawn = 0;
  return (
    <div className="flex flex-col items-center gap-2" aria-label={`${total} dots in ${groups.length} group${groups.length === 1 ? "" : "s"}`}>
      {groups.map((count, gi) => (
        <div key={gi} className="flex flex-wrap justify-center gap-1.5 max-w-[280px]">
          {Array.from({ length: count }, (_, i) => {
            const idx = drawn++;
            const crossed = takeAway != null && idx >= total - takeAway;
            return (
              <span
                key={i}
                className={`inline-block w-6 h-6 rounded-full ${gi === 0 ? "bg-teal" : "bg-ember"} ${crossed ? "opacity-30 line-through" : ""}`}
                style={crossed ? { backgroundImage: "linear-gradient(135deg, transparent 45%, #14231F 45%, #14231F 55%, transparent 55%)" } : undefined}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ArrayGrid({ rows, cols }) {
  return (
    <div className="inline-grid gap-1.5 mx-auto" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-label={`${rows} rows of ${cols}`}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <span key={i} className="inline-block w-5 h-5 rounded-full bg-teal" />
      ))}
    </div>
  );
}

function Strip({ den, shaded }) {
  return (
    <div className="flex w-full max-w-[300px] mx-auto h-9 rounded-lg overflow-hidden border-2 border-ink/60" aria-label={`${shaded} of ${den} parts shaded`}>
      {Array.from({ length: den }, (_, i) => (
        <span key={i} className={`flex-1 border-r last:border-r-0 border-ink/40 ${i < shaded ? "bg-teal" : "bg-white"}`} />
      ))}
    </div>
  );
}

function Line({ min, max, mark }) {
  const ticks = [];
  const step = max - min > 20 ? 5 : 1;
  for (let v = min; v <= max; v += step) ticks.push(v);
  return (
    <svg viewBox="0 0 320 60" className="w-full max-w-[320px] mx-auto block" aria-label={`number line from ${min} to ${max}, start at ${mark}`}>
      <line x1="16" y1="30" x2="304" y2="30" stroke="#14231F" strokeWidth="2" />
      {ticks.map((v) => {
        const x = 16 + ((v - min) / (max - min || 1)) * 288;
        return (
          <g key={v}>
            <line x1={x} y1="24" x2={x} y2="36" stroke="#14231F" strokeWidth="2" />
            <text x={x} y="52" fontSize="11" textAnchor="middle" fill="#14231F" fontWeight="700">{v}</text>
          </g>
        );
      })}
      <circle cx={16 + ((mark - min) / (max - min || 1)) * 288} cy="30" r="7" fill="#0b7a6a" />
    </svg>
  );
}

export default function Scaffold({ scaffold }) {
  if (!scaffold) return null;
  return (
    <div className="mt-4 pt-4 border-t border-ink/10" data-scaffold={scaffold.kind}>
      <p className="text-center text-sm font-bold text-ink/80 mb-3">{scaffoldHint(scaffold)}</p>
      {scaffold.kind === "dots" && <Dots groups={scaffold.groups} takeAway={scaffold.takeAway} />}
      {scaffold.kind === "array" && <ArrayGrid rows={scaffold.rows} cols={scaffold.cols} />}
      {scaffold.kind === "strip" && <Strip den={scaffold.den} shaded={scaffold.shaded} />}
      {scaffold.kind === "numberLine" && <Line min={scaffold.min} max={scaffold.max} mark={scaffold.mark} />}
    </div>
  );
}
