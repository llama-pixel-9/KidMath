import { afterEach, describe, expect, it, vi } from "vitest";

// nativeEntry imports the consent notice as text (esbuild's .md loader);
// Vite cannot transform a bare .md import, and nothing here reads it.
vi.mock("../legal/parental-consent-notice.md", () => ({ default: "" }));

import "../engine/nativeEntry.js";
import wordProblems, { BLANK, GRADE2_LEVELS, HINT_EXAMPLE, SHAPES, SUBSKILLS, buildMissingNumberQuestion, partsForLevel } from "../modes/wordProblems.js";
import { MODE_IDS, V2_ONLY_MODE_IDS, getModeConfig, visibleModeGroups } from "../modes/index.js";
import { generateChoices, generateQuestion, createAdaptiveSession, getNextQuestion, isSessionComplete, recordAnswer } from "../mathEngine.js";
import { DEFAULT_LIVE_VERSION, isServable, topicVisible } from "../itemBank/versionRules.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";
import { getBankItems, setBankItems } from "../itemBank/index.js";
import { FREE_MODE_IDS, isFreeMode } from "../premium.js";
import { PLAY_ONLY_SKILLS, TOPIC_LABELS, WORKSHEET_SKILLS } from "../skills/catalog.js";
import { levelForSkill, playSkills, skillsForPlay, storiesAlwaysOn, topicGrades } from "../skills/play.js";
import { BLUEPRINT_ROWS } from "../blueprints/index.js";
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

// Three rows per subskill and family. Stories are worded; a story kind's
// reasoning rows mix a bare prompt with worded ones, so a session that
// still steered toward bare prompts with the setting off would show; the
// missing-number rows are bare number sentences, as the real ones are.
function testRows() {
  const rows = [];
  let n = 0;
  for (const sub of SUBSKILLS) {
    for (const family of ["application", "conceptual", "procedural"]) {
      for (let k = 0; k < 3; k += 1) {
        n += 1;
        const a = 20 + n;
        const bare = sub === "missingNumber" || (family === "conceptual" && k === 0);
        const promptText = bare
          ? `${a} + 10 = ?`
          : family === "application"
            ? `Ana has ${a} shells. Ben gives Ana 10 more. How many shells does Ana have now? (${sub} ${k})`
            : `Which number sentence fits? ${a} + 10 = ? (${sub} ${family} ${k})`;
        rows.push({
          itemId: `wp-test-${sub}-${family}-${k}`,
          modeId: "wordProblems",
          itemFamily: family,
          subskill: sub,
          structureType: `test-${sub}`,
          levelRange: [4, 6],
          reviewStatus: "approved",
          version: 2,
          question: { a, b: 10, op: "+", answer: a + 10, display: { promptText } },
        });
      }
    }
  }
  return rows;
}

/** A whole session as the session loop runs it, every answer right: the row ids served. */
function servedIds(start, next = getNextQuestion, record = recordAnswer, done = isSessionComplete) {
  let session = start;
  const ids = [];
  for (let guard = 0; !done(session) && guard < 50; guard += 1) {
    const { question, isRetry } = next(session);
    ids.push(question.metadata.itemId ?? null);
    session = record(session, question, question.answer, 3000, isRetry).session;
  }
  return ids;
}

const withSeed = (seed, run) => {
  vi.spyOn(Math, "random").mockImplementation(mulberry32(seed));
  try {
    return run();
  } finally {
    vi.restoreAllMocks();
  }
};

