/* Application (story) items for the numberBonds bank.
 *
 * Register follows docs/word-problem-authoring-guide.md: person-first,
 * chronological, one tense, simple verbs, the question restates the counted
 * noun. Structures are part-part-whole situations from the EngageNY survey
 * (docs/numberbonds-bank-design.md): put-together total unknown, take-apart
 * addend unknown, add-to change unknown, and decomposition-flavored contexts
 * (fill-the-ten, partner-to-ten, tens-and-singles, equal split). All wording
 * is original.
 *
 * Signature discipline (cap: 3 per subskill::application bucket, bands
 * SHARED): every item cycles skeleton x name x noun with coprime-ish strides,
 * so a rendered wording (skeleton+name+noun) practically never repeats; the
 * assembler re-verifies the caps and global promptText uniqueness.
 *
 * Payloads follow the bond convention: op "bond", givens in display
 * (whole/part/parts), so the bondMath gate check verifies every story's math.
 * All stated numbers are >= 2 (grammarAgreement) and chosen so the answer
 * never equals a stated number (keeps answerGivenAway quiet).
 */

const NAMES = [
  "Mia", "Leo", "Ava", "Kai", "Nora", "Omar", "June", "Theo", "Zoe", "Ben",
  "Lily", "Sam", "Nia", "Luca", "Ida", "Rosa", "Finn", "Amara", "Diego", "Priya",
];

const NOUN_SETS = [
  { noun: "shells", a: "spotted", b: "plain" },
  { noun: "cups", a: "red", b: "blue" },
  { noun: "beads", a: "green", b: "yellow" },
  { noun: "blocks", a: "big", b: "small" },
  { noun: "crayons", a: "new", b: "old" },
  { noun: "stickers", a: "shiny", b: "plain" },
  { noun: "marbles", a: "striped", b: "clear" },
  { noun: "buttons", a: "round", b: "square" },
  { noun: "leaves", a: "red", b: "brown" },
  { noun: "acorns", a: "big", b: "small" },
  { noun: "grapes", a: "purple", b: "green" },
  { noun: "socks", a: "long", b: "short" },
];

const nameAt = (i) => NAMES[i % NAMES.length];
const nounAt = (i) => NOUN_SETS[i % NOUN_SETS.length];

/* ----- skeletons --------------------------------------------------- */

const PART_WHOLE_SKELETONS = [
  (n, s, p1, p2) =>
    `${n} has ${p1} ${s.a} ${s.noun} and ${p2} ${s.b} ${s.noun}. How many ${s.noun} does ${n} have in all?`,
  (n, s, p1, p2) =>
    `${n} puts ${p1} ${s.noun} in a box and ${p2} ${s.noun} in a bag. How many ${s.noun} does ${n} pack altogether?`,
  (n, s, p1, p2) =>
    `${n} finds ${p1} ${s.noun} in the morning. Later ${n} finds ${p2} more ${s.noun}. How many ${s.noun} does ${n} find that day?`,
  (n, s, p1, p2) =>
    `${n} lines up ${p1} ${s.a} ${s.noun}, then adds a row of ${p2} ${s.b} ${s.noun}. How many ${s.noun} are in the two rows together?`,
  (n, s, p1, p2) =>
    `On the shelf, ${n} keeps ${p1} ${s.noun}. Under the bed, ${n} keeps ${p2} more ${s.noun}. How many ${s.noun} does ${n} keep in both spots?`,
  (n, s, p1, p2) =>
    `${n} and a friend sort ${s.noun}. ${n} holds ${p1} ${s.noun}; the friend holds ${p2} ${s.noun}. How many ${s.noun} do they hold together?`,
  (n, s, p1, p2) =>
    `${n} glues ${p1} ${s.noun} on one page and ${p2} ${s.noun} on the next page. How many ${s.noun} does ${n} glue in all?`,
];

