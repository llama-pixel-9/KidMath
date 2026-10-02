import { afterEach, describe, expect, it, vi } from "vitest";

// nativeEntry imports the consent notice as text (esbuild's .md loader);
// Vite cannot transform a bare .md import, and nothing here reads it.
vi.mock("../legal/parental-consent-notice.md", () => ({ default: "" }));

import "../engine/nativeEntry.js";
import multiDigit, { GRADE2_LEVELS, SUBSKILLS } from "../modes/multiDigit.js";
import { MODE_GROUPS, MODE_IDS, V2_ONLY_MODE_IDS, getModeConfig } from "../modes/index.js";
import { DEFAULT_LIVE_VERSION, isServable, topicVisible } from "../itemBank/versionRules.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";
import { PLAY_ONLY_SKILLS, TOPIC_LABELS, WORKSHEET_SKILLS } from "../skills/catalog.js";
import { levelForSkill, playSkills, skillsForPlay, topicGrades } from "../skills/play.js";
import { BLUEPRINT_ROWS } from "../blueprints/index.js";
import { CONCEPTS, MODE_TITLES } from "../hints/concepts.js";
import { hintContainsAnswer, validateHint } from "../hints/hintSchema.js";
import { subskillLabel } from "../analytics/subskillLabels.js";
import { gradeSpanFor } from "../engagement/gradeSpans.js";
import { REGIONS } from "../world/regions.js";
import { CALC_ROWS, HINT_EXAMPLE_PROMPTS, calcBankItems, evaluate, parsePrompt, subtractColumns, tradeCount } from "../multiDigit/calcItems.js";

/**
 * Multi-Digit Math (calc list decision 1, Sai approved 2026-10-02): a
 * v2-only topic with no bank rows yet, hidden from every kid until Sai flips
 * it at /admin/switch. Its generator is the empty-cell fallback: bare number
 * sentences only.
 */

const CALC = BLUEPRINT_ROWS.filter((r) => r.file === "g2AddsubCalc");
const rowsOf = (subskill) => CALC.filter((r) => r.spec.subskill === subskill);
const rowNumbers = (subskill) => rowsOf(subskill).map((r) => CALC.indexOf(r) + 1);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the Multi-Digit Math topic", () => {
  it("is registered as a v2-only topic with its six subskills and two families", () => {
    expect(MODE_IDS).toContain("multiDigit");
    const mode = getModeConfig("multiDigit");
    expect(mode.label).toBe("Multi-Digit Math");
    expect(TOPIC_LABELS.multiDigit).toBe("Multi-Digit Math");
    expect(mode.v2Only).toBe(true);
    expect(V2_ONLY_MODE_IDS).toContain("multiDigit");
    expect(mode.subskills).toEqual(["within100", "severalNumbers", "within1000", "tenOrHundred", "equalSign", "tenOrHundredTo1200"]);
    expect(mode.families).toEqual(["procedural", "conceptual"]);
    expect(gradeSpanFor("multiDigit")).toBe("2");
    expect(MODE_GROUPS.find((g) => g.id === "multiDigit")?.modeIds).toEqual(["multiDigit"]);
  });

  it("files every row of the approved list under one of its subskills, and every subskill has rows", () => {
    expect(CALC).toHaveLength(35);
    for (const row of CALC) {
      expect(row.mode_id, row.id).toBe("multiDigit");
      expect(SUBSKILLS, row.id).toContain(row.spec.subskill);
    }
    expect(rowNumbers("within100")).toEqual([1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 33]);
    expect(rowNumbers("severalNumbers")).toEqual([3, 4, 15, 19]);
    expect(rowNumbers("within1000")).toEqual([16, 17, 18, 20, 21, 22, 23, 24, 25]);
    expect(rowNumbers("tenOrHundred")).toEqual([26, 27]);
    expect(rowNumbers("equalSign")).toEqual([28, 29, 30, 31, 32, 34]);
    expect(rowNumbers("tenOrHundredTo1200")).toEqual([35]);
  });

  it("is hidden by default: preview with no switch row, so only preview viewers see it", () => {
    expect(DEFAULT_LIVE_VERSION.multiDigit).toBe("preview");
    for (const empty of [new Map(), null, undefined]) {
      expect(topicVisible("multiDigit", empty, { v2Only: true })).toBe(false);
      expect(topicVisible("multiDigit", empty, { v2Only: true, preview: true })).toBe(true);
    }
    expect(topicVisible("multiDigit", new Map([["multiDigit", "v2"]]), { v2Only: true })).toBe(true);
    const row = { modeId: "multiDigit", reviewStatus: "approved", version: 2 };
    expect(isServable(row, new Map())).toBe(false);
    expect(isServable(row, new Map(), { preview: true })).toBe(true);
    expect(globalThis.KidMath.hiddenTopics()).toContain("multiDigit");
  });

  it("has a practice spot on the island (the Pond signpost)", () => {
    expect(REGIONS.find((r) => r.id === "pond").signpost.groups).toContain("multiDigit");
  });

  it("has no bank rows in the bundle yet (the script rows load as v2 drafts)", () => {
    expect(FULL_ITEMS.some((item) => item.modeId === "multiDigit")).toBe(false);
  });
});

