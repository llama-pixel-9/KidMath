// The larkit mark — five flat shapes on a 61×52 viewBox, straight from the
// brand geometry (design/larkit/README.md). No strokes, no gradients.
//
// Rules that matter here: the lark always faces right, one bird per surface,
// never rotate/stretch/recolor outside the palette. At tile sizes (≤32px)
// use the `small` build: crest dropped, eye enlarged, dart widened, cream
// bird on a solid teal tile — same construction as the shipped favicons.

import { useId } from 'react'

const TEAL = '#0B7A6A'
const SUN = '#F26B3A'
const CREAM = '#FFFBEB'

export default function LarkMark({
  size = 32,
  color = TEAL,
  accent = SUN,
  eye = CREAM,
  small = false,
  className,
  ...rest
}) {
  // Unique per-instance clip id so multiple marks on one page don't collide.
  const clipId = `lark-clip-${useId().replace(/:/g, '')}`

  if (small) {
    return (
      <svg
        viewBox="0 0 61 61"
        width={size}
        height={size}
        role="img"
        aria-label="larkit"
        className={className}
        {...rest}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="30" cy="34" r="18" />
          </clipPath>
        </defs>
        <rect width="61" height="61" rx="13" fill={TEAL} />
        <path d="M27,26 C19,20 9,14 2,8 C5,20 8,33 15,44 C20,38 24,31 27,26 Z" fill={CREAM} />
        <circle cx="30" cy="34" r="18" fill={CREAM} />
        <path d="M44,24 L61,28 L44,33 Z" fill={SUN} />
        <g clipPath={`url(#${clipId})`}>
          <path d="M12,33 L39,42 L20,51 Z" fill={SUN} />
        </g>
        <circle cx="39" cy="26" r="3.6" fill={TEAL} />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 1 61 51"
      width={(size * 61) / 51}
      height={size}
      role="img"
      aria-label="larkit"
      className={className}
      {...rest}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="30" cy="32" r="18" />
        </clipPath>
      </defs>
      <path d="M27,24 C19,18 9,12 2,6 C5,18 8,31 15,42 C20,36 24,29 27,24 Z" fill={color} />
      <path d="M25,17 C24,10 27,5 31,3 C31,9 33,14 35,18 Z" fill={color} />
      <circle cx="30" cy="32" r="18" fill={color} />
      <path d="M44,22 L61,26 L44,31 Z" fill={accent} />
      <g clipPath={`url(#${clipId})`}>
        <path d="M14,32 L37,40 L21,48 Z" fill={accent} />
      </g>
      <circle cx="39" cy="24" r="2.6" fill={eye} />
    </svg>
  )
}