describe("the Word Problems topic", () => {
  it("is registered as a v2-only topic with its six subskills and two families", () => {
    expect(MODE_IDS).toContain("wordProblems");
    const mode = getModeConfig("wordProblems");
    expect(mode.label).toBe("Word Problems");
    expect(TOPIC_LABELS.wordProblems).toBe("Word Problems");
    expect(mode.v2Only).toBe(true);
    expect(V2_ONLY_MODE_IDS).toContain("wordProblems");
    expect(mode.subskills).toEqual(["changeStories", "partWholeStories", "compareStories", "twoStepStories", "missingNumber", "biggerNumberStories"]);
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

  it("is free on both platforms (Sai approved the list's recommendation, 2026-10-02)", () => {
    expect(FREE_MODE_IDS).toContain("wordProblems");
    expect(isFreeMode("wordProblems")).toBe(true);
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
  // Rows 36-42 only: Texas within 1,000, Virginia and Georgia past 100. No
  // Common Core code (decision 4).
  const BIGGER = { ccss: [], tx: ["2.4C", "2.7C", "2.4D"], fl: [], va: ["2.CE.1c"], ga: ["2.NR.2.3"] };
  const WANT = { missingNumber: BOX, biggerNumberStories: BIGGER };

  it("are six play-only Grade 2 skills, one per subskill, in plain parent words", () => {
    expect(skills.map((s) => [s.title, s.source.subskills])).toEqual([
      ["Add and take away stories", ["changeStories"]],
      ["Part and whole stories", ["partWholeStories"]],
      ["Compare stories", ["compareStories"]],
      ["Find the missing number", ["missingNumber"]],
      ["Two-step stories", ["twoStepStories"]],
      ["Stories with bigger numbers", ["biggerNumberStories"]],
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

  it("story skills list their stories in their own families, so choosing one means getting stories; the missing-number skill serves bare number sentences only", () => {
    for (const s of skills) {
      const sub = s.source.subskills[0];
      expect(s.source.families, s.id).toEqual(sub === "missingNumber" ? ["conceptual"] : ["application", "conceptual"]);
      // `stories` is another topic's optional story twin, the part the word
      // problems setting adds. Here the stories are the skill itself.
      expect(s.stories, s.id).toBeNull();
    }
  });

  it("is the only topic whose skills list stories in their own families: every other topic's stories stay with the setting", () => {
    const own = [...WORKSHEET_SKILLS, ...PLAY_ONLY_SKILLS].filter((s) => s.source.families?.includes("application"));
    expect([...new Set(own.map((s) => s.mode))]).toEqual(["wordProblems"]);
    expect(playSkills().filter((s) => s.source.families?.includes("application")).map((s) => s.id).sort()).toEqual(
      skills.filter((s) => s.source.subskills[0] !== "missingNumber").map((s) => s.id).sort()
    );
  });

  it("make the setting a no-op in this topic only, so the gear shows a plain line there, not a switch that restarts the session", () => {
    expect(storiesAlwaysOn("wordProblems")).toBe(true);
    for (const mode of MODE_IDS.filter((id) => id !== "wordProblems")) {
      expect(storiesAlwaysOn(mode), mode).toBe(false);
    }
  });

  it("cite Sai's codes, long form, in every loaded framework", () => {
    for (const s of skills) {
      const want = WANT[s.source.subskills[0]] || STORY;
      expect(s.standards, s.id).toEqual(want);
      expect(s.ccss, s.id).toEqual(want.ccss);
    }
  });

  it("cite only codes their own approved rows cite, and the bigger-numbers skill every code of rows 36-42", () => {
    const rows = BLUEPRINT_ROWS.filter((r) => r.mode_id === "wordProblems");
    expect(rows).toHaveLength(42);
    for (const s of skills) {
      const sub = s.source.subskills[0];
      const mine = rows.filter((r) => r.spec.subskill === sub);
      expect(mine.length, s.id).toBeGreaterThan(0);
      for (const [framework, codes] of Object.entries(s.standards)) {
        const cited = new Set(mine.flatMap((r) => r.standards[framework] || []));
        for (const code of codes) expect(cited.has(code), `${s.id} ${framework} ${code}`).toBe(true);
      }
    }
    const bigger = rows.filter((r) => r.spec.subskill === "biggerNumberStories");
    expect(bigger.map((r) => rows.indexOf(r) + 1)).toEqual([36, 37, 38, 39, 40, 41, 42]);
    for (const [framework, codes] of Object.entries(BIGGER)) {
      const cited = [...new Set(bigger.flatMap((r) => r.standards[framework] || []))].sort();
      expect([...codes].sort(), framework).toEqual(cited);
    }
    const last = skills.at(-1);
    expect(last.id).toBe("wp-g2-bigger-numbers");
    expect(levelForSkill(last)).toBe(6);
  });

  it("each draws only its own subskill's rows, in its own families, with the word problems setting on or off", () => {
    const before = getBankItems();
    const rows = testRows();
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
          const want = sub === "missingNumber" ? ["conceptual"] : ["application", "conceptual"];
          expect([...families].sort(), `${skill.id} words=${allowWordProblems}`).toEqual(want);
        }
      }
    } finally {
      setBankItems(before, "test");
    }
  });

  it("serves the same session whether the setting is on, off, or not passed (the iPhone passes none)", () => {
    const before = getBankItems();
    const rows = testRows();
    const storyIds = new Set(rows.filter((r) => r.itemFamily === "application").map((r) => r.itemId));
    const requests = [...skills.map((s) => ({ skillId: s.id })), { skillIds: skills.map((s) => s.id), grade: "2" }];
    try {
      setBankItems(rows, "test");
      for (const request of requests) {
        const label = request.skillId || "mixed";
        const runs = [true, false, undefined].map((allowWordProblems) =>
          withSeed(2026, () =>
            servedIds(createAdaptiveSession("wordProblems", 10, { ...request, allowWordProblems, savedProgress: { level: 4 } }))
          )
        );
        expect(runs[0]).toHaveLength(10);
        for (const id of runs[0]) expect(rows.some((r) => r.itemId === id), `${label}: ${id}`).toBe(true);
        expect(runs[1], `${label}: off`).toEqual(runs[0]);
        expect(runs[2], `${label}: not passed`).toEqual(runs[0]);
        const stories = runs[0].filter((id) => storyIds.has(id)).length;
        if (request.skillId === "wp-g2-box") expect(stories, label).toBe(0);
        else expect(stories, label).toBeGreaterThan(0);
      }
    } finally {
      setBankItems(before, "test");
    }
  });
});

describe("the Word Problems topic on the iPhone (the native engine, driven as Swift drives it)", () => {
  const K = globalThis.KidMath;
  const skills = PLAY_ONLY_SKILLS.filter((s) => s.mode === "wordProblems");

  afterEach(() => {
    K.setVersionSwitch([], {});
    K.resetBankToBundle();
  });

  /** The same rows as raw item_bank rows, the shape SupabaseService hands the engine. */
  const rawRows = () =>
    testRows().map((r) => ({
      item_id: r.itemId,
      mode_id: r.modeId,
      item_family: r.itemFamily,
      subskill: r.subskill,
      structure_type: r.structureType,
      level_min: r.levelRange[0],
      level_max: r.levelRange[1],
      review_status: r.reviewStatus,
      payload: r.question,
      source: "test",
      version: r.version,
    }));

  // Swift's SessionViewModel: skillSessionOptions, then createSession with
  // savedProgress and no word problems setting; the session crosses as JSON.
  const play = (request) => {
    const progress = { level: 4 };
    const options = K.skillSessionOptions("wordProblems", progress, { profileGrade: "2nd", sessions: [] }, request);
    expect(options, JSON.stringify(request)).toBeTruthy();
    expect(options.allowWordProblems).toBeUndefined();
    const json = (value) => JSON.parse(JSON.stringify(value));
    return servedIds(
      json(K.createAdaptiveSession("wordProblems", 10, { ...options, savedProgress: progress })),
      (session) => json(K.getNextQuestion(session)),
      (session, question, answer, ms, isRetry) => json(K.recordAnswer(session, question, answer, ms, isRetry)),
      (session) => K.isSessionComplete(session)
    );
  };

  it("serves a story skill's stories once the topic is live", () => {
    const rows = rawRows();
    K.setVersionSwitch([{ mode_id: "wordProblems", live_version: "v2" }], {});
    K.addBankRows(rows, "wordProblems");
    const family = new Map(rows.map((r) => [r.item_id, r.item_family]));
    for (const skill of skills) {
      const sub = skill.source.subskills[0];
      const ids = play({ skill: skill.id });
      expect(ids, skill.id).toHaveLength(10);
      for (const id of ids) expect(id, skill.id).toMatch(new RegExp(`^wp-test-${sub}-`));
      const families = new Set(ids.map((id) => family.get(id)));
      expect([...families].sort(), skill.id).toEqual(sub === "missingNumber" ? ["conceptual"] : ["application", "conceptual"]);
    }
    const mixed = play({ mix: true, grade: "2" });
    expect(mixed.some((id) => family.get(id) === "application"), "Larkit picks").toBe(true);
  });
});
