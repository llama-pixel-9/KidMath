import { describe, it, expect } from "vitest";
import { buildCellPrompt, parseCandidates } from "../../scripts/itemGen/prompt.js";

const exemplars = [
  {
    exemplarId: "multiplication-equalGroups-procedural-2_3-001",
    modeId: "multiplication",
    subskill: "equalGroups",
    itemFamily: "procedural",
    levelBand: "2-3",
    structureType: "equalGroupsTotalUnknown",
    payload: { a: 3, b: 4, op: "×", answer: 12, display: { representation: "symbolic", promptText: "3 × 4 = ?" } },
  },
];

describe("buildCellPrompt", () => {
  it("includes the cell context, exemplar shape, and an exact count", () => {
    const p = buildCellPrompt({ exemplars, n: 5 });
    expect(p).toContain("mode: multiplication");
    expect(p).toContain("subskill: equalGroups");
    expect(p).toContain("item family: procedural");
    expect(p).toContain("structureType: equalGroupsTotalUnknown");
    expect(p).toContain("EXACTLY 5");
    expect(p).toContain('"promptText": "3 × 4 = ?"');
  });
});

describe("parseCandidates", () => {
  it("extracts a JSON array and maps to the candidate contract", () => {
    const text = `Here are the items:\n[
      {"a":5,"b":6,"op":"×","answer":30,"display":{"representation":"symbolic","promptText":"5 × 6 = ?"}},
      {"a":7,"b":8,"op":"×","answer":56,"display":{"representation":"symbolic","promptText":"7 × 8 = ?"}}
    ]\nHope that helps!`;
    const out = parseCandidates(text, { exemplars, n: 6, model: "claude-sonnet-5" });
    expect(out).toHaveLength(2);
    expect(out[0].payload.answer).toBe(30);
    expect(out[0].structureType).toBe("equalGroupsTotalUnknown");
    expect(out[0].exemplarId).toBe("multiplication-equalGroups-procedural-2_3-001");
    expect(out[0].notes).toBe("claude-sonnet-5 draft");
  });

  it("handles code-fenced output and slices to n", () => {
    const text = "```json\n[{\"a\":1,\"b\":1,\"op\":\"×\",\"answer\":1},{\"a\":2,\"b\":2,\"op\":\"×\",\"answer\":4}]\n```";
    const out = parseCandidates(text, { exemplars, n: 1, model: "m" });
    expect(out).toHaveLength(1);
    expect(out[0].payload.answer).toBe(1);
  });

  it("throws when no JSON array is present", () => {
    expect(() => parseCandidates("no array here", { exemplars, n: 3 })).toThrow(/No JSON array/);
  });
});
