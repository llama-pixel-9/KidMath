import { birdArt } from "./artAssets.js";

/**
 * Bird sprite slot. With generated art present (public/meadow/birds/), renders
 * the species' WebP fitted to its SPRITE_SIZES footprint — feet at (0,0),
 * facing right, flipped by the caller via `facing`. Without art (tests,
 * offline, an unshipped species) the original sketch blob renders, so the
 * layout/interaction contract never depends on assets loading.
 *
 * §12 night: birds are TINTED, keeping their colors (decision 2026-08 — the
 * scene overlay in MeadowScene does the heavy lift; asleep birds also dim
 * slightly here so they read as settled). Owls stay bright via `asleep=false`.
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

const ASLEEP_TINT = "brightness(0.72) saturate(0.8)";

/**
 * Renders with the feet at (x, y), scaled by the perch's depth band.
 * `variant`: optional art variant (e.g. "cling" while on a trunkHollow perch).
 * `fit`: optional {w, h} that overrides the SPRITE_SIZES × depth footprint.
 */
export default function BirdSprite({
  speciesId,
  x = 0,
  y = 0,
  depth = 1.0,
  facing = 1,
  label,
  onClick,
  asleep = false,
  variant = null,
  fit = null,
}) {
  // `fit`: explicit {w, h} footprint for portraits (Field Guide, Give a home)
  // where the bird should fill its frame instead of using the scene footprint.
  const { w, h } = fit ?? spriteSize(speciesId, depth);
  const art = birdArt(speciesId, variant);

  if (art) {
    // Fit the image inside the footprint, keep aspect, anchor feet bottom-center.
    const s = Math.min(w / art.w, h / art.h);
    const iw = art.w * s;
    const ih = art.h * s;
    return (
      <g
        transform={`translate(${x}, ${y}) scale(${facing}, 1)`}
        data-species={speciesId}
        role={onClick ? "button" : undefined}
        aria-label={label}
        onClick={onClick}
        style={onClick ? { cursor: "pointer" } : undefined}
      >
        <image
          href={art.url}
          x={-iw / 2}
          y={-ih}
          width={iw}
          height={ih}
          preserveAspectRatio="xMidYMax meet"
          style={asleep ? { filter: ASLEEP_TINT } : undefined}
        />
      </g>
    );
  }

  // ---- fallback: the original sketch blob (kept for tests/missing assets) ----
  const bodyW = w;
  const bodyH = h * 0.72;
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
