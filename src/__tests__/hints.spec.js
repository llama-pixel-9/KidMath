import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { modeRegistry, MODE_IDS } from "../modes/index.js";
import { CONCEPTS } from "../hints/concepts.js";
import { hintFor } from "../hints/index.js";
import { PICTURE_KINDS, hintContainsAnswer, usableHintFields, validateHint } from "../hints/hintSchema.js";
import HintPane from "../components/HintPane.jsx";
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

// A live v1-shaped question and the per-item hint a v2 row would carry for
// it. The worked example uses other numbers on purpose.
const liveQ = { mode: "addition", a: 8, b: 5, op: "+", answer: 13, metadata: { modeId: "addition", subskill: "makeTen" } };
const withHint = (hint) => ({ ...liveQ, hint });
const ownHint = {
  nudge: "The question asks how many stickers Ada has in all. Start with the bigger pile.",
  steps: ["Start at 8.", "8 needs 2 to make 10. Take 2 from the 5.", "Add what is left to 10."],
  picture: { kind: "tenFrame", filled: 8, extra: 5 },
  example: { problem: "7 + 4", steps: ["7 needs 3 to make 10.", "4 − 3 = 1.", "10 + 1 = 11."], answer: "11" },
  feedback: { 3: "3 is how many more 8 is than 5. The question asks how many in all." },
  solution: { steps: ["8 + 2 = 10.", "10 + 3 = 13."], answer: "13" },
};

describe("hintFor with a per-item hint", () => {
  const base = hintFor(liveQ);

  it("a full per-item hint wins field by field, title and mode title unchanged", () => {
    const h = hintFor(withHint(ownHint));
    expect(h.idea).toBe(ownHint.nudge);
    expect(h.steps).toEqual(ownHint.steps);
    expect(h.example).toEqual(ownHint.example);
    expect(h.visual).toEqual({ kind: "tenFrame", filled: 8, extra: 5 });
    expect(h.title).toBe(base.title);
    expect(h.modeTitle).toBe("Adding");
  });

  it("a partial hint falls back per field", () => {
    const nudgeOnly = hintFor(withHint({ nudge: ownHint.nudge }));
    expect(nudgeOnly.idea).toBe(ownHint.nudge);
    expect(nudgeOnly.steps).toEqual(base.steps);
    expect(nudgeOnly.example).toEqual(base.example);
    expect(nudgeOnly.visual).toEqual(base.visual);
    expect(base.visual).toMatchObject({ kind: "dots" });

    const exampleOnly = hintFor(withHint({ steps: [], example: ownHint.example, picture: null }));
    expect(exampleOnly.idea).toBe(base.idea);
    expect(exampleOnly.steps).toEqual(base.steps);
    expect(exampleOnly.example).toEqual(ownHint.example);
    expect(exampleOnly.visual).toEqual(base.visual);
  });

  it("a malformed hint falls back entirely and never throws", () => {
    const junk = [
      "just some words",
      ["a", "list", "of", "steps"],
      42,
      { nudge: 42, steps: "count on", picture: "coinTray", example: { problem: 1 }, feedback: "no", solution: [] },
      { nudge: "", steps: [""], picture: { kind: "graph" }, example: { problem: "1 + 1", steps: "add", answer: 2 } },
      { picture: { fields: "but no kind" } },
    ];
    for (const hint of junk) expect(hintFor(withHint(hint)), JSON.stringify(hint)).toEqual(base);
    expect(hintFor(withHint(null))).toEqual(base);
  });
});

describe("validateHint and usableHintFields", () => {
  it("accepts a full hint, an empty one, and explicit nulls", () => {
    expect(validateHint(ownHint)).toEqual({ ok: true, errors: [] });
    expect(validateHint({})).toEqual({ ok: true, errors: [] });
    expect(validateHint({ nudge: "Look at the tens.", picture: null, example: null, feedback: null, solution: null })).toEqual({ ok: true, errors: [] });
  });

  it("names every malformed field and rejects non-objects", () => {
    expect(validateHint("nope").ok).toBe(false);
    expect(validateHint(null).ok).toBe(false);
    expect(validateHint(["a"]).ok).toBe(false);
    const { ok, errors } = validateHint({ nudge: "Fine.", steps: [], picture: { kind: "graph" }, example: { problem: "1 + 1" } });
    expect(ok).toBe(false);
    expect(errors).toHaveLength(3);
    expect(errors.join(" ")).toMatch(/steps/);
    expect(errors.join(" ")).toMatch(/picture\.kind/);
    expect(errors.join(" ")).toMatch(/example/);
  });

  it("holds a drawable picture to the fields it is drawn from, and other kinds to their kind", () => {
    expect(validateHint({ picture: { kind: "dots" } }).ok).toBe(false);
    expect(validateHint({ picture: { kind: "dots", groups: [3, 4] } }).ok).toBe(true);
    expect(validateHint({ picture: { kind: "array", rows: 2 } }).ok).toBe(false);
    expect(validateHint({ picture: { kind: "numberLine", min: 0, max: 20, mark: 8 } }).ok).toBe(true);
    expect(validateHint({ picture: { kind: "numberLine", min: 0, max: 15, mark: 5, step: 5 } }).ok).toBe(true);
    expect(validateHint({ picture: { kind: "numberLine", min: 0, max: 15, mark: 5, step: 0 } }).ok).toBe(false);
    expect(validateHint({ picture: { kind: "coinTray", coins: ["quarter", "dime"] } }).ok).toBe(true);
  });

  it("keeps only the well-formed fields", () => {
    expect(usableHintFields({ nudge: "Fine.", steps: [], picture: { kind: "clock", hour: 3 }, feedback: 7 })).toEqual({
      nudge: "Fine.",
      picture: { kind: "clock", hour: 3 },
    });
    expect(usableHintFields("nope")).toEqual({});
    expect(usableHintFields(undefined)).toEqual({});
  });
});

