import { afterEach, describe, expect, it, vi } from "vitest";
import wordProblems, { BLANK, GRADE2_LEVELS, HINT_EXAMPLE, SHAPES, SUBSKILLS, buildMissingNumberQuestion, partsForLevel } from "../modes/wordProblems.js";
import { MODE_IDS, V2_ONLY_MODE_IDS, getModeConfig, visibleModeGroups } from "../modes/index.js";
import { generateChoices, generateQuestion, createAdaptiveSession } from "../mathEngine.js";
import { DEFAULT_LIVE_VERSION, isServable, topicVisible } from "../itemBank/versionRules.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";
import { getBankItems, setBankItems } from "../itemBank/index.js";
import { FREE_MODE_IDS, isFreeMode } from "../premium.js";
import { PLAY_ONLY_SKILLS, TOPIC_LABELS, WORKSHEET_SKILLS } from "../skills/catalog.js";
import { playSkills, skillsForPlay, topicGrades } from "../skills/play.js";
import { nextSkillQuestion } from "../skills/session.js";
import { CONCEPTS, MODE_TITLES } from "../hints/concepts.js";
import { hintFor } from "../hints/index.js";
import { hintContainsAnswer, validateHint } from "../hints/hintSchema.js";
import { subskillLabel } from "../analytics/subskillLabels.js";
import { gradeSpanFor } from "../engagement/gradeSpans.js";
import { speakableText } from "../speakable.js";
import { REGIONS } from "../world/regions.js";

/**
 * Word Problems (Sai, 2026-10-02): a v2-only topic with no bank rows yet,
 * hidden from every kid until Sai flips it at /admin/switch. Its generator is
 * the empty-cell fallback and never writes a story.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** The sentence with its blank filled: [left, sign, right, result]. */
function solved(q) {
  const m = q.display.promptText.match(/^(\d+|\?) ([+−]) (\d+|\?) = (\d+)$/);
  if (!m) return null;
  const fill = (t) => (t === BLANK ? q.answer : Number(t));
  return [fill(m[1]), m[2], fill(m[3]), Number(m[4])];
}

const carries = (x, y) => (x % 10) + (y % 10) >= 10;

describe("the Word Problems topic", () => {
  it("is registered as a v2-only topic with its five subskills and two families", () => {
    expect(MODE_IDS).toContain("wordProblems");
    const mode = getModeConfig("wordProblems");
    expect(mode.label).toBe("Word Problems");
    expect(TOPIC_LABELS.wordProblems).toBe("Word Problems");
    expect(mode.v2Only).toBe(true);
    expect(V2_ONLY_MODE_IDS).toContain("wordProblems");
    expect(mode.subskills).toEqual(["changeStories", "partWholeStories", "compareStories", "twoStepStories", "missingNumber"]);
    expect(mode.families).toEqual(["application", "conceptual"]);
    expect(mode.generatedFamilies).toEqual(["conceptual"]);
    expect(gradeSpanFor("wordProblems")).toBe("2");
  });

  it("is hidden by default: preview with no switch row, so only preview viewers see it", () => {
    expect(DEFAULT_LIVE_VERSION.wordProblems).toBe("preview");
    for (const empty of [new Map(), null, undefined]) {
      expect(topicVisible("wordProblems", empty, { v2Only: true })).toBe(false);
      expect(topicVisible("wordProblems", empty, { v2Only: true, preview: true })).toBe(true);
    }
    expect(topicVisible("wordProblems", new Map([["wordProblems", "v2"]]), { v2Only: true })).toBe(true);
    const row = { modeId: "wordProblems", reviewStatus: "approved", version: 2 };
    expect(isServable(row, new Map())).toBe(false);
    expect(isServable(row, new Map(), { preview: true })).toBe(true);
    // The pickers' view with no switch row: the Word Problems group is gone.
    const hidden = new Set(V2_ONLY_MODE_IDS.filter((id) => !topicVisible(id, new Map(), { v2Only: true })));
    expect(visibleModeGroups(hidden).some((g) => g.modeIds.includes("wordProblems"))).toBe(false);
  });

  it("has a practice spot on the island (the Pond signpost), so a flip shows it there too", () => {
    const pond = REGIONS.find((r) => r.id === "pond");
    expect(pond.signpost.groups).toContain("stories");
  });

  it("is not free (a pricing change waits on Sai)", () => {
    expect(FREE_MODE_IDS).not.toContain("wordProblems");
    expect(isFreeMode("wordProblems")).toBe(false);
  });

  it("has no bank rows yet", () => {
    expect(FULL_ITEMS.some((item) => item.modeId === "wordProblems")).toBe(false);
  });
});

