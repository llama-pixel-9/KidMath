import { describe, expect, it } from "vitest";
import { MODES, MAX_LEVEL } from "../mathEngine.js";
import { V2_ONLY_MODE_IDS, getModeConfig } from "../modes/index.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";
import { ITEM_FAMILIES, selectApprovedBankItem, setBankItems } from "../itemBank/index.js";
import { DEFAULT_LIVE_VERSION } from "../itemBank/versionRules.js";
import { MANIFESTS } from "../itemBank/v2/manifests/index.js";
import { BLUEPRINT_ROWS } from "../blueprints/index.js";
import { playSkills, topicGrades } from "../skills/play.js";
import { skillServable } from "../skills/session.js";
import { COVERED_MIN, DEFERRED_ROWS } from "../itemModels/live/liveRules.js";
import { skillServing } from "../itemModels/live/liveCoverage.js";

// The generators are retired as a content source: every cell the adaptive
// engine can request — (mode, level 1..MAX_LEVEL, family, subskill), with word
// problems on or off — must be served by an approved bank item, on the
// targeted subskill. The template generator still runs (it decides the
// family/subskill and is the last-resort safety net), but its prose must
// never reach a child. If this fails, author items for the listed cells;
// do not loosen the gate.

const FAMILIES = Object.values(ITEM_FAMILIES);
const modeIds = MODES.map((m) => (typeof m === "string" ? m : m.id));

// The one exemption, by name: v2-only topics whose items have not shipped.
// Such a topic has no rows at all yet, so every cell would miss. Its default
// live version is preview, so only preview browsers see it until Sai flips
// it; there, every cell falls back to the generator's bare number sentences
// (skillSession.spec holds the fallback to that). A topic comes off this
// list by itself once the live step commits its manifest
// (src/itemBank/v2/manifests/), and is then held to the catalog-skill gate
// below. The guard fails if a listed topic gains a bundled row any other
// way, goes live by default, or stops being v2-only. Same list as
// skillSession.spec.
const V2_TOPICS_AWAITING_ROWS = ["wordProblems", "multiDigit"];
const hasManifest = (modeId) => MANIFESTS.some((m) => m.topic === modeId);
const UNSHIPPED_V2_TOPICS = V2_TOPICS_AWAITING_ROWS.filter((modeId) => !hasManifest(modeId));

// A v2-only topic the live step filled (a committed manifest) is gated by
// its catalog skills, not by every (level, family, subskill) cell: its rows
// come from approved item models, one blueprint row at a time, and a play
// skill draws only its own subskill in the families it lists, skipping an
// empty family (src/skills/session.js). So every skill must serve from its
// own cell, and every cell with no row is named here with why (plan A.7).
// A name says one of two things, and the test checks which:
//   "no skill asks for it"            no catalog skill lists this family for
//                                     this subskill, so no session asks;
//   "its skill serves its other family" the skill that lists it serves its
//                                     other family, and the cell's own blueprint
//                                     rows (if any) are deferred.
// A named cell that gains a row must come off the list. Math Facts, v2-only
// with no manifest, stays under the full gate, which it passes.
const SKILL_GATED_TOPICS = V2_ONLY_MODE_IDS.filter(hasManifest);
const EMPTY_CELLS = {
  wordProblems: {
    "application missingNumber": "no skill asks for it: Find the missing number (wp-g2-box) is bare number sentences only",
    "conceptual changeStories": "its skill serves its other family: Add and take away stories (wp-g2-change) serves its stories; the two reasoning rows (wp-g2-choose-two-equations, wp-g2-tx-fl-story-for-equation) wait on a widget",
    "conceptual compareStories": "its skill serves its other family: Compare stories (wp-g2-compare) serves its stories; no blueprint row asks for a reasoning row here",
    "conceptual biggerNumberStories": "its skill serves its other family: Stories with bigger numbers (wp-g2-bigger-numbers) serves its stories; its reasoning row (wp-g2-tx-1000-story-for-equation) waits on a widget",
  },
  multiDigit: {
    "procedural equalSign": "no skill asks for it: What the equal sign means (md-g2-equal-sign) is reasoning rows only",
    "conceptual tenOrHundred": "no skill asks for it: 10 or 100 more or less (md-g2-ten-hundred) is computing drills only",
    "conceptual tenOrHundredTo1200": "no skill asks for it: 10 or 100 more or less, to 1,200 (md-g2-ten-hundred-1200) is computing drills only",
  },
};

