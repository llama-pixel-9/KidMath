import { describe, it, expect } from "vitest";
import { SHAPES, SHAPE_META, computeSymmetry } from "../components/kit/shapeData.js";

/**
 * The drawing and the answer key must agree.
 *
 * SHAPE_META.symmetry is the number a child is marked against, and the figure
 * on screen is what they count. When those disagree, a correct answer is marked
 * wrong — the worst failure this app can have, and invisible to any test that
 * only checks the generator against its own metadata.
 *
 * Three shapes had drifted: the octagon was a cut-corner square (4 axes, not
 * 8), the "rhombus" was a square on its point (4, not 2), and the "right
 * triangle" was isosceles (1, not 0).
 */

describe("drawn geometry matches the claimed properties", () => {
  it("gives every shape the number of sides it claims", () => {
    for (const [key, meta] of Object.entries(SHAPE_META)) {
      if (key === "openFigure") continue; // not a polygon; sides recorded as 0
      expect(SHAPES[key].length, `${key} draws a different number of sides`).toBe(meta.sides);
    }
  });

  it("gives every shape the lines of symmetry it claims", () => {
    for (const [key, meta] of Object.entries(SHAPE_META)) {
      if (key === "openFigure") continue;
      expect(
        computeSymmetry(SHAPES[key]),
        `${key} is drawn with a different number of lines of symmetry than SHAPE_META claims`
      ).toBe(meta.symmetry);
    }
  });

  it("makes regular polygons genuinely regular", () => {
    for (const [key, meta] of Object.entries(SHAPE_META)) {
      if (!meta.regular) continue;
      const pts = SHAPES[key];
      const sides = pts.map(([x, y], i) => {
        const [nx, ny] = pts[(i + 1) % pts.length];
        return Math.hypot(nx - x, ny - y);
      });
      const min = Math.min(...sides);
      const max = Math.max(...sides);
      expect(max - min, `${key} has unequal sides`).toBeLessThan(0.005);
      // A regular n-gon has exactly n axes of symmetry.
      expect(computeSymmetry(pts), `${key}`).toBe(pts.length);
    }
  });

  it("keeps the irregular shapes genuinely irregular", () => {
    // These exist precisely so children meet non-prototypical examples. If one
    // drifts into its regular cousin the pedagogical point is lost.
    expect(SHAPE_META.rhombus.symmetry).toBeLessThan(SHAPE_META.square.symmetry);
    expect(SHAPE_META.triangleRight.symmetry).toBe(0);
    expect(SHAPE_META.parallelogram.symmetry).toBe(0);
    for (const key of ["rhombus", "triangleRight", "triangleScalene", "parallelogram"]) {
      expect(SHAPE_META[key].regular).toBe(false);
    }
  });

  it("keeps every point inside the unit box", () => {
    for (const [key, pts] of Object.entries(SHAPES)) {
      for (const [x, y] of pts) {
        expect(x, `${key} x out of range`).toBeGreaterThanOrEqual(0);
        expect(x, `${key} x out of range`).toBeLessThanOrEqual(1);
        expect(y, `${key} y out of range`).toBeGreaterThanOrEqual(0);
        expect(y, `${key} y out of range`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("offers several triangles so the property is learned, not the picture", () => {
    const triangles = Object.entries(SHAPE_META).filter(([, m]) => m.sides === 3);
    expect(triangles.length).toBeGreaterThanOrEqual(3);
    expect(triangles.some(([, m]) => m.symmetry === 0)).toBe(true);
    expect(triangles.some(([, m]) => m.symmetry === 3)).toBe(true);
  });

  it("computes symmetry correctly on known figures", () => {
    // Guard the checker itself, so a bug there cannot mask a bug in the data.
    expect(computeSymmetry([[0, 0], [1, 0], [1, 1], [0, 1]])).toBe(4); // square
    expect(computeSymmetry([[0, 0], [2, 0], [2, 1], [0, 1]])).toBe(2); // rectangle
    expect(computeSymmetry([[0, 0], [1, 0], [0, 1]])).toBe(1); // isosceles right
    expect(computeSymmetry([[0, 0], [3, 0], [0, 1]])).toBe(0); // scalene right
  });
});
