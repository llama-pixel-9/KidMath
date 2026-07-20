/* Shape geometry and properties. Data only — no components, so it can be
 * imported by both the renderer and the generators.
 *
 * Regular polygons are generated from exact trigonometry rather than typed by
 * hand. Hand-placed vertices had drifted: the octagon was a cut-corner square
 * with 4 lines of symmetry rather than 8, the "rhombus" was a square standing
 * on its point (4, not 2), and the "right triangle" was isosceles (1, not 0).
 * Each contradicted the symmetry count in SHAPE_META — which is the number a
 * child is marked against, so the drawing and the answer key disagreed.
 *
 * Regular shapes are therefore exact by construction and their symmetry equals
 * their side count. Irregular shapes are defined explicitly with the symmetry
 * their geometry actually has. shapeGeometry.spec.js re-derives every count
 * from the points and fails if the two ever disagree again.
 */

/** Vertices of a regular n-gon inscribed in the unit box. */
function regular(n, rotationDeg = 0, r = 0.45) {
  const rot = (rotationDeg * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    const a = rot - Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [
      Number((0.5 + r * Math.cos(a)).toFixed(4)),
      Number((0.5 + r * Math.sin(a)).toFixed(4)),
    ];
  });
}

export const SHAPES = {
  // --- regular: symmetry === sides, exact by construction ------------------
  triangleEquilateral: regular(3),
  square: regular(4, 45),
  pentagon: regular(5),
  hexagon: regular(6, 30),
  octagon: regular(8, 22.5),

  // --- irregular: symmetry is a property of these specific points ----------
  // Legs deliberately unequal, or this is isosceles and gains a line of symmetry.
  triangleRight: [[0.12, 0.2], [0.12, 0.9], [0.95, 0.9]],
  triangleScalene: [[0.2, 0.12], [0.95, 0.6], [0.05, 0.9]],
  rectangle: [[0.05, 0.25], [0.95, 0.25], [0.95, 0.75], [0.05, 0.75]],
  // Diagonals deliberately unequal (0.9 across, 0.6 down), or this is a square
  // standing on its point with 4 lines of symmetry rather than 2.
  rhombus: [[0.5, 0.2], [0.95, 0.5], [0.5, 0.8], [0.05, 0.5]],
  parallelogram: [[0.25, 0.2], [0.95, 0.2], [0.75, 0.8], [0.05, 0.8]],
  trapezoid: [[0.28, 0.2], [0.72, 0.2], [0.95, 0.8], [0.05, 0.8]],

  // A deliberate non-example: open figure, so it is not a polygon at all.
  openFigure: [[0.1, 0.9], [0.3, 0.15], [0.7, 0.15], [0.9, 0.9]],
};

export const SHAPE_META = {
  triangleEquilateral: { name: "triangle", sides: 3, symmetry: 3, regular: true },
  triangleRight: { name: "right triangle", sides: 3, symmetry: 0, regular: false },
  triangleScalene: { name: "scalene triangle", sides: 3, symmetry: 0, regular: false },
  square: { name: "square", sides: 4, symmetry: 4, regular: true },
  rectangle: { name: "rectangle", sides: 4, symmetry: 2, regular: false },
  rhombus: { name: "rhombus", sides: 4, symmetry: 2, regular: false },
  parallelogram: { name: "parallelogram", sides: 4, symmetry: 0, regular: false },
  trapezoid: { name: "trapezoid", sides: 4, symmetry: 1, regular: false },
  pentagon: { name: "pentagon", sides: 5, symmetry: 5, regular: true },
  hexagon: { name: "hexagon", sides: 6, symmetry: 6, regular: true },
  octagon: { name: "octagon", sides: 8, symmetry: 8, regular: true },
  openFigure: { name: "open figure", sides: 0, symmetry: 0, regular: false },
};

/**
 * Lines of symmetry implied by a polygon's actual points.
 *
 * Candidate axes for any polygon run from the centroid through each vertex and
 * through each edge midpoint; no other line can be an axis. An axis counts when
 * reflecting the vertex set across it maps that set onto itself.
 */
export function computeSymmetry(points, tolerance = 0.01) {
  const n = points.length;
  if (n < 3) return 0;
  const cx = points.reduce((s, p) => s + p[0], 0) / n;
  const cy = points.reduce((s, p) => s + p[1], 0) / n;

  const candidates = [];
  for (const [x, y] of points) candidates.push(Math.atan2(y - cy, x - cx));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    candidates.push(
      Math.atan2((points[i][1] + points[j][1]) / 2 - cy, (points[i][0] + points[j][0]) / 2 - cx)
    );
  }

  const axes = [];
  for (const raw of candidates) {
    // A line and its opposite direction are the same axis, so normalise mod pi.
    const angle = ((raw % Math.PI) + Math.PI) % Math.PI;
    if (axes.some((a) => Math.abs(a - angle) < 1e-3 || Math.abs(Math.abs(a - angle) - Math.PI) < 1e-3)) {
      continue;
    }
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const reflects = points.every(([x, y]) => {
      const px = x - cx;
      const py = y - cy;
      const d = px * dx + py * dy;
      const rx = cx + 2 * d * dx - px;
      const ry = cy + 2 * d * dy - py;
      return points.some((p) => Math.hypot(p[0] - rx, p[1] - ry) < tolerance);
    });
    if (reflects) axes.push(angle);
  }
  return axes.length;
}