const THREE_PART_SKELETONS = [
  (n, s, p1, p2, p3) =>
    `${n} collects ${s.noun} on three walks: ${p1}, then ${p2}, then ${p3}. How many ${s.noun} does ${n} collect on all three walks?`,
  (n, s, p1, p2, p3) =>
    `${n} fills three jars with ${s.noun}: ${p1} in the first, ${p2} in the second, ${p3} in the third. How many ${s.noun} fill the jars in all?`,
];

const TENS_ONES_STORY_SKELETONS = [
  (n, s, tens, ones) =>
    `${n} packs ${s.noun} into bags of ten. ${n} fills ${tens} bags and has ${ones} loose ${s.noun}. How many ${s.noun} does ${n} have in all?`,
  (n, s, tens, ones) =>
    `${n} strings ${s.noun} in tens: ${tens} full strings, plus ${ones} single ${s.noun}. How many ${s.noun} does ${n} have altogether?`,
];

const MISSING_PART_SKELETONS = [
  (n, s, w, p) =>
    `${n} has ${w} ${s.noun} in all. ${p} of the ${s.noun} are ${s.a}, and the rest are ${s.b}. How many ${s.b} ${s.noun} does ${n} have?`,
  (n, s, w, p) =>
    `${n} owns ${w} ${s.noun}. ${n} can see ${p} ${s.noun} on the mat; the rest hide in a pouch. How many ${s.noun} hide in the pouch?`,
  (n, s, w, p) =>
    `${n} needs ${w} ${s.noun} for a craft. So far ${n} has ${p} ${s.noun}. How many more ${s.noun} does ${n} still need?`,
  (n, s, w, p) =>
    `${n} started with ${p} ${s.noun}. After a trade, ${n} now has ${w} ${s.noun}. How many ${s.noun} did the trade add?`,
  (n, s, w, p) =>
    `A basket holds ${w} ${s.noun} for ${n}. ${n} lifts out ${p} ${s.noun}. How many ${s.noun} stay in the basket?`,
  (n, s, w, p) =>
    `${n} splits ${w} ${s.noun} between two trays. One tray gets ${p} ${s.noun}. How many ${s.noun} go on the other tray?`,
  (n, s, w, p) =>
    `${n} counts ${w} ${s.noun} altogether. Exactly ${p} of the ${s.noun} are ${s.a}. How many of the ${s.noun} are not ${s.a}?`,
];

const FILL_TEN_SKELETONS = [
  (n, s, total) =>
    `A box holds exactly 10 ${s.noun}. ${n} has ${total} ${s.noun} and fills the box first. How many ${s.noun} are left outside the box?`,
  (n, s, total) =>
    `${n} has ${total} ${s.noun}. A tray fits exactly 10 ${s.noun}, and ${n} loads it full. How many ${s.noun} do not fit on the tray?`,
  (n, s, total) =>
    `A carton takes 10 ${s.noun} and no more. ${n} packs it full from a pile of ${total} ${s.noun}. How many ${s.noun} stay in the pile?`,
];

const PARTNER_TO_TEN_SKELETONS = [
  (n, s, p) =>
    `${n} wants a full ten of ${s.noun}. ${n} has ${p} ${s.noun} so far. How many more ${s.noun} make ten?`,
  (n, s, p) =>
    `A game needs ten ${s.noun}. ${n} brings ${p} ${s.noun}. How many ${s.noun} does ${n} still need for the game?`,
];

const MAKE_TEN_SKELETONS = [
  (n, s, have, add) =>
    `${n} has ${have} ${s.noun} and wants a full group of ten ${s.noun}. A friend gives ${n} ${add} ${s.noun}. After the group of ten is full, how many extra ${s.noun} does ${n} hold?`,
  (n, s, have, add) =>
    `${n} stacks ${have} ${s.noun} in a rack that holds ten. Then ${n} gets ${add} more ${s.noun} and fills the rack. How many ${s.noun} are left over after the rack is full?`,
];

const EQUAL_SPLIT_SKELETONS = [
  (n, s, whole) =>
    `${n} deals ${whole} ${s.noun} into two equal piles. How many ${s.noun} land in each pile?`,
  (n, s, whole) =>
    `${n} and a friend share ${whole} ${s.noun} so both get the same amount. How many ${s.noun} does each of them get?`,
];

