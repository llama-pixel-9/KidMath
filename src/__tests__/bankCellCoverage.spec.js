import { describe, expect, it } from "vitest";
import { MODES, MAX_LEVEL } from "../mathEngine.js";
import { getModeConfig } from "../modes/index.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";
import { ITEM_FAMILIES, selectApprovedBankItem, setBankItems } from "../itemBank/index.js";

// The generators are retired as a content source: every cell the adaptive
// engine can request — (mode, level 1..MAX_LEVEL, family, subskill), with word
// problems on or off — must be served by an approved bank item, on the
// targeted subskill. The template generator still runs (it decides the
// family/subskill and is the last-resort safety net), but its prose must
// never reach a child. If this fails, author items for the listed cells;
// do not loosen the gate.

const FAMILIES = Object.values(ITEM_FAMILIES);
const modeIds = MODES.map((m) => (typeof m === "string" ? m : m.id));

describe("bank cell coverage (generator retirement gate)", () => {
  setBankItems(FULL_ITEMS);
  const misses = [];
  const offTarget = [];
  let cells = 0;
  for (const modeId of modeIds) {
    const cfg = getModeConfig(modeId);
    const topLevel = cfg.maxLevel ?? MAX_LEVEL;
    for (let level = 1; level <= topLevel; level += 1) {
      for (const family of FAMILIES) {
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

  it("serves the targeted subskill, not a neighbour", () => {
    expect(offTarget, `cells served off-target:\n${offTarget.join("\n")}`).toEqual([]);
  });
});
