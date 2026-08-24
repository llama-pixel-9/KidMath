import { describe, it, expect } from "vitest";
import {
  FIGURE_CONTRACTS,
  IOS_MIRRORED_FIGURES,
  IOS_PLAYABLE_CONTRACT_MODES,
  contractVerdict,
  figureSatisfies,
} from "../itemBank/figureContracts.js";
import { modeRegistry } from "../modes/index.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";
import { FIGURES, getFigure } from "../components/figureRegistry.js";
import { WIDGETS } from "../components/widgetRegistry.js";

/**
 * The generalized "show the visual, don't describe it" gate — the one question
 * no other check asks: should this item have rendered MORE than it did?
 *
 * History: dataGraphs shipped with data transcribed into prompts (fixed
 * 2026-07-22, guarded by the old graphFigures.spec — dataGraphs only); time
 * shipped 121 clock items describing hands in words (fixed PR #78). Same
 * disease, two one-off fixes. This spec reads FIGURE_CONTRACTS so the next
 * mode is one declaration, not a new spec file.
 */

const contractedModes = Object.keys(FIGURE_CONTRACTS);

function generateAll(modeId) {
  const mode = modeRegistry[modeId];
  const top = mode.maxLevel ?? 10;
  const out = [];
  for (let level = 1; level <= top; level += 1) {
    for (let i = 0; i < 40; i += 1) out.push(mode.generate(level));
  }
  return out;
}

for (const modeId of contractedModes) {
  const contract = FIGURE_CONTRACTS[modeId];
  const generated = generateAll(modeId);

  describe(`${modeId}: generator honors its figure contract`, () => {
    it("every generated item satisfies its class", () => {
      for (const q of generated) {
        const v = contractVerdict(modeId, q, q.metadata);
        expect(
          v.reason,
          `${q.metadata.structureType}: ${v.reason === "undeclared" ? "no contract line — declare it (figure or none) in figureContracts.js" : `must show ${v.satisfiedBy?.join(" or ")} — "${q.display?.promptText}"`}`
        ).toBeUndefined();
      }
    });

    it("every named figure is one the registry can draw", () => {
      for (const q of generated) {
        const key = q.display?.figure;
        if (key) expect(FIGURES, `unknown figure "${key}" from ${q.metadata.structureType}`).toHaveProperty(key);
      }
    });

    it("declares every variety, so none is silently exempt", () => {
      const varieties = modeRegistry[modeId].varieties || [];
      for (const id of varieties) {
        const declared = Boolean(contract.all || contract.classes?.[id]);
        expect(declared, `${modeId} variety "${id}" has no line in figureContracts.js`).toBe(true);
      }
      // and generation actually reaches every variety, mirroring the old
      // dataGraphs coverage clause
      const seen = new Set(generated.map((q) => q.metadata.structureType));
      for (const id of varieties) expect(seen.has(id), `${id} never generated`).toBe(true);
    });
  });

  describe(`${modeId}: the shipped bank honors the contract`, () => {
    it("every bank row of a covered class carries its required visual", () => {
      const rows = FULL_ITEMS.filter((b) => b.modeId === modeId);
      expect(rows.length).toBeGreaterThan(0);
      const bad = [];
      for (const b of rows) {
        const v = contractVerdict(modeId, b.question, b);
        if (!v.ok) bad.push(`${b.itemId} [${v.cls}] ${v.reason} :: "${b.question.display?.promptText?.slice(0, 80)}"`);
      }
      expect(bad, `figure contract violations:\n${bad.slice(0, 12).join("\n")}${bad.length > 12 ? `\n…and ${bad.length - 12} more` : ""}`).toEqual([]);
    });
  });
}

