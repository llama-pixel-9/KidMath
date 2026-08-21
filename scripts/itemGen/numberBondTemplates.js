/* Deterministic numberBonds bank items — the procedural and conceptual cells.
 *
 * Design source: docs/numberbonds-bank-design.md (EngageNY GK-M4, G1-M1/M2/M4,
 * G2-M1/M3 pattern survey). Structural inspiration only — all wording original.
 *
 * Payload convention (enforced by the `bondMath` QC check):
 *   - op is always "bond"; a/b stay null (keeps the vertical-equation layout
 *     and the trio arithmetic check out of the way).
 *   - missing-part items: display.whole + display.part (the given part).
 *   - three-part missing-part: display.whole + display.parts (the givens).
 *   - whole-unknown items: display.parts only.
 *   - judged/choice forms carry no numeric bond payload; build-time asserts
 *     below verify their math instead.
 *
 * Signature caps (findPromptOveruse): application 3, conceptual 5 per
 * (mode::subskill::family) bucket — bands SHARE the bucket. Conceptual
 * builders therefore rotate through ≥N/5 distinct phrasings; the assembler
 * re-checks the caps and refuses to emit a violating set.
 */

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => ({
  modeId: "numberBonds",
  subskill,
  itemFamily: family,
  structureType,
  levelRange: LEVELS[band],
  question: { a: null, b: null, op: "bond", ...question },
});

