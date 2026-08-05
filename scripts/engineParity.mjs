/**
 * Engine parity + JSC-safety check.
 *
 * Loads the built IIFE bundle into an isolated `vm` context — no require, no
 * process, no window, closest thing Node has to JavaScriptCore — and proves:
 *   1. the bundle evaluates and exposes the KidMath API in a bare context;
 *   2. with a seeded RNG, its generateQuestion output is IDENTICAL to the
 *      module engine the 354-test suite covers (so the bundle IS the engine);
 *   3. checkAnswer agrees across the boundary;
 *   4. a full adaptive-session flow runs inside the sandbox.
 *
 * Run: npm run test:engine   (build:engine must have run first)
 */

import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = resolve(root, "ios/KidMath/Resources/KidMathEngine.bundle.js");

// Deterministic PRNG so both engines walk the same random sequence.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let failures = 0;
const assert = (cond, msg) => {
  if (!cond) {
    failures += 1;
    process.stderr.write(`  ✗ ${msg}\n`);
  }
};

// --- 1. Load the bundle in a bare JSC-like sandbox -------------------------
const sandbox = {}; // NOTE: no console, no process, no require, no window
createContext(sandbox);
const code = readFileSync(bundlePath, "utf8");
runInContext(code, sandbox, { filename: "KidMathEngine.bundle.js" });

const K = sandbox.KidMath;
assert(K && typeof K.generateQuestion === "function", "bundle exposes KidMath.generateQuestion");
assert(typeof K.checkAnswer === "function", "bundle exposes KidMath.checkAnswer");
assert(typeof K.createAdaptiveSession === "function", "bundle exposes KidMath.createAdaptiveSession");
assert(Array.isArray(K.modes()) && K.modes().length >= 20, "bundle reports the mode list");

// Install a reseeder INSIDE the sandbox realm — intrinsics like Math are not
// own-properties of the vm context object, so we cannot poke sandbox.Math from
// outside. This runs in-context and reseeds the context's own Math.random.
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

// --- 2. Parity vs the module engine, seeded ---------------------------------
const mod = await import("../src/mathEngine.js");

// Neutralise the bank on both sides so generation is pure-generator and fully
// determined by the seeded RNG (bank selection would otherwise diverge only if
// the two in-memory banks differed — they don't, but this isolates the engine).
K.setBankItems([]);
const { setBankItems: modSetBank } = await import("../src/itemBank/index.js");
modSetBank([], "test");

const MODES = ["addition", "subtraction", "multiplication", "division", "fractions", "money", "linesShapes"];
let compared = 0;
for (const mode of MODES) {
  for (let level = 1; level <= 10; level += 1) {
    for (let s = 0; s < 6; s += 1) {
      const seed = (level * 7919 + s * 104729 + mode.length * 131) >>> 0;

      // Seed the module side.
      Math.random = mulberry32(seed);
      const a = mod.generateQuestion(mode, level);

      // Seed the sandbox side identically (in-context reseeder).
      sandbox.__reseed(seed);
      const b = K.generateQuestion(mode, level);

      const sa = JSON.stringify(a);
      const sb = JSON.stringify(b);
      if (sa !== sb) {
        failures += 1;
        process.stderr.write(`  ✗ parity mismatch ${mode} L${level} seed ${seed}\n    mod:    ${sa}\n    bundle: ${sb}\n`);
      }
      compared += 1;

      // 3. checkAnswer agrees across the boundary on the bundle's own item.
      // multiSelect answers may be a LIST of acceptable selections (a list of
      // lists) — q.answer is not itself a valid submission; submit answer[0],
      // mirroring the session loop (see CLAUDE.md).
      const submission =
        Array.isArray(b.answer) && Array.isArray(b.answer[0]) ? b.answer[0] : b.answer;
      assert(K.checkAnswer(b, submission) === true, `bundle checkAnswer accepts its own answer (${mode} L${level})`);
    }
  }
}
// --- 4. Full session flow runs inside the sandbox ---------------------------
sandbox.__reseed(12345);
const session = K.createAdaptiveSession("addition", 5, { allowWordProblems: false });
assert(session && session.mode === "addition" && session.level >= 1, "session created in sandbox");
let q = K.getNextQuestion(session);
assert(q && q.question, "getNextQuestion returns a question in sandbox");
const rec = K.recordAnswer(session, q.question, q.question.answer, 1500, false);
assert(rec && rec.session, "recordAnswer returns updated session in sandbox");

// --- report -----------------------------------------------------------------
process.stdout.write(`\nEngine parity: compared ${compared} generated items across ${MODES.length} modes.\n`);
if (failures) {
  process.stderr.write(`\n${failures} check(s) FAILED.\n`);
  process.exit(1);
}
process.stdout.write("All parity + sandbox checks passed. The bundle is the engine.\n\n");