describe("contract <-> registry parity", () => {
  it("every satisfier names a real figure or widget", () => {
    for (const [modeId, c] of Object.entries(FIGURE_CONTRACTS)) {
      const entries = c.all ? [c.all] : Object.values(c.classes);
      for (const { satisfiedBy } of entries) {
        for (const s of satisfiedBy) {
          if (s.startsWith("figure:")) expect(FIGURES, `${modeId}: ${s}`).toHaveProperty(s.slice(7));
          if (s.startsWith("widget:")) expect(WIDGETS, `${modeId}: ${s}`).toHaveProperty(s.slice(7));
        }
      }
    }
  });

  it("iOS-playable contracted modes require only Swift-mirrored figures", () => {
    for (const modeId of IOS_PLAYABLE_CONTRACT_MODES) {
      const c = FIGURE_CONTRACTS[modeId];
      const entries = c.all ? [c.all] : Object.values(c.classes);
      for (const { satisfiedBy } of entries) {
        for (const s of satisfiedBy) {
          if (s.startsWith("figure:")) {
            expect(IOS_MIRRORED_FIGURES, `${modeId} requires unmirrored ${s}`).toContain(s.slice(7));
          }
        }
      }
    }
    for (const key of IOS_MIRRORED_FIGURES) {
      if (key !== "barGraph") expect(FIGURES).toHaveProperty(key);
    }
  });

  it("figureSatisfies understands each satisfier form", () => {
    expect(figureSatisfies({ display: { figure: "clockFace" } }, ["figure:clockFace"])).toBe(true);
    expect(figureSatisfies({ answerType: "clock", display: {} }, ["widget:clock"])).toBe(true);
    expect(figureSatisfies({ display: { type: "clock" } }, ["widget:clock"])).toBe(true);
    expect(figureSatisfies({ display: { figure: "barGraph" } }, ["any-figure"])).toBe(true);
    expect(figureSatisfies({ display: { promptText: "words only" } }, ["figure:clockFace"])).toBe(false);
    expect(figureSatisfies({ display: {} }, ["none"])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dataGraphs extras carried over from graphFigures.spec.js (absorbed here)
// ---------------------------------------------------------------------------

const GRAPH_ALL = generateAll("dataGraphs");

describe("dataGraphs: payloads and prompts (absorbed from graphFigures.spec)", () => {
  it("ships a payload the figure component can actually render", () => {
    const shapes = {
      barGraph: (d) => d.bars?.length > 0 && d.bars.every((b) => b.label && Number.isFinite(b.value)),
      pictograph: (d) =>
        Number.isFinite(d.keyValue) &&
        d.rows?.length > 0 &&
        d.rows.every((r) => r.label && Number.isInteger(r.symbols) && r.symbols >= 0),
      tallyChart: (d) =>
        d.rows?.length > 0 && d.rows.every((r) => r.label && Number.isInteger(r.count) && r.count > 0),
      linePlot: (d) =>
        d.points?.length > 0 &&
        d.points.every((p) => Number.isFinite(p.value) && Number.isInteger(p.count) && p.count >= 0),
    };
    for (const q of GRAPH_ALL) {
      const ok = shapes[q.display.figure](q.display);
      expect(ok, `${q.metadata.structureType}: bad ${q.display.figure} payload`).toBe(true);
    }
  });

  it("never transcribes the figure's data into the prompt", () => {
    const LEAKS = [
      [/●|◐/, "pictograph symbols in the prompt"],
      [/IIII/, "tally marks in the prompt"],
      [/stands for/, "the key spelled out in the prompt"],
      [/X{2,}/, "line-plot marks in the prompt"],
      [/\b\w+ \d+, \w+ \d+/, "a label/value list in the prompt"],
    ];
    for (const q of GRAPH_ALL) {
      const text = q.display.promptText;
      for (const [pattern, why] of LEAKS) {
        expect(pattern.test(text), `${q.metadata.structureType}: ${why} — "${text}"`).toBe(false);
      }
    }
  });
});

describe("getFigure", () => {
  it("stays quiet when the answer widget draws the figure itself", () => {
    const q = GRAPH_ALL.find((x) => x.answerType === "barGraph");
    expect(q, "no barGraph-answered item generated").toBeTruthy();
    expect(getFigure(q)).toBeNull();
  });

  it("returns a component for figures the answer widget does not draw", () => {
    const q = GRAPH_ALL.find((x) => x.answerType !== "barGraph");
    expect(getFigure(q)?.Component).toBeTruthy();
  });

  it("returns null for a question with no figure at all", () => {
    expect(getFigure({ display: {} })).toBeNull();
    expect(getFigure({})).toBeNull();
    expect(getFigure(null)).toBeNull();
  });
});
