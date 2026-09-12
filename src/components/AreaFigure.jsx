import { FIGURE_COLORS } from "./kit";

/** Draws the spec from areaFigureSpec.js — see that file for the payload
 * sources and the drawing rules. */

// ---- drawing ---------------------------------------------------------------

const VIEW_W = 320;
const MAX_W = 230;
const MAX_H = 150;
const MIN_RATIO = 0.3;

/** Scale so the largest extent fits; squash extreme aspects (returns note). */
function fit(wUnits, hUnits) {
  let w = wUnits;
  let h = hUnits;
  let clamped = false;
  if (h / w < MIN_RATIO) { h = w * MIN_RATIO; clamped = true; }
  if (w / h < MIN_RATIO) { w = h * MIN_RATIO; clamped = true; }
  const s = Math.min(MAX_W / w, MAX_H / h);
  return { pw: w * s, ph: h * s, s, clamped };
}

function label(v, unit, unknown) {
  if (unknown || v == null) return "?";
  return unit ? `${v} ${unit}` : String(v);
}

function Rect({ x, y, w, h, wUnits, hUnits, perim, grid, unit, unknownH = false, labels = true, dashedRight = false }) {
  const fill = perim ? "none" : FIGURE_COLORS.fill;
  const stroke = FIGURE_COLORS.ink;
  const cells = [];
  if (grid && wUnits && hUnits && wUnits * hUnits <= 60) {
    const cw = w / wUnits;
    const ch = h / hUnits;
    for (let i = 1; i < wUnits; i += 1) cells.push(<line key={`v${i}`} x1={x + i * cw} y1={y} x2={x + i * cw} y2={y + h} stroke={FIGURE_COLORS.inkSoft} strokeWidth="1" />);
    for (let j = 1; j < hUnits; j += 1) cells.push(<line key={`h${j}`} x1={x} y1={y + j * ch} x2={x + w} y2={y + j * ch} stroke={FIGURE_COLORS.inkSoft} strokeWidth="1" />);
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={perim ? 4 : 2.5} strokeDasharray={dashedRight ? "6 5" : undefined} rx="2" />
      {cells}
      {labels && (
        <>
          <text x={x + w / 2} y={y + h + 18} textAnchor="middle" fontSize="15" fontWeight="800" fill={FIGURE_COLORS.ink}>
            {label(wUnits, unit)}
          </text>
          <text x={x - 8} y={y + h / 2 + 5} textAnchor="end" fontSize="15" fontWeight="800" fill={unknownH ? FIGURE_COLORS.warm : FIGURE_COLORS.ink}>
            {label(hUnits, unit, unknownH)}
          </text>
        </>
      )}
    </g>
  );
}

