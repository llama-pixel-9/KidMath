/**
 * The standardised play cards for the first-flight screens (§20): cream card,
 * name Nunito 700/14 left, Sun level pill right, the figure, then the prompt
 * in Fredoka 600 centred. Charts and number lines follow §09/§10 — axis 2px
 * Ink 15%, gridlines 1px 8%, Teal dots, Sun arc. The teal panel holds these
 * live cards, never mascot art, and shows all four tile tints in §08 order.
 */

function PlayCard({ name, level, children }) {
  return (
    <div className="bg-cream rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-bold text-ink">{name}</span>
        <span className="text-xs font-bold text-ink bg-sun rounded-full px-2.5 py-0.5 whitespace-nowrap">
          Level {level}
        </span>
      </div>
      {children}
    </div>
  );
}

function Prompt({ children }) {
  return (
    <p className="m-0 mt-2 text-center font-display font-semibold text-ink text-lg">{children}</p>
  );
}

// §08 tile tints in fixed reading order, with their pressed-edge shades.
const TILE_TINTS = [
  { bg: "bg-seafoam", edge: "shadow-[0_4px_0_#7FCFBE]" },
  { bg: "bg-teal-mid", edge: "shadow-[0_4px_0_#3E9E8E]" },
  { bg: "bg-apricot", edge: "shadow-[0_4px_0_#F0A47A]" },
  { bg: "bg-sun-light", edge: "shadow-[0_4px_0_#E8895A]" },
];

function MultiplicationCard() {
  const tiles = [42, 36, 48, 40];
  return (
    <PlayCard name="Multiplication Meadow" level={3}>
      <p className="m-0 text-center font-display font-semibold text-ink text-3xl">7 × 6</p>
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        {tiles.map((t, i) => (
          <span
            key={t}
            className={`${TILE_TINTS[i].bg} ${TILE_TINTS[i].edge} rounded-xl h-10 inline-flex items-center justify-center font-display font-semibold text-ink text-lg`}
          >
            {t}
          </span>
        ))}
      </div>
    </PlayCard>
  );
}

function CountingCard() {
  // Bars in the fixed §09 ramp; axis Ink 15%, gridlines Ink 8%.
  const days = [
    { label: "Mon", v: 4, fill: "#A7DED3" },
    { label: "Tue", v: 7, fill: "#6FC3B2" },
    { label: "Wed", v: 5, fill: "#FBC7A8" },
    { label: "Thu", v: 3, fill: "#F9A97F" },
  ];
  const w = 240;
  const h = 110;
  const left = 22;
  const bottom = 96;
  const scale = (v) => (v / 8) * 80;
  return (
    <PlayCard name="Counting Chicks" level={2}>
      <svg viewBox={`0 0 ${w} ${h + 16}`} className="w-full" role="img" aria-label="Bar chart of chicks counted each day">
        {[0, 2, 4, 6, 8].map((t) => (
          <g key={t}>
            <line x1={left} x2={w - 4} y1={bottom - scale(t)} y2={bottom - scale(t)} stroke="#14231F" strokeOpacity="0.08" strokeWidth="1" />
            <text x={left - 6} y={bottom - scale(t) + 3} textAnchor="end" fontSize="9" fill="#14231F" fontFamily="Nunito, sans-serif" fontWeight="700">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const bw = 38;
          const x = left + 12 + i * (bw + 14);
          return (
            <g key={d.label}>
              <rect x={x} y={bottom - scale(d.v)} width={bw} height={scale(d.v)} fill={d.fill} />
              <text x={x + bw / 2} y={bottom + 14} textAnchor="middle" fontSize="10" fill="#14231F" fontFamily="Nunito, sans-serif" fontWeight="700">
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={w - 4} y1={bottom} y2={bottom} stroke="#14231F" strokeOpacity="0.15" strokeWidth="2" />
      </svg>
      <Prompt>Which day had the most?</Prompt>
    </PlayCard>
  );
}

function FractionsCard() {
  // Number line 0–10, Teal dots at 3 and 6, Sun hop arc between them.
  const w = 240;
  const y = 46;
  const x = (v) => 12 + (v / 10) * (w - 24);
  return (
    <PlayCard name="Fractions Feather" level={1}>
      <svg viewBox={`0 0 ${w} 70`} className="w-full" role="img" aria-label="Number line from 0 to 10 with a hop from 3 to 6">
        <path
          d={`M ${x(3)} ${y - 4} Q ${x(4.5)} ${y - 34} ${x(6)} ${y - 4}`}
          fill="none"
          stroke="#F26B3A"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line x1={x(0)} x2={x(10)} y1={y} y2={y} stroke="#14231F" strokeWidth="2" />
        {Array.from({ length: 11 }, (_, v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={y - 5} y2={y + 5} stroke="#14231F" strokeWidth={v % 2 === 0 ? 2 : 1} />
            {v % 2 === 0 && (
              <text x={x(v)} y={y + 18} textAnchor="middle" fontSize="10" fill="#14231F" fontFamily="Nunito, sans-serif" fontWeight="700">
                {v}
              </text>
            )}
          </g>
        ))}
        <circle cx={x(3)} cy={y} r="4.5" fill="#0B7A6A" />
        <circle cx={x(6)} cy={y} r="4.5" fill="#0B7A6A" />
      </svg>
      <Prompt>How far did she hop?</Prompt>
    </PlayCard>
  );
}

/** The one full-bleed teal panel a first-flight screen is allowed. */
export default function PlayCardPanel({ className = "" }) {
  return (
    <div className={`bg-teal rounded-[24px] p-5 sm:p-6 flex flex-col gap-4 justify-center ${className}`}>
      <MultiplicationCard />
      <CountingCard />
      <FractionsCard />
    </div>
  );
}