describe("hintContainsAnswer", () => {
  it("catches the answer in a nudge, a step or a feedback line, whatever its dress", () => {
    expect(hintContainsAnswer({ nudge: "The change is 91 cents." }, 91)).toBe(true);
    expect(hintContainsAnswer({ steps: ["Count up to $0.91."] }, 91)).toBe(true);
    expect(hintContainsAnswer({ steps: ["Start at 9.", "Now you have 91¢."] }, 91)).toBe(true);
    expect(hintContainsAnswer({ feedback: { "$3.09": "You added. The change is 91 cents." } }, 91)).toBe(true);
    expect(hintContainsAnswer({ nudge: "There are 1,200 stickers in all." }, 1200)).toBe(true);
    expect(hintContainsAnswer({ nudge: "She pays $12." }, 1200)).toBe(true);
    expect(hintContainsAnswer({ nudge: "She has 91 cents." }, "$0.91")).toBe(true);
    expect(hintContainsAnswer({ nudge: "Shade 3/4 of the strip." }, { num: 3, den: 4 })).toBe(true);
    expect(hintContainsAnswer({ nudge: "Start at 3." }, [2, 3])).toBe(true);
    expect(hintContainsAnswer({ nudge: "Is 5 > 3?" }, ">")).toBe(true);
  });

  it("does not flag a number inside another number, or working that stops short", () => {
    expect(hintContainsAnswer({ nudge: "Start at 19." }, 9)).toBe(false);
    expect(hintContainsAnswer({ steps: ["Halfway is 9.5."] }, 9)).toBe(false);
    expect(hintContainsAnswer({ steps: ["Now add: 10 + 3."] }, 13)).toBe(false);
    expect(hintContainsAnswer({ nudge: "Shade 3 of the 4 parts." }, { num: 3, den: 4 })).toBe(false);
    expect(hintContainsAnswer({ nudge: "Count the triangles." }, "triangle")).toBe(false);
  });

  it("ignores the worked example and the solution, and never throws on junk", () => {
    expect(hintContainsAnswer({ example: ownHint.example, solution: ownHint.solution }, 13)).toBe(false);
    expect(hintContainsAnswer(ownHint, 13)).toBe(false);
    expect(hintContainsAnswer("13", 13)).toBe(false);
    expect(hintContainsAnswer(null, 13)).toBe(false);
    expect(hintContainsAnswer({ nudge: "13" }, null)).toBe(false);
    expect(hintContainsAnswer({ nudge: "13" }, "")).toBe(false);
  });
});

describe("HintPane", () => {
  const html = (q) => renderToStaticMarkup(createElement(HintPane, { question: q }));

  it("shows the per-item nudge and draws a picture kind Scaffold knows", () => {
    expect(html(liveQ)).toContain('data-scaffold="dots"');
    expect(html(liveQ)).toContain("Picture it");
    const own = html(withHint({ ...ownHint, picture: { kind: "array", rows: 2, cols: 4 } }));
    expect(own).toContain(ownHint.nudge);
    expect(own).toContain('data-scaffold="array"');
  });

  it("labels a number line by the hint's step, else by ones or fives from its width", () => {
    const labels = (picture) =>
      [...html(withHint({ ...ownHint, picture })).matchAll(/<text[^>]*>(\d+)<\/text>/g)].map((m) => Number(m[1]));
    expect(labels({ kind: "numberLine", min: 0, max: 15, mark: 5 })).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(labels({ kind: "numberLine", min: 0, max: 15, mark: 5, step: 5 })).toEqual([0, 5, 10, 15]);
    expect(labels({ kind: "numberLine", min: 0, max: 25, mark: 5 })).toEqual([0, 5, 10, 15, 20, 25]);
    expect(labels({ kind: "numberLine", min: 10, max: 100, mark: 10, step: 10 })).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it("omits the picture section for a kind it cannot draw instead of describing it", () => {
    const tenFrame = html(withHint(ownHint));
    expect(tenFrame).not.toContain("Picture it");
    expect(tenFrame).not.toContain("data-scaffold");
    expect(tenFrame).not.toContain("Look again");
    // Every kind a hint may name, even with no fields, is either drawn or
    // left out — never worded, never a crash.
    for (const kind of PICTURE_KINDS) {
      const out = html(withHint({ picture: { kind } }));
      expect(out, kind).not.toContain("Look again");
      if (out.includes("Picture it")) expect(out, kind).toMatch(/data-scaffold="/);
    }
  });
});