describe("the Grade 2 skills", () => {
  const skills = PLAY_ONLY_SKILLS.filter((s) => s.mode === "multiDigit");

  it("are six play-only Grade 2 skills, one per subskill, in plain parent words, row 35's last", () => {
    expect(skills.map((s) => [s.title, s.source.subskills, levelForSkill(s)])).toEqual([
      ["Add and subtract within 100", ["within100"], 4],
      ["Add and subtract three or four numbers", ["severalNumbers"], 5],
      ["Add and subtract within 1,000", ["within1000"], 5],
      ["10 or 100 more or less", ["tenOrHundred"], 5],
      ["What the equal sign means", ["equalSign"], 6],
      ["10 or 100 more or less, to 1,200", ["tenOrHundredTo1200"], 6],
    ]);
    for (const s of skills) {
      expect(s.grade).toBe("2");
      expect(s.source.kind).toBe("bank");
      expect(s.source.levels).toEqual(GRADE2_LEVELS);
      expect(s.stories, s.id).toBeNull();
    }
    expect(WORKSHEET_SKILLS.some((s) => s.mode === "multiDigit")).toBe(false);
    expect(topicGrades("multiDigit")).toEqual(["2"]);
    expect(skillsForPlay("2", "multiDigit").map((s) => s.title)).toEqual(skills.map((s) => s.title));
    const playable = new Set(playSkills().map((s) => s.id));
    for (const s of skills) expect(playable.has(s.id), s.id).toBe(true);
  });

  it("each cite every code its rows cite and serve its rows' families", () => {
    for (const s of skills) {
      const rows = rowsOf(s.source.subskills[0]);
      for (const framework of ["ccss", "tx", "fl", "va", "ga"]) {
        const cited = new Set(rows.flatMap((r) => r.standards[framework] || []));
        expect(new Set(s.standards[framework]), `${s.id} ${framework}`).toEqual(cited);
      }
      expect(s.ccss, s.id).toEqual(s.standards.ccss);
      expect(new Set(s.source.families), s.id).toEqual(new Set(rows.map((r) => r.spec.family)));
    }
  });

  it("put row 35 in its own skill with only Texas 2.7B and no Common Core code (decision 11)", () => {
    const last = skills.at(-1);
    expect(last.id).toBe("md-g2-ten-hundred-1200");
    expect(last.ccss).toEqual([]);
    expect(last.standards).toEqual({ ccss: [], tx: ["2.7B"], fl: [], va: [], ga: [] });
  });

  it("keep the three-digit trading and across-zero rows in Grade 2, at the hard tier (decision 4)", () => {
    const hard = CALC.filter((r) => r.difficulty === "hard").map((r) => CALC.indexOf(r) + 1);
    expect(hard).toEqual(expect.arrayContaining([18, 19, 21, 22, 24, 25]));
    for (const n of [18, 21, 22, 24, 25]) expect(CALC[n - 1].spec.subskill).toBe("within1000");
    expect(CALC[18].spec.subskill).toBe("severalNumbers");
    for (const n of [18, 19, 21, 22, 24, 25]) expect(CALC[n - 1].grade).toBe("2");
  });
});

describe("kid and parent words", () => {
  const JARGON = /\b(regroup\w*|addends?|minuends?|subtrahends?|equations?)\b/i;

  it("has a hint entry per subskill in kid words, whose worked examples no question uses", () => {
    expect(MODE_TITLES.multiDigit).toBeTruthy();
    const examples = new Set();
    for (const sub of SUBSKILLS) {
      const e = CONCEPTS.multiDigit[sub];
      expect(e, sub).toBeTruthy();
      expect(JARGON.test([e.title, e.idea, ...e.example.steps].join(" ")), sub).toBe(false);
      examples.add(e.example.problem);
    }
    expect(examples).toEqual(HINT_EXAMPLE_PROMPTS);
    for (const item of calcBankItems()) expect(HINT_EXAMPLE_PROMPTS.has(item.question.display.promptText), item.itemId).toBe(false);
  });

  it("names every subskill in parent words", () => {
    for (const sub of SUBSKILLS) {
      const label = subskillLabel(sub);
      expect(label, sub).toBeTruthy();
      expect(label, sub).not.toMatch(/[A-Z]/);
    }
  });
});