export default function AreaFigure({ spec }) {
  if (!spec) return null;
  const { unit, perim, grid } = spec;
  let body = null;
  let viewH = 200;
  let note = null;

  if (spec.shape === "rect") {
    const hUnits = spec.h ?? Math.max(1, Math.round(spec.w * 0.6));
    const f = fit(spec.w, hUnits);
    note = f.clamped ? "not drawn to scale" : null;
    const x = (VIEW_W - f.pw) / 2 + 20;
    const y = 14;
    viewH = y + f.ph + 34;
    body = <Rect x={x} y={y} w={f.pw} h={f.ph} wUnits={spec.w} hUnits={spec.h} perim={perim} grid={grid} unit={unit} unknownH={spec.h == null} />;
  } else if (spec.shape === "cut") {
    const f = fit(spec.W, spec.H);
    note = f.clamped ? "not drawn to scale" : null;
    const x = (VIEW_W - f.pw) / 2 + 20;
    const y = 14;
    const cw = (spec.w / spec.W) * f.pw;
    const ch = (spec.h / spec.H) * f.ph;
    viewH = y + f.ph + 34;
    const path = `M${x},${y} H${x + f.pw - cw} V${y + ch} H${x + f.pw} V${y + f.ph} H${x} Z`;
    body = (
      <g>
        <path d={path} fill={perim ? "none" : FIGURE_COLORS.fill} stroke={FIGURE_COLORS.ink} strokeWidth={perim ? 4 : 2.5} />
        <rect x={x + f.pw - cw} y={y} width={cw} height={ch} fill="none" stroke={FIGURE_COLORS.inkSoft} strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={x + f.pw / 2} y={y + f.ph + 18} textAnchor="middle" fontSize="15" fontWeight="800" fill={FIGURE_COLORS.ink}>{label(spec.W, unit)}</text>
        <text x={x - 8} y={y + f.ph / 2 + 5} textAnchor="end" fontSize="15" fontWeight="800" fill={FIGURE_COLORS.ink}>{label(spec.H, unit)}</text>
        <text x={x + f.pw - cw / 2} y={y - 3} textAnchor="middle" fontSize="13" fontWeight="700" fill={FIGURE_COLORS.warm}>{label(spec.w, unit)}</text>
        <text x={x + f.pw + 6} y={y + ch / 2 + 5} textAnchor="start" fontSize="13" fontWeight="700" fill={FIGURE_COLORS.warm}>{label(spec.h, unit)}</text>
      </g>
    );
  } else if (spec.shape === "join") {
    // Two rectangles sharing a vertical edge, bottoms aligned.
    const totalW = spec.a + spec.c;
    const totalH = Math.max(spec.b, spec.d);
    const f = fit(totalW, totalH);
    note = f.clamped ? "not drawn to scale" : null;
    const s = Math.min(f.pw / totalW, f.ph / totalH);
    const x = (VIEW_W - totalW * s) / 2 + 20;
    const base = 14 + totalH * s;
    viewH = base + 34;
    body = (
      <g>
        <Rect x={x} y={base - spec.b * s} w={spec.a * s} h={spec.b * s} wUnits={spec.a} hUnits={spec.b} perim={perim} grid={grid} unit={unit} />
        <Rect x={x + spec.a * s} y={base - spec.d * s} w={spec.c * s} h={spec.d * s} wUnits={spec.c} hUnits={spec.d} perim={perim} grid={grid} unit={unit} labels={false} />
        <text x={x + spec.a * s + (spec.c * s) / 2} y={base + 18} textAnchor="middle" fontSize="15" fontWeight="800" fill={FIGURE_COLORS.ink}>{label(spec.c, unit)}</text>
        <text x={x + totalW * s + 8} y={base - (spec.d * s) / 2 + 5} textAnchor="start" fontSize="15" fontWeight="800" fill={FIGURE_COLORS.ink}>{label(spec.d, unit)}</text>
      </g>
    );
  } else if (spec.shape === "split") {
    // Known part a×b, unknown part alongside with the same height, dashed.
    const otherW = Math.max(1, Math.round((spec.T - spec.a * spec.b) / spec.b) || 1);
    const totalW = spec.a + otherW;
    const f = fit(totalW, spec.b);
    const s = Math.min(f.pw / totalW, f.ph / spec.b);
    const x = (VIEW_W - totalW * s) / 2 + 20;
    const y = 14;
    viewH = y + spec.b * s + 34;
    body = (
      <g>
        <Rect x={x} y={y} w={spec.a * s} h={spec.b * s} wUnits={spec.a} hUnits={spec.b} perim={false} grid={grid} unit={unit} />
        <rect x={x + spec.a * s} y={y} width={otherW * s} height={spec.b * s} fill="none" stroke={FIGURE_COLORS.warm} strokeWidth="2.5" strokeDasharray="6 5" />
        <text x={x + spec.a * s + (otherW * s) / 2} y={y + (spec.b * s) / 2 + 7} textAnchor="middle" fontSize="22" fontWeight="800" fill={FIGURE_COLORS.warm}>?</text>
        <text x={x + (totalW * s) / 2} y={y - 3} textAnchor="middle" fontSize="13" fontWeight="700" fill={FIGURE_COLORS.inkSoft}>{label(spec.T, unit ? `square ${unit}` : "")} in all</text>
      </g>
    );
  } else if (spec.shape === "pair") {
    const [[a, b], [c, d]] = spec.rects;
    const maxH = Math.max(b, d);
    const totalW = a + c;
    const s = Math.min((MAX_W + 40) / (totalW + Math.max(2, totalW * 0.18)), MAX_H / maxH);
    const gap = 34;
    const x1 = (VIEW_W - (totalW * s + gap)) / 2 + 20;
    const base = 14 + maxH * s;
    viewH = base + 34;
    body = (
      <g>
        <Rect x={x1} y={base - b * s} w={a * s} h={b * s} wUnits={a} hUnits={b} perim={perim} grid={grid} unit={unit} />
        <Rect x={x1 + a * s + gap} y={base - d * s} w={c * s} h={d * s} wUnits={c} hUnits={d} perim={perim} grid={grid} unit={unit} />
      </g>
    );
  }

  if (!body) return null;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${VIEW_W + 40} ${viewH}`} width="100%" style={{ maxWidth: 360 }} role="img" aria-label="Shape with its measurements">
        {body}
      </svg>
      {note && <p className="text-xs font-semibold" style={{ color: FIGURE_COLORS.inkSoft }}>{note}</p>}
    </div>
  );
}