const TAKE_OUT_TEN_SKELETONS = [
  (n, s, whole) =>
    `${n} bundles ten of the ${whole} ${s.noun} with a rubber band. How many ${s.noun} are outside the bundle?`,
  (n, s, whole) =>
    `From a jar of ${whole} ${s.noun}, ${n} scoops out a full group of ten ${s.noun}. How many ${s.noun} remain in the jar?`,
];

const TENS_SINGLES_SKELETONS = [
  (n, s, whole) =>
    `${n} makes piles of ten from ${whole} ${s.noun}. After every full pile of ten is made, how many single ${s.noun} are left?`,
  (n, s, whole) =>
    `${n} bags ${whole} ${s.noun} in tens. When no more full bags of ten can be made, how many loose ${s.noun} does ${n} still hold?`,
];

/* ----- number spaces ----------------------------------------------- */

// Two parts >= 2 with sum in [lo, hi]; both orders. (For whole-unknown the
// answer is the sum, which can never equal a part.)
function partPairs(lo, hi) {
  const out = [];
  for (let sum = lo; sum <= hi; sum += 1) {
    for (let p1 = 2; p1 <= sum - 2; p1 += 1) out.push([p1, sum - p1]);
  }
  return out;
}

// (whole, part) with part >= 2, answer >= 2, answer != part (keeps the
// answer distinct from every stated number).
function wholePartPairs(lo, hi) {
  const out = [];
  for (let w = lo; w <= hi; w += 1) {
    for (let p = 2; p <= w - 2; p += 1) {
      if (w - p !== p) out.push([w, p]);
    }
  }
  return out;
}

const mk = (subskill, structureType, band, question) => ({
  modeId: "numberBonds",
  subskill,
  itemFamily: "application",
  structureType,
  levelRange: band,
  question: { a: null, b: null, op: "bond", ...question },
});

const B1 = [1, 3];
const B2 = [4, 6];
const B3 = [7, 10];

// Cycle a number space through skeletons/names/nouns with offset strides so
// (skeleton, name, noun) combos don't repeat inside a cell.
function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const nums = space[i % space.length];
    const sk = skeletons[(i + offset) % skeletons.length];
    const name = nameAt(i * 3 + offset);
    const set = nounAt(i * 5 + offset + 1);
    items.push(emit(nums, sk, name, set));
  }
  return items;
}

