/**
 * Area & perimeter figure: the rectangle (or composite) the prose describes,
 * with its dimensions labelled. Before this the mode never drew a shape — a
 * geometry mode answered from text alone (Sai, 2026-08-23).
 *
 * `areaFigureSpec(q)` normalises every payload the mode produces into one
 * spec; `AreaFigure` draws the spec. Sources, in priority order:
 *   1. bank `display.ap` ({kind, w, h | a,b,c,d | W,H,w,h | p,w | T,a,b ...})
 *   2. generator `display.width/height` (+ metadata.structureType to know
 *      when `height` IS the answer and must be drawn as "?")
 *   3. "N by M" pairs parsed from the prompt (authored judgments, compare
 *      items) — one pair = a rectangle, two = cut / join / side-by-side
 *      depending on the wording.
 *
 * Perimeter items get a heavy boundary and no fill; area items a tinted
 * interior, gridded into unit squares when the wording counts squares and
 * the grid is small enough to count. Aspect is clamped so a 15×1 strip still
 * reads as a rectangle, and the figure says so ("not to scale").
 */

const PAIR_RE = /(\d+)\s*-?\s*(?:cm|m|ft|in|km|mm|units?|unit squares?)?\s*(?:-\s*)?by\s*(?:-\s*)?(\d+)/gi;
// "5 rows of 3 stickers" / "3 rows with 2 squares in each row" -> 3 wide, 5 tall.
const ROWS_RE = /(\d+)\s+rows?\s+(?:of|with)\s+(\d+)/i;
const UNIT_RE = /\b(\d+)\s*(cm|mm|km|m|ft|in|inches|feet|units?)\b/i;
const PERIM_RE = /perimeter|around|border|fenc|lap\b|ribbon|tape|trip|edge|frame|distance/i;
const GRID_RE = /unit squares?|squares? in each row|rows? (?:of|with)|stickers|tiles|chocolate|grid/i;
const CUT_RE = /cut|notch|remov|trim|corner/i;
const JOIN_RE = /join|together|altogether|total|both|two (?:rooms|beds|pieces|rectangles|rugs|parts)|split/i;

function parsePairs(text) {
  const pairs = [];
  for (const m of (text || "").matchAll(PAIR_RE)) pairs.push([Number(m[1]), Number(m[2])]);
  return pairs.filter(([a, b]) => a > 0 && b > 0 && a < 1000 && b < 1000);
}

function unitOf(text) {
  const m = (text || "").match(UNIT_RE);
  if (!m) return "";
  const u = m[2].toLowerCase();
  if (u === "inches") return "in";
  if (u === "feet") return "ft";
  if (u === "unit" || u === "units") return "";
  return u;
}

export function areaFigureSpec(q) {
  const d = q?.display || {};
  const text = d.promptText || "";
  const ap = d.ap || null;
  const unit = unitOf(text);
  const perim = ap ? /perim/i.test(ap.kind) : PERIM_RE.test(text) && !/area/i.test(text.split("?")[0].slice(-40));
  const grid = !perim && GRID_RE.test(text);
  const base = { unit, perim, grid, note: null };

  if (ap) {
    switch (ap.kind) {
      case "areaOf":
      case "perimOf":
      case "areaSaid":
      case "perimSaid":
        return { ...base, perim: /perim/.test(ap.kind), shape: "rect", w: ap.w, h: ap.h };
      case "missSidePerim":
        return { ...base, perim: true, shape: "rect", w: ap.w, h: null };
      case "joinAreas":
      case "joinSaid":
        return { ...base, shape: "join", a: ap.a, b: ap.b, c: ap.c, d: ap.d };
      case "cutArea":
        return { ...base, shape: "cut", W: ap.W, H: ap.H, w: ap.w, h: ap.h };
      case "missingPart":
        return { ...base, shape: "split", a: ap.a, b: ap.b, T: ap.T };
      case "samePerimSaid":
        return { ...base, shape: "pair", rects: [[ap.w, ap.h], [ap.s, ap.s]] };
      default:
        break; // authored / trapNo: fall through to the prompt parser
    }
  }

  if (Number.isFinite(d.width) && Number.isFinite(d.height)) {
    const st = String(q.metadata?.structureType || "");
    const unknownH = /missingSide/i.test(st);
    return { ...base, shape: "rect", w: d.width, h: unknownH ? null : d.height };
  }

  const pairs = parsePairs(text);
  if (pairs.length === 0) {
    const r = text.match(ROWS_RE);
    if (r) return { ...base, shape: "rect", w: Number(r[2]), h: Number(r[1]), grid: true };
  }
  if (pairs.length === 1) return { ...base, shape: "rect", w: pairs[0][0], h: pairs[0][1] };
  if (pairs.length === 2) {
    const [[a, b], [c, e]] = pairs;
    if (CUT_RE.test(text) && c <= a && e <= b) return { ...base, shape: "cut", W: a, H: b, w: c, h: e };
    if (JOIN_RE.test(text) && !/which|more|longer|larger|bigger|compare/i.test(text)) {
      return { ...base, shape: "join", a, b, c, d: e };
    }
    return { ...base, shape: "pair", rects: [[a, b], [c, e]] };
  }
  return null;
}
