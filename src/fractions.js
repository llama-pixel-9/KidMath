// Fraction utilities for the fraction/decimal answer formats (Grade 3-4).
// Dependency-free leaf so both the engine and UI can import it.
//
// A fraction is represented as { num, den } with integer num/den, den != 0.

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

// Normalize any accepted fraction representation into { num, den }:
//   - { num, den } object
//   - "3/4" string (optional surrounding whitespace)
//   - a whole number (n -> n/1)
// Returns null if it can't be parsed into a valid fraction.
export function toFraction(value) {
  if (value == null) return null;
  if (typeof value === "object") {
    const num = Number(value.num);
    const den = Number(value.den);
    if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return null;
    return { num, den };
  }
  if (typeof value === "number") {
    if (!Number.isInteger(value)) return null;
    return { num: value, den: 1 };
  }
  if (typeof value === "string") {
    const s = value.trim();
    const m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (m) {
      const den = Number(m[2]);
      if (den === 0) return null;
      return { num: Number(m[1]), den };
    }
    if (/^-?\d+$/.test(s)) return { num: Number(s), den: 1 };
    return null;
  }
  return null;
}

// Reduce to lowest terms with a positive denominator.
export function reduceFraction(fr) {
  const f = toFraction(fr);
  if (!f) return null;
  if (f.num === 0) return { num: 0, den: 1 };
  const sign = f.den < 0 ? -1 : 1;
  const g = gcd(f.num, f.den);
  return { num: (sign * f.num) / g, den: (sign * f.den) / g };
}

// Value equivalence via cross-multiplication (3/4 === 6/8). Accepts any form
// toFraction understands on either side.
export function fractionsEqual(a, b) {
  const fa = toFraction(a);
  const fb = toFraction(b);
  if (!fa || !fb) return false;
  return fa.num * fb.den === fb.num * fa.den;
}
