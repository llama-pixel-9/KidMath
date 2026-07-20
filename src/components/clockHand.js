// Analog-clock reader. Draws the clock at the given time; the child types the
// minutes past the hour. Numeric answer through submitAnswer.
export function clockHand(cx, cy, len, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x2: cx + len * Math.cos(rad), y2: cy + len * Math.sin(rad) };
}