// Deterministic shuffle so re-runs emit byte-identical items.
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(arr, seed) {
  const rng = mulberry32(seed);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* missingPart :: procedural — the Number Bond Dash fact space         */
/* ------------------------------------------------------------------ */

export function missingPartProcedural() {
  const items = [];

  // Band 1 — every bond fact for wholes 2-10, zero included as a part
  // (GK-M4 legitimizes 0 explicitly). Bond widget + paired sentence.
  for (let whole = 2; whole <= 10; whole += 1) {
    for (let part = 0; part <= whole; part += 1) {
      items.push(
        item("missingPart", "procedural", "partUnknown", "band1", {
          answer: whole - part,
          answerType: "numberBond",
          display: { whole, part, promptText: `${whole} = ${part} + ?` },
        })
      );
    }
  }

  // Band 2 — teen bonds both ways, take-from-ten partners (9/8/7/6 as the
  // given part, G1-M2 Topic B), partners of 20.
  for (let t = 11; t <= 19; t += 1) {
    items.push(
      item("missingPart", "procedural", "teenBond", "band2", {
        answer: t - 10,
        answerType: "numberBond",
        display: { whole: t, part: 10, promptText: `${t} = 10 + ?` },
      })
    );
    items.push(
      item("missingPart", "procedural", "teenBond", "band2", {
        answer: t - 10,
        answerType: "numberPad",
        display: { whole: t, part: 10, promptText: `${t} = ? + 10` },
      })
    );
  }
  for (const part of [9, 8, 7, 6]) {
    for (let t = 11; t <= part + 9; t += 1) {
      items.push(
        item("missingPart", "procedural", "takeFromTenFact", "band2", {
          answer: t - part,
          answerType: "numberBond",
          display: { whole: t, part, promptText: `${t} = ${part} + ?` },
        })
      );
    }
  }
  for (let p = 1; p <= 19; p += 1) {
    items.push(
      item("missingPart", "procedural", "partnersOf20", "band2", {
        answer: 20 - p,
        answerType: "numberBond",
        display: { whole: 20, part: p, promptText: `20 = ${p} + ?` },
      })
    );
  }

  // Band 3 — partners to 100 (all fives + a spread of non-fives), partners to
  // 1000 by fifties, take-out-ten (G2-M1 L8), tens/ones with either slot open.
  for (let p = 5; p <= 95; p += 5) {
    items.push(
      item("missingPart", "procedural", "partnersOf100", "band3", {
        answer: 100 - p,
        answerType: "numberBond",
        display: { whole: 100, part: p, promptText: `100 = ${p} + ?` },
      })
    );
  }
  for (const p of [12, 23, 34, 41, 48, 56, 63, 67, 72, 79, 84, 88, 91, 96, 99, 3, 7, 18, 26, 37, 44]) {
    items.push(
      item("missingPart", "procedural", "partnersOf100", "band3", {
        answer: 100 - p,
        answerType: "numberBond",
        display: { whole: 100, part: p, promptText: `100 = ${p} + ?` },
      })
    );
  }
  for (let p = 50; p <= 950; p += 50) {
    items.push(
      item("missingPart", "procedural", "partnersOf1000", "band3", {
        answer: 1000 - p,
        answerType: "numberPad",
        display: { whole: 1000, part: p, promptText: `1000 = ${p} + ?` },
      })
    );
  }
  for (const n of [21, 26, 34, 39, 45, 52, 58, 63, 67, 74, 78, 85, 89, 92, 96]) {
    items.push(
      item("missingPart", "procedural", "takeOutTen", "band3", {
        answer: n - 10,
        answerType: "numberPad",
        display: { whole: n, part: 10, promptText: `${n} = ? + 10` },
      })
    );
  }
  const twoDigit = [
    [20, 4], [30, 7], [40, 2], [50, 9], [60, 3], [70, 8], [80, 5], [90, 6],
    [20, 8], [30, 1], [40, 6], [50, 4],
  ];
  for (const [d, o] of twoDigit) {
    items.push(
      item("missingPart", "procedural", "tensOnesBond", "band3", {
        answer: o,
        answerType: "numberBond",
        display: { whole: d + o, part: d, promptText: `${d + o} = ${d} + ?` },
      })
    );
    items.push(
      item("missingPart", "procedural", "tensOnesBond", "band3", {
        answer: d,
        answerType: "numberPad",
        display: { whole: d + o, part: o, promptText: `${d + o} = ? + ${o}` },
      })
    );
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* partWhole :: procedural — whole-unknown, equal sign on the left     */
/* ------------------------------------------------------------------ */

export function partWholeProcedural() {
  const items = [];

  // Band 1 — every pair with sum 2-10 (both orders where distinct; 0 legal).
  for (let sum = 2; sum <= 10; sum += 1) {
    for (let a = 0; a * 2 <= sum; a += 1) {
      const b = sum - a;
      items.push(
        item("partWhole", "procedural", "wholeFromParts", "band1", {
          answer: sum,
          answerType: "numberPad",
          display: { parts: [a, b], promptText: `? = ${a} + ${b}` },
        })
      );
      if (a !== b) {
        items.push(
          item("partWhole", "procedural", "wholeFromParts", "band1", {
            answer: sum,
            answerType: "numberPad",
            display: { parts: [b, a], promptText: `? = ${b} + ${a}` },
          })
        );
      }
    }
  }

  // Band 2 — ten-and-some-more both ways, big doubles, and three-addend bonds
  // built on every partner-of-ten pair (G1-M2 Topic A three-addend work).
  for (let n = 1; n <= 9; n += 1) {
    items.push(
      item("partWhole", "procedural", "teenFromTen", "band2", {
        answer: 10 + n,
        answerType: "numberPad",
        display: { parts: [10, n], promptText: `? = 10 + ${n}` },
      })
    );
    items.push(
      item("partWhole", "procedural", "teenFromTen", "band2", {
        answer: 10 + n,
        answerType: "numberPad",
        display: { parts: [n, 10], promptText: `? = ${n} + 10` },
      })
    );
  }
  for (let n = 6; n <= 10; n += 1) {
    items.push(
      item("partWhole", "procedural", "bigDouble", "band2", {
        answer: n + n,
        answerType: "numberPad",
        display: { parts: [n, n], promptText: `? = ${n} + ${n}` },
      })
    );
  }
  for (const [p, q] of [[9, 1], [8, 2], [7, 3], [6, 4], [5, 5]]) {
    for (let n = 1; n <= 8; n += 1) {
      items.push(
        item("partWhole", "procedural", "threeAddendBond", "band2", {
          answer: 10 + n,
          answerType: "numberPad",
          display: { parts: [p, q, n], promptText: `? = ${p} + ${q} + ${n}` },
        })
      );
    }
  }

  // Band 3 — tens/ones composition for every decade x ones, plus a spread of
  // hundreds/tens/ones three-part wholes.
  for (let d = 20; d <= 90; d += 10) {
    for (let o = 1; o <= 9; o += 1) {
      items.push(
        item("partWhole", "procedural", "tensOnesCompose", "band3", {
          answer: d + o,
          answerType: "numberPad",
          display: { parts: [d, o], promptText: `? = ${d} + ${o}` },
        })
      );
    }
  }
  const hto = [
    [100, 20, 3], [200, 30, 5], [300, 40, 7], [400, 10, 9], [500, 60, 2],
    [600, 70, 4], [700, 50, 8], [800, 90, 1], [900, 80, 6], [200, 60, 7],
    [300, 20, 9], [400, 70, 1], [500, 30, 6], [600, 40, 8], [700, 10, 2], [800, 50, 3],
  ];
  for (const [h, t, o] of hto) {
    items.push(
      item("partWhole", "procedural", "hundredsCompose", "band3", {
        answer: h + t + o,
        answerType: "numberPad",
        display: { parts: [h, t, o], promptText: `? = ${h} + ${t} + ${o}` },
      })
    );
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* decompose :: procedural — pattern pairs, make ten, take from ten    */
/* ------------------------------------------------------------------ */

const TF = (claim, truthy, band, structureType) =>
  item("decompose", "procedural", structureType, band, {
    answer: truthy ? "True" : "False",
    subPrompt: "True or false?",
    choices: ["True", "False"],
    display: { promptText: claim },
  });

export function decomposeProcedural() {
  const items = [];

  // Band 1 — ordered-family pattern pairs (G1-M1 L6: bonds of one whole in
  // order): the previous decomposition is shown, the neighbour is asked.
  for (let w = 5; w <= 10; w += 1) {
    for (let p = 1; p <= w - 2; p += 1) {
      items.push(
        item("decompose", "procedural", "bondPatternStep", "band1", {
          answer: w - p - 1,
          answerType: "numberPad",
          display: { whole: w, part: p + 1, promptText: `${w} = ${p} + ${w - p}. ${w} = ${p + 1} + ?` },
        })
      );
    }
    for (let p = 2; p <= w - 2; p += 1) {
      items.push(
        item("decompose", "procedural", "bondPatternStep", "band1", {
          answer: w - p + 1,
          answerType: "numberPad",
          display: { whole: w, part: p - 1, promptText: `${w} = ${p} + ${w - p}. ${w} = ${p - 1} + ?` },
        })
      );
    }
  }
  // Commutative flips: same bond, parts swapped (G1-M1 D1). Pairs where
  // w = 2p + 1 are excluded — their flip collides with a bondPatternStep item.
  for (const [w, p] of [[6, 2], [8, 5], [8, 3], [9, 2], [10, 7], [10, 3], [10, 4], [8, 1], [7, 2], [6, 1], [10, 1], [9, 1]]) {
    items.push(
      item("decompose", "procedural", "commutativeFlip", "band1", {
        answer: p,
        answerType: "numberPad",
        display: { whole: w, part: w - p, promptText: `${w} = ${p} + ${w - p}. ${w} = ${w - p} + ?` },
      })
    );
  }
  // True/false bond claims within 10 — judged fluency (GK-M4 B5 yes/no).
  // Claims are deduped: for small wholes the two claim shapes can coincide.
  let seed = 11;
  const claims = new Set();
  const pushTF = (claim, truthy, band, structureType) => {
    if (claims.has(claim)) return;
    claims.add(claim);
    items.push(TF(claim, truthy, band, structureType, (seed += 1)));
  };
  for (let w = 5; w <= 10; w += 1) {
    const p = w - 3;
    pushTF(`${p} + 3 = ${w}`, true, "band1", "trueFalseBond");
    pushTF(`${p - 1} + 3 = ${w}`, false, "band1", "trueFalseBond");
    pushTF(`2 + ${w - 2} = ${w}`, true, "band1", "trueFalseBond");
    pushTF(`2 + ${w - 1} = ${w}`, false, "band1", "trueFalseBond");
    pushTF(`4 + ${w - 4} = ${w}`, true, "band1", "trueFalseBond");
  }

  // Band 2 — make ten: split the second addend (9 needs 1, 8 needs 2, 7 needs
  // 3 — G1-M2 Topic A), teen bridging pairs, take-from-ten chains, teen T/F.
  for (const anchor of [9, 8, 7]) {
    const need = 10 - anchor;
    for (let n = need + 1; n <= 9; n += 1) {
      items.push(
        item("decompose", "procedural", "makeTenSplit", "band2", {
          answer: n - need,
          answerType: "numberPad",
          display: { whole: n, part: need, promptText: `${anchor} + ${n} = ${anchor} + ${need} + ?` },
        })
      );
    }
  }
  for (let t = 11; t <= 19; t += 1) {
    items.push(
      item("decompose", "procedural", "teenBridgePair", "band2", {
        answer: t - 9,
        answerType: "numberPad",
        display: { whole: t, part: 9, promptText: `${t} = 10 + ${t - 10}. ${t} = 9 + ?` },
      })
    );
  }
  for (const s of [9, 8, 7]) {
    for (let t = 11; t <= s + 9; t += 1) {
      items.push(
        item("decompose", "procedural", "takeFromTenChain", "band2", {
          answer: t - s,
          answerType: "numberPad",
          display: { whole: t, part: s, promptText: `${t} = 10 + ${t - 10}. ${t} − ${s} = ?` },
        })
      );
    }
  }
  for (const [a, b] of [[9, 5], [8, 6], [7, 6], [9, 8], [8, 4], [7, 7], [9, 3], [8, 8]]) {
    items.push(TF(`${a} + ${b} = ${a + b}`, true, "band2", "trueFalseBond", (seed += 1)));
    items.push(TF(`${a} + ${b} = ${a + b + 1}`, false, "band2", "trueFalseBond", (seed += 1)));
  }

  // Band 3 — make the next ten within 100 (G2-M1 L5), ladder pairs (13−8
  // helps 23−8), take-out-ten, and place-value T/F claims.
  for (const [x, n] of [[19, 3], [29, 4], [39, 5], [49, 6], [59, 7], [69, 8], [79, 4], [89, 3], [18, 5], [28, 6], [38, 7], [48, 4], [58, 8], [68, 5], [78, 6], [88, 7], [17, 5], [27, 6], [37, 8], [47, 9]]) {
    const toTen = 10 - (x % 10);
    items.push(
      item("decompose", "procedural", "makeNextTen", "band3", {
        answer: n - toTen,
        answerType: "numberPad",
        display: { whole: n, part: toTen, promptText: `${x} + ${n} = ${x + toTen} + ?` },
      })
    );
  }
  for (const [base, s] of [[13, 8], [14, 9], [15, 7], [12, 6], [16, 9], [13, 6], [15, 8], [11, 7]]) {
    for (const add of [10, 20, 30]) {
      items.push(
        item("decompose", "procedural", "ladderPair", "band3", {
          answer: base + add - s,
          answerType: "numberPad",
          display: { whole: base + add, part: s, promptText: `${base} − ${s} = ${base - s}. ${base + add} − ${s} = ?` },
        })
      );
    }
  }
  for (const n of [34, 47, 53, 68, 72, 86, 91, 29, 65, 58, 43, 77]) {
    items.push(
      item("decompose", "procedural", "takeOutTenSplit", "band3", {
        answer: 10,
        answerType: "numberPad",
        display: { whole: n, part: n - 10, promptText: `${n} = ${n - 10} + ?` },
      })
    );
  }
  for (const [h, t, o] of [[300, 40, 5], [200, 70, 8], [500, 10, 6], [700, 30, 2], [400, 90, 1], [600, 50, 9], [800, 20, 4], [900, 60, 3]]) {
    items.push(TF(`${h} + ${t} + ${o} = ${h + t + o}`, true, "band3", "trueFalsePlaceBond", (seed += 1)));
    items.push(TF(`${h} + ${t} + ${o} = ${h + t + o + 10}`, false, "band3", "trueFalsePlaceBond", (seed += 1)));
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Conceptual cells — visual and judged forms with phrasing rotation.  */
/* Signature cap is 5 per (subskill::conceptual) bucket ACROSS bands.  */
/* ------------------------------------------------------------------ */

// "1 counters" is the classic generated-prose tell — pluralize properly.
const ctr = (n) => `${n} counter${n === 1 ? "" : "s"}`;

// A tiny rotor: hands out phrasings so no single template wording carries
// more than `cap` items. Phrasings differ in real words, so their prompt
// signatures differ.
function rotor(phrasings, cap = 5) {
  const used = phrasings.map(() => 0);
  return () => {
    const i = used.findIndex((u) => u < cap);
    if (i === -1) throw new Error("rotor exhausted — add phrasings");
    used[i] += 1;
    return phrasings[i];
  };
}

const EMOJI_SETS = [
  { emoji: "🥚", noun: "eggs" },
  { emoji: "🐚", noun: "shells" },
  { emoji: "🍎", noun: "apples" },
  { emoji: "⭐", noun: "stars" },
  { emoji: "🌸", noun: "flowers" },
  { emoji: "🎈", noun: "balloons" },
  { emoji: "🍓", noun: "berries" },
  { emoji: "🐟", noun: "fish" },
];

export function partWholeConceptual() {
  const items = [];

  // Band 1a — two-color ten-frame reads: the parts are VISIBLE (5-group
  // structure, GK-M4 A2). Caption restates the two parts; the child counts on.
  const framePhr = rotor([
    (a, b) => `The frame shows ${a} red counters and ${b} blue counters. How many counters in all?`,
    (a, b) => `${a} red counters and ${b} blue counters fill the frame. How many counters are there?`,
    (a, b) => `Count the ten frame: ${a} red counters, then ${b} blue counters. How many counters altogether?`,
    (a, b) => `A ten frame holds ${a} red counters and ${b} blue counters. What is the total number of counters?`,
    (a, b) => `Count every counter in this frame: ${a} red, then ${b} blue. How many counters are shown?`,
  ]);
  const framePairs = [[5, 2], [5, 3], [5, 4], [5, 5], [4, 2], [4, 3], [3, 3], [6, 2], [6, 3], [7, 2], [7, 3], [8, 2], [4, 4], [3, 2], [2, 2], [6, 4], [2, 3], [3, 4], [2, 4], [2, 5], [3, 5], [2, 6], [4, 5], [2, 7], [3, 6]];
  for (const [a, b] of framePairs) {
    items.push(
      item("partWhole", "conceptual", "frameWholeUnknown", "band1", {
        answer: a + b,
        answerType: "tenFrame",
        display: {
          filled: a,
          filledB: b,
          frames: 1,
          frameMode: "count",
          parts: [a, b],
          promptText: framePhr()(a, b),
        },
      })
    );
  }

  // Band 1b — emoji two-group pictures (GK-M4 A1: two visible subgroups).
  // The noun changes per set, so each set is its own signature.
  let e = 0;
  for (const [a, b] of [[3, 2], [4, 3], [2, 2], [5, 3], [4, 4], [3, 3], [5, 4], [6, 3], [2, 1], [4, 2], [5, 2], [6, 2], [3, 4], [2, 5], [4, 5], [1, 3], [6, 4], [2, 3], [3, 5], [5, 5], [7, 2], [1, 5], [2, 6], [3, 6], [7, 3]]) {
    const set = EMOJI_SETS[e % EMOJI_SETS.length];
    e += 1;
    const runA = set.emoji.repeat(a);
    const runB = set.emoji.repeat(b);
    items.push(
      item("partWhole", "conceptual", "pictureWholeUnknown", "band1", {
        answer: a + b,
        answerType: "numberPad",
        display: {
          parts: [a, b],
          promptText: `One part: ${runA} Other part: ${runB} How many ${set.noun} in all?`,
        },
      })
    );
  }

  // Band 2a — a full ten frame and a second partial frame: teen totals seen
  // as ten-and-some-more (G1-M1 Group I).
  const teenPhr = rotor([
    (n) => `One full frame of 10 and ${n} more. How many counters is that?`,
    (n) => `The top frame is full with 10 counters; the bottom frame shows ${ctr(n)}. How many counters in both frames?`,
    (n) => `Ten counters fill one frame and ${ctr(n)} sit${n === 1 ? "s" : ""} in the next frame. What is the total number of counters?`,
  ]);
  for (let n = 1; n <= 9; n += 1) {
    items.push(
      item("partWhole", "conceptual", "teenFrameWhole", "band2", {
        answer: 10 + n,
        answerType: "tenFrame",
        display: { filled: 10, filledB: n, frames: 2, frameMode: "count", parts: [10, n], promptText: teenPhr()(n) },
      })
    );
  }

  // Band 2b — choose the whole (misconception distractors: part echoed,
  // parts swapped into a difference, off-by-one count-all).
  const choicePhr = rotor([
    (a, b) => `A bond has parts ${a} and ${b}. Which number is the whole?`,
    (a, b) => `The two parts of a bond are ${a} and ${b}. Which of these is the whole?`,
    (a, b) => `Parts ${a} and ${b} join to make a whole. Which number do they make?`,
    (a, b) => `Pick the whole for the bond with parts ${a} and ${b}.`,
    (a, b) => `${a} and ${b} snap together in a bond. Which total do they build?`,
    (a, b) => `If a bond's branches hold ${a} and ${b}, which number sits at the top?`,
  ]);
  let cSeed = 101;
  for (const [a, b] of [[9, 4], [8, 5], [7, 6], [9, 7], [8, 8], [6, 5], [9, 9], [8, 3], [7, 4], [9, 6], [8, 6], [7, 7], [9, 5], [6, 6], [8, 7], [9, 8], [7, 5], [6, 4], [9, 3], [8, 4], [7, 8], [6, 8], [5, 7], [4, 9], [3, 8], [5, 8], [4, 7], [6, 9]]) {
    const whole = a + b;
    const wrong = [...new Set([Math.abs(a - b) || whole + 2, Math.max(a, b), whole + 1])].filter((w) => w !== whole);
    while (wrong.length < 3) wrong.push(whole + wrong.length + 1);
    items.push(
      item("partWhole", "conceptual", "chooseWhole", "band2", {
        answer: whole,
        choices: shuffled([whole, ...wrong.slice(0, 3)], (cSeed += 1)),
        display: { promptText: choicePhr()(a, b) },
      })
    );
  }

  // Band 2c — three parts in prose (1.OA.2 three addends).
  const threePhr = rotor([
    (a, b, c) => `A bond has three parts: ${a}, ${b}, and ${c}. What is the whole?`,
    (a, b, c) => `Three parts make one whole: ${a}, ${b}, and ${c}. What number is the whole?`,
    (a, b, c) => `A three-branch bond holds ${a}, ${b}, and ${c}. What whole do the branches make?`,
  ]);
  for (const [a, b, c] of [[4, 6, 3], [5, 5, 7], [2, 8, 4], [3, 7, 6], [9, 1, 5], [6, 4, 8], [2, 3, 5], [7, 3, 4], [8, 2, 9], [5, 4, 3], [3, 5, 8], [6, 2, 7], [4, 4, 9]]) {
    items.push(
      item("partWhole", "conceptual", "threePartWhole", "band2", {
        answer: a + b + c,
        answerType: "numberPad",
        display: { parts: [a, b, c], promptText: threePhr()(a, b, c) },
      })
    );
  }

  // Band 3a — unit-form wholes (G2-M3 L5: hundreds/tens/ones bond).
  const unit = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const unitPhr = rotor([
    (h, t, o) => `${unit(h, "hundred")} ${unit(t, "ten")} ${unit(o, "one")}. What number is the whole?`,
    (h, t, o) => `A bond splits a number into ${unit(h, "hundred")}, ${unit(t, "ten")}, and ${unit(o, "one")}. What is the number?`,
    (h, t, o) => `Put together ${unit(h, "hundred")}, ${unit(t, "ten")}, and ${unit(o, "one")}. What number do the parts make?`,
    (h, t, o) => `The parts of a number are ${unit(h, "hundred")}, ${unit(t, "ten")}, and ${unit(o, "one")}. Name the number.`,
  ]);
  const unitTriples = [[2, 6, 3], [3, 1, 8], [4, 5, 2], [5, 9, 7], [6, 2, 4], [7, 8, 1], [8, 3, 9], [9, 4, 6], [1, 7, 5], [2, 0, 9], [3, 5, 0], [4, 8, 6], [5, 2, 1], [6, 6, 8], [7, 0, 3], [8, 9, 2], [9, 1, 4], [1, 3, 7], [2, 4, 8], [3, 9, 5]];
  for (const [h, t, o] of unitTriples) {
    items.push(
      item("partWhole", "conceptual", "unitFormWhole", "band3", {
        answer: h * 100 + t * 10 + o,
        answerType: "numberPad",
        display: { parts: [h * 100, t * 10, o], promptText: unitPhr()(h, t, o) },
      })
    );
  }

  // Band 3b — tens/ones prose wholes (G1-M4 Topic A).
  const tensPhr = rotor([
    (d, o) => `A bond shows ${d} and ${o} as the parts. What is the whole?`,
    (d, o) => `The parts are ${d} and ${o}. What whole number do they make?`,
    (d, o) => `Join the parts ${d} and ${o}. What is the whole?`,
  ]);
  for (const [d, o] of [[30, 7], [50, 2], [70, 9], [20, 6], [80, 4], [40, 8], [90, 3], [60, 1], [30, 5], [70, 4], [20, 9], [50, 8], [40, 3], [80, 7], [60, 6]]) {
    items.push(
      item("partWhole", "conceptual", "tensOnesWhole", "band3", {
        answer: d + o,
        answerType: "numberPad",
        display: { parts: [d, o], promptText: tensPhr()(d, o) },
      })
    );
  }

  // Band 3c — choose the whole, larger magnitudes.
  const bigChoicePhr = rotor([
    (a, b) => `Which whole do the parts ${a} and ${b} make?`,
    (a, b) => `A bond's parts are ${a} and ${b}. Choose the whole.`,
    (a, b) => `${a} and ${b} are the two parts of a bond. Choose its whole.`,
  ]);
  for (const [a, b] of [[40, 25], [30, 45], [60, 15], [20, 55], [50, 35], [70, 25], [45, 45], [65, 30], [55, 15], [80, 15], [35, 25], [75, 20], [25, 60], [15, 45], [85, 10]]) {
    const whole = a + b;
    const wrong = [...new Set([whole - 10, whole + 10, Math.abs(a - b) || whole + 5])].filter((w) => w !== whole && w > 0);
    items.push(
      item("partWhole", "conceptual", "chooseWholeBig", "band3", {
        answer: whole,
        choices: shuffled([whole, ...wrong.slice(0, 3)], (cSeed += 1)),
        display: { promptText: bigChoicePhr()(a, b) },
      })
    );
  }

  return items;
}

export function missingPartConceptual() {
  const items = [];

  // Band 1a — make ten on a frame: the empty cells ARE the unknown part.
  const makeTenPhr = rotor([
    (p) => `The frame shows ${ctr(p)}. How many more counters make 10?`,
    (p) => `${ctr(p)} ${p === 1 ? "is" : "are"} in the ten frame. How many empty cells are left?`,
    (p) => `A ten frame has ${ctr(p)} so far. How many counters are still missing?`,
  ]);
  for (let p = 1; p <= 9; p += 1) {
    items.push(
      item("missingPart", "conceptual", "makeTenFrame", "band1", {
        answer: 10 - p,
        answerType: "tenFrame",
        display: { filled: p, frames: 1, frameMode: "count", whole: 10, part: p, promptText: makeTenPhr()(p) },
      })
    );
  }
  // Build mode: the child ADDS the missing part (GK-M4 D1 "draw more to make").
  const buildPhr = rotor([
    (p) => `Tap empty cells until the frame shows 10. How many counters did you add to the ${p}?`,
    (p) => `The frame starts with ${p} counters. Fill it to 10 — how many counters did you place?`,
  ]);
  for (const p of [3, 4, 5, 6, 7, 8]) {
    items.push(
      item("missingPart", "conceptual", "buildToTen", "band1", {
        answer: 10 - p,
        answerType: "tenFrame",
        display: { filled: p, frames: 1, frameMode: "build", whole: 10, part: p, promptText: buildPhr()(p) },
      })
    );
  }
  // Partners of 5 on the frame.
  for (let p = 1; p <= 4; p += 1) {
    items.push(
      item("missingPart", "conceptual", "makeFiveFrame", "band1", {
        answer: 5 - p,
        answerType: "tenFrame",
        display: { filled: p, frames: 1, frameMode: "count", whole: 5, part: p, promptText: `The top row should hold 5. It shows ${ctr(p)} — how many more counters does the row need?` },
      })
    );
  }

  // Band 1b — sentence-frame bonds, unknown in first position (G1-M1 B).
  const sentPhr = rotor([
    (w, p) => `___ and ${p} make ${w}. What is the missing number?`,
    (w, p) => `Some number and ${p} go together to make ${w}. What is that number?`,
    (w, p) => `${w} is ${p} and ___. Fill in the blank.`,
    (w, p) => `A whole of ${w} hides two parts. One part is ${p} — name the other part.`,
    (w, p) => `Together with ${p}, a hidden part makes ${w}. What is the hidden part?`,
  ]);
  // No pair with w = 2p: prose forms state the part, and an answer equal to
  // the stated part reads as given away (the gate rejects it).
  for (const [w, p] of [[5, 2], [6, 4], [7, 3], [8, 5], [9, 6], [10, 7], [6, 1], [7, 5], [8, 2], [9, 4], [10, 3], [5, 1], [8, 6], [9, 2], [10, 6], [7, 4], [6, 2], [9, 8], [10, 1], [8, 3], [7, 1], [10, 8], [9, 3], [6, 5], [5, 3]]) {
    items.push(
      item("missingPart", "conceptual", "bondSentence", "band1", {
        answer: w - p,
        answerType: "numberPad",
        display: { whole: w, part: p, promptText: sentPhr()(w, p) },
      })
    );
  }
  // Choice form with misconception distractors (partWholeSwap, partEchoed).
  let cSeed = 401;
  const b1ChoicePhr = rotor([
    (w, p) => `The whole is ${w}. One part is ${p}. Which is the other part?`,
    (w, p) => `A bond shows whole ${w} with one part ${p}. Choose the missing part.`,
  ]);
  for (const [w, p] of [[8, 3], [9, 5], [10, 4], [7, 2], [6, 4], [10, 2], [9, 7], [8, 1], [7, 6], [10, 7]]) {
    const ans = w - p;
    const wrong = [...new Set([w + p, p, ans + 1])].filter((x) => x !== ans);
    items.push(
      item("missingPart", "conceptual", "choosePart", "band1", {
        answer: ans,
        choices: shuffled([ans, ...wrong.slice(0, 3)], (cSeed += 1)),
        display: { promptText: b1ChoicePhr()(w, p) },
      })
    );
  }

  // Band 2a — hidden part with a frame visible (total told, part seen).
  const hiddenPhr = rotor([
    (t, s) => `There are ${t} counters in all. The frame shows ${s} of them — how many counters are hidden?`,
    (t, s) => `${t} counters in total, but only ${s} sit in the frame. How many counters are out of sight?`,
    (t, s) => `A set of ${t} counters got split. You can see ${s} in the frame. How many counters are covered?`,
    (t, s) => `${t} counters were shared between the frame and a cup. The frame holds ${s} counters. How many counters wait in the cup?`,
    (t, s) => `Of ${t} counters, the frame keeps ${s} and a lid hides the rest. How many counters sit under the lid?`,
  ]);
  for (const [t, s] of [[12, 8], [13, 9], [14, 8], [15, 9], [11, 7], [16, 9], [12, 9], [13, 7], [14, 9], [15, 8], [11, 6], [17, 9], [13, 8], [12, 7], [14, 6], [15, 6], [16, 7], [17, 8], [11, 4], [12, 4], [13, 5], [14, 5], [15, 4], [16, 6], [11, 3]]) {
    items.push(
      item("missingPart", "conceptual", "hiddenPartFrame", "band2", {
        answer: t - s,
        answerType: "tenFrame",
        display: { filled: s, frames: 1, frameMode: "count", whole: t, part: s, promptText: hiddenPhr()(t, s) },
      })
    );
  }

  // Band 2b — teen sentence frames (fresh wording = fresh signatures).
  const teenSentPhr = rotor([
    (w, p) => `___ plus ${p} makes ${w}. Find the missing number.`,
    (w, p) => `${w} splits into ${p} and one more part. How big is that part?`,
    (w, p) => `To reach ${w}, the number ${p} needs a partner. What is the partner?`,
  ]);
  for (const [w, p] of [[13, 9], [15, 7], [17, 8], [12, 5], [14, 6], [16, 9], [18, 7], [13, 4], [15, 9], [11, 8], [12, 3], [16, 7], [14, 5], [17, 9], [11, 2]]) {
    items.push(
      item("missingPart", "conceptual", "teenBondSentence", "band2", {
        answer: w - p,
        answerType: "numberPad",
        display: { whole: w, part: p, promptText: teenSentPhr()(w, p) },
      })
    );
  }

  // Band 2c — spot the error: a child treats the whole as a part
  // (partWholeSwap, the mode's flagship misconception).
  const errPhr = rotor([
    (w, p, n) => `${n} saw a bond with whole ${w} and part ${p}, and wrote ${w + p}. What is the correct missing part?`,
    (w, p, n) => `${n} added ${w} + ${p} to finish a bond with whole ${w} and part ${p}. That gave ${w + p}, which is wrong. What is the right part?`,
  ]);
  const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava", "Kai", "Ida", "Omar", "June"];
  for (const [i, [w, p]] of [[14, 6], [15, 8], [12, 4], [16, 7], [13, 5], [17, 9], [18, 11], [12, 7], [15, 6], [13, 8]].entries()) {
    items.push(
      item("missingPart", "conceptual", "errorPartWholeSwap", "band2", {
        answer: w - p,
        answerType: "numberPad",
        display: { whole: w, part: p, promptText: errPhr()(w, p, NAMES[i % NAMES.length]) },
      })
    );
  }

  // Band 3a — non-canonical splits (G1-M4/G2-M1: 43 = 33 + 10, ten on the
  // right; and one/two tens taken out).
  const nonCanonPhr = rotor([
    (w, s) => `Split ${w} into ${s} and one more part. What is the other part?`,
    (w, s) => `${w} breaks into ${s} and ___. What number completes the split?`,
    (w, s) => `Take ${s} out of ${w}. How much is left in the other part?`,
    (w, s) => `A bond splits ${w} so one part is ${s}. How big is the second part?`,
    (w, s) => `One branch of a ${w}-bond holds ${s}. What does the other branch hold?`,
    (w, s) => `${w} = ${s} + one hidden part. Name the hidden part.`,
  ]);
  const nonCanon = [[43, 33], [56, 46], [62, 42], [75, 55], [38, 18], [84, 64], [91, 71], [27, 17], [65, 45], [53, 43], [78, 58], [82, 72], [36, 26], [49, 29], [67, 57], [94, 74], [58, 38], [73, 63], [86, 66], [45, 25], [52, 32], [64, 44], [76, 66], [88, 68], [39, 19], [57, 37], [69, 49], [81, 61], [93, 83], [47, 27]];
  for (const [w, s] of nonCanon) {
    items.push(
      item("missingPart", "conceptual", "nonCanonicalSplit", "band3", {
        answer: w - s,
        answerType: "numberPad",
        display: { whole: w, part: s, promptText: nonCanonPhr()(w, s) },
      })
    );
  }

  // Band 3b — error analysis at magnitude.
  const bigErrPhr = rotor([
    (w, p, n) => `${n} filled a bond: whole ${w}, part ${p}, other part ${w + p}. The answer ${w + p} is bigger than the whole! What is the correct part?`,
    (w, p, n) => `A bond shows whole ${w} and part ${p}. ${n} answered ${w + p}. A part can never be bigger than its whole! What is the true missing part?`,
  ]);
  for (const [i, [w, p]] of [[40, 15], [60, 35], [50, 20], [80, 45], [70, 25], [90, 55], [100, 40], [30, 12], [100, 65], [80, 30]].entries()) {
    items.push(
      item("missingPart", "conceptual", "errorAtMagnitude", "band3", {
        answer: w - p,
        answerType: "numberPad",
        display: { whole: w, part: p, promptText: bigErrPhr()(w, p, NAMES[(i + 3) % NAMES.length]) },
      })
    );
  }

  // Band 3c — choose the part, bonds to 100 (distractors: swap, echo, off-ten).
  const b3ChoicePhr = rotor([
    (w, p) => `The whole is ${w} and one part is ${p}. Which number is the other part?`,
    (w, p) => `Choose the missing part: whole ${w}, known part ${p}.`,
  ]);
  for (const [w, p] of [[100, 35], [100, 60], [100, 85], [100, 45], [100, 70], [90, 55], [80, 25], [100, 15], [70, 45], [100, 95]]) {
    const ans = w - p;
    const wrong = [...new Set([ans + 10, ans - 10, p])].filter((x) => x !== ans && x > 0);
    while (wrong.length < 3) wrong.push(ans + 5 * (wrong.length + 1));
    items.push(
      item("missingPart", "conceptual", "choosePartTo100", "band3", {
        answer: ans,
        choices: shuffled([ans, ...wrong.slice(0, 3)], (cSeed += 1)),
        display: { promptText: b3ChoicePhr()(w, p) },
      })
    );
  }

  return items;
}

export function decomposeConceptual() {
  const items = [];
  let cSeed = 701;

  // Band 1a — which pair makes the whole (recognition side).
  const whichPhr = rotor([
    (w) => `Which pair makes ${w}?`,
    (w) => `Which pair of numbers makes ${w}?`,
    (w) => `Two numbers bond to give ${w}. Which pair works?`,
    (w) => `Find the pair whose whole is ${w}.`,
  ]);
  // Ordered so no whole repeats inside one phrasing block (the prompt only
  // names the whole, so a repeated whole in the same phrasing = duplicate).
  const whichData = [[5, 2], [6, 4], [7, 3], [8, 5], [9, 6], [10, 7], [6, 1], [8, 3], [9, 2], [5, 1], [7, 5], [10, 4]];
  for (const [w, p] of whichData) {
    const correct = `${p} and ${w - p}`;
    const wrongs = [`${p} and ${w - p + 1}`, `${p + 1} and ${w - p + 1}`, `${p} and ${w - p - 1}`].filter(
      (s) => !s.includes(" and 0") && s !== correct
    );
    items.push(
      item("decompose", "conceptual", "whichPairMakesWhole", "band1", {
        answer: correct,
        choices: shuffled([correct, ...wrongs.slice(0, 3)], (cSeed += 1)),
        display: { promptText: whichPhr()(w) },
      })
    );
  }

  // Band 1b — odd one out (which pair does NOT bond).
  const oddPhr = rotor([
    (w) => `Which pair does NOT make ${w}?`,
    (w) => `Three pairs make ${w}; one does not. Which pair is the odd one out?`,
  ]);
  for (const [w, bad] of [[6, 2], [7, 4], [8, 3], [9, 5], [10, 6], [8, 6], [9, 3], [10, 2], [7, 2], [6, 3]]) {
    const goods = [1, 2, 3]
      .map((k) => ((bad + k) % (w - 1)) + 1)
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .map((p) => `${p} and ${w - p}`);
    const odd = `${bad} and ${w - bad + 1}`;
    items.push(
      item("decompose", "conceptual", "oddOneOutBond", "band1", {
        answer: odd,
        choices: shuffled([...new Set([...goods.slice(0, 3), odd])], (cSeed += 1)),
        display: { promptText: oddPhr()(w) },
      })
    );
  }

  // Band 1c — open decomposition, multi-select BOTH valid pairs (K.OA.3).
  const openPhr = rotor([
    (w) => `Choose BOTH pairs that make ${w}.`,
    (w) => `Two of these pairs bond to ${w}. Select both.`,
    (w) => `Pick the two pairs whose whole is ${w}.`,
  ]);
  for (const [w, p1, p2] of [[6, 1, 4], [7, 2, 5], [8, 1, 3], [9, 4, 7], [10, 2, 6], [8, 6, 2], [9, 1, 6], [10, 9, 3], [7, 1, 4], [6, 5, 2], [10, 5, 8], [9, 8, 2]]) {
    const correct = [`${p1} and ${w - p1}`, `${p2} and ${w - p2}`];
    const wrong = [`${p1} and ${w - p1 + 2}`, `${p2 + 1} and ${w - p2 + 1}`];
    items.push(
      item("decompose", "conceptual", "openDecomposition", "band1", {
        answer: correct,
        answerType: "multiSelect",
        display: { promptText: openPhr()(w), options: shuffled([...correct, ...wrong], (cSeed += 1)), requiredCount: 2 },
      })
    );
  }

  // Band 1d — equal-parts split (doubles as decomposition).
  const halfPhr = rotor([
    (w) => `Split ${w} into two equal parts. What is each part?`,
    (w) => `${w} breaks into two parts that match exactly. How big is each part?`,
  ]);
  for (const w of [4, 6, 8, 10, 2]) {
    items.push(
      item("decompose", "conceptual", "equalSplit", "band1", {
        answer: w / 2,
        answerType: "numberPad",
        display: { whole: w, part: w / 2, promptText: halfPhr()(w) },
      })
    );
  }
  // Band 1e — frame shows a split of the whole (two colors, name a part).
  const splitReadPhr = rotor([
    (w, a) => `The ${w} counters come in two colors: ${a} red and some blue. How many counters are blue?`,
    (w, a) => `A frame splits ${w} counters into red and blue. Count past the ${a} red ones — how many blue counters are there?`,
    (w, a) => `${w} counters fill part of the frame; ${a} are red and the rest are blue. How many blue counters do you see?`,
  ]);
  for (const [a, b] of [[6, 2], [5, 4], [7, 2], [8, 3], [6, 3], [3, 4], [8, 2], [5, 3], [2, 4], [7, 3], [6, 4]]) {
    items.push(
      item("decompose", "conceptual", "frameSplitRead", "band1", {
        answer: b,
        answerType: "tenFrame",
        display: { filled: a, filledB: b, frames: 1, frameMode: "count", whole: a + b, part: a, promptText: splitReadPhr()(a + b, a) },
      })
    );
  }

  // Band 2a — open decomposition, teens.
  const openTeenPhr = rotor([
    (w) => `Select BOTH pairs that bond to ${w}.`,
    (w) => `Which two pairs both make ${w}? Choose them.`,
    (w) => `Exactly two pairs here total ${w}. Tap both of them.`,
  ]);
  for (const [w, p1, p2] of [[12, 3, 8], [13, 4, 9], [14, 5, 8], [15, 6, 9], [16, 7, 9], [11, 2, 8], [12, 5, 10], [14, 4, 11], [13, 6, 10], [15, 2, 8], [16, 4, 10], [11, 5, 9], [17, 8, 12], [18, 9, 13], [12, 2, 6]]) {
    const correct = [`${p1} and ${w - p1}`, `${p2} and ${w - p2}`];
    const wrong = [`${p1} and ${w - p1 + 1}`, `${p2} and ${w - p2 + 2}`];
    items.push(
      item("decompose", "conceptual", "openDecompositionTeen", "band2", {
        answer: correct,
        answerType: "multiSelect",
        display: { promptText: openTeenPhr()(w), options: shuffled([...correct, ...wrong], (cSeed += 1)), requiredCount: 2 },
      })
    );
  }

  // Band 2b — fact family: which subtraction sentences come from this bond.
  const famPhr = rotor([
    (w, p1, p2) => `A bond shows whole ${w} with parts ${p1} and ${p2}. Choose BOTH subtraction sentences it makes.`,
    (w, p1, p2) => `From the bond ${w} → ${p1} and ${p2}: select the two true subtraction sentences.`,
    (w, p1, p2) => `Whole ${w}, parts ${p1} and ${p2}. Which two take-away sentences match this bond?`,
  ]);
  for (const [w, p1] of [[12, 5], [13, 4], [14, 6], [15, 7], [16, 5], [11, 3], [17, 8], [18, 7], [13, 6], [15, 4], [12, 3], [16, 7], [19, 8], [14, 3], [11, 4]]) {
    const p2 = w - p1;
    const correct = [`${w} − ${p1} = ${p2}`, `${w} − ${p2} = ${p1}`];
    const wrong = [`${w} − ${p1} = ${p1}`, `${p1} − ${p2} = ${w}`];
    items.push(
      item("decompose", "conceptual", "factFamily", "band2", {
        answer: correct,
        answerType: "multiSelect",
        display: { promptText: famPhr()(w, p1, p2), options: shuffled([...new Set([...correct, ...wrong])], (cSeed += 1)), requiredCount: 2 },
      })
    );
  }

  // Band 2c — which split helps you make ten (strategy recognition, G1-M2).
  const strategyPhr = rotor([
    (a, n) => `To add ${a} + ${n} by making ten, how should ${n} split?`,
    (a, n) => `${a} wants to reach 10 first. Which split of ${n} lets ${a} + ${n} make a ten?`,
  ]);
  for (const [a, n] of [[9, 5], [8, 6], [9, 7], [8, 4], [7, 5], [9, 8], [8, 7], [7, 6], [9, 6], [8, 5]]) {
    const need = 10 - a;
    // Distractors are OTHER genuine splits of n (they just fail to make ten),
    // so every option sums to n — the assembler's split-item check relies on
    // the first number: only the correct option leads with `need`.
    const correct = `${need} and ${n - need}`;
    const wrong = [];
    for (let lead = 1; lead <= n - 1 && wrong.length < 2; lead += 1) {
      if (lead === need || lead === n - need) continue;
      wrong.push(`${lead} and ${n - lead}`);
    }
    items.push(
      item("decompose", "conceptual", "makeTenStrategy", "band2", {
        answer: correct,
        choices: shuffled([correct, ...wrong], (cSeed += 1)),
        display: { promptText: strategyPhr()(a, n) },
      })
    );
  }
  // Band 2d — judge a claimed bond, prose form (bands share T/F symbolic
  // claims with procedural; this wording is the conceptual twin).
  const judgePhr = rotor([
    (w, p1, p2) => `A friend says ${w} can split into ${p1} and ${p2}. Is that split right?`,
    (w, p1, p2) => `Can a whole of ${w} break into parts ${p1} and ${p2}?`,
  ]);
  for (const [w, p1, p2, truthy] of [[13, 6, 7, true], [15, 8, 6, false], [12, 9, 3, true], [16, 7, 8, false], [14, 5, 9, true], [11, 6, 6, false], [17, 9, 8, true], [18, 9, 8, false], [12, 4, 8, true], [19, 9, 9, false]]) {
    items.push(
      item("decompose", "conceptual", "judgeSplit", "band2", {
        answer: truthy ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: judgePhr()(w, p1, p2) },
      })
    );
  }

  // Band 3a — three-branch place-value bonds with a missing branch,
  // including the zero-trap numbers (G2-M3: 305, 330).
  const branchPhr = rotor([
    (n, h, o) => `Split ${n} into hundreds, tens, and ones: ${h}, ?, ${o}. What goes in the middle?`,
    (n, h, o) => `${n} breaks into three parts by place: ${h}, a mystery part, and ${o}. What is the mystery part?`,
    (n, h, o) => `The place-value bond of ${n} shows ${h} and ${o} but hides the tens part. What is the tens part?`,
    (n, h, o) => `Three branches split ${n}: ${h}, a covered branch, and ${o}. What number is covered?`,
    (n, h, o) => `${n} = ${h} + ___ + ${o}. What belongs in the blank?`,
  ]);
  const branchData = [[263, 200, 3], [548, 500, 8], [721, 700, 1], [356, 300, 6], [489, 400, 9], [634, 600, 4], [872, 800, 2], [917, 900, 7], [305, 300, 5], [406, 400, 6], [180, 100, 0], [750, 700, 0], [292, 200, 2], [563, 500, 3], [814, 800, 4], [327, 300, 7], [451, 400, 1], [689, 600, 9], [738, 700, 8], [942, 900, 2], [516, 500, 6]];
  for (const [n, h, o] of branchData) {
    items.push(
      item("decompose", "conceptual", "threeBranchPlace", "band3", {
        answer: n - h - o,
        answerType: "numberPad",
        display: { whole: n, parts: [h, o], promptText: branchPhr()(n, h, o) },
      })
    );
  }

  // Band 3b — both valid splits of a two-digit number (canonical + take-out-
  // ten), multi-select.
  const splitPhr = rotor([
    (n) => `Choose BOTH correct ways to split ${n}.`,
    (n) => `Two of these are real splits of ${n}. Select both.`,
    (n) => `Which two bonds show ${n} correctly?`,
    (n) => `Pick the two part-pairs that really make ${n}.`,
  ]);
  for (const n of [34, 47, 52, 68, 71, 85, 93, 26, 59, 38, 64, 76, 81, 43, 97, 29, 56, 62, 78, 87]) {
    const d = Math.floor(n / 10) * 10;
    const o = n - d;
    const correct = [`${d} and ${o}`, `${n - 10} and 10`];
    const wrong = [`${d} and ${o + 1}`, `${d + 10} and ${o}`];
    items.push(
      item("decompose", "conceptual", "twoSplitsOfN", "band3", {
        answer: correct,
        answerType: "multiSelect",
        display: { promptText: splitPhr()(n), options: shuffled([...correct, ...wrong], (cSeed += 1)), requiredCount: 2 },
      })
    );
  }

  // Band 3c — which split helps the strategy at magnitude (G1-M4 L18
  // critique: both splits are legal; the QUESTION names the goal).
  const goalPhr = rotor([
    (x, n) => `To add ${x} + ${n} by making the next ten, how should ${n} split?`,
    (x, n) => `${x} + ${n}: which split of ${n} reaches the next ten first?`,
  ]);
  for (const [x, n] of [[39, 4], [58, 5], [27, 6], [49, 7], [68, 4], [77, 5], [19, 6], [88, 7], [37, 7], [56, 8]]) {
    const need = 10 - (x % 10);
    const correct = `${need} and ${n - need}`;
    const wrong = [];
    for (let lead = 1; lead <= n - 1 && wrong.length < 2; lead += 1) {
      if (lead === need || lead === n - need) continue;
      wrong.push(`${lead} and ${n - lead}`);
    }
    items.push(
      item("decompose", "conceptual", "nextTenStrategy", "band3", {
        answer: correct,
        choices: shuffled([correct, ...wrong], (cSeed += 1)),
        display: { promptText: goalPhr()(x, n) },
      })
    );
  }

  return items;
}

export function buildDeterministicItems() {
  return [
    ...missingPartProcedural(),
    ...partWholeProcedural(),
    ...decomposeProcedural(),
    ...partWholeConceptual(),
    ...missingPartConceptual(),
    ...decomposeConceptual(),
  ];
}