export function buildStoryItems() {
  const items = [];
  const N = 51; // per subskill x band cell

  /* ----- partWhole application ------------------------------------ */
  const pwEmit = (band) => ([p1, p2], sk, name, set) =>
    mk("partWhole", "bondStoryWholeUnknown", band, {
      answer: p1 + p2,
      answerType: "numberPad",
      display: { parts: [p1, p2], promptText: sk(name, set, p1, p2) },
    });
  items.push(...cycle(N, partPairs(5, 10), PART_WHOLE_SKELETONS, 0, pwEmit(B1)));
  items.push(...cycle(N - 9, partPairs(11, 19), PART_WHOLE_SKELETONS, 2, pwEmit(B2)));
  // Band 2 rounds out with three-part collections.
  [[4, 3, 5], [2, 6, 4], [5, 2, 6], [3, 4, 6], [2, 5, 7], [6, 3, 4], [4, 5, 7], [3, 6, 5], [2, 4, 8]].forEach(([p1, p2, p3], i) => {
    const sk = THREE_PART_SKELETONS[i % THREE_PART_SKELETONS.length];
    items.push(
      mk("partWhole", "bondStoryThreeParts", B2, {
        answer: p1 + p2 + p3,
        answerType: "numberPad",
        display: { parts: [p1, p2, p3], promptText: sk(nameAt(i * 3 + 11), nounAt(i * 5 + 6), p1, p2, p3) },
      })
    );
  });
  // Band 3: bigger two-part sums + tens/ones packing + three-part.
  const bigPairs = [];
  for (const [t1, t2] of [[30, 15], [40, 25], [20, 35], [50, 15], [30, 45], [60, 25], [40, 35], [20, 55], [50, 45], [70, 15], [30, 25], [60, 35], [25, 40], [45, 30], [15, 65], [55, 20], [35, 40], [65, 15], [45, 50], [15, 80], [25, 30], [35, 60], [45, 40], [65, 20], [15, 30]]) {
    bigPairs.push([t1, t2]);
  }
  items.push(...cycle(25, bigPairs, PART_WHOLE_SKELETONS, 4, pwEmit(B3)));
  [[3, 7], [4, 2], [5, 6], [6, 3], [7, 8], [2, 9], [8, 4], [9, 5], [4, 8], [6, 7], [3, 4], [5, 9], [7, 2], [8, 6], [2, 5], [9, 3]].forEach(([t, o], i) => {
    const sk = TENS_ONES_STORY_SKELETONS[i % TENS_ONES_STORY_SKELETONS.length];
    items.push(
      mk("partWhole", "bondStoryTensOnes", B3, {
        answer: t * 10 + o,
        answerType: "numberPad",
        display: { parts: [t * 10, o], promptText: sk(nameAt(i * 3 + 5), nounAt(i * 5 + 2), t, o) },
      })
    );
  });
  [[12, 15, 10], [20, 14, 12], [15, 22, 10], [24, 13, 12], [18, 16, 14], [25, 12, 20], [30, 15, 12], [22, 18, 15], [16, 20, 13], [28, 14, 11]].forEach(([p1, p2, p3], i) => {
    const sk = THREE_PART_SKELETONS[(i + 1) % THREE_PART_SKELETONS.length];
    items.push(
      mk("partWhole", "bondStoryThreeParts", B3, {
        answer: p1 + p2 + p3,
        answerType: "numberPad",
        display: { parts: [p1, p2, p3], promptText: sk(nameAt(i * 3 + 14), nounAt(i * 5 + 9), p1, p2, p3) },
      })
    );
  });

  /* ----- missingPart application ---------------------------------- */
  const mpEmit = (band) => ([w, p], sk, name, set) =>
    mk("missingPart", "bondStoryPartUnknown", band, {
      answer: w - p,
      answerType: "numberPad",
      display: { whole: w, part: p, promptText: sk(name, set, w, p) },
    });
  items.push(...cycle(N, wholePartPairs(6, 10), MISSING_PART_SKELETONS, 1, mpEmit(B1)));
  items.push(...cycle(N, wholePartPairs(11, 19), MISSING_PART_SKELETONS, 3, mpEmit(B2)));
  const bigWP = [[45, 20], [56, 31], [67, 25], [38, 12], [74, 33], [82, 41], [93, 52], [46, 14], [58, 26], [69, 37], [75, 24], [87, 45], [94, 63], [36, 15], [63, 22], [78, 36], [95, 44], [52, 27], [66, 34], [84, 52], [48, 23], [72, 38], [86, 54], [64, 29], [92, 57], [54, 21], [76, 43], [88, 35], [42, 17], [68, 46]];
  items.push(...cycle(N, bigWP, MISSING_PART_SKELETONS, 5, mpEmit(B3)));

  /* ----- decompose application ------------------------------------ */
  // Band 1: partner-to-ten + fill-the-ten + equal splits.
  const partnerSpace = [2, 3, 4, 6, 7, 8].map((p) => [p]);
  items.push(
    ...cycle(18, partnerSpace, PARTNER_TO_TEN_SKELETONS, 0, ([p], sk, name, set) =>
      mk("decompose", "bondStoryPartnerToTen", B1, {
        answer: 10 - p,
        answerType: "numberPad",
        display: { whole: 10, part: p, promptText: sk(name, set, p) },
      })
    )
  );
  const fillSpaceB1 = [12, 13, 14, 16, 17, 18, 19].map((t) => [t]);
  items.push(
    ...cycle(18, fillSpaceB1, FILL_TEN_SKELETONS, 1, ([t], sk, name, set) =>
      mk("decompose", "bondStoryFillTen", B1, {
        answer: t - 10,
        answerType: "numberPad",
        display: { whole: t, part: 10, promptText: sk(name, set, t) },
      })
    )
  );
  const evenB1 = [4, 6, 8, 10].map((w) => [w]);
  items.push(
    ...cycle(15, evenB1, EQUAL_SPLIT_SKELETONS, 2, ([w], sk, name, set) =>
      mk("decompose", "bondStoryEqualSplit", B1, {
        answer: w / 2,
        answerType: "numberPad",
        display: { whole: w, part: w / 2, promptText: sk(name, set, w) },
      })
    )
  );

  // Band 2: make-ten + fill-the-ten + equal splits of teens.
  const makeTenSpace = [];
  for (let have = 6; have <= 9; have += 1) {
    for (let add = 11 - have; add <= 9; add += 1) makeTenSpace.push([have, add]);
  }
  items.push(
    ...cycle(26, makeTenSpace, MAKE_TEN_SKELETONS, 0, ([have, add], sk, name, set) =>
      mk("decompose", "bondStoryMakeTen", B2, {
        answer: have + add - 10,
        answerType: "numberPad",
        display: { whole: have + add, part: 10, promptText: sk(name, set, have, add) },
      })
    )
  );
  const fillSpaceB2 = [13, 15, 17, 19, 14, 16, 18].map((t) => [t]);
  items.push(
    ...cycle(15, fillSpaceB2, FILL_TEN_SKELETONS, 2, ([t], sk, name, set) =>
      mk("decompose", "bondStoryFillTen", B2, {
        answer: t - 10,
        answerType: "numberPad",
        display: { whole: t, part: 10, promptText: sk(name, set, t) },
      })
    )
  );
  const evenB2 = [12, 14, 16, 18, 20].map((w) => [w]);
  items.push(
    ...cycle(10, evenB2, EQUAL_SPLIT_SKELETONS, 1, ([w], sk, name, set) =>
      mk("decompose", "bondStoryEqualSplit", B2, {
        answer: w / 2,
        answerType: "numberPad",
        display: { whole: w, part: w / 2, promptText: sk(name, set, w) },
      })
    )
  );

  // Band 3: take-out-ten + tens-and-singles + big equal splits.
  const bigWholes = [34, 47, 52, 68, 71, 85, 26, 59, 93, 38, 44, 57, 62, 76, 81, 95, 28, 49, 63, 87].map((w) => [w]);
  items.push(
    ...cycle(18, bigWholes, TAKE_OUT_TEN_SKELETONS, 0, ([w], sk, name, set) =>
      mk("decompose", "bondStoryTakeOutTen", B3, {
        answer: w - 10,
        answerType: "numberPad",
        display: { whole: w, part: 10, promptText: sk(name, set, w) },
      })
    )
  );
  const singlesWholes = [23, 37, 45, 58, 64, 76, 89, 92, 31, 46, 53, 67, 74, 88, 96, 29].map((w) => [w]);
  items.push(
    ...cycle(18, singlesWholes, TENS_SINGLES_SKELETONS, 1, ([w], sk, name, set) =>
      mk("decompose", "bondStoryTensSingles", B3, {
        answer: w % 10,
        answerType: "numberPad",
        display: { whole: w, part: w - (w % 10), promptText: sk(name, set, w) },
      })
    )
  );
  const evenB3 = [24, 30, 36, 42, 48, 50, 60, 26, 34, 44, 54, 64].map((w) => [w]);
  items.push(
    ...cycle(15, evenB3, EQUAL_SPLIT_SKELETONS, 0, ([w], sk, name, set) =>
      mk("decompose", "bondStoryEqualSplit", B3, {
        answer: w / 2,
        answerType: "numberPad",
        display: { whole: w, part: w / 2, promptText: sk(name, set, w) },
      })
    )
  );

  return items;
}
