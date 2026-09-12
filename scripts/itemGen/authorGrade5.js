#!/usr/bin/env node
/**
 * Grade-5 banks (curriculum plan, Phase 2): fractionOps, decimalOps,
 * volumeCoordinates. Unlike the template-file builds, these three modes'
 * variety catalogs ARE the templates — this script drives each mode's own
 * `generate()` under a seeded RNG, converts the questions to bank rows, and
 * greedily selects a set per cell that respects the global prompt-uniqueness
 * and per-signature caps (conceptual 5, application 3) before handing the
 * result to the shared assembler gate.
 *
 * Figure varieties whose prompts carry no numbers (a cube box, a labeled
 * point) are salted with a name so prompts stay globally unique while the
 * math lives in the figure payload.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorGrade5.js            dry run
 *   ... --write --tag b0824
 */

import { generateQuestion } from "../../src/mathEngine.js";
import { getModeConfig } from "../../src/modes/index.js";
import { promptSignature, DEFAULT_SIGNATURE_LIMITS } from "../../src/itemBank/index.js";
import { runAssembler } from "./bankAssembler.js";
import { FULL_ITEMS } from "../../src/itemBank/fullBank.js";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const TAG = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const MODES = ["fractionOps", "decimalOps", "volumeCoordinates"];
const BANDS = [
  { band: 1, levels: [1, 2, 3], range: [1, 3] },
  { band: 2, levels: [4, 5, 6], range: [4, 6] },
  { band: 3, levels: [7, 8, 9, 10], range: [7, 12] },
];
const FLOOR = 52;
const CANDIDATE_TRIES = 4000;

// Deterministic RNG (mulberry32) so reruns regenerate the same batch.
function seedRandom(seed) {
  let a = seed >>> 0;
  const original = Math.random;
  Math.random = function seeded() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => {
    Math.random = original;
  };
}

const SALT_NAMES = ["Maya", "Leo", "Priya", "Omar", "Zoe", "Kai", "Nora", "Diego", "Rosa", "Finn", "Ida", "Luca", "Amara", "Theo", "Nia", "Ben", "June"];
const SALT_THINGS = ["toy box", "gift box", "block tower", "crate", "cube stack", "storage box", "brick pile", "puzzle box"];

/** Rewrites for figure prompts with no numbers: salt with a name/thing so the
 *  global prompt-uniqueness holds while the figure carries the math. */
const SALTERS = {
  countCubes: (q, i) => {
    const name = SALT_NAMES[i % SALT_NAMES.length];
    const thing = SALT_THINGS[Math.floor(i / SALT_NAMES.length) % SALT_THINGS.length];
    return `${name} built this ${thing} from unit cubes. How many unit cubes did ${name} use?`;
  },
  layersJudged: (q, i) => {
    const m = q.display.promptText.match(/holds (\d+) unit cubes/);
    const name = SALT_NAMES[i % SALT_NAMES.length];
    const thing = SALT_THINGS[Math.floor(i / SALT_NAMES.length) % SALT_THINGS.length];
    return `${name} says this ${thing} holds ${m[1]} unit cubes. Is ${name} right?`;
  },
  readPointCoordinate: (q, i) => {
    const axis = /x-coordinate/.test(q.display.promptText) ? "x" : "y";
    const name = SALT_NAMES[i % SALT_NAMES.length];
    const tpl = [
      (nm, ax) => `On ${nm}'s grid, find point A. What is its ${ax}-coordinate?`,
      (nm, ax) => `${nm} plotted point A. Read off its ${ax}-coordinate.`,
      (nm, ax) => `Point A sits on ${nm}'s graph. What ${ax}-coordinate does it have?`,
      (nm, ax) => `Look at point A on ${nm}'s grid. Type its ${ax}-coordinate.`,
      (nm, ax) => `${nm} put point A on this grid. What is the ${ax}-coordinate of point A?`,
      (nm, ax) => `Here is ${nm}'s grid with point A marked. What ${ax}-coordinate goes with point A?`,
    ][Math.floor(i / SALT_NAMES.length) % 6];
    return tpl(name, axis);
  },
  whichPointAt: (q, i) => {
    const m = q.display.promptText.match(/\((\d+), (\d+)\)/);
    const name = SALT_NAMES[i % SALT_NAMES.length];
    const tpl = [
      (nm) => `${nm} marks a spot at (${m[1]}, ${m[2]}). Which labeled point is it?`,
      (nm) => `The point at (${m[1]}, ${m[2]}) is one of ${nm}'s labels. Which letter is it?`,
      (nm) => `${nm} calls out (${m[1]}, ${m[2]}). Which labeled point matches?`,
      (nm) => `Which of the labeled points on ${nm}'s grid sits at (${m[1]}, ${m[2]})?`,
    ][Math.floor(i / SALT_NAMES.length) % 4];
    return tpl(name);
  },
  gridDistance: (q, i) => {
    const name = SALT_NAMES[i % SALT_NAMES.length];
    const tpl = [
      (nm) => `Points A and B are on ${nm}'s grid, on the same gridline. How many units apart are they?`,
      (nm) => `On ${nm}'s grid, walk straight from A to B along the line. How many units is the walk?`,
      (nm) => `${nm} measures from point A to point B along the gridline. How many units is that?`,
    ][Math.floor(i / SALT_NAMES.length) % 3];
    return tpl(name);
  },
  baseTimesHeight: null, // has numbers
};

