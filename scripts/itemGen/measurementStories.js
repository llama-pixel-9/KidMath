/* measurement application stories — measuring in craft, garden, kitchen,
 * trail, and pet-care scenes. Claims ride countMath ({sum}, {gap},
 * {countBack}, {between}) or display.measure claims verified by
 * authorMeasurement.js. Band-1 prompts stay <= 20 and conversion-free.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS, FACTORS } from "./measurementTemplates.js";

const nameAt = (i) => NAMES[i % NAMES.length];
const B1 = "band1";
const B2 = "band2";
const B3 = "band3";

const mk = (subskill, structureType, band, question) => {
  if (band === B1) {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 story exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "measurement",
    subskill,
    itemFamily: "application",
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

const THINGS = ["ribbon", "yarn", "twine", "border tape"];

export function buildStoryItems() {
  const items = [];

  /* ---------------- lengthConvert stories ---------------- */

  const GROW_SKELETONS = [
    (nm, t, a, b) => `${nm}'s bean plant was ${a} cm on Monday and ${b} cm on Friday. How many centimetres did it grow?`,
    (nm, t, a, b) => `The sunflower by ${nm}'s window rose from ${a} cm to ${b} cm. How many centimetres taller is that?`,
  ];
  const growEmit = (band) => ([a, b], sk, nm) =>
    mk("lengthConvert", `storyGrow_${band}`, band, {
      answer: b - a,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: a, target: b }, promptText: sk(nm, null, a, b) },
    });
  items.push(...cycle(17, [[7, 12], [9, 15], [4, 9], [11, 18], [6, 14], [8, 16], [3, 11], [13, 20], [5, 13], [12, 17], [2, 10], [14, 19], [3, 8], [6, 15], [4, 12], [9, 20], [5, 16]], GROW_SKELETONS, 0, growEmit(B1)));
  items.push(...cycle(17, [[27, 62], [34, 71], [45, 88], [23, 56], [38, 79], [41, 94], [29, 63], [52, 97], [36, 75], [24, 58], [47, 86], [31, 69], [43, 91], [26, 54], [49, 83], [33, 77], [39, 82]], GROW_SKELETONS, 1, growEmit(B2)));

  const TRAIL_SKELETONS = [
    (nm, km) => `${nm} hikes a trail marked ${km} km. How many metres is the trail?`,
    (nm, km) => `The forest loop near ${nm}'s camp is ${km} km around. What is that in metres?`,
  ];
  const trailEmit = ([km], sk, nm) =>
    mk("lengthConvert", "storyTrailMetres", B2, {
      answer: km * 1000,
      answerType: "numberPad",
      display: { measure: { kind: "convert", amount: km, pair: "km>m" }, promptText: sk(nm, km) },
    });
  items.push(...cycle(17, [[2], [3], [5], [4], [7], [6], [8], [9], [1], [10], [12], [11], [15], [13], [14], [16], [18]], TRAIL_SKELETONS, 1, trailEmit));

  const BANNER_SKELETONS = [
    (nm, m, cm) => `${nm} sews a banner ${m} m ${cm} cm long. The shop measures in centimetres. How many centimetres long is it?`,
    (nm, m, cm) => `A parade streamer of ${nm}'s measures ${m} m ${cm} cm. How many centimetres is that?`,
  ];
  const bannerEmit = ([m, cm], sk, nm) =>
    mk("lengthConvert", "storyBannerCm", B3, {
      answer: m * 100 + cm,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [m * 100, cm] }, promptText: sk(nm, m, cm) },
    });
  items.push(...cycle(17, [[2, 34], [3, 12], [1, 48], [4, 21], [2, 55], [5, 13], [3, 37], [1, 64], [4, 49], [2, 70], [5, 26], [3, 81], [6, 14], [1, 93], [4, 38], [2, 26], [6, 41]], BANNER_SKELETONS, 0, bannerEmit));
  const RACE_SKELETONS = [
    (nm, total) => `${nm}'s relay covers ${total} m in all. How many kilometres is the relay?`,
    (nm, total) => `The charity walk ${nm} joins is ${total} m long. How many kilometres is that?`,
  ];
  const raceEmit = ([total], sk, nm) =>
    mk("lengthConvert", "storyRaceKm", B3, {
      answer: total / 1000,
      answerType: "numberPad",
      display: { measure: { kind: "convertUp", total, pair: "km>m" }, promptText: sk(nm, total) },
    });
  items.push(...cycle(17, [[2000], [3000], [5000], [4000], [7000], [6000], [8000], [9000], [1000], [10000], [12000], [11000], [15000], [13000], [14000], [16000], [18000]], RACE_SKELETONS, 1, raceEmit));
  // Band 1: cm strip joins in craft.
  const STRIP_SKELETONS = [
    (nm, t, a, b) => `${nm} glues a ${a} cm strip of ${t} to a ${b} cm strip for a card. How many centimetres of ${t} is that?`,
    (nm, t, a, b) => `For the art wall, ${nm} lines up ${a} cm of ${t} and then ${b} cm more. How long is the ${t} line in centimetres?`,
  ];
  const stripEmit = ([a, b, ti], sk, nm) =>
    mk("lengthConvert", "storyStripJoin", B1, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(nm, THINGS[ti % 4], a, b) },
    });
  items.push(...cycle(17, [[7, 6, 0], [8, 9, 1], [5, 12, 2], [6, 11, 3], [9, 4, 0], [12, 7, 1], [3, 14, 2], [8, 5, 3], [11, 6, 0], [4, 13, 1], [7, 9, 2], [15, 3, 3], [6, 8, 0], [9, 8, 1], [12, 5, 2], [2, 16, 3], [10, 7, 0]], STRIP_SKELETONS, 2, stripEmit));
  const SNIP_SKELETONS = [
    (nm, t, start, cut) => `${nm} snips ${cut} cm off ${start} cm of ${t}. How many centimetres of ${t} are left?`,
    (nm, t, start, cut) => `From ${start} cm of ${t}, ${nm} trims away ${cut} cm. What length of ${t} remains?`,
  ];
  const snipEmit = ([start, cut, ti], sk, nm) =>
    mk("lengthConvert", "storySnip", B1, {
      answer: start - cut,
      answerType: "numberPad",
      display: { counting: { kind: "countBack", start, back: cut }, promptText: sk(nm, THINGS[ti % 4], start, cut) },
    });
  items.push(...cycle(17, [[15, 8, 0], [18, 9, 1], [12, 5, 2], [20, 11, 3], [16, 7, 0], [14, 6, 1], [19, 12, 2], [17, 8, 3], [13, 4, 0], [11, 2, 1], [20, 14, 2], [18, 13, 3], [16, 9, 0], [15, 4, 1], [19, 6, 2], [12, 7, 3], [17, 10, 0]], SNIP_SKELETONS, 1, snipEmit));
  // Band 2 filler: metre walls in cm.
  const WALL_SKELETONS = [
    (nm, m) => `${nm} paints a wall ${m} m wide. The tape measure reads centimetres. How many centimetres wide is the wall?`,
    (nm, m) => `A mural ${m} m across gets a border from ${nm}. How many centimetres across is the mural?`,
  ];
  const wallEmit = ([m], sk, nm) =>
    mk("lengthConvert", "storyWallCm", B2, {
      answer: m * 100,
      answerType: "numberPad",
      display: { measure: { kind: "convert", amount: m, pair: "m>cm" }, promptText: sk(nm, m) },
    });
  items.push(...cycle(17, [[3], [5], [2], [7], [4], [6], [9], [8], [10], [12], [11], [13], [15], [14], [16], [17], [18]], WALL_SKELETONS, 0, wallEmit));

  /* ---------------- massVolumeConvert stories ---------------- */

  const PET_SKELETONS = [
    (nm, a, b) => `${nm}'s puppy weighed ${a} kg in spring and ${b} kg now. How many kilograms did it gain?`,
    (nm, a, b) => `The class rabbit went from ${a} kg to ${b} kg while ${nm} kept its chart. How many kilograms heavier is it?`,
  ];
  const petEmit = (band) => ([a, b], sk, nm) =>
    mk("massVolumeConvert", `storyPetGain_${band}`, band, {
      answer: b - a,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: a, target: b }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [[3, 7], [4, 9], [2, 8], [5, 11], [6, 13], [3, 10], [7, 15], [4, 12], [8, 17], [5, 14], [2, 6], [9, 18], [6, 16], [3, 9], [10, 19], [7, 13], [4, 11]], PET_SKELETONS, 0, petEmit(B1)));

  const SOUP_SKELETONS = [
    (nm, L) => `${nm}'s soup pot holds ${L} L. The ladle chart uses millilitres. How many millilitres does the pot hold?`,
    (nm, L) => `A lemonade cooler of ${L} L stands at ${nm}'s stall. How many millilitres is that?`,
  ];
  const soupEmit = ([L], sk, nm) =>
    mk("massVolumeConvert", "storySoupML", B2, {
      answer: L * 1000,
      answerType: "numberPad",
      display: { measure: { kind: "convert", amount: L, pair: "L>mL" }, promptText: sk(nm, L) },
    });
  items.push(...cycle(17, [[2], [3], [5], [4], [7], [6], [8], [9], [1], [10], [12], [11], [15], [13], [14], [16], [18]], SOUP_SKELETONS, 1, soupEmit));
  const FLOUR_SKELETONS = [
    (nm, kg) => `${nm}'s bakery order needs ${kg} kg of flour. The scale shows grams. How many grams is the order?`,
    (nm, kg) => `A sack of ${kg} kg of oats arrives for ${nm}. What is its mass in grams?`,
  ];
  const flourEmit = ([kg], sk, nm) =>
    mk("massVolumeConvert", "storyFlourG", B2, {
      answer: kg * 1000,
      answerType: "numberPad",
      display: { measure: { kind: "convert", amount: kg, pair: "kg>g" }, promptText: sk(nm, kg) },
    });
  items.push(...cycle(17, [[2], [3], [5], [4], [7], [6], [8], [9], [1], [10], [12], [11], [15], [13], [14], [16], [18]], FLOUR_SKELETONS, 0, flourEmit));

  const JUICE_SKELETONS = [
    (nm, a, b) => `${nm} mixes ${a} mL of mango juice with ${b} mL of orange juice. How many millilitres of punch is that?`,
    (nm, a, b) => `Into the punch bowl ${nm} pours ${a} mL and then ${b} mL. What volume in millilitres is in the bowl?`,
  ];
  const juiceEmit = (band) => ([a, b], sk, nm) =>
    mk("massVolumeConvert", `storyJuiceMix_${band}`, band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [[250, 380], [340, 275], [420, 190], [175, 465], [390, 225], [280, 355], [460, 145], [215, 490], [330, 265], [185, 440], [405, 210], [295, 370], [475, 130], [225, 385], [345, 280], [195, 450], [415, 240]], JUICE_SKELETONS, 1, juiceEmit(B3)));
  const FEED_SKELETONS = [
    (nm, kg, g) => `${nm} buys ${kg} kg ${g} g of birdseed. The feeder chart wants grams. How many grams of seed is that?`,
    (nm, kg, g) => `The hamster food ${nm} scoops weighs ${kg} kg ${g} g. Written only in grams, how much is it?`,
  ];
  const feedEmit = ([kg, g], sk, nm) =>
    mk("massVolumeConvert", "storyFeedGrams", B3, {
      answer: kg * 1000 + g,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [kg * 1000, g] }, promptText: sk(nm, kg, g) },
    });
  items.push(...cycle(17, [[2, 340], [3, 125], [1, 480], [4, 215], [2, 555], [5, 130], [3, 370], [1, 645], [4, 490], [2, 705], [5, 265], [3, 810], [6, 145], [1, 930], [4, 385], [2, 260], [6, 415]], FEED_SKELETONS, 0, feedEmit));
  // Band 1 fillers: pour together / drink away (<= 20 L).
  const POUR_SKELETONS = [
    (nm, a, b) => `${nm} empties a ${a} L pail and a ${b} L pail into the paddling pool. How many litres went in?`,
    (nm, a, b) => `Two watering cans, ${a} L and ${b} L, both go onto ${nm}'s garden. How many litres of water is that?`,
  ];
  const pourEmit = ([a, b], sk, nm) =>
    mk("massVolumeConvert", "storyPourIn", B1, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [[7, 6], [8, 9], [5, 12], [6, 11], [9, 4], [12, 7], [3, 14], [8, 5], [11, 6], [4, 13], [7, 9], [15, 3], [6, 8], [9, 8], [12, 5], [2, 16], [10, 7]], POUR_SKELETONS, 1, pourEmit));
  const DRINK_SKELETONS = [
    (nm, start, out) => `A ${start} L water cooler loses ${out} L on sports day. How many litres are left for ${nm}'s team?`,
    (nm, start, out) => `${nm}'s fish tank held ${start} L before ${out} L splashed out. How many litres remain?`,
  ];
  const drinkEmit = ([start, out], sk, nm) =>
    mk("massVolumeConvert", "storyPourOut", B1, {
      answer: start - out,
      answerType: "numberPad",
      display: { counting: { kind: "countBack", start, back: out }, promptText: sk(nm, start, out) },
    });
  items.push(...cycle(17, [[15, 8], [18, 9], [12, 5], [20, 11], [16, 7], [14, 6], [19, 12], [17, 8], [13, 4], [11, 2], [20, 14], [18, 13], [16, 9], [15, 4], [19, 6], [12, 7], [17, 10]], DRINK_SKELETONS, 0, drinkEmit));

  /* ---------------- benchmarkEstimate stories ---------------- */

  const GUESS_CHECK_SKELETONS = [
    (nm, obj, guess, real) => `${nm} guessed ${obj} at ${guess} cm; the ruler says ${real} cm. By how many centimetres was the guess off?`,
    (nm, obj, guess, real) => `Before measuring ${obj}, ${nm} guessed ${guess} cm. It is really ${real} cm. How many centimetres off was the guess?`,
  ];
  const guessCheckEmit = (band) => ([obj, guess, real], sk, nm) =>
    mk("benchmarkEstimate", `storyGuessOff_${band}`, band, {
      answer: Math.abs(real - guess),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: Math.min(guess, real), target: Math.max(guess, real) }, promptText: sk(nm, obj, guess, real) },
    });
  items.push(...cycle(17, [["a leaf", 6, 9], ["a crayon", 8, 11], ["a feather", 12, 7], ["a shell", 5, 9], ["a twig", 14, 18], ["a bookmark", 10, 15], ["a toy car", 9, 6], ["an eraser", 3, 5], ["a sticker", 4, 2], ["a spoon", 13, 16], ["a pinecone", 7, 10], ["a domino", 6, 4], ["a wristband", 15, 19], ["a leaf stem", 11, 8], ["a bottle cap", 2, 3], ["a chalk stick", 8, 12], ["a clothespin", 5, 7]], GUESS_CHECK_SKELETONS, 0, guessCheckEmit(B1)));
  items.push(...cycle(17, [["a scooter", 70, 92], ["a bench", 85, 61], ["a doormat", 45, 68], ["a poster", 60, 83], ["a shelf", 75, 52], ["a bath towel", 90, 66], ["a windowsill", 55, 79], ["a skateboard", 65, 88], ["a floor tile", 30, 47], ["a curtain", 95, 72], ["a table edge", 80, 58], ["a wagon", 50, 73], ["a broom", 85, 99], ["a step stool", 40, 62], ["a picture frame", 35, 51], ["a laundry basket", 45, 27], ["a rug edge", 70, 94]], GUESS_CHECK_SKELETONS, 1, guessCheckEmit(B2)));

  const SENSIBLE_SKELETONS = [
    (nm, obj, a, b) => `${nm} is labeling ${obj}. Which label makes sense: ${a} or ${b}?`,
    (nm, obj, a, b) => `For ${obj}, should ${nm} write ${a} or ${b}? Pick the sensible label.`,
  ];
  const sensibleEmit = (band, structureType) => ([obj, a, b, good], sk, nm, i) =>
    mk("benchmarkEstimate", structureType, band, {
      answer: good,
      choices: shuffled([a, b], i + 3),
      display: { measure: { kind: "pickLabel" }, promptText: sk(nm, obj, a, b) },
    });
  const SENSIBLE_B1 = [
    ["a milk carton", "1 L", "1 mL", "1 L"], ["a strawberry", "9 g", "9 kg", "9 g"],
    ["a sandbox", "2 m", "2 mm", "2 m"], ["a ladybug", "7 mm", "7 m", "7 mm"],
    ["a pillow", "1 kg", "20 kg", "1 kg"], ["a wading pool", "20 L", "20 mL", "20 L"],
    ["a house key", "6 cm", "6 m", "6 cm"], ["a garden hose", "10 m", "10 mm", "10 m"],
    ["a teabag", "2 g", "2 kg", "2 g"], ["a water bottle", "1 L", "1 mL", "1 L"],
    ["a doormat", "1 m", "1 km", "1 m"], ["a pebble", "10 g", "10 kg", "10 g"],
    ["a caterpillar", "4 cm", "4 m", "4 cm"], ["a bike ride to town", "3 km", "3 cm", "3 km"],
    ["a toy duck", "12 cm", "12 m", "12 cm"], ["a spoonful of honey", "5 mL", "5 L", "5 mL"],
    ["a bag of apples", "2 kg", "2 g", "2 kg"],
  ];
  items.push(...cycle(17, SENSIBLE_B1, SENSIBLE_SKELETONS, 1, sensibleEmit(B1, "storySensibleLabel")));
  const ROUND_TRIP_SKELETONS = [
    (nm, n) => `${nm} walks ${n} m to school. Rounded to the nearest ten, how many metres is the walk?`,
    (nm, n) => `The path ${nm} bikes measures ${n} m. How many metres is that, to the nearest ten?`,
  ];
  const roundTripEmit = ([n], sk, nm) =>
    mk("benchmarkEstimate", "storyRoundWalk", B2, {
      answer: Math.round(n / 10) * 10,
      answerType: "numberPad",
      display: { measure: { kind: "roundTen", n }, promptText: sk(nm, n) },
    });
  items.push(...cycle(17, [[123], [148], [267], [382], [235], [471], [356], [194], [312], [439], [265], [178], [341], [456], [227], [389], [163]], ROUND_TRIP_SKELETONS, 0, roundTripEmit));
  const CITY_SKELETONS = [
    (nm, n) => `The river walk in ${nm}'s town runs ${n} m. Rounded to the nearest hundred, how many metres is it?`,
    (nm, n) => `${nm} reads that the pier is ${n} m long. How many metres is that, to the nearest hundred?`,
  ];
  const cityEmit = ([n], sk, nm) =>
    mk("benchmarkEstimate", "storyRoundPier", B3, {
      answer: Math.round(n / 100) * 100,
      answerType: "numberPad",
      display: { measure: { kind: "roundHundred", n }, promptText: sk(nm, n) },
    });
  items.push(...cycle(17, [[534], [781], [672], [828], [351], [219], [764], [947], [128], [493], [655], [882], [273], [536], [915], [442], [187]], CITY_SKELETONS, 1, cityEmit));
  const OFF_BY_SKELETONS = [
    (nm, guess, real) => `${nm} estimated the gym at ${guess} m; it measures ${real} m. How many metres off was ${nm}'s estimate?`,
    (nm, guess, real) => `The banner hall is really ${real} m long, but ${nm} guessed ${guess} m. By how many metres did the guess miss?`,
  ];
  const offByEmit = ([guess, real], sk, nm) =>
    mk("benchmarkEstimate", "storyEstimateOff", B3, {
      answer: Math.abs(real - guess),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: Math.min(guess, real), target: Math.max(guess, real) }, promptText: sk(nm, guess, real) },
    });
  items.push(...cycle(17, [[250, 312], [400, 358], [150, 209], [300, 372], [500, 431], [200, 286], [350, 291], [450, 527], [175, 243], [325, 268], [275, 349], [425, 366], [225, 301], [375, 448], [125, 194], [475, 396], [260, 335]], OFF_BY_SKELETONS, 0, offByEmit));

  /* ---------------- compareOrder stories ---------------- */

  const RACE_CMP_SKELETONS = [
    (nm, x, dx, y, dy, u) => `${nm} watches two paper boats: the red one floats ${dx} ${u} and the blue one ${dy} ${u}. Which boat went farther, red or blue?`,
    (nm, x, dx, y, dy, u) => `Red sails ${dx} ${u}; blue sails ${dy} ${u}. ${nm} cheers the farther boat. Which color is it?`,
  ];
  const raceCmpEmit = (band, u) => ([dx, dy], sk, nm, i) =>
    mk("compareOrder", `storyBoatRace_${band}`, band, {
      answer: dx > dy ? "red" : "blue",
      choices: shuffled(["red", "blue"], i + 5),
      display: { measure: { kind: "cmp", a: dx, b: dy, pickLarger: true }, promptText: sk(nm, "red", dx, "blue", dy, u) },
    });
  items.push(...cycle(17, [[12, 9], [7, 15], [18, 11], [6, 13], [20, 17], [8, 16], [14, 5], [10, 19], [16, 12], [4, 9], [17, 14], [11, 20], [13, 8], [9, 18], [15, 10], [19, 16], [5, 12]], RACE_CMP_SKELETONS, 0, raceCmpEmit(B1, "m")));
  const JAR_CMP_SKELETONS = [
    (nm, a, b) => `${nm}'s honey jar holds ${a} and the syrup jar holds ${b}. Which jar holds more?`,
    (nm, a, b) => `Two jars sit on ${nm}'s shelf: honey at ${a}, syrup at ${b}. Which holds more?`,
  ];
  const jarCmpEmit = ([a, av, b, bv], sk, nm, i) =>
    mk("compareOrder", "storyJarCompare", B2, {
      answer: av > bv ? "the honey jar" : "the syrup jar",
      choices: shuffled(["the honey jar", "the syrup jar"], i + 7),
      display: { measure: { kind: "cmp", a: av, b: bv }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [["2 L", 2000, "1500 mL", 1500], ["1800 mL", 1800, "2 L", 2000], ["3 L", 3000, "2700 mL", 2700], ["3400 mL", 3400, "3 L", 3000], ["1 L", 1000, "800 mL", 800], ["1300 mL", 1300, "1 L", 1000], ["4 L", 4000, "3600 mL", 3600], ["4500 mL", 4500, "4 L", 4000], ["2 L", 2000, "2300 mL", 2300], ["2600 mL", 2600, "3 L", 3000], ["5 L", 5000, "4700 mL", 4700], ["5200 mL", 5200, "5 L", 5000], ["6 L", 6000, "5500 mL", 5500], ["6300 mL", 6300, "6 L", 6000], ["7 L", 7000, "6800 mL", 6800], ["7400 mL", 7400, "7 L", 7000], ["8 L", 8000, "8200 mL", 8200]], JAR_CMP_SKELETONS, 1, jarCmpEmit));
  const PARCEL_SKELETONS = [
    (nm, a, b, c) => `Three parcels wait at ${nm}'s door: ${a}, ${b}, and ${c}. Which parcel is heaviest?`,
    (nm, a, b, c) => `${nm} lifts parcels of ${a}, ${b}, and ${c}. Which one weighs the most?`,
  ];
  const parcelEmit = ([a, av, b, bv, c, cv], sk, nm, i) => {
    const best = av >= bv && av >= cv ? a : bv >= cv ? b : c;
    return mk("compareOrder", "storyParcelHeaviest", B3, {
      answer: best,
      choices: shuffled([a, b, c], i + 9),
      display: { measure: { kind: "cmp3", values: [av, bv, cv] }, promptText: sk(nm, a, b, c) },
    });
  };
  items.push(...cycle(17, [["2 kg", 2000, "1800 g", 1800, "2100 g", 2100], ["3 kg", 3000, "3200 g", 3200, "2900 g", 2900], ["1 kg", 1000, "900 g", 900, "1100 g", 1100], ["4 kg", 4000, "4300 g", 4300, "3800 g", 3800], ["5 kg", 5000, "4800 g", 4800, "5100 g", 5100], ["2 kg", 2000, "2200 g", 2200, "1900 g", 1900], ["6 kg", 6000, "5900 g", 5900, "6100 g", 6100], ["3 kg", 3000, "2800 g", 2800, "3100 g", 3100], ["7 kg", 7000, "7200 g", 7200, "6800 g", 6800], ["4 kg", 4000, "3900 g", 3900, "4100 g", 4100], ["8 kg", 8000, "7800 g", 7800, "8300 g", 8300], ["5 kg", 5000, "5200 g", 5200, "4900 g", 4900], ["9 kg", 9000, "9100 g", 9100, "8800 g", 8800], ["6 kg", 6000, "6200 g", 6200, "5800 g", 5800], ["1 kg", 1000, "1200 g", 1200, "800 g", 800], ["7 kg", 7000, "6900 g", 6900, "7100 g", 7100], ["8 kg", 8000, "8100 g", 8100, "7900 g", 7900]], PARCEL_SKELETONS, 0, parcelEmit));
  // Band 1: shorter-by stories; Band 2: cross-unit rope compare; Band 3: difference after converting.
  const TOWER_SKELETONS = [
    (nm, a, b) => `${nm}'s block tower is ${a} cm tall; a friend's is ${b} cm. How many centimetres taller is the taller tower?`,
    (nm, a, b) => `Two sandcastles: ${nm}'s at ${a} cm and a friend's at ${b} cm. What is the difference in centimetres?`,
  ];
  const towerEmit = ([a, b], sk, nm) =>
    mk("compareOrder", "storyTowerDiff", B1, {
      answer: Math.abs(a - b),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: Math.min(a, b), target: Math.max(a, b) }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [[15, 8], [18, 9], [12, 5], [20, 11], [16, 7], [14, 6], [19, 12], [17, 8], [13, 4], [11, 2], [20, 14], [18, 13], [16, 9], [15, 4], [19, 6], [12, 7], [17, 10]], TOWER_SKELETONS, 1, towerEmit));
  const ROPE_SKELETONS = [
    (nm, a, b) => `${nm} checks the climbing wall: rope A is ${a} and rope B is ${b}. Which rope is longer, A or B?`,
    (nm, a, b) => `${nm} coils rope A (${a}) and rope B (${b}). Which rope is the longer one?`,
  ];
  const ropeEmit = ([a, av, b, bv], sk, nm, i) =>
    mk("compareOrder", "storyRopeCompare", B2, {
      answer: av > bv ? "rope A" : "rope B",
      choices: shuffled(["rope A", "rope B"], i + 11),
      display: { measure: { kind: "cmp", a: av, b: bv }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [["2 m", 200, "170 cm", 170], ["260 cm", 260, "2 m", 200], ["3 m", 300, "330 cm", 330], ["280 cm", 280, "3 m", 300], ["4 m", 400, "360 cm", 360], ["440 cm", 440, "4 m", 400], ["5 m", 500, "530 cm", 530], ["470 cm", 470, "5 m", 500], ["6 m", 600, "560 cm", 560], ["640 cm", 640, "6 m", 600], ["7 m", 700, "730 cm", 730], ["670 cm", 670, "7 m", 700], ["8 m", 800, "760 cm", 760], ["840 cm", 840, "8 m", 800], ["9 m", 900, "930 cm", 930], ["870 cm", 870, "9 m", 900], ["1 m", 100, "90 cm", 90]], ROPE_SKELETONS, 0, ropeEmit));
  const GAP_AFTER_SKELETONS = [
    (nm, big, smallCm) => `${nm}'s kite string is ${big} m; a friend's is ${smallCm} cm. How many centimetres longer is ${nm}'s string?`,
    (nm, big, smallCm) => `${nm} unrolls ${big} m of streamer next to a ${smallCm} cm one. What is the difference in centimetres?`,
  ];
  const gapAfterEmit = ([big, smallCm], sk, nm) =>
    mk("compareOrder", "storyGapAfterConvert", B3, {
      answer: big * 100 - smallCm,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: smallCm, target: big * 100 }, promptText: sk(nm, big, smallCm) },
    });
  items.push(...cycle(17, [[2, 140], [3, 235], [4, 318], [2, 65], [5, 427], [3, 189], [6, 512], [4, 276], [7, 633], [5, 348], [2, 173], [8, 749], [6, 465], [3, 92], [9, 856], [7, 581], [4, 207]], GAP_AFTER_SKELETONS, 1, gapAfterEmit));

  /* ---------------- multiStepMeasure stories ---------------- */

  const FENCE_SKELETONS = [
    (nm, a, b, c) => `${nm} builds a garden edge from strips of ${a} cm, ${b} cm, and ${c} cm. How long is the edge in centimetres?`,
    (nm, a, b, c) => `Three sticks — ${a} cm, ${b} cm, ${c} cm — line up along ${nm}'s flower bed. What total length is that?`,
  ];
  const fenceEmit = (band) => ([a, b, c], sk, nm) =>
    mk("multiStepMeasure", `storyFence_${band}`, band, {
      answer: a + b + c,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b, c] }, promptText: sk(nm, a, b, c) },
    });
  items.push(...cycle(17, [[5, 7, 4], [6, 3, 8], [4, 9, 2], [7, 6, 5], [3, 8, 6], [9, 2, 7], [5, 4, 9], [8, 7, 3], [2, 6, 10], [7, 9, 4], [6, 5, 8], [4, 3, 12], [9, 6, 2], [5, 8, 7], [3, 10, 6], [8, 4, 5], [6, 9, 3]], FENCE_SKELETONS, 0, fenceEmit(B1)));
  items.push(...cycle(17, [[34, 27, 19], [45, 38, 12], [52, 29, 16], [63, 18, 14], [27, 46, 21], [38, 55, 15], [49, 24, 18], [56, 37, 25], [23, 68, 13], [64, 19, 22], [35, 48, 11], [47, 26, 24], [58, 33, 17], [29, 54, 20], [66, 25, 23], [37, 44, 26], [48, 35, 28]], FENCE_SKELETONS, 1, fenceEmit(B2)));

  const RECIPE_SKELETONS = [
    (nm, need, have) => `A recipe of ${nm}'s needs ${need} mL of water, and the measuring cup already holds ${have} mL. How many more millilitres must ${nm} add?`,
    (nm, need, have) => `${nm} needs ${need} mL of broth but has poured only ${have} mL. How many millilitres are still needed?`,
  ];
  const recipeEmit = (band) => ([need, have], sk, nm) =>
    mk("multiStepMeasure", `storyRecipeMore_${band}`, band, {
      answer: need - have,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have, target: need }, promptText: sk(nm, need, have) },
    });
  items.push(...cycle(17, [[500, 320], [400, 185], [600, 437], [750, 519], [350, 168], [800, 642], [450, 273], [900, 756], [550, 384], [700, 465], [650, 528], [850, 691], [300, 142], [950, 807], [250, 116], [875, 733], [625, 449]], RECIPE_SKELETONS, 0, recipeEmit(B3)));
  const TRIM_SKELETONS = [
    (nm, a, b, cut) => `${nm} ties a ${a} cm cord to a ${b} cm cord, then trims ${cut} cm off the end. How long is the cord now in centimetres?`,
    (nm, a, b, cut) => `After joining ${a} cm and ${b} cm of wire, ${nm} clips away ${cut} cm. What length of wire remains?`,
  ];
  const trimEmit = (band) => ([a, b, cut], sk, nm) =>
    mk("multiStepMeasure", `storyJoinTrim_${band}`, band, {
      answer: a + b - cut,
      answerType: "numberPad",
      display: { measure: { kind: "joinTrim", a, b, cut }, promptText: sk(nm, a, b, cut) },
    });
  items.push(...cycle(17, [[34, 27, 15], [45, 38, 20], [52, 29, 18], [63, 18, 25], [27, 46, 12], [38, 55, 30], [49, 24, 16], [56, 37, 40], [23, 68, 22], [64, 19, 35], [35, 48, 14], [47, 26, 28], [58, 33, 26], [29, 54, 32], [66, 25, 44], [37, 44, 24], [48, 35, 36]], TRIM_SKELETONS, 1, trimEmit(B2)));
  const PACK_SKELETONS = [
    (nm, kg, g, add) => `${nm}'s parcel weighs ${kg} kg ${g} g, then a ${add} g toy goes in. How many grams does the parcel weigh now?`,
    (nm, kg, g, add) => `A box of ${kg} kg ${g} g gains a ${add} g book from ${nm}. What is the new mass in grams?`,
  ];
  const packEmit = ([kg, g, add], sk, nm) =>
    mk("multiStepMeasure", "storyPackParcel", B3, {
      answer: kg * 1000 + g + add,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [kg * 1000, g, add] }, promptText: sk(nm, kg, g, add) },
    });
  items.push(...cycle(17, [[1, 300, 450], [2, 250, 380], [1, 550, 270], [3, 150, 490], [2, 450, 360], [1, 650, 180], [3, 350, 520], [2, 50, 670], [1, 750, 410], [4, 250, 330], [2, 650, 240], [3, 550, 160], [1, 850, 290], [4, 450, 120], [2, 850, 430], [3, 50, 780], [1, 950, 220]], PACK_SKELETONS, 0, packEmit));
  // Band 1 filler: two-hop walks.
  const WALK_SKELETONS = [
    (nm, a, b) => `${nm} hops ${a} m to the swing, then ${b} m to the slide. How many metres did ${nm} hop in all?`,
    (nm, a, b) => `First ${a} m to the sandbox, then ${b} m to the bench — how many metres does ${nm} travel?`,
  ];
  const walkEmit = ([a, b], sk, nm) =>
    mk("multiStepMeasure", "storyTwoHops", B1, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [[6, 7], [9, 8], [4, 12], [11, 5], [8, 6], [13, 7], [5, 14], [10, 9], [3, 15], [12, 6], [7, 8], [14, 4], [9, 10], [6, 13], [15, 5], [8, 11], [4, 16]], WALK_SKELETONS, 1, walkEmit));
  const LEFT_SKELETONS = [
    (nm, whole, p1, p2) => `${nm} pours a ${whole} L jug into two bowls: ${p1} L and ${p2} L. How many litres stay in the jug?`,
    (nm, whole, p1, p2) => `Out of ${whole} L of lemonade, ${nm} serves ${p1} L and then ${p2} L. How many litres are left?`,
  ];
  const leftEmit = ([whole, p1, p2], sk, nm) =>
    mk("multiStepMeasure", "storyPourTwice", B1, {
      answer: whole - p1 - p2,
      answerType: "numberPad",
      display: { measure: { kind: "joinTrim", a: whole, b: -p1, cut: p2 }, promptText: sk(nm, whole, p1, p2) },
    });
  items.push(...cycle(17, [[18, 5, 6], [20, 7, 4], [15, 3, 8], [19, 6, 5], [16, 4, 7], [20, 9, 3], [17, 5, 4], [14, 2, 6], [20, 8, 7], [18, 4, 9], [16, 6, 3], [19, 7, 8], [15, 5, 2], [20, 3, 11], [17, 8, 6], [18, 9, 2], [14, 4, 5]], LEFT_SKELETONS, 0, leftEmit));

  /* ---------------- top-ups ---------------- */

  // compareOrder stories: one more pattern per band.
  const SHELL_SKELETONS = [
    (nm, a, b) => `${nm} finds a ${a} cm shell and a ${b} cm shell. Which shell is the longer one?`,
    (nm, a, b) => `Two feathers drift to ${nm}: one ${a} cm, one ${b} cm. Which feather is longer?`,
  ];
  const shellEmit = ([a, b], sk, nm, i) =>
    mk("compareOrder", "storyShellLonger", B1, {
      answer: `the ${Math.max(a, b)} cm one`,
      choices: shuffled([`the ${a} cm one`, `the ${b} cm one`], i + 13),
      display: { measure: { kind: "cmp", a, b, pickLarger: true }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [[12, 9], [7, 15], [18, 11], [6, 13], [20, 17], [8, 16], [14, 5], [10, 19], [16, 12], [4, 9], [17, 14], [11, 20], [13, 8], [9, 18], [15, 10], [19, 16], [5, 12]], SHELL_SKELETONS, 0, shellEmit));
  const PATH_CMP_SKELETONS = [
    (nm, a, b) => `${nm} may take the meadow path (${a}) or the creek path (${b}). Which path is shorter?`,
    (nm, a, b) => `The meadow path runs ${a} and the creek path runs ${b}. ${nm} wants the shorter walk. Which path is it?`,
  ];
  const pathCmpEmit = ([a, av, b, bv], sk, nm, i) =>
    mk("compareOrder", "storyPathShorter", B2, {
      answer: av < bv ? "the meadow path" : "the creek path",
      choices: shuffled(["the meadow path", "the creek path"], i + 15),
      display: { measure: { kind: "cmp", a: av, b: bv }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [["2 km", 2000, "1700 m", 1700], ["1800 m", 1800, "2 km", 2000], ["1 km", 1000, "1200 m", 1200], ["900 m", 900, "1 km", 1000], ["3 km", 3000, "2600 m", 2600], ["3300 m", 3300, "3 km", 3000], ["2 km", 2000, "2400 m", 2400], ["1600 m", 1600, "2 km", 2000], ["4 km", 4000, "3700 m", 3700], ["4300 m", 4300, "4 km", 4000], ["1 km", 1000, "800 m", 800], ["1100 m", 1100, "1 km", 1000], ["5 km", 5000, "4600 m", 4600], ["5500 m", 5500, "5 km", 5000], ["3 km", 3000, "3100 m", 3100], ["2900 m", 2900, "3 km", 3000], ["6 km", 6000, "5800 m", 5800]], PATH_CMP_SKELETONS, 1, pathCmpEmit));
  const MELON_SKELETONS = [
    (nm, a, b, diff) => `${nm}'s pumpkin weighs ${a} g and a friend's weighs ${b} g. How many grams heavier is the heavier pumpkin?`,
    (nm, a, b, diff) => `Two melons weigh in at ${a} g and ${b} g. What is the difference in grams? ${nm} does the subtraction.`,
  ];
  const melonEmit = ([a, b], sk, nm) =>
    mk("compareOrder", "storyMelonDiff", B3, {
      answer: Math.abs(a - b),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: Math.min(a, b), target: Math.max(a, b) }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [[2340, 1875], [3125, 2660], [1480, 2015], [4215, 3750], [2555, 3090], [5130, 4665], [3370, 2905], [1645, 2180], [4490, 4025], [2705, 3240], [5265, 4800], [3810, 3345], [6145, 5680], [1930, 2465], [4385, 3920], [2260, 2795], [6415, 5950]], MELON_SKELETONS, 0, melonEmit));

  // multiStepMeasure stories: one more pattern at bands 2 and 3.
  const QUILT_SKELETONS = [
    (nm, a, b, c) => `${nm} sews quilt strips of ${a} cm, ${b} cm, and ${c} cm into one row. How many centimetres long is the row?`,
    (nm, a, b, c) => `Three patches — ${a} cm, ${b} cm, and ${c} cm wide — join side by side on ${nm}'s quilt. How wide is the row in centimetres?`,
  ];
  const quiltEmit = ([a, b, c], sk, nm) =>
    mk("multiStepMeasure", "storyQuiltRow", B2, {
      answer: a + b + c,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b, c] }, promptText: sk(nm, a, b, c) },
    });
  items.push(...cycle(17, [[24, 31, 18], [35, 22, 27], [42, 19, 33], [28, 36, 21], [45, 17, 29], [31, 40, 15], [26, 38, 23], [49, 21, 16], [33, 25, 37], [18, 44, 26], [39, 28, 20], [22, 35, 32], [47, 16, 24], [29, 41, 19], [36, 23, 30], [43, 27, 14], [25, 39, 31]], QUILT_SKELETONS, 1, quiltEmit));
  const TANK_SKELETONS = [
    (nm, L, mL) => `${nm} tops up an aquarium with ${L} L and then ${mL} mL of water. How many millilitres went in altogether?`,
    (nm, L, mL) => `The camp cooler gets ${L} L of water plus ${mL} mL more from ${nm}. How many millilitres is that in total?`,
  ];
  const tankEmit = ([L, mL], sk, nm) =>
    mk("multiStepMeasure", "storyTankFill", B3, {
      answer: L * 1000 + mL,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [L * 1000, mL] }, promptText: sk(nm, L, mL) },
    });
  items.push(...cycle(17, [[2, 340], [3, 125], [1, 480], [4, 215], [2, 555], [5, 130], [3, 370], [1, 645], [4, 490], [2, 705], [5, 265], [3, 810], [6, 145], [1, 930], [4, 385], [2, 260], [6, 415]], TANK_SKELETONS, 0, tankEmit));

  /* ---------------- second top-up round ---------------- */

  // benchmarkEstimate app: one more pattern per band.
  const TOOL_SKELETONS = [
    (nm, task, good, bad) => `${nm} plans to measure ${task}. Should ${nm} record it in ${good} or ${bad}?`,
    (nm, task, good, bad) => `For ${task}, which unit should ${nm} write down: ${good} or ${bad}?`,
  ];
  const toolEmit = ([task, good, bad], sk, nm, i) =>
    mk("benchmarkEstimate", "storyUnitChoice", B1, {
      answer: good,
      choices: shuffled([good, bad], i + 17),
      display: { measure: { kind: "pickLabel" }, promptText: sk(nm, task, good, bad) },
    });
  items.push(...cycle(17, [["the classroom floor", "metres", "millimetres"], ["a beetle's back", "millimetres", "metres"], ["the walk to school", "kilometres", "centimetres"], ["a lunchbox", "centimetres", "kilometres"], ["a full watering can", "litres", "millilitres"], ["a spoon of syrup", "millilitres", "litres"], ["a sack of potatoes", "kilograms", "grams"], ["one raisin", "grams", "kilograms"], ["the school hallway", "metres", "millimetres"], ["an eyelash", "millimetres", "kilometres"], ["a bike trail", "kilometres", "centimetres"], ["a postcard", "centimetres", "metres"], ["a bathtub of water", "litres", "millilitres"], ["a single tear drop", "millilitres", "litres"], ["a pet turtle", "grams", "kilograms"], ["a filled backpack", "kilograms", "grams"], ["a jump rope", "metres", "kilometres"]], TOOL_SKELETONS, 0, toolEmit));
  const FLAG_SKELETONS = [
    (nm, obj, guess, ok) => `Before measuring, ${nm} guesses the ${obj} at ${guess}. Is that a sensible guess?`,
    (nm, obj, guess, ok) => `${nm} eyeballs the ${obj} and says "${guess}". Does the guess make sense?`,
  ];
  const flagEmit = ([obj, guess, ok], sk, nm) =>
    mk("benchmarkEstimate", "storyGuessJudge", B2, {
      answer: ok ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { measure: { kind: "claim" }, promptText: sk(nm, obj, guess, ok), truth: ok },
    });
  items.push(...cycle(17, [["flag pole", "6 m", true], ["flag pole", "6 cm", false], ["school gate", "3 m", true], ["school gate", "3 km", false], ["water fountain", "1 m", true], ["water fountain", "100 m", false], ["library shelf", "2 m", true], ["library shelf", "2 mm", false], ["gym rope", "5 m", true], ["gym rope", "5 km", false], ["picnic bench", "2 m", true], ["picnic bench", "40 m", false], ["basketball hoop", "3 m", true], ["basketball hoop", "30 cm", false], ["slide ladder", "2 m", true], ["slide ladder", "200 m", false], ["sandbox edge", "3 m", true]], FLAG_SKELETONS, 1, flagEmit));
  const BOARDS_SKELETONS = [
    (nm, a, b) => `${nm} lines up boards of ${a} cm and ${b} cm. Which hundred is the total closest to?`,
    (nm, a, b) => `Two logs measure ${a} cm and ${b} cm. Rounding the total to the nearest hundred, what does ${nm} get?`,
  ];
  const boardsEmit = ([a, b], sk, nm) =>
    mk("benchmarkEstimate", "storyBoardsRound", B3, {
      answer: Math.round((a + b) / 100) * 100,
      answerType: "numberPad",
      display: { measure: { kind: "closestSum", a, b }, promptText: sk(nm, a, b) },
    });
  items.push(...cycle(17, [[198, 305], [287, 412], [395, 209], [489, 316], [178, 224], [267, 338], [359, 445], [468, 129], [186, 219], [278, 327], [368, 439], [457, 148], [196, 411], [289, 217], [377, 328], [466, 239], [158, 343]], BOARDS_SKELETONS, 0, boardsEmit));

  // massVolume app: bands 2 and 3.
  const BATTER_SKELETONS = [
    (nm, need, have) => `${nm}'s batter needs ${need} g of sugar; the bowl holds ${have} g so far. How many more grams must go in?`,
    (nm, need, have) => `The bread dough calls for ${need} g of flour and ${nm} has added ${have} g. How many grams are missing?`,
  ];
  const batterEmit = ([need, have], sk, nm) =>
    mk("massVolumeConvert", "storyBatterMore", B2, {
      answer: need - have,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have, target: need }, promptText: sk(nm, need, have) },
    });
  items.push(...cycle(17, [[500, 320], [400, 185], [600, 437], [750, 519], [350, 168], [800, 642], [450, 273], [900, 756], [550, 384], [700, 465], [650, 528], [850, 691], [300, 142], [950, 807], [250, 116], [875, 733], [625, 449]], BATTER_SKELETONS, 1, batterEmit));
  const JARS_SKELETONS = [
    (nm, k, per) => `${nm} fills ${k} honey jars with ${per} g each. How many grams of honey is that in all?`,
    (nm, k, per) => `Each of ${nm}'s ${k} jam jars holds ${per} g. What total mass of jam is that?`,
  ];
  const jarsEmit = ([k, per], sk, nm) =>
    mk("massVolumeConvert", "storyJarsTotal", B3, {
      answer: k * per,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: Array.from({ length: k }, () => per) }, promptText: sk(nm, k, per) },
    });
  items.push(...cycle(17, [[3, 250], [4, 320], [2, 480], [5, 210], [3, 340], [4, 150], [2, 650], [5, 130], [3, 420], [4, 275], [2, 590], [5, 180], [3, 510], [4, 235], [2, 720], [5, 160], [3, 380]], JARS_SKELETONS, 0, jarsEmit));

  // lengthConvert app band 3: ribbon left after use.
  const RIBBON_LEFT_SKELETONS = [
    (nm, m, cm, used) => `${nm} starts with ${m} m ${cm} cm of ribbon and uses ${used} cm on a bow. How many centimetres of ribbon remain?`,
    (nm, m, cm, used) => `From a spool of ${m} m ${cm} cm, ${nm} cuts ${used} cm for a wreath. What length in centimetres is left?`,
  ];
  const ribbonLeftEmit = ([m, cm, used], sk, nm) =>
    mk("lengthConvert", "storyRibbonLeft", B3, {
      answer: m * 100 + cm - used,
      answerType: "numberPad",
      display: { measure: { kind: "joinTrim", a: m * 100, b: cm, cut: used }, promptText: sk(nm, m, cm, used) },
    });
  items.push(...cycle(17, [[2, 34, 150], [3, 12, 240], [1, 48, 65], [4, 21, 310], [2, 55, 180], [5, 13, 425], [3, 37, 265], [1, 64, 92], [4, 49, 355], [2, 70, 145], [5, 26, 480], [3, 81, 215], [6, 14, 530], [1, 93, 78], [4, 38, 390], [2, 26, 165], [6, 41, 505]], RIBBON_LEFT_SKELETONS, 1, ribbonLeftEmit));

  return items;
}
