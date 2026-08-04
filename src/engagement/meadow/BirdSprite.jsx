/**
 * Placeholder bird art (spec: "ALL BIRD ART IS A ROUGH SKETCH").
 *
 * Every species renders through this named slot — an SVG <g> in scene
 * coordinates — at the sizes the spec gives: three scales (depth bands),
 * an idle pose, and a per-tier behaviour rig hook (§09/§14). Commissioned art
 * replaces SPRITE_SIZES entries and the drawing below without any layout
 * change: the slot's anchor is the bird's FEET at (0,0).
 *
 * The sketch is the mock's blob bird: Apricot body, Ink eye and legs, Sun
 * beak. Deliberately unlike the flat geometric teal LarkMark — the logo stays
 * the logo.
 */

// Per-species footprint overrides (w×h at depth 1.0). Cranes stand tall; the
// condor is simply enormous. Everything else uses the default.
const SPRITE_SIZES = {
  default: { w: 46, h: 40 },
  sandhillCrane: { w: 54, h: 84 },
  whoopingCrane: { w: 56, h: 92 },
  condor: { w: 88, h: 62 },
  snowyOwl: { w: 54, h: 52 },
  barnOwl: { w: 46, h: 48 },
  hummingbird: { w: 28, h: 24 },
};

function spriteSize(speciesId, depth = 1.0) {
  const base = SPRITE_SIZES[speciesId] || SPRITE_SIZES.default;
  return { w: base.w * depth, h: base.h * depth };
}

/**
 * Renders with the feet at (x, y), scaled by the perch's depth band.
 * `pose`: idle | hop (visual state is driven by the parent via motion).
 */
export default function BirdSprite({ speciesId, x = 0, y = 0, depth = 1.0, facing = 1, label, onClick, asleep = false }) {
  const { w, h } = spriteSize(speciesId, depth);
  const bodyW = w;
  const bodyH = h * 0.72;
  // §12 night: birds settle as silhouettes (only the owls stay awake — the
  // caller decides who sleeps).
  const bodyFill = asleep ? "#0A2E28" : "#FBC7A8";
  const inkStroke = asleep ? "#0A2E28" : "#14231F";
  const beakFill = asleep ? "#0A2E28" : "#F26B3A";
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${facing}, 1)`}
      data-species={speciesId}
      role={onClick ? "button" : undefined}
      aria-label={label}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {/* legs */}
      <line x1={-bodyW * 0.12} y1={0} x2={-bodyW * 0.08} y2={-h * 0.18} stroke={inkStroke} strokeWidth={1.6} />
      <line x1={bodyW * 0.12} y1={0} x2={bodyW * 0.08} y2={-h * 0.18} stroke={inkStroke} strokeWidth={1.6} />
      {/* body */}
      <ellipse cx={0} cy={-h * 0.42} rx={bodyW * 0.42} ry={bodyH * 0.42} fill={bodyFill} stroke={inkStroke} strokeWidth={1.6} />
      {/* head */}
      <circle cx={bodyW * 0.3} cy={-h * 0.72} r={h * 0.2} fill={bodyFill} stroke={inkStroke} strokeWidth={1.6} />
      {/* beak — always faces the direction of travel */}
      <path
        d={`M ${bodyW * 0.48} ${-h * 0.74} l ${bodyW * 0.16} ${h * 0.04} l ${-bodyW * 0.16} ${h * 0.06} z`}
        fill={beakFill}
      />
      {/* eye */}
      <circle cx={bodyW * 0.34} cy={-h * 0.76} r={Math.max(1.6, h * 0.045)} fill="#14231F" opacity={asleep ? 0 : 1} />
      {/* folded wing hint */}
      <path
        d={`M ${-bodyW * 0.26} ${-h * 0.48} q ${bodyW * 0.18} ${-h * 0.14} ${bodyW * 0.4} 0 q ${-bodyW * 0.16} ${h * 0.16} ${-bodyW * 0.4} 0 z`}
        fill="none"
        stroke={inkStroke}
        strokeWidth={1.2}
        opacity={0.55}
      />
    </g>
  );
}