describe("the fallback generator", () => {
  const sample = [];
  for (let level = 1; level <= 10; level += 1) {
    for (let i = 0; i < 60; i += 1) sample.push(wordProblems.generate(level));
  }

  it("builds one bare number sentence with one blank, the app's ?, never a story", () => {
    expect(BLANK).toBe("?");
    for (const q of sample) {
      const text = q.display.promptText;
      expect(text, text).toMatch(/^(\d+|\?) [+−] (\d+|\?) = \d+$/);
      expect(text.split(BLANK).length - 1, text).toBe(1);
      expect(/[a-z]/i.test(text), text).toBe(false);
      expect(q.display.subPrompt, text).toBeUndefined();
    }
  });

  it("writes the signs the app draws (opSigns): − for take away, never a hyphen", () => {
    expect(sample.some((q) => q.display.promptText.includes("−"))).toBe(true);
    for (const q of sample) expect(q.display.promptText.includes("-"), q.display.promptText).toBe(false);
  });

  it("keeps the sentence true, every number within 100, and every part at least 2", () => {
    for (const q of sample) {
      const [x, sign, y, z] = solved(q);
      if (sign === "+") expect(x + y, q.display.promptText).toBe(z);
      else expect(x - y, q.display.promptText).toBe(z);
      for (const n of [x, y, z]) {
        expect(n, q.display.promptText).toBeGreaterThanOrEqual(2);
        expect(n, q.display.promptText).toBeLessThan(100);
      }
    }
  });

  it("sizes the numbers by level inside Grade 2's band: no regrouping at 4 and below, regrouping at 6 and above", () => {
    expect(GRADE2_LEVELS).toEqual([4, 6]);
    for (const q of sample) {
      const [x, sign, y, z] = solved(q);
      const [p1, p2] = sign === "+" ? [x, y] : [y, z];
      const whole = sign === "+" ? z : x;
      if (q.level <= 4) {
        expect(carries(p1, p2), q.display.promptText).toBe(false);
        expect(whole, q.display.promptText).toBeLessThanOrEqual(60);
      }
      if (q.level >= 6) expect(carries(p1, p2), q.display.promptText).toBe(true);
    }
  });

  it("puts the blank in all four places", () => {
    const seen = new Set(sample.map((q) => q.metadata.structureType));
    expect([...seen].sort()).toEqual([...SHAPES].sort());
  });

  it("is always missingNumber / conceptual with full metadata, whatever it is asked for", () => {
    const asked = [
      ...sample,
      wordProblems.generate(5, { itemFamily: "application", targetSubskill: "compareStories", allowWordProblems: true }),
      generateQuestion("wordProblems", 5, { itemFamily: "application", targetSubskill: "changeStories" }),
    ];
    for (const q of asked) {
      const m = q.metadata;
      expect(m.modeId).toBe("wordProblems");
      expect(m.subskill).toBe("missingNumber");
      expect(m.itemFamily).toBe("conceptual");
      expect(m.domain).toBe("NBT");
      expect(m.cluster).toBeTruthy();
      // Grade 2's numbers at any level asked, so Grade 2's label.
      expect(m.gradeBand, `L${q.level}`).toBe("2-3");
      expect(m.mathPractices.length).toBeGreaterThan(0);
      expect(m.misconceptionTags.length).toBeGreaterThan(0);
      expect(m.standardRefs).toEqual(["2.NBT.B.5"]);
      expect(m.blueprintId).toBe(`wordProblems-conceptual-${m.structureType}`);
      expect(SHAPES).toContain(m.structureType);
    }
  });

  it("is the same under the same seed", () => {
    const run = (seed) => {
      vi.spyOn(Math, "random").mockImplementation(mulberry32(seed));
      const out = [1, 4, 5, 6, 10].map((level) => JSON.stringify(generateQuestion("wordProblems", level)));
      vi.restoreAllMocks();
      return out;
    };
    expect(run(2026)).toEqual(run(2026));
    expect(run(2026)).not.toEqual(run(7));
  });

  it("offers four options, each wrong one from a named misconception or a near miss", () => {
    // The engine reaches the mode's own builder through the stamped mode.
    const served = (q) => ({ ...q, mode: "wordProblems" });
    for (const q of sample.slice(0, 120).map(served)) {
      const choices = generateChoices(q.answer, 4, q);
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(q.answer);
      for (const c of choices) expect(c).toBeGreaterThanOrEqual(0);
    }
    // 46 + ? = 72: adding the two numbers shown (118) and a slipped ten.
    const q = served(buildMissingNumberQuestion(6, "box-add-change"));
    const choices = generateChoices(q.answer, 4, q);
    expect(choices).toContain(q.distractorContext.a + q.distractorContext.b);
    expect(choices.some((c) => Math.abs(c - q.answer) === 10)).toBe(true);
    // ? − 27 = 38: taking the smaller from the bigger.
    const s = served(buildMissingNumberQuestion(5, "box-sub-start"));
    expect(generateChoices(s.answer, 4, s)).toContain(Math.abs(s.distractorContext.a - s.distractorContext.b));
  });

  it("carries a hint that never states the missing number", () => {
    for (const q of sample) {
      expect(validateHint(q.hint).ok).toBe(true);
      expect(hintContainsAnswer(q.hint, q.answer), `${q.display.promptText}: ${q.hint.nudge} ${q.hint.steps.join(" ")}`).toBe(false);
      const h = hintFor(q);
      expect(h.steps).toEqual(q.hint.steps);
      expect(h.example.problem).toBeTruthy();
    }
  });

  it("never uses the hint example's numbers, so the worked example never shows the kid's answer", () => {
    const ex = CONCEPTS.wordProblems.missingNumber.example;
    expect(ex.problem).toBe(`${HINT_EXAMPLE.part} + ${BLANK} = ${HINT_EXAMPLE.whole}`);
    expect(ex.answer).toBe(String(HINT_EXAMPLE.missing));
    // Script level 5's draws (whole in 30-99, then a part in 2..whole-2):
    // first the example's whole with the given part, then 37 = 19 + 18.
    const partsAfter = (firstPart) => {
      const draws = [(HINT_EXAMPLE.whole - 30 + 0.5) / 70, (firstPart - 2 + 0.5) / 58, 0.1, 0.5];
      vi.spyOn(Math, "random").mockImplementation(() => draws.shift() ?? 0.5);
      const parts = partsForLevel(5);
      vi.restoreAllMocks();
      return parts;
    };
    // The script lands on the example's whole when the part is another one...
    expect(partsAfter(34)).toEqual({ p1: 34, p2: HINT_EXAMPLE.whole - 34, whole: HINT_EXAMPLE.whole });
    // ...and the example's own parts, in either order, are drawn again.
    for (const part of [HINT_EXAMPLE.part, HINT_EXAMPLE.missing]) {
      expect(partsAfter(part), `part ${part}`).toEqual({ p1: 19, p2: 18, whole: 37 });
    }
  });

  it("is read aloud with the blank as \"what\"", () => {
    expect(speakableText(`46 + ${BLANK} = 72`)).toBe("46 plus what equals 72");
    expect(speakableText(`${BLANK} − 27 = 38`)).toBe("what minus 27 equals 38");
  });
});

