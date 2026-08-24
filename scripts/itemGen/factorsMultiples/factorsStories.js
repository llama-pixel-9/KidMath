/* factorsMultiples bank — application stories. Three skeletons per subskill
 * per band, 17 names each. Conventions in factorsTemplates.js.
 */

import { item, nameAt, OFF } from "./factorsTemplates.js";

const N = 17;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);
const ord = (k) => ({ 1: "1st", 2: "2nd", 3: "3rd" }[k] || `${k}th`);

export function factorsStories() {
  const items = [];

  /* ---------------- factorCount ---------------- */

  const rowsPhr = {
    band1: (nm, n, r, noun) => `${nm} lines up ${n} ${noun} in equal rows of ${r}. How many rows of ${noun} does ${nm} make?`,
    band2: (nm, n, r, noun) => `For the fair, ${nm} arranges ${n} ${noun} into equal rows of ${r}. How many rows of ${noun} are there?`,
    band3: (nm, n, r, noun) => `Setting up the exhibit, ${nm} places ${n} ${noun} in equal rows of ${r}. How many rows of ${noun} result?`,
  };
  const bagsPhr = {
    band1: (nm, n, g, noun) => `${nm} packs ${n} ${noun} into bags of ${g}. How many bags does ${nm} fill?`,
    band2: (nm, n, g, noun) => `${nm} sorts ${n} ${noun} into pouches of ${g} each. How many pouches does ${nm} fill?`,
    band3: (nm, n, g, noun) => `${nm} boxes ${n} ${noun} with exactly ${g} per box. How many boxes does ${nm} fill?`,
  };
  const fitPhr = {
    band1: (nm, n, r, noun) => `${nm} wants to split ${n} ${noun} into groups of ${r} with none left over. Will every group be full with none left?`,
    band2: (nm, n, r, noun) => `${nm} tries to deal ${n} ${noun} into piles of ${r} with zero leftovers. Does it come out even?`,
    band3: (nm, n, r, noun) => `${nm} plans crates of ${r} for ${n} ${noun} and wants no remainder. Does the plan work out evenly?`,
  };
  const fcNouns = { band1: ["shells", "stickers", "acorns", "buttons", "crayons", "marbles"], band2: ["trading cards", "seed packets", "bottle caps", "bead charms", "key chains", "comic books"], band3: ["raffle tickets", "photo prints", "clay beads", "flyers", "bookmarks", "juice boxes"] };
  const fcData = {
    band1: [[12, 3], [12, 4], [8, 2], [8, 4], [10, 2], [10, 5], [6, 2], [6, 3], [9, 3], [12, 2], [4, 2], [12, 6], [8, 8], [10, 10], [6, 6], [9, 9], [4, 4]],
    band2: [[14, 2], [15, 3], [16, 4], [18, 3], [20, 4], [24, 6], [25, 5], [28, 4], [30, 5], [21, 3], [27, 9], [22, 2], [18, 6], [24, 8], [16, 8], [20, 5], [30, 6]],
    band3: [[32, 4], [36, 6], [40, 8], [42, 6], [45, 9], [48, 6], [50, 5], [54, 6], [60, 5], [44, 4], [56, 7], [48, 8], [36, 4], [32, 8], [40, 5], [42, 7], [60, 12]],
  };
  const fitData = {
    band1: [[12, 3, true], [12, 5, false], [8, 4, true], [8, 3, false], [10, 5, true], [10, 4, false], [6, 3, true], [6, 4, false], [9, 3, true], [9, 2, false], [12, 4, true], [12, 7, false], [4, 2, true], [4, 3, false], [10, 2, true], [10, 3, false], [8, 2, true]],
    band2: [[14, 7, true], [14, 4, false], [15, 5, true], [15, 4, false], [16, 8, true], [16, 5, false], [18, 9, true], [18, 5, false], [20, 4, true], [20, 6, false], [24, 6, true], [24, 5, false], [25, 5, true], [25, 4, false], [28, 7, true], [28, 5, false], [30, 5, true]],
    band3: [[32, 8, true], [32, 6, false], [36, 9, true], [36, 8, false], [40, 8, true], [40, 6, false], [42, 7, true], [42, 8, false], [45, 9, true], [45, 6, false], [48, 8, true], [48, 5, false], [50, 10, true], [50, 8, false], [54, 9, true], [54, 8, false], [60, 10, true]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [n, r] = fcData[band][i];
      const noun = fcNouns[band][i % 6];
      items.push(
        item("factorCount", "application", `storyRows_${band}`, band, {
          answer: n / r,
          answerType: "numberPad",
          display: { fm: { kind: "pairFor", n, a: r }, promptText: rowsPhr[band](nameAt(i + 1 + OFF[band]), n, r, noun) },
        })
      );
      const [n2, g] = fcData[band][(i + 5) % N];
      items.push(
        item("factorCount", "application", `storyBags_${band}`, band, {
          answer: n2 / g,
          answerType: "numberPad",
          display: { fm: { kind: "pairFor", n: n2, a: g }, promptText: bagsPhr[band](nameAt(i + 4 + OFF[band]), n2, g, fcNouns[band][(i + 2) % 6]) },
        })
      );
      const [n3, r3, ok] = fitData[band][i];
      items.push(
        item("factorCount", "application", `storyFit_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "isFactor", k: r3, n: n3 }, promptText: fitPhr[band](nameAt(i + 7 + OFF[band]), n3, r3, fcNouns[band][(i + 4) % 6]), truth: ok },
        })
      );
    }
  }

  /* ---------------- nthMultiple ---------------- */

  const busPhr = {
    band1: (nm, b, k) => `A bus stops every ${b} minutes. ${nm} waits for the ${ord(k)} bus. How many minutes after the start does that bus stop?`,
    band2: (nm, b, k) => `A ferry departs every ${b} minutes, and ${nm} plans to board the ${ord(k)} departure. How many minutes in is that departure?`,
    band3: (nm, b, k) => `A shuttle leaves every ${b} minutes; ${nm} tracks the ${ord(k)} shuttle. How many minutes after opening does it leave?`,
  };
  const pagePhr = {
    band1: (nm, b, k) => `${nm} glues ${b} stamps on each page. When page ${k} is full, how many stamps has ${nm} glued?`,
    band2: (nm, b, k) => `${nm} pastes ${b} photos per album page. After filling ${k} pages, how many photos has ${nm} pasted?`,
    band3: (nm, b, k) => `${nm} prints ${b} labels per sheet. Once ${k} sheets are done, how many labels has ${nm} printed?`,
  };
  const lapPhr = {
    band1: (nm, b, k) => `Every lap of the yard is ${b} minutes. After ${k} laps, how many minutes has ${nm} walked?`,
    band2: (nm, b, k) => `Each pool lap takes ${nm} exactly ${b} minutes. After ${k} laps, how many minutes has ${nm} swum?`,
    band3: (nm, b, k) => `${nm} cycles a loop in ${b} minutes flat. Completing ${k} loops takes how many minutes of riding?`,
  };
  const nmData = {
    band1: [[2, 3], [2, 4], [3, 3], [3, 4], [4, 3], [4, 4], [5, 2], [5, 3], [2, 5], [3, 5], [4, 5], [5, 4], [2, 6], [3, 6], [2, 7], [4, 2], [3, 2]],
    band2: [[6, 4], [6, 5], [7, 4], [7, 5], [8, 4], [8, 5], [9, 4], [9, 5], [6, 6], [7, 6], [8, 6], [9, 6], [6, 7], [7, 7], [8, 7], [9, 3], [6, 3]],
    band3: [[11, 5], [11, 6], [12, 5], [12, 6], [15, 4], [15, 5], [20, 4], [20, 5], [11, 7], [12, 7], [15, 6], [20, 3], [11, 4], [12, 4], [15, 3], [11, 8], [12, 8]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [b, k] = nmData[band][i];
      items.push(
        item("nthMultiple", "application", `storyBus_${band}`, band, {
          answer: b * k,
          answerType: "numberPad",
          display: { fm: { kind: "nthMult", b, k }, promptText: busPhr[band](nameAt(i + 2 + OFF[band]), b, k) },
        })
      );
      const [b2, k2] = nmData[band][(i + 6) % N];
      items.push(
        item("nthMultiple", "application", `storyPage_${band}`, band, {
          answer: b2 * k2,
          answerType: "numberPad",
          display: { fm: { kind: "nthMult", b: b2, k: k2 }, promptText: pagePhr[band](nameAt(i + 5 + OFF[band]), b2, k2) },
        })
      );
      const [b3, k3] = nmData[band][(i + 11) % N];
      items.push(
        item("nthMultiple", "application", `storyLap_${band}`, band, {
          answer: b3 * k3,
          answerType: "numberPad",
          display: { fm: { kind: "nthMult", b: b3, k: k3 }, promptText: lapPhr[band](nameAt(i + 8 + OFF[band]), b3, k3) },
        })
      );
    }
  }

  /* ---------------- factorPairs ---------------- */

  const gardenPhr = {
    band1: (nm, n, a) => `${nm} plants ${n} seeds in ${a} equal rows. How many seeds go in each row?`,
    band2: (nm, n, a) => `${nm} sets out ${n} seedlings across ${a} equal garden rows. How many seedlings fill each row?`,
    band3: (nm, n, a) => `${nm} lays out ${n} bulbs over ${a} identical beds. How many bulbs land in each bed?`,
  };
  const deskPhr = {
    band1: (nm, n, a) => `${nm} moves ${n} desks into ${a} equal rows. How many desks stand in each row?`,
    band2: (nm, n, a) => `For the recital, ${nm} places ${n} chairs in ${a} equal rows. How many chairs make up each row?`,
    band3: (nm, n, a) => `${nm} arranges ${n} folding seats into ${a} matched rows. How many seats sit in each row?`,
  };
  const quiltPhr = {
    band1: (nm, n, a) => `${nm} sews ${n} patches into a quilt of ${a} equal strips. How many patches are in each strip?`,
    band2: (nm, n, a) => `${nm} stitches ${n} squares into ${a} equal quilt columns. How many squares run down each column?`,
    band3: (nm, n, a) => `${nm} tiles ${n} mosaic pieces into ${a} even bands. How many pieces fill each band?`,
  };
  const fpData = {
    band1: [[12, 3], [12, 4], [12, 2], [8, 2], [8, 4], [10, 2], [10, 5], [6, 2], [6, 3], [9, 3], [4, 2], [12, 6], [8, 8], [10, 10], [6, 6], [9, 9], [4, 4]],
    band2: [[14, 2], [15, 3], [16, 2], [18, 2], [20, 5], [24, 3], [25, 5], [28, 7], [30, 3], [21, 7], [27, 3], [22, 11], [24, 4], [16, 4], [18, 9], [20, 4], [30, 5]],
    band3: [[32, 8], [36, 4], [40, 5], [42, 7], [45, 5], [48, 4], [50, 2], [54, 6], [60, 4], [44, 11], [56, 8], [48, 3], [36, 3], [32, 4], [40, 10], [42, 6], [60, 6]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [n, a] = fpData[band][i];
      items.push(
        item("factorPairs", "application", `storyGarden_${band}`, band, {
          answer: n / a,
          answerType: "numberPad",
          display: { fm: { kind: "pairFor", n, a }, promptText: gardenPhr[band](nameAt(i + 1 + OFF[band]), n, a) },
        })
      );
      const [n2, a2] = fpData[band][(i + 6) % N];
      items.push(
        item("factorPairs", "application", `storyDesk_${band}`, band, {
          answer: n2 / a2,
          answerType: "numberPad",
          display: { fm: { kind: "pairFor", n: n2, a: a2 }, promptText: deskPhr[band](nameAt(i + 4 + OFF[band]), n2, a2) },
        })
      );
      const [n3, a3] = fpData[band][(i + 11) % N];
      items.push(
        item("factorPairs", "application", `storyQuilt_${band}`, band, {
          answer: n3 / a3,
          answerType: "numberPad",
          display: { fm: { kind: "pairFor", n: n3, a: a3 }, promptText: quiltPhr[band](nameAt(i + 7 + OFF[band]), n3, a3) },
        })
      );
    }
  }

  /* ---------------- primesAndCommon ---------------- */

  const meetPhr = {
    band1: (nm, a, b) => `${nm} waters the fern every ${a} days and the cactus every ${b} days, starting today. In how many days will ${nm} water both on the same day again?`,
    band2: (nm, a, b) => `${nm} jogs every ${a} days and swims every ${b} days, beginning today. After how many days do both land on the same day again?`,
    band3: (nm, a, b) => `${nm} backs up files every ${a} days and cleans the desk every ${b} days, starting now. In how many days do the chores coincide again?`,
  };
  const packPhr = {
    band1: (nm, a, b) => `Rolls come in packs of ${a} and juice comes in packs of ${b}. What is the smallest number of each ${nm} can buy to have equal amounts?`,
    band2: (nm, a, b) => `Pencils sell in boxes of ${a} and erasers in boxes of ${b}. What is the smallest matching count ${nm} can reach of each?`,
    band3: (nm, a, b) => `Bolts ship in bags of ${a} and nuts in bags of ${b}. What is the least equal quantity of each that ${nm} can assemble?`,
  };
  const basketPhr = {
    band1: (nm, x, y) => `${nm} has ${x} apples and ${y} pears and makes identical fruit baskets with nothing left. What is the greatest number of baskets ${nm} can make?`,
    band2: (nm, x, y) => `${nm} bundles ${x} daisies and ${y} tulips into identical bouquets using every flower. What is the greatest number of bouquets possible?`,
    band3: (nm, x, y) => `${nm} splits ${x} granola bars and ${y} fruit cups into identical care kits with none left over. What is the greatest number of kits ${nm} can build?`,
  };
  const lcmData = {
    band1: [[2, 3], [2, 5], [3, 4], [2, 4], [3, 5], [4, 5], [2, 6], [3, 6], [2, 7], [2, 3], [3, 4], [2, 5], [2, 4], [3, 5], [4, 5], [2, 6], [2, 7]],
    band2: [[4, 6], [6, 8], [4, 10], [6, 9], [8, 12], [6, 10], [4, 14], [8, 10], [9, 12], [6, 14], [10, 15], [8, 14], [12, 16], [4, 6], [6, 8], [4, 10], [6, 9]],
    band3: [[12, 18], [15, 20], [12, 16], [14, 21], [16, 24], [18, 24], [15, 25], [20, 30], [12, 20], [18, 27], [16, 20], [21, 28], [24, 36], [12, 18], [15, 20], [12, 16], [14, 21]],
  };
  const gcfData = {
    band1: [[4, 6], [6, 9], [8, 12], [4, 10], [6, 12], [8, 10], [9, 12], [4, 8], [6, 10], [10, 12], [4, 12], [6, 8], [9, 6], [4, 6], [6, 9], [8, 12], [4, 10]],
    band2: [[12, 18], [14, 21], [16, 24], [15, 20], [18, 24], [20, 30], [12, 16], [14, 28], [15, 25], [16, 20], [18, 27], [21, 28], [24, 30], [12, 18], [14, 21], [16, 24], [15, 20]],
    band3: [[24, 36], [30, 45], [32, 48], [28, 42], [36, 54], [40, 60], [24, 40], [30, 50], [32, 40], [36, 48], [42, 56], [45, 60], [44, 55], [24, 36], [30, 45], [32, 48], [28, 42]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [a, b] = lcmData[band][i];
      items.push(
        item("primesAndCommon", "application", `storyMeet_${band}`, band, {
          answer: lcm(a, b),
          answerType: "numberPad",
          display: { fm: { kind: "lcmOf", a, b }, promptText: meetPhr[band](nameAt(i + 2 + OFF[band]), a, b) },
        })
      );
      const [a2, b2] = lcmData[band][(i + 8) % N];
      items.push(
        item("primesAndCommon", "application", `storyPack_${band}`, band, {
          answer: lcm(a2, b2),
          answerType: "numberPad",
          display: { fm: { kind: "lcmOf", a: a2, b: b2 }, promptText: packPhr[band](nameAt(i + 5 + OFF[band]), a2, b2) },
        })
      );
      const [x, y] = gcfData[band][i];
      items.push(
        item("primesAndCommon", "application", `storyBasket_${band}`, band, {
          answer: gcd(x, y),
          answerType: "numberPad",
          display: { fm: { kind: "gcfOf", a: x, b: y }, promptText: basketPhr[band](nameAt(i + 8 + OFF[band]), x, y) },
        })
      );
    }
  }

  return items;
}