describe("the fallback generator", () => {
  const draws = (subskill, level, n = 60) =>
    Array.from({ length: n }, () => multiDigit.generate(level, { targetSubskill: subskill }));

  it("builds one bare number sentence, typed on the number pad, for every subskill at every level", () => {
    for (const sub of SUBSKILLS) {
      for (let level = 1; level <= 10; level += 1) {
        for (const q of draws(sub, level, 8)) {
          expect(q.display.promptText, sub).not.toMatch(/[a-z]/i);
          expect(q.display.promptText.split("?").length - 1).toBe(1);
          expect(q.answerType).toBe("numberPad");
          expect(Number.isInteger(q.answer) && q.answer >= 2, q.display.promptText).toBe(true);
          expect(q.metadata.subskill).toBe(sub);
          expect(q.metadata.modeId).toBe("multiDigit");
          expect(q.metadata.itemFamily).toBe(sub === "equalSign" ? "conceptual" : "procedural");
          expect(validateHint(q.hint).ok, q.display.promptText).toBe(true);
          expect(hintContainsAnswer(q.hint, q.answer), q.display.promptText).toBe(false);
          expect(HINT_EXAMPLE_PROMPTS.has(q.display.promptText)).toBe(false);
        }
      }
    }
  });

  it("draws the computing subskills from the script rows, keeping each row's rules and id", () => {
    const scriptRows = new Set(CALC_ROWS.map((r) => r.rowId));
    for (const sub of ["within100", "severalNumbers", "within1000"]) {
      for (const level of [4, 5, 6]) {
        for (const q of draws(sub, level, 30)) {
          const p = parsePrompt(q.display.promptText);
          expect(evaluate(p.terms, p.ops), q.display.promptText).toBe(q.answer);
          expect(scriptRows.has(q.metadata.blueprintId), q.metadata.blueprintId).toBe(true);
          expect(CALC_ROWS.find((r) => r.rowId === q.metadata.blueprintId).subskill).toBe(sub);
        }
      }
    }
  });

  it("reads the level as the tier: no trade at 4 within 1,000, two trades or one across a zero at 6", () => {
    for (const q of draws("within1000", 4)) {
      const p = parsePrompt(q.display.promptText);
      expect(tradeCount(p.terms, p.ops), q.display.promptText).toBe(0);
    }
    for (const q of draws("within1000", 6)) {
      const p = parsePrompt(q.display.promptText);
      const acrossZero = p.ops[0] === "−" && subtractColumns(p.terms[0], p.terms[1]).acrossZero;
      expect(tradeCount(p.terms, p.ops) === 2 || acrossZero, q.display.promptText).toBe(true);
    }
  });

  it("writes 10 or 100 more or less from 100-900, and to 1,200 past 1,000", () => {
    for (const q of draws("tenOrHundred", 5)) {
      expect([10, 100]).toContain(q.b);
      expect(q.a >= 100 && q.a <= 900, q.display.promptText).toBe(true);
      expect(q.answer >= 100 && q.answer <= 999, q.display.promptText).toBe(true);
    }
    for (const q of draws("tenOrHundredTo1200", 5)) {
      expect([10, 100]).toContain(q.b);
      expect(Math.max(q.a, q.answer) >= 1000 && Math.max(q.a, q.answer) <= 1200, q.display.promptText).toBe(true);
    }
  });

  it("writes the equal sign as a balance whose two sides match", () => {
    for (const q of draws("equalSign", 6)) {
      const m = /^(\d+) \+ (\d+) = \? \+ (\d+)$/.exec(q.display.promptText);
      expect(m, q.display.promptText).toBeTruthy();
      expect(q.answer + Number(m[3])).toBe(Number(m[1]) + Number(m[2]));
    }
  });

  it("asked for a family, serves a subskill of that family", () => {
    for (let i = 0; i < 40; i += 1) {
      expect(multiDigit.generate(5, { itemFamily: "conceptual" }).metadata.subskill).toBe("equalSign");
      expect(multiDigit.generate(5, { itemFamily: "procedural" }).metadata.subskill).not.toBe("equalSign");
    }
  });

  it("plays on the iPhone engine: it generates, and accepts its own answer", () => {
    const K = globalThis.KidMath;
    for (const level of [4, 5, 6]) {
      const q = K.generateQuestion("multiDigit", level);
      expect(K.checkAnswer(q, q.answer)).toBe(true);
    }
  });
});