/** The (level, family, subskill) cells the engine can request of a mode. */
function engineCells(modeId) {
  const cfg = getModeConfig(modeId);
  const topLevel = cfg.maxLevel ?? MAX_LEVEL;
  const families = cfg.families || FAMILIES;
  const out = [];
  for (let level = 1; level <= topLevel; level += 1) {
    for (const family of families) {
      for (const subskill of cfg.subskills) {
        const range = cfg.subskillLevels?.[subskill];
        if (range && (level < range[0] || level > range[1])) continue;
        out.push({ level, family, subskill });
      }
    }
  }
  return out;
}

const rowsIn = (modeId, { level, family, subskill }) =>
  FULL_ITEMS.filter(
    (i) =>
      i.modeId === modeId &&
      i.reviewStatus === "approved" &&
      i.itemFamily === family &&
      i.subskill === subskill &&
      i.levelRange[0] <= level &&
      i.levelRange[1] >= level
  ).length;

describe("bank cell coverage (generator retirement gate)", () => {
  setBankItems(FULL_ITEMS);
  const misses = [];
  const offTarget = [];
  let cells = 0;
  for (const modeId of modeIds) {
    if (UNSHIPPED_V2_TOPICS.includes(modeId) || SKILL_GATED_TOPICS.includes(modeId)) continue;
    const cfg = getModeConfig(modeId);
    const topLevel = cfg.maxLevel ?? MAX_LEVEL;
    // The engine only asks a mode for the families it declares (Math Facts has
    // no word problems); every mode with stories declares all three.
    const families = cfg.families || FAMILIES;
    for (let level = 1; level <= topLevel; level += 1) {
      for (const family of families) {
        for (const subskill of cfg.subskills) {
          // A band-scoped subskill (division remainders, placeValue rounding)
          // only exists inside its declared level range.
          const range = cfg.subskillLevels?.[subskill];
          if (range && (level < range[0] || level > range[1])) continue;
          for (const allowWordProblems of [true, false]) {
            if (!allowWordProblems && family === ITEM_FAMILIES.APPLICATION) continue;
            cells += 1;
            const item = selectApprovedBankItem({
              modeId,
              level,
              family,
              targetSubskill: subskill,
              allowWordProblems,
            });
            const label = `${modeId} L${level} ${family} ${subskill} words=${allowWordProblems}`;
            if (!item) misses.push(label);
            else if (item.subskill !== subskill) offTarget.push(`${label} → ${item.subskill}`);
          }
        }
      }
    }
  }

  it("covers every engine-requestable cell", () => {
    expect(cells).toBeGreaterThan(4000);
    expect(misses, `cells with no approved bank item:\n${misses.join("\n")}`).toEqual([]);
  });

  it("exempts only hidden v2-only topics with no rows yet", () => {
    for (const modeId of UNSHIPPED_V2_TOPICS) {
      expect(getModeConfig(modeId).v2Only, modeId).toBe(true);
      expect(DEFAULT_LIVE_VERSION[modeId], modeId).toBe("preview");
      expect(FULL_ITEMS.filter((item) => item.modeId === modeId).map((item) => item.itemId), modeId).toEqual([]);
    }
    for (const modeId of SKILL_GATED_TOPICS) expect(getModeConfig(modeId).v2Only, modeId).toBe(true);
  });

  it("serves the targeted subskill, not a neighbour", () => {
    expect(offTarget, `cells served off-target:\n${offTarget.join("\n")}`).toEqual([]);
  });
});

