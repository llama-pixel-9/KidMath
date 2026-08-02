# Handoff: larkit rebrand (kidmathexplorer.com → larkit.io)

## Overview
Complete visual rebrand of kidmathexplorer.com to **larkit** (larkit.io): color system, wordmark typeface,
logo mark, favicon/app icon set, social card, and a cream + graph-paper background system.

Use this bundle to update **both the marketing site and the app**: swap icons and og-image, replace the
logotype, apply the color tokens, and adopt the background pattern.

## About the Design Files
The files in this bundle are **design references created in HTML** — they show the intended look, geometry
and rules, not production code to copy verbatim. Recreate them in the target codebase using its existing
environment and patterns (React/Next, Vue, SwiftUI, etc.). The exported files in `brand/` **are**
production-ready and should be shipped as-is.

## Fidelity
**High fidelity.** Colors, contrast ratios, type, and logo geometry are final. Match them exactly.

## Assets — ship these as-is (folder `brand/`)
| File | Where it goes |
| --- | --- |
| `larkit-mark.svg` | Primary scalable mark, full color. Site header, app nav. |
| `larkit-mark-black.svg` | 100% black — worksheet headers, photocopies, single-color print. |
| `larkit-mark-white.svg` | Knockout for dark / photographic backgrounds. |
| `larkit-mark-dark.svg` | Mint + peach version for dark UI. |
| `icon-512.png`, `icon-192.png` | PWA manifest icons. |
| `apple-touch-icon.png` (180) | iOS home screen. |
| `icon-48/32/16.png` | Legacy favicon sizes — simplified build (crest dropped, eye enlarged, teal tile). |
| `favicon.ico` | Multi-resolution 16/32/48 ICO. |
| `og-image.png` (1200×630) | Social share card — **replaces the old og-image.svg**. |

