/* fractions bank — application stories. Three skeletons per subskill per
 * band, 17 names each (names are distinct within a run, so every prompt and
 * signature is unique; band wording differs so cross-band prompts never
 * collide). Conventions in fractionsTemplates.js.
 */

import { shuffled } from "./countingTemplates.js";
import { item, nameAt, F, OFF } from "./fractionsTemplates.js";

const N = 17;

const fracChoice = (seed, good, wrongs) => shuffled([good, ...[...new Set(wrongs)].filter((x) => x !== good).slice(0, 3)], seed);

export function fractionsStories() {
  const items = [];
  let seed = 491;

  /* ---------------- partWhole ---------------- */

  const pwFoods = { band1: ["pizza", "sandwich", "pancake", "waffle", "pie", "flatbread"], band2: ["veggie pizza", "casserole", "quiche", "fruit tart", "lasagna", "cornbread"], band3: ["sheet cake", "spinach pie", "giant cookie", "party sub", "berry galette", "focaccia"] };
  const pwParts = { band1: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4]], band2: [[2, 5], [3, 5], [1, 6], [5, 6], [3, 8], [5, 8]], band3: [[3, 10], [7, 10], [5, 12], [7, 12], [9, 10], [11, 12]] };
  const pwEat = {
    band1: (nm, food, n, d) => `${nm} cuts a ${food} into ${d} equal pieces and eats ${n} ${n === 1 ? "piece" : "pieces"}. What fraction of the ${food} does ${nm} eat?`,
    band2: (nm, food, n, d) => `At lunch, ${nm} slices a ${food} into ${d} equal servings and eats ${n} of them. What fraction of the ${food} does ${nm} eat?`,
    band3: (nm, food, n, d) => `For the bake sale, ${nm} portions a ${food} into ${d} equal servings and samples ${n}. What fraction of the ${food} does ${nm} eat?`,
  };
  const pwPaintThings = { band1: ["fence", "poster", "banner", "birdhouse", "kite", "flowerpot"], band2: ["mural wall", "bookshelf", "garden gate", "tree fort", "wagon", "doghouse"], band3: ["stage backdrop", "climbing wall", "parade float", "market stall", "boat hull", "library mural"] };
  const pwPaint = {
    band1: (nm, thing, n, d) => `${nm} splits a ${thing} into ${d} equal parts and paints ${n} ${n === 1 ? "part" : "parts"}. What fraction of the ${thing} is painted?`,
    band2: (nm, thing, n, d) => `${nm} marks a ${thing} into ${d} equal sections and paints ${n} of them before dinner. What fraction of the ${thing} is painted?`,
    band3: (nm, thing, n, d) => `Working all weekend, ${nm} divides a ${thing} into ${d} equal sections and finishes painting ${n}. What fraction of the ${thing} is painted?`,
  };
  const pwLeft = {
    band1: (nm, food, n, d) => `${nm}'s ${food} is cut into ${d} equal pieces. ${nm} gives ${n} ${n === 1 ? "piece" : "pieces"} to friends. What fraction of the ${food} is left for ${nm}?`,
    band2: (nm, food, n, d) => `A ${food} is sliced into ${d} equal servings, and ${nm} hands ${n} of them to teammates. What fraction of the ${food} is left for ${nm}?`,
    band3: (nm, food, n, d) => `${nm} brings a ${food} cut into ${d} equal servings and passes out ${n} at the fair. What fraction of the ${food} is left for ${nm}?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [n, d] = pwParts[band][i % 6];
      const food = pwFoods[band][i % 6];
      const thing = pwPaintThings[band][(i + 2) % 6];
      items.push(
        item("partWhole", "application", `storyEat_${band}`, band, {
          answer: F(n, d),
          choices: fracChoice((seed += 1), F(n, d), [F(d - n, d), F(d, n), F(n, d + 1)]),
          display: { frac: { kind: "name", n, d }, promptText: pwEat[band](nameAt(i + OFF[band]), food, n, d) },
        })
      );
      items.push(
        item("partWhole", "application", `storyPaint_${band}`, band, {
          answer: F(n, d),
          choices: fracChoice((seed += 1), F(n, d), [F(d - n, d), F(n, d - n === 0 ? d + 1 : d - n), F(d, n)]),
          display: { frac: { kind: "name", n, d }, promptText: pwPaint[band](nameAt(i + 3 + OFF[band]), thing, n, d) },
        })
      );
      items.push(
        item("partWhole", "application", `storyLeft_${band}`, band, {
          answer: F(d - n, d),
          choices: fracChoice((seed += 1), F(d - n, d), [F(n, d), F(d - n, n), F(d, d - n)]),
          display: { frac: { kind: "complement", n, d }, promptText: pwLeft[band](nameAt(i + 6 + OFF[band]), food, n, d) },
        })
      );
    }
  }

  /* ---------------- fractionAsNumber ---------------- */

  const fnParts = { band1: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4]], band2: [[2, 5], [4, 5], [1, 6], [5, 6], [3, 8], [7, 8]], band3: [[3, 10], [7, 10], [9, 10], [5, 12], [7, 12], [11, 12]] };
  const fnTrail = {
    band1: (nm, n, d) => `A trail is split into ${d} equal parts. ${nm} walks ${n} ${n === 1 ? "part" : "parts"} from the start. What fraction of the trail has ${nm} walked?`,
    band2: (nm, n, d) => `A bike path is divided into ${d} equal legs, and ${nm} rides ${n} of them from the trailhead. What fraction of the path has ${nm} ridden?`,
    band3: (nm, n, d) => `A race course breaks into ${d} equal segments. By the water station, ${nm} has run ${n} segments. What fraction of the course has ${nm} run?`,
  };
  const fnRibbon = {
    band1: (nm, n, d) => `${nm} cuts a ribbon into ${d} equal pieces and uses ${n} of them. ${nm} has used ?/${d} of the ribbon. What is the top number?`,
    band2: (nm, n, d) => `${nm} snips a rope into ${d} equal lengths and ties up ${n} of them. That is ?/${d} of the rope used. What is the top number?`,
    band3: (nm, n, d) => `${nm} portions a spool of yarn into ${d} equal strands and knits with ${n}. The used yarn is ?/${d} of the spool. What is the numerator?`,
  };
  const fnBottle = {
    band1: (nm, n, d) => `${nm}'s water bottle shows ${d} equal marks. The water reaches mark ${n}. What fraction of the bottle is full?`,
    band2: (nm, n, d) => `The measuring jug in ${nm}'s kitchen has ${d} equal marks, and the juice reaches mark ${n}. What fraction of the jug is full?`,
    band3: (nm, n, d) => `${nm} checks a rain gauge printed with ${d} equal marks; the water sits at mark ${n}. What fraction of the gauge is filled?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [n, d] = fnParts[band][i % 6];
      items.push(
        item("fractionAsNumber", "application", `storyTrail_${band}`, band, {
          answer: F(n, d),
          choices: fracChoice((seed += 1), F(n, d), [F(d - n, d), F(d, n), F(n, d + 1)]),
          display: { frac: { kind: "name", n, d }, promptText: fnTrail[band](nameAt(i + 1 + OFF[band]), n, d) },
        })
      );
      items.push(
        item("fractionAsNumber", "application", `storyRibbon_${band}`, band, {
          answer: n,
          answerType: "numberPad",
          display: { frac: { kind: "jumps", n, d }, promptText: fnRibbon[band](nameAt(i + 4 + OFF[band]), n, d) },
        })
      );
      items.push(
        item("fractionAsNumber", "application", `storyBottle_${band}`, band, {
          answer: F(n, d),
          choices: fracChoice((seed += 1), F(n, d), [F(d - n, d), F(n + 1, d), F(d, n)]),
          display: { frac: { kind: "name", n, d }, promptText: fnBottle[band](nameAt(i + 7 + OFF[band]), n, d) },
        })
      );
    }
  }

  /* ---------------- equivalence ---------------- */

  const eqScoop = { band1: [[1, 2, 4], [1, 2, 8], [1, 4, 8], [3, 4, 8], [1, 3, 6], [2, 3, 6]], band2: [[1, 2, 10], [2, 5, 10], [3, 5, 10], [1, 3, 12], [3, 4, 12], [5, 6, 12]], band3: [[7, 10, 20], [3, 10, 20], [5, 12, 24], [3, 8, 24], [3, 4, 20], [5, 6, 24]] };
  const eqScoopPhr = {
    band1: (nm, a, b, d2) => `A recipe needs ${F(a, b)} cup of sugar. ${nm} has only a ${F(1, d2)} cup scoop. How many scoops does ${nm} need?`,
    band2: (nm, a, b, d2) => `${nm} must measure ${F(a, b)} cup of flour using a ${F(1, d2)} cup scoop. How many scoops does ${nm} fill?`,
    band3: (nm, a, b, d2) => `The batch calls for ${F(a, b)} cup of oats, but ${nm} owns just a ${F(1, d2)} cup scoop. Exactly how many scoops does ${nm} measure?`,
  };
  const eqGridPhr = {
    band1: (nm, a, b, d2) => `${nm} colors ${F(a, b)} of a paper strip. A second strip has ${d2} equal parts. Which fraction of it shows the same amount?`,
    band2: (nm, a, b, d2) => `${nm} shades ${F(a, b)} of a grid. On a matching grid with ${d2} equal squares, which fraction covers the same amount?`,
    band3: (nm, a, b, d2) => `${nm} tiles ${F(a, b)} of a patio design. A matching design uses ${d2} equal tiles. Which fraction of it matches the same area?`,
  };
  const eqPizzaPhr = {
    band1: (nm, a, b, d2) => `${nm} cuts a pizza into ${b} equal slices and takes ${a}. A same-size pizza is cut into ${d2} slices. How many of those slices make the same amount?`,
    band2: (nm, a, b, d2) => `${nm} slices one pan of brownies into ${b} equal bars and eats ${a}. An identical pan is cut into ${d2} bars. How many of those bars equal the same amount?`,
    band3: (nm, a, b, d2) => `${nm} divides a loaf into ${b} equal slices and toasts ${a}. An identical loaf is divided into ${d2} slices. Exactly how many of those slices match the same amount?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [a, b, d2] = eqScoop[band][i % 6];
      const c = (a * d2) / b;
      items.push(
        item("equivalence", "application", `storyScoop_${band}`, band, {
          answer: c,
          answerType: "numberPad",
          display: { frac: { kind: "equivNum", a, b, d2 }, promptText: eqScoopPhr[band](nameAt(i + 2 + OFF[band]), a, b, d2) },
        })
      );
      items.push(
        item("equivalence", "application", `storyGrid_${band}`, band, {
          answer: F(c, d2),
          choices: fracChoice((seed += 1), F(c, d2), [F(c + 1, d2), F(a, d2), F(c, d2 + b)]),
          display: { frac: { kind: "equivFracPick", a, b, d2 }, promptText: eqGridPhr[band](nameAt(i + 5 + OFF[band]), a, b, d2) },
        })
      );
      items.push(
        item("equivalence", "application", `storyPizza_${band}`, band, {
          answer: c,
          answerType: "numberPad",
          display: { frac: { kind: "equivNum", a, b, d2 }, promptText: eqPizzaPhr[band](nameAt(i + 8 + OFF[band]), a, b, d2) },
        })
      );
    }
  }

  /* ---------------- compareFractions ---------------- */

  const cmpPairs = { band1: [[2, 3, 1, 3], [3, 4, 2, 4], [1, 2, 1, 3], [1, 2, 1, 4], [2, 3, 2, 4], [3, 4, 1, 2]], band2: [[4, 5, 2, 5], [5, 6, 1, 6], [5, 8, 3, 8], [2, 5, 2, 8], [4, 5, 4, 6], [3, 4, 5, 8]], band3: [[7, 10, 3, 10], [11, 12, 5, 12], [7, 10, 7, 12], [9, 10, 9, 12], [3, 4, 7, 10], [5, 6, 9, 12]] };
  const cmpSandwich = {
    band1: (nm, f1, f2) => `${nm} eats ${f1} of a sandwich. A friend eats ${f2} of a same-size sandwich. Pick the fraction that is more sandwich.`,
    band2: (nm, f1, f2) => `${nm} finishes ${f1} of a wrap while a teammate finishes ${f2} of an identical wrap. Which fraction is the bigger share?`,
    band3: (nm, f1, f2) => `${nm} consumes ${f1} of a burrito; a cousin consumes ${f2} of an identical burrito. Which fraction represents more food?`,
  };
  const cmpPaint = {
    band1: (nm, f1, f2) => `${nm} paints ${f1} of a fence on Monday and ${f2} of it on Tuesday. Pick the larger fraction of fence.`,
    band2: (nm, f1, f2) => `${nm} weeds ${f1} of a garden on Saturday and ${f2} of it on Sunday. Which day's fraction of the garden is larger?`,
    band3: (nm, f1, f2) => `${nm} edits ${f1} of a scrapbook in week one and ${f2} of it in week two. Which fraction of the scrapbook is greater?`,
  };
  const cmpGlass = {
    band1: (nm, f1, f2) => `${nm} fills one glass ${f1} full and a matching glass ${f2} full. Which fraction shows the fuller glass?`,
    band2: (nm, f1, f2) => `${nm} fills a thermos ${f1} full and a matching thermos ${f2} full. Which fraction marks the fuller thermos?`,
    band3: (nm, f1, f2) => `${nm} fills one aquarium ${f1} full and an identical aquarium ${f2} full. Which fraction indicates more water?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [a, b, c, d] = cmpPairs[band][i % 6];
      const good = a * d > c * b ? F(a, b) : F(c, d);
      const mk = (phr, off) =>
        item("compareFractions", "application", `${phr.name || "story"}_${band}`, band, {
          answer: good,
          choices: shuffled([F(a, b), F(c, d)], (seed += 1)),
          display: { frac: { kind: "cmpPick", a, b, c, d }, promptText: phr(nameAt(i + off + OFF[band]), F(a, b), F(c, d)) },
        });
      items.push({ ...mk(cmpSandwich[band], 0), structureType: `storyShare_${band}` });
      items.push({ ...mk(cmpPaint[band], 3), structureType: `storyDays_${band}` });
      items.push({ ...mk(cmpGlass[band], 6), structureType: `storyFuller_${band}` });
    }
  }

  /* ---------------- addLikeDenominators ---------------- */

  const addTuples = { band1: [[1, 1, 3], [1, 2, 4], [1, 1, 4], [2, 1, 4], [1, 1, 2], [1, 2, 3]], band2: [[2, 2, 5], [1, 3, 5], [2, 3, 6], [1, 4, 6], [3, 4, 8], [2, 5, 8]], band3: [[3, 4, 10], [2, 7, 10], [5, 4, 12], [3, 7, 12], [1, 8, 10], [5, 6, 12]] };
  const subTuples = { band1: [[2, 1, 3], [3, 1, 4], [3, 2, 4], [2, 1, 4], [2, 1, 2], [3, 1, 3]], band2: [[4, 2, 5], [5, 3, 6], [7, 4, 8], [4, 1, 5], [5, 2, 6], [7, 5, 8]], band3: [[7, 4, 10], [9, 2, 10], [9, 4, 12], [11, 7, 12], [8, 1, 10], [11, 6, 12]] };
  const addBook = {
    band1: (nm, a, b, d) => `${nm} reads ${F(a, d)} of a book on Saturday and ${F(b, d)} on Sunday. What fraction of the book does ${nm} read in all?`,
    band2: (nm, a, b, d) => `${nm} finishes ${F(a, d)} of a comic before school and ${F(b, d)} after. What fraction of the comic does ${nm} finish in total?`,
    band3: (nm, a, b, d) => `${nm} records ${F(a, d)} of a podcast script in the morning and ${F(b, d)} at night. What fraction of the script does ${nm} record altogether?`,
  };
  const addGarden = {
    band1: (nm, a, b, d) => `${nm} plants flowers in ${F(a, d)} of a garden and carrots in ${F(b, d)} of it. What fraction of the garden is planted?`,
    band2: (nm, a, b, d) => `${nm} covers ${F(a, d)} of a bulletin board with photos and ${F(b, d)} with drawings. What fraction of the board is covered?`,
    band3: (nm, a, b, d) => `${nm} devotes ${F(a, d)} of a display case to trophies and ${F(b, d)} to medals. What fraction of the case is filled?`,
  };
  const subPitcher = {
    band1: (nm, a, b, d) => `A pitcher is ${F(a, d)} full. ${nm} pours out ${F(b, d)} of the pitcher. What fraction of the pitcher is still full?`,
    band2: (nm, a, b, d) => `${nm}'s paint jar starts ${F(a, d)} full, and ${nm} uses ${F(b, d)} of the jar on a poster. What fraction of the jar remains full?`,
    band3: (nm, a, b, d) => `A fuel tank reads ${F(a, d)} full before ${nm} burns ${F(b, d)} of the tank on a trip. What fraction of the tank is left?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [a, b, d] = addTuples[band][i % 6];
      const [x, y, e] = subTuples[band][i % 6];
      items.push(
        item("addLikeDenominators", "application", `storyRead_${band}`, band, {
          answer: F(a + b, d),
          choices: fracChoice((seed += 1), F(a + b, d), [F(a + b, d * 2), F(a + b + 1, d), F(Math.abs(a - b) || a + b + 2, d)]),
          display: { frac: { kind: "addLike", a, b, d }, promptText: addBook[band](nameAt(i + 1 + OFF[band]), a, b, d) },
        })
      );
      items.push(
        item("addLikeDenominators", "application", `storyPlant_${band}`, band, {
          answer: F(a + b, d),
          choices: fracChoice((seed += 1), F(a + b, d), [F(a + b, d + d), F(a + b - 1, d), F(a, d)]),
          display: { frac: { kind: "addLike", a, b, d }, promptText: addGarden[band](nameAt(i + 4 + OFF[band]), a, b, d) },
        })
      );
      items.push(
        item("addLikeDenominators", "application", `storyPour_${band}`, band, {
          answer: F(x - y, e),
          choices: fracChoice((seed += 1), F(x - y, e), [F(x + y, e), F(x - y, e * 2), F(x - y + 1, e)]),
          display: { frac: { kind: "subLike", a: x, b: y, d: e }, promptText: subPitcher[band](nameAt(i + 7 + OFF[band]), x, y, e) },
        })
      );
    }
  }

  /* ---------------- fractionOfSet ---------------- */

  const setNouns = { band1: ["shells", "stickers", "marbles", "crayons", "acorns", "buttons"], band2: ["trading cards", "seed packets", "bead charms", "bottle caps", "comic books", "key chains"], band3: ["raffle tickets", "photo prints", "clay beads", "juice boxes", "flyers", "bookmarks"] };
  const setGive = { band1: [[1, 2, 12], [1, 3, 12], [1, 4, 16], [1, 2, 18], [1, 3, 15], [1, 4, 20]], band2: [[2, 5, 45], [1, 6, 54], [3, 8, 64], [4, 5, 60], [5, 6, 72], [5, 8, 96]], band3: [[7, 10, 240], [5, 12, 240], [3, 10, 460], [7, 12, 360], [9, 10, 550], [11, 12, 480]] };
  const givePhr = {
    band1: (nm, n, d, w, noun) => `${nm} has ${w} ${noun}. ${nm} gives ${F(n, d)} of them to a friend. How many ${noun} does ${nm} give away?`,
    band2: (nm, n, d, w, noun) => `${nm} collects ${w} ${noun} and trades away ${F(n, d)} of them at the fair. How many ${noun} does ${nm} trade away?`,
    band3: (nm, n, d, w, noun) => `${nm} organizes ${w} ${noun} and donates ${F(n, d)} of them to the school drive. How many ${noun} does ${nm} donate?`,
  };
  const usePhr = {
    band1: (nm, d, w, noun) => `A jar holds ${w} ${noun}. ${nm} uses ${F(1, d)} of them for a craft. How many ${noun} does ${nm} use?`,
    band2: (nm, d, w, noun) => `A bin contains ${w} ${noun}, and ${nm} pulls out ${F(1, d)} of them for a project. How many ${noun} does ${nm} pull out?`,
    band3: (nm, d, w, noun) => `A crate stores ${w} ${noun}; ${nm} distributes ${F(1, d)} of them at the assembly. How many ${noun} does ${nm} distribute?`,
  };
  const keepPhr = {
    band1: (nm, d, w, noun) => `${nm} makes ${w} ${noun} and sells ${F(1, d)} of them. How many ${noun} does ${nm} keep?`,
    band2: (nm, d, w, noun) => `${nm} prints ${w} ${noun} and mails ${F(1, d)} of them to pen pals. How many ${noun} does ${nm} keep?`,
    band3: (nm, d, w, noun) => `${nm} produces ${w} ${noun} and ships ${F(1, d)} of them to the fundraiser. How many ${noun} does ${nm} retain?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [n, d, w] = setGive[band][i % 6];
      const noun = setNouns[band][i % 6];
      const noun2 = setNouns[band][(i + 2) % 6];
      const noun3 = setNouns[band][(i + 4) % 6];
      items.push(
        item("fractionOfSet", "application", `storyGive_${band}`, band, {
          answer: (w / d) * n,
          answerType: "numberPad",
          display: { frac: { kind: "ofSet", n, d, w }, promptText: givePhr[band](nameAt(i + 2 + OFF[band]), n, d, w, noun) },
        })
      );
      items.push(
        item("fractionOfSet", "application", `storyUse_${band}`, band, {
          answer: w / d,
          answerType: "numberPad",
          display: { frac: { kind: "ofSet", n: 1, d, w }, promptText: usePhr[band](nameAt(i + 5 + OFF[band]), d, w, noun2) },
        })
      );
      items.push(
        item("fractionOfSet", "application", `storyKeep_${band}`, band, {
          answer: w - w / d,
          answerType: "numberPad",
          display: { frac: { kind: "keepRest", d, w }, promptText: keepPhr[band](nameAt(i + 8 + OFF[band]), d, w, noun3) },
        })
      );
    }
  }

  return items;
}
