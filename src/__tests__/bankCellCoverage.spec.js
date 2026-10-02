import { describe, expect, it } from "vitest";
import { MODES, MAX_LEVEL } from "../mathEngine.js";
import { getModeConfig } from "../modes/index.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";
import { ITEM_FAMILIES, selectApprovedBankItem, setBankItems } from "../itemBank/index.js";
import { DEFAULT_LIVE_VERSION } from "../itemBank/versionRules.js";

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
// (skillSession.spec holds the fallback to that). The guard below fails the
// moment a listed topic gains a bundled row, goes live by default, or stops
// being v2-only; it then comes off this list and passes the gate like every
// topic.
const UNSHIPPED_V2_TOPICS = ["wordProblems"];

describe("bank cell coverage (generator retirement gate)", () => {
  setBankItems(FULL_ITEMS);
  const misses = [];
  const offTarget = [];
  let cells = 0;
  for (const modeId of modeIds) {
    if (UNSHIPPED_V2_TOPICS.includes(modeId)) continue;
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
  });

  it("serves the targeted subskill, not a neighbour", () => {
    expect(offTarget, `cells served off-target:\n${offTarget.join("\n")}`).toEqual([]);
  });
});
