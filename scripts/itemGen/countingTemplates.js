/* Deterministic counting bank items — the procedural and conceptual cells.
 *
 * Design source: docs/counting-bank-design.md (EngageNY GK-M1, GK-M3 E-G,
 * GK-M5, G1-M6 B pattern survey). Structural inspiration only — all wording
 * original.
 *
 * Payload convention (enforced by the `countMath` QC check):
 *   - op is always "count"; a/b stay null.
 *   - numeric-answer items carry `display.counting = { kind, ...givens }`;
 *     the gate recomputes the answer from it, and the assembler requires
 *     every given to be stated in the prompt or pictured (emoji run / figure /
 *     ten frame).
 *   - judged Yes/No items carry `display.truth`; the assembler checks it.
 *
 * Rendering:
 *   - `display.{emoji,count}` → the object-set figure (rows of ten, five-split)
 *     on web AND iOS; the promptText is then a caption for admin/uniqueness.
 *   - emoji runs inside promptText → the emoji-run prompt path (labels +
 *     rows of ≤10; "|" separates rows).
 *   - `display.{sequence,step}` → "What comes next?" + a unit-step number line.
 *   - `display.numberLine.marks` → count-on scaffold under a verbal prompt.
 *   - frames ONLY through `answerType: "tenFrame"`.
 *
 * Signature caps (findPromptOveruse): conceptual 5 per (mode::subskill::
 * family) bucket ACROSS bands; letter-free prompts have no signature. Prose
 * conceptual templates therefore carry a noun and/or a child's name, and
 * rotate phrasings.
 *
 * Gate traps this file designs around:
 *   - structureMatch: the answer numeral may not appear in prose unless the
 *     prompt has a `?`/`_` slot — so captions never state the count.
 *   - bandAppropriate: band-1 prompts never state a number above 20.
 *   - nounlessQuestion: never a bare "How many?".
 *   - promptLength ≤ 220 chars (emoji count as 2).
 */

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => ({
  modeId: "counting",
  subskill,
  itemFamily: family,
  structureType,
  levelRange: LEVELS[band],
  question: { a: null, b: null, op: "count", ...question },
});

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled(arr, seed) {
  const rng = mulberry32(seed);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const glyphCount = (s) => Array.from(String(s)).filter((ch) => /\p{Extended_Pictographic}/u.test(ch)).length;

// A tiny rotor: hands out phrasings so no single template wording carries
// more than `cap` items across the whole bucket.
// Round-robin phrasing cycler. Even distribution maximizes signature
// diversity; the assembler's findPromptOveruse pass is the authoritative
// cap check (phrasings with a rotating noun/name are one signature EACH,
// so a hard per-phrasing cap here would throttle far too early).
export function rotor(phrasings) {
  let i = 0;
  return () => phrasings[i++ % phrasings.length];
}

/* ----- object vocabulary ------------------------------------------- */

// Two disjoint pools so a subitizing caption and a cardinality caption with
// the same count never collide on promptText.
export const SUB_OBJECTS = [
  { emoji: "🟠", noun: "dots" },
  { emoji: "⭐", noun: "stars" },
  { emoji: "🔵", noun: "blue dots" },
  { emoji: "🟢", noun: "green dots" },
  { emoji: "🍪", noun: "cookies" },
  { emoji: "🐤", noun: "chicks" },
];
export const CARD_OBJECTS = [
  { emoji: "🍎", noun: "apples" },
  { emoji: "🐟", noun: "fish" },
  { emoji: "🌸", noun: "flowers" },
  { emoji: "🐢", noun: "turtles" },
  { emoji: "🎈", noun: "balloons" },
  { emoji: "🦋", noun: "butterflies" },
  { emoji: "🍓", noun: "berries" },
  { emoji: "⚽", noun: "balls" },
  { emoji: "🚗", noun: "cars" },
];
export const NAMES = ["Sam", "Mina", "Luca", "Nia", "Theo", "Ava", "Kai", "Ida", "Omar", "June", "Zoe", "Ben", "Lily", "Rosa", "Finn", "Amara", "Diego", "Priya", "Leo", "Nora"];
const nameAt = (i) => NAMES[i % NAMES.length];

export const run = (emoji, n) => emoji.repeat(n);
// Five-group: five, a space, the rest (GK-M1 5-group cards).
export const fiveGroup = (emoji, n) => (n <= 5 ? run(emoji, n) : `${run(emoji, 5)} ${run(emoji, n - 5)}`);
// Rows of ten separated by "|" (the prompt layout drops the bar and breaks
// the line; the figure renderer draws rows of ten on its own).
export const tenRows = (emoji, n) => {
  const rows = [];
  for (let s = 0; s < n; s += 10) rows.push(run(emoji, Math.min(10, n - s)));
  return rows.join(" | ");
};

const figure = (emoji, n, band, subskill, structureType, caption) =>
  item(subskill, "procedural", structureType, band, {
    answer: n,
    answerType: "numberPad",
    display: { emoji, count: n, counting: { kind: "set", count: n }, promptText: caption },
  });

const frame = (subskill, family, structureType, band, { filled, frames = 1, mode = "count", answer, counting, promptText, extra = {} }) =>
  item(subskill, family, structureType, band, {
    answer,
    answerType: "tenFrame",
    display: { filled, frames, frameMode: mode, counting, promptText, ...extra },
  });

/* ================================================================== */
/* SUBITIZING                                                         */
/* ================================================================== */

export function subitizingProcedural() {
  const items = [];

  // Band 1 — small sets read at a glance (2-5), 5-groups for 6-10, and
  // single ten-frame reads. Letter-free captions keep these numeric-first.
  for (const { emoji } of SUB_OBJECTS) {
    for (let n = 2; n <= 5; n += 1) items.push(figure(emoji, n, "band1", "subitizing", "smallSetRead", `${run(emoji, n)} = ?`));
  }
  for (const { emoji } of SUB_OBJECTS.slice(0, 5)) {
    for (let n = 6; n <= 10; n += 1) items.push(figure(emoji, n, "band1", "subitizing", "fiveGroupRead", `${fiveGroup(emoji, n)} = ?`));
  }
  const framePhr = [
    "How many counters are in the ten frame?",
    "Count the counters in the frame. How many counters are there?",
    "Look at the ten frame. How many counters do you see?",
    "How many counters fill the frame?",
    "Read the frame: how many counters is that?",
    "The frame shows some counters. How many counters are shown?",
    "How many counters sit in the ten frame?",
    "Quick look! How many counters are in the frame?",
    "Count the top row, then the rest. How many counters in all?",
    "Five and some more? Or fewer? How many counters are in the frame?",
  ];
  for (let n = 1; n <= 10; n += 1) {
    items.push(frame("subitizing", "procedural", "tenFrameRead", "band1", { filled: n, answer: n, counting: { kind: "set", count: n }, promptText: framePhr[n - 1] }));
  }

  // Band 2 — ten and some more (GK-M5 Topic A: a full row of ten, then the
  // rest), two 5-groups, two-frame teen reads.
  for (const { emoji } of SUB_OBJECTS.slice(0, 3)) {
    for (let n = 11; n <= 20; n += 1) items.push(figure(emoji, n, "band2", "subitizing", "tenAndMoreRead", `${tenRows(emoji, n)} = ?`));
  }
  for (const { emoji } of SUB_OBJECTS.slice(3, 6)) {
    // Two five-rows (row split, not the in-row 5-group gap) — also keeps the
    // caption distinct from band-1 fiveGroupRead.
    for (let n = 6; n <= 10; n += 1) items.push(figure(emoji, n, "band2", "subitizing", "doubleFiveRead", `${run(emoji, 5)} | ${run(emoji, n - 5)} = ?`));
  }
  const twoFramePhr = [
    "Two ten frames. How many counters are there in all?",
    "The top frame is full. How many counters are in both frames together?",
    "Count ten, then count on. How many counters do the frames show?",
    "How many counters are in the two frames?",
    "A full frame and a part frame. How many counters altogether?",
    "Read both frames. How many counters is that?",
    "Ten and some more: how many counters are shown?",
    "How many counters do you see across both frames?",
    "Two frames hold the counters. How many counters are there?",
    "Say ten, then keep counting. How many counters in total?",
  ];
  for (let n = 11; n <= 20; n += 1) {
    items.push(frame("subitizing", "procedural", "twoFrameRead", "band2", { filled: n, frames: 2, answer: n, counting: { kind: "set", count: n }, promptText: twoFramePhr[n - 11] }));
  }

  // Band 3 — rows of ten to 50 (GK-M5 Topic D dot paths): count the full
  // rows, then the rest.
  for (const { emoji } of SUB_OBJECTS.slice(0, 2)) {
    for (let n = 21; n <= 50; n += 1) items.push(figure(emoji, n, "band3", "subitizing", "tensRowsRead", `${tenRows(emoji, n)} = ?`));
  }

  return items;
}

export function subitizingConceptual() {
  const items = [];
  let seed = 1000;
  const yesNo = (subskill, structureType, band, promptText, truth) =>
    item(subskill, "conceptual", structureType, band, {
      answer: truth ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { promptText, truth },
    });

  // Band 1a — conservation: same count, two arrangements (GK-M1 Topic C/F).
  const samePhr = rotor([
    (o, A, B) => `Group A: ${A} Group B: ${B} Do both groups have the same number of ${o.noun}?`,
    (o, A, B) => `Top row: ${A} Bottom row: ${B} Is the number of ${o.noun} the same in both rows?`,
    (o, A, B) => `Left: ${A} Right: ${B} Are there the same number of ${o.noun} on each side?`,
    (o, A, B) => `First pile: ${A} Second pile: ${B} Do the piles hold the same number of ${o.noun}?`,
  ]);
  const samePairs = [[4, 4], [5, 6], [6, 6], [7, 6], [8, 8], [5, 5], [9, 8], [7, 7], [3, 4], [6, 5], [8, 9], [9, 9], [4, 5], [7, 8], [5, 4], [6, 7], [8, 7], [3, 3]];
  samePairs.forEach(([a, b], i) => {
    const o = SUB_OBJECTS[i % SUB_OBJECTS.length];
    const A = a <= 5 ? run(o.emoji, a) : fiveGroup(o.emoji, a);
    items.push(yesNo("subitizing", "sameNumberJudge", "band1", samePhr()(o, A, run(o.emoji, b)), a === b));
  });

  // Band 1b — which group shows N (dot-card ↔ numeral matching).
  const whichPhr = rotor([
    (o, n) => `Which group shows ${n} ${o.noun}?`,
    (o, n) => `Find the group with exactly ${n} ${o.noun}.`,
    (o, n) => `Tap the card that shows ${n} ${o.noun}.`,
  ]);
  for (const [i, n] of [3, 4, 5, 6, 7, 8, 5, 6, 7, 4, 8, 3].entries()) {
    const o = SUB_OBJECTS[i % SUB_OBJECTS.length];
    const wrong = [n - 1, n + 1, n + 2].filter((w) => w >= 1);
    items.push(
      item("subitizing", "conceptual", "whichShowsN", "band1", {
        answer: run(o.emoji, n),
        choices: shuffled([run(o.emoji, n), ...wrong.map((w) => run(o.emoji, w))], (seed += 1)),
        display: { promptText: whichPhr()(o, n) },
      })
    );
  }

  // Band 1c — judge a claimed count (See-Count-Write with a wrong friend).
  const claimPhr = rotor([
    (nm, o, k, R) => `${nm} says there are ${k} ${o.noun}: ${R} Is ${nm} right?`,
    (nm, o, k, R) => `${nm} takes a quick look and says "${k} ${o.noun}". ${R} Is that right?`,
  ]);
  [[5, 5], [6, 7], [4, 4], [7, 6], [8, 8], [9, 10], [3, 3], [6, 6], [7, 8], [5, 4], [10, 10], [8, 9]].forEach(([n, k], i) => {
    const o = SUB_OBJECTS[i % SUB_OBJECTS.length];
    items.push(yesNo("subitizing", "claimCountJudge", "band1", claimPhr()(nameAt(i), o, k, fiveGroup(o.emoji, n)), n === k));
  });

  // Band 1d — five and some more, seen not counted (GK-M1 Topic F).
  const fivePhr = rotor([
    (o, R) => `Five ${o.noun} and some more: ${R} How many ${o.noun} in all?`,
    (o, R) => `A row of five ${o.noun}, then a few more: ${R} How many ${o.noun} are there?`,
  ]);
  for (const [i, n] of [6, 7, 8, 9, 10, 6, 7, 8, 9, 10].entries()) {
    const o = SUB_OBJECTS[i % 5];
    items.push(
      item("subitizing", "conceptual", "fiveAndMoreSee", "band1", {
        answer: n,
        answerType: "numberPad",
        display: { counting: { kind: "set", count: n }, promptText: fivePhr()(o, fiveGroup(o.emoji, n)) },
      })
    );
  }

  // Band 2a — estimate, then count (about how many).
  const estPhr = rotor([
    (o, R) => `A jar holds these ${o.noun}: ${R} About how many ${o.noun} is that?`,
    (o, R) => `Take a quick look, no counting: ${R} About how many ${o.noun} do you see?`,
    (o, R) => `${R} Estimate: about how many ${o.noun} are there?`,
  ]);
  const estimate = (band, structureType, counts) => {
    counts.forEach((n, i) => {
      const o = SUB_OBJECTS[i % SUB_OBJECTS.length];
      const target = Math.round(n / 10) * 10;
      const options = [...new Set([target, target + 10, target + 20, target - 10, target + 30].filter((v) => v > 0))].slice(0, 4);
      items.push(
        item("subitizing", "conceptual", structureType, band, {
          answer: target,
          choices: shuffled(options, (seed += 1)),
          display: { promptText: estPhr()(o, tenRows(o.emoji, n)) },
        })
      );
    });
  };
  estimate("band2", "estimateThenCount", [12, 18, 21, 23, 19, 28, 13, 22, 17, 29, 11, 24]);

  // Band 2b — odd one out across representations of the same quantity.
  const oddPhr = rotor([
    (o, t) => `Three of these show ${t} ${o.noun}. Which one does NOT?`,
    (o, t) => `One card does not show ${t} ${o.noun}. Which card is it?`,
  ]);
  const oddOneOut = (band, structureType, targets) => {
    targets.forEach((t, i) => {
      const o = SUB_OBJECTS[i % SUB_OBJECTS.length];
      const others = SUB_OBJECTS.filter((x) => x !== o);
      const e2 = others[(i + 1) % others.length].emoji;
      const e3 = others[(i + 3) % others.length].emoji;
      const odd = fiveGroup(e3, t + 1);
      items.push(
        item("subitizing", "conceptual", structureType, band, {
          answer: odd,
          choices: shuffled([fiveGroup(o.emoji, t), fiveGroup(e2, t), String(t), odd], (seed += 1)),
          display: { promptText: oddPhr()(o, t) },
        })
      );
    });
  };
  oddOneOut("band2", "oddOneOutCount", [4, 5, 6, 7, 8, 9, 6, 7, 5, 8]);

  // Band 2c — judge a teen claim shown as ten-and-more rows.
  const teenClaimPhr = rotor([
    (nm, o, k, R) => `${nm} counts a full row of ten, then the rest, and says ${k} ${o.noun}. ${R} Is ${nm} right?`,
    (nm, o, k, R) => `${nm} says these ${o.noun} make ${k}: ${R} Is that right?`,
  ]);
  [[13, 13], [14, 15], [12, 12], [16, 15], [17, 17], [18, 19], [15, 15], [11, 12], [19, 19], [14, 14], [16, 16], [13, 14]].forEach(([n, k], i) => {
    const o = SUB_OBJECTS[(i + 2) % SUB_OBJECTS.length];
    items.push(yesNo("subitizing", "claimTeenJudge", "band2", teenClaimPhr()(nameAt(i + 5), o, k, tenRows(o.emoji, n)), n === k));
  });

  // Band 2d — ten and some more, seen (GK-M5 "10 ones and some ones").
  const tenMorePhr = rotor([
    (o, R) => `A full ten of ${o.noun} and some more: ${R} How many ${o.noun} in all?`,
    (o, R) => `The top row is a full ten. ${R} How many ${o.noun} are there altogether?`,
    (o, R) => `Say ten for the full row, then count on: ${R} How many ${o.noun} is that?`,
  ]);
  for (const [i, n] of [11, 12, 13, 14, 15, 16, 17, 18, 19, 13, 16, 12].entries()) {
    const o = SUB_OBJECTS[(i + 1) % SUB_OBJECTS.length];
    items.push(
      item("subitizing", "conceptual", "tenAndMoreSee", "band2", {
        answer: n,
        answerType: "numberPad",
        display: { counting: { kind: "set", count: n }, promptText: tenMorePhr()(o, tenRows(o.emoji, n)) },
      })
    );
  }

  // Band 2e — which group shows a teen number.
  const whichTeenPhr = rotor([
    (o, n) => `Which group shows ${n} ${o.noun}?`,
    (o, n) => `Pick the group with ${n} ${o.noun}. Count the full ten first.`,
  ]);
  for (const [i, n] of [12, 13, 14, 15, 16, 17, 18, 11].entries()) {
    const o = SUB_OBJECTS[(i + 4) % SUB_OBJECTS.length];
    const show = (k) => `${run(o.emoji, 10)} ${run(o.emoji, k - 10)}`;
    items.push(
      item("subitizing", "conceptual", "whichShowsTeen", "band2", {
        answer: show(n),
        choices: shuffled([show(n), show(n - 1), show(n + 1), show(n + 2)], (seed += 1)),
        display: { promptText: whichTeenPhr()(o, n) },
      })
    );
  }

  // Band 3 — bigger estimates, odd-one-out with teens, judged rows of ten,
  // tens-and-ones reads, and rows → numeral choice.
  estimate("band3", "estimateThenCountBig", [32, 27, 36, 38, 34, 31, 26, 33, 39, 42, 24, 37]);
  oddOneOut("band3", "oddOneOutTeen", [11, 12, 13, 14, 12, 11, 13, 14]);
  const rowsClaimPhr = rotor([
    (nm, o, k, R) => `${nm} counts the rows of ten and says ${k} ${o.noun}. ${R} Is ${nm} right?`,
    (nm, o, k, R) => `${nm} says these rows show ${k} ${o.noun}: ${R} Is that right?`,
  ]);
  [[23, 23], [34, 33], [31, 31], [42, 43], [27, 27], [36, 26], [45, 45], [29, 30], [38, 38], [24, 34], [41, 41], [33, 32]].forEach(([n, k], i) => {
    const o = SUB_OBJECTS[(i + 3) % SUB_OBJECTS.length];
    items.push(yesNo("subitizing", "claimTensRowsJudge", "band3", rowsClaimPhr()(nameAt(i + 9), o, k, tenRows(o.emoji, n)), n === k));
  });
  const rowsSeePhr = rotor([
    (o, R) => `Count the full rows of ten ${o.noun}, then the rest: ${R} How many ${o.noun} are there?`,
    (o, R) => `Each full row holds ten ${o.noun}. ${R} How many ${o.noun} in all?`,
    (o, R) => `Say ten, twenty, thirty for the full rows, then count on: ${R} How many ${o.noun} is that?`,
  ]);
  for (const [i, n] of [21, 25, 32, 37, 43, 48, 24, 39, 46, 28, 35, 41].entries()) {
    const o = SUB_OBJECTS[(i + 2) % SUB_OBJECTS.length];
    items.push(
      item("subitizing", "conceptual", "tensAndOnesSee", "band3", {
        answer: n,
        answerType: "numberPad",
        display: { counting: { kind: "set", count: n }, promptText: rowsSeePhr()(o, tenRows(o.emoji, n)) },
      })
    );
  }
  const rowsChoicePhr = rotor([
    (o, R) => `Which number do these rows of ${o.noun} show? ${R}`,
    (o, R) => `${R} Choose the number of ${o.noun} shown.`,
  ]);
  for (const [i, n] of [22, 26, 31, 34, 38, 42, 45, 47, 29, 36].entries()) {
    const o = SUB_OBJECTS[(i + 5) % SUB_OBJECTS.length];
    items.push(
      item("subitizing", "conceptual", "rowsToNumeral", "band3", {
        answer: n,
        choices: shuffled([n, n + 10, n - 10, n + 1], (seed += 1)),
        display: { promptText: rowsChoicePhr()(o, tenRows(o.emoji, n)) },
      })
    );
  }

  return items;
}

/* ================================================================== */
/* COUNT ON                                                           */
/* ================================================================== */

const seqItem = (structureType, band, seq, step) =>
  item("countOn", "procedural", structureType, band, {
    answer: seq[seq.length - 1] + step,
    answerType: "numberPad",
    display: { sequence: seq, step, counting: { kind: "next", sequence: seq, step }, promptText: `${seq.join(", ")}, ?` },
  });

const countOnItem = (band, start, more, structureType = "countOnFromGiven") =>
  item("countOn", "procedural", structureType, band, {
    answer: start + more,
    answerType: "numberPad",
    display: {
      numberLine: { marks: [start] },
      counting: { kind: "countOn", start, more },
      promptText: `Start at ${start} and count on ${more} more. What number do you land on?`,
    },
  });

export function countOnProcedural() {
  const items = [];

  // Band 1 — next number (number after), count back, count on from a given
  // number within 20 (Happy Counting / Green Light–Red Light).
  for (let a = 1; a <= 17; a += 1) items.push(seqItem("nextNumber", "band1", [a, a + 1, a + 2], 1));
  for (let a = 4; a <= 20; a += 1) items.push(seqItem("countBackNext", "band1", [a, a - 1, a - 2], -1));
  for (let start = 2; start <= 9; start += 1) {
    for (let more = 2; more <= 4; more += 1) items.push(countOnItem("band1", start, more));
  }

  // Band 2 — decade crossings both ways within 100 (GK-M5 Topic D), plus
  // within-decade runs and count-on from two-digit starts.
  for (let d = 20; d <= 90; d += 10) {
    items.push(seqItem("nextAcrossDecade", "band2", [d - 2, d - 1, d], 1));
    items.push(seqItem("nextAcrossDecade", "band2", [d - 1, d, d + 1], 1));
    items.push(seqItem("backAcrossDecade", "band2", [d + 2, d + 1, d], -1));
    items.push(seqItem("backAcrossDecade", "band2", [d + 1, d, d - 1], -1));
  }
  for (const a of [22, 35, 43, 51, 64, 76, 83, 94, 26, 57]) items.push(seqItem("nextWithinDecade", "band2", [a, a + 1, a + 2], 1));
  for (const a of [27, 38, 46, 55, 69, 74, 87, 95]) items.push(seqItem("backWithinDecade", "band2", [a, a - 1, a - 2], -1));
  for (const [start, more] of [[17, 3], [26, 4], [38, 2], [45, 5], [59, 2], [63, 3], [78, 4], [86, 3], [29, 3], [47, 5], [68, 2], [94, 4], [35, 4], [52, 3], [71, 5], [88, 2]]) {
    items.push(countOnItem("band2", start, more, "countOnFromTwoDigit"));
  }

  // Band 3 — crossing 100 and 110 both ways (G1-M6 Topic B: 1–20 repeats as
  // 101–120), and count on with bigger jumps.
  for (let a = 95; a <= 117; a += 1) items.push(seqItem("nextAcrossHundred", "band3", [a, a + 1, a + 2], 1));
  for (let a = 100; a <= 120; a += 1) items.push(seqItem("backAcrossHundred", "band3", [a, a - 1, a - 2], -1));
  for (const [start, more] of [[37, 6], [48, 7], [56, 8], [65, 9], [74, 6], [83, 7], [92, 8], [96, 6], [97, 9], [99, 5], [104, 7], [108, 6], [113, 5], [58, 9], [79, 6], [87, 8]]) {
    items.push(countOnItem("band3", start, more, "countOnBigJump"));
  }

  return items;
}

export function countOnConceptual() {
  const items = [];
  const yesNo = (structureType, band, promptText, truth) =>
    item("countOn", "conceptual", structureType, band, {
      answer: truth ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { promptText, truth },
    });
  const numeric = (structureType, band, promptText, answer, counting, extra = {}) =>
    item("countOn", "conceptual", structureType, band, {
      answer,
      answerType: "numberPad",
      display: { counting, promptText, ...extra },
    });

  // Missing number in a short run (Beep Number): the blank moves; the
  // child's name keeps every wording under the signature cap.
  const missingPhr = rotor([
    (nm, shown) => `${nm} counts: ${shown}. Which number did ${nm} skip?`,
    (nm, shown) => `Beep! ${nm} covered one number: ${shown}. What number is under the cover?`,
    (nm, shown) => `${nm} writes the count but leaves a gap: ${shown}. What number fills the gap?`,
    (nm, shown) => `Help ${nm} finish the count: ${shown}. What is the missing number?`,
  ]);
  const missing = (structureType, band, starts, blanks) => {
    starts.forEach((start, i) => {
      const blank = blanks[i % blanks.length];
      const seq = [start, start + 1, start + 2, start + 3, start + 4];
      const shown = seq.map((n, j) => (j === blank ? "___" : n)).join(", ");
      items.push(numeric(structureType, band, missingPhr()(nameAt(i + 2), shown), seq[blank], { kind: "between", before: seq[blank] - 1, after: seq[blank] + 1 }));
    });
  };
  // Band 1 — number after, then between, then before (GK-M1 G/H ordering).
  missing("missingInRun", "band1", [1, 3, 5, 7, 9, 11, 13, 2, 4, 6, 8, 10, 12, 14, 15, 16], [1, 2, 3]);

  // One more / one less (GK-M1 Topics G–H), number after / before.
  const morePhr = rotor([
    (n) => `What number is 1 more than ${n}?`,
    (n) => `Say the number that comes right after ${n}.`,
    (n) => `${n}, and 1 more. What number is that?`,
    (n) => `Which number comes just after ${n}?`,
    (n) => `${n} and then one more — what number is next?`,
    (n) => `Add one to ${n}. What do you get?`,
  ]);
  const lessPhr = rotor([
    (n) => `What number is 1 less than ${n}?`,
    (n) => `Say the number that comes right before ${n}.`,
    (n) => `Count back 1 from ${n}. What number do you say?`,
    (n) => `Which number comes just before ${n}?`,
    (n) => `Take one away from ${n}. What number is left?`,
    (n) => `${n} minus one is what number?`,
  ]);
  const moreLess = (structureType, band, ns, delta) => {
    for (const n of ns) {
      const phr = delta > 0 ? morePhr : lessPhr;
      items.push(numeric(structureType, band, phr()(n), n + delta, { kind: "moreLess", n, delta }));
    }
  };
  moreLess("oneMore", "band1", [4, 7, 9, 12, 15, 18, 6, 11, 14, 19], 1);
  moreLess("oneLess", "band1", [5, 8, 10, 13, 16, 20, 7, 12, 17, 3], -1);

  // Between two numbers.
  const betweenPhr = rotor([
    (a, b) => `Which number is between ${a} and ${b}?`,
    (a, b) => `${a}, ___, ${b}. What number goes in the middle?`,
    (a, b) => `What number comes after ${a} and before ${b}?`,
    (a, b) => `A number hides between ${a} and ${b}. What is it?`,
    (a, b) => `Count from ${a}: which number lands between ${a} and ${b}?`,
  ]);
  const between = (structureType, band, befores) => {
    for (const a of befores) items.push(numeric(structureType, band, betweenPhr()(a, a + 2), a + 1, { kind: "between", before: a, after: a + 2 }));
  };
  between("betweenTwo", "band1", [3, 6, 8, 11, 14, 17]);

  // Make ten on a frame by doing it (count on to ten).
  const makeTenPhr = rotor([
    "Fill the frame to make 10. How many counters did you add?",
    "Tap empty cells until the frame holds 10. How many counters did you put in?",
    "Count on to 10 by adding counters. How many counters did you add?",
    "Make it 10! How many counters did you need to add?",
    "The frame is not full. Fill it to 10 — how many counters did you place?",
    "Keep adding counters until you reach 10. How many counters was that?",
    "Finish the ten. How many counters did you add to the frame?",
  ]);
  [3, 4, 5, 6, 7, 8, 9].forEach((have) => {
    items.push(frame("countOn", "conceptual", "tenFrameMakeTen", "band1", { filled: have, mode: "build", answer: 10 - have, counting: { kind: "gap", have, target: 10 }, promptText: makeTenPhr() }));
  });

  // Judge a count-on: counting on from the start vs recounting the start.
  const judgePhr = rotor([
    (nm, o, have, more, said) => `${nm} has ${have} ${o.noun} and gets ${more} more. ${nm} counts on: ${said}. Is that right?`,
    (nm, o, have, more, said) => `${nm} holds ${have} ${o.noun}. A friend hands over ${more} more. ${nm} says ${said}. Is ${nm} counting on correctly?`,
  ]);
  const judgeCountOn = (structureType, band, cases) => {
    cases.forEach(([have, more, ok], i) => {
      const o = CARD_OBJECTS[i % CARD_OBJECTS.length];
      const said = ok
        ? Array.from({ length: more }, (_, k) => have + k + 1).join(", ")
        : Array.from({ length: more }, (_, k) => have + k).join(", ");
      items.push(yesNo(structureType, band, judgePhr()(nameAt(i + 7), o, have, more, said), ok));
    });
  };
  judgeCountOn("countOnJudge", "band1", [[6, 3, true], [5, 3, false], [8, 2, true], [7, 4, false], [4, 3, true], [9, 2, false], [6, 4, true], [8, 3, false], [5, 2, true], [7, 3, false]]);

  // Band 2 — the same shapes across decades within 100, plus hidden counts.
  missing("missingAcrossDecade", "band2", [18, 27, 38, 47, 58, 66, 77, 88, 19, 29, 39, 49, 59, 69, 79, 89], [2, 3, 1]);
  moreLess("oneMoreDecade", "band2", [29, 39, 49, 59, 69, 79, 89, 24, 45, 67], 1);
  moreLess("oneLessDecade", "band2", [30, 40, 50, 60, 70, 80, 90, 36, 58, 73], -1);
  between("betweenDecade", "band2", [19, 29, 39, 49, 59, 69, 79, 89, 34, 56]);
  const hiddenPhr = rotor([
    (o, t, s) => `There are ${t} ${o.noun} in all. You can see ${s} ${o.noun}. The rest are under the cup. How many ${o.noun} are hidden?`,
    (o, t, s) => `${t} ${o.noun} were on the table. Now only ${s} ${o.noun} show; a cloth covers the others. How many ${o.noun} are covered?`,
    (o, t, s) => `A bag held ${t} ${o.noun}. ${s} ${o.noun} spilled out where you can count them. How many ${o.noun} are still in the bag?`,
  ]);
  const hidden = (structureType, band, pairs) => {
    pairs.forEach(([t, s], i) => {
      const o = CARD_OBJECTS[(i + 3) % CARD_OBJECTS.length];
      items.push(numeric(structureType, band, hiddenPhr()(o, t, s), t - s, { kind: "hidden", total: t, seen: s }));
    });
  };
  hidden("hiddenCountSplat", "band2", [[12, 8], [15, 9], [14, 6], [18, 11], [13, 9], [16, 12], [17, 8], [20, 14], [11, 7], [19, 13], [15, 6], [14, 10]]);
  const decadeJudgePhr = rotor([
    (nm, said) => `${nm} counts: ${said}. Is that right?`,
    (nm, said) => `Listen to ${nm} count: ${said}. Did ${nm} count correctly?`,
  ]);
  [[27, true], [37, false], [48, true], [58, false], [68, true], [78, false], [88, true], [18, false], [98, false], [38, true]].forEach(([a, ok], i) => {
    const seq = ok ? [a, a + 1, a + 2, a + 3] : [a, a + 1, a + 2, a + 2 - 10];
    items.push(yesNo("decadeCrossingJudge", "band2", decadeJudgePhr()(nameAt(i + 11), seq.join(", ")), ok));
  });

  // Band 3 — crossing 100 and 110, error analysis at the century.
  missing("missingAcrossHundred", "band3", [96, 97, 98, 99, 106, 107, 108, 109, 110, 114, 115, 116, 97, 99, 108, 113], [3, 1, 2]);
  moreLess("oneMoreHundred", "band3", [99, 100, 104, 109, 110, 113, 117, 119, 98, 106], 1);
  moreLess("oneLessHundred", "band3", [100, 101, 105, 110, 111, 114, 118, 120, 103, 108], -1);
  between("betweenHundred", "band3", [99, 100, 104, 108, 109, 111, 115, 118]);
  hidden("hiddenCountBig", "band3", [[24, 15], [30, 18], [26, 19], [35, 22], [40, 27], [28, 16], [32, 25], [45, 29], [50, 36], [38, 21]]);
  [[98, true], [99, false], [108, true], [109, false], [97, true], [99, true], [109, true], [118, false], [107, false], [116, true]].forEach(([a, ok], i) => {
    const seq = ok ? [a, a + 1, a + 2, a + 3] : a === 99 ? [99, 100, 200, 300] : a === 109 ? [109, 110, 120, 130] : [a, a + 1, a + 2, a + 3 + 10];
    items.push(yesNo("centuryCrossingJudge", "band3", decadeJudgePhr()(nameAt(i + 13), seq.join(", ")), ok));
  });

  return items;
}

/* ================================================================== */
/* CARDINALITY                                                        */
/* ================================================================== */

export function cardinalityProcedural() {
  const items = [];

  // Band 1 — count a set, write the numeral (K.CC.3/5) and count OUT a set
  // by matching a picture one-to-one on the frame (GK-M1: counting out is
  // harder than counting an existing set).
  for (const { emoji } of CARD_OBJECTS.slice(0, 6)) {
    for (let n = 3; n <= 10; n += 1) items.push(figure(emoji, n, "band1", "cardinality", "setCountWrite", `${run(emoji, n)} = ?`));
  }
  const buildPhr = rotor([
    (o, R) => `Put one counter in the frame for each of these ${o.noun}: ${R} Then press Go.`,
    (o, R) => `Match the ${o.noun} one to one. Tap a cell for every one: ${R} Press Go when done.`,
  ]);
  for (const [i, n] of [2, 3, 4, 5, 6, 7, 8, 9].entries()) {
    const o = CARD_OBJECTS[i % CARD_OBJECTS.length];
    items.push(frame("cardinality", "procedural", "countOutOnFrame", "band1", { filled: 0, mode: "build", answer: n, counting: { kind: "set", count: n }, promptText: buildPhr()(o, run(o.emoji, n)) }));
  }

  // Band 2 — teen sets in ten-and-more rows, count out a teen on two frames.
  for (const { emoji } of CARD_OBJECTS.slice(0, 5)) {
    for (let n = 11; n <= 20; n += 1) items.push(figure(emoji, n, "band2", "cardinality", "teenSetWrite", `${tenRows(emoji, n)} = ?`));
  }
  const buildTeenPhr = rotor([
    (o, R) => `Fill one frame first, then keep going. Put one counter for each of these ${o.noun}: ${R} Then press Go.`,
    (o, R) => `Match the ${o.noun} one to one across the two frames: ${R} Press Go when every one has a counter.`,
  ]);
  for (const [i, n] of [11, 12, 13, 14, 15, 16].entries()) {
    const o = CARD_OBJECTS[(i + 5) % CARD_OBJECTS.length];
    items.push(frame("cardinality", "procedural", "countOutTeenOnFrames", "band2", { filled: 0, frames: 2, mode: "build", answer: n, counting: { kind: "set", count: n }, promptText: buildTeenPhr()(o, tenRows(o.emoji, n)) }));
  }

  // Band 3 — bigger sets in rows of ten, and equal rows counted by ones.
  for (const { emoji } of CARD_OBJECTS.slice(5, 7)) {
    for (let n = 21; n <= 50; n += 1) items.push(figure(emoji, n, "band3", "cardinality", "bigSetWrite", `${tenRows(emoji, n)} = ?`));
  }
  for (const [i, [rows, per]] of [[3, 7], [4, 6], [3, 8], [5, 5], [4, 7], [3, 9], [5, 6], [4, 8], [6, 5], [5, 7], [4, 9], [6, 6]].entries()) {
    const o = CARD_OBJECTS[(i + 7) % CARD_OBJECTS.length];
    const n = rows * per;
    items.push(
      item("cardinality", "procedural", "arrayCount", "band3", {
        answer: n,
        answerType: "numberPad",
        display: { counting: { kind: "set", count: n }, promptText: `${Array.from({ length: rows }, () => run(o.emoji, per)).join(" | ")} = ?` },
      })
    );
  }

  return items;
}

export function cardinalityConceptual() {
  const items = [];
  let seed = 3000;
  const numeric = (structureType, band, promptText, answer, counting, extra = {}) =>
    item("cardinality", "conceptual", structureType, band, {
      answer,
      answerType: "numberPad",
      display: { counting, promptText, ...extra },
    });

  // Band 1a — how many (prose caption + picture, nouns vary signature).
  const howManyPhr = rotor([
    (o, R) => `How many ${o.noun} are there? ${R}`,
    (o, R) => `Count the ${o.noun}: ${R} How many ${o.noun} did you count?`,
    (o, R) => `${R} How many ${o.noun} do you see?`,
  ]);
  for (const [i, n] of [3, 5, 4, 6, 8, 7, 9, 10, 5, 7, 6, 8, 4, 9, 3, 10].entries()) {
    const o = CARD_OBJECTS[i % CARD_OBJECTS.length];
    items.push(numeric("countSet", "band1", howManyPhr()(o, run(o.emoji, n)), n, { kind: "set", count: n }));
  }

  // Band 1b — which group has more / fewer (K.CC.6 by matching or counting).
  const morePhr = rotor([
    (o, A, B) => `Group A: ${A} Group B: ${B} Which group has more ${o.noun}?`,
    (o, A, B) => `Group A: ${A} Group B: ${B} Which group has fewer ${o.noun}?`,
  ]);
  const compare = (structureType, band, pairs, show) => {
    pairs.forEach(([a, b], i) => {
      const o = CARD_OBJECTS[(i + 2) % CARD_OBJECTS.length];
      const phr = morePhr();
      const text = phr(o, show(o.emoji, a), show(o.emoji, b));
      const wantMore = /more/.test(text);
      items.push(
        item("cardinality", "conceptual", structureType, band, {
          answer: (a > b) === wantMore ? "Group A" : "Group B",
          choices: ["Group A", "Group B"],
          display: { promptText: text },
        })
      );
    });
  };
  compare("compareTwoSets", "band1", [[5, 3], [4, 7], [8, 6], [3, 6], [9, 7], [6, 4], [7, 9], [5, 8], [10, 8], [4, 5]], run);

  // Band 1c — the last number said tells how many (K.CC.4b).
  const lastPhr = rotor([
    (nm, o, R) => `${nm} touches each one while counting: ${R} What is the last number ${nm} says?`,
    (nm, o, R) => `${nm} counts the ${o.noun} one by one: ${R} What number does ${nm} say last?`,
  ]);
  for (const [i, n] of [4, 6, 5, 8, 7, 9, 3, 10, 6, 8].entries()) {
    const o = CARD_OBJECTS[(i + 4) % CARD_OBJECTS.length];
    items.push(numeric("lastNumberSaid", "band1", lastPhr()(nameAt(i + 3), o, run(o.emoji, n)), n, { kind: "set", count: n }));
  }

  // Band 1d — empty cells on a ten frame (the complement seen).
  const emptyPhr = rotor([
    "How many empty cells does the frame have?",
    "How many cells in the ten frame are still empty?",
    "Count the empty cells. How many empty cells are there?",
    "Some cells have no counter. How many empty cells do you see?",
    "How many more counters would fill the frame?",
    "How many cells are empty in this frame?",
    "The frame has 10 cells. How many empty cells are left?",
    "Look for the spaces. How many empty cells are in the frame?",
  ]);
  [2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => {
    items.push(frame("cardinality", "conceptual", "tenFrameEmpty", "band1", { filled: n, answer: 10 - n, counting: { kind: "gap", have: n, target: 10 }, promptText: emptyPhr() }));
  });

  // Band 1e — conservation under rearrangement (line → circle / scatter).
  const rearrPhr = rotor([
    (nm, o, R) => `${nm} lines up these ${o.noun}: ${R} Then ${nm} moves them into a circle. How many ${o.noun} are there now?`,
    (nm, o, R) => `${nm} counts a row of ${o.noun}: ${R} ${nm} spreads them all over the table. How many ${o.noun} are on the table?`,
  ]);
  for (const [i, n] of [5, 7, 6, 8, 9, 4, 10, 7, 6, 8].entries()) {
    const o = CARD_OBJECTS[(i + 6) % CARD_OBJECTS.length];
    items.push(numeric("rearrangedSet", "band1", rearrPhr()(nameAt(i + 8), o, run(o.emoji, n)), n, { kind: "set", count: n }));
  }

  // Band 2 — teen sets, teen compares, two-frame teens, and error analysis
  // with the picture present (double count / skipped one).
  for (const [i, n] of [12, 15, 13, 17, 14, 19, 11, 16, 18, 20, 13, 17, 15, 12, 16, 14, 20, 13, 11].entries()) {
    const o = CARD_OBJECTS[(i + 1) % CARD_OBJECTS.length];
    items.push(numeric("countTeenSet", "band2", howManyPhr()(o, tenRows(o.emoji, n)), n, { kind: "set", count: n }));
  }
  compare("compareTeenSets", "band2", [[12, 14], [15, 13], [11, 16], [18, 17], [13, 19], [16, 12], [14, 15], [19, 18], [17, 11], [12, 13]], tenRows);
  const teenFramePhr = rotor([
    "A full ten frame and some more. How many counters in all?",
    "The top frame is full. Count ten, then count on. How many counters are there?",
    "Ten on top and a few below. How many counters do the frames show?",
    "How many counters are in both frames together?",
    "Say ten for the full frame, then keep counting. How many counters is that?",
    "Both frames together hold how many counters?",
    "Count on from ten. How many counters are shown?",
    "One full frame plus a part frame: how many counters altogether?",
    "How many counters are there across the two frames?",
  ]);
  for (let n = 11; n <= 19; n += 1) {
    items.push(frame("cardinality", "conceptual", "teenFrameCount", "band2", { filled: n, frames: 2, answer: n, counting: { kind: "set", count: n }, promptText: teenFramePhr() }));
  }
  const dblPhr = rotor([
    (nm, o, k, R) => `${nm} counted these ${o.noun} and said ${k}: ${R} ${nm} pointed at one ${o.noun.replace(/s$/, "")} twice. How many ${o.noun} are there really?`,
    (nm, o, k, R) => `${nm} says ${k}, but ${nm} counted one of the ${o.noun} two times: ${R} What is the real number of ${o.noun}?`,
  ]);
  const skipPhr = rotor([
    (nm, o, k, R) => `${nm} counted these ${o.noun} and said ${k}: ${R} ${nm} skipped one. How many ${o.noun} are there really?`,
    (nm, o, k, R) => `${nm} says ${k} ${o.noun}, but one got skipped: ${R} How many ${o.noun} are there?`,
  ]);
  for (const [i, n] of [12, 14, 11, 16, 13, 18, 15, 17, 12, 19, 14, 16].entries()) {
    const o = CARD_OBJECTS[(i + 3) % CARD_OBJECTS.length];
    const dbl = i % 2 === 0;
    const phr = dbl ? dblPhr() : skipPhr();
    items.push(numeric(dbl ? "doubleCountError" : "skippedOneError", "band2", phr(nameAt(i + 12), o, dbl ? n + 1 : n - 1, tenRows(o.emoji, n)), n, { kind: "set", count: n }));
  }

  // Band 3 — error analysis at magnitude (no picture: reason from the
  // miscount), mixed collections, bigger compares, rows judged.
  const bigDblPhr = rotor([
    (nm, o, k) => `${nm} counted ${k} ${o.noun}. Then ${nm} noticed one ${o.noun.replace(/s$/, "")} got pointed at twice. What is the real number of ${o.noun}?`,
    (nm, o, k) => `${nm} said ${k} ${o.noun}, but ${nm} had counted one of the ${o.noun} two times. How many ${o.noun} are there really?`,
    (nm, o, k) => `A count of ${k} ${o.noun} was one too many: ${nm} double-counted one ${o.noun.replace(/s$/, "")}. How many ${o.noun} are there?`,
  ]);
  const bigSkipPhr = rotor([
    (nm, o, k) => `${nm} counted ${k} ${o.noun}, but ${nm} skipped one ${o.noun.replace(/s$/, "")}. How many ${o.noun} are there really?`,
    (nm, o, k) => `${nm} said ${k} ${o.noun}. One ${o.noun.replace(/s$/, "")} never got counted. What is the real number of ${o.noun}?`,
    (nm, o, k) => `A count of ${k} ${o.noun} missed one: ${nm} jumped over a ${o.noun.replace(/s$/, "")}. How many ${o.noun} are there?`,
  ]);
  for (const [i, n] of [36, 24, 41, 29, 53, 32, 47, 38, 62, 27, 55, 44, 31, 49, 58, 26].entries()) {
    const o = CARD_OBJECTS[(i + 5) % CARD_OBJECTS.length];
    const dbl = i % 2 === 0;
    const phr = dbl ? bigDblPhr() : bigSkipPhr();
    items.push(numeric(dbl ? "doubleCountErrorBig" : "skippedOneErrorBig", "band3", phr(nameAt(i + 15), o, dbl ? n + 1 : n - 1), n, { kind: "moreLess", n: dbl ? n + 1 : n - 1, delta: dbl ? -1 : 1 }));
  }
  const mixedPhr = rotor([
    (o, R) => `Only count the ${o.noun}: ${R} How many ${o.noun} are there?`,
    (o, R) => `${R} How many of these are ${o.noun}?`,
    (o, R) => `Some of these are ${o.noun} and some are not: ${R} How many ${o.noun} do you count?`,
  ]);
  for (const [i, [a, b]] of [[7, 4], [9, 5], [6, 6], [8, 3], [11, 4], [10, 6], [12, 5], [7, 7], [9, 4], [13, 3], [8, 6], [14, 4]].entries()) {
    const o = CARD_OBJECTS[i % CARD_OBJECTS.length];
    const other = CARD_OBJECTS[(i + 4) % CARD_OBJECTS.length];
    // Interleave so the child must pick out the target glyph.
    const glyphs = shuffled([...Array(a).fill(o.emoji), ...Array(b).fill(other.emoji)], (seed += 1));
    const rows = [];
    for (let s = 0; s < glyphs.length; s += 10) rows.push(glyphs.slice(s, s + 10).join(""));
    items.push(numeric("mixedSetCount", "band3", mixedPhr()(o, rows.join(" | ")), a, { kind: "set", count: a }));
  }
  compare("compareBigSets", "band3", [[23, 25], [31, 28], [26, 24], [27, 30], [26, 21], [29, 33], [24, 28], [25, 21], [32, 26], [22, 27], [24, 21], [33, 29]], tenRows);
  const rowsJudgePhr = rotor([
    (nm, o, k, R) => `${nm} counts every ${o.noun.replace(/s$/, "")} one by one and says ${k}. ${R} Is ${nm} right?`,
    (nm, o, k, R) => `${nm} says there are ${k} ${o.noun} here: ${R} Is that right?`,
  ]);
  [[24, 24], [33, 32], [41, 41], [28, 29], [36, 36], [45, 44], [22, 22], [39, 40], [31, 31], [47, 47]].forEach(([n, k], i) => {
    const o = CARD_OBJECTS[(i + 2) % CARD_OBJECTS.length];
    items.push(
      item("cardinality", "conceptual", "bigCountJudge", "band3", {
        answer: n === k ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: rowsJudgePhr()(nameAt(i + 17), o, k, tenRows(o.emoji, n)), truth: n === k },
      })
    );
  });

  return items;
}

export function buildDeterministicItems() {
  return [
    ...subitizingProcedural(),
    ...subitizingConceptual(),
    ...countOnProcedural(),
    ...countOnConceptual(),
    ...cardinalityProcedural(),
    ...cardinalityConceptual(),
  ];
}
