import { describe, it, expect } from "vitest";
import { MODE_GROUPS, MODE_IDS, getModeConfig } from "../modes";

describe("MODE_GROUPS (home page navigation)", () => {
  const grouped = MODE_GROUPS.flatMap((g) => g.modeIds);

  it("covers every registered mode exactly once", () => {
    expect([...grouped].sort()).toEqual([...MODE_IDS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("references only real modes", () => {
    for (const id of grouped) {
      expect(() => getModeConfig(id)).not.toThrow();
    }
  });

  it("every group has a title, grade hint, and at least one mode", () => {
    for (const g of MODE_GROUPS) {
      expect(g.id).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.gradeHint).toBeTruthy();
      expect(g.modeIds.length).toBeGreaterThan(0);
    }
  });

  it("group ids are unique", () => {
    const ids = MODE_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
