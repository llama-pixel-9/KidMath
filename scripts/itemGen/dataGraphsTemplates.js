/* Deterministic dataGraphs bank items — procedural and conceptual cells for
 * readBar, compareBars, pictograph, dataAnalysis.
 *
 * Visual payloads mirror the generator exactly:
 *   bar graph:  display {type:"barGraph", figure:"barGraph", bars:[{label,value}...]}
 *   tally:      display {figure:"tallyChart", rows:[{label,count}...]}
 *   pictograph: display {figure:"pictograph", keyValue, rows:[{label,symbols}...]}
 * Every answer is re-derived from the drawn data by authorDataGraphs.js.
 *
 * UNIQUENESS DISCIPLINE (this mode's trap): graph prompts carry no numbers,
 * so uniqueness must come from words. Every prompt embeds the graph's TITLE
 * (one per category set), each band has its OWN phrasing set, and repeated
 * uses of a set within a band switch phrasing by pass. Names carry a
 * per-band offset. Bands scale data: K-1 <= 9 / key 1; 2-3 <= 14 / key 2,5;
 * 4-5 <= 20 / key 10. Judged = "Is this right?" Yes/No. No multiSelect.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "dataGraphs",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const nameAt = (i) => NAMES[i % NAMES.length];

export const SETS = [
  { title: "pet fair", labels: ["kittens", "puppies", "bunnies", "chicks"] },
  { title: "fruit stand", labels: ["apples", "pears", "plums", "cherries"] },
  { title: "recess games", labels: ["soccer", "tag", "hopscotch", "jump rope"] },
  { title: "favorite colors", labels: ["red", "blue", "green", "yellow"] },
  { title: "bird watch", labels: ["robins", "wrens", "jays", "finches"] },
  { title: "school ride", labels: ["vans", "bikes", "buses", "scooters"] },
];

const barsFrom = (setIdx, values) => SETS[setIdx].labels.map((label, i) => ({ label, value: values[i] }));
const barDisplay = (bars) => ({ type: "barGraph", figure: "barGraph", bars });
const titleOf = (vi) => SETS[vi % SETS.length].title;
const pass = (vi) => Math.floor(vi / SETS.length); // 0 or 1 within a 12-set band

// Band-1 quadruples keep the TOTAL <= 20 so judged-total prompts stay legal.
const B1_VALUES = [
  [2, 5, 3, 7], [1, 6, 4, 8], [1, 7, 3, 5], [2, 6, 4, 8], [1, 5, 2, 9], [3, 6, 2, 7],
  [1, 8, 4, 6], [2, 7, 3, 8], [1, 4, 2, 6], [3, 5, 2, 8], [1, 9, 2, 7], [2, 4, 3, 9],
];
const B2_VALUES = [
  [12, 7, 14, 3], [9, 13, 2, 11], [14, 6, 10, 1], [5, 12, 8, 14], [11, 3, 13, 7], [2, 10, 6, 12],
  [13, 8, 4, 9], [7, 14, 11, 5], [10, 2, 12, 8], [3, 11, 9, 13], [12, 5, 1, 10], [6, 9, 14, 2],
];
const B3_VALUES = [
  [18, 7, 12, 20], [15, 9, 19, 4], [20, 11, 6, 16], [8, 17, 13, 19], [14, 20, 5, 10], [19, 3, 16, 12],
  [11, 18, 8, 15], [6, 13, 20, 9], [17, 4, 14, 18], [10, 19, 7, 13], [16, 8, 18, 5], [12, 15, 3, 17],
];
const BAND_VALUES = { band1: B1_VALUES, band2: B2_VALUES, band3: B3_VALUES };

// Per-band read phrasings, keyed by pass (0/1) so a set's second use differs.
const READ_PHRS = {
  band1: [
    (t, l) => `The ${t} graph: how many ${l}?`,
    (t, l) => `Look at the ${t} graph. How many ${l} are there?`,
  ],
  band2: [
    (t, l) => `In the ${t} graph, what count does the ${l} bar show?`,
    (t, l) => `Read the ${t} graph carefully. How many ${l} does it show?`,
  ],
  band3: [
    (t, l) => `The ${t} graph is scaled — read carefully. How many ${l} does it show?`,
    (t, l) => `From the ${t} graph, find the precise count. How many ${l} is that?`,
  ],
};

/* ================================================================== */
/* readBar                                                             */
/* ================================================================== */