function toRawItem(modeId, q, range) {
  const { promptText, ...rest } = q.display || {};
  return {
    modeId,
    itemFamily: q.metadata.itemFamily,
    subskill: q.metadata.subskill,
    structureType: q.metadata.structureType,
    levelRange: range,
    question: {
      a: q.a ?? null,
      b: q.b ?? null,
      op: q.op,
      answer: q.answer,
      ...(q.answerType ? { answerType: q.answerType } : {}),
      ...(q.choices ? { choices: q.choices } : {}),
      display: { ...rest, promptText },
    },
  };
}

const results = {};
for (const modeId of MODES) {
  const cfg = getModeConfig(modeId);
  const restore = seedRandom(0x5eed + modeId.length * 7919);
  const rawItems = [];
  // Seed uniqueness with the whole live bank so collisions are skipped here
  // (and the cell backfills) instead of failing at the assembler gate.
  const globalPrompts = new Set(
    FULL_ITEMS.filter((b) => !b.itemId.includes(`-${TAG}-`))
      .map((b) => b.question?.display?.promptText)
      .filter(Boolean),
  );
  // The assembler's signature cells span bands (mode::subskill::family), so
  // the cap must be counted across bands too.
  const modeSigCount = new Map();

  for (const { levels, range } of BANDS) {
    // Cells reachable in this band.
    for (const family of ["procedural", "conceptual", "application"]) {
      for (const subskill of cfg.subskills) {
        const sr = cfg.subskillLevels?.[subskill];
        if (sr && (range[1] < sr[0] || range[0] > sr[1])) continue;
        const cell = [];
        const cap = DEFAULT_SIGNATURE_LIMITS[family] ?? Infinity;
        const sigKey = (sig) => `${subskill}::${family}::${sig}`;
        let saltIdx = 0;
        for (let t = 0; t < CANDIDATE_TRIES && cell.length < FLOOR; t += 1) {
          const level = levels[t % levels.length];
          let q;
          try {
            q = generateQuestion(modeId, level, {
              consultBankFamilies: [],
              itemFamily: family,
              targetSubskill: subskill,
            });
          } catch {
            continue;
          }
          if (q.metadata.itemFamily !== family || q.metadata.subskill !== subskill) continue;
          const salter = SALTERS[q.metadata.structureType];
          if (salter) {
            try {
              q.display.promptText = salter(q, saltIdx);
              saltIdx += 1;
            } catch {
              continue;
            }
          }
          const text = q.display?.promptText;
          if (!text || globalPrompts.has(text)) continue;
          const sig = sigKey(promptSignature(text));
          if ((modeSigCount.get(sig) || 0) >= cap) continue;
          globalPrompts.add(text);
          modeSigCount.set(sig, (modeSigCount.get(sig) || 0) + 1);
          cell.push(toRawItem(modeId, q, range));
        }
        rawItems.push(...cell);
      }
    }
  }
  restore();

  results[modeId] = await runAssembler({
    modeId,
    subskills: cfg.subskills,
    rawItems,
    extraProblems: null,
    batchTag: TAG,
    write: WRITE,
    floor: 50,
  });
}
