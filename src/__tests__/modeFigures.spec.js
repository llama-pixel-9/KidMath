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
import { DEFAULT_LIVE_VERSION } from "../itemBank/versionRules.js";
import { BLUEPRINT_ROWS } from "../blueprints/index.js";
import { runChecks } from "../itemBank/qc/checks.js";

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

// A hidden v2-only topic has no bundled rows until its first models are
// approved and exported (bankCellCoverage.spec's UNSHIPPED_V2_TOPICS), so its
// bank sweep has nothing to read yet. The skip ends by itself: once a row
// ships, or the topic goes live by default, the sweep runs like any mode's.
const unshippedV2 = (modeId) =>
  modeRegistry[modeId]?.v2Only === true &&
  DEFAULT_LIVE_VERSION[modeId] === "preview" &&
  !FULL_ITEMS.some((b) => b.modeId === modeId);

function generateAll(modeId) {
  const mode = modeRegistry[modeId];
  const top = mode.maxLevel ?? 10;
  const per = FIGURE_CONTRACTS[modeId]?.specGenerations ?? 40;
  const out = [];
  for (let level = 1; level <= top; level += 1) {
    // half words-on, half words-off — some varieties only serve one way
    for (let i = 0; i < per; i += 1) out.push(mode.generate(level, { allowWordProblems: i % 2 === 0 }));
  }
  // targetedOnly drills join the pool only under scheduled targeting — mirror
  // that serving path so coverage reaches them.
  for (const family of mode.families || []) {
    for (const subskill of mode.subskills || []) {
      for (let level = 1; level <= top; level += 3) {
        for (let i = 0; i < 6; i += 1) {
          out.push(mode.generate(level, { itemFamily: family, targetSubskill: subskill, allowWordProblems: i % 2 === 0 }));
        }
      }
    }
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
      if (unshippedV2(modeId)) return;
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
// Topics built from blueprint rows: every row declared by id, as its picture
// says. A model copies its row's structureType, and a picture row can share
// one with a words-only row, so the row id is the class (byRowThenStructure).
// ---------------------------------------------------------------------------

// The row's `picture` field, in the lists' own words, to its satisfiers. One
// disc mat may be the question's figure or the mat the kid answers through
// (the placeValueDiscs widget, read or build); two mats are only a figure.
const PICTURE_SATISFIERS = [
  [/^none\b/, ["none"]],
  [/\btwo place-value disc mats\b/, ["figure:discMat"]],
  [/disc mats?\b/, ["figure:discMat", "widget:placeValueDiscs"]],
  [/^four tape diagrams to choose from$/, ["any-figure"]],
  [/tape diagram|compare bars/, ["widget:barModel"]],
  [/number line/, ["widget:numberLine"]],
];
const satisfiersForPicture = (picture) => PICTURE_SATISFIERS.find(([rx]) => rx.test(picture))?.[1] ?? null;
const isVerbalPicture = (picture) => satisfiersForPicture(picture)?.[0] === "none";

const ROW_MODES = ["wordProblems", "multiDigit"];

describe("blueprint rows <-> contract lines", () => {
  for (const modeId of ROW_MODES) {
    const contract = FIGURE_CONTRACTS[modeId];
    const rows = BLUEPRINT_ROWS.filter((r) => r.mode_id === modeId && r.track === "item");

    it(`${modeId}: declares every row by id, with the visual its picture names`, () => {
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const want = satisfiersForPicture(row.picture);
        expect(want, `${row.id}: no satisfier for picture "${row.picture}"`).not.toBeNull();
        expect(contract.classes[row.id]?.satisfiedBy, row.id).toEqual(want);
      }
    });

    it(`${modeId}: declares every row's structureType, for an item with no row id`, () => {
      for (const row of rows) {
        expect(contract.classes[row.spec.structureType], `${row.id}: ${row.spec.structureType}`).toBeTruthy();
      }
    });

    it(`${modeId}: a row's id wins over its shared structureType`, () => {
      const pictureRows = rows.filter((r) => !isVerbalPicture(r.picture));
      expect(pictureRows.length).toBeGreaterThan(0);
      for (const row of pictureRows) {
        const bare = { display: { promptText: "words only" } };
        const meta = { blueprintId: row.id, structureType: row.spec.structureType };
        const v = contractVerdict(modeId, bare, meta);
        expect(v.cls, row.id).toBe(row.id);
        expect(v.ok, `${row.id} passed with no picture`).toBe(false);
        expect(v.reason).toBe("missing");
      }
      // A words-only row on the same structure stays verbal.
      const shared = rows.find(
        (r) => isVerbalPicture(r.picture) &&
          pictureRows.some((p) => p.spec.structureType === r.spec.structureType)
      );
      if (shared) {
        const v = contractVerdict(modeId, { display: { promptText: "words only" } }, { blueprintId: shared.id, structureType: shared.spec.structureType });
        expect(v.ok, shared.id).toBe(true);
      }
    });
  }

  it("a disc-mat picture row passes once it ships the mat", () => {
    const q = { display: { figure: "discMat", discMat: { cols: [{ place: "tens", count: 3 }, { place: "ones", count: 4 }] }, promptText: "x" } };
    expect(contractVerdict("wordProblems", q, { blueprintId: "wp-g2-picture-tens-ones", structureType: "addToResultUnknown" }).ok).toBe(true);
  });

  // The tappable mat (placeValueDiscs build mode): the start mat IS the
  // row's picture, drawn by the widget the kid answers through.
  const buildMat = (promptText) => ({
    answer: 52,
    answerType: "placeValueDiscs",
    display: { mode: "build", cols: [{ place: 10, count: 3 }, { place: 1, count: 4 }], promptText },
  });
  const SINGLE_MAT_ROWS = [
    ["wordProblems", "wp-g2-picture-tens-ones", "addToResultUnknown"],
    ["wordProblems", "wp-g2-two-step-picture", "twoStepTakeAdd"],
    ["multiDigit", "calc-g2-add-discs", "addWithDiscs"],
    ["multiDigit", "calc-g2-across-zero-discs", "subtractWithDiscs"],
    ["multiDigit", "calc-g2-ten-hundred-discs", "tenOrHundredOnMat"],
  ];

  it("a build-mode disc mat satisfies every single-mat row, by row id and by structure", () => {
    for (const [modeId, row, structureType] of SINGLE_MAT_ROWS) {
      const q = buildMat("Put 1 ten and 8 ones on the mat. What number does your mat show?");
      expect(contractVerdict(modeId, q, { blueprintId: row, structureType }).ok, row).toBe(true);
      expect(contractVerdict(modeId, q, { structureType }).ok, structureType).toBe(true);
    }
  });

  it("a build-mode mat is not two mats: the equal-mats row still needs its figure", () => {
    const v = contractVerdict("multiDigit", buildMat("x"), { blueprintId: "calc-g2-equal-mats", structureType: "sameValueTwoMats" });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("missing");
  });

  it("the QC gate passes a v2 build-mode item on a single-mat row (missingRequiredFigure)", () => {
    for (const [modeId, row, structureType] of SINGLE_MAT_ROWS) {
      const item = {
        itemId: `${modeId}-v2-build-001`,
        modeId,
        itemFamily: "application",
        subskill: "x",
        structureType,
        blueprintId: row,
        levelRange: [2, 4],
        reviewStatus: "draft",
        version: 2,
        question: buildMat("Put 1 ten and 8 ones on the mat. What number does your mat show?"),
      };
      const ids = runChecks(item).findings.map((f) => f.id);
      expect(ids, row).not.toContain("missingRequiredFigure");
      expect(ids, row).not.toContain("undeclaredFigureClass");
      // and the gate is live on that row: the same item typed on a bare pad fails
      const bare = { ...item, question: { ...item.question, answerType: "numberPad", display: { promptText: item.question.display.promptText } } };
      expect(runChecks(bare).findings.map((f) => f.id), row).toContain("missingRequiredFigure");
    }
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