export function readBarProcedural() {
  const items = [];
  for (const band of ["band1", "band2", "band3"]) {
    BAND_VALUES[band].forEach((values, vi) => {
      const bars = barsFrom(vi % SETS.length, values);
      const t = titleOf(vi);
      const labelPair = pass(vi) === 0 ? [0, 2] : [1, 3];
      for (const bi of labelPair) {
        const target = bars[bi];
        items.push(
          item("readBar", "procedural", `barRead_${band}`, band, {
            answer: target.value,
            answerType: "barGraph",
            display: { ...barDisplay(bars), data: { kind: "barRead", label: target.label }, promptText: READ_PHRS[band][bi % 2](t, target.label) },
          })
        );
      }
      // max/min typed reads, phrasing switched by pass.
      const maxPhr = pass(vi) === 0
        ? `Find the tallest bar of the ${t} graph. How many votes does it show?`
        : `Which count does the ${t} graph's tallest bar reach? Type the number.`;
      const minPhr = pass(vi) === 0
        ? `Find the shortest bar of the ${t} graph. How many votes does it show?`
        : `Which count does the ${t} graph's shortest bar reach? Type the number.`;
      const bandTag = band === "band1" ? "" : band === "band2" ? " Check the scale." : " Read to the exact line.";
      items.push(
        item("readBar", "procedural", `barMax_${band}`, band, {
          answer: Math.max(...values),
          answerType: "barGraph",
          display: { ...barDisplay(bars), data: { kind: "barMaxValue" }, promptText: maxPhr + bandTag },
        })
      );
      items.push(
        item("readBar", "procedural", `barMin_${band}`, band, {
          answer: Math.min(...values),
          answerType: "barGraph",
          display: { ...barDisplay(bars), data: { kind: "barMinValue" }, promptText: minPhr + bandTag },
        })
      );
    });
    // +3 third-label reads for the first three sets.
    for (let vi = 0; vi < 3; vi += 1) {
      const values = BAND_VALUES[band][vi];
      const bars = barsFrom(vi, values);
      const t = titleOf(vi);
      const target = bars[1];
      const bandBit = band === "band1" ? "one more time" : band === "band2" ? "once more" : "one last time";
      items.push(
        item("readBar", "procedural", `barReadExtra_${band}`, band, {
          answer: target.value,
          answerType: "barGraph",
          display: { ...barDisplay(bars), data: { kind: "barRead", label: target.label }, promptText: `Check the ${t} graph ${bandBit}: how many ${target.label}?` },
        })
      );
    }
  }
  return items;
}