describe("catalog-skill gate (v2-only topics the live step filled)", () => {
  it("names empty cells only for topics it can gate", () => {
    for (const modeId of Object.keys(EMPTY_CELLS)) expect(V2_TOPICS_AWAITING_ROWS, modeId).toContain(modeId);
  });

  for (const modeId of SKILL_GATED_TOPICS) {
    describe(modeId, () => {
      const named = EMPTY_CELLS[modeId] || {};
      const skills = playSkills().filter((s) => s.mode === modeId);
      const serving = topicGrades(modeId).flatMap((grade) => skillServing({ topic: modeId, grade, items: FULL_ITEMS }));

      it("serves every catalog skill from its own cell, with word problems on and off", () => {
        setBankItems(FULL_ITEMS);
        expect(skills.length).toBeGreaterThan(0);
        expect(skills.filter((s) => !skillServable(s.id) || !skillServable(s.id, { allowWordProblems: false })).map((s) => s.id)).toEqual([]);
        // Enough rows that a session's no-repeat window never runs dry.
        expect(serving.filter((s) => s.count < COVERED_MIN).map((s) => `${s.skillId} (${s.count})`)).toEqual([]);
      });

      it("has rows in every family a skill lists, apart from the named cells", () => {
        const holes = [];
        for (const s of serving) {
          const skill = skills.find((k) => k.id === s.skillId);
          for (const family of s.holes) {
            for (const subskill of skill.source.subskills) {
              const why = named[`${family} ${subskill}`] || "";
              if (!why.startsWith("its skill serves its other family")) holes.push(`${s.skillId} ${family} ${subskill}`);
            }
          }
        }
        expect(holes).toEqual([]);
      });

      it("names every empty cell the engine can ask for, and only empty cells", () => {
        const empty = engineCells(modeId).filter((c) => rowsIn(modeId, c) === 0);
        const unnamed = empty.filter((c) => !named[`${c.family} ${c.subskill}`]).map((c) => `L${c.level} ${c.family} ${c.subskill}`);
        expect(unnamed, `empty cells with no reason in EMPTY_CELLS.${modeId}`).toEqual([]);
        const filled = Object.keys(named).filter((key) => {
          const [family, subskill] = key.split(" ");
          return engineCells(modeId).some((c) => c.family === family && c.subskill === subskill && rowsIn(modeId, c) > 0);
        });
        expect(filled, `named cells that now have rows: take them off EMPTY_CELLS.${modeId}`).toEqual([]);
      });

      it("gives each named cell a reason that holds", () => {
        const rows = BLUEPRINT_ROWS.filter((r) => r.mode_id === modeId);
        for (const [key, why] of Object.entries(named)) {
          const [family, subskill] = key.split(" ");
          expect(engineCells(modeId).some((c) => c.family === family && c.subskill === subskill), `${key}: a cell the engine can ask for`).toBe(true);
          const askers = skills.filter((s) => s.source.families.includes(family) && s.source.subskills?.includes(subskill));
          if (why.startsWith("no skill asks for it")) {
            expect(askers.map((s) => s.id), key).toEqual([]);
          } else {
            expect(why.startsWith("its skill serves its other family"), `${key}: an unknown reason`).toBe(true);
            expect(askers.length, key).toBeGreaterThan(0);
            for (const skill of askers) {
              const s = serving.find((x) => x.skillId === skill.id);
              expect(s.count, `${skill.id} serves its other family`).toBeGreaterThan(0);
            }
            const own = rows.filter((r) => r.spec?.family === family && r.spec?.subskill === subskill);
            expect(own.filter((r) => !DEFERRED_ROWS[r.id]).map((r) => r.id), `${key}: rows not deferred`).toEqual([]);
          }
        }
      });
    });
  }
});