describe("kid and parent words", () => {
  const BANNED = /\b(addends?|minuends?|subtrahends?|equations?)\b/i;
  const PRONOUNS = /\b(he|she|they|him|her|them|his|hers|their)\b/i;

  it("has a hint entry per subskill, in kid words, with a story's people named, never he, she or they", () => {
    expect(MODE_TITLES.wordProblems).toBeTruthy();
    for (const sub of SUBSKILLS) {
      const e = CONCEPTS.wordProblems[sub];
      expect(e, sub).toBeTruthy();
      const text = [e.title, e.idea, e.example.problem, ...e.example.steps].join(" ");
      expect(BANNED.test(text), `${sub}: ${text}`).toBe(false);
      // The example is the story; its people are named every time.
      const story = [e.example.problem, ...e.example.steps, e.example.answer].join(" ");
      expect(PRONOUNS.test(story), `${sub}: ${story}`).toBe(false);
    }
    const generated = Array.from({ length: 200 }, (_, i) => wordProblems.generate(4 + (i % 3)).hint);
    for (const h of generated) {
      const text = [h.nudge, ...h.steps].join(" ");
      expect(BANNED.test(text), text).toBe(false);
    }
  });

  it("keeps skill titles in kid words: the topic sheet shows them to the kid and reads them aloud", () => {
    for (const s of PLAY_ONLY_SKILLS.filter((skill) => skill.mode === "wordProblems")) {
      expect(BANNED.test(s.title), s.title).toBe(false);
    }
  });

  it("names every subskill in parent words", () => {
    for (const sub of SUBSKILLS) {
      const label = subskillLabel(sub);
      expect(label, sub).toBeTruthy();
      expect(label, sub).not.toMatch(/[A-Z]/);
    }
  });
});

