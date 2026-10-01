import { describe, it, expect } from "vitest";
import { MODE_GROUPS, MODE_IDS, V2_ONLY_MODE_IDS, getModeConfig, visibleModeGroups } from "../modes";

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

  it("hides a v2-only topic, and a group it leaves empty, until its switch serves it", () => {
    expect(V2_ONLY_MODE_IDS).toEqual(["mathFacts"]);
    const hiddenIds = visibleModeGroups().flatMap((g) => g.modeIds);
    expect(hiddenIds).not.toContain("mathFacts");
    expect(visibleModeGroups().some((g) => g.id === "facts")).toBe(false);
    expect(hiddenIds).toHaveLength(MODE_IDS.length - 1);
    const shown = visibleModeGroups(new Set());
    expect(shown.find((g) => g.id === "facts")?.modeIds).toEqual(["mathFacts"]);
  });
});
