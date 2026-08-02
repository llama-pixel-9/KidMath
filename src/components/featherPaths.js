/**
 * The feather set (brand spec §13) — one icon family across app, worksheets
 * and marketing, drawn on the same geometry as the mark.
 *
 * Construction: 24×24 box, 20px live area, 2px stroke, round caps and joins,
 * nothing sharper or rounder than a 2px corner, geometry only. Ink by
 * default (currentColor), Cream on teal, Sun for a single active state.
 *
 * The list of fourteen is closed: nest, sound on, sound off, settings, back,
 * close, print, star, streak, lock, check, next, replay, profile. `menu` is
 * the documented fifteenth: the web marketing nav collapses on phones and
 * needs a disclosure control the app itself never has.
 *
 * Path data uses only absolute M/L/C/Z plus circle/line primitives so the
 * SwiftUI port (FeatherIcon.swift) can share it verbatim.
 */

export const FEATHER_PATHS = {
  // A woven bowl with the egg above the rim — home is the nest.
  nest: [
    { path: "M4,11 C4,17 7.6,20 12,20 C16.4,20 20,17 20,11" },
    { line: [4, 11, 20, 11] },
    { circle: [12, 6.5, 2.5] },
  ],
  soundOn: [
    { path: "M5,10 L9,10 L13,6 L13,18 L9,14 L5,14 Z" },
    { path: "M16.5,9 C18.5,10.5 18.5,13.5 16.5,15" },
  ],
  soundOff: [
    { path: "M5,10 L9,10 L13,6 L13,18 L9,14 L5,14 Z" },
    { line: [16.5, 9.5, 20.5, 14.5] },
    { line: [20.5, 9.5, 16.5, 14.5] },
  ],
  // Three sliders — settings a five-year-old can read as "little levers".
  settings: [
    { line: [4, 7, 7, 7] },
    { circle: [9, 7, 2] },
    { line: [11, 7, 20, 7] },
    { line: [4, 12, 13, 12] },
    { circle: [15, 12, 2] },
    { line: [17, 12, 20, 12] },
    { line: [4, 17, 5, 17] },
    { circle: [7, 17, 2] },
    { line: [9, 17, 20, 17] },
  ],
  back: [{ path: "M14,6 L8,12 L14,18" }],
  close: [
    { line: [7, 7, 17, 17] },
    { line: [17, 7, 7, 17] },
  ],
  print: [
    { path: "M8,9 L8,4 L16,4 L16,9" },
    { path: "M8,16 L6,16 C4.9,16 4,15.1 4,14 L4,11 C4,9.9 4.9,9 6,9 L18,9 C19.1,9 20,9.9 20,11 L20,14 C20,15.1 19.1,16 18,16 L16,16" },
    { path: "M8,13 L16,13 L16,20 L8,20 Z" },
  ],
  // The reward star is the Sun diamond (§08) — never a five-point gold star.
  star: [{ path: "M12,4 L19,12 L12,20 L5,12 Z" }],
  streak: [{ path: "M13,3 L6,14 L11,14 L10,21 L18,10 L13,10 Z" }],
  lock: [
    { path: "M8,10 L8,7 C8,4.8 9.8,3 12,3 C14.2,3 16,4.8 16,7 L16,10" },
    { path: "M7,10 L17,10 C18.1,10 19,10.9 19,12 L19,19 C19,20.1 18.1,21 17,21 L7,21 C5.9,21 5,20.1 5,19 L5,12 C5,10.9 5.9,10 7,10 Z" },
  ],
  check: [{ path: "M5,13 L10,18 L19,7" }],
  next: [{ path: "M10,6 L16,12 L10,18" }],
  replay: [
    { path: "M18,7.6 C16.7,5.7 14.5,4.5 12,4.5 C8.1,4.5 5,7.9 5,12 C5,16.1 8.1,19.5 12,19.5 C15.9,19.5 19,16.1 19,12" },
    { path: "M18.4,3.6 L18,7.6 L14,7.2" },
  ],
  profile: [
    { circle: [12, 8, 3.5] },
    { path: "M5,20 C5,16.2 8,14 12,14 C16,14 19,16.2 19,20" },
  ],
  // Fifteenth glyph, web only — the responsive marketing nav needs a
  // disclosure control; the app chrome itself never shows one.
  menu: [
    { line: [4, 7, 20, 7] },
    { line: [4, 12, 20, 12] },
    { line: [4, 17, 20, 17] },
  ],
};
