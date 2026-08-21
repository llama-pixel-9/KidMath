/* dataGraphs application stories — surveys, harvests, and score charts a
 * kid actually made. Prompts embed the graph title + rotating names for
 * uniqueness (graph prompts carry few numbers); answers re-derived from the
 * drawn data via display.data claims. Band-1 prompts stay <= 20.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS, SETS } from "./dataGraphsTemplates.js";

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
    modeId: "dataGraphs",
    subskill,
    itemFamily: "application",
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const V1 = [
  [2, 5, 3, 7], [1, 6, 4, 8], [1, 7, 3, 5], [2, 6, 4, 8], [1, 5, 2, 9], [3, 6, 2, 7],
];
const V2 = [
  [12, 7, 14, 3], [9, 13, 2, 11], [14, 6, 10, 1], [5, 12, 8, 14], [11, 3, 13, 7], [2, 10, 6, 12],
];
const V3 = [
  [18, 7, 12, 20], [15, 9, 19, 4], [20, 11, 6, 16], [8, 17, 13, 19], [14, 20, 5, 10], [19, 3, 16, 12],
];
const VBAND = { band1: V1, band2: V2, band3: V3 };

const barsFrom = (setIdx, values) => SETS[setIdx].labels.map((label, i) => ({ label, value: values[i] }));
const barDisplay = (bars) => ({ type: "barGraph", figure: "barGraph", bars });

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

export function buildStoryItems() {
  const items = [];
  const OFF = { band1: 0, band2: 7, band3: 13 };

  /* readBar app: survey reads in narrative. */
  const SURVEY_SKELETONS = [
    (nm, t, l) => `${nm} surveyed the class and drew the ${t} graph. A friend asks about ${l}. How many ${l} does the graph show?`,
    (nm, t, l) => `For a school project, ${nm} graphed the ${t} results. The teacher points at ${l}. What count does that bar show?`,
    (nm, t, l) => `${nm} pins the ${t} graph to the wall and reads out the ${l} bar. How many ${l} is that?`,
  ];
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    const emit = ([vi, li], sk, nm, i) => {
      const bars = barsFrom(vi % SETS.length, values[vi % values.length]);
      const target = bars[li];
      return mk("readBar", `storySurveyRead_${band}`, band, {
        answer: target.value,
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barRead", label: target.label }, promptText: sk(nm, SETS[vi % SETS.length].title, target.label) },
      });
    };
    const space = [];
    for (let vi = 0; vi < 6; vi += 1) for (const li of [0, 1, 2]) space.push([vi, li]);
    items.push(...cycle(17, space, SURVEY_SKELETONS, OFF[band] % 3, (pair, sk, nm, i) => emit(pair, sk, nameAt(i + OFF[band]), i)));
  }
  /* readBar app: winner announcements (three skeletons PER BAND — these
     prompts carry no numbers, so wording is the only uniqueness). */
  const WINNER_BY_BAND = {
    band1: [
      (nm, t) => `${nm} announces the ${t} survey winner at circle time. Which choice won the most votes?`,
      (nm, t) => `The ${t} chart is done, and ${nm} gets to reveal the top choice. Which one is it?`,
      (nm, t) => `${nm} circles the winning bar on the ${t} graph. Which choice is circled?`,
    ],
    band2: [
      (nm, t) => `${nm} posts the ${t} survey results and stars the winner. Which choice gets the star?`,
      (nm, t) => `At assembly, ${nm} reads out which ${t} choice came first. Which one is it?`,
      (nm, t) => `${nm} colors the winning ${t} bar gold. Which choice turned gold?`,
    ],
    band3: [
      (nm, t) => `${nm} writes the ${t} survey champion into the class newsletter. Which choice is the champion?`,
      (nm, t) => `Scanning the scaled ${t} graph, ${nm} names the front-runner. Which choice leads?`,
      (nm, t) => `${nm} hands the ${t} survey trophy to the top vote-getter. Which choice takes it?`,
    ],
  };
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    let seed = 251 + OFF[band] * 3;
    const emit = ([vi], sk, nm) => {
      const bars = barsFrom(vi % SETS.length, values[vi % values.length]);
      const hi = bars.reduce((b, x) => (x.value > b.value ? x : b));
      return mk("readBar", `storyWinner_${band}`, band, {
        answer: hi.label,
        choices: shuffled(bars.map((b) => b.label), (seed += 1)),
        display: { ...barDisplay(bars), data: { kind: "barMax" }, promptText: sk(nm, SETS[vi % SETS.length].title) },
      });
    };
    items.push(...cycle(17, [[0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4]], WINNER_BY_BAND[band], (OFF[band] + 1) % 3, (p, sk, nm, i) => emit(p, sk, nameAt(i + 3 + OFF[band]))));
  }

  /* compareBars app: margin-of-victory stories. */
  const MARGIN_BY_BAND = {
    band1: [
      (nm, t, a, b) => `In ${nm}'s ${t} survey, ${a} beat ${b}. By how many votes did it win?`,
      (nm, t, a, b) => `${nm} reports the ${t} results: ${a} finished ahead of ${b}. What was the winning gap?`,
      (nm, t, a, b) => `The ${t} graph shows ${a} on top of ${b}. ${nm} wants the exact margin. How many more votes?`,
    ],
    band2: [
      (nm, t, a, b) => `${nm} tallies the ${t} survey: ${a} outscored ${b}. How many votes made the difference?`,
      (nm, t, a, b) => `Reading the ${t} graph, ${nm} sees ${a} above ${b}. How many votes separate them?`,
      (nm, t, a, b) => `${nm} measures how far ${a} pulled ahead of ${b} in the ${t} vote. How many votes ahead?`,
    ],
    band3: [
      (nm, t, a, b) => `In the scaled ${t} graph, ${nm} computes the lead of ${a} over ${b}. How many votes is the lead?`,
      (nm, t, a, b) => `${nm}'s ${t} report needs the precise spread between ${a} and ${b}. How many votes wide is it?`,
      (nm, t, a, b) => `For the ${t} recap, ${nm} subtracts the ${b} bar from the ${a} bar. How many votes remain?`,
    ],
  };
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    const emit = ([vi], sk, nm) => {
      const bars = barsFrom(vi % SETS.length, values[vi % values.length]);
      const hi = bars.reduce((b, x) => (x.value > b.value ? x : b));
      const lo = bars.reduce((b, x) => (x.value < b.value ? x : b));
      return mk("compareBars", `storyMargin_${band}`, band, {
        answer: hi.value - lo.value,
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barDiff", a: hi.label, b: lo.label }, promptText: sk(nm, SETS[vi % SETS.length].title, hi.label, lo.label) },
      });
    };
    items.push(...cycle(17, [[0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4]], MARGIN_BY_BAND[band], OFF[band] % 3, (p, sk, nm, i) => emit(p, sk, nameAt(i + 5 + OFF[band]))));
  }
  /* compareBars app: team-up totals. */
  const TEAM_SKELETONS = [
    (nm, t, a, b) => `${nm} groups ${a} and ${b} together from the ${t} graph. How many votes do they hold combined?`,
    (nm, t, a, b) => `If the ${t} survey merged ${a} with ${b}, how many votes would the pair have? ${nm} adds the bars.`,
    (nm, t, a, b) => `${nm} adds the ${a} bar to the ${b} bar of the ${t} graph. What is their combined count?`,
  ];
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    const emit = ([vi, i1, i2], sk, nm) => {
      const bars = barsFrom(vi % SETS.length, values[vi % values.length]);
      return mk("compareBars", `storyTeamUp_${band}`, band, {
        answer: bars[i1].value + bars[i2].value,
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barSum", a: bars[i1].label, b: bars[i2].label }, promptText: sk(nm, SETS[vi % SETS.length].title, bars[i1].label, bars[i2].label) },
      });
    };
    const space = [[0, 0, 1], [1, 1, 2], [2, 2, 3], [3, 0, 3], [4, 1, 3], [5, 0, 2], [0, 2, 3], [1, 0, 3], [2, 0, 1], [3, 1, 2], [4, 0, 2], [5, 1, 3], [0, 1, 3], [1, 1, 3], [2, 1, 2], [3, 0, 1], [4, 2, 3]];
    items.push(...cycle(17, space.map((s) => [s[0], s[1], s[2]]), TEAM_SKELETONS, (OFF[band] + 2) % 3, (p, sk, nm, i) => emit(p, sk, nameAt(i + 7 + OFF[band]))));
  }

  /* pictograph app: sticker-chart stories. */
  const STICKER_SKELETONS = [
    (nm, key, sym) => `${nm}'s reading chart gives one star picture for every ${key} ${key === 1 ? "page" : "pages"} read. The chart shows ${sym} stars. How many pages did ${nm} read?`,
    (nm, key, sym) => `Each flower picture on ${nm}'s garden chart means ${key} ${key === 1 ? "seed" : "seeds"} planted. With ${sym} flowers drawn, how many seeds is that?`,
    (nm, key, sym) => `${nm}'s chore chart pays ${key} ${key === 1 ? "point" : "points"} per smiley picture. There are ${sym} smileys. How many points has ${nm} earned?`,
  ];
  const stickerEmit = (band, key) => ([sym], sk, nm) =>
    mk("pictograph", `storySticker_${band}`, band, {
      answer: sym * key,
      answerType: "numberPad",
      display: { data: { kind: "pictoRead2", sym, key }, promptText: sk(nm, key, sym) },
    });
  items.push(...cycle(17, [[2], [3], [4], [5], [6], [7], [8], [9], [10], [2], [3], [4], [5], [6], [7], [8], [9]], STICKER_SKELETONS, 0, (p, sk, nm, i) => stickerEmit(B1, 1)(p, sk, nameAt(i))));
  items.push(...cycle(17, [[2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [2], [3], [4], [5], [6], [7]], STICKER_SKELETONS, 1, (p, sk, nm, i) => stickerEmit(B2, 5)(p, sk, nameAt(i + 7))));
  items.push(...cycle(17, [[2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17], [18]], STICKER_SKELETONS, 2, (p, sk, nm, i) => stickerEmit(B3, 10)(p, sk, nameAt(i + 13))));

  /* pictograph app: how many pictures to draw. */
  const DRAW_SKELETONS = [
    (nm, n, key) => `${nm} must add ${n} to the picture chart, where each picture means ${key}. How many pictures does ${nm} draw?`,
    (nm, n, key) => `To record ${n} on a chart with a key of ${key}, how many pictures should ${nm} put up?`,
    (nm, n, key) => `${nm}'s chart uses one picture for every ${key}. Showing ${n} takes how many pictures?`,
  ];
  const drawEmit = (band, key) => ([n], sk, nm) =>
    mk("pictograph", `storyDraw_${band}`, band, {
      answer: n / key,
      answerType: "numberPad",
      display: { data: { kind: "pictoSymbols", n, key }, promptText: sk(nm, n, key) },
    });
  items.push(...cycle(17, [[3], [5], [7], [2], [8], [4], [9], [6], [11], [12], [13], [14], [15], [16], [17], [18], [19]], DRAW_SKELETONS, 1, (p, sk, nm, i) => drawEmit(B1, 1)(p, sk, nameAt(i + 2))));
  items.push(...cycle(17, [[10], [20], [30], [15], [40], [25], [45], [35], [50], [5], [55], [60], [65], [70], [75], [80], [85]], DRAW_SKELETONS, 2, (p, sk, nm, i) => drawEmit(B2, 5)(p, sk, nameAt(i + 9))));
  items.push(...cycle(17, [[30], [70], [50], [20], [90], [40], [80], [60], [100], [10], [120], [110], [130], [150], [140], [160], [170]], DRAW_SKELETONS, 0, (p, sk, nm, i) => drawEmit(B3, 10)(p, sk, nameAt(i + 15))));

  /* dataAnalysis app: totals and leftovers in survey narratives. */
  const ALLVOTE_BY_BAND = {
    band1: [
      (nm, t) => `Every vote in ${nm}'s ${t} survey landed in one of the four bars. How many friends voted in all?`,
      (nm, t) => `${nm} closes the ${t} survey and counts every single vote. What is the grand total?`,
      (nm, t) => `The ${t} graph is finished. ${nm} adds all four bars for the final report. What total goes in the report?`,
    ],
    band2: [
      (nm, t) => `${nm} stacks up all four ${t} bars to find how many classmates answered. How many votes in all?`,
      (nm, t) => `Before recess, ${nm} sums the whole ${t} chart. What is the full vote count?`,
      (nm, t) => `${nm}'s ${t} poster needs the turnout number — every bar combined. What is the turnout?`,
    ],
    band3: [
      (nm, t) => `${nm} totals the scaled ${t} graph, bar by careful bar. What grand total does it hold?`,
      (nm, t) => `For the data journal, ${nm} sums every ${t} category exactly. What is the exact total of votes?`,
      (nm, t) => `${nm} double-checks the ${t} turnout by adding all four bars twice. What total appears both times?`,
    ],
  };
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    const emit = ([vi], sk, nm) => {
      const vals = values[vi % values.length];
      const bars = barsFrom(vi % SETS.length, vals);
      return mk("dataAnalysis", `storyAllVotes_${band}`, band, {
        answer: vals.reduce((s, v) => s + v, 0),
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barTotal" }, promptText: sk(nm, SETS[vi % SETS.length].title) },
      });
    };
    items.push(...cycle(17, [[0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4]], ALLVOTE_BY_BAND[band], OFF[band] % 3, (p, sk, nm, i) => emit(p, sk, nameAt(i + 9 + OFF[band]))));
  }
  const STILL_SKELETONS = [
    (nm, t, l, target) => `${nm} hopes ${l} reaches ${target} in the ${t} survey. How many more votes does it need?`,
    (nm, t, l, target) => `The ${l} bar of the ${t} graph is chasing a goal of ${target}. ${nm} counts the missing votes. How many more votes are needed?`,
    (nm, t, l, target) => `To hit ${target}, how many more votes must ${l} collect in ${nm}'s ${t} survey?`,
  ];
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    const targetFor = band === B1 ? 10 : band === B2 ? 15 : 25;
    const emit = ([vi, li], sk, nm) => {
      const vals = values[vi % values.length];
      const bars = barsFrom(vi % SETS.length, vals);
      const target = bars[li];
      const goal = targetFor > target.value ? targetFor : target.value + 5;
      return mk("dataAnalysis", `storyReachGoal_${band}`, band, {
        answer: goal - target.value,
        answerType: "numberPad",
        display: { ...barDisplay(bars), data: { kind: "barGoalGap", label: target.label, goal }, promptText: sk(nm, SETS[vi % SETS.length].title, target.label, goal) },
      });
    };
    const space = [];
    for (let vi = 0; vi < 6; vi += 1) for (const li of [0, 2, 3]) space.push([vi, li]);
    items.push(...cycle(17, space, STILL_SKELETONS, (OFF[band] + 1) % 3, (p, sk, nm, i) => emit(p, sk, nameAt(i + 11 + OFF[band]))));
  }

  const SKIP_BY_BAND = {
    band1: [
      (nm, t, skip) => `${nm} counts every ${t} vote EXCEPT the ${skip} votes. How many votes are left?`,
      (nm, t, skip) => `Leaving the ${skip} bar out, ${nm} adds the rest of the ${t} graph. What total remains?`,
      (nm, t, skip) => `The ${skip} votes move to a new chart, so ${nm} sums the other three ${t} bars. How many votes stay?`,
    ],
    band2: [
      (nm, t, skip) => `${nm} retallies the ${t} survey without the ${skip} column. What is the new total?`,
      (nm, t, skip) => `If the ${skip} votes were removed from the ${t} graph, what total would ${nm} report?`,
      (nm, t, skip) => `${nm} covers the ${skip} bar and adds the remaining ${t} bars. How many votes show?`,
    ],
    band3: [
      (nm, t, skip) => `Excluding ${skip}, ${nm} sums the scaled ${t} graph precisely. What exact total is left?`,
      (nm, t, skip) => `${nm}'s ${t} appendix drops the ${skip} category entirely. What total do the other bars make?`,
      (nm, t, skip) => `After archiving the ${skip} data, ${nm} recomputes the ${t} total. What number results?`,
    ],
  };
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    const emit = ([vi, si], sk, nm) => {
      const vals = values[vi % values.length];
      const bars = barsFrom(vi % SETS.length, vals);
      const skip = bars[si];
      return mk("dataAnalysis", `storySkipTotal_${band}`, band, {
        answer: vals.reduce((s, v) => s + v, 0) - skip.value,
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barTotalSkip", skip: skip.label }, promptText: sk(nm, SETS[vi % SETS.length].title, skip.label) },
      });
    };
    const space = [];
    for (let vi = 0; vi < 6; vi += 1) for (const si of [0, 1, 3]) space.push([vi, si]);
    items.push(...cycle(17, space, SKIP_BY_BAND[band], OFF[band] % 3, (p, sk, nm, i) => emit(p, sk, nameAt(i + 13 + OFF[band]))));
  }

  const SHORTEST_BY_BAND = {
    band1: [
      (nm, t) => `${nm} looks for the ${t} choice with the FEWEST votes. Which one is it?`,
      (nm, t) => `Which ${t} choice came in last? ${nm} finds the littlest bar.`,
      (nm, t) => `${nm} pats the smallest ${t} bar. Which choice does it belong to?`,
    ],
    band2: [
      (nm, t) => `${nm} lists the ${t} runner-ups and starts with the very last place. Which choice is last?`,
      (nm, t) => `Scanning the ${t} chart, ${nm} spots the least popular pick. Which is it?`,
      (nm, t) => `${nm} marks the shortest ${t} bar with a dot. Which choice gets the dot?`,
    ],
    band3: [
      (nm, t) => `In the scaled ${t} graph, ${nm} identifies the lowest exact count. Which choice holds it?`,
      (nm, t) => `${nm}'s ${t} report footnotes the smallest category. Which choice is footnoted?`,
      (nm, t) => `${nm} finds which ${t} choice trails the whole field. Which one trails?`,
    ],
  };
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    let seed = 261 + OFF[band] * 5;
    const emit = ([vi], sk, nm) => {
      const bars = barsFrom(vi % SETS.length, values[vi % values.length]);
      const lo = bars.reduce((b, x) => (x.value < b.value ? x : b));
      return mk("readBar", `storyShortest_${band}`, band, {
        answer: lo.label,
        choices: shuffled(bars.map((b) => b.label), (seed += 1)),
        display: { ...barDisplay(bars), data: { kind: "barMin" }, promptText: sk(nm, SETS[vi % SETS.length].title) },
      });
    };
    items.push(...cycle(17, [[0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4]], SHORTEST_BY_BAND[band], OFF[band] % 3, (p, sk, nm, i) => emit(p, sk, nameAt(i + 15 + OFF[band]))));
  }

  const TOPTWO_BY_BAND = {
    band1: [
      (nm, t, a, b) => `The top two ${t} picks were ${a} and ${b}. ${nm} adds their votes. How many votes did the top two get together?`,
      (nm, t, a, b) => `${nm} teams the two ${t} leaders, ${a} and ${b}. What is their combined vote count?`,
      (nm, t, a, b) => `Together, how many votes do the ${t} front-runners ${a} and ${b} hold? ${nm} adds them.`,
    ],
    band2: [
      (nm, t, a, b) => `${nm} sums the two strongest ${t} bars, ${a} and ${b}. What do they total?`,
      (nm, t, a, b) => `The ${t} final round keeps only ${a} and ${b}. How many combined votes advance with them? ${nm} counts.`,
      (nm, t, a, b) => `${nm}'s ${t} headline needs the top-two total for ${a} and ${b}. What is it?`,
    ],
    band3: [
      (nm, t, a, b) => `From the scaled ${t} graph, ${nm} adds the exact ${a} and ${b} counts. What precise total results?`,
      (nm, t, a, b) => `The ${t} summary pairs its two leaders, ${a} and ${b}. ${nm} computes their joint votes. How many votes is that?`,
      (nm, t, a, b) => `${nm} verifies the ${t} top-two total of ${a} and ${b} for the record. What total goes on record?`,
    ],
  };
  for (const band of [B1, B2, B3]) {
    const values = VBAND[band];
    const emit = ([vi], sk, nm) => {
      const bars = barsFrom(vi % SETS.length, values[vi % values.length]);
      const sorted = [...bars].sort((x, y) => y.value - x.value);
      return mk("compareBars", `storyTopTwo_${band}`, band, {
        answer: sorted[0].value + sorted[1].value,
        answerType: "barGraph",
        display: { ...barDisplay(bars), data: { kind: "barSum", a: sorted[0].label, b: sorted[1].label }, promptText: sk(nm, SETS[vi % SETS.length].title, sorted[0].label, sorted[1].label) },
      });
    };
    items.push(...cycle(17, [[0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4], [5], [0], [1], [2], [3], [4]], TOPTWO_BY_BAND[band], (OFF[band] + 2) % 3, (p, sk, nm, i) => emit(p, sk, nameAt(i + 17 + OFF[band]))));
  }

  const CHART_TOTAL_SKELETONS = [
    (nm, s1, s2, key) => `${nm}'s two-row picture chart shows ${s1} pictures on top and ${s2} below, each worth ${key}. What total does the chart show?`,
    (nm, s1, s2, key) => `With a key of ${key}, ${nm} draws ${s1} pictures in one row and ${s2} in the other. How much do both rows show together?`,
    (nm, s1, s2, key) => `Each of the ${s1} + ${s2} pictures on ${nm}'s chart stands for ${key}. What is the chart's total?`,
  ];
  const chartTotalEmit = (band, key) => ([s1, s2], sk, nm) =>
    mk("pictograph", `storyChartTotal_${band}`, band, {
      answer: (s1 + s2) * key,
      answerType: "numberPad",
      display: { data: { kind: "pictoTotal2", s1, s2, key }, promptText: sk(nm, s1, s2, key) },
    });
  items.push(...cycle(17, [[2, 5], [3, 4], [4, 6], [2, 7], [5, 3], [6, 2], [3, 7], [4, 5], [2, 6], [5, 4], [6, 3], [3, 5], [4, 7], [2, 4], [5, 6], [6, 4], [3, 6]], CHART_TOTAL_SKELETONS, 0, (p, sk, nm, i) => chartTotalEmit(B1, 1)(p, sk, nameAt(i + 19))));
  items.push(...cycle(17, [[2, 5], [3, 4], [4, 6], [2, 7], [5, 3], [6, 2], [3, 7], [4, 5], [2, 6], [5, 4], [6, 3], [3, 5], [4, 7], [2, 4], [5, 6], [6, 4], [3, 6]], CHART_TOTAL_SKELETONS, 1, (p, sk, nm, i) => chartTotalEmit(B2, 5)(p, sk, nameAt(i + 26))));
  items.push(...cycle(17, [[2, 5], [3, 4], [4, 6], [2, 7], [5, 3], [6, 2], [3, 7], [4, 5], [2, 6], [5, 4], [6, 3], [3, 5], [4, 7], [2, 4], [5, 6], [6, 4], [3, 6]], CHART_TOTAL_SKELETONS, 2, (p, sk, nm, i) => chartTotalEmit(B3, 10)(p, sk, nameAt(i + 33))));

  return items;
}
