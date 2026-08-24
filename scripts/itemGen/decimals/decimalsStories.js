/* decimals bank — application stories. Three skeletons per subskill per
 * band, 17 names each. Conventions in decimalsTemplates.js.
 */

import { shuffled } from "../counting/countingTemplates.js";
import { item, nameAt, D2, OFF, TENTH_WORDS } from "./decimalsTemplates.js";

const N = 17;

export function decimalsStories() {
  const items = [];
  let seed = 551;

  /* ---------------- tenthsHundredths ---------------- */

  const dimesPhr = {
    band1: (nm, n) => `A dime is one tenth of a dollar. ${nm} carries ${n} dimes and nothing else. Type ${nm}'s money as a decimal part of a dollar.`,
    band2: (nm, n) => `${nm} empties a piggy bank and finds exactly ${n} dimes. Each dime is a tenth of a dollar. Type the total as a decimal part of a dollar.`,
    band3: (nm, n) => `${nm}'s coin pouch holds ${n} dimes and no other coins; a dime is a tenth of a dollar. Type the amount as a decimal part of a dollar.`,
  };
  const jugPhr = {
    band1: (nm, n) => `${nm}'s water jug has 10 equal marks and the water reaches mark ${n}. Type the full part of the jug as a decimal.`,
    band2: (nm, n) => `The class fish tank shows 10 equal level marks; ${nm} reads the water at mark ${n}. Type the filled part as a decimal.`,
    band3: (nm, n) => `${nm} checks a rain barrel with 10 equal level marks; the water sits at mark ${n}. Type the filled part of the barrel as a decimal.`,
  };
  const pennyPhr = {
    band1: (nm, n, coin) => `A dime is one tenth of a dollar. ${nm} says 0.${n} of a dollar is the same as ${n} ${coin}. Is this right?`,
    band2: (nm, n) => `${nm} saves ${n} pennies, and each penny is a hundredth of a dollar. Type ${nm}'s savings as a decimal part of a dollar.`,
    band3: (nm, n) => `${nm} counts ${n} pennies into a jar; a penny is one hundredth of a dollar. Type the jar's total as a decimal part of a dollar.`,
  };
  const tenthsData = { band1: [1, 2, 3, 4, 5, 6, 7, 8, 9], band2: [1, 2, 3, 4, 5, 6, 7, 8, 9], band3: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
  const pennyData = { band1: [1, 2, 3, 4, 5, 6, 7, 8, 9], band2: [15, 27, 38, 42, 56, 63, 79, 84, 91], band3: [17, 29, 33, 48, 52, 66, 74, 88, 95] };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const n = tenthsData[band][i % 9];
      const p = pennyData[band][i % 9];
      items.push(
        item("tenthsHundredths", "application", `storyDimes_${band}`, band, {
          answer: D2(n / 10),
          answerType: "decimal",
          display: { dec: { kind: "tenths", n }, promptText: dimesPhr[band](nameAt(i + 1 + OFF[band]), n) },
        })
      );
      items.push(
        item("tenthsHundredths", "application", `storyJug_${band}`, band, {
          answer: D2(n / 10),
          answerType: "decimal",
          display: { dec: { kind: "tenths", n }, promptText: jugPhr[band](nameAt(i + 4 + OFF[band]), n) },
        })
      );
      if (band === "band1") {
        const ok = i % 2 === 0;
        items.push(
          item("tenthsHundredths", "application", `storyPenny_${band}`, band, {
            answer: ok ? "Yes" : "No",
            choices: ["Yes", "No"],
            display: { dec: { kind: "authored" }, promptText: pennyPhr.band1(nameAt(i + 7 + OFF[band]), p, ok ? (p === 1 ? "dime" : "dimes") : (p === 1 ? "penny" : "pennies")), truth: ok },
          })
        );
      } else {
        items.push(
          item("tenthsHundredths", "application", `storyPenny_${band}`, band, {
            answer: D2(p / 100),
            answerType: "decimal",
            display: { dec: { kind: "gridShade", h: p }, promptText: pennyPhr[band](nameAt(i + 7 + OFF[band]), p) },
          })
        );
      }
    }
  }

  /* ---------------- fractionToDecimal ---------------- */

  const runPhr = {
    band1: (nm, n, d) => `${nm} runs ${n}/${d} of a kilometer. Type that distance as a decimal.`,
    band2: (nm, n, d) => `On the trail, ${nm} covers ${n}/${d} of a kilometer before resting. Type the distance as a decimal.`,
    band3: (nm, n, d) => `${nm}'s fitness app logs ${n}/${d} of a kilometer for the warm-up. Type the logged distance as a decimal.`,
  };
  const ribbonPhr = {
    band1: (nm, n, d) => `${nm} uses ${n}/${d} of a meter of ribbon for a bow. Type the used length as a decimal.`,
    band2: (nm, n, d) => `A craft calls for ${n}/${d} of a meter of string, which ${nm} cuts. Type the cut length as a decimal.`,
    band3: (nm, n, d) => `${nm} trims ${n}/${d} of a meter of wire for a model. Type the trimmed length as a decimal.`,
  };
  const bakePhr = {
    band1: (nm, n, d) => `A recipe uses ${n}/${d} of a cup of milk. ${nm} measures it. Type the amount as a decimal.`,
    band2: (nm, n, d) => `${nm} pours ${n}/${d} of a cup of juice into the batter. Type the poured amount as a decimal.`,
    band3: (nm, n, d) => `The glaze needs ${n}/${d} of a cup of honey, which ${nm} spoons out. Type the amount as a decimal.`,
  };
  const fdData = {
    band1: [[1, 10], [3, 10], [5, 10], [7, 10], [9, 10], [2, 10], [4, 10], [6, 10], [8, 10]],
    band2: [[25, 100], [50, 100], [75, 100], [40, 100], [13, 100], [62, 100], [88, 100], [31, 100], [99, 100]],
    band3: [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [7, 20], [12, 25]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [n, d] = fdData[band][i % 9];
      items.push(
        item("fractionToDecimal", "application", `storyRun_${band}`, band, {
          answer: D2(n / d),
          answerType: "decimal",
          display: { dec: { kind: "fromFraction", n, d }, promptText: runPhr[band](nameAt(i + 2 + OFF[band]), n, d) },
        })
      );
      items.push(
        item("fractionToDecimal", "application", `storyRibbon_${band}`, band, {
          answer: D2(n / d),
          answerType: "decimal",
          display: { dec: { kind: "fromFraction", n, d }, promptText: ribbonPhr[band](nameAt(i + 5 + OFF[band]), n, d) },
        })
      );
      items.push(
        item("fractionToDecimal", "application", `storyBake_${band}`, band, {
          answer: D2(n / d),
          answerType: "decimal",
          display: { dec: { kind: "fromFraction", n, d }, promptText: bakePhr[band](nameAt(i + 8 + OFF[band]), n, d) },
        })
      );
    }
  }

  /* ---------------- compareDecimals ---------------- */

  const farPhr = {
    band1: (nm, a, b) => `${nm} swims ${a} of a lap; a teammate swims ${b} of a lap. Pick the decimal that is farther.`,
    band2: (nm, a, b) => `${nm} bikes ${a} of the loop while a friend bikes ${b} of it. Which decimal marks the longer ride?`,
    band3: (nm, a, b) => `${nm} completes ${a} of the course; a rival completes ${b}. Which decimal represents more of the course?`,
  };
  const tallPhr = {
    band1: (nm, a, b) => `${nm}'s bean plant is ${a} of a meter tall and the sunflower is ${b} of a meter. Pick the taller height.`,
    band2: (nm, a, b) => `In ${nm}'s garden, the tomato vine reads ${a} meters and the pepper plant ${b} meters. Which decimal is taller?`,
    band3: (nm, a, b) => `${nm} measures two saplings at ${a} meters and ${b} meters. Which decimal shows the taller sapling?`,
  };
  const fullPhr = {
    band1: (nm, a, b) => `${nm} fills one bottle ${a} full and another ${b} full. Pick the decimal for the fuller bottle.`,
    band2: (nm, a, b) => `${nm}'s two thermoses read ${a} full and ${b} full. Which decimal marks the fuller one?`,
    band3: (nm, a, b) => `Two tanks in ${nm}'s lab read ${a} and ${b} full. Which decimal indicates more water?`,
  };
  const cmpData = {
    band1: [["0.7", "0.3"], ["0.2", "0.8"], ["0.9", "0.4"], ["0.1", "0.5"], ["0.6", "0.2"], ["0.3", "0.9"], ["0.8", "0.6"], ["0.4", "0.1"], ["0.5", "0.7"]],
    band2: [["0.5", "0.45"], ["0.08", "0.8"], ["0.25", "0.52"], ["0.7", "0.65"], ["0.09", "0.1"], ["0.33", "0.3"], ["0.75", "0.57"], ["0.06", "0.6"], ["0.44", "0.4"]],
    band3: [["3.45", "3.5"], ["1.08", "1.8"], ["5.55", "5.5"], ["6.19", "6.9"], ["7.07", "7.7"], ["2.34", "2.43"], ["9.01", "9.1"], ["4.44", "4.4"], ["8.3", "8.29"]],
  };
  const mkCmp = (band, i, phr, off, structure, a, b) => {
    const good = Number(a) > Number(b) ? a : b;
    return item("compareDecimals", "application", `${structure}_${band}`, band, {
      answer: good,
      choices: shuffled([a, b], (seed += 1)),
      display: { dec: { kind: "cmpPickDec", a: Number(a), b: Number(b), labels: [a, b] }, promptText: phr(nameAt(i + off + OFF[band]), a, b) },
    });
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [a, b] = cmpData[band][i % 9];
      items.push(mkCmp(band, i, farPhr[band], 0, "storyFar", a, b));
      items.push(mkCmp(band, i, tallPhr[band], 3, "storyTall", a, b));
      items.push(mkCmp(band, i, fullPhr[band], 6, "storyFull", a, b));
    }
  }

  /* ---------------- decimalAsNumber ---------------- */

  const trailPhr = {
    band1: (nm, k) => `A walking path from 0 to 1 kilometer has 10 equal marks. ${nm} stops at mark ${k}. Type ${nm}'s spot as a decimal.`,
    band2: (nm, k) => `${nm} jogs a 1-kilometer track marked in 10 equal steps and pauses at mark ${k}. Type the pause point as a decimal.`,
    band3: (nm, k) => `A 1-kilometer greenway is signposted at 100 equal marks; ${nm} rests at mark ${k}. Type the rest point as a decimal.`,
  };
  const pourPhr = {
    band1: (nm, a) => `${nm}'s glass holds ${a} of a liter. ${nm} pours in one tenth more. Type the new amount as a decimal.`,
    band2: (nm, a) => `A beaker in ${nm}'s experiment reads ${a} liters, and ${nm} adds a tenth of a liter. Type the new reading as a decimal.`,
    band3: (nm, a) => `${nm} tops up a ${a}-liter watering can with one hundredth of a liter. Type the new volume as a decimal.`,
  };
  const stepPhr = {
    band1: (nm, a, b, c) => `${nm} reads the markers ${a}, ${b}, ${c} while walking by tenths. Type the next marker's decimal.`,
    band2: (nm, a, b, c) => `The stakes along ${nm}'s row read ${a}, ${b}, ${c}, climbing by a tenth. Type the next stake's decimal.`,
    band3: (nm, a, b, c) => `${nm} logs gauge readings ${a}, ${b}, ${c}, rising by a hundredth each time. Type the next reading.`,
  };
  const trailData = { band1: [1, 2, 3, 4, 5, 6, 7, 8, 9], band2: [1, 2, 3, 4, 5, 6, 7, 8, 9], band3: [5, 15, 25, 35, 45, 55, 65, 75, 95] };
  const pourData = { band1: ["0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.1", "0.3"], band2: ["0.45", "0.32", "0.67", "0.28", "0.53", "0.76", "0.14", "0.89", "0.61"], band3: ["3.45", "2.38", "5.67", "1.29", "4.53", "6.76", "7.14", "8.89", "9.61"] };
  const stepData = { band1: [0, 1, 2, 3, 4, 5, 6, 0, 2], band2: [12, 25, 38, 41, 54, 65, 73, 86, 62], band3: [11, 24, 37, 41, 55, 68, 72, 86, 93] };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const k = trailData[band][i % 9];
      const den = band === "band3" ? 100 : 10;
      items.push(
        item("decimalAsNumber", "application", `storyTrail_${band}`, band, {
          answer: D2(k / den),
          answerType: "decimal",
          display: { dec: { kind: "tickDec", k, den }, promptText: trailPhr[band](nameAt(i + 1 + OFF[band]), k) },
        })
      );
      const a = pourData[band][i % 9];
      const step = band === "band3" ? 0.01 : 0.1;
      items.push(
        item("decimalAsNumber", "application", `storyPour_${band}`, band, {
          answer: D2(Number(a) + step),
          answerType: "decimal",
          display: { dec: { kind: "addDec", a: Number(a), b: step }, promptText: pourPhr[band](nameAt(i + 4 + OFF[band]), a) },
        })
      );
      const s = stepData[band][i % 9];
      const start = band === "band2" ? s / 10 : band === "band3" ? s / 100 : s / 10;
      const st = band === "band3" ? 0.01 : 0.1;
      items.push(
        item("decimalAsNumber", "application", `storyStep_${band}`, band, {
          answer: D2(start + 3 * st),
          answerType: "decimal",
          display: { dec: { kind: "countOnDec", start, step: st, k: 3 }, promptText: stepPhr[band](nameAt(i + 7 + OFF[band]), D2(start), D2(start + st), D2(start + 2 * st)) },
        })
      );
    }
  }

  return items;
}