### HTML head
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/larkit-mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0B7A6A">
<meta property="og:image" content="https://larkit.io/og-image.png">
<meta property="og:title" content="larkit — Math that feels like play.">
```

### site.webmanifest
```json
{
  "name": "larkit",
  "short_name": "larkit",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFBEB",
  "theme_color": "#0B7A6A",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Design Tokens

### Color
| Token | Hex | Use | Contrast |
| --- | --- | --- | --- |
| `--cream` | #FFFBEB | Page background. Never text. | — |
| `--teal` (primary) | #0B7A6A | Brand, links, buttons, headings on cream | 5.05:1 on cream — AA all text |
| `--sun` (accent) | #F26B3A | Shapes and fills, large display type only | 2.92:1 on cream — **never small text** |
| `--ember` | #C4471B | The accent when it must be text | 4.75:1 on cream — AA |
| `--ink` | #14231F | Body copy, worksheets | 15.7:1 on cream — AAA |
| `--night` | #10221E | Dark-mode background | — |
| `--mint` | #4FD1BC | Brand color on dark | 8.81:1 on night |
| `--peach` | #FFB088 | Accent on dark | 9.31:1 on night |

Verified pairings: cream on teal 5.05 ✓ · ink on cream 15.7 ✓ · ink on sun 5.38 ✓ · **cream on sun 2.92 ✗ (forbidden)**.
Audience is children — AA is the floor, not the target.

### Typography
- **Display / wordmark:** Fredoka (Google Fonts), weight 500–600, always **lowercase**, letter-spacing −0.01em.
  The wordmark is `larkit` set in Fredoka 600 in Lark Teal.
- **Body:** Nunito (Google Fonts), 400 / 600 / 700. Body copy 16–17px, line-height 1.55–1.6.
- **Mono (labels, code, spec captions):** IBM Plex Mono 400/500, 12–14px, letter-spacing 0.08em when uppercase.
- Rejected candidates and why: Baloo 2 (too cartoon), Nunito as logotype (too flat), Poppins (geometric but cool, less kid).
- Minimum sizes: 16px body on screen, 12pt in print.

### Radius & elevation
- Cards 14–18px radius, 1.5px border `#14231F1a`, no shadows.
- Buttons/pills 12px radius.
- Spacing rhythm: 24px base; section gaps 72px; card padding 22–30px.

## Logo mark — geometry
Five flat shapes on a 61 × 52 viewBox, no strokes, no gradients:
```
wing  M27,24 C19,18 9,12 2,6 C5,18 8,31 15,42 C20,36 24,29 27,24 Z   (teal)
crest M25,17 C24,10 27,5 31,3 C31,9 33,14 35,18 Z                    (teal)
body  circle cx=30 cy=32 r=18                                        (teal)
beak  M44,22 L61,26 L44,31 Z                                         (sun)
dart  M14,32 L37,40 L21,48 Z  — clipped to the body circle           (sun)
eye   circle cx=39 cy=24 r=2.6                                       (cream)
```
Small build (≤32px): drop the crest, enlarge the eye to r=3.6, widen the dart, place cream bird on a solid teal tile.

**Rules**
- Clear space = 30% of mark height on all four sides. Nothing enters it.
- Minimum size: mark alone 16px screen / 8mm print. Lockup with wordmark 96px wide; below that use the mark alone.
- Lark always faces right. One bird per surface. Never rotate, shadow, outline, bevel, stretch, or recolor
  outside the palette. Never add eyelashes, hats, arms, or a smile — the eye dot is the whole face.
- On photos or busy art: white knockout on a teal circle, never the full-color mark.

## Background & pattern system
- Base: cream #FFFBEB.
- Grid: minor squares 24px at Lark Teal **5%** alpha, major every 120px at **8%**, 1px lines, origin top-left, never scaled or rotated.
  ```css
  background-color: #FFFBEB;
  background-image:
    linear-gradient(#0B7A6A14 1px, transparent 1px),
    linear-gradient(90deg, #0B7A6A14 1px, transparent 1px),
    linear-gradient(#0B7A6A0d 1px, transparent 1px),
    linear-gradient(90deg, #0B7A6A0d 1px, transparent 1px);
  background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px;
  ```
- Math marks: operators, degrees, fractions, π, √, ∠, plus 2.5px outline protractors, rulers, circles,
  squares, triangles. Fredoka. Teal or Sun only, 30–50% opacity, 30–46px, ~one mark per 150px of page
  height, irregular spacing, rotation ±12°. Decorative layer only — `pointer-events: none`, behind content.
- Never: behind body copy at full strength, inside the logo clear-space, on worksheet answer areas.
  Dark theme gets the grid only (Mint 8%), no math marks.
- In print, render the grid at 10% K instead of teal.


## Product UI — screens & rules (sections 08–18 of the style guide)

Everything below is specified in full, with mocks, in `Larkit Brand.dc.html`. Open that file first; this is the index.

### Shared surface tokens
| Token | Hex | Use |
| --- | --- | --- |
| `--seafoam` | #A7DED3 | Answer tile / keypad tint 1 (pressed #7FCFBE) |
| `--teal-mid` | #6FC3B2 | Tint 2 (pressed #3E9E8E) |
| `--apricot` | #FBC7A8 | Tint 3 (pressed #F0A47A) |
| `--sun-light` | #F9A97F | Tint 4 (pressed #E8895A) |
| `--deep-teal` | #064A41 | Button drop shadow, small teal text |

Standard button: Lark Teal, 56px tall, 18px radius, `box-shadow: 0 5px 0 #064A41`, Cream Fredoka 600 / 20px label.
Press on any tappable surface: `translateY(4px)` + drop the bottom edge to 1px, 90ms. All tap targets ≥44px.
Tile labels are always Ink #14231F — never cream, never a colored label on a tint.

### 08 · Play area
Question card white, 24px radius, `0 6px 0 #14231F0f`, 44px padding. Problem type Fredoka 600 / 52px (stacked sums 72px), never below 24px. Answer tiles 76px, keypad keys 64px. Keypad rows carry the four tints (1–3 Seafoam, 4–6 Teal Mid, 7–9 Apricot, 0 Sun Light); backspace solid Sun, Go solid Lark Teal. Correct → tile deepens one step + 320ms star pop `cubic-bezier(.2,1.4,.4,1)`. Wrong → ±6px shake 240ms, Ember outline, answer reveals after 600ms. No red X, no buzzer, no timers.
**Comparison keys (< = >):** three 72px landscape keys, fixed order; `<` and `>` share Seafoam, `=` is Apricot. Prompt gap is an Ink `?` replaced in place on answer. Wrong → the number line drops in with both values plotted.

### 09 · Charts & data
Fixed bar ramp, no library defaults, no highlighted bar, no color that matches the category being asked about. Full spec in the guide.

### 10 · Math diagrams
Three roles, three colors: **Ink** structure, **Lark Teal** the thing in play, **Sun** the measurement drawn on top. Figures drawn to scale; the answer is never drawn. Shapes have square (mitred) corners; the right-angle marker sits inside the outline. Clocks show the full dial — 60 minute ticks, heavier Sun hour ticks, numerals 1–12, Apricot 35% face, teal minute hand stopping short of the numerals. Worksheet mode: Ink → black, Teal → 60% grey, Sun → dashed black. Minimum 220px square.

### 12 · The perch (app chrome)
64px white bar on cream, `0 3px 0 #14231F0f`, no border. Left: 32px mark + `larkit` in Fredoka 600 / 24px teal, links home. Right, fixed order: 44px teal avatar circle with Cream initial, then ≤2 ghost buttons (44px, 12px radius, Ink 5%). In-game header sits below the bar: game glyph, name in Fredoka 600 / 26px, sound + settings.
**The theme picker is removed.** Its real settings live in the settings sheet: Sound on/off and Calm mode (drops confetti and shake, keeps the star). Honor Calm mode everywhere motion is specified.
Game names: Sum Perch, Countdown Coop, Times Tree, Split the Nest, Tell the Hour, Weigh Station (was "Measure Up!").

### 13 · Feather set (icons)
24×24 box, 20px live area, 2px stroke, round caps/joins, 2px corners. Sizes 20/24/32/44 — redrawn at each, never scaled. Ink by default, Cream on teal, Sun only for a single active state. Closed list of 14: nest, sound on, sound off, settings, back, close, print, star, streak, lock, check, next, replay, profile. Game glyphs are a separate 32px set. Every icon needs a child-worded aria-label.

### 14 · The aviary (game select)
Grid of game cards, min 210px wide / 150px tall, 20px radius, 5px bottom edge, alternating tile tints in reading order. Glyph in a 38px cream well top-left; name Fredoka 600 / 20px bottom-left; skill + cream level badge on one baseline. Fixed order — never re-sorted by "recommended". One greeting line above, lark at 56px beside it, and a single teal text link "Print a flight log" below. No streak pressure, no daily-goal ring.

### 15 · Flight logs (printable worksheets)
The only printable surface. 100% black, no greys under 40%. Header: 32px black mark lockup + 2px rule, log name right. Name/Date rules top. Twelve problems, two columns, Fredoka 600 / 19pt, 28px answer boxes with 1.5px black square borders. Footer: larkit.io left, page count right, 10pt. Answer key is a separate sheet. Generated from the same level data as the app.

### 16 · Nesting (loading, empty, offline, error)
The question card is always present and fills with Ink 6% skeleton blocks in the real card's shape — no layout shift, no spinner, no shimmer. Under 300ms show the empty card only; over 4s the lark appears with "Still flying…". Empty/offline/error all share one layout: mark, one Fredoka line, one Nunito line, one button. Copy: "Nothing in the nest yet" / "No signal from the nest." / "That one flew off."

### 17 · Fledging (level up)
Between levels, ~2s. Apricot disc behind the lark (the teal ring belongs to the end card). Level bar fills over 600ms then resets. Headline uses a flight word, one line of plain copy on what changes, one button, auto-advance at 4s. No confetti — that is the end of a run only.

### 11 · End card
Teal progress ring, score pill, bird-pun headline, Apricot stat strip, level bar, primary button + "Back to the nest" text link, confetti in Sun / Seafoam / Sun Light / Apricot.

### 18 · Coin purse (money mode)
Photographic coins are replaced by flat discs with a 4px bottom edge, at true relative diameters: dime 54, penny 58, nickel 64, quarter 74px. One fixed tint per denomination — 1¢ Sun Light, 5¢ Teal Mid, 10¢ Seafoam, 25¢ Apricot — with the value on the face in Fredoka 600 Ink. Tray is white on cream, coins baseline-aligned. Tap lifts 6px + 3px teal ring and counts into the total; tap again to remove. Running total Fredoka 600 / 34px, counts up. Check is the standard teal button (the lavender gradient is out) and stays enabled at 0¢. Wrong → total shakes and the tray states the shortfall ("7¢ short") in Ember. Always "51¢" notation, max eight coins in the tray. Currency is a setting: swap labels and diameters, keep the tints.

## State & behavior notes
- Persist: current game, level, star total, streak, Sound and Calm mode. Nothing else.
- Calm mode disables: confetti, card shake, wing flap, pop scaling. It never disables the star or the level bar.
- Progress counts up only. No timers, countdowns, or losing-streak counters anywhere.
- The lark never appears mid-problem — HUD, level-up, end card, empty states only.

## What to change in the existing product
1. Replace all instances of the old wordmark and bird with `brand/` assets; delete `og-image.svg`.
2. Replace the old palette with the tokens above; audit every text/background pair against the contrast table
   (the one to watch: cream text on Sun is now forbidden).
3. Load Fredoka + Nunito from Google Fonts; retire previous display face.
4. Apply the cream + grid background to page shells; add the math-mark layer to marketing pages only.
5. Update manifest, favicons, theme-color, and social meta as above.
6. Rename copy: kidmathexplorer → larkit, domain → larkit.io. Tagline: **"Math that feels like play."**

## Files in this bundle
- `Larkit Brand.dc.html` — the full style guide (source of truth for everything above).
- `LarkMark.dc.html` — the mark as a small component (props: size, color, accent, eye, eyeR).
- `LarkMarkV.dc.html` — the five accent explorations; variant B was chosen.
- `Larkit Mark Options.dc.html` — the exploration page those variants were chosen from.
- `brand/` — all production assets listed above.

The style guide is 18 sections; sections 08–18 are the product UI and are the bulk of the build work.
