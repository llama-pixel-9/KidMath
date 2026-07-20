/* Shape geometry and properties. Data only — no components, so it can be
 * imported by both the renderer and the generators. */

/* Shape data and the pure figure renderer. Kept out of ShapeFigure.jsx so
 * that file exports only its component (react-refresh). */

export const SHAPES = {
  triangleEquilateral: [[0.5, 0.05], [0.95, 0.85], [0.05, 0.85]],
  triangleRight: [[0.1, 0.1], [0.1, 0.9], [0.9, 0.9]],
  triangleScalene: [[0.2, 0.12], [0.95, 0.6], [0.05, 0.9]],
  square: [[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85]],
  rectangle: [[0.05, 0.25], [0.95, 0.25], [0.95, 0.75], [0.05, 0.75]],
  rhombus: [[0.5, 0.08], [0.92, 0.5], [0.5, 0.92], [0.08, 0.5]],
  parallelogram: [[0.25, 0.2], [0.95, 0.2], [0.75, 0.8], [0.05, 0.8]],
  trapezoid: [[0.28, 0.2], [0.72, 0.2], [0.95, 0.8], [0.05, 0.8]],
  pentagon: [[0.5, 0.05], [0.95, 0.38], [0.78, 0.9], [0.22, 0.9], [0.05, 0.38]],
  hexagon: [[0.5, 0.04], [0.9, 0.27], [0.9, 0.73], [0.5, 0.96], [0.1, 0.73], [0.1, 0.27]],
  octagon: [[0.35, 0.05], [0.65, 0.05], [0.95, 0.35], [0.95, 0.65], [0.65, 0.95], [0.35, 0.95], [0.05, 0.65], [0.05, 0.35]],
  // A deliberate non-example: open figure, so it is not a polygon at all.
  openFigure: [[0.1, 0.9], [0.3, 0.15], [0.7, 0.15], [0.9, 0.9]],
};

export const SHAPE_META = {
  triangleEquilateral: { name: "triangle", sides: 3, symmetry: 3 },
  triangleRight: { name: "right triangle", sides: 3, symmetry: 0 },
  triangleScalene: { name: "scalene triangle", sides: 3, symmetry: 0 },
  square: { name: "square", sides: 4, symmetry: 4 },
  rectangle: { name: "rectangle", sides: 4, symmetry: 2 },
  rhombus: { name: "rhombus", sides: 4, symmetry: 2 },
  parallelogram: { name: "parallelogram", sides: 4, symmetry: 0 },
  trapezoid: { name: "trapezoid", sides: 4, symmetry: 1 },
  pentagon: { name: "pentagon", sides: 5, symmetry: 5 },
  hexagon: { name: "hexagon", sides: 6, symmetry: 6 },
  octagon: { name: "octagon", sides: 8, symmetry: 8 },
  openFigure: { name: "open figure", sides: 0, symmetry: 0 },
};
