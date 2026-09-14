import { describe, it, expect } from "vitest";
import { modeRegistry, MODE_IDS } from "../modes/index.js";
import { CONCEPTS } from "../hints/concepts.js";
import { hintFor } from "../hints/index.js";
import { getBankItems } from "../itemBank.js";

describe("hint content", () => {
  it("has an entry for every declared mode × subskill", () => {
    const missing = [];
    for (const id of MODE_IDS) {
      for (const sub of modeRegistry[id].subskills || []) {
        if (!CONCEPTS[id]?.[sub]) missing.push(`${id}.${sub}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every entry is complete and kid-sized", () => {
    for (const [mode, entries] of Object.entries(CONCEPTS)) {
      for (const [sub, e] of Object.entries(entries)) {
        const where = `${mode}.${sub}`;
        expect(e.title, where).toBeTruthy();
        expect(e.idea.length, where).toBeGreaterThan(40);
        expect(e.idea.length, where).toBeLessThan(320);
        expect(e.example.problem, where).toBeTruthy();
        expect(e.example.steps.length, where).toBeGreaterThanOrEqual(2);
        expect(String(e.example.answer), where).toBeTruthy();
      }
    }
  });
});

describe("hintFor", () => {
  it("never throws and always yields steps for generated questions across every mode and level", () => {
    for (const id of MODE_IDS) {
      const m = modeRegistry[id];
      for (let level = 1; level <= 12; level++) {
        for (let i = 0; i < 8; i++) {
          let q;
          try {
            q = m.generate(level, {});
          } catch {
            continue;
          }
          const h = hintFor(q);
          expect(h.idea, `${id} L${level}`).toBeTruthy();
          expect(h.steps.length, `${id} L${level}`).toBeGreaterThanOrEqual(2);
          expect(h.example.problem, `${id} L${level}`).toBeTruthy();
        }
      }
    }
  });

  it("works for every shipped bank item", () => {
    const items = getBankItems();
    expect(items.length).toBeGreaterThan(1000);
    for (const it of items) {
      const q = { ...it.question, mode: it.modeId, metadata: { modeId: it.modeId, subskill: it.subskill, itemFamily: it.itemFamily } };
      const h = hintFor(q);
      expect(h.steps.length, it.itemId).toBeGreaterThanOrEqual(2);
    }
  });

  it("the live-question steps do not hand over the answer", () => {
    // Steps may show working ("10 + 3") but never "= <answer>" for the live item.
    const q = { mode: "addition", a: 8, b: 5, op: "+", answer: 13, metadata: { modeId: "addition", subskill: "makeTen" } };
    const h = hintFor(q);
    expect(h.steps.join(" ")).not.toMatch(/=\s*13\b/);
    expect(h.visual).toMatchObject({ kind: "dots" });
  });
});