describe("the Grade 2 skills", () => {
  const skills = PLAY_ONLY_SKILLS.filter((s) => s.mode === "wordProblems");
  const STORY = { ccss: ["2.OA.A.1"], tx: ["2.4C", "2.7C"], fl: ["MA.2.AR.1.1"], va: ["2.CE.1c"], ga: ["2.NR.2.3"] };
  const BOX = { ccss: ["2.NBT.B.5"], tx: ["2.4B"], fl: ["MA.2.AR.2.2"], va: ["2.CE.1b"], ga: ["2.NR.2.4"] };

  it("are five play-only Grade 2 skills, one per subskill, in plain parent words", () => {
    expect(skills.map((s) => [s.title, s.source.subskills])).toEqual([
      ["Add and take away stories", ["changeStories"]],
      ["Part and whole stories", ["partWholeStories"]],
      ["Compare stories", ["compareStories"]],
      ["Find the missing number", ["missingNumber"]],
      ["Two-step stories", ["twoStepStories"]],
    ]);
    for (const s of skills) {
      expect(s.grade).toBe("2");
      expect(s.source.kind).toBe("bank");
      expect(s.source.levels).toEqual(GRADE2_LEVELS);
    }
    expect(WORKSHEET_SKILLS.some((s) => s.mode === "wordProblems")).toBe(false);
    expect(topicGrades("wordProblems")).toEqual(["2"]);
    expect(skillsForPlay("2", "wordProblems").map((s) => s.title)).toEqual(skills.map((s) => s.title));
    const playable = new Set(playSkills().map((s) => s.id));
    for (const s of skills) expect(playable.has(s.id), s.id).toBe(true);
  });

  it("story skills serve their own stories and reasoning rows; the missing-number skill serves bare number sentences only", () => {
    for (const s of skills) {
      const sub = s.source.subskills[0];
      expect(s.source.families).toEqual(["conceptual"]);
      if (sub === "missingNumber") expect(s.stories).toBeNull();
      else expect(s.stories).toEqual({ levels: GRADE2_LEVELS, subskills: [sub] });
    }
  });

  it("cite Sai's codes, long form, in every loaded framework", () => {
    for (const s of skills) {
      const want = s.source.subskills[0] === "missingNumber" ? BOX : STORY;
      expect(s.standards, s.id).toEqual(want);
      expect(s.ccss, s.id).toEqual(want.ccss);
    }
  });

  it("each draws only its own subskill's rows, in its own families", () => {
    const before = getBankItems();
    const rows = [];
    let n = 0;
    for (const sub of SUBSKILLS) {
      for (const family of ["application", "conceptual", "procedural"]) {
        for (let k = 0; k < 3; k += 1) {
          n += 1;
          rows.push({
            itemId: `wp-test-${sub}-${family}-${k}`,
            modeId: "wordProblems",
            itemFamily: family,
            subskill: sub,
            structureType: `test-${sub}`,
            levelRange: [4, 6],
            reviewStatus: "approved",
            version: 2,
            question: { a: 20 + n, b: 10, op: "+", answer: 30 + n, display: { promptText: `${20 + n} + 10 = ? (${sub} ${family} ${k})` } },
          });
        }
      }
    }
    try {
      setBankItems(rows, "test");
      for (const skill of skills) {
        const sub = skill.source.subskills[0];
        for (const allowWordProblems of [true, false]) {
          const session = createAdaptiveSession("wordProblems", 10, { skillId: skill.id, allowWordProblems, savedProgress: { level: 4 } });
          const families = new Set();
          for (let cursor = 0; cursor < 8; cursor += 1) {
            const q = nextSkillQuestion({ ...session, familyCursor: cursor });
            const row = rows.find((r) => r.itemId === q.metadata.itemId);
            expect(row, `${skill.id}: served a row`).toBeTruthy();
            expect(row.subskill, skill.id).toBe(sub);
            families.add(row.itemFamily);
          }
          const want =
            sub === "missingNumber" || !allowWordProblems ? ["conceptual"] : ["application", "conceptual"];
          expect([...families].sort(), `${skill.id} words=${allowWordProblems}`).toEqual(want);
        }
      }
    } finally {
      setBankItems(before, "test");
    }
  });
});
