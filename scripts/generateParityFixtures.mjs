#!/usr/bin/env node
/**
 * Generate Node-side parity fixtures for the Swift/JavaScriptCore test suite.
 *
 * Runs the BUILT bundle (the exact artifact the iOS app ships) in a bare vm
 * sandbox with a seeded Math.random, and records the questions it generates.
 * The Swift test (EngineBridgeTests.testNodeParityFixtures) reseeds JSC with
 * the same mulberry32 PRNG and asserts byte-identical JSON — proving the
 * engine behaves the same under JavaScriptCore as under Node, where the
 * 354-test suite runs.
 *
 * Run: node scripts/generateParityFixtures.mjs   (build:engine must have run)
 * Output: ios/KidMathTests/Fixtures/engineParityFixtures.json (committed)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { maxLevelForMode } from "../src/modeLevels.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = resolve(root, "ios/KidMath/Resources/KidMathEngine.bundle.js");
const outPath = resolve(root, "ios/KidMathTests/Fixtures/engineParityFixtures.json");

const sandbox = {};
createContext(sandbox);
runInContext(readFileSync(bundlePath, "utf8"), sandbox, { filename: "KidMathEngine.bundle.js" });

// Same in-context mulberry32 reseeder as engineParity.mjs / EngineBridge.reseedRandom.
runInContext(
  `globalThis.__reseed = function (seed) {
     let a = seed >>> 0;
     Math.random = function () {
       a |= 0; a = (a + 0x6d2b79f5) | 0;
       let t = Math.imul(a ^ (a >>> 15), 1 | a);
       t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
       return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
     };
   };`,
  sandbox
);

const K = sandbox.KidMath;
if (!K) throw new Error("bundle did not expose KidMath");

// Empty bank on both sides so generation is pure-generator, fully determined
// by the seeded RNG (mirrors engineParity.mjs).
K.setBankItems([]);

const fixtures = [];
for (const mode of K.modes()) {
  const bandLevels = maxLevelForMode(mode) > 10 ? [1, 4, 7, 11] : [1, 4, 7];
  for (const level of bandLevels) {
    const seed = (level * 7919 + mode.length * 131 + [...mode].reduce((a, c) => a + c.charCodeAt(0), 0)) >>> 0;
    sandbox.__reseed(seed);
    const question = K.generateQuestion(mode, level);
    // Store the canonical JSON string — the Swift side compares strings
    // stringified inside its own JS realm, so formatting rules match.
    fixtures.push({ mode, level, seed, expectedJSON: JSON.stringify(question) });
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ generatedFrom: "scripts/generateParityFixtures.mjs", fixtures }, null, 2));
process.stdout.write(`Wrote ${fixtures.length} fixtures for ${K.modes().length} modes -> ${outPath}\n`);