export function readBarConceptual() {
  const items = [];
  let seed = 211;
  const OFF = { band1: 0, band2: 7, band3: 13 };

  const mostPhrs = [
    (nm, t) => `${nm} checks the ${t} graph. Which one was chosen the most?`,
    (nm, t) => `In the ${t} graph, which bar is tallest? ${nm} looks for the winner.`,
  ];
  const leastPhrs = [
    (nm, t) => `${nm} checks the ${t} graph. Which one was chosen the fewest?`,
    (nm, t) => `In the ${t} graph, which bar is shortest? ${nm} hunts for it.`,
  ];
  const judgePhrs = [
    (nm, t, l, said) => `${nm} reads the ${l} bar of the ${t} graph as ${said}. Is ${nm} right?`,
    (nm, t, l, said) => `${nm} says the ${t} graph shows ${said} ${l}. Is that right?`,
  ];
  const secondPhrs = [
    (nm, t) => `${nm} wants the SECOND tallest bar of the ${t} graph. Which one is it?`,
    (nm, t) => `Ordering the ${t} graph's bars tallest to shortest, which comes second? ${nm} decides.`,
  ];
  for (const band of ["band1", "band2", "band3"]) {
    BAND_VALUES[band].forEach((values, vi) => {
      const bars = barsFrom(vi % SETS.length, values);
      const t = titleOf(vi);
      const p = pass(vi);
      const off = OFF[band];
      const most = bars.reduce((b, x) => (x.value > b.value ? x : b));
      const least = bars.reduce((b, x) => (x.value < b.value ? x : b));
      items.push(
        item("readBar", "conceptual", `mostPick_${band}`, band, {
          answer: most.label,
          choices: shuffled(bars.map((b) => b.label), (seed += 1)),
          display: { ...barDisplay(bars), data: { kind: "barMax" }, promptText: mostPhrs[p](nameAt(vi * 3 + 1 + off), t) },
        })
      );
      items.push(
        item("readBar", "conceptual", `leastPick_${band}`, band, {
          answer: least.label,
          choices: shuffled(bars.map((b) => b.label), (seed += 1)),
          display: { ...barDisplay(bars), data: { kind: "barMin" }, promptText: leastPhrs[p](nameAt(vi * 3 + 2 + off), t) },
        })
      );
      const big = bars.filter((b) => b.value >= 3);
      const target = big[(vi + 1) % big.length];
      const ok = vi % 2 === 0;
      const said = ok ? target.value : target.value + (vi % 4 < 2 ? 1 : -1);
      items.push(
        item("readBar", "conceptual", `readJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ...barDisplay(bars), data: { kind: "barReadSaid", label: target.label, said }, promptText: judgePhrs[p](nameAt(vi * 3 + 3 + off), t, target.label, said), truth: ok },
        })
      );
      if (vi < 3) {
        items.push(
          item("readBar", "conceptual", `mostPickExtra_${band}`, band, {
            answer: most.label,
            choices: shuffled(bars.map((b) => b.label), (seed += 1)),
            display: { ...barDisplay(bars), data: { kind: "barMax" }, promptText: `${nameAt(vi * 3 + 13 + off)} takes one last look at the ${t} graph. Which choice ended up on top?` },
          })
        );
      }
      const sorted = [...bars].sort((x, y) => y.value - x.value);
      items.push(
        item("readBar", "conceptual", `secondPick_${band}`, band, {
          answer: sorted[1].label,
          choices: shuffled(bars.map((b) => b.label), (seed += 1)),
          display: { ...barDisplay(bars), data: { kind: "barSecondMax" }, promptText: secondPhrs[p](nameAt(vi * 3 + 5 + off), t) },
        })
      );
    });
  }
  return items;
}

/* ================================================================== */
/* compareBars                                                         */
/* ================================================================== */

export function compareBarsProcedural() {
  const items = [];
  const diffPhrs = {
    band1: [
      (t, a, b) => `The ${t} graph: how many more ${a} than ${b}?`,
      (t, a, b) => `In the ${t} graph, the ${a} bar beats the ${b} bar by how many votes?`,
    ],
    band2: [
      (t, a, b) => `Use the ${t} graph. How many more ${a} than ${b} does it show?`,
      (t, a, b) => `From the ${t} graph, find the gap between ${a} and ${b}. What is the gap?`,
    ],
    band3: [
      (t, a, b) => `The scaled ${t} graph: exactly how many more ${a} than ${b}?`,
      (t, a, b) => `Compute the exact ${a}-minus-${b} gap in the ${t} graph. What is the gap?`,
    ],
  };
  const sumPhrs = {
    band1: [
      (t, a, b) => `The ${t} graph: how many ${a} and ${b} in all?`,
      (t, a, b) => `Add the ${a} bar and the ${b} bar of the ${t} graph. How many votes together?`,
    ],
    band2: [
      (t, a, b) => `Use the ${t} graph. What do ${a} and ${b} add up to?`,
      (t, a, b) => `From the ${t} graph, total the ${a} and ${b} bars. What total is that?`,
    ],
    band3: [
      (t, a, b) => `The scaled ${t} graph: what is the exact total of ${a} and ${b}?`,
      (t, a, b) => `Add the precise ${a} and ${b} counts from the ${t} graph. What total do you get?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    BAND_VALUES[band].forEach((values, vi) => {
      const bars = barsFrom(vi % SETS.length, values);
      const t = titleOf(vi);
      const p = pass(vi);
      const hiIdx = values.indexOf(Math.max(...values));
      const loIdx = values.indexOf(Math.min(...values));
      const a = bars[hiIdx];
      const b = bars[loIdx];
      items.push(
        item("compareBars", "procedural", `barDiff_${band}`, band, {
          answer: a.value - b.value,
          answerType: "barGraph",
          display: { ...barDisplay(bars), data: { kind: "barDiff", a: a.label, b: b.label }, promptText: diffPhrs[band][p](t, a.label, b.label) },
        })
      );
      const cIdx = [0, 1, 2, 3].find((k) => k !== hiIdx && k !== loIdx);
      const c = bars[cIdx];
      items.push(
        item("compareBars", "procedural", `barSum_${band}`, band, {
          answer: a.value + c.value,
          answerType: "barGraph",
          display: { ...barDisplay(bars), data: { kind: "barSum", a: a.label, b: c.label }, promptText: sumPhrs[band][p](t, a.label, c.label) },
        })
      );
      const dIdx = [0, 1, 2, 3].find((k) => k !== hiIdx && k !== loIdx && k !== cIdx);
      const d = bars[dIdx];
      const big = d.value > c.value ? d : c;
      const small = d.value > c.value ? c : d;
      items.push(
        item("compareBars", "procedural", `barDiffAlt_${band}`, band, {
          answer: big.value - small.value,
          answerType: "barGraph",
          display: { ...barDisplay(bars), data: { kind: "barDiff", a: big.label, b: small.label }, promptText: `${diffPhrs[band][1 - p](t, big.label, small.label)} Compare carefully.` },
        })
      );
      if (vi < 3) {
        items.push(
          item("compareBars", "procedural", `barDiffExtra_${band}`, band, {
            answer: a.value - b.value,
            answerType: "barGraph",
            display: { ...barDisplay(bars), data: { kind: "barDiff", a: a.label, b: b.label }, promptText: `${diffPhrs[band][1 - p](t, a.label, b.label)} Look twice.` },
          })
        );
      }
      // fourth: sum of the two middle bars, alternate phrasing slot.
      items.push(
        item("compareBars", "procedural", `barSumAlt_${band}`, band, {
          answer: c.value + d.value,
          answerType: "barGraph",
          display: { ...barDisplay(bars), data: { kind: "barSum", a: c.label, b: d.label }, promptText: `${sumPhrs[band][1 - p](t, c.label, d.label)} Count both bars.` },
        })
      );
    });
  }
  return items;
}

export function compareBarsConceptual() {
  const items = [];
  let seed = 221;
  const OFF = { band1: 0, band2: 7, band3: 13 };
  const cmpPhrs = [
    (nm, t, a, b) => `${nm} says the ${t} graph shows more ${a} than ${b}. Is ${nm} right?`,
    (nm, t, a, b) => `Looking at the ${t} graph, ${nm} claims ${a} beat ${b}. Is that right?`,
  ];
  const whichPhrs = [
    (nm, t, a, b) => `In the ${t} graph, which bar shows more: ${a} or ${b}? ${nm} compares them.`,
    (nm, t, a, b) => `${nm} studies the ${t} graph. Between ${a} and ${b}, which is taller?`,
  ];
  const diffPhrs = [
    (nm, t, a, b, said) => `${nm} figures the ${t} graph's ${a} bar beats ${b} by ${said}. Is ${nm} right?`,
    (nm, t, a, b, said) => `${nm} counts a gap of ${said} between ${a} and ${b} in the ${t} graph. Is that right?`,
  ];
  for (const band of ["band1", "band2", "band3"]) {
    BAND_VALUES[band].forEach((values, vi) => {
      const bars = barsFrom(vi % SETS.length, values);
      const t = titleOf(vi);
      const p = pass(vi);
      const off = OFF[band];
      const i = vi % 4;
      const j = (vi + 1) % 4;
      const truth = bars[i].value > bars[j].value;
      items.push(
        item("compareBars", "conceptual", `cmpJudge_${band}`, band, {
          answer: truth ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ...barDisplay(bars), data: { kind: "barCmpSaid", a: bars[i].label, b: bars[j].label }, promptText: cmpPhrs[p](nameAt(vi * 3 + 1 + off), t, bars[i].label, bars[j].label), truth },
        })
      );
      const k = (vi + 2) % 4;
      const l = (vi + 3) % 4;
      const winner = bars[k].value > bars[l].value ? bars[k] : bars[l];
      items.push(
        item("compareBars", "conceptual", `whichMore_${band}`, band, {
          answer: winner.label,
          choices: shuffled([bars[k].label, bars[l].label], (seed += 1)),
          display: { ...barDisplay(bars), data: { kind: "barCmpPick", a: bars[k].label, b: bars[l].label }, promptText: whichPhrs[p](nameAt(vi * 3 + 4 + off), t, bars[k].label, bars[l].label) },
        })
      );
      if (vi < 3) {
        const m = (vi + 2) % 4;
        const n2 = vi % 4;
        const winner2 = bars[m].value > bars[n2].value ? bars[m] : bars[n2];
        items.push(
          item("compareBars", "conceptual", `whichMoreExtra_${band}`, band, {
            answer: winner2.label,
            choices: shuffled([bars[m].label, bars[n2].label], (seed += 1)),
            display: { ...barDisplay(bars), data: { kind: "barCmpPick", a: bars[m].label, b: bars[n2].label }, promptText: `${nameAt(vi * 3 + 15 + off)} settles a debate with the ${t} graph: ${bars[m].label} or ${bars[n2].label} — which got more votes?` },
          })
        );
      }
      const hi = bars.reduce((b, x) => (x.value > b.value ? x : b));
      const lo = bars.reduce((b, x) => (x.value < b.value ? x : b));
      const ok = vi % 2 === 1;
      const said = ok ? hi.value - lo.value : hi.value - lo.value + (vi % 4 < 2 ? 1 : -1);
      items.push(
        item("compareBars", "conceptual", `diffJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ...barDisplay(bars), data: { kind: "barDiffSaid", a: hi.label, b: lo.label, said }, promptText: diffPhrs[p](nameAt(vi * 3 + 7 + off), t, hi.label, lo.label, said), truth: ok },
        })
      );
      // fourth: which two bars together beat the tallest (judged).
      const others = bars.filter((x) => x !== hi);
      const pairSum = others[0].value + others[1].value;
      const t2 = pairSum > hi.value;
      items.push(
        item("compareBars", "conceptual", `pairBeats_${band}`, band, {
          answer: t2 ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ...barDisplay(bars), data: { kind: "pairBeats", a: others[0].label, b: others[1].label, c: hi.label }, promptText: `${nameAt(vi * 3 + 9 + off)} wonders: in the ${t} graph, do ${others[0].label} and ${others[1].label} together beat ${hi.label}?${p === 0 ? "" : " What does the math say?"}`, truth: t2 },
        })
      );
    });
  }
  return items;
}

/* ================================================================== */
/* pictograph                                                          */
/* ================================================================== */

const pictoDisplay = (rows, keyValue) => ({ figure: "pictograph", keyValue, rows });

export function pictographProcedural() {
  const items = [];
  const readPhrs = {
    band1: [
      (t, l) => `The ${t} picture chart: each picture means 1. How many ${l}?`,
      (t, l) => `Count the ${l} pictures in the ${t} chart. How many pictures do you see?`,
    ],
    band2: [
      (t, l, k) => `In the ${t} picture chart, each picture means ${k}. How many ${l}?`,
      (t, l, k) => `The ${t} chart's key is ${k} per picture. How many ${l} does it show?`,
    ],
    band3: [
      (t, l, k) => `The ${t} picture chart uses a key of ${k}. Exactly how many ${l}?`,
      (t, l, k) => `Each picture in the ${t} chart is worth ${k}. What is the ${l} count?`,
    ],
  };
  const emit = (band, keys, symbolMax, n) => {
    for (let vi = 0; vi < n; vi += 1) {
      const set = SETS[vi % SETS.length];
      const t = set.title;
      const pairIdx = Math.floor(vi / SETS.length) % 2;
      const labels = pairIdx === 0 ? set.labels.slice(0, 2) : set.labels.slice(2, 4);
      const key = keys[vi % keys.length];
      const s1 = 2 + ((vi * 3) % symbolMax);
      const s2 = 2 + ((vi * 5 + 2) % symbolMax);
      const rows = [
        { label: labels[0], symbols: s1 },
        { label: labels[1], symbols: s2 },
      ];
      const idx = vi % 2;
      const phr = readPhrs[band][Math.floor(vi / 12) % 2];
      items.push(
        item("pictograph", "procedural", `pictoRead_${band}`, band, {
          answer: rows[idx].symbols * key,
          answerType: "numberPad",
          display: { ...pictoDisplay(rows, key), data: { kind: "pictoRead", label: rows[idx].label }, promptText: phr(t, rows[idx].label, key) },
        })
      );
    }
  };
  emit("band1", [1], 6, 24);
  emit("band2", [2, 5], 6, 24);
  emit("band3", [10], 7, 24);

  for (let vi = 0; vi < 7; vi += 1) {
    const set = SETS[vi % SETS.length];
    const labels = set.labels.slice(0, 2);
    const s1 = 2 + (vi % 5);
    const s2 = 3 + ((vi + 2) % 5);
    const rows = [
      { label: labels[0], symbols: s1 },
      { label: labels[1], symbols: s2 },
    ];
    items.push(
      item("pictograph", "procedural", "pictoBothRowsTeen", "band1", {
        answer: s1 + s2,
        answerType: "numberPad",
        display: { ...pictoDisplay(rows, 1), data: { kind: "pictoBothRows" }, promptText: `The ${set.title} picture chart, key of one: how many pictures in both rows together?${vi >= SETS.length ? " Count them all." : ""}` },
      })
    );
  }

  const symbolsPhrs = {
    band1: (n) => `Each picture means 1. How many pictures show ${n}?`,
    band2: (n, k) => `One picture stands for ${k}. How many pictures show ${n}?`,
    band3: (n, k) => `With a key of ${k} per picture, how many pictures make ${n}?`,
  };
  const emitInverse = (band, key, data, structureType) => {
    for (const n of data) {
      items.push(
        item("pictograph", "procedural", structureType, band, {
          answer: n / key,
          answerType: "numberPad",
          display: { data: { kind: "pictoSymbols", n, key }, promptText: band === "band1" ? symbolsPhrs.band1(n) : symbolsPhrs[band](n, key) },
        })
      );
    }
  };
  emitInverse("band1", 1, [3, 5, 7, 2, 8, 4, 9, 6, 10, 12, 11, 13, 15, 14, 16, 17, 18, 19, 20, 1], "pictoSymbolsTeen");
  emitInverse("band2", 2, [6, 10, 14, 4, 12, 8, 18, 16, 2, 20, 24, 22, 26], "pictoSymbolsMid");
  emitInverse("band2", 5, [10, 25, 35, 15, 45, 20, 30, 40, 5, 50, 55, 60, 65], "pictoSymbolsMid5");
  emitInverse("band3", 10, [30, 70, 50, 20, 90, 40, 80, 60, 10, 100, 120, 110, 130, 150, 140, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260], "pictoSymbolsBig");

  return items;
}

export function pictographConceptual() {
  const items = [];
  let seed = 231;

  const keyIgnoredPhrs = [
    (nm, sym, label, key) => `${nm} counts ${sym} pictures for ${label} and says there are ${sym} ${label} — but each picture means ${key}. Is ${nm} right?`,
    (nm, sym, label, key) => `The key says one picture = ${key}, yet ${nm} reads ${sym} pictures as ${sym} ${label}. Is that right?`,
  ];
  const emitKeyIgnored = (band, key, structureType, off) => {
    for (let vi = 0; vi < 18; vi += 1) {
      const label = SETS[vi % SETS.length].labels[vi % 4];
      const sym = 2 + (vi % 5);
      items.push(
        item("pictograph", "conceptual", structureType, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { data: { kind: "keyIgnored", key }, promptText: keyIgnoredPhrs[Math.floor(vi / 9)](nameAt(vi * 3 + 1 + off), sym, label, key), truth: false },
        })
      );
    }
  };
  emitKeyIgnored("band2", 5, "keyIgnoredMid", 7);
  emitKeyIgnored("band3", 10, "keyIgnoredBig", 13);

  const countJudgePhrs = [
    (nm, sym, label, said) => `The chart shows ${sym} pictures of ${label}, one each. ${nm} counts ${said}. Is ${nm} right?`,
    (nm, sym, label, said) => `${nm} tallies the ${label} pictures as ${said}; the chart has ${sym}, each worth one. Is that right?`,
  ];
  for (let vi = 0; vi < 22; vi += 1) {
    const label = SETS[vi % SETS.length].labels[(vi + 1) % 4];
    const sym = 2 + (vi % 7);
    const ok = vi % 2 === 0;
    const said = ok ? sym : sym + (vi % 4 < 2 ? 1 : -1);
    items.push(
      item("pictograph", "conceptual", "countJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { data: { kind: "pictoSaid", sym, key: 1, said }, promptText: countJudgePhrs[Math.floor(vi / 11)](nameAt(vi * 3 + 2), sym, label, said), truth: ok },
      })
    );
  }
  const rowMorePhrs = [
    (nm, t, a, b) => `${nm} compares the ${t} chart's picture rows for ${a} and ${b}. Which row shows more?`,
    (nm, t, a, b) => `In the ${t} picture chart, which row has more pictures: ${a} or ${b}? ${nm} looks closely.`,
  ];
  let made = 0;
  for (let vi = 0; made < 29; vi += 1) {
    const set = SETS[vi % SETS.length];
    const labels = Math.floor(vi / SETS.length) % 2 === 0 ? set.labels.slice(0, 2) : set.labels.slice(2, 4);
    const s1 = 2 + (vi % 6);
    const s2 = 2 + ((vi + 3) % 6);
    if (s1 === s2) continue;
    const rows = [
      { label: labels[0], symbols: s1 },
      { label: labels[1], symbols: s2 },
    ];
    items.push(
      item("pictograph", "conceptual", "rowMoreTeen", "band1", {
        answer: s1 > s2 ? labels[0] : labels[1],
        choices: shuffled([labels[0], labels[1]], (seed += 1)),
        display: { ...pictoDisplay(rows, 1), data: { kind: "pictoRowMore" }, promptText: rowMorePhrs[Math.floor(made / 15)](nameAt(vi * 3 + 3), set.title, labels[0], labels[1]) },
      })
    );
    made += 1;
  }

  const halfPhrs = [
    (nm, key) => `A row ends in HALF a picture, and one whole picture means ${key}. ${nm} says the half counts as ${key / 2}. Is ${nm} right?`,
    (nm, key) => `${nm} treats a half picture as ${key / 2} when the key is ${key} per picture. Is that right?`,
  ];
  const emitHalf = (band, key, structureType, n, off) => {
    for (let vi = 0; vi < n; vi += 1) {
      items.push(
        item("pictograph", "conceptual", structureType, band, {
          answer: "Yes",
          choices: ["Yes", "No"],
          display: { data: { kind: "halfSymbol", key }, promptText: halfPhrs[Math.floor(vi / (n / 2))](nameAt(vi * 3 + 5 + off), key), truth: true },
        })
      );
    }
  };
  emitHalf("band2", 2, "halfSymbolMid", 16, 7);
  emitHalf("band3", 10, "halfSymbolBig", 16, 13);

  const whichKeyPhrs = [
    (nm, total, sym) => `${nm}'s chart must show ${total} using exactly ${sym} pictures. Which key makes that work?`,
    (nm, total, sym) => `To show ${total} with ${sym} pictures, which key should ${nm} pick?`,
  ];
  const emitWhichKey = (band, structureType, data, off) => {
    data.forEach(([total, sym], vi) => {
      const key = total / sym;
      items.push(
        item("pictograph", "conceptual", structureType, band, {
          answer: key,
          choices: shuffled([...new Set([key, key * 2, Math.max(1, Math.floor(key / 2)), key + 1])], (seed += 1)).slice(0, 4),
          display: { data: { kind: "whichKey", total, sym }, promptText: whichKeyPhrs[vi % 2](nameAt(vi * 3 + 6 + off), total, sym) },
        })
      );
    });
  };
  emitWhichKey("band2", "whichKeyMid", [[10, 5], [12, 6], [20, 4], [16, 8], [15, 3], [30, 6], [25, 5], [40, 8], [18, 9], [45, 9], [14, 7], [35, 7], [50, 10], [24, 6], [8, 4], [28, 7], [6, 3], [21, 3]], 7);
  emitWhichKey("band3", "whichKeyBig", [[60, 6], [100, 10], [80, 4], [120, 6], [90, 9], [150, 5], [70, 7], [200, 10], [110, 11], [160, 8], [130, 13], [180, 9], [140, 7], [220, 11], [50, 5], [240, 12], [170, 17], [250, 25]], 13);

  return items;
}

/* ================================================================== */
/* dataAnalysis                                                        */
/* ================================================================== */

const tallyDisplay = (rows) => ({ figure: "tallyChart", rows });

export function dataAnalysisProcedural() {
  const items = [];
  const tallyPhrs = {
    band1: [
      (t, l) => `The ${t} tally chart: how many chose ${l}?`,
      (t, l) => `Count the ${t} tallies for ${l}. How many marks in all?`,
    ],
    band2: [
      (t, l) => `Read the ${t} tally chart. How many votes did ${l} get?`,
      (t, l) => `From the ${t} tally chart, find the count. How many votes did ${l} get in all?`,
    ],
  };
  const emitTally = (band, lo, hi, n) => {
    for (let vi = 0; vi < n; vi += 1) {
      const set = SETS[vi % SETS.length];
      const pairIdx = Math.floor(vi / SETS.length) % 2;
      const labels = pairIdx === 0 ? set.labels.slice(0, 2) : set.labels.slice(2, 4);
      const c1 = lo + ((vi * 3) % (hi - lo + 1));
      const c2 = lo + ((vi * 5 + 2) % (hi - lo + 1));
      const rows = [
        { label: labels[0], count: c1 },
        { label: labels[1], count: c2 },
      ];
      const idx = vi % 2;
      const phr = tallyPhrs[band][Math.floor(vi / 12) % 2];
      items.push(
        item("dataAnalysis", "procedural", `tallyRead_${band}`, band, {
          answer: rows[idx].count,
          answerType: "numberPad",
          display: { ...tallyDisplay(rows), data: { kind: "tallyRead", label: rows[idx].label }, promptText: phr(set.title, rows[idx].label) },
        })
      );
    }
  };
  emitTally("band1", 3, 13, 24);
  emitTally("band2", 8, 24, 24);

  const totalPhrs = {
    band2: [
      (t) => `Add every bar of the ${t} graph. How many votes were counted in all?`,
      (t) => `What is the total across all the ${t} graph's bars?`,
    ],
    band3: [
      (t) => `Sum the whole ${t} graph, bar by bar. What total does it hold?`,
      (t) => `Every bar of the ${t} graph together makes what exact total?`,
    ],
  };
  const emitTotal = (band) => {
    BAND_VALUES[band].forEach((values, vi) => {
      const bars = barsFrom(vi % SETS.length, values);
      items.push(
        item("dataAnalysis", "procedural", `barTotal_${band}`, band, {
          answer: values.reduce((s, v) => s + v, 0),
          answerType: "barGraph",
          display: { ...barDisplay(bars), data: { kind: "barTotal" }, promptText: totalPhrs[band][pass(vi)](titleOf(vi)) },
        })
      );
    });
  };
  emitTotal("band2");
  emitTotal("band3");

  const rangePhrs = [
    (t) => `In the ${t} graph, how far apart are the biggest and smallest bars?`,
    (t) => `Find the ${t} graph's tallest and shortest bars. What is their difference?`,
  ];
  BAND_VALUES.band3.forEach((values, vi) => {
    const bars = barsFrom(vi % SETS.length, values);
    items.push(
      item("dataAnalysis", "procedural", "barRangeBig", "band3", {
        answer: Math.max(...values) - Math.min(...values),
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barRange" }, promptText: rangePhrs[pass(vi)](titleOf(vi)) },
      })
    );
  });
  // Band 3 filler: totals of three bars (leave one out).
  const threePhrs = [
    (t, skip) => `Add every ${t} bar EXCEPT ${skip}. What total is left?`,
    (t, skip) => `Leaving out ${skip}, what do the other ${t} bars add up to?`,
  ];
  BAND_VALUES.band2.forEach((values, vi) => {
    const bars = barsFrom(vi % SETS.length, values);
    const skip = bars[(vi + 2) % 4];
    items.push(
      item("dataAnalysis", "procedural", "barTotalSkipBig", "band3", {
        answer: values.reduce((s, v) => s + v, 0) - skip.value,
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barTotalSkip", skip: skip.label }, promptText: threePhrs[pass(vi)](titleOf(vi), skip.label) },
      })
    );
  });

  const rangeMidPhrs = [
    (t) => `Use the ${t} graph. What is the gap between its biggest and smallest bars?`,
    (t) => `In the ${t} graph, subtract the shortest bar from the tallest. What gap is left?`,
  ];
  BAND_VALUES.band2.forEach((values, vi) => {
    const bars = barsFrom(vi % SETS.length, values);
    items.push(
      item("dataAnalysis", "procedural", "barRangeMid", "band2", {
        answer: Math.max(...values) - Math.min(...values),
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barRange" }, promptText: rangeMidPhrs[pass(vi)](titleOf(vi)) },
      })
    );
  });
  for (const [si, c1, c2, band, hi2] of [[3, 19, 8, "band2", 0], [4, 22, 13, "band2", 0], [5, 17, 9, "band2", 0], [0, 34, 18, "band3", 0], [1, 38, 21, "band3", 0], [2, 29, 16, "band3", 0]]) {
    const set = SETS[si];
    const labels = set.labels.slice(2, 4);
    const rows = [
      { label: labels[0], count: c1 },
      { label: labels[1], count: c2 },
    ];
    items.push(
      item("dataAnalysis", "procedural", band === "band2" ? "tallyDiffMid" : "tallyDiffBig", band, {
        answer: c1 - c2,
        answerType: "numberPad",
        display: { ...tallyDisplay(rows), data: { kind: "tallyDiff", a: labels[0], b: labels[1] }, promptText: `In the ${set.title} tally chart, how many more chose ${labels[0]} than ${labels[1]}?` },
      })
    );
  }
  // Band 3 tallies: bigger counts, per-band phrasings.
  const tallyBigPhrs = [
    (t, l) => `The ${t} tally chart runs long — count every mark. How many chose ${l}?`,
    (t, l) => `Tally by fives through the ${t} chart. How many votes did ${l} collect?`,
  ];
  for (let vi = 0; vi < 12; vi += 1) {
    const set = SETS[vi % SETS.length];
    const pairIdx = Math.floor(vi / SETS.length) % 2;
    const labels = pairIdx === 0 ? set.labels.slice(0, 2) : set.labels.slice(2, 4);
    const c1 = 15 + ((vi * 3) % 26);
    const c2 = 15 + ((vi * 5 + 2) % 26);
    const rows = [
      { label: labels[0], count: c1 },
      { label: labels[1], count: c2 },
    ];
    const idx = vi % 2;
    items.push(
      item("dataAnalysis", "procedural", "tallyReadBig", "band3", {
        answer: rows[idx].count,
        answerType: "numberPad",
        display: { ...tallyDisplay(rows), data: { kind: "tallyRead", label: rows[idx].label }, promptText: tallyBigPhrs[pairIdx](set.title, rows[idx].label) },
      })
    );
  }

  const tallyTotalPhrs = [
    (t, a, b) => `In the ${t} tally chart, how many chose ${a} or ${b} altogether?`,
    (t, a, b) => `Add the ${t} tallies for ${a} and ${b}. How many marks in all?`,
  ];
  for (let vi = 0; vi < 24; vi += 1) {
    const set = SETS[(vi + 2) % SETS.length];
    const labels = Math.floor(vi / SETS.length) % 2 === 0 ? set.labels.slice(0, 2) : set.labels.slice(2, 4);
    const c1 = 3 + ((vi * 3) % 8);
    const c2 = 3 + ((vi * 5 + 2) % 8);
    const rows = [
      { label: labels[0], count: c1 },
      { label: labels[1], count: c2 },
    ];
    items.push(
      item("dataAnalysis", "procedural", "tallyTotalTeen", "band1", {
        answer: c1 + c2,
        answerType: "numberPad",
        display: { ...tallyDisplay(rows), data: { kind: "tallyTotal" }, promptText: tallyTotalPhrs[Math.floor(vi / 12)](set.title, labels[0], labels[1]) },
      })
    );
  }
  for (const [si, c1, c2] of [[0, 9, 4], [1, 11, 6], [2, 8, 3]]) {
    const set = SETS[si];
    const labels = set.labels.slice(0, 2);
    const rows = [
      { label: labels[0], count: c1 },
      { label: labels[1], count: c2 },
    ];
    items.push(
      item("dataAnalysis", "procedural", "tallyDiffTeen", "band1", {
        answer: c1 - c2,
        answerType: "numberPad",
        display: { ...tallyDisplay(rows), data: { kind: "tallyDiff", a: labels[0], b: labels[1] }, promptText: `In the ${set.title} tally chart, how many more chose ${labels[0]} than ${labels[1]}?` },
      })
    );
  }

  return items;
}

export function dataAnalysisConceptual() {
  const items = [];
  let seed = 241;
  const OFF = { band1: 0, band2: 7, band3: 13 };

  const claimPhrs = [
    (nm, t, claim) => `${nm} looks at the ${t} graph and says: "${claim}" Is ${nm} right?`,
    (nm, t, claim) => `After studying the ${t} graph, ${nm} claims: "${claim}" Is that right?`,
  ];
  const truePickPhrs = [
    (nm, t) => `${nm} must pick the TRUE statement about the ${t} graph. Which is it?`,
    (nm, t) => `Which statement matches the ${t} graph? ${nm} checks each bar.`,
  ];
  const totalJudgePhrs = [
    (nm, t, said) => `${nm} adds all the ${t} bars and announces ${said} in total. Is ${nm} right?`,
    (nm, t, said) => `Summing the whole ${t} graph, ${nm} gets ${said}. Is that right?`,
  ];
  for (const band of ["band1", "band2", "band3"]) {
    BAND_VALUES[band].forEach((values, vi) => {
      const bars = barsFrom(vi % SETS.length, values);
      const t = titleOf(vi);
      const p = pass(vi);
      const off = OFF[band];
      const hi = bars.reduce((b, x) => (x.value > b.value ? x : b));
      const lo = bars.reduce((b, x) => (x.value < b.value ? x : b));
      const truthClaims = [
        [`${hi.label} got the most.`, true, { kind: "claimMax", label: hi.label }],
        [`${lo.label} got the most.`, false, { kind: "claimMaxFalse", label: lo.label }],
        [`${lo.label} got the fewest.`, true, { kind: "claimMin", label: lo.label }],
        [`${hi.label} got the fewest.`, false, { kind: "claimMinFalse", label: hi.label }],
      ];
      const [claim, truth, data] = truthClaims[vi % 4];
      items.push(
        item("dataAnalysis", "conceptual", `claimJudge_${band}`, band, {
          answer: truth ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ...barDisplay(bars), data, promptText: claimPhrs[p](nameAt(vi * 3 + 1 + off), t, claim), truth },
        })
      );
      const good = `${hi.label} got the most`;
      const wrong = [`${lo.label} got the most`, `${hi.label} got the fewest`, `every bar is the same`];
      items.push(
        item("dataAnalysis", "conceptual", `truePick_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong], (seed += 1)),
          display: { ...barDisplay(bars), data: { kind: "truePickMax", label: hi.label }, promptText: truePickPhrs[p](nameAt(vi * 3 + 3 + off), t) },
        })
      );
      const total = values.reduce((s, v) => s + v, 0);
      const ok = vi % 2 === 0;
      const said = ok ? total : total + (vi % 4 < 2 ? 1 : -2);
      items.push(
        item("dataAnalysis", "conceptual", `totalJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ...barDisplay(bars), data: { kind: "barTotalSaid", said }, promptText: totalJudgePhrs[p](nameAt(vi * 3 + 5 + off), t, said), truth: ok },
        })
      );
      if (vi < 3) {
        const goodMin = `${lo.label} got the fewest`;
        const wrongMin = [`${hi.label} got the fewest`, `${lo.label} got the most`, `every bar is the same`];
        items.push(
          item("dataAnalysis", "conceptual", `truePickMin_${band}`, band, {
            answer: goodMin,
            choices: shuffled([goodMin, ...wrongMin], (seed += 1)),
            display: { ...barDisplay(bars), data: { kind: "truePickMin", label: lo.label }, promptText: `${nameAt(vi * 3 + 11 + off)} needs the true statement about the ${t} graph's SMALLEST bar. Which is it?` },
          })
        );
      }
      // fourth: how-many-more-to-tie reasoning (typed).
      items.push(
        item("dataAnalysis", "conceptual", `tieGap_${band}`, band, {
          answer: hi.value - lo.value,
          answerType: "numberPad",
          display: { ...barDisplay(bars), data: { kind: "barDiff", a: hi.label, b: lo.label }, promptText: `${nameAt(vi * 3 + 7 + off)} wonders how many more ${lo.label} the ${t} graph would need to tie with ${hi.label}. How many more votes?${p === 0 ? "" : " Count the gap."}` },
        })
      );
    });
  }
  return items;
}
